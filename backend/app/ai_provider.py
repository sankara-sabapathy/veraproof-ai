import abc
import base64
import json
import logging
from typing import List, Dict, Any, Tuple
import boto3

logger = logging.getLogger(__name__)

class AIProvider(abc.ABC):
    @abc.abstractmethod
    async def analyze_frames(self, frames_base64: List[str], metadata: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        """
        Analyzes a sequence of base64 encoded frames (JPEG).
        Returns a tuple: (Final AI Score (0-100), AI Explanation Dict)
        """
        pass

def get_ai_provider() -> AIProvider:
    """
    Factory function to get the appropriate AI Provider based on environment configuration.
    Defaults to AmazonNovaLiteProvider.
    """
    import os
    # For now, default to amazon-nova-lite. In the future this handles 'claude-3', 'qwen-vl', etc.
    provider_name = os.environ.get("VERAPROOF_AI_MODEL_ID", "amazon-nova-lite").lower()
    
    if provider_name == "amazon-nova-lite":
        return AmazonNovaLiteProvider()
    else:
        logger.warning(f"Unknown AI provider '{provider_name}', defaulting to Amazon Nova Lite.")
        return AmazonNovaLiteProvider()


class AmazonNovaLiteProvider(AIProvider):
    def __init__(self, region_name: str = "ap-south-1"):
        self.bedrock_runtime = boto3.client(service_name="bedrock-runtime", region_name=region_name)
        # We will use us.amazon.nova-lite-v1:0
        self.model_id = "us.amazon.nova-lite-v1:0"

    async def analyze_frames(self, frames_base64: List[str], metadata: Dict[str, Any] = None) -> Tuple[float, Dict[str, Any]]:
        try:
            content = []
            
            # Construct the Multimodal Prompt using Amazon Nova cross-region messages format
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
                "You are an expert fraud detection AI system. Analyze these sequential keyframes extracted from a user's verification video.\n"
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
            
            # Extract Nova Lite response text: response_body['output']['message']['content'][0]['text']
            output_text = response_body.get('output', {}).get('message', {}).get('content', [{}])[0].get('text', '{}')
            
            # The model might include markdown code block formatting, so strip it out
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
            logger.error(f"Error invoking Amazon Nova Lite: {e}")
            # Fallback return in case of any AWS API error, formatting error or invalid JSON
            return 0.0, {"error": f"AI evaluation failed: {str(e)}"}
