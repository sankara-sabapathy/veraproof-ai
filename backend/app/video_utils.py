import cv2
import base64
import logging
from typing import List
import os

logger = logging.getLogger(__name__)

def extract_sparse_keyframes(video_path: str, num_frames: int = 5) -> List[str]:
    """
    Extracts `num_frames` sparse keyframes evenly distributed across the video.
    Returns them as a list of Base64 encoded JPEG strings.
    """
    frames_base64 = []
    
    if not os.path.exists(video_path):
        logger.error(f"Video path does not exist: {video_path}")
        return frames_base64

    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video at {video_path}")
            return frames_base64
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            logger.warning(f"Video {video_path} has 0 frames.")
            cap.release()
            return frames_base64
            
        # Calculate indices to extract evenly spaced frames
        step = max(1, total_frames // num_frames)
        frame_indices = [min(i * step, total_frames - 1) for i in range(num_frames)]
        
        # In case the video is very short, make sure we only capture valid unique indices
        frame_indices = sorted(list(set(frame_indices)))
        
        for target_idx in frame_indices:
            # Set video position
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame = cap.read()
            if ret:
                # Downscale the frame to reduce LLM token count and payload size
                h, w = frame.shape[:2]
                max_dim = 512
                if max(h, w) > max_dim:
                    scale = max_dim / float(max(h, w))
                    new_w, new_h = int(w * scale), int(h * scale)
                    frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

                # Encode to high-quality JPEG
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                b64_str = base64.b64encode(buffer).decode('utf-8')
                frames_base64.append(b64_str)
            else:
                logger.warning(f"Failed to read frame {target_idx} from video {video_path}")
                
        cap.release()
    except Exception as e:
        logger.error(f"Error during OpenCV frame extraction: {e}")
        
    return frames_base64
