# Security Headers Configuration

This document outlines the security headers that should be configured on your web server (not in HTML meta tags).

## Required HTTP Headers

Configure these headers on your web server (Nginx, Apache, AWS CloudFront, etc.):

### 1. Content Security Policy (CSP)
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
```

**Purpose**: Prevents XSS attacks by controlling which resources can be loaded.

### 2. X-Frame-Options
```
X-Frame-Options: DENY
```

**Purpose**: Prevents clickjacking attacks by disallowing the page to be embedded in iframes.

### 3. X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```

**Purpose**: Prevents MIME type sniffing.

### 4. Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose**: Controls how much referrer information is sent with requests.

### 5. Permissions-Policy
```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Purpose**: Controls which browser features can be used.

### 6. Strict-Transport-Security (HSTS)
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose**: Forces HTTPS connections.

## Server Configuration Examples

### Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Your other configuration...
}
```

### Apache (.htaccess)
```apache
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
</IfModule>
```

### AWS CloudFront (Response Headers Policy)
Create a custom response headers policy in CloudFront with these settings:

1. **Security headers**:
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   - Referrer-Policy: strict-origin-when-cross-origin

2. **Custom headers**:
   - Content-Security-Policy: (value as above)
   - Permissions-Policy: geolocation=(), microphone=(), camera=()

### AWS Lightsail Container (via nginx.conf)
If using Lightsail Container with Nginx, add the headers to your nginx configuration file.

## Testing Security Headers

Use these tools to verify your security headers are properly configured:

1. **Security Headers**: https://securityheaders.com/
2. **Mozilla Observatory**: https://observatory.mozilla.org/
3. **Browser DevTools**: Check Network tab → Response Headers

## Notes

- **DO NOT** set these headers via HTML `<meta>` tags - they must be HTTP headers
- CSP `frame-ancestors` directive is ignored when set via meta tag
- X-Frame-Options cannot be set via meta tag
- Always test in a staging environment before deploying to production
- Adjust CSP directives based on your specific third-party integrations

## Production Checklist

- [ ] All security headers configured on web server
- [ ] HTTPS enforced (HSTS enabled)
- [ ] CSP tested and not blocking legitimate resources
- [ ] Security headers verified using online tools
- [ ] No security headers in HTML meta tags
- [ ] CORS properly configured for API endpoints
