import abc
import base64
import json
import logging
from typing import List, Dict, Any, Tuple
import boto3
from app.aws_credentials import aws_cred_manager

logger = logging.getLogger(__name__)

class VisionProvider(abc.ABC):
    @abc.abstractmethod
    async def extract_context(self, frames_base64: List[str]) -> Tuple[bool, Dict[str, Any]]:
        """
        Tier 2: Extract structured visual context from the video frames.
        Returns: (is_spoofed_boolean, context_json_dict)
        """
        pass

class GenAIProvider(abc.ABC):
    @abc.abstractmethod
    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        """
        Tier 3: Evaluates the combined video frames and Tier 2 JSON map to determine a final AI Trust Score.
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
    
    if provider_name == "gemini":
        genai_engine = GoogleGeminiProvider()
    elif provider_name in ("amazon-nova-2-lite", "amazon-nova-lite"):
        genai_engine = AmazonNova2LiteProvider()
    else:
        logger.warning(f"Unknown AI provider '{provider_name}', defaulting to Gemini Flash Lite.")
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
                response = ssm.get_parameter(Name='/veraproof/prod/api/gemini_key', WithDecryption=True)
                api_key = response['Parameter']['Value']
                logger.info("Successfully fetched Gemini API Key from AWS SSM.")
            except Exception as e:
                logger.error(f"Failed to fetch GEMINI_API_KEY from AWS SSM: {str(e)}")
                
        self.client = genai.Client(api_key=api_key)
        self.model_id = os.environ.get("GEMINI_MODEL_ID", "gemini-3.1-flash-lite-preview")

    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        from google.genai import types
        
        try:
            logger.info(f"Tier 2 AWS Rekognition Vision Context Extracted:\n{json.dumps(vision_context, indent=2)}")
            
            # 1. Structure the prompt with the Tier 2 JSON
            prompt_text = (
                "You are an expert fraud detection AI system. Analyze these sequential keyframes extracted from a user's verification video "
                "alongside the attached AWS Rekognition machine-vision output.\n\n"
                f"AWS Rekognition Vision Context: {json.dumps(vision_context)}\n\n"
                "Assess if the video represents a genuine physical interaction in 3D space or a spoofed presentation attack (e.g., a video of a screen, printed photo, or AI generated).\n"
                "Respond with ONLY a valid JSON object with EXACTLY two keys:\n"
                "- 'trust_score' (a number between 0 and 100, where 100 means fully genuine and 0 means definitely spoofed or fake)\n"
                "- 'explanation' (a highly detailed and analytical 3-4 sentence paragraph explaining your reasoning. Detail specifically what you observed in the video frames—like lighting, depth, physics, and fluid movements—and reference the Rekognition context to justify your score. Do not be generic.)\n"
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

    async def evaluate_trust(self, frames_base64: List[str], vision_context: Dict[str, Any], metadata: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
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
            
            prompt_text = (
                "You are an expert fraud detection AI system. Analyze these sequential keyframes extracted from a user's verification video "
                "alongside the attached AWS Rekognition machine-vision output.\n\n"
                f"AWS Rekognition Vision Context: {json.dumps(vision_context)}\n\n"
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
        # Fallback to us-east-1 strictly for global Rekognition endpoints if needed
        self.rekognition = session.client(service_name="rekognition", region_name=region_name)

    async def extract_context(self, frames_base64: List[str]) -> Tuple[bool, Dict[str, Any]]:
        """
        Uses AWS Rekognition DetectLabels to identify objects, scenes, and potential presentation attacks.
        Returns: (is_spoofed_boolean, structured_vision_context)
        """
        try:
            total_frames = len(frames_base64)
            labels_log = []
            primary_labels_tracker = {}
            valid_frames = 0
            
            SPOOF_LABELS = {
                "Screen", "Monitor", "Display", "Television", "TV", "Mobile Phone", 
                "Tablet Computer", "Laptop", "Computer Monitor", "Electronics",
                "Digital Media", "Illustration", "Animation", "Graphics", "Drawing",
                "Painting", "Art", "Anime", "Paper", "Poster", "Flyer", "Brochure",
                "Picture Frame"
            }

            for index, frame_b64 in enumerate(frames_base64):
                image_bytes = base64.b64decode(frame_b64)
                
                response = self.rekognition.detect_labels(
                    Image={'Bytes': image_bytes},
                    MaxLabels=15,
                    MinConfidence=60.0
                )

                labels = response.get('Labels', [])
                if len(labels) > 0:
                    valid_frames += 1
                    frame_labels_summary = []
                    
                    # Pass 1: Check for Spoof/Deepfake indicators
                    for label in labels:
                        name = label['Name']
                        confidence = float(label['Confidence'])
                        if name in SPOOF_LABELS and confidence > 65.0:
                            logger.warning(f"SPOOF DETECTED BY REKOGNITION (Tier 2): {name} (Conf: {confidence}%)")
                            return True, {
                                "status": "failed",
                                "spoof_evidence": name,
                                "confidence": confidence,
                                "message": f"AWS Rekognition immediately halted evaluation due to severe Presentation Attack anomaly: '{name}'"
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

            # Calculate vision context payload for GenAI intake
            if valid_frames == 0 or total_frames == 0:
                return False, {
                    "status": "warning",
                    "message": "AWS Rekognition (Tier 2) failed to detect any discernable objects or environments."
                }

            # Gather the top 5 most frequent items across the entire video timeline
            sorted_global_subjects = sorted(primary_labels_tracker.items(), key=lambda x: x[1], reverse=True)[:5]
            consistent_subjects = [item[0] for item in sorted_global_subjects]

            vision_context = {
                "status": "success",
                "total_frames_analyzed": total_frames,
                "most_consistent_global_subjects": consistent_subjects,
                "frame_by_frame_details": labels_log
            }

            return False, vision_context

        except Exception as e:
            logger.error(f"Error invoking Amazon Rekognition (Tier 2 Vision Provider): {e}")
            return False, {"error": f"Tier 2 evaluation failed: {str(e)}"}
