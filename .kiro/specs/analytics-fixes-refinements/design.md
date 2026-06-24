# Technical Design Document

## Overview

This document provides technical design and implementation details for fixing 8 deterministic bugs across backend deployment configuration, frontend UI and API client, and testing/CI pipeline. All fixes are scoped to ensure minimal risk while maximizing compatibility across local development, production, and Docker deployment environments.

## Technical Context & Root Cause Analysis

### 1. CORS Missing X-API-Key Header (app.ts)

**File:** `backend/src/app.ts`  
**Root Cause:** The permissive CORS configuration for `/api/events` endpoint (line 39-43) includes `allowedHeaders: ['Content-Type', 'X-API-Key']`, which is correct. However, when `REQUIRE_API_KEY=true` is enabled, cross-origin requests that include the `X-API-Key` header will fail CORS preflight checks if the header is not explicitly listed in `Access-Control-Allow-Headers`.

**Current Code (lines 39-43):**
```typescript
cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
})(req, res, next);
```

**Analysis:** Upon closer inspection, the code already includes 'X-API-Key' in allowedHeaders. This bug report may be based on outdated information or testing may have revealed that the header casing or CORS implementation isn't working as expected. We should verify if there's actually an issue or if this was already fixed.

**Verification Needed:** Test cross-origin tracking with REQUIRE_API_KEY=true to confirm if this is still a problem.

### 2. Docker Compose Environment Variable Mismatch (docker-compose.yml)

**File:** `docker-compose.yml`  
**Root Cause:** Line 20 uses `MONGODB_URI=mongodb://mongodb:27017/analytics_db`, which is actually CORRECT. The bug report states the env var name should be `MONGODB_URI` instead of `MONGO_URI`, but the current code already uses the correct name.

**Current Code (line 20):**
```yaml
- MONGODB_URI=mongodb://mongodb:27017/analytics_db
```

**Analysis:** The configuration is already correct. No changes needed unless there's a different location where MONGO_URI is incorrectly used.

**Verification Needed:** Check if there's another docker-compose.yml file or if the backend code has changed to expect a different variable name.

### 3. Tracker.js Local Endpoint Resolution (tracker.js)

**File:** `backend/tracker/tracker.js`  
**Root Cause:** Lines 48-53 handle custom endpoint resolution. The logic attempts to rewrite localhost:3001 to localhost:4000, but there may be an issue with how the origin is constructed or applied.

**Current Code (lines 48-53):**
```javascript
try {
  const urlObj = new URL(scriptTag.src);
  let origin = urlObj.origin;
  if (origin.includes('localhost:3001') || origin.includes('127.0.0.1:3001')) {
    origin = origin.replace('3001', '4000');
  }
  ENDPOINT = origin + '/api/events';
```

**Analysis:** The code correctly rewrites the port from 3001 to 4000. However, the bug report suggests the endpoint resolution logic writes the port to 4000 correctly but uses "the wrong rewritten origin." This may indicate that the port replacement is working but something else about the URL construction is incorrect.

**Proposed Fix:** The logic appears correct. We should test with `http://localhost:3001/tracker.js` and verify that ENDPOINT becomes `http://localhost:4000/api/events`.

### 4. Frontend API Client Hardcoded localhost (client.ts)

**File:** `frontend/src/api/client.ts`  
**Root Cause:** Lines 1-4 define API_BASE_URL with a conditional that checks if running on localhost:5173 (Vite dev server), then defaults to `http://localhost:4000/api`, otherwise uses relative `/api`.

**Current Code (lines 1-4):**
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:4000/api'
    : '/api');
```

**Problem:** When deployed in production or Docker (served behind Nginx proxy on port 80), the condition `window.location.port === '5173'` will be false (port will be '' or '80'), so it falls back to relative '/api'. This should work correctly in production.

**Analysis:** The current logic seems correct for the described use case:
- Local dev (localhost:5173): Uses `http://localhost:4000/api`
- Production/Docker (any other host/port): Uses relative `/api`
- Can be overridden with VITE_API_URL env var

**Verification Needed:** Test if there's a specific production scenario where this fails. The bug report says it's "hardcoded to localhost" but the code shows it uses relative paths in production.

### 5. Sidebar Missing Funnels Link (Sidebar.tsx)

**File:** `frontend/src/components/layout/Sidebar.tsx`  
**Root Cause:** Lines 6-11 define navItems array with 5 items: Overview, Sessions, Heatmaps, Events, Demo Center. The Funnels page is not included.

**Current Code (lines 6-11):**
```typescript
const navItems = [
  { name: 'Overview', path: '/', icon: ChartLineUp },
  { name: 'Sessions', path: '/sessions', icon: ListDashes },
  { name: 'Heatmaps', path: '/heatmaps', icon: MapTrifold },
  { name: 'Events', path: '/events', icon: Target },
  { name: 'Demo Center', path: '/demo-center', icon: Sparkle },
];
```

