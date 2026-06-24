# Vercel + Railway Deployment Guide

Complete step-by-step guide for deploying Analytics OS with **Vercel (Frontend)** and **Railway (Backend)**.

---

## 🎯 Overview

- **Backend (Railway)**: API server + MongoDB
- **Frontend (Vercel)**: Dashboard UI

**Estimated Time**: 15-20 minutes  
**Cost**: Free tier available for both

---

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repository

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `analytics-app` repository
4. Railway will detect the backend service

### Step 3: Configure Backend Service

Railway should auto-detect the Node.js backend. Configure:

1. **Root Directory**: Set to `backend`
   - Settings → Service → Root Directory → `backend`

2. **Build Command** (if needed):
   ```bash
   npm install && npm run build
   ```

3. **Start Command** (if needed):
   ```bash
   npm start
   ```

### Step 4: Add Environment Variables

Go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=4000
ADMIN_PASSWORD=your-secure-password-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/analytics_db?retryWrites=true&w=majority
ALLOWED_ORIGINS=placeholder-will-update-after-vercel
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

**Important Notes:**
- Replace `ADMIN_PASSWORD` with a strong password
- We'll update `ALLOWED_ORIGINS` after deploying frontend
- For `MONGODB_URI`, see Step 5

### Step 5: Setup MongoDB

**Option A: MongoDB Atlas (Recommended - Free Tier)**

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account and cluster
3. Choose **Shared (Free)** tier
4. Select **AWS** and closest region
5. Create cluster (takes 3-5 minutes)
6. **Security Setup**:
   - Database Access → Add New User
   - Username: `analyticsUser`
   - Password: Generate secure password (save it!)
   - Database User Privileges: `Read and write to any database`
7. **Network Access**:
   - Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
   - This is safe because we have username/password auth
8. **Get Connection String**:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your actual password
   - Paste the connection string into `MONGODB_URI` as an environment variable.
   - Do not commit a real connection string or password into this guide.

**Option B: Railway MongoDB Plugin (Easier but paid after trial)**

1. In Railway project → **New** → **Database** → **MongoDB**
2. Railway auto-generates `MONGO_URL` variable
3. Copy the connection string to `MONGODB_URI`

### Step 6: Deploy Backend

1. Click **Deploy** (or it deploys automatically)
2. Wait for build to complete (2-3 minutes)
3. Check deployment logs for errors

### Step 7: Get Backend URL

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Railway provides: `https://analytics-backend-production-xxxx.up.railway.app`
4. **Copy this URL** - you'll need it for Vercel

### Step 8: Test Backend

```bash
# Replace with your actual Railway URL
curl https://analytics-backend-production-xxxx.up.railway.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-06-24T..."}
```

✅ If you see the health response, backend is working!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your `analytics-app` repository
3. **Framework Preset**: Vite
4. **Root Directory**: Click **"Edit"** → Set to `frontend`

### Step 3: Configure Build Settings

Vercel auto-detects Vite. Verify:

- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Add Environment Variable

**CRITICAL STEP** - Add before deploying:

1. Click **"Environment Variables"**
2. Add variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://analytics-backend-production-xxxx.up.railway.app/api`
   - (Use your Railway backend URL from Part 1, Step 7 - **must include /api at the end**)
   - **Environment**: All (Production, Preview, Development)

**Example**:
```
VITE_API_URL=https://analytics-backend-production-abcd.up.railway.app/api
```

**⚠️ Important**: 
- Must end with `/api`
- Must be `https://` (not `http://`)
- Must be your actual Railway URL

### Step 5: Deploy Frontend

1. Click **"Deploy"**
2. Vercel builds and deploys (2-3 minutes)
3. You'll get a URL like: `https://analytics-app-xxxx.vercel.app`

### Step 6: Test Frontend

1. Visit your Vercel URL: `https://analytics-app-xxxx.vercel.app`
2. You should see the dashboard
3. Open browser console (F12) and check for errors

---

## Part 3: Connect Frontend & Backend (CORS)

### Step 1: Update Backend CORS

1. Go back to **Railway** → Your backend project
2. Go to **Variables** tab
3. Find `ALLOWED_ORIGINS` variable
4. Update to your Vercel URL:
   ```
   ALLOWED_ORIGINS=https://analytics-app-xxxx.vercel.app
   ```
