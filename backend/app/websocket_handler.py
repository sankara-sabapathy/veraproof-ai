from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Optional
import json
import logging
import asyncio
import time
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
        
        # Prevent data wipe if a user refreshes the tab while the background AI worker is analyzing
        session_db_record = await session_manager.get_session(session_id)
        if session_db_record:
            state = session_db_record.get("state")
            status = session_db_record.get("verification_status")
            
            # If the session has already advanced past data collection, protect the RAM and do not restart the playbook.
            if state in [SessionState.ANALYZING.value, "success", "failed"] or status in ["success", "failed"]:
                logger.info("Client reconnected to an already completed/analyzing session", extra={"session_id": session_id})
                
                # If Tier 3 AI has already firmly finalized this session, re-transmit the final score to the frontend.
                if session_db_record.get("unified_score") is not None:
                    await self.send_message(session_id, {
                        "type": "result",
                        "payload": {
                            "status": "success",
                            "reasoning": "Verification complete. You can close this tab and return to your application."
                        }
                    })
                return # Abort playbook restart to cleanly wait for AI to finish or dashboard to render
        
        # Initialize session data storage for a fresh run
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

        # Trigger the dynamic verification playbook sequence in the background
        asyncio.create_task(self.run_playbook(session_id))
    
    async def run_playbook(self, session_id: str):
        """Execute the Verification Playbook (custom or default fallback)"""
        session_db_record = await session_manager.get_session(session_id)
        if not session_db_record:
            logger.error("Could not find session in db to run playbook", extra={"session_id": session_id})
            return

        commands = session_db_record.get("verification_commands")

        # Fallback Algorithm: If no custom commands exist (or list is empty string "[]"), construct the 15s physics default.
        if not commands or isinstance(commands, str) and commands == "[]" or len(commands) == 0:
            commands = [
                {"text": "Reflect your face and slowly pan your phone to the RIGHT", "lens": "user", "duration": 5},
                {"text": "Slowly return your phone to the LEFT", "lens": "user", "duration": 5},
                {"text": "Stay centered. Analyzing data...", "lens": "user", "duration": 5}
            ]
        elif isinstance(commands, str):
            commands = json.loads(commands)
            
        # Dynamically calculate the ACTUAL session duration from the playbook commands
        session_duration = sum(cmd.get("duration", 0) for cmd in commands)

        logger.info(f"Starting Playbook Sequence with {len(commands)} commands over {session_duration}s", extra={"session_id": session_id})
        
        # Sequentially stream instructions down to the "Dumb Terminal" frontend
        for index, cmd in enumerate(commands):
            if session_id not in self.active_connections:
                break # User dropped connection mid-playbook
                
            await self.send_message(session_id, {
                "type": "instruction",
                "payload": {
                    "text": cmd["text"],
                    "lens": cmd.get("lens", "user"),
                    "duration": cmd["duration"]
                }
            })
            
            # Record the state for Tier 1 Physics grading awareness
            await session_manager.update_session_state(session_id, f"cmd_{index}")
            
            # Wait for the exact requested duration before firing the next command
            await asyncio.sleep(cmd["duration"])

        # When the playbook finishes, trigger verification
        if session_id in self.active_connections:
            await session_manager.update_session_state(session_id, SessionState.ANALYZING)
            asyncio.create_task(self.perform_verification(session_id, session_duration))
    
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
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info("WebSocket connection state removed", extra={"session_id": session_id})
            
        if session_id in self.session_data:
            del self.session_data[session_id]
        logger.info("Session state cleared from RAM", extra={"session_id": session_id})
            
    async def disconnect(self, session_id: str):
        """Handle client disconnect cleanly without deleting session RAM (Deferred to AI worker)"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info("WebSocket client disconnected, memory buffer preserved for AI", extra={"session_id": session_id})
            
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
            # Phase Complete is now vestigial since the Backend runs the asynchronous playbook. 
            pass
        elif msg_type == "instruction_acknowledged":
            logger.debug("Frontend successfully rendered the latest playbook instruction", extra={"session_id": session_id})
        else:
            logger.warning(f"Unknown websocket instruction blocked", extra={"msg_type": msg_type, "session_id": session_id})
    
    async def perform_verification(self, session_id: str, expected_duration: int = 15):
        """Perform Tier 1 verification, show result to user, upload artifacts, then defer Tier 2 (AI)"""
        try:
            start_time = time.time()
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
            
            # Determine Tier 1 pass/fail
            tier_1_passed = tier_1_score >= 50
            tier_1_status = "success" if tier_1_passed else "failed"
            
            # Update session with initial physics results
            await session_manager.update_session_results(
                session_id=session_id,
                tier_1_score=tier_1_score,
                tier_2_score=None,
                final_trust_score=tier_1_score,
                correlation_value=correlation,
                reasoning=f"Sensor correlation: {correlation:.3f}. AI deep analysis will follow.",
                physics_score=tier_1_score,
                verification_status=tier_1_status
            )
            
            # Enforce strict session_duration wait time for UX, calculated from FIRST video chunk receipt
            # This ensures the frontend UI hits exactly 0 before sending the result.
            video_chunks = session_data.get("video_chunks", [])
            first_chunk_time = video_chunks[0]["timestamp"] if video_chunks else start_time
            elapsed_time = time.time() - first_chunk_time
            if elapsed_time < expected_duration:
                await asyncio.sleep(expected_duration - elapsed_time)
            
            # Send DEFINITIVE conclusion to the UX (Hiding Tier 1 scores)
            await self.send_message(session_id, {
                "type": "result",
                "payload": {
                    "status": "success",
                    "reasoning": "Verification complete. You can close this tab and return to your application."
                }
            })
            
            logger.info(f"Tier 1 Verification concluded", extra={
                "session_id": session_id,
                "physics_score": tier_1_score,
                "tier_1_status": tier_1_status
            })
            
            # Start background AI verification (Tier 2 and 3)
            # Pass session_data into the worker so it can operate even if WebSocket disconnected
            asyncio.create_task(self.run_ai_verification_background(session_id, session_data))

            # Upload artifacts IMMEDIATELY (before AI analysis)
            await self.upload_session_artifacts(session_id)

        except Exception as e:
            logger.error(f"Verification Tier 1 crashed: {e}", exc_info=True, extra={"session_id": session_id})
            await self.send_message(session_id, {
                "type": "error",
                "payload": {"message": f"Verification failed: {str(e)}"}
            })

    async def run_ai_verification_background(self, session_id: str, session_data: dict):
        """Background asynchronous AI video frame analysis. Failures here are fully isolated."""
        try:
            import tempfile
            import os
            from app.video_utils import extract_sparse_keyframes
            from app.ai_provider import get_ai_pipeline
            from app.scoring import calculate_unified_score, evaluate_trust_status
            from app.database import db_manager
            from app.webhooks import webhook_manager
            from app.quota import quota_manager
            
            # 1. Rebuild video file
            if not session_data.get('video_chunks'):
                logger.warning("No video data found for AI processing", extra={"session_id": session_id})
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
            
            # 3. Request AI classification via the 3-Tier Verification Engine
            vision_engine, genai_engine = get_ai_pipeline()
            session_db = await session_manager.get_session(session_id)
            metadata = session_db.get("metadata", {}) if session_db else {}
            
            # --- TIER 2: VISION SCANNER (AWS Rekognition) ---
            # Pass metadata so Rekognition can resolve the verification_profile for conditional spoof suppression
            is_spoofed, vision_context = await vision_engine.extract_context(frames_b64, metadata)
            
            # --- Compute IMU summary stats for cross-modal validation ---
            imu_context = {"has_data": False}
            gyro_gamma = session_data.get("gyro_gamma", [])
            imu_raw = session_data.get("imu_data", [])
            
            if len(gyro_gamma) >= 5:
                import statistics
                imu_context = {
                    "has_data": True,
                    "gyro_gamma_samples": len(gyro_gamma),
                    "gyro_gamma_range": round(max(gyro_gamma) - min(gyro_gamma), 4),
                    "gyro_gamma_std_dev": round(statistics.stdev(gyro_gamma), 4),
                    "gyro_gamma_mean": round(statistics.mean(gyro_gamma), 4),
                    "motion_detected": abs(max(gyro_gamma) - min(gyro_gamma)) > 5.0,
                    "motion_interpretation": "device_was_panned" if abs(max(gyro_gamma) - min(gyro_gamma)) > 15.0 
                        else "minimal_device_movement" if abs(max(gyro_gamma) - min(gyro_gamma)) > 5.0
                        else "device_stationary"
                }
                
                # Extract accelerometer magnitude variance if available
                accel_magnitudes = []
                for sample in imu_raw:
                    accel = sample.get("acceleration") or sample.get("accelerationIncludingGravity", {})
                    if accel:
                        x = accel.get("x", 0) or 0
                        y = accel.get("y", 0) or 0
                        z = accel.get("z", 0) or 0
                        magnitude = (x**2 + y**2 + z**2) ** 0.5
                        accel_magnitudes.append(magnitude)
                
                if len(accel_magnitudes) > 1:
                    imu_context["accel_magnitude_std_dev"] = round(statistics.stdev(accel_magnitudes), 4)
                    imu_context["accel_interpretation"] = (
                        "natural_hand_tremor" if statistics.stdev(accel_magnitudes) > 0.1 
                        else "suspiciously_stable"
                    )
                
                logger.info(f"IMU context for AI evaluation", extra={
                    "session_id": session_id,
                    "imu_context": imu_context
                })
            
            # Hard-fail the pipeline if Rekognition detects obvious Presentation Attacks (Screens, Photos)
            if is_spoofed:
                tier_2_score = 0
                ai_score = 0.0
                ai_explanation = vision_context
            else:
                # --- TIER 3: GENERATIVE AI EVALUATOR (Google Gemini / Amazon Nova) ---
                # Calculate a rough Tier 2 pass/fail metric for the dashboard (just context extraction success)
                tier_2_score = 100 if vision_context.get("status") == "success" else 0
                
                # Hand off the AWS Rekognition structured JSON and IMU context to the GenAI prompt
                ai_score, ai_explanation = await genai_engine.evaluate_trust(frames_b64, vision_context, metadata, imu_context)
            
            # 4. Final Scoring Fusion
            if not session_db:
                logger.error("Session missing from DB during AI pass", extra={"session_id": session_id})
                return
                
            physics_score = session_db.get("physics_score", 0.0)
            if physics_score is None:
                physics_score = 0.0
            
            # Fuse Tier 1 (Physics) with Tier 3 (GenAI Trust Score)
            unified_score = calculate_unified_score(physics_score, ai_score)
            is_authentic = evaluate_trust_status(unified_score)
            
            final_status = "success" if is_authentic else "failed"
            final_reasoning = f"{ai_explanation.get('summary', 'N/A')}"
            
            # 5. Update Session DB with Full 3-Tier enrichment
            await session_manager.update_session_results(
                session_id=session_id,
                tier_1_score=int(physics_score),
                tier_2_score=int(tier_2_score),
                final_trust_score=int(unified_score),
                correlation_value=session_db.get("correlation_value"),
                reasoning=final_reasoning,
                ai_score=ai_score,
                physics_score=physics_score,
                unified_score=unified_score,
                ai_explanation=ai_explanation,
                verification_status=final_status
            )
            
            logger.info("AI Verification Complete", extra={"session_id": session_id, "unified_score": unified_score})
            
            # Decrement usage quota
            tenant_id = session_db.get("tenant_id")
            if tenant_id:
                try:
                    await quota_manager.decrement_quota(str(tenant_id))
                except Exception as q_err:
                    logger.error(f"Failed to decrement quota: {q_err}", extra={"session_id": session_id})
            
            # 6. Webhook Notification
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
                
                # Make sure exceptions in webhook don't crash the container or background task
                try:
                    asyncio.create_task(
                        webhook_manager.retry_webhook(
                            tenant_id=str(tenant_id),
                            webhook_url=tenant_data.get("webhook_url"),
                            payload=webhook_payload,
                            api_secret=tenant_data.get("webhook_secret") or "default_secret"
                        )
                    )
                except Exception as webhook_err:
                    logger.error(f"Failed to schedule webhook: {webhook_err}", extra={"session_id": session_id})
                
        except Exception as e:
            # AI failure is fully isolated — it does NOT change the user-facing verification status immediately
            # But we MUST record the AI failure score so the dashboard doesn't inherit Tier 1's score.
            logger.error(f"Background AI worker failed (non-critical): {e}", exc_info=True, extra={"session_id": session_id})
            
            try:
                session_db = await session_manager.get_session(session_id)
                if session_db:
                    physics = session_db.get("physics_score", 0.0) or 0.0
                    await session_manager.update_session_results(
                        session_id=session_id,
                        tier_1_score=int(physics),
                        tier_2_score=0,
                        final_trust_score=int(physics), # Overall stays at physics
                        correlation_value=session_db.get("correlation_value"),
                        reasoning=f"AI Forensics Error: {str(e)[:100]}",
                        ai_score=0.0,
                        physics_score=physics,
                        unified_score=0.0, # Explicitly denote AI failure
                        ai_explanation={"summary": "AI module execution failed."},
                        verification_status="failed"
                    )
            except Exception as db_err:
                logger.error(f"Failed to record AI crash to DB: {db_err}", extra={"session_id": session_id})
        finally:
            # Clear in-memory data to free up memory ONLY after all background tasks are done
            # Also delay for 5 seconds to ensure any lagging connections are safely disconnected
            await asyncio.sleep(5)
            if session_id in self.session_data:
                del self.session_data[session_id]
            logger.info("Session state cleared from RAM after AI pipeline lock", extra={"session_id": session_id})
    
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
            # DO NOT clear here! It's clearing video chunks while run_ai_verification_background is running!
            # Using memory cautiously is good, but asyncio.create_task runs in parallel
            # self.clear_session_data(session_id)
            
        except Exception as e:
            logger.error(f"S3 global artifact engine thread failed: {e}", exc_info=True, extra={"session_id": session_id})


# Global WebSocket handler instance
ws_handler = VerificationWebSocket()
