# Deployment Guide

This guide covers deploying Analytics OS to popular cloud platforms.

## 🚀 Quick Deploy Options

| Platform | Best For | Difficulty | Free Tier |
|----------|----------|------------|-----------|
| **Railway** | Full stack with one click | ⭐ Easy | 500 hrs/month |
| **Render** | Separate services | ⭐⭐ Medium | 750 hrs/month |
| **Vercel + Railway** | Fast frontend | ⭐⭐ Medium | Yes (both) |
| **Docker** | Self-hosted | ⭐⭐⭐ Advanced | N/A |

---

## 1️⃣ Railway (Recommended - Easiest)

Railway offers the simplest deployment with automatic service discovery.

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository

### Step-by-Step

1. **Create New Project**
   - Go to Railway dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize and select your repository

2. **Deploy Backend**
   - Railway auto-detects the backend service
   - Add environment variables:
     ```
     MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics_db
     ADMIN_PASSWORD=your-secure-password
     NODE_ENV=production
     PORT=4000
     ```
   - Railway provides: `https://analytics-backend-xxx.railway.app`

3. **Deploy Frontend**
   - Click "New Service" → "GitHub Repo"
   - Select same repo, choose frontend folder
   - Add environment variable:
     ```
     VITE_API_URL=https://analytics-backend-xxx.railway.app/api
     ```
   - Railway provides: `https://analytics-frontend-xxx.railway.app`

4. **Update Backend CORS**
   - Go back to backend service
   - Add/update environment variable:
     ```
     ALLOWED_ORIGINS=https://analytics-frontend-xxx.railway.app
     ```
   - Redeploy backend

5. **Setup MongoDB**
   
   **Option A: MongoDB Atlas (Recommended)**
   - Create free cluster at https://cloud.mongodb.com
   - Get connection string
   - Update backend `MONGODB_URI`

   **Option B: Railway MongoDB**
   - Click "New" → "Database" → "MongoDB"
   - Railway auto-connects via private network
   - Use provided `MONGO_URL` variable

### Testing
```bash
# Check backend
curl https://analytics-backend-xxx.railway.app/health

# Check frontend
open https://analytics-frontend-xxx.railway.app
```

### Custom Domain
- Settings → Networking → Generate Domain
- Or add your custom domain

---

## 2️⃣ Render

Render provides generous free tier with auto-sleep after 15 mins of inactivity.

### Step-by-Step

1. **Deploy Backend (Web Service)**
   
   - New → Web Service
   - Connect GitHub repository
   - Configure:
     ```
     Name: analytics-backend
     Root Directory: backend
     Environment: Node
     Build Command: npm install && npm run build
     Start Command: npm start
     ```
   
   - Environment Variables:
     ```
     NODE_ENV=production
     PORT=4000
     MONGODB_URI=mongodb+srv://...
     ADMIN_PASSWORD=secure-password
     ALLOWED_ORIGINS=https://analytics-frontend.onrender.com
     ```
   
   - Deploy and note URL: `https://analytics-backend.onrender.com`

2. **Deploy Frontend (Static Site)**
   
   - New → Static Site
   - Connect GitHub repository
   - Configure:
     ```
     Name: analytics-frontend
     Root Directory: frontend
     Build Command: npm install && npm run build
     Publish Directory: dist
     ```
   
   - Environment Variables:
     ```
     VITE_API_URL=https://analytics-backend.onrender.com/api
     ```

3. **Update Backend CORS**
   - Go to backend service
   - Update `ALLOWED_ORIGINS`:
     ```
     ALLOWED_ORIGINS=https://analytics-frontend.onrender.com
     ```

### Testing
```bash
curl https://analytics-backend.onrender.com/health
```

