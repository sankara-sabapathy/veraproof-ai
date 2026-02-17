# Partner Dashboard Setup Guide

## 1. Dashboard Login

### Access the Dashboard
- URL: `http://localhost:4200`
- The Angular dashboard should be running (if not, start it with `npm start` in the `partner-dashboard` directory)

### Login Credentials
Use the test account created by the session URL generator:
- **Email:** `test@veraproof.ai`
- **Password:** `test123`

### If Login Doesn't Work
1. Click "Sign up" link on the login page
2. Create a new account with your email and password
3. The backend will create a new tenant account
4. You'll be automatically logged in

### Backend API Endpoint
The dashboard connects to: `https://192.168.20.5:8443/api/v1`

Make sure:
- Backend HTTPS server is running (`python start_backend_https.py`)
- CORS is configured to allow `http://localhost:4200`

---

## 2. DBeaver PostgreSQL Connection Setup

### Step 1: Open DBeaver
1. Launch DBeaver application
2. Click "Database" → "New Database Connection" (or press Ctrl+Shift+N)

### Step 2: Select PostgreSQL
1. In the "Connect to a database" dialog, select **PostgreSQL**
2. Click "Next"

### Step 3: Configure Connection

**Main Tab:**
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `veraproof`
- **Username:** `veraproof`
- **Password:** `veraproof_dev_password`

**Optional - Connection Name:**
- Set a friendly name like "VeraProof Local DB"

### Step 4: Test Connection
1. Click "Test Connection" button
2. If this is your first time connecting to PostgreSQL in DBeaver:
   - DBeaver will prompt to download PostgreSQL JDBC driver
   - Click "Download" and wait for it to complete
3. You should see "Connected" message

### Step 5: Finish Setup
1. Click "Finish" to save the connection
2. The connection will appear in the Database Navigator panel

### Step 6: Explore the Database

**View Tables:**
1. Expand the connection in Database Navigator
2. Expand: `veraproof` → `Schemas` → `public` → `Tables`

**Available Tables:**
- `tenants` - Partner accounts
- `sessions` - Verification sessions
- `api_keys` - API keys for partners
- `refresh_tokens` - JWT refresh tokens
- `branding` - Partner branding configurations
- `webhooks` - Webhook configurations
- `billing_transactions` - Billing history

**Query Data:**
```sql
-- View all tenants
SELECT * FROM tenants;

-- View recent sessions
SELECT session_id, tenant_id, state, created_at, final_trust_score 
FROM sessions 
ORDER BY created_at DESC 
LIMIT 10;

-- View sessions with results
SELECT 
    s.session_id,
    s.state,
    s.tier_1_score,
    s.final_trust_score,
    s.correlation_value,
    s.created_at,
    t.email as tenant_email
FROM sessions s
JOIN tenants t ON s.tenant_id = t.tenant_id
WHERE s.state = 'complete'
ORDER BY s.created_at DESC;
```

### Troubleshooting

**Connection Refused:**
- Ensure PostgreSQL container is running: `docker-compose ps`
- Start if needed: `docker-compose up -d`

**Authentication Failed:**
- Check credentials in `backend/.env` file
- Verify DATABASE_URL matches the connection settings

**Database Not Found:**
- The database is created automatically by the init.sql script
- If missing, restart the container: `docker-compose restart postgres`

---

## 3. Verification Session Storage & S3 Upload

### Current Implementation Status

**What's Implemented:**
- ✅ Session metadata stored in PostgreSQL
- ✅ IMU data collected and stored in memory during verification
- ✅ Video chunks received via WebSocket
- ✅ S3 storage manager with LocalStack integration
- ✅ Tenant isolation in database (tenant_id foreign key)

**What's NOT Yet Implemented:**
- ❌ Video chunks not being uploaded to S3
- ❌ IMU data not being uploaded to S3
- ❌ Optical flow data not being computed or stored
- ❌ S3 tenant isolation (folder structure)

### Implementation Plan

