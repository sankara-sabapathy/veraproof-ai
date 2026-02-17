import cv2
import numpy as np
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class OpticalFlowEngine:
    """Optical flow computation using OpenCV"""
    
    def __init__(self):
        self.prev_frame: Optional[np.ndarray] = None
        self.prev_gray: Optional[np.ndarray] = None
    
    def compute_flow(self, frame: np.ndarray) -> Tuple[Optional[np.ndarray], float]:
        """
        Compute optical flow using Farneback algorithm
        Returns: (flow array, horizontal magnitude)
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Need previous frame for optical flow
            if self.prev_gray is None:
                self.prev_gray = gray
                return None, 0.0
            
            # Compute dense optical flow using Farneback method
            flow = cv2.calcOpticalFlowFarneback(
                self.prev_gray,
                gray,
                None,
                pyr_scale=0.5,
                levels=3,
                winsize=15,
                iterations=3,
                poly_n=5,
                poly_sigma=1.2,
                flags=0
            )
            
            # Extract horizontal magnitude
            horizontal_magnitude = self.extract_horizontal_magnitude(flow)
            
            # Update previous frame
            self.prev_gray = gray
            
            return flow, horizontal_magnitude
            
        except Exception as e:
            logger.error(f"Optical flow computation failed: {e}")
            return None, 0.0
    
    def extract_horizontal_magnitude(self, flow: np.ndarray) -> float:
        """
        Extract horizontal movement magnitude (Optical Flow X)
        """
        # Flow is (height, width, 2) where [:,:,0] is horizontal (x) component
        horizontal_flow = flow[:, :, 0]
        
        # Calculate mean absolute horizontal flow
        horizontal_magnitude = np.mean(np.abs(horizontal_flow))
        
        return float(horizontal_magnitude)
    
    def reset(self):
        """Reset optical flow engine state"""
        self.prev_frame = None
        self.prev_gray = None
        logger.debug("Optical flow engine reset")
    
    def process_video_chunk(self, video_data: bytes) -> Optional[float]:
        """
        Process video chunk and return horizontal flow magnitude
        """
        try:
            # Decode video chunk
            nparr = np.frombuffer(video_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                logger.warning("Failed to decode video frame")
                return None
            
            # Compute optical flow
            _, horizontal_magnitude = self.compute_flow(frame)
            
            return horizontal_magnitude
            
        except Exception as e:
            logger.error(f"Video chunk processing failed: {e}")
            return None


# Global optical flow engine instance
optical_flow_engine = OpticalFlowEngine()
