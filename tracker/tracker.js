(function () {
  const ENDPOINT = 'http://localhost:4000/api/events';
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

          trackEvent('click', {
            x: e.pageX,
            y: e.pageY,
            selector: getSelector(target),
            text: text,
          });
        } catch (err) {
          logError('Click tracking error', err);
        }
      }, { capture: true, passive: true });

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
