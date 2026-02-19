# VeraProof AI - Quick Start Guide

## 🚀 All Services Running

| Service | URL | Status |
|---------|-----|--------|
| Backend API | http://localhost:8000 | ✅ Running |
| Partner Dashboard | http://localhost:4200 | ✅ Running |
| Verification Interface | http://localhost:8080 | ✅ Running |

## 📱 Test the Complete Flow

### 1. Create a Session
```
1. Open: http://localhost:4200
2. Login to dashboard
3. Click "Create Session" button
4. Enter return URL: http://localhost:4200/dashboard
5. Click "Create Session"
6. Copy the session URL
```

### 2. Test Verification Interface
```
Desktop (shows error - expected):
→ Paste session URL in browser
→ See "Desktop not supported" message

Mobile (full test):
→ Open session URL on mobile device
→ Grant camera and motion permissions
→ Follow Pan & Return instructions
→ View verification results
```

## 🔧 Restart Services

### Backend
```powershell
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Dashboard
```powershell
cd partner-dashboard
npm start
```

### Verification Interface
```powershell
cd verification-interface
python -m http.server 8080
```

Or use the script:
```powershell
.\scripts\serve_verification_interface.ps1
```

## 📊 Session URL Format

New sessions will have URLs like:
```
http://localhost:8080?session_id=3e59e993-e12c-42df-b3d0-fb79ba1324bd
```

## 🎯 Pan & Return Challenge

The verification interface implements the Physics-First protocol:

1. **Baseline** (1s): Hold phone steady
2. **Pan** (2s): Tilt phone right
3. **Return** (2s): Return to center  
4. **Analysis**: Pearson correlation calculated
5. **Result**: Trust score displayed

## 📖 Full Documentation

- Setup Guide: `VERIFICATION_INTERFACE_SETUP.md`
- Fix Summary: `VERIFICATION_INTERFACE_FIX_SUMMARY.md`
- Session Creation: `CREATE_SESSION_FEATURE_ADDED.md`

## ✅ What's Working

- ✅ Session creation from dashboard
- ✅ Session URLs generated correctly
- ✅ Verification interface accessible
- ✅ WebSocket connection ready
- ✅ Mobile-only enforcement
- ✅ Pan & Return protocol implemented
- ✅ Real-time video and IMU streaming

## 🔄 Next: Test on Mobile

To test on your mobile device:

1. Find your computer's IP:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```

2. Update `backend/.env` if needed:
   ```env
   FRONTEND_VERIFICATION_URL=http://YOUR_IP:8080
   ```

3. Restart backend

4. Create new session

5. Open session URL on mobile

---

**Status**: All systems operational. Ready for testing! 🎉
