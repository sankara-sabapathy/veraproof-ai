# Verification Interface Setup Guide

## Overview
The verification interface is now running and accessible for testing the "Pan & Return" challenge protocol.

## Running Services

### 1. Backend API (FastAPI)
- **URL**: http://localhost:8000
- **Status**: Running
- **Purpose**: Handles session creation, WebSocket connections, and verification processing

### 2. Partner Dashboard (Angular)
- **URL**: http://localhost:4200
- **Status**: Running
- **Purpose**: Create sessions, view analytics, manage API keys

### 3. Verification Interface (Vanilla JS)
- **URL**: http://localhost:8080
- **Status**: Running
- **Purpose**: Mobile verification interface for end-users

## How to Test the Complete Flow

### Step 1: Create a Session
1. Open the Partner Dashboard: http://localhost:4200
2. Login with your credentials
3. Click "Create Session" button
4. Fill in the return URL (e.g., `http://localhost:4200/dashboard`)
5. Click "Create Session"
6. Copy the session URL that's generated

### Step 2: Access Verification Interface
The session URL will look like:
```
http://localhost:8080?session_id=3e59e993-e12c-42df-b3d0-fb79ba1324bd
```

**For Desktop Testing** (Development Only):
- Open the URL in your browser
- You'll see a message that desktop devices aren't supported (this is by design)
- The interface enforces mobile-only access per VeraProof standards

**For Mobile Testing** (Recommended):
1. Make sure your mobile device is on the same network
2. Find your computer's local IP address:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
3. Replace `localhost` with your IP address in the session URL
4. Open the URL on your mobile device
5. Grant camera and motion sensor permissions
6. Follow the Pan & Return challenge instructions

### Step 3: Complete Verification
The verification interface will guide you through:
1. **Device Check**: Verifies mobile device and sensor support
2. **Permission Request**: Requests camera and motion sensor access
3. **Baseline Phase**: Hold phone steady for 1 second
4. **Pan Phase**: Tilt phone right (tracking gyro vs optical flow)
5. **Return Phase**: Return phone to center
6. **Analysis**: Backend calculates Pearson correlation
7. **Results**: Shows trust score and verification outcome

## Architecture

### Session Flow
```
Partner Dashboard → Backend API → Session Created
                                      ↓
                              Session URL Generated
                                      ↓
Mobile Device → Verification Interface → WebSocket Connection
                                      ↓
                              Video + IMU Streaming
                                      ↓
                              Backend Processing
                                      ↓
                              Results Returned
```

### WebSocket Connection
- **Endpoint**: `ws://localhost:8000/api/v1/ws/verify/{session_id}`
- **Protocol**: Real-time bidirectional communication
- **Data Streams**:
  - Video chunks (250ms intervals)
  - IMU data batches (60Hz sampling)
  - Phase change instructions
  - Branding configuration
  - Verification results

## Configuration Files Updated

### backend/.env
Updated for local development:
```env
BACKEND_URL=http://localhost:8000
FRONTEND_VERIFICATION_URL=http://localhost:8080
FRONTEND_DASHBOARD_URL=http://localhost:4200
CORS_ORIGINS=http://localhost:8080,http://localhost:3000,http://localhost:4200
```

## Troubleshooting

### Issue: "Desktop devices not supported"
**Solution**: This is expected behavior. Use a mobile device or temporarily modify `device-detector.js` for testing.

### Issue: WebSocket connection fails
**Solution**: 
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check browser console for WebSocket errors
3. Ensure session_id is valid and not expired

### Issue: Camera/sensor permissions denied
**Solution**:
1. Refresh the page and try again
2. Check browser settings to ensure permissions aren't blocked
3. For iOS Safari, ensure you're using HTTPS in production

### Issue: Session URL shows wrong host
**Solution**: Backend uses `FRONTEND_VERIFICATION_URL` from .env file. Update if needed.

## Mobile Testing on Local Network

To test on a real mobile device:

1. **Find your computer's IP**:
   ```powershell
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. **Update backend/.env** (if needed):
   ```env
   FRONTEND_VERIFICATION_URL=http://192.168.1.100:8080
   ```

3. **Restart backend** to pick up changes

4. **Create new session** from dashboard

5. **Open session URL on mobile device**

## Scripts

### Start Verification Interface
```powershell
.\scripts\serve_verification_interface.ps1
```

### Start Backend
```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Start Dashboard
```powershell
cd partner-dashboard
npm start
```

## Next Steps

1. ✅ Backend API running
2. ✅ Partner Dashboard running
3. ✅ Verification Interface running
4. ✅ Session creation working
5. 🔄 Test on mobile device
6. 🔄 Complete Pan & Return challenge
7. 🔄 Verify results in dashboard

## Production Deployment

For production deployment:
- Serve verification interface from S3 + CloudFront
- Use HTTPS for all services
- Update CORS origins
- Configure proper domain names
- Enable SSL certificates

## Support

If you encounter issues:
1. Check all three services are running
2. Verify session hasn't expired (15 minutes default)
3. Check browser console for errors
4. Ensure mobile device has camera and motion sensors
5. Test WebSocket connection manually

---

**Status**: All services configured and running for local development testing.
