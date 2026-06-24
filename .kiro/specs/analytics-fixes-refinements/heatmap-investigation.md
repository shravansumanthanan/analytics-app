# Heatmap Investigation Report

## Issue
User reported: "heat maps not working"

## Investigation Results

### Root Cause
The heatmap functionality was **not broken**. The issue was that the database was empty with no tracking data to visualize.

**Evidence:**
```bash
$ curl -H "Authorization: Bearer admin" http://localhost:4000/api/heatmap/urls
{"success":true,"data":[]}  # Empty array - no tracked URLs

$ curl -H "Authorization: Bearer admin" http://localhost:4000/api/sessions
{"success":true,"data":[]}  # Empty array - no sessions
```

### Components Verified ✅

1. **Backend API Endpoint** (`/api/heatmap`)
   - Correctly registered in routes
   - Proper authentication middleware
   - Query validation working
   - Returns expected JSON format

2. **Frontend HeatmapsPage Component**
   - No TypeScript errors
   - No lint errors
   - Proper data fetching with SWR
   - Canvas rendering logic correct
   - Iframe messaging bridge functional

3. **Database Queries**
   - Event repository queries working
   - Click coordinate aggregation working
   - Scroll attention mapping working

### Solution Applied

Used the existing seed endpoint to populate sample data:

```bash
$ curl -X POST -H "Authorization: Bearer admin" http://localhost:4000/api/seed
{"success":true,"message":"Database seeded with 15 sessions and event timelines successfully.","counts":{"sessions":15,"events":49,"recordings":5}}
```

### Verification

After seeding, heatmaps work correctly:

```bash
$ curl -H "Authorization: Bearer admin" http://localhost:4000/api/heatmap/urls
{"success":true,"data":[
  "http://localhost:3001/",
  "http://localhost:3001/checkout",
  "http://localhost:3001/pricing",
  "http://localhost:3001/signup"
]}

$ curl -H "Authorization: Bearer admin" "http://localhost:4000/api/heatmap?url=http://localhost:3001/&type=click"
{"success":true,"url":"http://localhost:3001/","type":"click","data":[
  {"x":220,"y":410,"offsetX":20,"offsetY":12,"selector":"button#hero-cta-main","count":1},
  {"x":340,"y":45,"offsetX":12,"offsetY":8,"selector":"a#nav-signup-btn","count":1},
  ...
]}
```

## How to Use Heatmaps

### 1. Populate Data (First Time Setup)

Option A: **Seed with sample data** (for testing/demo)
```bash
curl -X POST -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" http://localhost:4000/api/seed
```

Option B: **Generate real tracking data**
1. Open demo page: `http://localhost:3001/`
2. Click buttons and navigate pages
3. Wait for events to be batched and sent (5 seconds or on page unload)
4. Events will appear in heatmaps

### 2. View Heatmaps

1. Open analytics dashboard: `http://localhost:5173`
2. Navigate to **Heatmaps** page
3. Select a tracked URL from dropdown
4. Choose heatmap mode:
   - **Click Heatmap**: Shows thermal density of click coordinates
   - **Area Maps**: Highlights clickable elements with overlays
   - **Scroll Attention**: Shows viewport time spent at each scroll depth

### 3. Advanced Filters

- **User Session**: Filter to specific session for user journey analysis
- **Converted Only**: Show only clicks from users who completed a goal
- **Goal Type**: Filter by destination path or custom event

## Technical Details

### Heatmap Types

1. **Click Heatmap** (`type=click`)
   - Projects `(x, y, offsetX, offsetY, selector, count)` from click events
   - Renders radial gradients on canvas overlay
   - Color intensity: Blue (low) → Yellow (medium) → Red (high)
   - Hover shows selector and click count

2. **Area Maps** (`type=click` with area mode)
   - Groups clicks by selector
   - Renders colored overlay boxes on iframe elements
   - Shows percentage distribution and click counts
   - No canvas - direct DOM manipulation via postMessage

3. **Scroll Attention** (`type=attention`)
   - Aggregates `scroll_attention` events by 100px bands
   - Renders linear gradient showing time spent per viewport band
   - Shows fold markers (25%, 50%, 75%)
   - Color intensity indicates engagement level

### Iframe Communication

Heatmaps use postMessage protocol for iframe/canvas coordination:

- `aos-ready`: Iframe signals tracker script loaded
- `aos-resolve`: Parent sends click data for coordinate mapping
- `aos-resolved`: Iframe returns page-relative coordinates
- `aos-area-resolve`: Parent requests element overlay rendering
- `aos-clear-overlays`: Parent requests overlay cleanup
- `aos-resize`: Iframe reports content height changes

## Status

✅ **RESOLVED** - Heatmaps are fully functional when data exists in database.

## Recommendations

1. Add empty state messaging: "No tracking data yet. Visit the Demo Center or seed sample data."
2. Add "Seed Sample Data" button in UI for first-time users
3. Document data generation workflow in README
4. Consider adding data status indicator (# of tracked URLs, # of sessions)
