# VeraProof AI - Browser Prototype

**Physics-First Fraud Detection Platform**

VeraProof AI is a real-time video verification system that uses sensor fusion (IMU + Optical Flow) to detect fraudulent video submissions. The system prioritizes mathematical verification (Tier 1) over AI-based detection (Tier 2) to achieve sub-3-second latency for B2B API responses.

## 🎯 Core Features

- **Physics-First Approach:** Sensor fusion (IMU + Optical Flow) for Tier 1 triage
- **Sub-3-Second Latency:** Real-time verification results
- **Mobile-Only:** Browser-based verification with device sensor access
- **Multi-Tenant:** Complete data isolation for B2B partners
- **Pan & Return Protocol:** Standardized movement challenge for verification
- **AI Forensics (Tier 2):** Deepfake detection for flagged submissions

## 🏗️ Architecture

### Components

1. **Verification Interface** (Vanilla JS)
   - Mobile web application for end-user verification
   - Real-time video streaming (250ms chunks)
   - IMU data collection (60Hz DeviceMotionEvent)
   - WebSocket communication

2. **Partner Dashboard** (Angular 17+)
   - Administrative interface for partners
   - Analytics and session management
   - API key management
   - Branding customization

3. **Backend API** (FastAPI + Python 3.12)
   - WebSocket and REST endpoints
   - Sensor fusion engine (Pearson correlation)
   - Multi-tenant database (PostgreSQL)
   - Artifact storage (S3/LocalStack)

### Technology Stack

**Frontend:**
- Vanilla JavaScript (Verification Interface)
- Angular 17+ with standalone components (Partner Dashboard)
- MediaRecorder API, DeviceMotionEvent API
- WebSocket (WSS)

**Backend:**
- FastAPI (Python 3.12+)
- PostgreSQL with row-level security
- OpenCV-Headless (optical flow)
- NumPy/SciPy (Pearson correlation)
- LocalStack (S3 mock for development)

**Infrastructure:**
- Docker Compose (local development)
- AWS Lightsail Container (production)
- AWS S3 (artifact storage)
- AWS Cognito (authentication)
- Amazon SageMaker (Tier 2 AI forensics)

## 🚀 Quick Start

See [QUICK_START.md](QUICK_START.md) for detailed setup instructions.

### Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd veraproof-ai

# Install backend dependencies
cd backend
pip install -r requirements.txt
cd ..

# Install dashboard dependencies
cd partner-dashboard
npm install
cd ..

# Start Docker services
./scripts/start.sh  # Linux/Mac
# or
.\scripts\start.ps1  # Windows
```

### Running

```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Verification Interface
cd verification-interface
python -m http.server 3000

# Terminal 3 - Partner Dashboard
cd partner-dashboard
npm start
```

Access:
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Verification Interface: http://localhost:3000
- Partner Dashboard: http://localhost:4200

## 📱 Mobile Testing

Mobile browsers require HTTPS for camera and sensor access. Use the HTTPS scripts:

```bash
# Backend with HTTPS
python scripts/start_backend_https.py

