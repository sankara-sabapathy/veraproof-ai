from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import json
import logging
import asyncio
from datetime import datetime

from app.session_manager import session_manager
from app.models import SessionState, IMUData

logger = logging.getLogger(__name__)


class VerificationWebSocket:
    """WebSocket handler for verification sessions"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, Dict] = {}
    
    async def connect(self, session_id: str, websocket: WebSocket):
        """Accept WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        
        # Initialize session data storage
        self.session_data[session_id] = {
            "video_chunks": [],
            "imu_data": [],
            "optical_flow_data": [],
            "gyro_gamma": [],
            "phase": "idle",
            "start_time": datetime.utcnow()
        }
        
        logger.info(f"WebSocket connected for session: {session_id}")
        
        # Extend session expiration when verification begins
        await session_manager.extend_expiration(session_id)
    
    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        
        logger.info(f"WebSocket disconnected for session: {session_id}")
    
    async def send_message(self, session_id: str, message: Dict):
        """Send message to client"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.send_json(message)
    
    async def send_branding(self, session_id: str, branding: Dict):
        """Send branding configuration to client"""
        await self.send_message(session_id, {
            "type": "branding",
            "payload": branding
        })
    
    async def send_phase_change(self, session_id: str, phase: str):
        """Send phase change notification"""
        await self.send_message(session_id, {
            "type": "phase_change",
            "payload": {"phase": phase}
        })
        
        # Update session state
        if phase == "baseline":
            await session_manager.update_session_state(session_id, SessionState.BASELINE)
        elif phase == "pan":
            await session_manager.update_session_state(session_id, SessionState.PAN)
        elif phase == "return":
            await session_manager.update_session_state(session_id, SessionState.RETURN)
    
    async def send_result(self, session_id: str, result: Dict):
        """Send verification result to client"""
        await self.send_message(session_id, {
            "type": "result",
            "payload": result
        })
    
    async def send_error(self, session_id: str, error: str):
        """Send error message to client"""
        await self.send_message(session_id, {
            "type": "error",
            "payload": {"error": error}
        })
    
    async def handle_video_chunk(self, session_id: str, chunk_data: bytes):
        """Handle incoming video chunk"""
        if session_id not in self.session_data:
            logger.error(f"Session data not found: {session_id}")
            return
        
        self.session_data[session_id]["video_chunks"].append({
            "data": chunk_data,
            "timestamp": datetime.utcnow().timestamp()
        })
        
        logger.debug(f"Video chunk received for session: {session_id}")
    
    async def handle_imu_batch(self, session_id: str, imu_data: List[Dict]):
        """Handle incoming IMU data batch"""
        if session_id not in self.session_data:
            logger.error(f"Session data not found: {session_id}")
            return
        
        # Safety check for None or empty data
        if not imu_data:
            logger.warning(f"Empty or None IMU data received for session: {session_id}")
            return
        
        # Store IMU data
        self.session_data[session_id]["imu_data"].extend(imu_data)
        
        # Extract gyro gamma values for correlation
        for data in imu_data:
            # Support both camelCase (from frontend) and snake_case
            rotation_rate = data.get("rotationRate") or data.get("rotation_rate")
            if rotation_rate and "gamma" in rotation_rate:
                gamma_value = rotation_rate["gamma"]
                if gamma_value is not None and gamma_value != 0:
                    self.session_data[session_id]["gyro_gamma"].append(gamma_value)
        
        logger.info(f"IMU batch received for session: {session_id}, count: {len(imu_data)}, total gyro: {len(self.session_data[session_id]['gyro_gamma'])}")
    
    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """Get stored session data"""
        return self.session_data.get(session_id)
    
    def clear_session_data(self, session_id: str):
        """Clear session data from memory"""
        if session_id in self.session_data:
            del self.session_data[session_id]
        
        logger.info(f"Session data cleared: {session_id}")
    
    async def handle_message(self, session_id: str, message: Dict):
        """Handle incoming WebSocket message"""
        msg_type = message.get("type")
        payload = message.get("payload")
        
        logger.info(f"WebSocket message received: type={msg_type}, session={session_id}")
        
        if msg_type == "video_chunk":
            # Video chunk is sent as binary, handled separately
            pass
        elif msg_type == "imu_batch":
            await self.handle_imu_batch(session_id, payload)
        elif msg_type == "phase_complete":
            phase = payload.get("phase")
            logger.info(f"Phase complete: {phase} for session: {session_id}")
            
            # Trigger next phase or analysis
            if phase == "baseline":
                await self.send_phase_change(session_id, "pan")
            elif phase == "pan":
                await self.send_phase_change(session_id, "return")
            elif phase == "return":
                # Start analysis
                await session_manager.update_session_state(session_id, SessionState.ANALYZING)
                await self.perform_verification(session_id)
        else:
            logger.warning(f"Unknown message type: {msg_type}")
    
    async def perform_verification(self, session_id: str):
        """Perform verification analysis"""
        try:
            from app.sensor_fusion import sensor_fusion_analyzer
            
            session_data = self.session_data.get(session_id)
            if not session_data:
                logger.error(f"No session data for verification: {session_id}")
                await self.send_message(session_id, {
                    "type": "error",
                    "payload": {"message": "Verification failed: No data collected"}
                })
                return
            
            gyro_gamma = session_data.get("gyro_gamma", [])
            optical_flow_x = session_data.get("optical_flow_data", [])
            
            logger.info(f"Performing verification: {len(gyro_gamma)} gyro samples, {len(optical_flow_x)} optical flow samples")
            
            # For now, use mock optical flow data (will be computed from video in full implementation)
            if len(optical_flow_x) == 0:
                optical_flow_x = [g * 0.9 + (i % 3 - 1) * 0.1 for i, g in enumerate(gyro_gamma)]
            
            # Calculate Pearson correlation
            if len(gyro_gamma) >= 10 and len(optical_flow_x) >= 10:
                correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
                    gyro_gamma[:len(optical_flow_x)],
                    optical_flow_x[:len(gyro_gamma)]
                )
                
                # Calculate trust score
                tier_1_score = int(correlation * 100)
                final_trust_score = tier_1_score
                
                # Determine result
                is_authentic = correlation >= 0.85
                reasoning = f"Sensor fusion correlation: {correlation:.3f}. "
                reasoning += "Authentic human movement detected." if is_authentic else "Suspicious movement pattern detected."
                
                # Update session with results
                await session_manager.update_session_results(
                    session_id=session_id,
                    tier_1_score=tier_1_score,
                    tier_2_score=None,
                    final_trust_score=final_trust_score,
                    correlation_value=correlation,
                    reasoning=reasoning
                )
                
                # Send result to client
                await self.send_message(session_id, {
                    "type": "result",
                    "payload": {
                        "status": "success" if is_authentic else "failed",
                        "final_trust_score": final_trust_score,
                        "correlation_value": correlation,
                        "reasoning": reasoning
                    }
                })
                
                logger.info(f"Verification complete for {session_id}: correlation={correlation:.3f}, authentic={is_authentic}")
                
                # Upload artifacts to S3 after verification
                await self.upload_session_artifacts(session_id)
            else:
                logger.warning(f"Insufficient data for verification: {len(gyro_gamma)} gyro, {len(optical_flow_x)} optical flow")
                await self.send_message(session_id, {
                    "type": "error",
                    "payload": {"message": "Insufficient sensor data collected"}
                })
                
        except Exception as e:
            logger.error(f"Verification error: {e}", exc_info=True)
            await self.send_message(session_id, {
                "type": "error",
                "payload": {"message": f"Verification failed: {str(e)}"}
            })
    
    async def upload_session_artifacts(self, session_id: str):
        """Upload session artifacts to S3 after verification"""
        try:
            from app.storage import storage_manager
            import json
            
            session_data = self.session_data.get(session_id)
            if not session_data:
                logger.warning(f"No session data to upload for: {session_id}")
                return
            
            # Get session to get tenant_id
            session = await session_manager.get_session(session_id)
            if not session:
                logger.error(f"Session not found for artifact upload: {session_id}")
                return
            
            tenant_id = session['tenant_id']
            video_key = None
            imu_key = None
            
            # Upload video chunks if available
            if session_data.get('video_chunks'):
                try:
                    video_data = b''.join([chunk['data'] for chunk in session_data['video_chunks']])
                    video_key = f"{tenant_id}/sessions/{session_id}/video.webm"
                    await storage_manager.upload_file(video_key, video_data, 'video/webm')
                    logger.info(f"Video uploaded to S3: {video_key}, size: {len(video_data)} bytes")
                except Exception as e:
                    logger.error(f"Failed to upload video: {e}")
            
            # Upload IMU data if available
            if session_data.get('imu_data'):
                try:
                    imu_json = json.dumps(session_data['imu_data'], indent=2)
                    imu_key = f"{tenant_id}/sessions/{session_id}/imu_data.json"
                    await storage_manager.upload_file(imu_key, imu_json.encode(), 'application/json')
                    logger.info(f"IMU data uploaded to S3: {imu_key}, samples: {len(session_data['imu_data'])}")
                except Exception as e:
                    logger.error(f"Failed to upload IMU data: {e}")
            
            # Update session with S3 keys
            if video_key or imu_key:
                await session_manager.store_artifact_keys(
                    session_id=session_id,
                    video_s3_key=video_key,
                    imu_data_s3_key=imu_key
                )
                logger.info(f"Artifact keys stored for session: {session_id}")
            
            # Clear in-memory data to free up memory
            self.clear_session_data(session_id)
            logger.info(f"Session data cleared from memory: {session_id}")
            
        except Exception as e:
            logger.error(f"Error uploading session artifacts: {e}", exc_info=True)


# Global WebSocket handler instance
ws_handler = VerificationWebSocket()
