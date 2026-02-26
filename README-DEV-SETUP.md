# VeraProof AI - Development Environment Setup

## Port Allocation

All VeraProof AI services use unique ports in the **8xxx range** to avoid conflicts with other projects:

| Service | Port | URL |
|---------|------|-----|
| Backend API (HTTP) | 8100 | http://localhost:8100 |
| Backend API (HTTPS) | 8443 | https://localhost:8443 |
| Partner Dashboard | 8200 | http://localhost:8200 |
| Verification Interface | 8300 | http://localhost:8300 |
| PostgreSQL | 5432 | localhost:5432 |
| LocalStack (S3) | 4566 | http://localhost:4566 |

## Quick Start

### Option 1: Python Script (Recommended)
```bash
python scripts/dev-start.py
```

### Option 2: Bash Script (Linux/Mac)
```bash
./scripts/dev-start.sh
```

### Option 3: Manual Start
```bash
# 1. Start Docker services
docker-compose up -d postgres localstack

# 2. Start Backend (HTTPS)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8443 --ssl-keyfile key.pem --ssl-certfile cert.pem --reload

# 3. Start Partner Dashboard
cd partner-dashboard
npm start

# 4. Start Verification Interface
python -m http.server 8300 --directory verification-interface
```

## Prerequisites

- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.10+)
- npm

## Port Configuration

All ports are centralized in `.env.ports`. To change ports:

1. Edit `.env.ports`
2. Update `.env` file
3. Restart services

## Environment Files

- `.env.ports` - Centralized port configuration
- `.env` - Main environment variables
- `partner-dashboard/src/environments/environment.ts` - Angular dev config
- `verification-interface/config.js` - Verification interface config

## HTTPS Certificate

The startup scripts automatically generate a self-signed SSL certificate for local development. You'll need to accept the browser warning when first accessing https://localhost:8443.

## Stopping Services

Press `Ctrl+C` in the terminal where you started the services. The script will automatically:
- Stop all Node.js processes
- Stop the Python backend
- Stop Docker containers
- Clean up resources

## Troubleshooting

### Port Already in Use
If you see "port already in use" errors:
```bash
# Check what's using the port (example for port 8100)
lsof -i :8100  # Mac/Linux
netstat -ano | findstr :8100  # Windows

# Kill the process or change the port in .env.ports
```

### Services Not Starting
1. Check Docker is running: `docker ps`
2. Check Node.js is installed: `node --version`
3. Check Python is installed: `python --version`
4. Check logs in `./logs/` directory

### SSL Certificate Issues
If you see SSL errors:
```bash
# Regenerate certificates
cd backend
rm cert.pem key.pem
python ../scripts/start_backend_https.py
```

## Development Workflow

1. Start all services: `python scripts/dev-start.py`
2. Access Partner Dashboard: http://localhost:8200
3. Access Verification Interface: http://localhost:8300
4. Access API Docs: https://localhost:8443/docs
5. Make changes (hot reload enabled for all services)
6. Stop services: `Ctrl+C`

## Production Deployment

Production uses standard ports (80/443) with a reverse proxy. The port configuration is environment-specific:

- **Local**: Uses 8xxx ports (defined in `.env`)
- **Production**: Uses standard ports (defined in deployment config)

All services read from environment variables, so no code changes are needed between environments.
