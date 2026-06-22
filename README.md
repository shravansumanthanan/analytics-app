# Analytics OS

> A lightweight, full-stack analytics platform that tracks user interactions and visualizes them in a high-density dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why This Exists

You need a simple way to understand user behavior without the bloat of enterprise tracking scripts. Analytics OS gives you a zero-dependency tracker that reliably captures page views and clicks, paired with a modular backend designed to serve a fast dashboard. It provides complete control over your telemetry data and a crystal-clear TypeScript codebase that you can easily extend.

## Quick Start

The fastest way to see Analytics OS in action is to start the entire stack concurrently.

```bash
# Install dependencies for both frontend and backend
npm run install:all

# Start the backend, frontend, and demo site simultaneously
npm run dev
```

1. Visit [http://localhost:3001](http://localhost:3001) to interact with the demo site and generate traffic.
2. Visit [http://localhost:5173](http://localhost:5173) to view the real-time analytics dashboard.

> **Note**: If you see MongoDB connection errors, ensure you have a local MongoDB instance running on `localhost:27017`.

## Installation

**Prerequisites**: 
- Node.js (v20+)
- MongoDB (running locally on `localhost:27017`)

First, clone the repository and install all dependencies:

```bash
npm run install:all
```

If you prefer to run services manually, you can start them in separate terminal tabs:

```bash
# Tab 1: Start the backend API
cd backend
npm run dev

# Tab 2: Start the React dashboard
cd frontend
npm run dev

# Tab 3: Start the demo application
cd demo
node server.js
```

## Architecture Overview

Analytics OS uses a strict, layered architecture to keep business logic isolated and testable.

- **Tracker (`tracker/`)**: You drop this vanilla, zero-dependency JavaScript IIFE onto any webpage. It batches events in memory and flushes them reliably to the API.
- **Backend (`backend/`)**: You run this Node.js/Express REST API to validate and persist data. It uses Zod for runtime validation and enforces a strict `Controller -> Service -> Repository -> Model` flow.
- **Frontend (`frontend/`)**: You use this React 18 dashboard to visualize user journeys and click heatmaps.

## Usage

### Instrumenting Your Site

To start tracking user sessions, include the tracker script in the `<head>` of your website.

```html
<script src="http://localhost:3001/tracker.js"></script>
```

Once loaded, the tracker automatically captures page views (including SPA navigation) and records `(x, y)` coordinates for all clicks to power the heatmap visualizations.

## API Reference

The backend exposes a structured REST API. All endpoints return a standard envelope: `{ success: boolean, data?: any, message?: string }`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/events` | Ingest a batch of tracked events |
| `GET`  | `/api/sessions` | Retrieve all user sessions, ordered by most recent |
| `GET`  | `/api/sessions/:id/events` | Retrieve the event timeline for a specific session |
| `GET`  | `/api/heatmap?url=<string>` | Retrieve raw click coordinates for a specific URL |
| `GET`  | `/api/heatmap/urls` | List all URLs that have tracked click events |

See [SPEC.md](SPEC.md) for comprehensive architectural guidelines, testing strategies, and implementation rules.
