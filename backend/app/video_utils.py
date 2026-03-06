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
        
        # FIX: Browser-recorded WebM files often lack duration metadata, causing OpenCV to report <= 0 frames.
        # If this happens, we must manually read frames to determine length and sample them.
        if total_frames <= 0:
            logger.warning(f"Metadata reported 0 frames for {video_path}, falling back to manual frame extraction.")
            
            # PASS 1: Count total frames efficiently without decoding arrays to RAM (Prevents OOM Crashes)
            total_frames = 0
            while True:
                ret = cap.grab()
                if not ret:
                    break
                total_frames += 1
            
            if total_frames == 0:
                logger.error(f"Video {video_path} is completely empty or unsupported by OpenCV/FFmpeg.")
                cap.release()
                return frames_base64
                
            step = max(1, total_frames // num_frames)
            frame_indices = sorted(list(set([min(i * step, total_frames - 1) for i in range(num_frames)])))
            target_set = set(frame_indices)
            
            # PASS 2: Re-open and extract the precise target frames
            cap.release()
            
            cap = cv2.VideoCapture(video_path)
            current_frame = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                if current_frame in target_set:
                    _process_and_encode_frame(frame, frames_base64)
                    
                current_frame += 1
                if current_frame > max(frame_indices):
                    break # Optimization: exit early once all targets are hit
                    
            cap.release()
            return frames_base64
        step = max(1, total_frames // num_frames)
        frame_indices = [min(i * step, total_frames - 1) for i in range(num_frames)]
        frame_indices = sorted(list(set(frame_indices)))
        
        for target_idx in frame_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
            ret, frame = cap.read()
            if ret:
                _process_and_encode_frame(frame, frames_base64)
            else:
                logger.warning(f"Failed to read frame {target_idx} from video {video_path}")
                
        cap.release()
    except Exception as e:
        logger.error(f"Error during OpenCV frame extraction: {e}")
        
    return frames_base64

def _process_and_encode_frame(frame, frames_base64_list):
    """Helper to downscale and base64-encode a single OpenCV frame."""
    h, w = frame.shape[:2]
    max_dim = 512
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        new_w, new_h = int(w * scale), int(h * scale)
        frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    b64_str = base64.b64encode(buffer).decode('utf-8')
    frames_base64_list.append(b64_str)
