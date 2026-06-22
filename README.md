# Analytics OS

A lightweight, full-stack analytics platform designed to capture, process, and visualize user telemetry data seamlessly.

## Architecture Overview

Analytics OS is composed of three primary parts:

1. **Vanilla JS Tracker (`tracker/`)**
   - A standalone, zero-dependency script (`tracker.js`) installed on client websites.
   - Responsible for tracking page views, automatic click mapping, and explicit custom events.
   - Batches events in-memory and reliably flushes them to the backend via `fetch` with `keepalive: true`.

2. **Express Backend (`backend/`)**
   - A robust, modular REST API built with Node.js, Express, and TypeScript.
   - **Schema-Driven**: Uses `zod` as the single source of truth for runtime validation and static typings.
   - **Layered Architecture**: Requests flow through `Controller -> Service -> Repository`, enforcing strict separation of concerns.
   - **Storage**: Mongoose/MongoDB is used for persistence, storing unstructured event data and aggregated session metrics.

3. **React Frontend (`frontend/`)**
   - A high-density, anti-slop dashboard built with Vite, React 19, and Tailwind v4.
   - **Data Fetching**: Powered by `swr` for real-time reactivity and caching.
   - **Visualizations**: Incorporates `recharts` for aggregated time-series data and a custom absolute-positioned UI for URL click heatmaps.

## Getting Started

### Prerequisites
- Node.js (v20+)
- MongoDB (running on `localhost:27017`)

### Installation
Run the following from the root directory to install dependencies for both the backend and frontend:
```bash
npm run install:all
```
*(Alternatively, `cd backend && npm install` and `cd frontend && npm install`)*

### Running Locally

You'll need three terminal tabs:

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```
   *(Runs on http://localhost:4000)*

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
   *(Runs on http://localhost:5173)*

3. **Start Demo Server**:
   ```bash
   cd demo
   node server.js
   ```
   *(Runs on http://localhost:3001)*

Visit `http://localhost:3001` to interact with the demo page and generate telemetry data.
Visit `http://localhost:5173` to view the generated data on the dashboard.
