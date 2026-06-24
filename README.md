# Analytics OS

> A production-ready, full-stack web analytics platform featuring real-time session tracking, interactive heatmaps, funnel analysis, and session replay capabilities.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green.svg)](https://www.mongodb.com/)

---

## 📋 Project Brief

### Overview

**Analytics OS** is a comprehensive, self-hosted analytics platform designed to provide deep insights into user behavior without compromising data privacy or requiring third-party services. Built with modern web technologies, it combines lightweight client-side tracking with a robust backend infrastructure and an intuitive visualization dashboard.

### Key Features

#### 🎯 **Comprehensive Tracking**
- **Session Management**: Automatic visitor identification and session lifecycle tracking
- **Event Capture**: Page views, clicks, scrolls, form interactions, and custom events
- **Behavioral Signals**: Rage clicks, dead clicks, quickback detection, excessive scrolling
- **Error Monitoring**: JavaScript errors and unhandled promise rejections
- **Geographic Data**: Country, region, and city-level tracking via IP geolocation
- **UTM Campaign Tracking**: Source, medium, and campaign attribution
- **Device Detection**: Browser, OS, and device type classification
- **Bot Filtering**: Intelligent bot detection to ensure data quality

#### 📊 **Visualization Dashboard**
- **Overview Analytics**: Real-time metrics with 7-day trend charts
- **Session Explorer**: Detailed user journey analysis with timeline views
- **Interactive Heatmaps**: 
  - Click density visualization with thermal gradients
  - Element-level engagement overlays (Area Maps)
  - Scroll attention mapping with viewport fold markers
- **Funnel Analysis**: Multi-step conversion tracking with drop-off visualization
- **Session Replay**: rrweb-powered DOM recording and playback
- **Event Timeline**: Filterable event stream with search capabilities

#### 🔍 **Advanced Analytics**
- **Conversion Attribution**: Filter heatmaps by converted users
- **Goal Configuration**: Path-based or event-based conversion goals
- **Frustration Detection**: Identify user pain points with rage/dead click analysis
- **Geographic Distribution**: World map visualization with country-level metrics
- **Device & Browser Analytics**: Platform distribution insights
- **UTM Performance**: Campaign effectiveness tracking
- **Real-time Monitoring**: Live session tracking with WebSocket updates

#### 🛡️ **Privacy & Security**
- **GDPR Compliant**: Consent management and DNT (Do Not Track) respect
- **Data Masking**: Automatic PII protection for sensitive inputs
- **Self-Hosted**: Complete data ownership and control
- **Secure Authentication**: Password-protected dashboard access
- **API Key Protection**: Optional authentication for event ingestion

### Technical Stack

**Frontend:**
- React 18 with TypeScript
- Vite for blazing-fast builds
- TanStack Router for type-safe routing
- SWR for data fetching and caching
- Recharts for data visualization
- Socket.IO client for real-time updates
- Tailwind CSS for styling

**Backend:**
- Node.js with Express
- TypeScript for type safety
- MongoDB with Mongoose ODM
- Zod for runtime validation
- Socket.IO for WebSocket communication
- Layered architecture (Controller → Service → Repository → Model)

**Tracking:**
- Vanilla JavaScript (zero dependencies)
- IIFE pattern for global scope isolation
- Batch processing with configurable flush intervals
- Resilient retry logic with exponential backoff
- rrweb for session recording

### Architecture Highlights

**Clean Architecture:**
```
Controllers (HTTP boundary)
    ↓
Services (Business logic)
    ↓
Repositories (Data access)
    ↓
Models (MongoDB schemas)
```

**Separation of Concerns:**
- API validation via middleware (Zod schemas)
- Authentication/authorization as middleware
- Error handling with global error middleware
- Type safety enforced throughout the stack

**Performance Optimizations:**
- Event batching reduces network overhead
- MongoDB indexes for fast queries
- Canvas-based heatmap rendering
- Efficient aggregation pipelines
- Client-side data caching with SWR

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20 or higher
- **MongoDB** 7.0+ running locally or via Docker
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/analytics-app.git
cd analytics-app
```

2. **Install all dependencies:**
```bash
npm run install:all
```

3. **Configure environment variables:**

Create `backend/.env`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/analytics_db
NODE_ENV=development
ADMIN_PASSWORD=your-secure-password
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

4. **Start MongoDB** (if not already running):
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or using installed MongoDB
mongod --dbpath /path/to/data/directory
```

5. **Start the full stack:**
```bash
npm run dev
```

This starts:
- **Backend API** on `http://localhost:4000`
- **Frontend Dashboard** on `http://localhost:5173`
- **Demo Site** on `http://localhost:3001`

### First-Time Setup

**Seed Sample Data** (for immediate testing):
```bash
curl -X POST \
  -H "Authorization: Bearer your-secure-password" \
  http://localhost:4000/api/seed
```

This creates 15 sample sessions with realistic user journeys, clicks, and scroll data.

---

## 📖 Demo Guide

### Step 1: Generate Tracking Data

**Option A: Use the Demo Site** (Instant)
1. Navigate to `http://localhost:3001/`
2. Click buttons, scroll pages, navigate between sections
3. Interactions are automatically tracked and batched
4. Events flush every 5 seconds or on page unload

**Option B: Use Seed Data** (Pre-populated)
```bash
curl -X POST \
  -H "Authorization: Bearer your-secure-password" \
  http://localhost:4000/api/seed
```

### Step 2: Explore the Dashboard

Open `http://localhost:5173/` and log in with your `ADMIN_PASSWORD`.

#### 📊 **Overview Page**

The landing page shows aggregate metrics:

**Key Metrics (Top Cards):**
- **Total Sessions**: All tracked sessions
- **Total Events**: All captured interactions
- **Avg Session Duration**: Mean time spent per session
- **Bounce Rate**: % of single-page sessions

**7-Day Trend Charts:**
- Sessions over time (line chart)
- Events distribution by type (bar chart)
- Geographic distribution (world map)
- Top pages by traffic (table)

**Device & Platform Analytics:**
- Browser distribution (pie chart)
- Device type breakdown (desktop/mobile/tablet)

**UTM Campaign Performance:**
- Traffic sources ranked by session count

#### 🔍 **Sessions Page**

Detailed session explorer with filterable table:

**Columns:**
- Session ID (clickable for details)
- Device type & country flag
- Duration & event count
- Frustration signals (rage clicks, dead clicks)
- First seen timestamp
- Bounce indicator

**Filters:**
- Date range picker
- Device type (desktop/mobile/tablet)
- Country selector
- Bounce status

**Session Detail View:**
- Complete event timeline
- Session metadata (user agent, location, UTM params)
- Frustration signals highlighted
- Session replay player (if recording available)

#### 🎨 **Heatmaps Page**

Interactive visualization of user interactions:

**1. Click Heatmap Mode:**
- Thermal density visualization
- Red (high density, 3+ clicks)
- Yellow (medium, 2 clicks)
- Blue (low, 1 click)
- Hover to see click counts and selectors

**2. Area Maps Mode:**
- Element-level engagement overlays
- Colored boxes on clickable elements
- Percentage distribution labels
- Aggregated by CSS selector

**3. Scroll Attention Mode:**
- Linear gradient showing viewport time
- Color intensity = engagement level
- Fold markers at 25%, 50%, 75%
- Identifies high-attention content areas

**Controls:**
- **Target Path**: Select which page to analyze
- **User Session**: Filter to specific session (or all)
- **Goal Filters**: Show only converted users
  - Path-based (e.g., `/success` page)
  - Event-based (e.g., `subscribe` event)

**How to Use:**
1. Select a URL from the dropdown
2. Choose heatmap mode (Click/Area/Scroll)
3. Toggle filters as needed
4. Hover over points for details

#### 📉 **Funnels Page**

Multi-step conversion analysis:

**Creating a Funnel:**
1. Click "Create Funnel"
2. Add funnel steps (pages or events):
   - Step 1: Landing page (`/`)
   - Step 2: Pricing page (`/pricing`)
   - Step 3: Checkout (`/checkout`)
   - Step 4: Success (`/success`)
3. Click "Analyze"

**Funnel Visualization:**
- Step-by-step conversion rates
- Drop-off percentages between steps
- Total conversions vs. total entries
- Visual funnel chart with width proportional to users

**Insights:**
- Identify bottleneck steps
- Optimize high-drop-off pages
- Track conversion improvements over time

#### 🎬 **Demo Center**

Test various tracking scenarios:

**Available Tests:**
- Click tracking on buttons
- Custom event firing
- Error simulation
- Form interaction tracking
- Navigation testing (SPA detection)

**Real-Time Validation:**
- Open browser DevTools → Network tab
- See batched POST requests to `/api/events`
- Verify event structure and timing

---

## 🔧 API Documentation

### Authentication

**Dashboard Endpoints:**
- Protected by Bearer token authentication
- Header: `Authorization: Bearer YOUR_ADMIN_PASSWORD`

**Event Ingestion:**
- Public endpoint (no auth required by default)
- Optional API key protection via `REQUIRE_API_KEY` env var

### Endpoints Reference

#### **POST /api/events**
Ingest batched tracking events.

**Request Body:**
```json
[
  {
    "projectId": "demo_project_001",
    "visitorId": "visitor_123",
    "sessionId": "session_456",
    "timestamp": "2026-06-24T12:00:00.000Z",
    "type": "click",
    "url": "http://localhost:3001/",
    "userAgent": "Mozilla/5.0...",
    "data": {
      "x": 220,
      "y": 410,
      "selector": "button#hero-cta",
      "text": "Get Started"
    }
  }
]
```

**Response:**
```json
{
  "success": true,
  "message": "5 events ingested successfully"
}
```

#### **GET /api/sessions**
Retrieve all sessions with pagination.

**Query Parameters:**
- `limit` (number): Results per page (default: 50)
- `page` (number): Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "sess_01",
      "visitorId": "vis_001",
      "firstSeen": "2026-06-24T10:00:00.000Z",
      "lastSeen": "2026-06-24T10:05:00.000Z",
      "sessionDuration": 300,
      "eventCount": 12,
      "pageViewsCount": 4,
      "bounce": false,
      "deviceType": "desktop",
      "country": "United States",
      "utmSource": "google"
    }
  ]
}
```

#### **GET /api/sessions/:id/events**
Get event timeline for a specific session.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "page_view",
      "timestamp": "2026-06-24T10:00:00.000Z",
      "url": "http://localhost:3001/",
      "data": { "title": "Home" }
    },
    {
      "type": "click",
      "timestamp": "2026-06-24T10:00:15.000Z",
      "data": {
        "selector": "button#cta",
        "x": 220,
        "y": 410
      }
    }
  ]
}
```