# Verification Interface with HTTPS
python scripts/generate_cert_and_serve.py
```

Access from mobile:
- Backend: https://192.168.20.5:8443
- Verification Interface: https://192.168.20.5:3443

**Note:** You'll need to accept self-signed certificate warnings.

## 📚 Documentation

- [Quick Start Guide](QUICK_START.md) - Setup and running instructions
- [Dashboard Setup](DASHBOARD_SETUP.md) - Partner dashboard configuration
- [HTTPS Setup](HTTPS_SETUP.md) - Mobile testing with HTTPS
- [Scripts README](scripts/README.md) - Development scripts documentation
- [Architecture Design](.kiro/specs/veraproof-browser-prototype/design.md) - System architecture
- [Requirements](.kiro/specs/veraproof-browser-prototype/requirements.md) - Functional requirements
- [Implementation Tasks](.kiro/specs/veraproof-browser-prototype/tasks.md) - Development roadmap

## 🧪 Testing

### Test Login

1. Open http://localhost:4200
2. Login with:
   - Email: test@veraproof.ai
   - Password: test123

### Create Test Session

```powershell
# Windows
.\scripts\get_session_url.ps1
```

### Verify Services

```powershell
# Windows
.\scripts\verify-services.ps1
```

## 🗂️ Project Structure

```
veraproof-ai/
├── backend/                    # FastAPI backend
│   ├── app/                   # Application code
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── routes.py         # REST API endpoints
│   │   ├── websocket_handler.py  # WebSocket handler
│   │   ├── sensor_fusion.py  # Tier 1 analysis
│   │   ├── ai_forensics.py   # Tier 2 analysis
│   │   └── ...
│   ├── db/                    # Database scripts
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile            # Production container
├── verification-interface/     # Vanilla JS verification UI
│   ├── js/                    # JavaScript modules
│   ├── index.html            # Main page
│   └── styles.css            # Styling
├── partner-dashboard/          # Angular dashboard
│   ├── src/                   # Source code
│   │   ├── app/              # Angular components
│   │   └── environments/     # Environment configs
│   └── package.json          # Node dependencies
├── scripts/                    # Development scripts
│   ├── start.ps1/sh          # Start services
│   ├── stop.ps1/sh           # Stop services
│   ├── verify-services.ps1   # Check service status
│   ├── get_session_url.ps1   # Generate test session
│   ├── start_backend_https.py  # Backend with HTTPS
│   └── generate_cert_and_serve.py  # Frontend with HTTPS
├── .kiro/specs/               # Specification documents
│   └── veraproof-browser-prototype/
│       ├── requirements.md    # Functional requirements
│       ├── design.md         # Architecture design
│       └── tasks.md          # Implementation tasks
├── docker-compose.yml         # Local services (PostgreSQL, LocalStack)
├── .gitignore                # Git ignore rules
├── README.md                 # This file
└── QUICK_START.md            # Quick start guide
```

## 🔐 Security

- **Multi-Tenant Isolation:** PostgreSQL row-level security
- **Authentication:** JWT tokens with httpOnly cookies
- **Data Encryption:** TLS 1.3 for all transmission, S3 server-side encryption
- **API Keys:** Scoped to tenant_id and environment
- **Rate Limiting:** 100 requests/minute, 10 concurrent sessions per tenant

## 📊 Verification Flow

1. **Partner Integration:** Partner creates session via API
2. **User Redirect:** User redirected to verification interface
3. **Pan & Return Challenge:**
   - Baseline: 1s static hold
   - Pan: Tilt phone right (track Gyro Gamma vs Optical Flow X)
   - Return: Return to center
4. **Tier 1 Analysis:** Calculate Pearson correlation (r)
   - r ≥ 0.85: Pass (authentic)
   - r < 0.85: Fail (queue Tier 2)
5. **Tier 2 Analysis (if needed):** AI deepfake detection
6. **Result Delivery:** Webhook + redirect to partner

## 🎯 Subscription Tiers

- **Sandbox:** 3 verifications/month (free, no artifact storage)
- **Starter:** 100 verifications/month
- **Pro:** 1000 verifications/month
- **Enterprise:** Custom limits

## 🤝 Contributing

This is a prototype project. For production deployment:

1. Replace LocalStack with real AWS services
2. Configure AWS Cognito for authentication
3. Deploy SageMaker endpoint for Tier 2 analysis
4. Set up Razorpay for billing
5. Configure production environment variables

## 📝 License

[Add your license here]

## 🆘 Support

For issues and questions:
- Check [QUICK_START.md](QUICK_START.md)
- Review [DASHBOARD_SETUP.md](DASHBOARD_SETUP.md)
- See [scripts/README.md](scripts/README.md)
- Open an issue on GitHub

---

**VeraProof AI** - Physics-First Fraud Detection