5. If you have multiple domains (with/without www):
   ```
   ALLOWED_ORIGINS=https://analytics-app-xxxx.vercel.app,https://yourdomain.com,https://www.yourdomain.com
   ```

### Step 2: Redeploy Backend

Railway should auto-redeploy when you change variables. If not:
- Go to **Deployments** tab
- Click **"Redeploy"** on latest deployment

### Step 3: Test CORS

```bash
# Replace with your actual URLs
curl -H "Origin: https://analytics-app-xxxx.vercel.app" \
     -H "Authorization: Bearer your-password" \
     https://analytics-backend-production-xxxx.up.railway.app/api/sessions?limit=1

# Should return session data, not CORS error
```

---

## Part 4: Seed Sample Data

### Option 1: Using cURL

```bash
curl -X POST \
  -H "Authorization: Bearer your-password" \
  https://analytics-backend-production-xxxx.up.railway.app/api/seed

# Response:
# {"success":true,"message":"Database seeded with 15 sessions","counts":{...}}
```

### Option 2: Using Browser Console

1. Open your Vercel frontend: `https://analytics-app-xxxx.vercel.app`
2. Open browser console (F12)
3. Login with your `ADMIN_PASSWORD`
4. Run:
```javascript
fetch('https://analytics-backend-production-xxxx.up.railway.app/api/seed', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-password'
  }
})
.then(r => r.json())
.then(console.log)
```

---

## Part 5: Custom Domain (Optional)

### On Vercel (Frontend)

1. Go to your project → **Settings** → **Domains**
2. Add your domain (e.g., `analytics.yourdomain.com`)
3. Follow DNS setup instructions:
   - Add CNAME record: `analytics` → `cname.vercel-dns.com`
4. Wait for DNS propagation (5-30 minutes)
5. Vercel auto-provisions SSL certificate

### On Railway (Backend)

1. Go to backend service → **Settings** → **Networking**
2. Click **"Custom Domain"**
3. Add subdomain (e.g., `api.yourdomain.com`)
4. Add DNS records as shown:
   - CNAME: `api` → `your-project.up.railway.app`

### Update CORS After Custom Domains

Railway Variables:
```env
ALLOWED_ORIGINS=https://analytics.yourdomain.com,https://www.yourdomain.com
```

Vercel Environment Variable:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

Redeploy both services.

---

## 🧪 Complete Testing Checklist

### 1. Backend Health
```bash
curl https://your-railway-backend.up.railway.app/health
# ✅ Should return: {"status":"ok",...}
```

### 2. Frontend Loads
- ✅ Visit Vercel URL, dashboard appears
- ✅ No blank screen or errors

### 3. API Connection
- ✅ Open browser console (F12)
- ✅ Login with your password
- ✅ Check Network tab for successful API calls
- ✅ Overview page shows data (after seeding)

### 4. Check Environment Variables
```javascript
// In browser console on your Vercel frontend
console.log(import.meta.env.VITE_API_URL);
// Should show: https://your-railway-backend.up.railway.app/api
```

### 5. Test Tracking
Add to a test page:
```html
<script src="https://your-railway-backend.up.railway.app/tracker.js" 
        data-project-id="test_project"></script>

<button onclick="console.log('clicked')">Test Button</button>

<script>
// Test custom event
window.AnalyticsOS.track('test_event', { source: 'manual_test' });
</script>
```

Open Network tab, should see POST to `/api/events` after 5 seconds or page close.

### 6. Live Features (WebSocket)
- ✅ Real-time session updates on Overview page
- ✅ Live session replay working

---

## 🐛 Troubleshooting

### Issue: Frontend shows blank screen

**Check browser console:**
```javascript
// Look for CORS errors
// Look for failed fetch requests
```

**Common causes:**
1. `VITE_API_URL` not set or wrong
2. Backend URL missing `/api` at the end
3. CORS not configured

**Fix:**
- Verify Vercel environment variable: Settings → Environment Variables
- Redeploy frontend after adding variable

### Issue: "Failed to fetch" or CORS errors

**Symptoms:**
```
Access to fetch at 'https://backend...' from origin 'https://frontend...' 
has been blocked by CORS policy
```

