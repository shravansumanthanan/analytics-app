(function () {
  const ENDPOINT = 'https://analytics-app-production-f085.up.railway.app/api/events';
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
      }
    };

    const preInitQueue = [];
    let isReady = false;

    // Retrieve project ID from script tag attributes
    const scriptTag = document.currentScript || document.querySelector('script[data-project-id]');
    const projectId = scriptTag?.getAttribute('data-project-id');

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

    function trackEvent(type, data = {}) {
      try {
        const event = {
          projectId,
          visitorId,
          sessionId: getSessionId(),
          timestamp: new Date().toISOString(),
          type,
          url: window.location.href,
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

      fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
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

    // Set up listeners
    function init() {
      isReady = true;

      while (preInitQueue.length > 0) {
        const eventArgs = preInitQueue.shift();
        trackEvent(eventArgs[0], eventArgs[1]);
      }

      trackEvent('page_view', {
        title: document.title,
        referrer: document.referrer,
      });

      // Use a single passive listener on the document root
      document.addEventListener('click', (e) => {
        try {
          const target = e.target;
          if (!target) return;
          
          // Security: Prevent PII Leakage
          const tagName = target.tagName ? target.tagName.toLowerCase() : '';
          const isSensitive = target.closest && target.closest('.sensitive, .no-track, [type="password"], [type="email"], [type="tel"], [type="hidden"]');
          
          let text = '';
          if (!isSensitive && tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select') {
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
        } catch (err) {
          logError('Click tracking error', err);
        }
      }, { capture: true, passive: true });

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

      flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);

      window.addEventListener('pagehide', () => flush());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          flush();
        }
      });

      // Expose global custom event API safely
      window.AnalyticsOS.track = (name, payload) => trackEvent('custom', { name, payload });
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
