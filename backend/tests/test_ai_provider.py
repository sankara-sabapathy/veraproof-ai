import pytest
from unittest.mock import MagicMock, patch, call
from app.ai_provider import AmazonNova2LiteProvider, AmazonRekognitionProvider
import json
import base64

@pytest.fixture
def mock_boto3_client():
    with patch("app.ai_provider.aws_cred_manager.get_session") as mock_get_session:
        mock_session = MagicMock()
        mock_get_session.return_value = mock_session
        yield mock_session.client

@pytest.mark.asyncio
async def test_analyze_frames_success(mock_boto3_client):
    """Test successful interaction with Amazon Nova 2 Lite via Bedrock."""
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

    provider = AmazonNova2LiteProvider()
    frames = ["dummy_base64_string_1", "dummy_base64_string_2"]
    mock_vision_context = {"status": "success", "faces_detected": 1}
    
    score, explanation = await provider.evaluate_trust(frames, mock_vision_context)
    
    assert score == 92.5
    assert explanation["summary"] == "The video displays a natural 3D capture without static framing or screen glare."
    
    # Verify Bedrock InvokeModel was called correctly
    mock_runtime.invoke_model.assert_called_once()
    call_kwargs = mock_runtime.invoke_model.call_args[1]
    assert call_kwargs["modelId"] == "amazon.nova-2-lite-v1:0"

@pytest.mark.asyncio
async def test_analyze_frames_fallback_on_error(mock_boto3_client):
    """Test AI Provider safely fails and returns 0 when Bedrock crashes."""
    mock_runtime = MagicMock()
    mock_boto3_client.return_value = mock_runtime
    mock_runtime.invoke_model.side_effect = Exception("AWS Limit Exceeded")
    
    provider = AmazonNova2LiteProvider()
    mock_vision_context = {"status": "success", "faces_detected": 1}
    score, explanation = await provider.evaluate_trust(["frame1"], mock_vision_context)
    
    assert score == -1.0
    assert "error" in explanation
    assert "error" in explanation
    assert "AWS Limit Exceeded" in explanation["error"]


# ============================================================================
# Phase 1 Tests: DetectFaces, IMU Fusion, Verification Profiles
# ============================================================================

def _make_dummy_frame():
    """Create a minimal valid base64-encoded image for mocking."""
    return base64.b64encode(b"\x00" * 10).decode("utf-8")


def _make_detect_labels_response(labels):
    """Helper to build a Rekognition DetectLabels response."""
    return {
        "Labels": [
            {"Name": name, "Confidence": conf}
            for name, conf in labels
        ]
    }


def _make_detect_faces_response(pose, quality, eyes_open=True, mouth_open=False):
    """Helper to build a Rekognition DetectFaces response with specified attributes."""
    return {
        "FaceDetails": [{
            "Pose": {"Pitch": pose[0], "Roll": pose[1], "Yaw": pose[2]},
            "Quality": {"Brightness": quality[0], "Sharpness": quality[1]},
            "EyesOpen": {"Value": eyes_open, "Confidence": 99.5},
            "MouthOpen": {"Value": mouth_open, "Confidence": 98.0},
            "BoundingBox": {"Width": 0.5, "Height": 0.5, "Left": 0.25, "Top": 0.25}
        }]
    }


