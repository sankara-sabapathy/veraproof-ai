#!/bin/bash
# VeraProof AI - Stop Development Services (Linux/Mac)

echo "Stopping VeraProof AI services..."

# Stop processes by port
echo "Stopping Partner Dashboard (port 8200)..."
lsof -ti:8200 | xargs kill -9 2>/dev/null || true

echo "Stopping Verification Interface (port 8300)..."
lsof -ti:8300 | xargs kill -9 2>/dev/null || true

echo "Stopping Backend API (port 8443)..."
lsof -ti:8443 | xargs kill -9 2>/dev/null || true

# Stop Docker services
echo "Stopping Docker services..."
docker-compose down

echo ""
echo "✅ All services stopped!"
