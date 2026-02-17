# VeraProof AI - Quick Start Guide

## Prerequisites

- Docker Desktop (for PostgreSQL and LocalStack)
- Python 3.12+
- Node.js 18+ and npm
- Git

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd veraproof-ai
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

**Partner Dashboard:**
```bash
cd partner-dashboard
npm install
cd ..
```

### 3. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and `backend/.env` with your local configuration.

## Running the Application

### Option 1: Quick Start (Recommended for Development)

**Windows (PowerShell):**
```powershell
# Start Docker services
.\scripts\start.ps1

# In separate terminals:
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

**Linux/Mac (Bash):**
```bash
# Start Docker services
./scripts/start.sh

# In separate terminals:
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

### Option 2: HTTPS Mode (Required for Mobile Testing)

Mobile browsers require HTTPS for camera and sensor access.

**Windows (PowerShell):**
```powershell
# Start Docker services
.\scripts\start.ps1

# In separate terminals:
# Terminal 1 - Backend with HTTPS
python .\scripts\start_backend_https.py

# Terminal 2 - Verification Interface with HTTPS
python .\scripts\generate_cert_and_serve.py

# Terminal 3 - Partner Dashboard
cd partner-dashboard
npm start
```

**Linux/Mac (Bash):**
```bash
# Start Docker services
./scripts/start.sh

# In separate terminals:
# Terminal 1 - Backend with HTTPS
python3 scripts/start_backend_https.py

# Terminal 2 - Verification Interface with HTTPS
python3 scripts/generate_cert_and_serve.py

# Terminal 3 - Partner Dashboard
cd partner-dashboard
npm start
```

## Access Points

### Development Mode (HTTP)
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Verification Interface:** http://localhost:3000
- **Partner Dashboard:** http://localhost:4200

### HTTPS Mode (Mobile Testing)
- **Backend API:** https://192.168.20.5:8443
- **Verification Interface:** https://192.168.20.5:3443
- **Partner Dashboard:** http://localhost:4200

**Note:** Replace `192.168.20.5` with your actual local IP address.

## Testing

### 1. Verify Services

**Windows:**
```powershell
.\scripts\verify-services.ps1
```

This checks if all services are running correctly.

### 2. Create Your Account

1. Open Partner Dashboard: http://localhost:4200
2. Click the "Sign Up" tab
3. Enter your email and password (minimum 6 characters)
4. Click "Create Account"
5. You'll be automatically logged in and redirected to the dashboard

### 3. Generate API Keys

1. Navigate to "API Keys" in the dashboard
2. Click "Generate New Key"
3. Select environment (sandbox/production)
4. Copy and save your API key securely

### 4. Create Test Session

Use your API key to create a verification session:

```bash
curl -X POST http://localhost:8000/api/v1/sessions/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"user_id": "test-user-123"},
    "return_url": "https://yourapp.com/callback"
  }'
```

### 5. Mobile Verification

1. Get your local IP address (e.g., 192.168.20.5)
2. Start services in HTTPS mode
3. On your mobile device, accept the self-signed certificate warnings
4. Open the session URL from step 4
5. Complete the Pan & Return challenge

## Database Access

### Using DBeaver

1. Open DBeaver
2. Create new PostgreSQL connection:
   - **Host:** localhost
   - **Port:** 5432
   - **Database:** veraproof
   - **Username:** veraproof
   - **Password:** veraproof_dev_password

### Using psql

```bash
psql -h localhost -U veraproof -d veraproof
```

## Stopping Services

**Windows:**
```powershell
.\scripts\stop.ps1
```

**Linux/Mac:**
```bash
./scripts/stop.sh
```

## Troubleshooting

### Backend Connection Refused

- Ensure backend is running on the correct port
- Check `partner-dashboard/src/environments/environment.ts` has correct `apiUrl`
- For HTTPS mode, use `https://192.168.20.5:8443`

### Mobile Camera/Sensor Not Working

- Must use HTTPS mode for mobile testing
- Accept self-signed certificate warnings on mobile device
- Ensure mobile device is on same network as development machine

### Docker Services Not Starting

```bash
# Check Docker is running
docker ps

# Restart Docker services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

## Next Steps

1. Review the [Architecture Documentation](.kiro/specs/veraproof-browser-prototype/design.md)
2. Check the [Implementation Tasks](.kiro/specs/veraproof-browser-prototype/tasks.md)
3. Read the [Dashboard Setup Guide](DASHBOARD_SETUP.md)
4. Explore the [API Documentation](http://localhost:8000/docs)

## Support

For issues and questions, refer to:
- [Dashboard Setup Guide](DASHBOARD_SETUP.md)
- [HTTPS Setup Guide](HTTPS_SETUP.md)
- [Scripts README](scripts/README.md)
