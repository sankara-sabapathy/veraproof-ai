# VeraProof AI Backend

## Quick Start

### Prerequisites
- Python 3.12+
- Docker Desktop (running)

### Setup & Run

1. **Start Infrastructure**
   ```bash
   # From project root
   docker-compose up -d
   
   # Verify services are running
   docker ps
   ```

2. **Install Dependencies**
   ```bash
   cd backend
   
   # Create virtual environment (if not exists)
   python -m venv venv
   
   # Activate virtual environment
   .\venv\Scripts\activate  # Windows
   source venv/bin/activate  # Linux/Mac
   
   # Install packages
   pip install -r requirements.txt
   ```

3. **Run Backend Server**
   ```bash
   # Make sure you're in backend/ directory with venv activated
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Test Backend**
   ```bash
   # Run test script
   python test_api.py
   
   # Or access API documentation
   # http://localhost:8000/docs
   ```

## API Endpoints

- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **OpenAPI Spec**: http://localhost:8000/openapi.json

## Database Access

```bash
# Connect to PostgreSQL
docker exec -it veraproof-postgres psql -U veraproof -d veraproof

# View tables
\dt

# Query tenants
SELECT * FROM tenants;
```

## Environment Variables

Edit `backend/.env` to configure:
- Database connection
- AWS/LocalStack endpoints
- JWT secrets
- CORS origins
- Rate limits

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

### Database Connection Failed
```bash
# Restart PostgreSQL
docker restart veraproof-postgres

# Check logs
docker logs veraproof-postgres
```

### LocalStack Not Ready
```bash
# Restart LocalStack
docker restart veraproof-localstack

# Wait 5 seconds for startup
timeout /t 5  # Windows
sleep 5       # Linux/Mac
```

## Development

### Run Tests
```bash
python test_api.py
```

### View Logs
```bash
# Backend logs appear in terminal
# Docker logs
docker logs veraproof-postgres
docker logs veraproof-localstack
```

### Reset Database
```bash
# Stop containers
docker-compose down

# Remove volumes
docker volume rm veraproof-ai_postgres_data

# Restart
docker-compose up -d

# Reinitialize database
Get-Content db/init.sql | docker exec -i veraproof-postgres psql -U veraproof -d veraproof
```

## Architecture

```
FastAPI Backend (Port 8000)
    ↓
PostgreSQL (Port 5432)
LocalStack S3 (Port 4566)
```

## Key Modules

- `main.py` - FastAPI application
- `routes.py` - API endpoints
- `sensor_fusion.py` - Core physics-first verification
- `optical_flow.py` - OpenCV analysis
- `websocket_handler.py` - Real-time streaming
- `database.py` - Multi-tenant DB manager
- `auth.py` - JWT authentication
