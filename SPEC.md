# Spec: AnalyticsOS User Analytics Application

## Objective

Build a full-stack analytics platform that tracks user interactions (page views and clicks)
and visualises them in a dashboard. The **primary audience is a highly technical hiring
reviewer** (ex-Apple/Microsoft data scientist) who will read the source code directly.

The showpiece is the **backend architecture**: a cleanly layered Node.js/TypeScript API
that demonstrates system design thinking — not just "working code."

### User Stories
- As a developer, I can drop a `<script>` tag on any page and automatically start tracking sessions.
- As a dashboard user, I can view all sessions with their event counts.
- As a dashboard user, I can click a session and see the ordered event timeline (user journey).
- As a dashboard user, I can select a page URL and see a visual heatmap of where users clicked.

### Success Criteria
- `POST /api/events` persists a batch of events and upserts sessions in a single DB round-trip each.
- `GET /api/sessions` returns all sessions ordered by `lastSeen` descending.
- `GET /api/sessions/:id/events` returns 404 with a structured error if the session does not exist.
- `GET /api/heatmap?url=<url>` returns click `(x, y)` points for the given URL.
- All API validation errors return `{ success: false, message, errors }` — never a stack trace.
- Reviewer opens `backend/src/` and can navigate: `types → schemas → models → repositories → services → controllers → routes` without any layer reaching into another layer's concern.
- Frontend dashboard loads, displays sessions, session detail, and heatmap with no console errors.

---

## Tech Stack

| Layer | Choice | Version |
|---|---|---|
| Backend runtime | Node.js | 20 LTS |
| Backend language | TypeScript | 5.x (strict) |
| Backend framework | Express | 4.x |
| Validation | Zod | 3.x |
| Database | MongoDB + Mongoose | 8.x |
| Frontend framework | React | 19.x |
| Frontend build | Vite | 8.x |
| Frontend styling | Tailwind CSS | 4.x |
| Routing | React Router | 7.x |
| Tracker | Vanilla JS (IIFE) | — |

---

## Commands

```bash
# Backend
cd backend
cp .env.example .env          # copy env vars
npm install
npm run dev                   # ts-node-dev on port 4000
npm run build                 # compile to dist/
npm start                     # run compiled output

# Frontend
cd frontend
npm install
npm run dev                   # Vite dev server on port 5173
npm run build                 # production bundle

# Demo page (open directly in browser)
open demo/index.html          # loads tracker pointing at localhost:4000
```

---

## Project Structure

```
analytics-app/
├── backend/
│   ├── src/
│   │   ├── types/            # Domain types (discriminated unions) — no logic
│   │   ├── schemas/          # Zod schemas — single source of truth for validation
│   │   ├── config/           # env.ts (validated), database.ts
│   │   ├── models/           # Mongoose schemas + IDocument interfaces
│   │   ├── middleware/       # app-error.ts, error.middleware.ts, validate.middleware.ts
│   │   ├── repositories/     # Data-access layer — MongoDB queries only
│   │   ├── services/         # Business logic — orchestrates repositories
│   │   ├── controllers/      # HTTP request/response — delegates to services
│   │   ├── routes/           # Router + composition root (dependency wiring)
│   │   ├── app.ts            # Express app factory (importable for tests)
│   │   └── server.ts         # Bootstrap: DB connect → listen → graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── types/            # Shared API response types
│   │   ├── api/              # client.ts — typed fetch wrapper
│   │   ├── hooks/            # useSessions, useSession, useHeatmap
│   │   ├── components/       # SessionsTable, EventTimeline, HeatmapCanvas, Navbar
│   │   ├── pages/            # SessionsPage, SessionDetailPage, HeatmapPage
│   │   ├── App.tsx           # Router setup
│   │   ├── main.tsx          # React root
│   │   └── index.css         # Tailwind directives
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── tracker/
│   └── tracker.js            # Self-contained IIFE — no dependencies
│
├── demo/
│   └── index.html            # Rich demo page that loads tracker.js
│
└── README.md                 # Architecture explanation + setup steps
```

