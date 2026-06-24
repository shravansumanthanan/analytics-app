# Deployment Troubleshooting Guide

## 🔴 Common Issues: Localhost Works, Deployed Site Doesn't

### Issue 1: CORS / Allowed Origins Misconfiguration

**Symptom:** Frontend can't reach backend API, console shows CORS errors.

**Root Cause:** `ALLOWED_ORIGINS` in docker-compose.yml is set to `localhost`:
```yaml
ALLOWED_ORIGINS=http://localhost:80,http://localhost:5173
```

**Fix:** Update to your actual domain:

```yaml
# docker-compose.yml - backend service
environment:
  - ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**For Railway/Render/Vercel:**
```yaml
ALLOWED_ORIGINS=https://your-app.railway.app,https://your-app.onrender.com
```

---

### Issue 2: Backend Not Accessible (Network/Firewall)

**Symptom:** API requests timeout or return 502/503 errors.

**Diagnose:**
```bash
# Test if backend is reachable
curl https://your-backend-url.com/health

# Should return:
# {"status":"ok","timestamp":"..."}
```

**Common Causes:**

1. **Backend not deployed** or failed to start
2. **Port not exposed** in cloud platform settings
3. **Health check failing** causing auto-restart loop
4. **MongoDB connection failing** (check MONGODB_URI)

**Fix:**

**Check backend logs:**
```bash
# Docker
docker logs analytics-backend

# Railway/Render
# Check logs in platform dashboard
```

**Ensure MongoDB is accessible:**
```yaml
# Use cloud MongoDB (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/analytics_db
```

---

### Issue 3: Frontend Environment Variables Not Set

**Symptom:** Frontend uses hardcoded localhost URLs instead of production URLs.

**Root Cause:** Build-time environment variables not passed to frontend.

**Fix:**

Create `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend-url.com/api
```

**For Docker build:**
```dockerfile
# frontend/Dockerfile - Add before build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build with arg
RUN npm run build
```

**Build command:**
```bash
docker build --build-arg VITE_API_URL=https://api.yourdomain.com/api -t analytics-frontend ./frontend
```

**For Railway/Vercel:**
- Add `VITE_API_URL` in platform environment variables
- Must start with `VITE_` to be exposed to frontend

---

### Issue 4: Nginx Proxy Configuration Issues

**Symptom:** /api requests return 404 or timeout.

**Root Cause:** Nginx can't reach backend service.

**Fix for Docker Compose:**

The current config uses service name `backend:4000` which works in Docker network but needs adjustment for cloud:

```nginx
# frontend/nginx.conf
location /api/ {
    # For Docker Compose (current - correct)
    proxy_pass http://backend:4000/api/;
    
    # For separate deployments, use env variable
    # proxy_pass $BACKEND_URL/api/;
}
```

**For Separate Frontend/Backend Deployments:**

You'll need to use absolute URLs instead of Nginx proxy:

```typescript
// frontend/src/api/client.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:4000/api'
    : import.meta.env.VITE_API_URL || '/api'); // Use full URL
```

Set environment:
```env
VITE_API_URL=https://your-backend.railway.app/api
```

---

### Issue 5: WebSocket Connection Failures

**Symptom:** Real-time features don't work, session player doesn't update live.

**Root Cause:** WebSocket proxy not configured or blocked.

**Fix:**

**Update socket connection in frontend:**

```typescript
// frontend/src/api/socket.ts
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.hostname === 'localhost' 
    ? 'http://localhost:4000'
    : window.location.origin); // Use same origin

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'], // Fallback to polling
  path: '/socket.io/',
});
```

**Nginx config for WebSocket:**
```nginx
location /socket.io/ {
    proxy_pass http://backend:4000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # Important for WebSocket
    proxy_buffering off;
    proxy_read_timeout 86400;
}
```

---

### Issue 6: HTTPS/SSL Mixed Content Errors

**Symptom:** Site loads but API calls blocked with "Mixed Content" errors.

**Root Cause:** Frontend on HTTPS trying to call backend on HTTP.

**Fix:**

**Both frontend and backend MUST use HTTPS:**

```env
# Backend
ALLOWED_ORIGINS=https://yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com/api  # Must be https://
```

**For Railway/Render:** SSL is automatic, use `https://` URLs.