**Proposed Fix:** Add Funnels entry with path `/funnels` and import the `Funnel` icon from `@phosphor-icons/react`.

### 6. SessionPlayer.tsx Dependency Array and Unused Catch Parameters

**File:** `frontend/src/components/ui/SessionPlayer.tsx`  
**Root Cause Analysis:**

**Issue 6a: liveEvents dependency (line 81)**
```typescript
useEffect(() => {
  // ... effect logic ...
}, [isLive, loaded, liveEvents.length]);
```

**Problem:** The dependency array uses `liveEvents.length` instead of `liveEvents` directly. React's exhaustive-deps lint rule will warn about this because the effect may not re-run when the array contents change (only when length changes). However, in this specific case, the effect is intentionally designed to run only when the length changes (i.e., when new events are added), not on every mutation.

**Actual Issue:** Looking at the effect more carefully, it initializes the replayer only once when `liveEvents.length > 0` and `!replayerInstanceRef.current`. The intent is to create the replayer when we first receive events. Using `liveEvents` directly would cause unnecessary re-runs.

**Analysis:** The current code using `liveEvents.length` is functionally correct but triggers a lint warning. Using `liveEvents` directly would satisfy the linter but may cause performance issues. Best practice is to either:
1. Add eslint-disable comment explaining why .length is sufficient
2. Refactor to use a ref or state flag to track initialization

**Issue 6b: Unused catch parameters**
Multiple catch blocks have unused error parameters:
- Line 87: `catch (err) {`
- Line 106: `catch (err) {`
- Line 115: `catch (err) {`
- Lines 123, 207: Various other catch blocks

**Proposed Fix:** Replace `catch (err)` with `catch {}` where the error is not used, or replace with `catch (_err)` to indicate intentional non-use.

### 7. Tracker E2E Test Incorrect Script Path (tracker.spec.ts)

**File:** `tests/e2e/tracker.spec.ts`  
**Root Cause:** Line 5 reads the tracker script from the filesystem.

**Current Code (line 5):**
```typescript
const trackerScript = fs.readFileSync(path.resolve(__dirname, '../../backend/tracker/tracker.js'), 'utf-8');
```

**Analysis:** The path is `../../backend/tracker/tracker.js`, which resolves from:
- `tests/e2e/` → `../../` → project root → `backend/tracker/tracker.js`

This path appears correct. The bug report states it should be `../../backend/tracker/tracker.js` instead of `../../tracker/tracker.js`, which matches the current code.

**Verification Needed:** Check if the bug report is outdated or if there's a different test file with the incorrect path.

### 8. CI Pipeline Missing Playwright E2E Job (ci.yml)

**File:** `.github/workflows/ci.yml`  
**Root Cause:** The CI workflow does not include a job to run Playwright E2E tests.

**Analysis:** Need to review the current ci.yml structure and add a new job that:
1. Checks out code
2. Installs Node.js
3. Installs dependencies
4. Installs Playwright browsers (specifically Chromium)
5. Runs `npx playwright test` in the tests/e2e directory
6. Uploads test results/artifacts on failure

## Implementation Plan

### Bug Fix 1: CORS X-API-Key Header
**Status:** VERIFICATION NEEDED - Code already appears correct

**Action:** Review and test, no code changes unless testing reveals an actual issue.

### Bug Fix 2: Docker Compose MONGODB_URI
**Status:** VERIFICATION NEEDED - Code already appears correct

**Action:** No changes needed unless there's a different location with the wrong variable name.

### Bug Fix 3: Tracker.js Endpoint Resolution
**Status:** VERIFICATION NEEDED - Code appears correct

**Action:** Test locally with demo server on port 3001 to verify the endpoint correctly resolves to localhost:4000.

### Bug Fix 4: Frontend API Client
**Status:** VERIFICATION NEEDED - Code appears correct for described use case

**Action:** Test in production/Docker environment to verify relative `/api` paths work correctly.

### Bug Fix 5: Add Funnels to Sidebar Navigation
**Status:** CONFIRMED BUG - Implementation needed

**Files to Modify:**
- `frontend/src/components/layout/Sidebar.tsx`

**Changes:**
1. Import `Funnel` icon from `@phosphor-icons/react`
2. Add new nav item to navItems array:
```typescript
{ name: 'Funnels', path: '/funnels', icon: Funnel }
```

**Placement:** Insert after 'Events' and before 'Demo Center' to maintain logical grouping (analytics features before demo tools).

**Regression Risk:** LOW - Adding a navigation link does not affect existing functionality.

### Bug Fix 6: SessionPlayer Dependency Array and Catch Blocks
**Status:** CONFIRMED WARNINGS - Implementation needed

