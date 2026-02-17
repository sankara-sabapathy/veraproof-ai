# VeraProof AI - Development Scripts

This folder contains utility scripts for local development and testing.

## Scripts Overview

### Service Management

- **`start.ps1`** (Windows) / **`start.sh`** (Linux/Mac)
  - Starts Docker services (PostgreSQL, LocalStack)
  - Displays next steps for starting backend and frontends

- **`stop.ps1`** (Windows) / **`stop.sh`** (Linux/Mac)
  - Stops all Docker services

- **`verify-services.ps1`** (Windows)
  - Checks status of all services (Docker, PostgreSQL, LocalStack, Backend, Frontends)
  - Useful for troubleshooting

### HTTPS Development

- **`start_backend_https.py`**
  - Generates self-signed SSL certificate for backend
  - Starts FastAPI backend with HTTPS on port 8443
  - Required for mobile browser WebSocket connections

- **`start_backend_http.ps1`** / **`start_backend_http.sh`** (NEW)
  - Starts FastAPI backend with HTTP on port 8000
  - Use this for local dashboard development (localhost:4200)
  - Simpler than HTTPS, no certificate warnings

- **`generate_cert_and_serve.py`**
  - Generates self-signed SSL certificate for verification interface
  - Serves verification interface over HTTPS on port 3443
  - Required for mobile browser camera and sensor access

### Testing

- **`get_session_url.ps1`** (Windows)
  - Creates a test verification session via API
  - Returns session URL for mobile testing

## Usage

### Windows (PowerShell)

```powershell
# Start services
.\scripts\start.ps1

# Start backend with HTTP (for dashboard development)
.\scripts\start_backend_http.ps1

# OR start backend with HTTPS (for mobile testing)
python .\scripts\start_backend_https.py

# Start verification interface with HTTPS (for mobile testing)
python .\scripts\generate_cert_and_serve.py

# Verify all services are running
.\scripts\verify-services.ps1

# Get test session URL
.\scripts\get_session_url.ps1

# Stop services
.\scripts\stop.ps1
```

### Linux/Mac (Bash)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Start services
./scripts/start.sh

# Start backend with HTTP (for dashboard development)
./scripts/start_backend_http.sh

# OR start backend with HTTPS (for mobile testing)
python3 scripts/start_backend_https.py

# Start verification interface with HTTPS (for mobile testing)
python3 scripts/generate_cert_and_serve.py

# Stop services
./scripts/stop.sh
```

## Original Spec Backups

This folder also contains backups of the original verbose specification documents:

- **`requirements-original-backup.md`** - Original detailed requirements (27 requirements)
- **`design-original-backup.md`** - Original detailed design document (4,793 lines)

These are kept for reference. The active specs in `.kiro/specs/veraproof-browser-prototype/` are condensed versions optimized for context window usage.

## Notes

- All scripts assume you're running them from the project root directory
- HTTPS scripts require the `cryptography` Python package: `pip install cryptography`
- Self-signed certificates will trigger browser warnings - this is expected for local development
- On mobile devices, you must accept the certificate warning to proceed
