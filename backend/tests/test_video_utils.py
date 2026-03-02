import pytest
from unittest.mock import MagicMock, patch
from app.video_utils import extract_sparse_keyframes
import numpy as np

def test_extract_sparse_keyframes_success():
    """Test successful sparse extraction of OpenCV video frames"""
    with patch("cv2.VideoCapture") as mock_vc, \
         patch("cv2.imencode") as mock_imencode, \
         patch("os.path.exists") as mock_exists:
         
        mock_exists.return_value = True
        
        # Mock OpenCV VideoCapture cap object
        mock_cap = MagicMock()
        mock_cap.isOpened.return_value = True
        mock_cap.get.return_value = 10  # 10 frames total
        
        # Return a small mock frame image matrix (100x100)
        mock_cap.read.return_value = (True, np.zeros((100, 100, 3), dtype=np.uint8))
        
        mock_vc.return_value = mock_cap
        
        # Mock the JPEG compression return buffer
        mock_imencode.return_value = (True, np.zeros(10, dtype=np.uint8))
        
        # Execute the function
        frames = extract_sparse_keyframes("dummy.mp4", num_frames=5)
        
        # Should return exactly 5 frames as extracted
        assert len(frames) == 5
        # Ensure it captured the expected base64 format strings
        assert all(isinstance(f, str) for f in frames)
        assert mock_cap.set.call_count == 5

def test_extract_sparse_keyframes_missing_file():
    """Test robust handling of a non-existent chunk file"""
    with patch("os.path.exists") as mock_exists:
        mock_exists.return_value = False
        
        frames = extract_sparse_keyframes("missing.mp4")
        assert len(frames) == 0