**Fix:**
1. Check `ALLOWED_ORIGINS` in Railway includes exact Vercel URL
2. Make sure both use `https://` (not mixed http/https)
3. Redeploy backend after changing CORS

**Test CORS:**
```bash
curl -H "Origin: https://your-vercel-url.vercel.app" \
     https://your-railway-backend.up.railway.app/api/sessions?limit=1
```

### Issue: 502 Bad Gateway on backend

**Causes:**
- Backend failed to start
- MongoDB connection failed
- Port binding error

**Fix:**
1. Check Railway logs: Deployments → View Logs
2. Verify `MONGODB_URI` is correct
3. Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

### Issue: Environment variable not found

**Symptoms:**
```javascript
console.log(import.meta.env.VITE_API_URL);
// Shows: undefined
```

**Fix:**
1. Vercel → Settings → Environment Variables
2. Ensure variable name starts with `VITE_`
3. **Redeploy** after adding (important!)
   - Deployments → Latest → Click "..." → Redeploy

### Issue: MongoDB connection timeout

**Error in Railway logs:**
```
MongooseServerSelectionError: connection timed out
```

**Fix:**
1. MongoDB Atlas → Network Access
2. Add IP: `0.0.0.0/0` (allow from anywhere)
3. Verify username/password in connection string
4. Check connection string format:
   ```
   mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
   ```

### Issue: Railway backend sleeping/slow first request

**Symptom:** First request takes 30+ seconds

**Cause:** Railway free tier puts services to sleep after inactivity

**Solutions:**
- Upgrade to Hobby plan ($5/month for always-on)
- Accept first-request delay
- Keep service warm with cron job (ping /health every 10 mins)

---

## 💰 Cost Breakdown

### Free Tier (Perfect for testing)
- **Railway**: 500 execution hours/month, $5 credit
  - Backend typically uses ~720 hours/month if always on
  - With sleep (free tier), backend pauses after inactivity
- **Vercel**: Unlimited bandwidth for hobby projects
- **MongoDB Atlas**: 512 MB storage (enough for ~50k sessions)

**Total Free Tier**: $0/month (with limitations)

### Recommended Production Setup
- **Railway Hobby**: $5/month (always-on backend)
- **Vercel Pro**: $20/month (optional, better performance)
- **MongoDB Atlas M10**: $57/month (optional, better performance)

**Total Starter**: $5/month (Railway only)
**Total Production**: $82/month (all services upgraded)

---

## 📋 Quick Reference

### Railway Backend URL Format
```
https://analytics-backend-production-xxxx.up.railway.app
```

### Vercel Frontend URL Format
```
https://analytics-app-xxxx.vercel.app
```

### Environment Variables Summary

**Railway (Backend):**
```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics_db
ADMIN_PASSWORD=your-secure-password
ALLOWED_ORIGINS=https://analytics-app-xxxx.vercel.app
```

**Vercel (Frontend):**
```env
VITE_API_URL=https://analytics-backend-production-xxxx.up.railway.app/api
```

---

## ✅ Success Checklist

- [ ] Railway backend deployed and health check returns OK
- [ ] MongoDB Atlas cluster created and accessible
- [ ] Vercel frontend deployed successfully
- [ ] `VITE_API_URL` set correctly (with `/api` suffix)
- [ ] `ALLOWED_ORIGINS` includes Vercel URL
- [ ] Both services use HTTPS
- [ ] Browser console shows no CORS errors
- [ ] Sample data seeded
- [ ] Dashboard loads and shows data
- [ ] Tracking script accessible
- [ ] WebSocket connection working

---

## 🆘 Still Having Issues?

**Collect this info:**

1. **Railway Backend URL**: `https://your-backend.up.railway.app`
2. **Vercel Frontend URL**: `https://your-frontend.vercel.app`
3. **Browser Console Errors**: Screenshot or copy/paste
4. **Railway Logs**: Recent errors from deployment logs
5. **Network Tab**: Screenshot of failed requests

**Quick Debug:**
```javascript
// Run in browser console on Vercel frontend
console.log('API URL:', import.meta.env.VITE_API_URL);
console.log('Current origin:', window.location.origin);

// Test backend directly
fetch('https://your-railway-backend.up.railway.app/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

**Deployment should now be working! 🎉**

If you followed all steps and it's still not working, share the error messages and I'll help debug.
