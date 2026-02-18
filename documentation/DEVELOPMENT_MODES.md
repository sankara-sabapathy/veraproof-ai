# VeraProof AI - Development Modes

This guide explains the two development modes and when to use each.

## 🖥️ Mode 1: Dashboard Development (HTTP)

**Use this when:** Testing the partner dashboard on your local machine

**Setup:**

1. **Start Docker services:**
   ```powershell
   .\scripts\start.ps1
   ```

2. **Start backend with HTTP:**
   ```powershell
   .\scripts\start_backend_http.ps1
   ```

3. **Start dashboard:**
   ```powershell
   cd partner-dashboard
   npm start
   ```

**Access:**
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Partner Dashboard: http://localhost:4200

**Login:**
- Email: test@veraproof.ai
- Password: test123

**Why HTTP?**
- No certificate warnings
- Simpler development workflow
- Dashboard runs on localhost, so HTTPS not required

---

## 📱 Mode 2: Mobile Testing (HTTPS)

**Use this when:** Testing verification on mobile devices

**Setup:**

1. **Start Docker services:**
   ```powershell
   .\scripts\start.ps1
   ```

2. **Start backend with HTTPS:**
   ```powershell
   python .\scripts\start_backend_https.py
   ```

3. **Start verification interface with HTTPS:**
   ```powershell
   python .\scripts\generate_cert_and_serve.py
   ```

4. **Start dashboard (optional):**
   ```powershell
   cd partner-dashboard
   npm start
   ```

**Access:**
- Backend API: https://192.168.20.5:8443
- Verification Interface: https://192.168.20.5:3443
- Partner Dashboard: http://localhost:4200

**Important:**
- Replace `192.168.20.5` with your actual local IP address
- You must accept self-signed certificate warnings on mobile device
- Mobile browsers require HTTPS for camera and sensor access

**Why HTTPS?**
- Mobile browsers block camera access over HTTP
- DeviceMotionEvent API requires HTTPS
- WebSocket Secure (WSS) required for real-time data

---

## 🔄 Switching Between Modes

### From HTTP to HTTPS:

1. Stop HTTP backend (Ctrl+C)
2. Update dashboard environment (if needed):
   ```typescript
   // partner-dashboard/src/environments/environment.ts
   apiUrl: 'https://192.168.20.5:8443'
   ```
3. Start HTTPS backend: `python .\scripts\start_backend_https.py`
4. Restart dashboard: `npm start`

### From HTTPS to HTTP:

1. Stop HTTPS backend (Ctrl+C)
2. Update dashboard environment:
   ```typescript
   // partner-dashboard/src/environments/environment.ts
   apiUrl: 'http://localhost:8000'
   ```
3. Start HTTP backend: `.\scripts\start_backend_http.ps1`
4. Restart dashboard: `npm start`

---

## 🎯 Quick Reference

| Component | HTTP Mode | HTTPS Mode |
|-----------|-----------|------------|
| **Backend** | http://localhost:8000 | https://192.168.20.5:8443 |
| **Verification UI** | http://localhost:3000 | https://192.168.20.5:3443 |
| **Dashboard** | http://localhost:4200 | http://localhost:4200 |
| **Use Case** | Dashboard development | Mobile testing |
| **Certificate** | Not needed | Self-signed (accept warnings) |
| **Mobile Access** | ❌ Camera/sensors blocked | ✅ Full access |

---

## 🐛 Troubleshooting

### Dashboard Login Error: ERR_CERT_AUTHORITY_INVALID

**Problem:** Dashboard on HTTP trying to connect to HTTPS backend with self-signed certificate

**Solution:** Use HTTP backend for dashboard development:
```powershell
.\scripts\start_backend_http.ps1
```

And ensure environment.ts has:
```typescript
apiUrl: 'http://localhost:8000'
```

### Mobile Camera Not Working

**Problem:** Mobile browser blocks camera over HTTP

**Solution:** Use HTTPS mode:
```powershell
python .\scripts\start_backend_https.py
python .\scripts\generate_cert_and_serve.py
```

Access from mobile: https://192.168.20.5:3443

### Connection Refused

**Problem:** Backend not running or wrong port

**Solution:** Check which backend is running:
```powershell
.\scripts\verify-services.ps1
```

Ensure dashboard environment.ts matches the running backend.

---

## 📝 Current Configuration

Your dashboard is currently configured for: **HTTP Mode**

```typescript
// partner-dashboard/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000'  // ← HTTP backend
};
```

**To use this configuration:**
1. Start backend with: `.\scripts\start_backend_http.ps1`
2. Start dashboard with: `npm start`
3. Login at: http://localhost:4200

---

## 🚀 Recommended Workflow

**For Dashboard Development:**
```powershell
# Terminal 1
.\scripts\start.ps1

# Terminal 2
.\scripts\start_backend_http.ps1

# Terminal 3
cd partner-dashboard && npm start
```

**For Mobile Testing:**
```powershell
# Terminal 1
.\scripts\start.ps1

# Terminal 2
python .\scripts\start_backend_https.py

# Terminal 3
python .\scripts\generate_cert_and_serve.py

# Terminal 4 (optional)
cd partner-dashboard && npm start
```