#### **GET /api/heatmap**
Get heatmap data for a URL.

**Query Parameters:**
- `url` (string, required): Target URL
- `type` (string): `click` or `attention` (default: `click`)
- `sessionId` (string, optional): Filter to specific session
- `convertedOnly` (boolean): Show only converted users
- `conversionPath` (string): Goal path (e.g., `/success`)
- `conversionEvent` (string): Goal event (e.g., `subscribe`)

**Response (Click):**
```json
{
  "success": true,
  "url": "http://localhost:3001/",
  "type": "click",
  "data": [
    {
      "x": 220,
      "y": 410,
      "selector": "button#hero-cta",
      "count": 5
    }
  ]
}
```

**Response (Attention):**
```json
{
  "success": true,
  "url": "http://localhost:3001/",
  "type": "attention",
  "data": {
    "0": 64,
    "1": 48,
    "2": 42
  }
}
```

#### **GET /api/heatmap/urls**
List all tracked URLs.

**Response:**
```json
{
  "success": true,
  "data": [
    "http://localhost:3001/",
    "http://localhost:3001/pricing",
    "http://localhost:3001/checkout"
  ]
}
```

#### **GET /api/funnels**
List all saved funnels.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "funnel_123",
      "name": "Checkout Flow",
      "steps": [
        { "type": "page_view", "value": "/" },
        { "type": "page_view", "value": "/pricing" },
        { "type": "page_view", "value": "/checkout" },
        { "type": "page_view", "value": "/success" }
      ]
    }
  ]
}
```

#### **POST /api/seed**
Seed database with sample data (development only).

**Response:**
```json
{
  "success": true,
  "message": "Database seeded with 15 sessions",
  "counts": {
    "sessions": 15,
    "events": 66,
    "recordings": 5
  }
}
```

#### **POST /api/clear**
Clear all data from database (development only).

**Response:**
```json
{
  "success": true,
  "message": "Database cleared successfully"
}
```

---

## 🧪 Testing

### Run All Tests

```bash
# Backend unit tests (32 tests)
cd backend
npm test

