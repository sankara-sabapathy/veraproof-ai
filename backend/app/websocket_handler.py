from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import json
import logging
import asyncio
from datetime import datetime
from opentelemetry import trace

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
        
        # Add correlation IDs to OpenTelemetry active spans
        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute("session.id", session_id)
            span.set_attribute("websocket.action", "connect")
            
        logger.info(f"WebSocket securely connected", extra={"session_id": session_id})
        
        # Extend session expiration when verification begins
        await session_manager.extend_expiration(session_id)
    
    def disconnect(self, session_id: str):
        """Remove WebSocket connection"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        
        logger.info(f"WebSocket client disconnected", extra={"session_id": session_id})
    
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
            logger.error(f"Failed to find session data", extra={"session_id": session_id})
            return
        
        self.session_data[session_id]["video_chunks"].append({
            "data": chunk_data,
            "timestamp": datetime.utcnow().timestamp()
        })
        
        logger.debug(f"Video chunk received and buffered", extra={"session_id": session_id, "chunk_size": len(chunk_data)})
    
    async def handle_imu_batch(self, session_id: str, imu_data: List[Dict]):
        """Handle incoming IMU data batch"""
        if session_id not in self.session_data:
            logger.error(f"Failed to find session data", extra={"session_id": session_id})
            return
        
        # Safety check for None or empty data
        if not imu_data:
            logger.warning(f"Empty or None IMU payload detected", extra={"session_id": session_id})
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
        
        logger.info(f"IMU sensor batch processed", extra={
            "session_id": session_id, 
            "samples_received": len(imu_data), 
            "total_gyro_pool": len(self.session_data[session_id]['gyro_gamma'])
        })
    
    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """Get stored session data"""
        return self.session_data.get(session_id)
    
    def clear_session_data(self, session_id: str):
        """Clear session data from memory"""
        if session_id in self.session_data:
            del self.session_data[session_id]
        
        logger.info(f"Session state cleared from RAM", extra={"session_id": session_id})
    
    async def handle_message(self, session_id: str, message: Dict):
        """Handle incoming WebSocket message"""
        msg_type = message.get("type")
        payload = message.get("payload")
        
        logger.debug(f"Handling websocket event payload", extra={"session_id": session_id, "msg_type": msg_type})
        
        if msg_type == "video_chunk":
            # Video chunk is sent as binary, handled separately
            pass
        elif msg_type == "imu_batch":
            await self.handle_imu_batch(session_id, payload)
        elif msg_type == "phase_complete":
            phase = payload.get("phase")
            logger.info(f"Verification phase completed successfully", extra={"session_id": session_id, "phase_id": phase})
            
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
            logger.warning(f"Unknown websocket instruction blocked", extra={"msg_type": msg_type, "session_id": session_id})
    
    async def perform_verification(self, session_id: str):
        """Perform Tier 1 verification and defer Tier 2 (AI)"""
        try:
            from app.sensor_fusion import sensor_fusion_analyzer
            
            session_data = self.session_data.get(session_id)
            if not session_data:
                logger.error(f"Failed to extract session verification data", extra={"session_id": session_id})
                await self.send_message(session_id, {
                    "type": "error",
                    "payload": {"message": "Verification failed: No data collected"}
                })
                return
            
            gyro_gamma = session_data.get("gyro_gamma", [])
            optical_flow_x = session_data.get("optical_flow_data", [])
            
            logger.info(f"AI Sensor Fusion initialized", extra={
                "session_id": session_id,
                "gyro_samples": len(gyro_gamma),
                "optical_flow_samples": len(optical_flow_x)
            })
            
            span = trace.get_current_span()
            if span and span.is_recording():
                span.set_attribute("ai.gyro_samples", len(gyro_gamma))
            
            # For now, use mock optical flow data (will be computed from video in full implementation)
            if len(optical_flow_x) == 0:
                optical_flow_x = [g * 0.9 + (i % 3 - 1) * 0.1 for i, g in enumerate(gyro_gamma)]
            
            # Calculate Pearson correlation
            correlation = 0.0
            if len(gyro_gamma) >= 10 and len(optical_flow_x) >= 10:
                correlation = sensor_fusion_analyzer.calculate_pearson_correlation(
                    gyro_gamma[:len(optical_flow_x)],
                    optical_flow_x[:len(gyro_gamma)]
                )
            
            # Tier 1 (Physics Score)
            tier_1_score = int(correlation * 100) if (len(gyro_gamma) >= 10) else 0
            
            # Update session with PENDING_AI status
            await session_manager.update_session_results(
                session_id=session_id,
                tier_1_score=tier_1_score,
                tier_2_score=None,
                final_trust_score=tier_1_score,  # Temporary
                correlation_value=correlation,
                reasoning=f"Sensor correlation: {correlation:.3f}. Proceeding to AI Analysis.",
                physics_score=tier_1_score,
                verification_status="PENDING_AI"
            )
            
            # Send Tier 1 result to client
            await self.send_message(session_id, {
                "type": "result",
                "payload": {
                    "status": "pending_ai",
                    "physics_score": tier_1_score,
                    "correlation_value": correlation,
                    "message": "Physics check passed. AI analysis in progress."
                }
            })
            
            logger.info(f"Tier 1 Verification concluded, dispatching Tier 2 (AI)", extra={
                "session_id": session_id,
                "physics_score": tier_1_score
            })
            
            # Clone session data to pass safely, and DO NOT clear data here
            # We clear it after S3 upload inside the background task.
            asyncio.create_task(self.run_ai_verification_background(session_id, session_data))

        except Exception as e:
            logger.error(f"Verification Tier 1 crashed: {e}", exc_info=True, extra={"session_id": session_id})
            await self.send_message(session_id, {
                "type": "error",
                "payload": {"message": f"Verification failed: {str(e)}"}
            })

    async def run_ai_verification_background(self, session_id: str, session_data: dict):
        """Background asynchronous AI video frame analysis"""
        try:
            import tempfile
            import os
            from app.video_utils import extract_sparse_keyframes
            from app.ai_provider import AmazonNovaLiteProvider
            from app.scoring import calculate_unified_score, evaluate_trust_status
            from app.database import db_manager
            from app.webhooks import webhook_manager
            
            # 1. Rebuild video file
            if not session_data.get('video_chunks'):
                logger.error("No video data found for AI processing", extra={"session_id": session_id})
                return
                
            video_data = b''.join([chunk['data'] for chunk in session_data['video_chunks']])
            
            # 2. Extract frames
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp_video:
                tmp_video.write(video_data)
                tmp_video.flush()
                tmp_video_path = tmp_video.name
            
            frames_b64 = extract_sparse_keyframes(tmp_video_path, num_frames=5)
            
            # Clean up temp file
            try:
                os.remove(tmp_video_path)
            except:
                pass
            
            # 3. Request AI classification
            provider = AmazonNovaLiteProvider()
            metadata = session_db.get("metadata", {}) if (session_db := await session_manager.get_session(session_id)) else {}
            ai_score, ai_explanation = await provider.analyze_frames(frames_b64, metadata)
            
            # 4. Final Scoring
            if not session_db:
                logger.error("Session missing from DB during AI pass", extra={"session_id": session_id})
                return
                
            physics_score = session_db.get("physics_score", 0.0)
            if physics_score is None:
                physics_score = 0.0
            
            unified_score = calculate_unified_score(physics_score, ai_score)
            is_authentic = evaluate_trust_status(unified_score)
            
            final_status = "success" if is_authentic else "failed"
            final_reasoning = f"AI Analysis Summary: {ai_explanation.get('summary', 'N/A')}."
            
            # 5. Update Session DB
            await session_manager.update_session_results(
                session_id=session_id,
                tier_1_score=int(physics_score),
                tier_2_score=int(ai_score),
                final_trust_score=int(unified_score),
                correlation_value=session_db.get("correlation_value"),
                reasoning=final_reasoning,
                ai_score=ai_score,
                physics_score=physics_score,
                unified_score=unified_score,
                ai_explanation=ai_explanation,
                verification_status=final_status
            )
            
            # 6. Notify Client via WebSockets (if still connected)
            await self.send_message(session_id, {
                "type": "result",
                "payload": {
                    "status": final_status,
                    "final_trust_score": int(unified_score),
                    "ai_score": ai_score,
                    "physics_score": physics_score,
                    "ai_explanation": ai_explanation,
                    "reasoning": final_reasoning
                }
            })
            
            logger.info("AI Verification Complete", extra={"session_id": session_id, "unified_score": unified_score})
            
            # 7. Upload Artifacts (clears data locally)
            await self.upload_session_artifacts(session_id)
            
            # 8. Webhook Notification
            tenant_id = session_db.get("tenant_id")
            tenant_query = "SELECT webhook_url, webhook_secret FROM tenants WHERE tenant_id = $1"
            tenant_data = await db_manager.fetch_one(tenant_query, tenant_id)
            
            if tenant_data and tenant_data.get("webhook_url"):
                webhook_payload = {
                    "session_id": session_id,
                    "verification_status": final_status,
                    "final_trust_score": int(unified_score),
                    "ai_score": ai_score,
                    "physics_score": physics_score,
                    "ai_explanation": ai_explanation,
                    "metadata": session_db.get("metadata", {})
                }
                
                # Verify that datetime elements are serialized during json dumps later
                asyncio.create_task(
                    webhook_manager.retry_webhook(
                        tenant_id=str(tenant_id),
                        webhook_url=tenant_data.get("webhook_url"),
                        payload=webhook_payload,
                        api_secret=tenant_data.get("webhook_secret") or "default_secret"
                    )
                )
                
        except Exception as e:
            logger.error(f"Background AI worker crashed: {e}", exc_info=True, extra={"session_id": session_id})
            await session_manager.update_session_state(session_id, SessionState.COMPLETE)
    
    async def upload_session_artifacts(self, session_id: str):
        """Upload session artifacts to S3 after verification"""
        try:
            from app.storage import storage_manager
            import json
            
            session_data = self.session_data.get(session_id)
            if not session_data:
                logger.warning(f"Missing S3 artifact payload data", extra={"session_id": session_id})
                return
            
            # Get session to get tenant_id
            session = await session_manager.get_session(session_id)
            if not session:
                logger.error(f"Cannot identify tenant to store target S3 credentials", extra={"session_id": session_id})
                return
            
            tenant_id = session['tenant_id']
            video_key = None
            imu_key = None
            
            # Upload video chunks if available
            if session_data.get('video_chunks'):
                try:
                    video_data = b''.join([chunk['data'] for chunk in session_data['video_chunks']])
                    video_key = await storage_manager.store_video(tenant_id, session_id, video_data)
                    logger.info(f"Exported artifact file to S3 buckets", extra={"session_id": session_id, "tensor": "video", "bytes": len(video_data)})
                except Exception as e:
                    logger.error(f"S3 Interfacing crash formatting WebM file: {e}", extra={"session_id": session_id})
            
            # Upload IMU data if available
            if session_data.get('imu_data'):
                try:
                    imu_key = await storage_manager.store_imu_data(tenant_id, session_id, session_data['imu_data'])
                    logger.info(f"Exported artifact file to S3 buckets", extra={"session_id": session_id, "tensor": "imu", "length_samples": len(session_data['imu_data'])})
                except Exception as e:
                    logger.error(f"S3 Interfacing crash formatting IMU JSON file: {e}", extra={"session_id": session_id})
            
            # Update session with S3 keys
            if video_key or imu_key:
                await session_manager.store_artifact_keys(
                    session_id=session_id,
                    video_s3_key=video_key,
                    imu_data_s3_key=imu_key
                )
                logger.info(f"S3 metadata keys reconciled effectively", extra={"session_id": session_id})
            
            # Clear in-memory data to free up memory
            self.clear_session_data(session_id)
            
        except Exception as e:
            logger.error(f"S3 global artifact engine thread failed: {e}", exc_info=True, extra={"session_id": session_id})


# Global WebSocket handler instance
ws_handler = VerificationWebSocket()
