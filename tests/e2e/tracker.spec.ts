import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const trackerScript = fs.readFileSync(path.resolve(__dirname, '../../tracker/tracker.js'), 'utf-8');

test.describe('Tracker Resilience & Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Route any generic events to a mock handler to prevent real network requests
    await page.route('http://localhost:4000/api/**', route => {
      route.fulfill({ status: 202, body: JSON.stringify({ success: true }) });
    });
  });

  test('should inject successfully and track page_view', async ({ page }) => {
    const events: any[] = [];
    await page.route('http://localhost:4000/api/events', async route => {
      events.push(...JSON.parse(route.request().postData() || '[]'));
      await route.fulfill({ status: 202 });
    });

    // We can evaluate scripts directly or load a simple html
    await page.setContent(`
      <html>
        <head>
          <title>Test Page</title>
          <script data-project-id="test_proj_1">
            ${trackerScript}
          </script>
        </head>
        <body>
          <button id="test-btn">Click Me</button>
        </body>
      </html>
    `);

    // The tracker waits for DOMContentLoaded to init if document wasn't ready
    // It should immediately fire a page_view
    
    // Force a flush by calling hidden visibility
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait for network request to be captured
    await page.waitForTimeout(500);

    expect(events.length).toBeGreaterThan(0);
    const pageViewEvent = events.find(e => e.type === 'page_view');
    expect(pageViewEvent).toBeDefined();
    expect(pageViewEvent.projectId).toBe('test_proj_1');
  });

  test('should not crash and gracefully retry on network failure', async ({ page }) => {
    let requestCount = 0;
    
    // Simulate a failing network request (e.g. ad blocker)
    await page.route('http://localhost:4000/api/**', async route => {
      requestCount++;
      await route.abort('failed');
    });

    let consoleErrors = 0;
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected browser-level network failure logs
        if (text.includes('Failed to load resource: net::ERR_FAILED') || text.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')) {
          return;
        }
        
        // If the error is from the tracker explicitly logging via our logError, it won't crash the host.
        // We ensure debug is off so NO console errors should be logged by tracker.
        consoleErrors++;
        console.log('CONSOLE ERROR MSG:', text);
      }
    });

    await page.setContent(`
      <html>
        <head>
          <script data-project-id="test_proj_1">
            ${trackerScript}
          </script>
        </head>
        <body>
          <button id="test-btn">Click Me</button>
        </body>
      </html>
    `);

    // Click the button
    await page.click('#test-btn');

    // Force a flush
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Wait some time to let flush attempt network
    await page.waitForTimeout(1000);

    // Should have tried to send
    expect(requestCount).toBeGreaterThan(0);
    
    // The tracker should NOT have emitted any unhandled exceptions or console errors
    // Since debug is not set, logError and logWarn do nothing.
    expect(consoleErrors).toBe(0);
  });

  test('should handle blocked localStorage gracefully (SecurityError)', async ({ browser }) => {
    // We launch a context without storage access, or mock localStorage to throw
    const context = await browser.newContext();
    const page = await context.newPage();

    let consoleErrors = 0;
    page.on('pageerror', err => {
      consoleErrors++;
    });

    // Inject a mock that makes localStorage throw (like in Safari private mode for 3rd party)
    await page.addInitScript(() => {
      delete (window as any).localStorage;
      Object.defineProperty(window, 'localStorage', {
        get: () => {
          throw new DOMException('The quota has been exceeded.', 'SecurityError');
        }
      });
    });

    await page.setContent(`
      <html>
        <head>
          <script data-project-id="test_proj_1">
            ${trackerScript}
          </script>
        </head>
        <body></body>
      </html>
    `);

    // It should have initialized and fired page_view without throwing
    await page.waitForTimeout(500);
    expect(consoleErrors).toBe(0);
    
    await context.close();
  });
});
