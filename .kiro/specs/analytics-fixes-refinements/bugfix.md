# Bugfix Requirements Document

## Introduction

This document outlines the requirements for fixing multiple deterministic bugs and configuration issues across the analytics application that prevent it from working correctly in local development, production, and Docker deployment environments. These bugs affect cross-origin event tracking, container startup, endpoint resolution, production deployments, navigation UI, code quality, E2E testing, and CI/CD pipeline coverage.

## Bug Analysis

### Current Behavior (Defect)

#### Backend & Deployment Configuration Issues

1.1 WHEN REQUIRE_API_KEY=true is enabled and cross-origin requests are made to /api/events THEN the system rejects requests with CORS errors because 'X-API-Key' is not in the allowedHeaders list

1.2 WHEN docker-compose.yml starts the backend container with environment variable MONGO_URI THEN the system fails to start immediately because the backend code expects MONGODB_URI instead

1.3 WHEN tracker.js is loaded from localhost:3001 (demo server) and attempts to track events THEN the system fails to send events because the endpoint resolution logic rewrites the port to 4000 correctly but the actual API endpoint uses the wrong rewritten origin

#### Frontend UI & API Client Issues

1.4 WHEN the frontend is deployed in production or Docker behind an Nginx proxy THEN the system fails to make API requests because client.ts has API_BASE_URL hardcoded to localhost instead of using relative /api paths

1.5 WHEN users navigate the application and look for the Funnels page in the Sidebar THEN the system does not display a Funnels navigation link even though the page exists and is complete

1.6 WHEN SessionPlayer.tsx is compiled or linted THEN the system produces compiler/linter warnings because the liveEvents dependency array uses .length instead of direct reference and catch blocks have unused error parameters

#### Testing & Pipeline Issues

1.7 WHEN E2E Playwright tests in tracker.spec.ts run THEN the system fails to execute tests because the tracker script path is incorrect (../../tracker/tracker.js should be ../../backend/tracker/tracker.js)

1.8 WHEN commits are pushed to the repository THEN the CI/CD pipeline does not validate frontend-to-backend E2E behavior because the ci.yml workflow is missing a Playwright E2E testing job

### Expected Behavior (Correct)

#### Backend & Deployment Configuration Fixes

2.1 WHEN REQUIRE_API_KEY=true is enabled and cross-origin requests are made to /api/events THEN the system SHALL accept requests with the X-API-Key header by including it in the CORS allowedHeaders configuration

2.2 WHEN docker-compose.yml starts the backend container THEN the system SHALL start successfully by using the correct environment variable name MONGODB_URI instead of MONGO_URI

2.3 WHEN tracker.js is loaded from localhost:3001 (demo server) and attempts to track events THEN the system SHALL successfully send events to the backend at localhost:4000 by correctly rewriting the endpoint port from 3001 to 4000

#### Frontend UI & API Client Fixes

2.4 WHEN the frontend is deployed in production or Docker behind an Nginx proxy THEN the system SHALL successfully make API requests by using dynamic resolution to relative /api paths instead of hardcoded localhost URLs

2.5 WHEN users navigate the application and look for the Funnels page in the Sidebar THEN the system SHALL display a Funnels navigation link with the appropriate icon in the navigation menu

2.6 WHEN SessionPlayer.tsx is compiled or linted THEN the system SHALL produce no compiler/linter warnings by fixing the liveEvents dependency array to reference liveEvents directly and adding proper error parameter handling in catch blocks

#### Testing & Pipeline Fixes

2.7 WHEN E2E Playwright tests in tracker.spec.ts run THEN the system SHALL execute tests successfully by using the correct tracker script path ../../backend/tracker/tracker.js

2.8 WHEN commits are pushed to the repository THEN the CI/CD pipeline SHALL validate frontend-to-backend E2E behavior by running the Playwright E2E test suite as part of the workflow

### Unchanged Behavior (Regression Prevention)

#### Backend & Deployment

3.1 WHEN requests are made to endpoints other than /api/events with allowed origins THEN the system SHALL CONTINUE TO enforce strict CORS policies as configured

3.2 WHEN docker-compose.yml starts MongoDB and frontend containers THEN the system SHALL CONTINUE TO start successfully with their existing configurations

3.3 WHEN tracker.js is loaded from non-localhost origins THEN the system SHALL CONTINUE TO resolve the correct API endpoint origin

#### Frontend UI & API Client

3.4 WHEN the frontend runs in local development mode (localhost:5173) THEN the system SHALL CONTINUE TO make API requests to localhost:4000 successfully

3.5 WHEN users navigate to existing pages (Overview, Sessions, Heatmaps, Events, Demo Center) THEN the system SHALL CONTINUE TO display all existing navigation links correctly

3.6 WHEN SessionPlayer.tsx renders live or historical session recordings THEN the system SHALL CONTINUE TO display session replays correctly without functional changes

#### Testing & Pipeline

3.7 WHEN E2E tests validate tracker behavior for resilience and error handling THEN the system SHALL CONTINUE TO test those scenarios with the same assertions

3.8 WHEN backend and frontend quality gate jobs run in CI THEN the system SHALL CONTINUE TO execute linting, type checking, unit tests, and builds as currently configured
