import abc
import base64
import json
import logging
from typing import List, Dict, Any, Tuple
import boto3
from app.aws_credentials import aws_cred_manager

logger = logging.getLogger(__name__)


def _coerce_mapping(value: Any, field_name: str) -> Dict[str, Any]:
    """Normalize JSON-ish values from DB/providers into a dict."""
    if value is None:
        return {}

    if isinstance(value, dict):
        return value

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            logger.warning("Failed to decode JSON string for %s", field_name)
            return {}

        if isinstance(parsed, dict):
            return parsed

        logger.warning("Decoded %s but it was %s instead of dict", field_name, type(parsed).__name__)
        return {}

    logger.warning("Unexpected %s type: %s", field_name, type(value).__name__)
    return {}

class VisionProvider(abc.ABC):
    @abc.abstractmethod
    async def extract_context(self, frames_base64: List[str], metadata: Dict[str, Any] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Tier 2: Extract structured visual context from the video frames.
        Accepts optional metadata for profile-aware spoof label suppression.
        Returns: (is_spoofed_boolean, context_json_dict)
        """
        pass

class GenAIProvider(abc.ABC):
    @abc.abstractmethod
    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None, imu_context: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        """
        Tier 3: Evaluates the combined video frames and Tier 2 JSON map to determine a final AI Trust Score.
        Accepts optional imu_context for cross-modal device motion validation.
        Returns: (Final AI Score (0-100), AI Explanation Dict)
        """
        pass

def get_ai_pipeline() -> Tuple[VisionProvider, GenAIProvider]:
    """
    Factory function yielding the active 3-Tier AI forensic engines.
    Defaults to AWS Rekognition (Tier 2) -> Google Gemini 3.1 Flash-Lite (Tier 3).
    """
    import os
    provider_name = os.environ.get("VERAPROOF_AI_MODEL_ID", "gemini").lower()
    
    vision_engine = AmazonRekognitionProvider()
    
    if provider_name != "gemini":
        logger.warning(f"Unsupported AI provider '{provider_name}', defaulting to Gemini Flash Lite.")
    genai_engine = GoogleGeminiProvider()
        
    return vision_engine, genai_engine


class GoogleGeminiProvider(GenAIProvider):
    def __init__(self):
        try:
            from google import genai
            from google.genai import types
        except ImportError:
            logger.error("google-genai Python SDK is not installed. Run `pip install google-genai`.")
            raise
            
        import os
        api_key = os.environ.get("GEMINI_API_KEY")
        
        # If API key isn't in environment, fetch it securely from AWS SSM at runtime
        if not api_key:
            try:
                session = aws_cred_manager.get_session()
                ssm = session.client('ssm', region_name='ap-south-1')
                response = ssm.get_parameter(Name=f"/veraproof/{os.environ.get('STAGE', 'prod')}/gemini/api_key", WithDecryption=True)
                api_key = response['Parameter']['Value']
                logger.info("Successfully fetched Gemini API Key from AWS SSM.")
            except Exception as e:
                logger.error(f"Failed to fetch GEMINI_API_KEY from AWS SSM: {str(e)}")
                
        self.client = genai.Client(api_key=api_key)
        self.model_id = os.environ.get("GEMINI_MODEL_ID", "gemini-3.1-flash-lite-preview")

    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None, imu_context: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        from google.genai import types
        
        try:
            metadata = _coerce_mapping(metadata, "metadata")
            vision_context = _coerce_mapping(vision_context, "vision_context")

            logger.info(f"Tier 2 AWS Rekognition Vision Context Extracted:\n{json.dumps(vision_context, indent=2)}")
            
            # Resolve verification profile from metadata
            verification_profile = metadata.get("verification_profile", "standard")
            logger.info(f"Gemini evaluation using verification_profile='{verification_profile}'")
            
            # 1. Build profile-aware preamble
            profile_preamble = ""
            if verification_profile == "object_originality":
                profile_preamble = (
                    "IMPORTANT CONTEXT: This verification session is for OBJECT ORIGINALITY, not human liveness. "
                    "The user is proving that a physical object (e.g., a keyboard, monitor, laptop, or other item) is real and physically present in 3D space. "
                    "Do NOT penalize the absence of a human face. Do NOT penalize the presence of electronics or screens as spoofing indicators—they may be the legitimate subject of verification. "
                    "Instead, focus on: (1) camera parallax and perspective shifts proving 3D depth, (2) natural ambient lighting and reflections consistent with a real environment, "
                    "(3) subtle sensor noise and compression artifacts typical of a live camera feed vs. a digitally replayed recording, "
                    "(4) any evidence of moiré patterns, screen bezels, or pixel grids that would indicate a screen-of-a-screen attack.\n\n"
                )
            elif verification_profile == "static_human":
                profile_preamble = (
                    "IMPORTANT CONTEXT: This verification session involves a STATIC HUMAN subject. "
                    "The user is expected to remain relatively still—minimal head or body movement is NORMAL and should NOT be treated as a spoofing indicator. "
                    "Do NOT penalize near-identical facial positions or consistent confidence scores across frames. "
                    "Instead, focus on: (1) subtle depth-of-field variations proving a 3D environment, (2) natural skin micro-textures, pores, and physiological details inconsistent with printed photos or screens, "
                    "(3) ambient lighting gradients and soft shadows that shift naturally, (4) slight camera sensor noise and compression patterns consistent with live capture, "
                    "(5) any telltale signs of a flat 2D source such as moiré patterns, screen bezels, edge distortion, or uniform backlighting.\n\n"
                )
            
            # 2. Build IMU cross-modal context block
            imu_block = ""
            if imu_context and imu_context.get("has_data"):
                imu_block = (
                    f"\nDevice IMU Sensor Data (Gyroscope + Accelerometer): {json.dumps(imu_context)}\n"
                    "Cross-validate: Does the device's physical motion (gyroscope rotation and accelerometer shake) "
                    "correlate with the visual motion you observe in the video frames? "
                    "If the video shows panning but the IMU shows zero movement, this is a strong spoofing indicator. "
                    "If the IMU shows natural hand tremor and motion consistent with the visual feed, this supports genuineness.\n\n"
                )
            
            # 3. Structure the prompt with the Tier 2 JSON and IMU context
            prompt_text = (
                f"{profile_preamble}"
                "You are an expert fraud detection AI system. Analyze these sequential keyframes extracted from a user's verification video "
                "alongside the attached AWS Rekognition machine-vision output.\n\n"
                f"AWS Rekognition Vision Context: {json.dumps(vision_context)}\n\n"
                f"{imu_block}"
                "Assess if the video represents a genuine physical interaction in 3D space or a spoofed presentation attack (e.g., a video of a screen, printed photo, or AI generated).\n"
                "Respond with ONLY a valid JSON object with EXACTLY two keys:\n"
                "- 'trust_score' (a number between 0 and 100, where 100 means fully genuine and 0 means definitely spoofed or fake)\n"
                "- 'explanation' (a highly detailed and analytical 3-4 sentence paragraph explaining your reasoning. Detail specifically what you observed in the video frames—like lighting, depth, physics, and fluid movements—and reference the Rekognition context and IMU sensor data to justify your score. Do not be generic.)\n"
                "No other text should be in your output, just the JSON block."
            )
            
            contents = [prompt_text]
            
            # 2. Append the visual frames
            for frame_b64 in frames_base64:
                frame_bytes = base64.b64decode(frame_b64)
                contents.append(
                    types.Part.from_bytes(data=frame_bytes, mime_type='image/jpeg')
                )

            # 3. Request evaluation from Gemini 3.1 Flash-Lite
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    top_p=0.9
                )
            )
            
            # Log the full raw response to capture thought signatures and tracing metadata
            try:
                raw_log = response.model_dump_json(indent=2) if hasattr(response, "model_dump_json") else str(response)
                logger.info(f"Full Gemini AI Response Dump:\n{raw_log}")
            except Exception as e:
                logger.warning(f"Failed to dump Gemini response: {e}")
                
            # Extract text carefully to avoid the 'thought_signature' SDK warning
            output_text = ""
            if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    # Append actual text, skip internal thought blocks
                    if getattr(part, 'text', None):
                        output_text += part.text
            
            if not output_text.strip():
                output_text = response.text # Safe fallback
            
            # 4. Clean up Markdown JSON blocks
            clean_json_str = output_text.strip()
            if clean_json_str.startswith("```json"):
                clean_json_str = clean_json_str[7:]
            if clean_json_str.endswith("```"):
                clean_json_str = clean_json_str[:-3]
            clean_json_str = clean_json_str.strip()

            result = json.loads(clean_json_str)
            score = float(result.get("trust_score", 0))
            explanation = {"summary": str(result.get("explanation", ""))}

            return score, explanation
            
        except Exception as e:
            logger.error(f"Error invoking Google Gemini: {e}")
            return -1.0, {"error": f"AI evaluation failed: {str(e)}"}


class AmazonNova2LiteProvider(GenAIProvider):
    def __init__(self, region_name: str = "ap-south-1"):
        session = aws_cred_manager.get_session()
        self.bedrock_runtime = session.client(service_name="bedrock-runtime", region_name=region_name)
        self.model_id = "amazon.nova-2-lite-v1:0"

    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None, imu_context: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        try:
            content = []
            
            for frame_b64 in frames_base64:
                content.append({
                    "image": {
                        "format": "jpeg",
                        "source": {
                            "bytes": frame_b64
                        }
                    }
                })
            
            metadata = _coerce_mapping(metadata, "metadata")
            vision_context = _coerce_mapping(vision_context, "vision_context")

            # Resolve verification profile from metadata
            verification_profile = metadata.get("verification_profile", "standard")
            
            profile_preamble = ""
            if verification_profile == "object_originality":
                profile_preamble = (
                    "IMPORTANT CONTEXT: This verification is for OBJECT ORIGINALITY, not human liveness. "
                    "Do NOT penalize the absence of a human face or the presence of electronics—they may be the legitimate subject. "
                    "Focus on 3D parallax, ambient lighting, and sensor noise vs. screen replay indicators.\n\n"
                )
            elif verification_profile == "static_human":
                profile_preamble = (
                    "IMPORTANT CONTEXT: The subject is expected to remain STATIC. Minimal movement is NORMAL. "
                    "Focus on depth-of-field, skin micro-textures, and ambient lighting instead of motion.\n\n"
                )
            
            # Build IMU cross-modal context block
            imu_block = ""
            if imu_context and imu_context.get("has_data"):
                imu_block = (
                    f"\nDevice IMU Sensor Data: {json.dumps(imu_context)}\n"
                    "Cross-validate device motion with visual motion. Mismatch = spoofing indicator.\n\n"
                )
            
            prompt_text = (
                f"{profile_preamble}"
                "You are an expert fraud detection AI system. Analyze these sequential keyframes extracted from a user's verification video "
                "alongside the attached AWS Rekognition machine-vision output.\n\n"
                f"AWS Rekognition Vision Context: {json.dumps(vision_context)}\n\n"
                f"{imu_block}"
                "Assess if the video represents a genuine physical interaction in 3D space or a spoofed event (e.g., a video of a screen, printed photo, or AI generated).\n"
                "Check for signs of screen glare, lack of depth, or unnatural movements.\n"
                "Respond with ONLY a valid JSON object with EXACTLY two keys:\n"
                "- 'trust_score' (a number between 0 and 100, where 100 means fully genuine and 0 means definitely spoofed or fake)\n"
                "- 'explanation' (a brief one paragraph explanation of your reasoning)\n"
                "No other text should be in your output, just the JSON block."
            )
            content.append({
                "text": prompt_text
            })

            messages = [
                {
                    "role": "user",
                    "content": content
                }
            ]

            body = json.dumps({
                "messages": messages,
                "inferenceConfig": {
                    "max_new_tokens": 512,
                    "temperature": 0.1,
                    "top_p": 0.9
                }
            })

            response = self.bedrock_runtime.invoke_model(
                modelId=self.model_id,
                body=body,
                contentType="application/json",
                accept="application/json"
            )

            response_body = json.loads(response.get('body').read())
            output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '{}')
            
            clean_json_str = output_text.strip()
            if clean_json_str.startswith("```json"):
                clean_json_str = clean_json_str[7:]
            if clean_json_str.endswith("```"):
                clean_json_str = clean_json_str[:-3]
            clean_json_str = clean_json_str.strip()

            result = json.loads(clean_json_str)
            score = float(result.get("trust_score", 0))
            explanation = {"summary": str(result.get("explanation", ""))}

            return score, explanation
        except Exception as e:
            logger.error(f"Error invoking Amazon Nova: {e}")
            return -1.0, {"error": f"AI evaluation failed: {str(e)}"}


class AmazonRekognitionProvider(VisionProvider):
    def __init__(self, region_name: str = "us-east-1"):
        session = aws_cred_manager.get_session()
        self.region_name = region_name
        # Fallback to us-east-1 strictly for global Rekognition endpoints if needed
        self.rekognition = session.client(service_name="rekognition", region_name=region_name)

    async def extract_context(self, frames_base64: List[str], metadata: Dict[str, Any] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Uses AWS Rekognition DetectLabels (and DetectFaces for human profiles) to identify
        objects, scenes, face attributes, and potential presentation attacks.
        Accepts optional metadata to resolve verification_profile for conditional spoof suppression.
        Returns: (is_spoofed_boolean, structured_vision_context)
        """
        try:
            metadata = _coerce_mapping(metadata, "metadata")
            verification_profile = metadata.get("verification_profile", "standard")
            logger.info(f"Rekognition Tier 2 running with verification_profile='{verification_profile}'")
            
            # Determine if we should run face analysis (only for human-facing profiles)
            run_face_analysis = verification_profile in ("standard", "static_human")
            
            total_frames = len(frames_base64)
            labels_log = []
            face_analysis_log = []
            primary_labels_tracker = {}
            valid_frames = 0
            
            # Full spoof label set for standard liveness detection
            SPOOF_LABELS = {
                "Screen", "Monitor", "Display", "Television", "TV", "Mobile Phone", 
                "Tablet Computer", "Laptop", "Computer Monitor", "Electronics",
                "Digital Media", "Illustration", "Animation", "Graphics", "Drawing",
                "Painting", "Art", "Anime", "Paper", "Poster", "Flyer", "Brochure",
                "Picture Frame"
            }
            
            # For object_originality, electronics ARE the legitimate subject—only flag 2D reproduction labels
            if verification_profile == "object_originality":
                SPOOF_LABELS = {
                    "Illustration", "Animation", "Graphics", "Drawing",
                    "Painting", "Art", "Anime", "Poster", "Flyer", "Brochure"
                }
            
            # Track spoof detections across frames for profile-aware soft signaling
            spoof_detections = []
            raw_frame_analysis = []

            for index, frame_b64 in enumerate(frames_base64):
                image_bytes = base64.b64decode(frame_b64)
                
                response = self.rekognition.detect_labels(
                    Image={'Bytes': image_bytes},
                    MaxLabels=15,
                    MinConfidence=60.0
                )
                frame_artifact = {
                    "frame_index": index,
                    "detect_labels": response,
                }

                labels = response.get('Labels', [])
                if len(labels) > 0:
                    valid_frames += 1
                    frame_labels_summary = []
                    
                    # Pass 1: Check for Spoof/Deepfake indicators
                    for label in labels:
                        name = label['Name']
                        confidence = float(label['Confidence'])
                        if name in SPOOF_LABELS and confidence > 65.0:
                            # For static_human, collect evidence but defer final judgement to Tier 3 GenAI
                            if verification_profile == "static_human":
                                spoof_detections.append({"label": name, "confidence": confidence, "frame": index})
                                logger.warning(f"Spoof indicator noted (deferred to Tier 3): {name} (Conf: {confidence}%)")
                                continue
                            
                            logger.warning(f"SPOOF DETECTED BY REKOGNITION (Tier 2): {name} (Conf: {confidence}%)")
                            raw_frame_analysis.append(frame_artifact)
                            return True, {
                                "status": "failed",
                                "spoof_evidence": name,
                                "confidence": confidence,
                                "message": f"AWS Rekognition immediately halted evaluation due to severe Presentation Attack anomaly: '{name}'",
                                "_artifact_rekognition_raw": {
                                    "provider": "aws_rekognition",
                                    "region": self.region_name,
                                    "verification_profile": verification_profile,
                                    "frames": raw_frame_analysis,
                                },
                            }

                    # Pass 2: Context grouping (up to top 5 prominent items per frame)
                    for i in range(min(5, len(labels))):
                        name = labels[i]['Name']
                        if name not in primary_labels_tracker:
                            primary_labels_tracker[name] = 1
                        else:
                            primary_labels_tracker[name] += 1
                        frame_labels_summary.append({"name": name, "confidence": float(labels[i]['Confidence'])})
                            
                    labels_log.append({
                        "frame_index": index,
                        "frame_subjects": frame_labels_summary
                    })
                
                # --- DetectFaces: Face attribute analysis for human profiles ---
                if run_face_analysis:
                    try:
                        face_response = self.rekognition.detect_faces(
                            Image={'Bytes': image_bytes},
                            Attributes=['ALL']
                        )
                        frame_artifact["detect_faces"] = face_response
                        faces = face_response.get('FaceDetails', [])
                        if faces:
                            primary_face = faces[0]  # Use the most prominent face
                            pose = primary_face.get('Pose', {})
                            quality = primary_face.get('Quality', {})
                            eyes_open = primary_face.get('EyesOpen', {})
                            mouth_open = primary_face.get('MouthOpen', {})
                            
                            face_analysis_log.append({
                                "frame_index": index,
                                "pose": {
                                    "pitch": round(pose.get('Pitch', 0), 2),
                                    "roll": round(pose.get('Roll', 0), 2),
                                    "yaw": round(pose.get('Yaw', 0), 2)
                                },
                                "quality": {
                                    "brightness": round(quality.get('Brightness', 0), 2),
                                    "sharpness": round(quality.get('Sharpness', 0), 2)
                                },
                                "eyes_open": {
                                    "value": eyes_open.get('Value', False),
                                    "confidence": round(eyes_open.get('Confidence', 0), 2)
                                },
                                "mouth_open": {
                                    "value": mouth_open.get('Value', False),
                                    "confidence": round(mouth_open.get('Confidence', 0), 2)
                                },
                                "face_count": len(faces)
                            })
                    except Exception as face_err:
                        logger.warning(f"DetectFaces failed for frame {index}: {face_err}")
                        frame_artifact["detect_faces_error"] = str(face_err)

                raw_frame_analysis.append(frame_artifact)

            # Calculate vision context payload for GenAI intake
            if valid_frames == 0 or total_frames == 0:
                return False, {
                    "status": "warning",
                    "message": "AWS Rekognition (Tier 2) failed to detect any discernable objects or environments.",
                    "_artifact_rekognition_raw": {
                        "provider": "aws_rekognition",
                        "region": self.region_name,
                        "verification_profile": verification_profile,
                        "frames": raw_frame_analysis,
                    },
                }

            # Gather the top 5 most frequent items across the entire video timeline
            sorted_global_subjects = sorted(primary_labels_tracker.items(), key=lambda x: x[1], reverse=True)[:5]
            consistent_subjects = [item[0] for item in sorted_global_subjects]

            vision_context = {
                "status": "success",
                "verification_profile": verification_profile,
                "total_frames_analyzed": total_frames,
                "most_consistent_global_subjects": consistent_subjects,
                "frame_by_frame_details": labels_log
            }
            
            # Include face analysis data and computed variance metrics for human profiles
            if face_analysis_log:
                vision_context["face_analysis"] = {
                    "frames_with_faces": len(face_analysis_log),
                    "per_frame_details": face_analysis_log
                }
                
                # Compute inter-frame face pose variance as a liveness signal
                # Zero or near-zero variance = static image/screen, natural variance = live person
                if len(face_analysis_log) >= 2:
                    import statistics
                    yaws = [f["pose"]["yaw"] for f in face_analysis_log]
                    pitches = [f["pose"]["pitch"] for f in face_analysis_log]
                    rolls = [f["pose"]["roll"] for f in face_analysis_log]
                    brightnesses = [f["quality"]["brightness"] for f in face_analysis_log]
                    
                    variance_metrics = {
                        "yaw_std_dev": round(statistics.stdev(yaws), 4) if len(yaws) > 1 else 0,
                        "pitch_std_dev": round(statistics.stdev(pitches), 4) if len(pitches) > 1 else 0,
                        "roll_std_dev": round(statistics.stdev(rolls), 4) if len(rolls) > 1 else 0,
                        "brightness_std_dev": round(statistics.stdev(brightnesses), 4) if len(brightnesses) > 1 else 0,
                        "interpretation": "natural_variance" if (
                            statistics.stdev(yaws) > 0.5 or statistics.stdev(pitches) > 0.5
                        ) else "suspiciously_static"
                    }
                    vision_context["face_analysis"]["pose_variance_metrics"] = variance_metrics
                    logger.info(f"Face pose variance: {variance_metrics}")
            
            # Include deferred spoof signals so Tier 3 GenAI can weigh them
            if spoof_detections:
                vision_context["deferred_spoof_indicators"] = spoof_detections

            vision_context["_artifact_rekognition_raw"] = {
                "provider": "aws_rekognition",
                "region": self.region_name,
                "verification_profile": verification_profile,
                "frames": raw_frame_analysis,
            }

            return False, vision_context

        except Exception as e:
            logger.error(f"Error invoking Amazon Rekognition (Tier 2 Vision Provider): {e}")
            return False, {"error": f"Tier 2 evaluation failed: {str(e)}"}
