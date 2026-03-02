import pytest
from unittest.mock import MagicMock, patch
from app.ai_provider import AmazonNovaLiteProvider
import json

@pytest.fixture
def mock_boto3_client():
    with patch("boto3.client") as mock_client:
        yield mock_client

@pytest.mark.asyncio
async def test_analyze_frames_success(mock_boto3_client):
    """Test successful interaction with Amazon Nova Lite via Bedrock."""
    mock_runtime = MagicMock()
    mock_boto3_client.return_value = mock_runtime
    
    expected_response = {
        "output": {
            "message": {
                "content": [
                    {
                        "text": '```json\n{"trust_score": 92.5, "explanation": "The video displays a natural 3D capture without static framing or screen glare."}\n```'
                    }
                ]
            }
        }
    }
    
    mock_body = MagicMock()
    mock_body.read.return_value = json.dumps(expected_response).encode("utf-8")
    
    mock_response = {"body": mock_body}
    mock_runtime.invoke_model.return_value = mock_response

    provider = AmazonNovaLiteProvider()
    frames = ["dummy_base64_string_1", "dummy_base64_string_2"]
    
    score, explanation = await provider.analyze_frames(frames)
    
    assert score == 92.5
    assert explanation["summary"] == "The video displays a natural 3D capture without static framing or screen glare."
    
    # Verify Bedrock InvokeModel was called correctly
    mock_runtime.invoke_model.assert_called_once()
    call_kwargs = mock_runtime.invoke_model.call_args[1]
    assert call_kwargs["modelId"] == "us.amazon.nova-lite-v1:0"

@pytest.mark.asyncio
async def test_analyze_frames_fallback_on_error(mock_boto3_client):
    """Test AI Provider safely fails and returns 0 when Bedrock crashes."""
    mock_runtime = MagicMock()
    mock_boto3_client.return_value = mock_runtime
    mock_runtime.invoke_model.side_effect = Exception("AWS Limit Exceeded")
    
    provider = AmazonNovaLiteProvider()
    score, explanation = await provider.analyze_frames(["frame1"])
    
    assert score == 0.0
    assert "error" in explanation
    assert "AWS Limit Exceeded" in explanation["error"]
