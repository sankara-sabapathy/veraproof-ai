# VeraProof AI - AI-First Verification & Fraud Detection Platform

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![AWS](https://img.shields.io/badge/AWS-ap--south--1-orange.svg)](https://aws.amazon.com)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![CDK](https://img.shields.io/badge/AWS_CDK-2.120.0-orange.svg)](https://aws.amazon.com/cdk/)

## Overview

VeraProof AI is an enterprise-grade, AI-first verification platform built for cross-industry use cases (e.g., identity verification, item condition checks like food delivery). While it uses sensor fusion (IMU + Optical Flow) for ultra-fast Tier 1 triage, its core leverages advanced multimodal AI models (via AWS Bedrock) to assess authenticity through prompt-driven video/frame analysis and compute a definitive, multi-dimensional Trust Score.

### Core Philosophy

1. **AI-First Verification**: Deep AI analysis combined with generative insights to establish comprehensive authenticity.
2. **Tier 1 Physics Triage**: Sensor Fusion (IMU + Optical Flow) provides an initial sub-3-second latency check for immediate filtration.
3. **Platform as a Service**: Built for external B2B integrations with platforms like food delivery, ride-sharing, and finance.
4. **Pan & Return Protocol**: Baseline → Pan Right → Return Center → Pearson correlation (r ≥ 0.85)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobile Device  │────▶│  Verification    │────▶│   Backend API   │
│  (Camera + IMU) │     │  Interface (JS)  │     │   (FastAPI)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                        ┌──────────────────────────────────┼────────────────────────────────┐
                        │                                  │                                │
                   ┌────▼────┐                      ┌─────▼─────┐                     ┌─────▼─────┐
                   │   RDS   │                      │    S3     │                     │Bedrock AI │
                   │PostgreSQL│                      │ Artifacts │                     │ Multimodal│
                   └─────────┘                      └───────────┘                     └───────────┘
```

## Deployment Options

VeraProof AI supports **TWO deployment modes** to AWS:

### AWS Lightsail (Recommended)
- **Cost**: $0/month (first 3 months FREE), then $7-22/month
- **Best for**: POC, MVP, startups, predictable workloads
- **Original Spec**: ✅ Explicitly mentioned in requirements
- **Deploy**: `./deploy.sh poc 123456789012 lightsail`

### Scale-As-You-Go Approach
Configure resources via CDK context - no separate deployment scripts needed:
```bash
# Minimal POC (FREE for 3 months)
./deploy.sh poc 123456789012 lightsail

# Scale up by updating context in cdk.json
# Adjust: instance sizes, storage, retention, etc.
```

📖 **Cost Details**:
- [POC_COST_OPTIMIZATION.md](./POC_COST_OPTIMIZATION.md) - Free tier analysis
- [NETWORKING_COSTS_BREAKDOWN.md](./NETWORKING_COSTS_BREAKDOWN.md) - Complete networking costs
- [POC_DEPLOYMENT_GUIDE.md](./POC_DEPLOYMENT_GUIDE.md) - Per-resource cost breakdown

## Features

### Core Verification (AI-First)
- ✅ **AI Forensics (Tier 2 Primary)**: Deep reasoning via Amazon Nova Lite / Bedrock
- ✅ **Fast Gateway Triage (Tier 1)**: Sub-3-second IMU/Optical flow baseline
- ✅ **Sparse Frame Extraction**: Cost-effective multimodal Bedrock payload generation
- ✅ **Asynchronous Evaluation**: Handled via Background Workers
- ✅ **Comprehensive Webhooks**: For server-to-server final Trust Score reporting
- ✅ **Bi-directional WebSockets**: For real-time phase updates

### Partner Dashboard
- ✅ Professional signup/login
- ✅ API key management
- ✅ Session analytics
- ✅ Branding customization
- ✅ Usage quota management
- ✅ Billing integration
- ✅ Webhook configuration

### Enterprise Features
- ✅ Multi-tenant isolation
- ✅ Rate limiting (100 req/min)
- ✅ Concurrent session limits (10)
- ✅ 90-day artifact retention
- ✅ Comprehensive monitoring
- ✅ SOC2 compliance ready

## Quick Start

### Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 18+
- AWS Account (for deployment)
- AWS CDK CLI

### Local Development

```bash
# 1. Clone repository
git clone <repository-url>
cd veraproof-ai

# 2. Start Docker services
docker-compose up -d

# 3. Start backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Start dashboard
cd partner-dashboard
npm install
npm start

# 5. Access dashboard
open http://localhost:4200
```

### Running Tests

```bash
# Backend tests with coverage
cd backend
pytest --cov=app --cov-report=html --cov-report=term-missing

# View coverage report
open htmlcov/index.html
```

### Deployment

```bash
# Deploy to AWS (ap-south-1)
cd infrastructure

# Development
./deploy.sh dev 123456789012

# Staging
./deploy.sh staging 123456789012

# Production
./deploy.sh prod 123456789012
```

## Project Structure

```
veraproof-ai/
├── backend/                    # FastAPI backend
│   ├── app/                   # Application code
│   │   ├── main.py           # FastAPI app
│   │   ├── routes.py         # API endpoints
│   │   ├── auth.py           # Authentication
│   │   ├── session_manager.py
│   │   ├── sensor_fusion.py  # Pearson correlation
│   │   ├── optical_flow.py   # OpenCV processing
│   │   └── ...
│   ├── tests/                # Comprehensive tests
│   │   ├── test_auth.py
│   │   ├── test_session_management.py
│   │   ├── test_sensor_fusion.py
│   │   └── test_quota_management.py
│   ├── requirements.txt
│   └── pytest.ini
├── partner-dashboard/         # Angular dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── guards/
│   │   └── environments/
│   └── package.json
├── verification-interface/    # Vanilla JS interface
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── main.js
│       ├── device-detector.js
│       ├── video-capture.js
│       ├── imu-collector.js
│       └── ...
├── infrastructure/            # AWS CDK
│   ├── app.py                # CDK app
│   ├── stacks/
│   │   ├── network_stack.py
│   │   ├── database_stack.py
│   │   ├── storage_stack.py
│   │   ├── compute_stack.py
│   │   ├── auth_stack.py
│   │   ├── frontend_stack.py
│   │   └── monitoring_stack.py
│   ├── deploy.sh
│   └── deploy.ps1
├── documentation/             # Comprehensive docs
│   ├── API_DOCUMENTATION.md
│   ├── TESTING_GUIDE.md
│   ├── AUTHENTICATION_GUIDE.md
│   ├── QUICK_START.md
│   └── ...
├── scripts/                   # Development scripts
│   ├── start_backend_http.ps1
│   ├── start_backend_https.py
│   └── ...
├── docker-compose.yml
└── README.md
```

## Documentation

- [API Documentation](documentation/API_DOCUMENTATION.md) - Complete API reference
- [Testing Guide](documentation/TESTING_GUIDE.md) - Comprehensive testing instructions
- [Authentication Guide](documentation/AUTHENTICATION_GUIDE.md) - Auth system documentation
- [Quick Start Guide](documentation/QUICK_START.md) - Detailed setup instructions
- [Development Modes](documentation/DEVELOPMENT_MODES.md) - HTTP vs HTTPS modes

## Technology Stack

### Backend
- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 16 (RDS)
- **Storage**: S3 (artifacts, branding)
- **Auth**: Cognito + JWT
- **Computer Vision**: OpenCV 4.9.0
- **Scientific Computing**: NumPy 1.26.3, SciPy 1.12.0
- **Container**: Docker + ECS Fargate

### Frontend
- **Dashboard**: Angular 17 (standalone components)
- **Verification**: Vanilla JavaScript
- **Styling**: CSS3 with responsive design
- **Distribution**: CloudFront + S3

### Infrastructure
- **IaC**: AWS CDK 2.120.0 (Python)
- **Region**: ap-south-1 (Mumbai)
- **Compute**: ECS Fargate
- **Monitoring**: CloudWatch + SNS
- **CI/CD**: GitHub Actions (planned)

## Testing

### Test Coverage

- **Target**: 80% code coverage
- **Unit Tests**: 50+ tests
- **Property-Based Tests**: 30+ tests (Hypothesis)
- **Integration Tests**: Planned
- **E2E Tests**: Planned

### Test Categories

1. **Authentication Tests** - Signup, login, JWT, API keys
2. **Session Management Tests** - CRUD, state machine, expiration
3. **Sensor Fusion Tests** - Pearson correlation, Tier 1 scoring
4. **Quota Management Tests** - Enforcement, decrement, reset
5. **Rate Limiting Tests** - API limits, concurrent sessions

## Performance

### Benchmarks

- **Tier 1 Analysis**: ~1.65 seconds (target: < 3s) ✅
  - Video processing: ~500ms
  - Optical flow: ~1000ms
  - IMU processing: ~100ms
  - Correlation: ~50ms

- **Tier 2 Analysis**: 1-3 seconds (if triggered)
- **WebSocket Latency**: < 50ms
- **API Response Time**: < 200ms (95th percentile)

## Security

- ✅ Multi-tenant data isolation (RLS)
- ✅ JWT-based authentication
- ✅ API key scoping
- ✅ HTTPS only (production)
- ✅ Encrypted storage (S3, RDS)
- ✅ VPC isolation
- ✅ Security groups
- ✅ Secrets Manager
- ✅ CloudWatch monitoring
- ✅ Rate limiting

## Compliance

- SOC2 ready
- GDPR compliant (90-day retention)
- Data residency (ap-south-1)
- Audit logging
- Encryption at rest and in transit

## Deployment Stages

### Development (dev)
- Single AZ
- Minimal resources
- Public subnets
- No NAT gateway
- 1-day backup retention

### Staging (staging)
- Single AZ
- Medium resources
- Public subnets
- 7-day backup retention

### Production (prod)
- Multi-AZ
- High availability
- Private subnets
- NAT gateway
- 30-day backup retention
- Performance Insights
- Enhanced monitoring
- MFA enabled

## Monitoring

### CloudWatch Dashboards
- API error rates
- API latency (sub-3s requirement)
- Database CPU/connections
- ECS task metrics
- S3 storage metrics

### Alarms
- High API error rate (> 10 errors/5min)
- High API latency (> 3 seconds)
- High database CPU (> 80%)
- High database connections (> 80)

## Cost Optimization

- S3 lifecycle policies (Glacier after 30 days)
- RDS auto-scaling storage
- ECS Fargate auto-scaling
- CloudFront caching
- VPC endpoints (production)
- Spot instances (planned)

## Roadmap

### Phase 1: Browser Prototype ✅
- [x] Core verification flow
- [x] Partner dashboard
- [x] Basic authentication
- [x] Local development setup

### Phase 2: Production Deployment (Current)
- [x] AWS CDK infrastructure
- [x] Comprehensive testing
- [x] Monitoring and alerting
- [ ] CI/CD pipeline
- [ ] Load testing

### Phase 3: Enterprise Features (Planned)
- [ ] SageMaker integration (Tier 2)
- [ ] Advanced analytics
- [ ] Custom ML models
- [ ] White-label solutions
- [ ] Mobile SDKs

## Contributing

This is a proprietary project. For internal contributors:

1. Create feature branch
2. Write tests (80% coverage required)
3. Update documentation
4. Submit PR with detailed description
5. Pass CI/CD checks
6. Get code review approval

## Support

- **Documentation**: See `documentation/` folder
- **Issues**: Internal issue tracker
- **Email**: engineering@veraproof.ai

## License

Proprietary - All Rights Reserved

Copyright © 2026 VeraProof AI. All rights reserved.

## Acknowledgments

- OpenCV for computer vision
- FastAPI for high-performance API
- AWS for cloud infrastructure
- Angular team for frontend framework
