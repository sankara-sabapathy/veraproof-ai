# HTTPS Setup for VeraProof AI

## Problem
Modern browsers (Chrome, Safari) require **HTTPS** to access:
- Camera (getUserMedia API)
- Motion sensors (DeviceMotionEvent API)

Your current setup uses HTTP (`http://192.168.20.5:3000`), which is why permissions are blocked.

## Solution Options

### Option 1: Use ngrok (Recommended - Easiest)

1. **Download ngrok:**
   - Go to: https://ngrok.com/download
   - Or run: `choco install ngrok` (if you have Chocolatey)

2. **Start ngrok tunnel:**
   ```powershell
   ngrok http 3000
   ```

3. **Copy the HTTPS URL:**
   - ngrok will show something like: `https://abc123.ngrok.io`
   - This URL will work from any device (even outside your network)

4. **Update backend .env:**
   - Edit `backend/.env`
   - Change `FRONTEND_VERIFICATION_URL` to the ngrok HTTPS URL

5. **Restart backend and generate new session:**
   ```powershell
   # Stop backend (Ctrl+C in the backend terminal)
   # Restart it
   cd backend
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Generate new session URL
   .\get_session_url.ps1
   ```

### Option 2: Self-Signed Certificate (More Complex)

1. **Install OpenSSL:**
   ```powershell
   choco install openssl
   ```

2. **Generate certificate:**
   ```powershell
   cd verification-interface
   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=192.168.20.5"
   ```

3. **Create HTTPS server:**
   ```python
   # https_server.py
   import http.server, ssl
   
   server_address = ('0.0.0.0', 3443)
   httpd = http.server.HTTPServer(server_address, http.server.SimpleHTTPRequestHandler)
   
   context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
   context.load_cert_chain('cert.pem', 'key.pem')
   httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
   
   print('Server: https://192.168.20.5:3443')
   httpd.serve_forever()
   ```

4. **Run server:**
   ```powershell
   cd verification-interface
   python ../https_server.py
   ```

5. **Accept certificate warning on mobile:**
   - Open `https://192.168.20.5:3443`
   - Click "Advanced" → "Proceed to 192.168.20.5 (unsafe)"

### Option 3: Use localhost on Desktop (Testing Only)

If you just want to test the interface (not the mobile-specific features):
1. Open `http://localhost:3000?session_id=...` on your desktop
2. The desktop check will fail, but you can comment it out temporarily

## Recommended: ngrok

ngrok is the easiest and most reliable option:
- ✅ Automatic HTTPS
- ✅ Works from anywhere
- ✅ No certificate warnings
- ✅ Free tier available

**Quick Start:**
```powershell
# 1. Install ngrok
choco install ngrok

# 2. Start tunnel
ngrok http 3000

# 3. Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# 4. Update backend/.env
# FRONTEND_VERIFICATION_URL=https://abc123.ngrok.io

# 5. Restart backend and generate session
.\get_session_url.ps1
```

The new session URL will use HTTPS and camera/sensors will work!