# Frontend E2E tests (Playwright)
cd tests/e2e
npx playwright test

# With UI mode
npx playwright test --ui
```

### Test Coverage

**Backend:**
- Event API validation
- Bot detection logic
- Enterprise feature guards
- Heatmap aggregation
- Session management

**Frontend E2E:**
- Tracker script injection
- Event batching and flushing
- Network failure resilience
- localStorage security errors

---

## 📦 Deployment

### Docker Deployment

**Build and run with Docker Compose:**

```bash
docker-compose up -d
```

This starts:
- MongoDB (port 27017)
- Backend API (port 4000)
- Frontend (port 80)

**Environment Configuration:**

Update `docker-compose.yml` with production values:
```yaml
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://mongodb:27017/analytics_db
  - ADMIN_PASSWORD=${ADMIN_PASSWORD}
  - ALLOWED_ORIGINS=https://yourdomain.com
```

### Production Considerations

1. **Security:**
   - Set strong `ADMIN_PASSWORD`
   - Enable `REQUIRE_API_KEY` for event ingestion
   - Use HTTPS in production
   - Configure proper CORS origins

2. **Performance:**
   - MongoDB indexes are auto-created
   - Consider read replicas for high traffic
   - Use CDN for tracker script

3. **Monitoring:**
   - Enable application logging
   - Set up health check monitoring (`/health` endpoint)
   - Monitor MongoDB performance

4. **Backup:**
   - Regular MongoDB backups
   - Export analytics data via API

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Development Guidelines:**
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [rrweb](https://github.com/rrweb-io/rrweb) for session recording
- [Recharts](https://recharts.org/) for visualization
- [Phosphor Icons](https://phosphoricons.com/) for UI icons
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/analytics-app/issues)
- **Documentation**: See [SPEC.md](SPEC.md) for architecture details
- **Heatmap Guide**: See [HEATMAP_FIXES.md](HEATMAP_FIXES.md) for troubleshooting

---

**Built with ❤️ for developers who value data ownership and privacy.**
