# VeraProof AI - Authentication Guide

## Overview

VeraProof AI uses a professional, enterprise-grade authentication system with JWT tokens for the partner dashboard and API keys for B2B integrations.

## Partner Dashboard Authentication

### Signup Flow

1. **Access the Dashboard**
   - Navigate to http://localhost:4200
   - You'll see the login page with two tabs: "Login" and "Sign Up"

2. **Create Your Account**
   - Click the "Sign Up" tab
   - Enter your email address
   - Create a password (minimum 6 characters)
   - Confirm your password
   - Click "Create Account"

3. **Automatic Login**
   - Upon successful signup, you'll receive JWT tokens
   - You'll be automatically logged in
   - Redirected to the dashboard

### Login Flow

1. **Access the Dashboard**
   - Navigate to http://localhost:4200
   - Click the "Login" tab (default)

2. **Enter Credentials**
   - Enter your registered email
   - Enter your password
   - Click "Login"

3. **Access Dashboard**
   - Upon successful authentication, you'll receive JWT tokens
   - Redirected to the dashboard

### Token Management

**Access Token:**
- Short-lived token (24 hours by default)
- Used for API authentication
- Stored in browser localStorage
- Automatically included in API requests

**Refresh Token:**
- Long-lived token (30 days by default)
- Used to obtain new access tokens
- Stored in browser localStorage
- Automatically used when access token expires

### Logout

Click the "Logout" button in the dashboard to:
- Clear all tokens from localStorage
- Redirect to login page
- Invalidate the session

## API Key Authentication

### Generating API Keys

1. **Login to Dashboard**
   - Access http://localhost:4200
   - Login with your credentials

2. **Navigate to API Keys**
   - Click "API Keys" in the sidebar

3. **Generate New Key**
   - Click "Generate New Key"
   - Select environment:
     - **Sandbox:** For testing and development
     - **Production:** For live integrations
   - Copy and securely store your API key

### Using API Keys

**Format:**
```
vp_{environment}_{unique_identifier}
```

**Example:**
```
vp_sandbox_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Usage in API Requests:**
```bash
curl -X POST http://localhost:8000/api/v1/sessions/create \
  -H "Authorization: Bearer vp_sandbox_a1b2c3d4..." \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {"user_id": "user-123"},
    "return_url": "https://yourapp.com/callback"
  }'
```

### API Key Security

**Best Practices:**
- Never commit API keys to version control
- Store keys in environment variables
- Use sandbox keys for development
- Rotate keys regularly
- Revoke compromised keys immediately

**Revoking Keys:**
1. Login to dashboard
2. Navigate to "API Keys"
3. Find the key to revoke
4. Click "Revoke"
5. Confirm the action

## Authentication Endpoints

### Signup
```http
POST /api/v1/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "bearer",
  "user": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "email": "user@example.com",
    "role": "Admin"
  }
}
```

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as signup

### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGci..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer"
}
```

### Logout
```http
POST /api/v1/auth/logout
Content-Type: application/json

{
  "refresh_token": "eyJhbGci..."
}
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Security Features

### Password Requirements
- Minimum 6 characters
- No maximum length
- Case-sensitive
- Hashed using SHA256 (development) / bcrypt (production recommended)

### JWT Configuration
- Algorithm: HS256
- Access token expiration: 24 hours
- Refresh token expiration: 30 days
- Secret key: Configurable via environment variables

### CORS Configuration
- Configured for local development
- Allows credentials
- Supports all HTTP methods
- Customizable origins

## Development vs Production

### Development Mode (Current)
- In-memory user storage
- Simple password hashing (SHA256)
- Permissive CORS
- HTTP allowed
- No email verification

### Production Recommendations
- PostgreSQL user table
- bcrypt password hashing
- Strict CORS policy
- HTTPS only
- Email verification required
- Password reset functionality
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- Two-factor authentication (2FA)
- Session management and revocation

## Troubleshooting

### "Invalid credentials" Error
- Verify email is correct
- Check password (case-sensitive)
- Ensure account exists (signup first)

### "User already exists" Error
- Email is already registered
- Use login instead of signup
- Or use a different email

### Token Expired
- Access token expires after 24 hours
- Use refresh token to get new access token
- Or login again

### CORS Errors
- Check backend CORS configuration
- Verify frontend API URL matches backend
- Ensure credentials are included in requests

## API Documentation

For complete API documentation, visit:
- **Development:** http://localhost:8000/docs
- **Interactive API:** http://localhost:8000/redoc

## Support

For authentication issues:
1. Check browser console for errors
2. Verify backend is running
3. Check network tab for API responses
4. Review backend logs
5. Consult [CURRENT_STATUS.md](CURRENT_STATUS.md)
