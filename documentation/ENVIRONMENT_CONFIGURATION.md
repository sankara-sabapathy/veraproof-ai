# Environment Configuration Guide

## Overview

VeraProof AI uses environment-specific configuration files to manage different deployment scenarios. The verification interface URL changes based on the environment.

## Environment Files

### Development (.env.development)
**Used for**: Local development with localhost URLs

**Key Settings**:
- `FRONTEND_VERIFICATION_URL=http://localhost:8080` - Local verification interface
- `FRONTEND_DASHBOARD_URL=http://localhost:4200` - Local Angular dev server
- `BACKEND_URL=http://localhost:8000` - Local FastAPI server
- `DATABASE_URL=postgresql://...@localhost:5432/veraproof` - Local PostgreSQL
- `USE_MOCK_SAGEMAKER=true` - Mock AI services
- `USE_LOCAL_AUTH=true` - In-memory authentication

**Session URLs Generated**: `http://localhost:8080?session_id={uuid}`

### Production (.env.production)
**Used for**: AWS Lightsail deployment with CloudFront

**Key Settings**:
- `FRONTEND_VERIFICATION_URL=https://verify.yourdomain.com` - CloudFront or custom domain
- `FRONTEND_DASHBOARD_URL=https://dashboard.yourdomain.com` - CloudFront or custom domain
- `BACKEND_URL=https://api.yourdomain.com` - Lightsail container URL
- `DATABASE_URL=postgresql://...@rds-endpoint:5432/veraproof` - RDS database
- `USE_MOCK_SAGEMAKER=false` - Real SageMaker
- `USE_LOCAL_AUTH=false` - AWS Cognito

**Session URLs Generated**: `https://verify.yourdomain.com?session_id={uuid}`

## Configuration Hierarchy

1. **Default**: `backend/.env` - Active configuration file
2. **Development Template**: `backend/.env.development` - Copy to .env for local dev
3. **Production Template**: `backend/.env.production` - Copy to .env for production
4. **Local Override**: `backend/.env.local` - Git-ignored, for personal overrides

## Setup Instructions

### For Local Development

1. **Copy development config**:
   ```bash
   cd backend
   cp .env.development .env
   ```

2. **Start PostgreSQL**:
   ```bash
   docker start veraproof-postgres
   ```

3. **Start backend**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. **Start verification interface**:
   ```bash
   cd verification-interface
   python -m http.server 8080
   ```

5. **Start dashboard**:
   ```bash
   cd partner-dashboard
   npm start
   ```

6. **Create session**: Session URLs will be `http://localhost:8080?session_id=...`

### For Production Deployment

1. **Copy production config**:
   ```bash
   cd backend
   cp .env.production .env
   ```

2. **Update production values**:
   ```bash
   # Edit .env and replace:
   # - Database credentials
   # - JWT secret
   # - Domain URLs (CloudFront or custom domain)
   # - AWS region and bucket names
   # - Cognito pool IDs
   ```

3. **Deploy verification interface to S3**:
   ```bash
   aws s3 sync verification-interface/ s3://your-verification-bucket/
   ```

4. **Deploy dashboard to S3**:
   ```bash
   cd partner-dashboard
   npm run build
   aws s3 sync dist/ s3://your-dashboard-bucket/
   ```

5. **Deploy backend to Lightsail**:
   ```bash
   # Build and push Docker image
   docker build -t veraproof-backend .
   aws lightsail push-container-image --service-name veraproof-api --image veraproof-backend
   ```

6. **Create session**: Session URLs will be `https://verify.yourdomain.com?session_id=...`

## URL Configuration Examples

### Development (Localhost)
```env
FRONTEND_VERIFICATION_URL=http://localhost:8080
FRONTEND_DASHBOARD_URL=http://localhost:4200
BACKEND_URL=http://localhost:8000
```

**Generated Session URL**: `http://localhost:8080?session_id=abc-123`

### Production (CloudFront)
```env
FRONTEND_VERIFICATION_URL=https://d3gc0en9my7apv.cloudfront.net
FRONTEND_DASHBOARD_URL=https://dmieqia655oqd.cloudfront.net
BACKEND_URL=https://veraproof-api-prod.hbcqqqvv5xfqj.ap-south-1.cs.amazonlightsail.com
```

**Generated Session URL**: `https://d3gc0en9my7apv.cloudfront.net?session_id=abc-123`

### Production (Custom Domain)
```env
FRONTEND_VERIFICATION_URL=https://verify.veraproof.ai
FRONTEND_DASHBOARD_URL=https://dashboard.veraproof.ai
BACKEND_URL=https://api.veraproof.ai
```

**Generated Session URL**: `https://verify.veraproof.ai?session_id=abc-123`

## Network Testing (Mobile on Local Network)

For testing on mobile devices connected to your local network:

1. **Find your computer's IP**:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   Example: `192.168.1.100`

2. **Update .env**:
   ```env
   FRONTEND_VERIFICATION_URL=http://192.168.1.100:8080
   FRONTEND_DASHBOARD_URL=http://192.168.1.100:4200
   BACKEND_URL=http://192.168.1.100:8000
   CORS_ORIGINS=http://192.168.1.100:8080,http://192.168.1.100:4200
   ```

3. **Restart backend** to pick up new config

4. **Create session**: Session URLs will be `http://192.168.1.100:8080?session_id=...`

5. **Open on mobile**: Access the session URL from your mobile device

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_VERIFICATION_URL` | Verification interface URL | `http://localhost:8080` |
| `FRONTEND_DASHBOARD_URL` | Partner dashboard URL | `http://localhost:4200` |
| `BACKEND_URL` | Backend API URL | `http://localhost:8000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for JWT signing | `random-secret-string` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:4200` |
| `SESSION_EXPIRATION_MINUTES` | Session timeout | `15` |
| `USE_MOCK_SAGEMAKER` | Use mock AI services | `true` |
| `USE_LOCAL_AUTH` | Use in-memory auth | `true` |

## Troubleshooting

### Issue: Session URLs show wrong domain

**Symptom**: Session URLs show `https://192.168.20.5:3443` instead of `http://localhost:8080`

**Solution**:
1. Check `backend/.env` file has correct `FRONTEND_VERIFICATION_URL`
2. Restart backend to pick up changes
3. Create new session to test

### Issue: Database connection fails

**Symptom**: Backend logs show database connection errors

**Solution**:
1. Start PostgreSQL: `docker start veraproof-postgres`
2. Verify connection: `docker exec veraproof-postgres pg_isready`
3. Check `DATABASE_URL` in `.env` matches Docker container

### Issue: CORS errors in browser

**Symptom**: Browser console shows CORS policy errors

**Solution**:
1. Add verification interface URL to `CORS_ORIGINS` in `.env`
2. Restart backend
3. Clear browser cache

## Best Practices

1. **Never commit .env files** - They contain secrets
2. **Use .env.development for local work** - Copy to .env
3. **Use .env.production as template** - Update with real values
4. **Use .env.local for personal overrides** - Git-ignored
5. **Restart backend after .env changes** - Config loaded at startup
6. **Use environment-specific URLs** - Don't mix localhost with production URLs

## Security Notes

- `.env` files are git-ignored (contain secrets)
- `.env.development` and `.env.production` are templates (no real secrets)
- Production JWT secrets should be randomly generated
- Production database passwords should be strong and unique
- CORS origins should be restricted in production

---

**Current Setup**: Development mode with localhost URLs and PostgreSQL in Docker.
