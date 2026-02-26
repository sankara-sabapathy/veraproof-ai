# VeraProof AI: Engineering Standards & Verification Logic

## 1. Project Core Philosophy
VeraProof AI is a "Physics-First" fraud detection platform.
- **Rule 01:** Always prioritize Sensor Fusion (IMU + Optical Flow) over probabilistic AI pixel detection for Tier 1 triage.
- **Rule 02:** Sub-3-second latency is a hard requirement for the B2B API.

## 2. Phase 1: Browser Prototype Specs
- **Environment:** Mobile-only browser enforcement (Block Desktop/Laptops).
- **Frontend Stack:** Vanilla JS, MediaRecorder (250ms chunks), DeviceMotionEvent (60Hz IMU).
- **Backend Stack:** AWS Lightsail Container, FastAPI, Python 3.12+, OpenCV-Headless.
- **Transmission:** Real-time bi-directional WebSockets (WSS).

## 3. The "Pan & Return" Challenge Protocol
Every verification session must guide the user through this sequence:
1. **Baseline:** 1s static hold.
2. **The Pan:** Prompt "Tilt phone right" while tracking Gyro Gamma vs. Optical Flow X.
3. **The Return:** Prompt "Return to center."
4. **Verification:** Calculate Pearson Correlation ($r$). If $r < 0.85$, flag as fraud.

## 4. AI Forensics (Tier 2)
Use Amazon SageMaker only after Phase 1 math is verified. Focus on:
- Diffusion Artifact Detection.
- GAN-based inpainting "ghosting" effects.

## 5. Documentation & Summary Rules
- **Rule 03:** NEVER create markdown files to summarize work or document task completion.
- **Rule 04:** Provide summaries ONLY in chat responses, not as files.
- **Rule 05:** Do not create files in root, scripts/, or documentation/ folders unless explicitly requested.
- **Rule 06:** Keep the repository clean - avoid bloat from temporary summaries, checklists, or status files.