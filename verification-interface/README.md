# VeraProof AI - Verification Interface

Mobile-only verification interface using Vanilla JavaScript, MediaRecorder, and DeviceMotionEvent.

## Features

- Device compatibility check (mobile-only enforcement)
- Real-time video capture (250ms chunks)
- IMU data collection (60Hz sampling)
- WebSocket streaming to backend
- Pan & Return Challenge protocol
- Partner branding support
- Responsive mobile-first design

## Architecture

```
js/
├── main.js                  - Main entry point and app orchestration
├── device-detector.js       - Device type and sensor detection
├── video-capture.js         - MediaRecorder with chunked output
├── imu-collector.js         - DeviceMotionEvent at 60Hz
├── ws-manager.js            - WebSocket client with reconnection
├── challenge-controller.js  - Pan & Return protocol
└── ui-controller.js         - UI updates and branding
```

## Usage

### Local Development

1. Start the backend server (see backend/README.md)

2. Serve the verification interface:
   ```bash
   # Using Python
   cd verification-interface
   python -m http.server 8080
   
   # Or using Node.js
   npx http-server -p 8080
   ```

3. Access on mobile device:
   ```
   http://<your-local-ip>:8080?session_id=<session_id>&return_url=<return_url>
   ```

### URL Parameters

- `session_id` (required): Session ID from partner API
- `return_url` (optional): URL to redirect after verification

### Testing

For local testing without a real session:

1. Create a test session via API:
   ```bash
   curl -X POST http://localhost:8000/api/v1/sessions/create \
     -H "X-API-Key: test_sandbox_key" \
     -H "Content-Type: application/json" \
     -d '{"metadata": {}, "return_url": "https://example.com/callback"}'
   ```

2. Use the returned `session_id` in the URL

## Browser Compatibility

- Chrome/Safari on iOS 13+
- Chrome on Android 8+
- Requires HTTPS for production (camera/sensor permissions)

## Pan & Return Challenge

1. **Baseline** (1s): Hold phone steady
2. **Pan** (2s): Tilt phone right
3. **Return** (2s): Return to center
4. **Analyzing**: Wait for results

## Partner Branding

The interface automatically applies partner branding received via WebSocket:
- Logo (top of verification page)
- Primary color (headers, accents)
- Secondary color (backgrounds)
- Button color (action buttons)

## Error Handling

- Desktop/laptop access blocked
- Missing sensor support detected
- Camera permission denied
- WebSocket reconnection (exponential backoff)
- Session timeout handling

## Production Deployment

Deploy to S3 + CloudFront:

```bash
# Build (if using bundler)
npm run build

# Deploy to S3
aws s3 sync . s3://veraproof-verification-ui --exclude "*.md" --exclude "node_modules/*"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

## Security

- HTTPS required for camera/sensor access
- Session ID validated by backend
- No sensitive data stored in browser
- WebSocket connection authenticated via session_id
