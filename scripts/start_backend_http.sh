#!/bin/bash
# VeraProof AI - Start Backend with HTTP (for local dashboard development)
# Use this when testing the dashboard on localhost:4200

echo "Starting Backend API with HTTP..."
echo "This is for local dashboard development only."
echo "For mobile testing, use start_backend_https.py instead."
echo ""

cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
