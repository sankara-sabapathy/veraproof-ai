#!/bin/bash
# VeraProof AI - Stop All Services (Linux/Mac)

echo "Stopping VeraProof AI Services..."

# Stop Docker services
echo ""
echo "Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped!"
