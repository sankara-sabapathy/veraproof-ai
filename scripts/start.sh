#!/bin/bash
# VeraProof AI - Start All Services (Linux/Mac)

echo "Starting VeraProof AI Services..."

# Start Docker services
echo ""
echo "Starting Docker services (PostgreSQL, LocalStack)..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to initialize..."
sleep 10

# Check if services are running
echo ""
echo "Checking service status..."
docker-compose ps

echo ""
echo "✅ Services started successfully!"
echo ""
echo "Next steps:"
echo "1. Start backend: cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "2. Start verification interface: cd verification-interface && python -m http.server 3000"
echo "3. Start partner dashboard: cd partner-dashboard && npm start"
