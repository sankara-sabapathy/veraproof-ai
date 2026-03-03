# Goal Description
VeraProof AI successfully established an initial "Tier 1: Physics" and "Tier 2: AI Forensics" pipeline. However, to compete as a standard enterprise B2B verification product (e.g., competing with Onfido, Veriff, Sumsub), VeraProof is fundamentally missing core Identity Proofing (IDV) and ISO-standard Liveness checks.

This plan details the ultra-low-cost architectural integrations required to close the gap on mandatory enterprise features: Passive Liveness, Document OCR (ID Scanning), and 3D Presentation Attack Detection (PAD).

## Competitive Feature Gap Analysis
Currently, VeraProof executes robust "Pan & Return" physics and generative LLM abstraction. Standard B2B products require the following additions:
1. **Passive Liveness Detection (PAD)**: Ensuring the face in the video isn't a 2D printed mask, 3D silicone mask, or a digital screen replay (ISO-30107-3 compliance).
2. **Face Matching (1:1)**: Correlating the live face in the video stream to the face printed on a scanned ID card.
3. **Document Verification (OCR)**: Extracting PII (Name, DOB, ID Number) from Driver's Licenses/Passports and verifying the ID template authenticity (detecting digital tampering).
4. **Behavioral Biometrics**: Analyzing micro-expressions, blink rate, and device-holding stability.

## User Review Required
> [!IMPORTANT]
> To maintain the "extremely low cost" (sub-cent) requirement while bridging this gap, we must avoid expensive managed SaaS APIs (like AWS Rekognition which costs $0.01+ per call). Instead, we must self-host heavily quantized Open Source Vision models natively inside our FastAPI/ECS backend.
> Please review the architecture below to confirm you are comfortable increasing the Docker container size to host open-source ML weights locally.

## Proposed Changes

### 1. Passive Facial Liveness (Anti-Spoofing)
Instead of forcing the user to do heavy active motions (which causes friction), we will implement a backend-processed deep-learning PAD (Presentation Attack Detection) model.
- **Implementation**: Self-host **FASNet** (Face Anti-Spoofing Network) or a lightweight **MobileNetV2** model trained on anti-spoofing datasets (like OULU-NPU).
- **Execution**: Run this inference locally over the WebRTC/WebSocket video chunks. It checks for screen moiré patterns (detecting a phone screen), lack of depth, or printed paper textures.
- **Cost**: $0.00 (Compute runs on the existing AWS Fargate container CPU).

#### [NEW] backend/app/liveness_engine.py

### 2. 1:1 Biometric Face Matching
To verify identity, the partner system must pass the user's ID card image. VeraProof will compare the ID card facial crop against the live video keyframes.
- **Implementation**: Integrate **facenet-pytorch** or **InsightFace (buffalo_l)**. These extract a 512-dimensional embedding vector from both faces and calculate the cosine similarity.
- **Cost**: $0.00 (Self-hosted on Fargate CPUs. Highly optimized for ~100ms inference).

#### [NEW] backend/app/face_matcher.py

### 3. Document Verification (OCR & Tampering)
Extracting text from IDs and ensuring the text hasn't been photoshopped.
- **Implementation (OCR)**: Self-host **Tesseract OCR** (via `pytesseract`) or **EasyOCR** for reading the PII.
- **Implementation (Tampering)**: Use Error Level Analysis (ELA) via OpenCV to detect manipulated JPEG compression artifacts on the ID image.
- **Integration**: Partner systems inject an `id_image_b64` string when starting the verification WebSocket session.

#### [NEW] backend/app/document_verifier.py

### 4. Updating the Scoring Engine
The existing `scoring.py` will be expanded massively from just `Tier 1 (Physics) + Tier 2 (AI)` to a weighted unified engine:
- Liveness Score (0-100)
- Face Match Confidence (0-100)
- Document Authenticity Score (0-100)
- Physics Correlation (0-100)
- Deep AI Anomaly Score (0-100)

#### [MODIFY] backend/app/scoring.py
#### [MODIFY] backend/db/init.sql
- (Add columns for `liveness_score`, `face_match_score`)

### 5. Frontend UI Upgrades
The `verification-interface` must gracefully request permission to access the user's high-res camera specifically to scan an ID document before proceeding to the 15-second "Pan & Return" video check.

#### [MODIFY] verification-interface/index.html
#### [MODIFY] verification-interface/js/ui-controller.js
#### [MODIFY] partner-dashboard/src/app/components/session-details/session-details.component.ts 
- (Visualize new scores)

## Verification Plan

### Automated Tests
- Unit test `liveness_engine.py` against a suite of known spoof arrays (photos of photos, screens displaying faces).
- Unit test `face_matcher.py` ensuring embeddings match >90% for identical individuals and <40% for imposters.
- Unit test OCR pipeline enforcing extraction latency is under 500ms.

### Manual Verification
- Execute a full end-to-end flow passing an image of a Driver's License via the B2B init call, then performing the 15-second Pan/Return.
- Confirm the Partner Dashboard renders a complete 5-layer B2B Identity Verification report natively reflecting all deep-learning sub-routines.