### Important Notes
- Free tier sleeps after 15 mins → first request takes ~30s
- Consider paid tier ($7/month) for production
- MongoDB: Use Atlas (Render doesn't offer managed MongoDB)

---

## 3️⃣ Vercel (Frontend) + Railway (Backend)

Optimal for performance: Vercel's edge network for frontend, Railway for backend.

### Step-by-Step

1. **Deploy Backend to Railway**
   - Follow Railway steps above
   - Note backend URL: `https://analytics-backend-xxx.railway.app`

2. **Deploy Frontend to Vercel**
   
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Navigate to frontend
   cd frontend
   
   # Login
   vercel login
   
   # Set environment variable
   vercel env add VITE_API_URL production
   # Paste: https://analytics-backend-xxx.railway.app/api
   
   # Deploy
   vercel --prod
   ```
   
   - Vercel provides: `https://analytics-app-xxx.vercel.app`

3. **Update Backend CORS**
   - Railway backend → Environment Variables
   - Update:
     ```
     ALLOWED_ORIGINS=https://analytics-app-xxx.vercel.app
     ```

### Custom Domain on Vercel
- Project Settings → Domains
- Add your domain and configure DNS

---

## 4️⃣ Docker (Self-Hosted)

Deploy to your own VPS (DigitalOcean, AWS, Linode, etc.)

### Prerequisites
- Server with Docker and Docker Compose
- Domain name pointed to server IP
- SSH access

### Step-by-Step

1. **Prepare Server**
   ```bash
   # SSH into server
   ssh user@your-server-ip
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose
   sudo apt-get install docker-compose-plugin
   ```

2. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/analytics-app.git
   cd analytics-app
   ```

3. **Configure Environment**
   ```bash
   # Copy example env
   cp .env.example .env
   
   # Edit with your values
   nano .env
   ```
   
   Update:
   ```env
   ADMIN_PASSWORD=your-secure-password
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

4. **Build and Start**
   ```bash
   docker-compose up -d --build
   ```

5. **Setup Nginx Reverse Proxy + SSL**
   
   ```bash
   # Install Nginx
   sudo apt install nginx certbot python3-certbot-nginx
   
   # Create config
   sudo nano /etc/nginx/sites-available/analytics
   ```
   
   Paste:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api/ {
           proxy_pass http://localhost:4000/api/;
           proxy_set_header Host $host;
       }
       
       location /socket.io/ {
           proxy_pass http://localhost:4000/socket.io/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```
   
   Enable and get SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/analytics /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

6. **Verify**
   ```bash
   curl https://yourdomain.com/health
   ```

### Maintenance

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update code
git pull
docker-compose up -d --build

# Backup MongoDB
docker exec analytics-mongodb mongodump --out /tmp/backup
docker cp analytics-mongodb:/tmp/backup ./backup-$(date +%Y%m%d)
```

---

## 5️⃣ AWS (Advanced)

Using AWS Elastic Beanstalk + RDS + S3.

### Architecture
- **Elastic Beanstalk**: Backend API
- **S3 + CloudFront**: Frontend static site
- **DocumentDB**: MongoDB-compatible database
- **Certificate Manager**: SSL certificates

### Step-by-Step

1. **Setup DocumentDB**
   - AWS Console → DocumentDB
   - Create cluster (smallest instance: db.t3.medium)
   - Note connection string

2. **Deploy Backend to Elastic Beanstalk**
   
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize
   cd backend
   eb init -p node.js-20 analytics-backend
   
   # Create environment
   eb create production
   
   # Set environment variables
   eb setenv \
     NODE_ENV=production \
     MONGODB_URI="mongodb://user:pass@cluster.docdb.amazonaws.com:27017/analytics?ssl=true" \
     ADMIN_PASSWORD="secure-password" \
     ALLOWED_ORIGINS="https://yourdomain.com"
   
   # Deploy
   eb deploy
   ```

3. **Deploy Frontend to S3 + CloudFront**
   
   ```bash
   cd frontend
   
   # Build
   VITE_API_URL=https://api.yourdomain.com/api npm run build
   
   # Create S3 bucket
   aws s3 mb s3://analytics-frontend
   
   # Upload files
   aws s3 sync dist/ s3://analytics-frontend --delete
   
   # Enable static website hosting
   aws s3 website s3://analytics-frontend --index-document index.html
   
   # Create CloudFront distribution (via console)
   # Point to S3 bucket
   # Add custom domain
   # Enable HTTPS via Certificate Manager
   ```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change `ADMIN_PASSWORD` from default
- [ ] Use HTTPS for both frontend and backend
- [ ] Set proper `ALLOWED_ORIGINS` (not `*`)
- [ ] Use environment variables (never commit secrets)
- [ ] Enable MongoDB authentication
- [ ] Use strong MongoDB password
- [ ] Set up firewall rules (only expose necessary ports)
- [ ] Enable rate limiting (already configured)
- [ ] Review Nginx security headers
- [ ] Set up monitoring and alerts
- [ ] Configure automatic backups

---

## 📊 Post-Deployment

### Seed Initial Data

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  https://your-backend-url.com/api/seed
```

### Monitor Health

```bash
# Backend
curl https://your-backend-url.com/health

# Check logs (Railway/Render via dashboard)
# Docker: docker-compose logs -f
```

### Test Tracking

Add to test page:
```html
<script src="https://your-backend-url.com/tracker.js" 
        data-project-id="your_project_id"></script>
```

---

## 🆘 Common Issues

### Issue: CORS errors
**Solution:** Update `ALLOWED_ORIGINS` with exact frontend URL (including protocol)

### Issue: 502 Bad Gateway
**Solution:** Backend failed to start. Check logs and MongoDB connection.

### Issue: Frontend shows but API fails
**Solution:** Verify `VITE_API_URL` is correct and backend is accessible.

### Issue: Mixed content errors (HTTPS/HTTP)
**Solution:** Both frontend and backend must use same protocol (preferably HTTPS).

### Issue: WebSocket connection fails
**Solution:** Ensure proxy supports WebSocket upgrade headers.

---

## 📝 Environment Variables Reference

### Backend
```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics_db
ADMIN_PASSWORD=secure-password-here
ALLOWED_ORIGINS=https://frontend.com,https://www.frontend.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### Frontend
```env
VITE_API_URL=https://backend-url.com/api
```

---

## 🎯 Recommended Setup

**For Development/Testing:**
- Docker Compose (easiest)

**For Production (Low Traffic):**
- Railway (both services) - $5-10/month
- Render Free Tier - $0 (with sleep)

**For Production (High Traffic):**
- Vercel (frontend) + Railway (backend) - $10-20/month
- AWS (Elastic Beanstalk + S3 + DocumentDB) - $30-100/month

**For Enterprise:**
- Self-hosted Docker on dedicated servers
- Kubernetes cluster
- Managed MongoDB (Atlas)

---

Choose the platform that best fits your needs and budget. Railway is recommended for the easiest setup with good performance.