**For custom domains:** Set up SSL certificates (Let's Encrypt).

---

### Issue 7: Static Assets 404

**Symptom:** Dashboard loads but styling broken, white screen.

**Root Cause:** Assets not found at expected paths.

**Fix:**

**Check Vite base path:**

```typescript
// frontend/vite.config.ts
export default defineConfig({
  base: '/', // Ensure this matches your deployment path
  // If deploying to subdirectory: base: '/analytics/'
})
```

**Rebuild after changing base:**
```bash
cd frontend
npm run build
```

---

## 🛠️ Deployment Checklists

### Docker Compose Deployment

```bash
# 1. Update environment variables
vim docker-compose.yml
# Change ALLOWED_ORIGINS to your domain
# Change ADMIN_PASSWORD to secure password

# 2. Build and start
docker-compose up -d --build

# 3. Check logs
docker-compose logs -f

# 4. Verify health
curl http://localhost/health  # Frontend
curl http://localhost:4000/health  # Backend

# 5. Seed data (optional)
curl -X POST -H "Authorization: Bearer YOUR_PASSWORD" http://localhost:4000/api/seed
```

---

### Railway Deployment

**Backend Setup:**

1. Create new project → Deploy from GitHub
2. Select `backend` folder as root directory
3. Add environment variables:
   ```
   MONGODB_URI=mongodb+srv://...
   ADMIN_PASSWORD=your-secure-password
   ALLOWED_ORIGINS=https://your-frontend.railway.app
   NODE_ENV=production
   PORT=4000
   ```
4. Deploy and note the URL: `https://analytics-backend-xxx.railway.app`

**Frontend Setup:**

1. Create new service → Deploy from GitHub
2. Select `frontend` folder as root directory
3. Add environment variables:
   ```
   VITE_API_URL=https://analytics-backend-xxx.railway.app/api
   VITE_SOCKET_URL=https://analytics-backend-xxx.railway.app
   ```
4. Deploy and note URL: `https://analytics-frontend-xxx.railway.app`

**Update Backend CORS:**
Go back to backend, update `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://analytics-frontend-xxx.railway.app
```

---

### Vercel/Netlify (Frontend Only)

**Prerequisites:** Backend must be deployed separately (Railway, Render, etc.)

**Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

cd frontend

# Set environment variable
vercel env add VITE_API_URL production
# Enter: https://your-backend-url.com/api

# Deploy
vercel --prod
```

**Netlify:**

```bash
# Install Netlify CLI
npm i -g netlify-cli

cd frontend

# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment in Netlify dashboard:
# VITE_API_URL = https://your-backend-url.com/api
```

---

### Render Deployment

**Backend (Web Service):**

1. New Web Service → Connect GitHub repo
2. Settings:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://...
   ADMIN_PASSWORD=secure-password
   ALLOWED_ORIGINS=https://analytics-frontend.onrender.com
   NODE_ENV=production
   ```

**Frontend (Static Site):**

1. New Static Site → Connect GitHub repo
2. Settings:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
3. Environment Variables:
   ```
   VITE_API_URL=https://analytics-backend.onrender.com/api
   ```

---

## 🧪 Testing Deployed Site

### 1. Backend Health Check

```bash
curl https://your-backend-url.com/health

# Expected:
# {"status":"ok","timestamp":"2026-06-24T..."}
```

### 2. CORS Test

```bash
curl -H "Origin: https://your-frontend-url.com" \
     -H "Authorization: Bearer YOUR_PASSWORD" \
     https://your-backend-url.com/api/sessions?limit=1

# Should return sessions data, not CORS error
```

### 3. Frontend API Connection

Open browser console on your deployed frontend:
```javascript
// Check API URL
console.log(import.meta.env.VITE_API_URL);

// Test fetch
fetch(window.API_BASE_URL + '/sessions?limit=1', {
  headers: { 'Authorization': 'Bearer YOUR_PASSWORD' }
})
.then(r => r.json())
.then(console.log)
```

### 4. WebSocket Connection

```javascript
// In browser console
const socket = io('https://your-backend-url.com');
socket.on('connect', () => console.log('✅ Connected'));
socket.on('connect_error', (err) => console.error('❌ Error:', err));
```

### 5. Tracker Script

On a test page:
```html
<script src="https://your-backend-url.com/tracker.js" 
        data-project-id="test_project"></script>

<script>
// Test tracking
window.AnalyticsOS.track('test_event', { test: true });

// Check network tab - should see POST to /api/events
</script>
```

---

## 🐛 Debug Checklist

If still not working, check each:

- [ ] Backend health endpoint returns 200 OK
- [ ] MongoDB connection successful (check backend logs)
- [ ] ALLOWED_ORIGINS includes your frontend domain
- [ ] Frontend VITE_API_URL points to correct backend
- [ ] Both frontend and backend use HTTPS (or both HTTP)
- [ ] Nginx proxy config correct (if using Docker)
- [ ] WebSocket configuration allows upgrades
- [ ] CORS preflight requests succeed (OPTIONS)
- [ ] API authentication working (test with curl)
- [ ] Browser console shows no CORS/network errors
- [ ] Network tab shows requests going to correct URLs

---

## 📝 Quick Fix Template

Most deployment issues are one of these:

```env
# Backend .env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics_db
ADMIN_PASSWORD=your-secure-password-here
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://www.your-frontend-domain.com

# Frontend .env.production
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

**Common mistake:** Using `http://` when deployed site uses `https://`

**Test locally first:**
```bash
# Build frontend with production env
cd frontend
VITE_API_URL=https://your-backend.com/api npm run build

# Serve locally
npx serve dist

# Test at http://localhost:3000
```

---

## 🆘 Still Not Working?

**Collect this information:**

1. **Deployment platform:** Railway / Render / Vercel / Docker / Other
2. **Error messages:** From browser console and backend logs
3. **Backend URL:** Share the health endpoint URL
4. **Frontend URL:** Share the deployed site URL
5. **Network tab:** Screenshot of failed requests

**Common solutions:**

- 90% of issues: CORS / Environment variables
- 5% of issues: MongoDB connection
- 5% of issues: Build configuration

**Test in order:**
1. Backend health → Backend logs → MongoDB connection
2. Frontend build → Environment variables → API calls
3. CORS → Network requests → Console errors

---

**Need help?** Share the collected information and specific error messages for targeted assistance.