#### Phase 1: S3 Folder Structure (Tenant Isolation)
```
s3://veraproof-artifacts/
├── {tenant_id}/
│   ├── sessions/
│   │   ├── {session_id}/
│   │   │   ├── video.webm
│   │   │   ├── imu_data.json
│   │   │   └── optical_flow.json
│   └── branding/
│       └── logo.{ext}
```

#### Phase 2: Upload After Verification
After `perform_verification()` completes:
1. Combine video chunks into single file
2. Upload video to S3: `{tenant_id}/sessions/{session_id}/video.webm`
3. Upload IMU data to S3: `{tenant_id}/sessions/{session_id}/imu_data.json`
4. Update session record with S3 keys
5. Clear in-memory data

#### Phase 3: Implement in websocket_handler.py

**Add method to upload artifacts:**
```python
async def upload_session_artifacts(self, session_id: str):
    """Upload session artifacts to S3 after verification"""
    from app.storage import storage_manager
    import json
    
    session_data = self.session_data.get(session_id)
    if not session_data:
        return
    
    # Get session to get tenant_id
    session = await session_manager.get_session(session_id)
    tenant_id = session['tenant_id']
    
    # Upload video chunks
    if session_data['video_chunks']:
        video_data = b''.join([chunk['data'] for chunk in session_data['video_chunks']])
        video_key = f"{tenant_id}/sessions/{session_id}/video.webm"
        await storage_manager.upload_file(video_key, video_data, 'video/webm')
    
    # Upload IMU data
    if session_data['imu_data']:
        imu_json = json.dumps(session_data['imu_data'])
        imu_key = f"{tenant_id}/sessions/{session_id}/imu_data.json"
        await storage_manager.upload_file(imu_key, imu_json.encode(), 'application/json')
    
    # Update session with S3 keys
    await session_manager.store_artifact_keys(
        session_id=session_id,
        video_s3_key=video_key if session_data['video_chunks'] else None,
        imu_data_s3_key=imu_key if session_data['imu_data'] else None
    )
    
    # Clear in-memory data
    self.clear_session_data(session_id)
```

**Call after verification:**
```python
async def perform_verification(self, session_id: str):
    # ... existing verification code ...
    
    # After sending result, upload artifacts
    await self.upload_session_artifacts(session_id)
```

#### Phase 4: Verify S3 Storage

**Check LocalStack S3:**
```bash
# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List objects in bucket
aws --endpoint-url=http://localhost:4566 s3 ls s3://veraproof-artifacts/ --recursive

# Download a file
aws --endpoint-url=http://localhost:4566 s3 cp s3://veraproof-artifacts/{tenant_id}/sessions/{session_id}/video.webm ./test-video.webm
```

**Query Database for S3 Keys:**
```sql
SELECT 
    session_id,
    video_s3_key,
    imu_data_s3_key,
    optical_flow_s3_key
FROM sessions
WHERE video_s3_key IS NOT NULL;
```

### Security Considerations

1. **Tenant Isolation:** All S3 keys prefixed with `tenant_id`
2. **Signed URLs:** Use time-limited signed URLs for artifact access
3. **Access Control:** Verify tenant ownership before generating signed URLs
4. **Data Retention:** Implement cleanup job to delete old artifacts (90 days)

---

## 4. Testing Checklist

### Dashboard
- [ ] Can login with test@veraproof.ai / test123
- [ ] Can signup with new account
- [ ] Dashboard loads after login
- [ ] Can view sessions list
- [ ] Can view session details
- [ ] Can generate API keys

### Database
- [ ] Can connect via DBeaver
- [ ] Can view all tables
- [ ] Sessions are being created
- [ ] Verification results are stored
- [ ] Tenant data is isolated

### S3 Storage
- [ ] LocalStack is running
- [ ] Bucket exists
- [ ] Video files are uploaded
- [ ] IMU data is uploaded
- [ ] Tenant folders are created
- [ ] Can download artifacts via signed URLs

### End-to-End
- [ ] Mobile verification completes successfully
- [ ] Session appears in database
- [ ] Artifacts uploaded to S3
- [ ] Dashboard shows session with results
- [ ] Can download artifacts from dashboard