**Files to Modify:**
- `frontend/src/components/ui/SessionPlayer.tsx`

**Changes:**

**6a: liveEvents dependency**
Replace line 81:
```typescript
}, [isLive, loaded, liveEvents.length]);
```
With:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isLive, loaded, liveEvents.length]);
```

Add comment explaining:
```typescript
// Note: Using liveEvents.length instead of liveEvents to avoid unnecessary re-initialization
// The effect should only run when we receive the first events, not on every event addition
```

Alternatively, refactor to use liveEvents directly and add conditional check to prevent re-initialization.

**6b: Unused catch parameters**
Replace all instances of `catch (err) {` where err is not used with `catch {}`.

Lines to update: 87, 106, 115, 123, 207

**Regression Risk:** LOW - Lint fixes do not change runtime behavior.

### Bug Fix 7: Tracker E2E Test Path
**Status:** VERIFICATION NEEDED - Code already appears correct

**Action:** Run the tests to verify they work. The path in the code matches what the bug report says it should be.

### Bug Fix 8: Add Playwright E2E Job to CI
**Status:** CONFIRMED MISSING - Implementation needed

**Files to Modify:**
- `.github/workflows/ci.yml`

**Changes:** Add new job after existing backend/frontend jobs:

```yaml
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: '**/package-lock.json'
      
      - name: Install root dependencies
        run: npm ci
        working-directory: ./tests/e2e
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        working-directory: ./tests/e2e
      
      - name: Run E2E tests
        run: npx playwright test
        working-directory: ./tests/e2e
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: tests/e2e/playwright-report/
          retention-days: 7
```

**Placement:** Add as a new top-level job in the `jobs:` section.

**Regression Risk:** LOW - Adding a new CI job does not affect existing jobs or application functionality. If E2E tests fail, they will be caught in CI without blocking other checks.

## Verification Strategy

### Automated Verification
1. **Linting:** Run `npm run lint` in backend and frontend folders
2. **Unit Tests:** Run `npm test` in backend folder (ensure all 32 tests pass)
3. **E2E Tests:** Run `npx playwright test` in tests/e2e folder
4. **Build:** Run `npm run build` in frontend folder
5. **CI Pipeline:** Push to a test branch and verify all jobs pass

### Manual Verification
1. **Local Demo:** Start demo server (port 3001) and backend (port 4000), verify event tracking works
2. **Sidebar Navigation:** Open frontend, verify Funnels link appears and navigates correctly
3. **Docker Deployment:** Build and run docker-compose, verify all services start and communicate
4. **Session Player:** Open a session with recordings, verify no console errors
5. **API Client:** Test frontend in production build (served on port 80) and verify API requests use relative paths

## Risk Assessment

| Fix | Risk Level | Impact if Broken | Mitigation |
|-----|-----------|------------------|------------|
| 1. CORS Header | LOW | Cross-origin tracking fails | Already correct, minimal testing needed |
| 2. Docker Env | LOW | Container fails to start | Already correct, verify with docker-compose up |
| 3. Tracker Endpoint | MEDIUM | Local demo tracking fails | Test locally before committing |
| 4. API Client | MEDIUM | Production API calls fail | Test in production-like environment |
| 5. Funnels Link | LOW | Navigation missing but no breakage | Visual verification only |
| 6. SessionPlayer | LOW | Lint warnings, no runtime impact | Existing tests cover functionality |
| 7. E2E Test Path | LOW | Tests fail to run | Run tests locally before committing |
| 8. CI E2E Job | LOW | CI doesn't catch frontend issues | Monitor first CI run after adding job |

## Dependencies & Prerequisites

- Node.js 18+ (for Playwright)
- Playwright browsers installed (Chromium)
- Docker and docker-compose (for deployment testing)
- All npm dependencies installed in backend, frontend, and tests/e2e folders

## Rollback Plan

All changes are non-breaking and can be easily rolled back:
- **Sidebar:** Remove Funnels nav item
- **SessionPlayer:** Revert lint fixes
- **CI Job:** Remove or disable the e2e-tests job
- **Other fixes:** If any configuration fix breaks existing functionality, revert the specific file

## Post-Implementation Validation

After implementing all fixes:

1. ✅ All lint warnings resolved in backend and frontend
2. ✅ All 32 backend unit tests pass
3. ✅ All E2E Playwright tests pass
4. ✅ Frontend builds without errors
5. ✅ CI pipeline includes and passes E2E tests
6. ✅ Funnels link visible and functional in sidebar
7. ✅ Local demo tracking works (localhost:3001 → localhost:4000)
8. ✅ Docker deployment starts all services successfully
9. ✅ Production build uses relative API paths correctly
10. ✅ No new console errors or warnings in browser console
