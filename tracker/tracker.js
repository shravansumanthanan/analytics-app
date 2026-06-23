(function () {
  let ENDPOINT = 'http://localhost:4000/api/events';
  const BATCH_SIZE = 10;
  const FLUSH_INTERVAL_MS = 5000;
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const MAX_RETRY_BACKOFF = 60000;

  // Internal logging wrapper to swallow errors unless debug is enabled
  function logWarn(...args) {
    if (window.AnalyticsOS && window.AnalyticsOS.debug) {
      console.warn('AnalyticsOS:', ...args);
    }
  }

  function logError(...args) {
    if (window.AnalyticsOS && window.AnalyticsOS.debug) {
      console.error('AnalyticsOS:', ...args);
    }
  }

  try {
    // Handle immediate initialization for race conditions
    window.AnalyticsOS = window.AnalyticsOS || {
      debug: false,
      track: function(name, payload) {
        if (isReady) {
          trackEvent('custom', { name, payload });
        } else {
          preInitQueue.push(['custom', { name, payload }]);
        }
      },
      grantConsent: function() {
        safeSetStorage('aos_consent', 'true');
        logWarn('Consent granted. Tracking enabled.');
      },
      revokeConsent: function() {
        safeSetStorage('aos_consent', 'false');
        logWarn('Consent revoked. Tracking disabled.');
      }
    };

    const preInitQueue = [];
    let isReady = false;

    // Retrieve project ID and optional API key from script tag attributes
    const scriptTag = document.currentScript || document.querySelector('script[data-project-id]');
    const projectId = scriptTag?.getAttribute('data-project-id');
    const apiKey = scriptTag?.getAttribute('data-api-key') || null;
    const customEndpoint = scriptTag?.getAttribute('data-endpoint') || null;

    if (customEndpoint) {
      ENDPOINT = customEndpoint;
    } else if (scriptTag && scriptTag.src) {
      try {
        const urlObj = new URL(scriptTag.src);
        ENDPOINT = urlObj.origin + '/api/events';
      } catch (e) {
        logWarn('Failed to parse script tag src URL', e);
      }
    }

    if (!projectId) {
      logWarn('Tracker loaded without a data-project-id attribute.');
      return;
    }

    // Generate a simple unique ID
    function generateId() {
      return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Safe storage wrappers handling SecurityErrors (e.g. blocked 3rd party cookies)
    const memoryStorage = new Map();
    function safeGetStorage(key) {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
        return memoryStorage.get(key) || null;
      } catch (e) {
        return memoryStorage.get(key) || null;
      }
    }

    function safeSetStorage(key, value) {
      memoryStorage.set(key, value);
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // Ignored
      }
    }

    // Manage identity and session
    function getVisitorId() {
      let vid = safeGetStorage('aos_vid');
      if (!vid) {
        vid = generateId();
        safeSetStorage('aos_vid', vid);
      }
      return vid;
    }

    function getSessionId() {
      let sid = safeGetStorage('aos_sid');
      let lastActive = safeGetStorage('aos_last_active');
      const now = Date.now();

      if (!sid || (lastActive && now - parseInt(lastActive, 10) > SESSION_TIMEOUT_MS)) {
        sid = generateId();
        safeSetStorage('aos_sid', sid);
      }

      safeSetStorage('aos_last_active', now.toString());
      return sid;
    }

    const visitorId = getVisitorId();
    let eventQueue = [];
    let flushTimer = null;
    let isFlushing = false;
    let retryBackoff = 1000;

    // Helper script loader
    function loadScript(src, callback) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = callback;
      s.onerror = (err) => logError('Failed to load script: ' + src, err);
      document.head.appendChild(s);
    }

    // ── Session Recording State ───────────────────────────────────────────────
    let recordingBuffer = [];
    let socket = null;
    let rrwebLoaded = false;
    let socketLoaded = false;

    // ── Scroll Attention Mapping State ────────────────────────────────────────
    const attentionMap = {};
    let attentionInterval = null;

    // ── Scroll Direction Tracking State ───────────────────────────────────────
    let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let lastScrollDirection = null;
    const directionShifts = [];

    function flushRecording() {
      if (recordingBuffer.length === 0) return;
      const payload = [...recordingBuffer];
      recordingBuffer = [];

      const url = ENDPOINT.replace('/events', '/sessions/' + getSessionId() + '/recording');
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(err => {
        logWarn('Failed to upload recording events', err);
        recordingBuffer.unshift(...payload);
      });
    }

    function startRecording() {
      if (!window.rrweb) return;
      try {
        window.rrweb.record({
          emit(event) {
            recordingBuffer.push(event);
            if (socket && socket.connected) {
              socket.emit('live-recording-event', {
                sessionId: getSessionId(),
                events: [event]
              });
            }
          },
          maskTextSelector: '.aos-mask, [data-aos-mask="true"]',
          maskInputSelector: '.aos-mask, [data-aos-mask="true"]',
          maskInputOptions: { password: true, email: true }
        });
        setInterval(flushRecording, 5000);
      } catch (recordErr) {
        logError('Failed to start rrweb recording', recordErr);
      }
    }

    function startSocket() {
      if (!window.io) return;
      try {
        const socketUrl = ENDPOINT.replace('/api/events', '');
        socket = window.io(socketUrl, {
          withCredentials: true
        });
        socket.on('connect', () => {
          logWarn('Connected to WebSocket server');
          if (recordingBuffer.length > 0) {
            socket.emit('live-recording-event', {
              sessionId: getSessionId(),
              events: [...recordingBuffer]
            });
          }
        });
      } catch (sockErr) {
        logError('Failed to connect socket.io client', sockErr);
      }
    }

    // ── Frustration Signals State ─────────────────────────────────────────────
    const recentClicks = [];
    let domMutatedRecently = false;
    
    // ── Mouse Move Tracking State ─────────────────────────────────────────────
    let mousePath = [];
    let lastMouseMoveTime = 0;
    
    // ── Scroll Depth Tracking State ───────────────────────────────────────────
    let maxScrollDepth = 0;
    let scrollThrottleTimer = null;

    function isTrackingAllowed() {
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1') {
        return false;
      }
      if (safeGetStorage('aos_consent') === 'false') {
        return false;
      }
      return true;
    }

    function trackEvent(type, data = {}) {
      if (!isTrackingAllowed()) return;
      try {
        const event = {
          projectId,
          visitorId,
          sessionId: getSessionId(),
          timestamp: new Date().toISOString(),
          type,
          url: window.location.href,
          userAgent: navigator.userAgent,
          data,
        };

        eventQueue.push(event);

        if (eventQueue.length >= BATCH_SIZE) {
          flush();
        }
      } catch (err) {
        logError('Failed to track event', err);
      }
    }

    function flush() {
      if (eventQueue.length === 0 || isFlushing) return;

      const payload = [...eventQueue];
      eventQueue = [];
      isFlushing = true;

      const headers = { 'Content-Type': 'text/plain' };
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      })
      .then(res => {
        if (!res.ok) throw new Error('HTTP status ' + res.status);
        retryBackoff = 1000; // Reset backoff on success
        isFlushing = false;
        
        // If there are more events queued while we were flushing, flush again
        if (eventQueue.length >= BATCH_SIZE) {
          setTimeout(flush, 0);
        }
      })
      .catch(err => {
        logWarn('Failed to flush events', err);
        // Restore failed events to the beginning of the queue
        eventQueue.unshift(...payload);
        isFlushing = false;

        // Exponential backoff
        retryBackoff = Math.min(retryBackoff * 2, MAX_RETRY_BACKOFF);
        
        // Ensure we don't clear existing timer, but prevent immediate retry storm
        clearInterval(flushTimer);
        flushTimer = setInterval(flush, Math.max(FLUSH_INTERVAL_MS, retryBackoff));
      });
    }

    function getSelector(element) {
      if (!element) return '';
      try {
        let selector = element.tagName.toLowerCase();
        if (element.id) {
          selector += `#${element.id}`;
        } else if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).join('.');
          if (classes) {
            selector += `.${classes}`;
          }
        }
        return selector;
      } catch(e) {
        return 'unknown';
      }
    }

    // ── SPA Route Tracking ────────────────────────────────────────────────────
    // Patch the History API so React/Vue/Next.js route changes (which don't
    // trigger a full page reload) still fire a page_view event.
    let lastTrackedUrl = '';

    function trackPageView() {
      const currentUrl = window.location.href;
      // Guard: don't fire twice for the same URL (e.g., replaceState on init)
      if (currentUrl === lastTrackedUrl) return;
      lastTrackedUrl = currentUrl;

      // ── Quickback Detection ──
      try {
        const historyJson = sessionStorage.getItem('aos_history');
        let historyStack = historyJson ? JSON.parse(historyJson) : [];
        const now = Date.now();

        if (historyStack.length > 1) {
          const prevPage = historyStack[historyStack.length - 2];
          if (prevPage.url === currentUrl) {
            const lastPage = historyStack[historyStack.length - 1];
            const timeSpent = now - lastPage.visitedAt;
            if (timeSpent < 5000) {
              trackEvent('quickback', { url: lastPage.url, timeSpentMs: timeSpent });
            }
            historyStack.pop();
          } else {
            historyStack.push({ url: currentUrl, visitedAt: now });
          }
        } else {
          historyStack.push({ url: currentUrl, visitedAt: now });
        }

        if (historyStack.length > 10) historyStack.shift();
        sessionStorage.setItem('aos_history', JSON.stringify(historyStack));
      } catch (historyErr) {
        // Ignored
      }

      trackEvent('page_view', {
        title: document.title,
        referrer: document.referrer,
      });
    }

    function patchHistoryMethod(method) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        // Fire after the state change has taken effect
        setTimeout(trackPageView, 0);
        return result;
      };
    }

    function interceptConsole() {
      const consoleMethods = ['log', 'warn', 'error'];
      consoleMethods.forEach(method => {
        const original = console[method];
        if (!original) return;
        console[method] = function (...args) {
          try {
            original.apply(console, args);
            
            const message = args.map(arg => {
              if (arg instanceof Error) return arg.message + '\n' + arg.stack;
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg);
                } catch (e) {
                  return String(arg);
                }
              }
              return String(arg);
            }).join(' ');

            if (message.includes('AnalyticsOS:')) return;

            trackEvent('custom', {
              name: 'console_log',
              payload: {
                level: method,
                message: message.substring(0, 500)
              }
            });
          } catch (e) {
            // Ignore
          }
        };
      });
    }

    // Set up listeners
    function init() {
      isReady = true;

      while (preInitQueue.length > 0) {
        const eventArgs = preInitQueue.shift();
        trackEvent(eventArgs[0], eventArgs[1]);
      }

      // Intercept console logs
      interceptConsole();

      const apiOrigin = new URL(ENDPOINT).origin;

      // ── rrweb and socket.io loaders ──
      loadScript(apiOrigin + '/vendor/rrweb-record.min.js', () => {
        rrwebLoaded = true;
        startRecording();
      });

      loadScript(apiOrigin + '/vendor/socket.io.min.js', () => {
        socketLoaded = true;
        startSocket();
      });

      // ── Page Refresh Detection ──
      try {
        const currentPath = window.location.pathname;
        const now = Date.now();
        const refreshDataJson = sessionStorage.getItem('aos_refreshes');
        let refreshData = refreshDataJson ? JSON.parse(refreshDataJson) : {};

        if (!refreshData[currentPath]) {
          refreshData[currentPath] = [];
        }

        refreshData[currentPath] = refreshData[currentPath].filter(t => now - t < 10000);
        refreshData[currentPath].push(now);

        sessionStorage.setItem('aos_refreshes', JSON.stringify(refreshData));

        if (refreshData[currentPath].length >= 2) {
          trackEvent('page_refresh_frustration', { path: currentPath });
        }
      } catch (refreshErr) {
        // Ignored
      }

      // ── Viewport Attention Mapping ──
      attentionInterval = setInterval(() => {
        try {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
          const pageHeight = document.documentElement.scrollHeight;
          const bottom = Math.min(scrollTop + viewportHeight, pageHeight);

          const startBand = Math.floor(scrollTop / 100);
          const endBand = Math.floor(bottom / 100);

          for (let i = startBand; i <= endBand; i++) {
            attentionMap[i] = (attentionMap[i] || 0) + 1;
          }
        } catch (attErr) {
          // Ignored
        }
      }, 1000);

      // Patch history methods for SPA navigation detection
      try {
        patchHistoryMethod('pushState');
        patchHistoryMethod('replaceState');
        window.addEventListener('popstate', trackPageView);
      } catch (historyErr) {
        logWarn('Failed to patch history API', historyErr);
      }

      // Track the initial page load
      trackPageView();

      if (window.MutationObserver && document.body) {
        const mo = new MutationObserver(() => {
          domMutatedRecently = true;
        });
        mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      }

      // Global error tracking
      window.addEventListener('error', (event) => {
        trackEvent('js_error', {
          message: event.message,
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });
      window.addEventListener('unhandledrejection', (event) => {
        trackEvent('js_error', {
          message: event.reason && event.reason.toString ? event.reason.toString() : 'Unhandled Promise Rejection',
        });
      });

      // Use a single passive listener on the document root
      document.addEventListener('click', (e) => {
        try {
          const target = e.target;
          if (!target) return;
          
          // Security: Prevent PII Leakage
          const tagName = target.tagName ? target.tagName.toLowerCase() : '';
          const isSensitive = target.closest && (
            target.closest('.sensitive, .no-track, [type="password"], [type="email"], [type="tel"], [type="hidden"]') ||
            target.closest('.aos-mask, [data-aos-mask="true"]')
          );
          
          let text = '';
          if (isSensitive) {
            text = '***';
          } else if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select') {
            text = (target.innerText || '').substring(0, 50).trim();
          }

          // Track horizontal coordinate relative to the body's center to ensure alignment across different screen sizes.
          const xOffset = Math.round(e.pageX - (document.body.clientWidth / 2));

          // Track offset relative to the clicked element itself for pixel-perfect element-relative mapping in heatmaps.
          let offsetX = 0;
          let offsetY = 0;
          try {
            const rect = target.getBoundingClientRect();
            offsetX = Math.round(e.clientX - rect.left);
            offsetY = Math.round(e.clientY - rect.top);
          } catch (rectErr) {
            // Fallback to 0 if bounding rect fails
          }

          trackEvent('click', {
            x: xOffset,
            y: e.pageY,
            offsetX: offsetX,
            offsetY: offsetY,
            selector: getSelector(target),
            text: text,
          });

          // Frustration: Rage clicks
          const now = Date.now();
          recentClicks.push({ x: e.pageX, y: e.pageY, time: now });
          while (recentClicks.length > 0 && now - recentClicks[0].time > 1000) {
            recentClicks.shift();
          }
          if (recentClicks.length >= 3) {
            const c0 = recentClicks[0];
            const c1 = recentClicks[recentClicks.length - 1];
            const dist = Math.sqrt(Math.pow(c1.x - c0.x, 2) + Math.pow(c1.y - c0.y, 2));
            if (dist < 50) {
              trackEvent('rage_click', { selector: getSelector(target) });
              recentClicks.length = 0;
            }
          }

          // Frustration: Dead clicks
          domMutatedRecently = false;
          const currentUrlBeforeClick = window.location.href;
          setTimeout(() => {
            const isInteractive = tagName === 'button' || tagName === 'a' || target.closest('button, a, input, select');
            if (isInteractive && !domMutatedRecently && currentUrlBeforeClick === window.location.href) {
              trackEvent('dead_click', { selector: getSelector(target) });
            }
          }, 2000);
        } catch (err) {
          logError('Click tracking error', err);
        }
      }, { capture: true, passive: true });

      function clearAreaOverlays() {
        const overlays = document.querySelectorAll('.aos-area-overlay');
        overlays.forEach(el => el.remove());
      }

      function createAreaOverlays(clicks) {
        clearAreaOverlays();
        if (!Array.isArray(clicks) || clicks.length === 0) return;

        const validClicks = clicks.map(c => {
          let el = null;
          if (c.selector && c.selector !== 'body' && c.selector !== 'html' && c.selector !== 'main' && c.selector !== 'unknown') {
            try {
              el = document.querySelector(c.selector);
            } catch (e) {}
          }
          return { ...c, el };
        }).filter(c => c.el !== null);

        if (validClicks.length === 0) return;

        const total = validClicks.reduce((sum, c) => sum + (c.count || 0), 0);

        validClicks.forEach(c => {
          const el = c.el;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;

          const overlay = document.createElement('div');
          overlay.className = 'aos-area-overlay';

          const pct = total > 0 ? ((c.count / total) * 100).toFixed(1) : '0.0';
          const ratio = total > 0 ? (c.count / total) : 0;

          let color = 'rgba(34, 197, 94, 0.3)'; // Low (Green)
          let border = 'rgba(34, 197, 94, 0.6)';
          if (ratio > 0.25) {
            color = 'rgba(239, 68, 68, 0.35)'; // High (Red)
            border = 'rgba(239, 68, 68, 0.65)';
          } else if (ratio > 0.08) {
            color = 'rgba(245, 158, 11, 0.35)'; // Medium (Orange/Yellow)
            border = 'rgba(245, 158, 11, 0.65)';
          }

          Object.assign(overlay.style, {
            position: 'absolute',
            left: `${rect.left + window.scrollX}px`,
            top: `${rect.top + window.scrollY}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            backgroundColor: color,
            border: `1.5px solid ${border}`,
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: '999999',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          });

          const label = document.createElement('div');
          Object.assign(label.style, {
            fontFamily: 'monospace, sans-serif',
            fontSize: '9px',
            fontWeight: 'bold',
            color: '#ffffff',
            backgroundColor: 'rgba(9, 9, 11, 0.85)',
            padding: '2px 4px',
            borderRadius: '2px',
            margin: '2px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          });
          label.innerText = `${c.count} clicks (${pct}%)`;
          overlay.appendChild(label);

          document.body.appendChild(overlay);
        });
      }

      // Listen for messages from parent window if running inside iframe
      if (window.self !== window.top) {
        window.addEventListener('message', (event) => {
          try {
            const { type, clicks } = event.data || {};
            if (type === 'aos-resolve' && Array.isArray(clicks)) {
              const resolvedPoints = clicks.map(click => {
                let el = null;
                if (click.selector && click.selector !== 'body' && click.selector !== 'html' && click.selector !== 'main' && click.selector !== 'unknown') {
                  try {
                    el = document.querySelector(click.selector);
                  } catch (selectorErr) {
                    // Ignore query selector errors
                  }
                }

                if (el) {
                  const rect = el.getBoundingClientRect();
                  const offX = typeof click.offsetX === 'number' ? click.offsetX : rect.width / 2;
                  const offY = typeof click.offsetY === 'number' ? click.offsetY : rect.height / 2;
                  return {
                    x: Math.round(rect.left + window.scrollX + offX),
                    y: Math.round(rect.top + window.scrollY + offY),
                    count: click.count || 1,
                  };
                } else {
                  // Fallback to page-center relative x and absolute y coordinates
                  const drawX = typeof click.x === 'number'
                    ? Math.round((document.body.clientWidth / 2) + click.x)
                    : 0;
                  return {
                    x: drawX,
                    y: click.y || 0,
                    count: click.count || 1,
                  };
                }
              });

              window.parent.postMessage({ type: 'aos-resolved', points: resolvedPoints }, '*');
            } else if (type === 'aos-area-resolve' && Array.isArray(clicks)) {
              createAreaOverlays(clicks);
            } else if (type === 'aos-clear-overlays') {
              clearAreaOverlays();
            }
          } catch (msgErr) {
            logError('Message resolution error', msgErr);
          }
        });

        // Set up dynamic iframe resizing
        const sendHeight = () => {
          try {
            const height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight,
              document.body.offsetHeight,
              document.documentElement.offsetHeight,
              document.body.clientHeight,
              document.documentElement.clientHeight
            );
            window.parent.postMessage({ type: 'aos-resize', height }, '*');
          } catch (heightErr) {
            // Ignore cross-origin issues or document access errors
          }
        };

        sendHeight();
        window.addEventListener('load', sendHeight);
        window.addEventListener('resize', sendHeight);

        if (window.MutationObserver && document.body) {
          const observer = new MutationObserver(sendHeight);
          observer.observe(document.body, { attributes: true, childList: true, subtree: true });
        }

        // Notify dashboard parent window that tracker is initialized and ready
        window.parent.postMessage({ type: 'aos-ready' }, '*');
      }

      // Mouse move sampling
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseMoveTime > 50) {
          const xOffset = Math.round(e.pageX - (document.body.clientWidth / 2));
          mousePath.push({ x: xOffset, y: e.pageY, t: now });
          lastMouseMoveTime = now;
          if (mousePath.length >= 50) {
            trackEvent('mouse_move', { path: [...mousePath] });
            mousePath = [];
          }
        }
      }, { passive: true });

      // Scroll depth tracking
      function calculateScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const depth = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;
        if (depth > maxScrollDepth) {
          maxScrollDepth = Math.min(depth, 100);
        }
      }
      document.addEventListener('scroll', () => {
        try {
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const currentDirection = scrollTop > lastScrollTop ? 'down' : 'up';
          const now = Date.now();

          if (currentDirection !== lastScrollDirection && Math.abs(scrollTop - lastScrollTop) > 10) {
            directionShifts.push(now);
            lastScrollDirection = currentDirection;

            while (directionShifts.length > 0 && now - directionShifts[0] > 3000) {
              directionShifts.shift();
            }

            if (directionShifts.length >= 4) {
              trackEvent('excessive_scroll', { scrollY: scrollTop });
              directionShifts.length = 0;
            }
          }
          lastScrollTop = scrollTop;
        } catch (scrollErr) {
          // Ignored
        }

        if (!scrollThrottleTimer) {
          scrollThrottleTimer = setTimeout(() => {
            calculateScrollDepth();
            scrollThrottleTimer = null;
          }, 500);
        }
      }, { passive: true });

      function flushPendingState() {
        if (maxScrollDepth > 0) {
          trackEvent('scroll_depth', { maxDepth: maxScrollDepth });
          maxScrollDepth = 0;
        }
        if (mousePath.length > 0) {
          trackEvent('mouse_move', { path: [...mousePath] });
          mousePath = [];
        }
        if (Object.keys(attentionMap).length > 0) {
          trackEvent('scroll_attention', { attentionMap: { ...attentionMap } });
          for (const key in attentionMap) {
            delete attentionMap[key];
          }
        }
        flush();
      }

      flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

      window.addEventListener('pagehide', () => {
        flushPendingState();
        flushRecording();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          flushPendingState();
          flushRecording();
        }
      });

      function initShopifyTracking() {
        if (typeof window === 'undefined' || !window.Shopify) return;
        
        try {
          logWarn('Shopify detected! Enabling e-commerce tracking.');
          
          const shopifyMeta = {
            shop: window.Shopify.shop || 'unknown',
            currency: window.Shopify.currency?.active || 'unknown',
            themeId: window.Shopify.theme?.id || 'unknown',
            themeName: window.Shopify.theme?.name || 'unknown'
          };
          trackEvent('shopify_metadata', shopifyMeta);

          document.addEventListener('submit', (e) => {
            try {
              const form = e.target;
              if (!form) return;
              
              const action = form.getAttribute('action') || '';
              const id = form.getAttribute('id') || '';
              
              if (action.indexOf('/cart/add') !== -1 || id.indexOf('AddToCartForm') !== -1 || form.querySelector('[name="add"]')) {
                const variantInput = form.querySelector('[name="id"]');
                const quantityInput = form.querySelector('[name="quantity"]');
                trackEvent('shopify_add_to_cart', {
                  variantId: variantInput ? variantInput.value : null,
                  quantity: quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1,
                  formAction: action
                });
              }
            } catch (submitErr) {
              // Ignored
            }
          }, { capture: true, passive: true });

          document.addEventListener('click', (e) => {
            try {
              const target = e.target;
              if (!target) return;
              
              const checkoutElement = target.closest && target.closest('[name="checkout"], [href*="/checkout"], .checkout');
              if (checkoutElement) {
                trackEvent('shopify_checkout_initiated', {
                  elementSelector: getSelector(checkoutElement)
                });
              }
            } catch (clickErr) {
              // Ignored
            }
          }, { capture: true, passive: true });

          if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function (...args) {
              const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) ? args[0].url : '';
              
              if (url && (url.indexOf('/cart/add') !== -1 || url.indexOf('/cart/change') !== -1 || url.indexOf('/cart/update') !== -1 || url.indexOf('/cart/clear') !== -1)) {
                let payload = null;
                try {
                  if (args[1] && args[1].body) {
                    if (typeof args[1].body === 'string') {
                      payload = JSON.parse(args[1].body);
                    } else if (args[1].body instanceof FormData) {
                      payload = {};
                      args[1].body.forEach((value, key) => { payload[key] = value; });
                    }
                  }
                } catch (pErr) {}

                trackEvent('shopify_cart_ajax', { url, payload });
              }
              return originalFetch.apply(this, args);
            };
          }

          if (window.XMLHttpRequest) {
            const originalOpen = window.XMLHttpRequest.prototype.open;
            window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
              if (typeof url === 'string' && (url.indexOf('/cart/add') !== -1 || url.indexOf('/cart/change') !== -1 || url.indexOf('/cart/update') !== -1 || url.indexOf('/cart/clear') !== -1)) {
                this.addEventListener('load', () => {
                  trackEvent('shopify_cart_ajax', { url, method });
                });
              }
              return originalOpen.apply(this, [method, url, ...args]);
            };
          }

        } catch (err) {
          logError('Failed to initialize Shopify tracking', err);
        }
      }

      // Expose global custom event API safely
      window.AnalyticsOS.track = (name, payload) => trackEvent('custom', { name, payload });

      // Run Shopify initializer
      initShopifyTracking();
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }

  } catch (fatalError) {
    // Ultimate fallback to ensure the host script never crashes
    logError('Fatal initialization error', fatalError);
  }
})();
