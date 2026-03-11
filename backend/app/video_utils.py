import base64
import logging
import os
import shutil
import subprocess
import tempfile
from typing import List

import cv2

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
            logger.warning(f"OpenCV could not open video at {video_path}; attempting ffmpeg fallback")
            return _extract_sparse_keyframes_ffmpeg(video_path, num_frames=num_frames)

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Browser-recorded WebM files often lack duration metadata, causing OpenCV
        # to report <= 0 frames. Count them manually before sampling if needed.
        if total_frames <= 0:
            logger.warning(f"Metadata reported 0 frames for {video_path}, falling back to manual frame extraction.")

            total_frames = 0
            while True:
                ret = cap.grab()
                if not ret:
                    break
                total_frames += 1

            if total_frames == 0:
                logger.warning(f"Video {video_path} could not be decoded by OpenCV; attempting ffmpeg fallback.")
                cap.release()
                return _extract_sparse_keyframes_ffmpeg(video_path, num_frames=num_frames)

            step = max(1, total_frames // num_frames)
            frame_indices = sorted(list(set([min(i * step, total_frames - 1) for i in range(num_frames)])))
            target_set = set(frame_indices)

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
                    break

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

    if frames_base64:
        return frames_base64

    return _extract_sparse_keyframes_ffmpeg(video_path, num_frames=num_frames)


def _extract_sparse_keyframes_ffmpeg(video_path: str, num_frames: int = 5) -> List[str]:
    ffmpeg_path = shutil.which('ffmpeg')
    ffprobe_path = shutil.which('ffprobe')
    if not ffmpeg_path or not ffprobe_path:
        logger.error('ffmpeg/ffprobe not available for fallback frame extraction')
        return []

    duration = _probe_video_duration(video_path, ffprobe_path)
    frames_base64 = _extract_ffmpeg_timestamps(
        video_path,
        ffmpeg_path,
        _build_sample_timestamps(duration, num_frames),
    )

    if not frames_base64:
        logger.warning(
            'Timestamp-based ffmpeg extraction failed; retrying sequential decode',
            extra={'video_path': video_path, 'duration_seconds': duration, 'requested_frames': num_frames},
        )
        frames_base64 = _extract_ffmpeg_sequential(video_path, ffmpeg_path, num_frames)

    if frames_base64:
        logger.info('ffmpeg fallback extracted frames successfully', extra={'video_path': video_path, 'frame_count': len(frames_base64)})
    else:
        logger.error(f'ffmpeg fallback could not extract any frames from {video_path}')

    return frames_base64


def _extract_ffmpeg_timestamps(video_path: str, ffmpeg_path: str, timestamps: List[float]) -> List[str]:
    frames_base64 = []

    with tempfile.TemporaryDirectory(prefix='vp-ffmpeg-frames-') as temp_dir:
        for index, timestamp in enumerate(timestamps):
            output_path = os.path.join(temp_dir, f'frame_{index}.jpg')
            command = [
                ffmpeg_path,
                '-loglevel', 'error',
                '-y',
                '-ss', f'{timestamp:.3f}',
                '-i', video_path,
                '-frames:v', '1',
                output_path,
            ]

            try:
                subprocess.run(command, check=True, capture_output=True, text=True)
            except subprocess.CalledProcessError as exc:
                stderr = (exc.stderr or '').strip()
                detail = f' stderr={stderr}' if stderr else ''
                logger.warning(f'ffmpeg fallback failed at {timestamp:.3f}s for {video_path}: exit={exc.returncode}.{detail}')
                continue
            except Exception as exc:
                logger.warning(f'ffmpeg fallback failed at {timestamp:.3f}s for {video_path}: {exc}')
                continue

            frame = cv2.imread(output_path)
            if frame is None:
                logger.warning(f'ffmpeg extracted frame could not be decoded: {output_path}')
                continue

            _process_and_encode_frame(frame, frames_base64)

    return frames_base64


def _extract_ffmpeg_sequential(video_path: str, ffmpeg_path: str, num_frames: int) -> List[str]:
    frames_base64 = []

    with tempfile.TemporaryDirectory(prefix='vp-ffmpeg-seq-frames-') as temp_dir:
        output_pattern = os.path.join(temp_dir, 'frame_%03d.jpg')
        command = [
            ffmpeg_path,
            '-loglevel', 'error',
            '-y',
            '-i', video_path,
            '-frames:v', str(max(num_frames, 1)),
            output_pattern,
        ]

        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as exc:
            stderr = (exc.stderr or '').strip()
            detail = f' stderr={stderr}' if stderr else ''
            logger.warning(f'ffmpeg sequential fallback failed for {video_path}: exit={exc.returncode}.{detail}')
            return frames_base64
        except Exception as exc:
            logger.warning(f'ffmpeg sequential fallback failed for {video_path}: {exc}')
            return frames_base64

        for file_name in sorted(os.listdir(temp_dir)):
            if not file_name.lower().endswith('.jpg'):
                continue

            output_path = os.path.join(temp_dir, file_name)
            frame = cv2.imread(output_path)
            if frame is None:
                logger.warning(f'ffmpeg sequential frame could not be decoded: {output_path}')
                continue

            _process_and_encode_frame(frame, frames_base64)
            if len(frames_base64) >= num_frames:
                break

    return frames_base64


def _probe_video_duration(video_path: str, ffprobe_path: str) -> float:
    try:
        result = subprocess.run(
            [
                ffprobe_path,
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                video_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return max(float(result.stdout.strip()), 0.0)
    except Exception as exc:
        logger.warning(f'ffprobe could not determine duration for {video_path}: {exc}')
        return 0.0


def _build_sample_timestamps(duration_seconds: float, num_frames: int) -> List[float]:
    if num_frames <= 1:
        return [0.0 if duration_seconds <= 0 else max(duration_seconds / 2.0, 0.0)]

    if duration_seconds <= 0:
        return [float(index) for index in range(num_frames)]

    last_safe_timestamp = max(duration_seconds - 0.05, 0.0)
    return [
        min(((index + 0.5) * duration_seconds) / num_frames, last_safe_timestamp)
        for index in range(num_frames)
    ]


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