---

## Code Style

### Backend — Layering rule
Each layer may only import from layers **below** it. Never sideways, never upward.

```
routes → controllers → services → repositories → models → types
                                                         ↑
                                               schemas (cross-cut, read-only)
```

### TypeScript — discriminated union pattern
```typescript
// types/event.types.ts
export type TrackedEvent = PageViewEvent | ClickEvent;
// Switch on .type → TypeScript narrows to exact subtype, no casting.

// schemas/event.schema.ts — derive types FROM schemas, never duplicate
export const trackedEventSchema = z.discriminatedUnion('type', [...]);
export type IngestEventsInput = z.infer<typeof ingestEventsSchema>;
```

### Error handling — throw AppError, catch in middleware
```typescript
// service layer
if (!exists) throw new NotFoundError(`Session '${id}'`);

// error.middleware.ts
if (err instanceof AppError) {
  res.status(err.statusCode).json({ success: false, message: err.message });
}
```

### Controllers — HTTP only
```typescript
// ✅ Good: extract, delegate, respond
ingest = async (req, res, next) => {
  try {
    await this.eventService.ingest(req.body);
    res.status(202).json({ success: true, accepted: req.body.length });
  } catch (err) { next(err); }
};

// ❌ Bad: business logic in controller
if (events.some(e => e.type === 'click' && !e.x)) { ... }  // belongs in service/schema
```

---

## Testing Strategy

> Scope: This is a hiring assignment with a tight timeline.
> We provide smoke-test curl commands in the README rather than a full test suite.
> The architecture (app factory, injected dependencies) makes unit testing straightforward to add.

**What makes this testable (architectural decisions):**
- `createApp()` returns an Express app without binding to a port — importable in Jest + Supertest.
- Services receive repositories via constructor injection — mock the repo, test the service.
- Repositories are the only layer that touches Mongoose — mongo-memory-server for integration tests.

**Manual verification commands (in README):**
```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '[{"sessionId":"s1","type":"page_view","url":"http://localhost:5173","timestamp":"2026-06-22T09:00:00Z"}]'

curl http://localhost:4000/api/sessions
curl http://localhost:4000/api/sessions/s1/events
curl "http://localhost:4000/api/heatmap?url=http://localhost:5173"
```

---

## API Contract

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/api/events` | `TrackedEvent[]` (min 1) | `{ success, accepted }` |
| GET | `/api/sessions` | — | `{ success, data: SessionSummary[] }` |
| GET | `/api/sessions/:id/events` | — | `{ success, data: IEvent[] }` or 404 |
| GET | `/api/heatmap` | `?url=<string>` | `{ success, url, data: ClickPoint[] }` |
| GET | `/api/heatmap/urls` | — | `{ success, data: string[] }` |
| GET | `/health` | — | `{ status: "ok", timestamp }` |

---

## Boundaries

**Always:**
- Keep layers strictly separated — no repository logic in services, no service logic in controllers
- Derive TypeScript types from Zod schemas — never define the same shape twice
- Forward errors to Express `next(err)` — never catch-and-swallow
- Return `{ success: bool, ... }` envelope on every API response
- Use compound MongoDB indexes for the hottest query paths

**Ask first:**
- Adding new npm dependencies
- Changing the MongoDB schema after data exists
- Adding authentication / sessions middleware

**Never:**
- Commit `.env` (only `.env.example`)
- Add business logic to controllers
- Add HTTP/Express imports to services or repositories
- Use `any` type — use `unknown` and narrow, or define a proper interface

---

## Open Questions

None — confirmed via interview session. All decisions locked:
- TypeScript backend ✅
- React + Vite + Tailwind CSS frontend ✅  
- MongoDB local ✅
- System design (layered architecture) as showpiece ✅
