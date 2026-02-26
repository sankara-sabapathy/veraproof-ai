#!/bin/bash
# VeraProof AI - Unified Development Environment Startup Script (Bash version)
# Starts all services required for local development with HTTPS support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load port configuration from .env.ports
if [ -f ".env.ports" ]; then
    export $(cat .env.ports | grep -v '^#' | xargs)
fi

# Default ports if not set
BACKEND_HTTP_PORT=${BACKEND_HTTP_PORT:-8100}
BACKEND_HTTPS_PORT=${BACKEND_HTTPS_PORT:-8443}
PARTNER_DASHBOARD_PORT=${PARTNER_DASHBOARD_PORT:-8200}
VERIFICATION_INTERFACE_PORT=${VERIFICATION_INTERFACE_PORT:-8300}
POSTGRES_PORT=${POSTGRES_PORT:-5432}
LOCALSTACK_PORT=${LOCALSTACK_PORT:-4566}

echo -e "${BLUE}🚀 VeraProof AI - Starting Development Environment${NC}\n"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Stop Docker services
    docker-compose down 2>/dev/null || true
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM EXIT

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found${NC}"; exit 1; }
echo -e "${GREEN}  ✅ Docker found${NC}"

command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not found${NC}"; exit 1; }
echo -e "${GREEN}  ✅ Docker Compose found${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js not found${NC}"; exit 1; }
echo -e "${GREEN}  ✅ Node.js found${NC}"

command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1 || { echo -e "${RED}❌ Python not found${NC}"; exit 1; }
echo -e "${GREEN}  ✅ Python found${NC}"

echo -e "${GREEN}✅ All prerequisites met${NC}\n"

# Start Docker services
echo -e "${BLUE}🐳 Starting Docker services (PostgreSQL, LocalStack)...${NC}"
docker-compose up -d postgres localstack

echo -e "${GREEN}✅ Docker services started${NC}"
echo -e "   - PostgreSQL: localhost:${POSTGRES_PORT}"
echo -e "   - LocalStack: localhost:${LOCALSTACK_PORT}\n"

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Start Backend API with HTTPS
echo -e "${BLUE}🚀 Starting Backend API (HTTPS on port ${BACKEND_HTTPS_PORT})...${NC}"
cd backend

# Generate SSL certificate if needed
if [ ! -f "cert.pem" ] || [ ! -f "key.pem" ]; then
    echo -e "${YELLOW}   Generating self-signed SSL certificate...${NC}"
    python3 ../scripts/start_backend_https.py --generate-cert-only 2>/dev/null || {
        # Fallback: use openssl
        openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes \
            -subj "/C=US/ST=California/L=San Francisco/O=VeraProof AI/CN=localhost" 2>/dev/null
    }
fi

# Start uvicorn with SSL in background
python3 -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${BACKEND_HTTPS_PORT} \
    --ssl-keyfile key.pem \
    --ssl-certfile cert.pem \
    --reload > ../logs/backend.log 2>&1 &

BACKEND_PID=$!
cd ..

echo -e "${GREEN}✅ Backend API started (PID: ${BACKEND_PID})${NC}"
echo -e "   - HTTPS: https://localhost:${BACKEND_HTTPS_PORT}"
echo -e "   - Docs: https://localhost:${BACKEND_HTTPS_PORT}/docs\n"

sleep 2

# Start Partner Dashboard
echo -e "${BLUE}🎨 Starting Partner Dashboard (port ${PARTNER_DASHBOARD_PORT})...${NC}"
cd partner-dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}   📦 Installing dependencies...${NC}"
    npm install
fi

# Start Angular dev server in background
npm start > ../logs/partner-dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..

echo -e "${GREEN}✅ Partner Dashboard started (PID: ${DASHBOARD_PID})${NC}"
echo -e "   - URL: http://localhost:${PARTNER_DASHBOARD_PORT}\n"

sleep 2

# Start Verification Interface
echo -e "${BLUE}📱 Starting Verification Interface (port ${VERIFICATION_INTERFACE_PORT})...${NC}"

# Use Python's built-in HTTP server
python3 -m http.server ${VERIFICATION_INTERFACE_PORT} \
    --directory verification-interface > logs/verification-interface.log 2>&1 &
INTERFACE_PID=$!

echo -e "${GREEN}✅ Verification Interface started (PID: ${INTERFACE_PID})${NC}"
echo -e "   - URL: http://localhost:${VERIFICATION_INTERFACE_PORT}\n"

# Print summary
echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}🎉 VeraProof AI Development Environment Ready!${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "\n${BLUE}📋 Service URLs:${NC}"
echo -e "   Backend API (HTTPS):      https://localhost:${BACKEND_HTTPS_PORT}"
echo -e "   Backend API Docs:         https://localhost:${BACKEND_HTTPS_PORT}/docs"
echo -e "   Partner Dashboard:        http://localhost:${PARTNER_DASHBOARD_PORT}"
echo -e "   Verification Interface:   http://localhost:${VERIFICATION_INTERFACE_PORT}"
echo -e "   PostgreSQL:               localhost:${POSTGRES_PORT}"
echo -e "   LocalStack (S3):          http://localhost:${LOCALSTACK_PORT}"

echo -e "\n${YELLOW}⚠️  Notes:${NC}"
echo -e "   - You'll need to accept the self-signed SSL certificate warning"
echo -e "   - Press Ctrl+C to stop all services"
echo -e "   - Logs are in the ./logs directory"
echo -e "\n${GREEN}================================================================${NC}\n"

# Create logs directory if it doesn't exist
mkdir -p logs

# Keep script running and tail logs
echo -e "${BLUE}📝 Tailing service logs (Ctrl+C to stop):${NC}\n"
tail -f logs/*.log 2>/dev/null || {
    echo -e "${YELLOW}Waiting for services to generate logs...${NC}"
    while true; do
        sleep 1
    done
}
