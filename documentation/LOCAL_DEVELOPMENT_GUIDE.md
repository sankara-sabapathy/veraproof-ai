# Local Development Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Python 3.12+
- Node.js 18+
- PowerShell (Windows) or Bash (Linux/Mac)

### Start All Services

```powershell
# Start database and backend
docker-compose up -d

# Wait for services to be ready
Start-Sleep -Seconds 15

# Verify backend is running
curl http://localhost:8000/health
```

### Service URLs

- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432
- **LocalStack (S3):** localhost:4566

## Running Tests

### Backend Tests

```powershell
cd backend

# Set environment variables
$env:DATABASE_URL = "postgresql://veraproof:veraproof_dev_password@localhost:5432/veraproof"
$env:AWS_ENDPOINT_URL = "http://localhost:4566"

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run with coverage (requires pytest-cov)
python -m pytest tests/ --cov=app --cov-report=term-missing
```

### Frontend Development

```powershell
cd partner-dashboard

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Environment Variables

### Backend (.env.local)

```bash
# Database
DATABASE_URL=postgresql://veraproof:veraproof_dev_password@localhost:5432/veraproof

# AWS (LocalStack)
AWS_ENDPOINT_URL=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
ARTIFACTS_BUCKET=veraproof-artifacts
BRANDING_BUCKET=veraproof-branding

# JWT
JWT_SECRET=local-dev-secret-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1
REFRESH_TOKEN_EXPIRATION_DAYS=30

# Application
ENVIRONMENT=development
STAGE=local
BACKEND_URL=http://localhost:8000
FRONTEND_DASHBOARD_URL=http://localhost:4200
FRONTEND_VERIFICATION_URL=http://localhost:3000

# CORS
CORS_ORIGINS=http://localhost:4200,http://localhost:3000,http://localhost:8000

# Mock Services
USE_MOCK_SAGEMAKER=true
USE_MOCK_RAZORPAY=true
USE_LOCAL_AUTH=true
```

## Testing API Endpoints

### Health Check

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

### Signup

```powershell
$body = @{
    email = "test@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/signup" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Login

```powershell
$body = @{
    email = "test@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Test with CORS Headers

```powershell
$headers = @{ "Origin" = "http://localhost:4200" }
$body = @{
    email = "test@example.com"
    password = "TestPassword123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/signup" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -Headers $headers `
    -UseBasicParsing
```

## Troubleshooting

### Backend Not Starting

```powershell
# Check logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Rebuild and restart
docker-compose up -d --build backend
```

### Database Connection Issues

```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to database
docker exec -it veraproof-postgres psql -U veraproof -d veraproof
```

### Port Already in Use

```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
```

## Stopping Services

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Stop specific service
docker-compose stop backend
```

## Database Management

### Access Database

```powershell
docker exec -it veraproof-postgres psql -U veraproof -d veraproof
```

### Common SQL Commands

```sql
-- List tables
\dt

-- Describe table
\d tenants

-- Query users
SELECT * FROM tenants;

-- Reset database
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### Reset Database

```powershell
# Stop services
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Development Workflow

1. **Start Services:**
   ```powershell
   docker-compose up -d
   ```

2. **Make Code Changes:**
   - Backend changes auto-reload (uvicorn --reload)
   - Frontend requires rebuild

3. **Run Tests:**
   ```powershell
   python -m pytest tests/test_auth.py -v
   ```

4. **Test API:**
   ```powershell
   curl http://localhost:8000/docs
   ```

5. **Stop Services:**
   ```powershell
   docker-compose down
   ```

## Production Deployment

See `DASHBOARD_SIGNUP_FIX_COMPLETE.md` for production deployment instructions.

