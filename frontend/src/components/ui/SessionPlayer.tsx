import { useState, useEffect, useRef } from 'react';
import { useSessionRecording } from '../../api/hooks';
import { socket } from '../../api/socket';
import { WarningCircle, PlayCircle, Broadcast } from '@phosphor-icons/react';

interface SessionPlayerProps {
  sessionId: string;
  isLive: boolean;
  seekToTimestamp?: number | null;
  onGetCurrentTime?: (getTimeFn: () => number) => void;
  annotations?: any[];
}

function loadStyles(url: string) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function loadScript(url: string, callback: () => void) {
  const existing = document.querySelector(`script[src="${url}"]`);
  if (existing) {
    if ((window as any).rrwebPlayer || (window as any).rrweb) {
      callback();
    } else {
      existing.addEventListener('load', callback);
    }
    return;
  }
  const script = document.createElement('script');
  script.src = url;
  script.async = true;
  script.onload = callback;
  document.head.appendChild(script);
}

export function SessionPlayer({ sessionId, isLive, seekToTimestamp, onGetCurrentTime, annotations = [] }: SessionPlayerProps) {
  const { recordingEvents, isLoading, isError } = useSessionRecording(isLive ? null : sessionId);
  const [loaded, setLoaded] = useState(false);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const liveContainerRef = useRef<HTMLDivElement>(null);
  const replayerInstanceRef = useRef<any>(null);

  // Load replayer libraries
  useEffect(() => {
    if (isLive) {
      // Live mode uses raw rrweb Replayer
      loadScript('https://cdn.jsdelivr.net/npm/rrweb@latest/dist/rrweb.min.js', () => {
        setLoaded(true);
      });
    } else {
      // Historical mode uses rrweb-player with UI controls
      loadStyles('https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css');
      loadScript('https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js', () => {
        setLoaded(true);
      });
    }
  }, [isLive]);

  // Live WebSocket stream handler
  useEffect(() => {
    if (!isLive || !sessionId) return;

    // Reset live events
    setLiveEvents([]);

    socket.emit('join-session-room', sessionId);

    const handleLiveStream = (newEvents: any[]) => {
      setLiveEvents((prev) => {
        const updated = [...prev, ...newEvents];
        if (replayerInstanceRef.current) {
          newEvents.forEach((ev) => {
            try {
              replayerInstanceRef.current.addEvent(ev);
            } catch {
              // Ignore invalid live events
            }
          });
        }
        return updated;
      });
    };

    socket.on('live-recording-stream', handleLiveStream);

    return () => {
      socket.off('live-recording-stream', handleLiveStream);
      if (replayerInstanceRef.current) {
        try {
          replayerInstanceRef.current.destroy();
        } catch {
          // Ignore
        }
        replayerInstanceRef.current = null;
      }
    };
  }, [isLive, sessionId]);

  // Initialize live replayer
  useEffect(() => {
    if (!isLive || !loaded || !liveContainerRef.current) return;

    if (liveEvents.length > 0 && !replayerInstanceRef.current) {
      try {
        liveContainerRef.current.innerHTML = '';
        const replayer = new (window as any).rrweb.Replayer(liveEvents, {
          root: liveContainerRef.current,
          live: true,
          unpackFn: (e: any) => e, // rrweb-min fallback
        });
        replayer.startLive();
        replayerInstanceRef.current = replayer;
      } catch {
        console.error('Failed to init live replayer');
      }
    }
  }, [isLive, loaded, liveEvents]);

  // Initialize historical player
  useEffect(() => {
    if (isLive || !loaded || !playerRef.current || recordingEvents.length === 0) return;

    playerRef.current.innerHTML = '';

    try {
      const player = new (window as any).rrwebPlayer({
        target: playerRef.current,
        props: {
          events: recordingEvents,
          width: 550,
          height: 380,
          autoPlay: false,
        },
      });
      replayerInstanceRef.current = player;
    } catch {
      console.error('Failed to init rrweb-player');
    }
  }, [isLive, loaded, recordingEvents]);

  // Seek handler prop listener
  useEffect(() => {
    if (!isLive && replayerInstanceRef.current && typeof seekToTimestamp === 'number') {
      try {
        replayerInstanceRef.current.goto(seekToTimestamp);
      } catch {
        console.error('Failed to seek player');
      }
    }
  }, [seekToTimestamp, isLive]);

  // Expose current playhead time function
  useEffect(() => {
    if (onGetCurrentTime) {
      onGetCurrentTime(() => {
        if (isLive || !replayerInstanceRef.current) return 0;
        try {
          // In rrweb-player, player.player holds the Svelte component timer state
          return replayerInstanceRef.current.player?.playTime || replayerInstanceRef.current.replayer?.timer?.timeOffset || 0;
        } catch {
          return 0;
        }
      });
    }
  }, [loaded, isLive, onGetCurrentTime]);

  // Render annotations on timeline bar
  useEffect(() => {
    if (isLive || !playerRef.current || annotations.length === 0 || recordingEvents.length === 0) return;

    const timer = setTimeout(() => {
      // Find rrweb progress bar (e.g. element with class .rr-timeline)
      const timeline = playerRef.current?.querySelector('.rr-timeline') as HTMLElement;
      if (!timeline) return;

      // Clean existing custom dots to avoid duplicates
      timeline.querySelectorAll('.aos-timeline-marker').forEach(m => m.remove());

      // Recording duration
      const duration = recordingEvents[recordingEvents.length - 1].timestamp - recordingEvents[0].timestamp;
      if (duration <= 0) return;

      // Set timeline position relative
      if (window.getComputedStyle(timeline).position === 'static') {
        timeline.style.position = 'relative';
      }

      annotations.forEach((ann) => {
        const pct = (ann.timestampMs / duration) * 100;
        if (pct < 0 || pct > 100) return;

        const marker = document.createElement('div');
        marker.className = 'aos-timeline-marker';
        Object.assign(marker.style, {
          position: 'absolute',
          left: `${pct}%`,
          top: '50%',
          width: '6px',
          height: '6px',
          backgroundColor: '#f59e0b', // Yellow-500
          borderRadius: '50%',
          border: '1px solid #09090b',
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer',
          zIndex: '99',
        });
        marker.title = `[Note] ${ann.author}: ${ann.note}`;

        marker.addEventListener('click', (e) => {
          e.stopPropagation();
          if (replayerInstanceRef.current) {
            try {
              replayerInstanceRef.current.goto(ann.timestampMs);
            } catch {
              // Ignore
            }
          }
        });

        timeline.appendChild(marker);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLive, annotations, recordingEvents, loaded]);

  if (isError) {
    return (
      <div className="p-6 border border-zinc-800 bg-zinc-950/50 rounded-lg flex flex-col items-center justify-center text-zinc-500 h-[300px]">
        <WarningCircle size={40} className="text-red-500 mb-3" />
        <p className="font-mono text-xs uppercase tracking-wider">Failed to load recording</p>
      </div>
    );
  }

  if (isLoading || !loaded) {
    return (
      <div className="p-6 border border-zinc-800 bg-zinc-950/50 rounded-lg flex items-center justify-center text-zinc-500 h-[300px] font-mono text-sm animate-pulse">
        Initializing Player...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          {isLive ? <Broadcast size={18} className="text-red-500 animate-pulse" /> : <PlayCircle size={18} className="text-blue-500" />}
          {isLive ? 'Live Session Replay' : 'Session Recording Replay'}
        </h3>
        {isLive && (
          <span className="text-[10px] font-mono bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-900/50 uppercase tracking-widest animate-pulse">
            Live Streaming
          </span>
        )}
      </div>

      <div className="flex justify-center bg-zinc-950 border border-zinc-800 rounded-lg p-2 overflow-hidden shadow-inner">
        {isLive ? (
          <div className="w-[550px] h-[380px] flex flex-col justify-center items-center relative">
            <div ref={liveContainerRef} className="w-full h-full" />
            {liveEvents.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950">
                <Broadcast size={32} className="text-zinc-600 mb-2 animate-bounce" />
                <p className="font-mono text-xs uppercase tracking-wider">Waiting for live events...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-[550px] h-[380px] flex items-center justify-center">
            {recordingEvents.length > 0 ? (
              <div ref={playerRef} />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500">
                <PlayCircle size={32} className="text-zinc-700 mb-2" />
                <p className="font-mono text-xs uppercase tracking-wider">No DOM mutations recorded</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
