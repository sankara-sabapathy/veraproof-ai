# Partner Dashboard Testing Guide

## Quick Start

### Prerequisites
- Backend API running on http://localhost:8000
- Frontend running on http://localhost:4200
- PostgreSQL database running (Docker)

### Current Status
✅ All services are running and ready for testing

## Test Scenarios

### 1. Signup Flow

#### Access
Navigate to: http://localhost:4200/auth/signup

#### Test Cases

**TC1: Valid Signup**
```
Email: newuser@example.com
Password: Test123!@#
Confirm Password: Test123!@#

Expected: Success, redirect to /dashboard
```

**TC2: Invalid Email**
```
Email: invalid-email
Password: Test123!@#
Confirm Password: Test123!@#

Expected: Error "Please enter a valid email address"
```

**TC3: Weak Password**
```
Email: test@example.com
Password: weak
Confirm Password: weak

Expected: Error "Password must be at least 8 characters"
```

**TC4: Password Mismatch**
```
Email: test@example.com
Password: Test123!@#
Confirm Password: Test456!@#

Expected: Error "Passwords do not match"
```

**TC5: Missing Special Character**
```
Email: test@example.com
Password: Test1234
Confirm Password: Test1234

Expected: Error "Password must contain uppercase, lowercase, number, and special character"
```

**TC6: Duplicate Email**
```
Email: existing@example.com (already registered)
Password: Test123!@#
Confirm Password: Test123!@#

Expected: Error from backend about duplicate email
```

### 2. Login Flow

#### Access
Navigate to: http://localhost:4200/auth/login

#### Test Cases

**TC1: Valid Login**
```
Email: test@example.com
Password: Test123!@#
Remember Me: checked

Expected: Success, redirect to /dashboard
```

**TC2: Invalid Credentials**
```
Email: test@example.com
Password: WrongPassword123!

Expected: Error "Invalid email or password"
```

**TC3: Backend Not Running**
```
Stop backend server
Try to login

Expected: Error "Unable to connect to server. Please check your connection."
```

### 3. Navigation

#### Test Cases

**TC1: Signup to Login Link**
```
1. Go to /auth/signup
2. Click "Login" link at bottom

Expected: Navigate to /auth/login
```

**TC2: Login to Signup Link**
```
1. Go to /auth/login
2. Click "Sign up" link at bottom

Expected: Navigate to /auth/signup
```

**TC3: Protected Route Without Auth**
```
1. Clear localStorage
2. Navigate to /dashboard

Expected: Redirect to /auth/login
```

### 4. Form Validation

#### Test Cases

**TC1: Real-time Validation**
```
1. Focus on email field
2. Type invalid email
3. Blur field

Expected: Error message appears immediately
```

**TC2: Submit with Empty Fields**
```
1. Leave all fields empty
2. Click submit button

Expected: All fields show "required" errors
```

**TC3: Password Strength Indicator**
```
1. Type password character by character
2. Observe validation messages

Expected: Specific error for each missing requirement
```

### 5. Security Features

#### Test Cases

**TC1: XSS Prevention**
```
Email: <script>alert('xss')</script>@test.com
Password: Test123!@#

Expected: Script tags are sanitized, no alert appears
```

**TC2: Token Storage**
```
1. Complete successful signup
2. Open browser DevTools → Application → Local Storage
3. Check for access_token and refresh_token

Expected: Tokens are stored
```

**TC3: CSRF Token**
```
1. Complete successful signup
2. Check localStorage for csrf_token

Expected: CSRF token is generated
```

## Browser Console Checks

### Check Form State
```javascript
// Get signup component
const component = angular.getComponent(document.querySelector('app-signup'));

// Check if form is valid
console.log('Form valid:', component.signupForm.valid);

// Check form values
console.log('Form values:', component.signupForm.value);

// Check form errors
console.log('Form errors:', component.signupForm.errors);

// Check individual field errors
console.log('Email errors:', component.email?.errors);
console.log('Password errors:', component.password?.errors);
```

### Check Network Requests
1. Open DevTools → Network tab
2. Submit signup form
3. Look for POST request to http://localhost:8000/api/v1/auth/signup
4. Check request payload and response

### Check for JavaScript Errors
1. Open DevTools → Console tab
2. Look for any red error messages
3. Common issues:
   - Module not found
   - Component not defined
   - HTTP errors

## API Testing

### Direct API Calls

**Signup**
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

**Login**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

**Health Check**
```bash
curl http://localhost:8000/health
```

## Troubleshooting

### Signup Button Not Responding

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check Network tab for failed requests

2. **Check Form Validity**
   ```javascript
   angular.getComponent(document.querySelector('app-signup')).signupForm.valid
   ```

3. **Check Backend**
   ```bash
   curl http://localhost:8000/health
   ```

4. **Check Network**
   - Open DevTools → Network tab
   - Try submitting form
   - Look for POST request to /api/v1/auth/signup

### Backend Connection Issues

1. **Verify Backend is Running**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check Backend Logs**
   - Look at terminal where backend is running
   - Check for error messages

3. **Restart Backend**
   ```bash
   cd backend
   .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Database Issues

1. **Check PostgreSQL Container**
   ```bash
   docker ps
   ```

2. **Check Database Logs**
   ```bash
   docker logs veraproof-postgres
   ```

3. **Restart Database**
   ```bash
   docker restart veraproof-postgres
   ```

## Performance Testing

### Load Time
1. Open DevTools → Network tab
2. Reload page
3. Check:
   - DOMContentLoaded: Should be < 1s
   - Load: Should be < 3s
   - Bundle size: ~236 KB

### Form Responsiveness
1. Type in form fields
2. Check for lag or delays
3. Expected: Instant feedback

### API Response Time
1. Submit form
2. Check Network tab
3. Expected: < 500ms response time

## Accessibility Testing

### Keyboard Navigation
1. Use Tab key to navigate through form
2. Use Enter to submit
3. Expected: All fields accessible via keyboard

### Screen Reader
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate through form
3. Expected: All labels and errors announced

### Color Contrast
1. Check error messages are readable
2. Check button text is readable
3. Expected: WCAG AA compliance

## Mobile Testing

### Responsive Design
1. Open DevTools → Device Toolbar
2. Test on different screen sizes:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)

### Touch Interactions
1. Test on actual mobile device
2. Check:
   - Form fields are tappable
   - Button is large enough
   - No horizontal scrolling

## Automated Testing

### Unit Tests
```bash
cd partner-dashboard
npm test
```

### E2E Tests
```bash
cd partner-dashboard
npm run test:e2e
```

## Success Criteria

### Signup Flow
- ✅ Form validates correctly
- ✅ Button is responsive
- ✅ API call succeeds
- ✅ Tokens are stored
- ✅ User is redirected to dashboard
- ✅ No console errors

### Login Flow
- ✅ Form validates correctly
- ✅ Button is responsive
- ✅ API call succeeds
- ✅ Tokens are stored
- ✅ User is redirected to dashboard
- ✅ Remember me works

### Security
- ✅ XSS prevention works
- ✅ CSRF token generated
- ✅ Passwords not logged
- ✅ Tokens stored securely

## Reporting Issues

When reporting issues, include:
1. Browser and version
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Console errors (if any)
6. Network errors (if any)
7. Screenshots

---

**Last Updated**: 2026-02-18
**Status**: Ready for Testing