class TestRekognitionDetectFaces:
    """Tests for the DetectFaces integration in AmazonRekognitionProvider."""

    @pytest.mark.asyncio
    async def test_detect_faces_called_for_standard_profile(self, mock_boto3_client):
        """DetectFaces should be called alongside DetectLabels for 'standard' profile."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Person", 98.0), ("Indoor", 85.0)
        ])
        mock_rekognition.detect_faces.return_value = _make_detect_faces_response(
            pose=(5.0, 1.0, -3.0), quality=(80.0, 90.0)
        )

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame(), _make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "standard"})

        assert not is_spoofed
        assert context["status"] == "success"
        assert "face_analysis" in context
        assert context["face_analysis"]["frames_with_faces"] == 2
        # DetectFaces should have been called once per frame
        assert mock_rekognition.detect_faces.call_count == 2

    @pytest.mark.asyncio
    async def test_detect_faces_skipped_for_object_originality(self, mock_boto3_client):
        """DetectFaces should NOT be called for 'object_originality' profile."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Keyboard", 95.0), ("Electronics", 88.0), ("Computer", 85.0)
        ])

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "object_originality"})

        assert not is_spoofed
        assert "face_analysis" not in context
        mock_rekognition.detect_faces.assert_not_called()

    @pytest.mark.asyncio
    async def test_face_pose_variance_computed_across_frames(self, mock_boto3_client):
        """Variance metrics should be computed when multiple frames have face data."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Person", 98.0), ("Face", 95.0)
        ])
        # Simulate natural head movement across 3 frames
        mock_rekognition.detect_faces.side_effect = [
            _make_detect_faces_response(pose=(5.0, 1.0, -3.0), quality=(80.0, 90.0)),
            _make_detect_faces_response(pose=(7.2, 0.5, 2.0), quality=(82.0, 88.0)),
            _make_detect_faces_response(pose=(4.8, 1.5, -1.5), quality=(79.0, 91.0)),
        ]

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame() for _ in range(3)]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "standard"})

        assert "face_analysis" in context
        variance = context["face_analysis"]["pose_variance_metrics"]
        assert variance["yaw_std_dev"] > 0
        assert variance["pitch_std_dev"] > 0
        assert variance["interpretation"] == "natural_variance"

    @pytest.mark.asyncio
    async def test_face_pose_zero_variance_flagged_as_static(self, mock_boto3_client):
        """Near-identical face pose across frames should be flagged as suspiciously_static."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Person", 98.0), ("Face", 95.0)
        ])
        # Simulate a static image — identical pose across all frames
        static_face = _make_detect_faces_response(pose=(5.0, 1.0, -3.0), quality=(80.0, 90.0))
        mock_rekognition.detect_faces.side_effect = [static_face, static_face, static_face]

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame() for _ in range(3)]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "standard"})

        variance = context["face_analysis"]["pose_variance_metrics"]
        assert variance["yaw_std_dev"] == 0
        assert variance["pitch_std_dev"] == 0
        assert variance["interpretation"] == "suspiciously_static"

    @pytest.mark.asyncio
    async def test_detect_faces_error_handled_gracefully(self, mock_boto3_client):
        """If DetectFaces throws, the provider should still return label context."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Person", 98.0)
        ])
        mock_rekognition.detect_faces.side_effect = Exception("Rekognition throttled")

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "standard"})

        assert not is_spoofed
        assert context["status"] == "success"
        # face_analysis should be absent since DetectFaces failed
        assert "face_analysis" not in context


class TestVerificationProfilesSpoofLabels:
    """Tests for profile-aware spoof label handling in Rekognition."""

    @pytest.mark.asyncio
    async def test_standard_profile_blocks_on_screen_label(self, mock_boto3_client):
        """Standard profile should hard-fail when 'Screen' is detected."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Screen", 90.0), ("Monitor", 85.0)
        ])

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "standard"})

        assert is_spoofed is True
        assert context["status"] == "failed"
        assert "Screen" in context["spoof_evidence"]

    @pytest.mark.asyncio
    async def test_object_originality_allows_electronics(self, mock_boto3_client):
        """Object originality profile should NOT fail on electronics labels."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Laptop", 95.0), ("Electronics", 90.0), ("Screen", 88.0), ("Keyboard", 85.0)
        ])

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "object_originality"})

        assert is_spoofed is False
        assert context["status"] == "success"

    @pytest.mark.asyncio
    async def test_static_human_defers_spoof_to_tier3(self, mock_boto3_client):
        """Static human profile should collect spoof evidence but defer to Tier 3."""
        mock_rekognition = MagicMock()
        mock_boto3_client.return_value = mock_rekognition

        mock_rekognition.detect_labels.return_value = _make_detect_labels_response([
            ("Screen", 75.0), ("Person", 95.0)
        ])
        mock_rekognition.detect_faces.return_value = _make_detect_faces_response(
            pose=(5.0, 1.0, -3.0), quality=(80.0, 90.0)
        )

        provider = AmazonRekognitionProvider()
        frames = [_make_dummy_frame()]
        is_spoofed, context = await provider.extract_context(frames, {"verification_profile": "static_human"})

        assert is_spoofed is False  # Should NOT hard-fail
        assert "deferred_spoof_indicators" in context
        assert context["deferred_spoof_indicators"][0]["label"] == "Screen"


class TestIMUContextInPrompt:
    """Tests for IMU context injection into GenAI evaluate_trust prompts."""

    @pytest.mark.asyncio
    async def test_imu_context_included_in_nova_prompt(self, mock_boto3_client):
        """IMU context with motion data should appear in the Nova prompt body."""
        mock_runtime = MagicMock()
        mock_boto3_client.return_value = mock_runtime

        expected_response = {
            "output": {
                "message": {
                    "content": [{"text": '{"trust_score": 88, "explanation": "Cross-modal check passed."}'}]
                }
            }
        }
        mock_body = MagicMock()
        mock_body.read.return_value = json.dumps(expected_response).encode("utf-8")
        mock_runtime.invoke_model.return_value = {"body": mock_body}

        provider = AmazonNova2LiteProvider()
        imu_context = {
            "has_data": True,
            "gyro_gamma_range": 23.45,
            "gyro_gamma_std_dev": 8.12,
            "motion_detected": True,
            "motion_interpretation": "device_was_panned",
            "accel_magnitude_std_dev": 0.34,
            "accel_interpretation": "natural_hand_tremor"
        }

        score, explanation = await provider.evaluate_trust(
            ["frame1"], {"status": "success"}, metadata=None, imu_context=imu_context
        )

        assert score == 88
        # Verify IMU data was serialized into the prompt
        call_body = json.loads(mock_runtime.invoke_model.call_args[1]["body"])
        prompt_content = call_body["messages"][0]["content"]
        prompt_text = [c["text"] for c in prompt_content if "text" in c][0]
        assert "Device IMU Sensor Data" in prompt_text
        assert "device_was_panned" in prompt_text

    @pytest.mark.asyncio
    async def test_no_imu_block_when_no_data(self, mock_boto3_client):
        """When has_data is False, IMU block should not appear in prompt."""
        mock_runtime = MagicMock()
        mock_boto3_client.return_value = mock_runtime

        expected_response = {
            "output": {
                "message": {
                    "content": [{"text": '{"trust_score": 75, "explanation": "No IMU data available."}'}]
                }
            }
        }
        mock_body = MagicMock()
        mock_body.read.return_value = json.dumps(expected_response).encode("utf-8")
        mock_runtime.invoke_model.return_value = {"body": mock_body}

        provider = AmazonNova2LiteProvider()
        imu_context = {"has_data": False}

        score, explanation = await provider.evaluate_trust(
            ["frame1"], {"status": "success"}, metadata=None, imu_context=imu_context
        )

        call_body = json.loads(mock_runtime.invoke_model.call_args[1]["body"])
        prompt_content = call_body["messages"][0]["content"]
        prompt_text = [c["text"] for c in prompt_content if "text" in c][0]
        assert "Device IMU Sensor Data" not in prompt_text

    @pytest.mark.asyncio
    async def test_profile_preamble_in_nova_prompt(self, mock_boto3_client):
        """Verification profile preamble should appear in the Nova prompt."""
        mock_runtime = MagicMock()
        mock_boto3_client.return_value = mock_runtime

        expected_response = {
            "output": {
                "message": {
                    "content": [{"text": '{"trust_score": 90, "explanation": "Object verified."}'}]
                }
            }
        }
        mock_body = MagicMock()
        mock_body.read.return_value = json.dumps(expected_response).encode("utf-8")
        mock_runtime.invoke_model.return_value = {"body": mock_body}

        provider = AmazonNova2LiteProvider()
        score, explanation = await provider.evaluate_trust(
            ["frame1"], {"status": "success"},
            metadata={"verification_profile": "object_originality"},
            imu_context={"has_data": False}
        )

        call_body = json.loads(mock_runtime.invoke_model.call_args[1]["body"])
        prompt_content = call_body["messages"][0]["content"]
        prompt_text = [c["text"] for c in prompt_content if "text" in c][0]
        assert "OBJECT ORIGINALITY" in prompt_text

