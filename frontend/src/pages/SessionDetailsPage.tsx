import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useSessionEvents, useSessions, useAnnotations } from '../api/hooks';
import { fetcher } from '../api/client';
import { SessionPlayer } from '../components/ui/SessionPlayer';
import {
  ArrowLeft, MouseLeftClick, Eye, Code, WarningCircle,
  Bug, ArrowUDownLeft, ArrowsDownUp, ArrowsClockwise,
  ChatCenteredText, Plus, ClockCountdown, Trash,
  Flag
} from '@phosphor-icons/react';
import type { AnalyticsEvent } from '../api/types';
import { formatRelativeUrl } from '../utils/url';

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { events } = useSessionEvents(id || null);
  const { sessions } = useSessions();
  const { annotations, mutate: mutateAnnotations } = useAnnotations(id || null);

  // Annotation form state
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  // Reference to get current player time
  const getCurrentTimeRef = useRef<(() => number) | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);

  // Poll current playhead time
  useEffect(() => {
    const interval = setInterval(() => {
      if (getCurrentTimeRef.current) {
        setCurrentTimeMs(getCurrentTimeRef.current());
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const session = sessions.find(s => s.id === id);
  const isLive = session ? (Date.now() - new Date(session.lastActiveAt).getTime() < 60000) : false;

  const sessionStartTime = events && events.length > 0 ? new Date(events[0].timestamp).getTime() : 0;

  // Logs synced with playback head
  const logsWithOffset = (events || [])
    .filter(e => e.type === 'custom' && e.data?.name === 'console_log')
    .map(e => ({
      offsetMs: new Date(e.timestamp).getTime() - sessionStartTime,
      level: (e.data as any)?.payload?.level || 'log',
      message: (e.data as any)?.payload?.message || '',
      timeStr: format(new Date(e.timestamp), 'HH:mm:ss.SSS')
    }));

  const activeLogs = logsWithOffset.filter(log => log.offsetMs <= currentTimeMs);

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText || !id) return;

    const currentMs = getCurrentTimeRef.current ? getCurrentTimeRef.current() : 0;

    setIsAddingNote(true);
    try {
      await fetcher(`/sessions/${id}/annotations`, {
        method: 'POST',
        body: JSON.stringify({
          note: noteText,
          author: noteAuthor || 'Anonymous',
          timestampMs: Math.round(currentMs),
        }),
      });
      setNoteText('');
      mutateAnnotations();
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setIsAddingNote(false);
    }
  }

  async function handleDeleteNote(annotationId: string) {
    try {
      await fetcher(`/annotations/${annotationId}`, { method: 'DELETE' });
      mutateAnnotations();
    } catch (err) {
      console.error('Failed to delete annotation', err);
    }
  }

  const formatOffset = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `+${m}m ${s}s` : `+${s}s`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye className="text-blue-400" weight="duotone" />;
      case 'click': return <MouseLeftClick className="text-purple-400" weight="duotone" />;
      case 'rage_click': return <WarningCircle className="text-red-500" weight="bold" />;
      case 'dead_click': return <MouseLeftClick className="text-zinc-500" weight="bold" />;
      case 'js_error': return <Bug className="text-red-600" weight="bold" />;
      case 'quickback': return <ArrowUDownLeft className="text-amber-500" weight="bold" />;
      case 'excessive_scroll': return <ArrowsDownUp className="text-purple-500" weight="bold" />;
      case 'page_refresh_frustration': return <ArrowsClockwise className="text-yellow-500" weight="bold" />;
      case 'custom': return <Code className="text-amber-400" weight="duotone" />;
      default: return <div className="w-2 h-2 rounded-full bg-zinc-650" />;
    }
  };

  const renderEventDetails = (event: AnalyticsEvent) => {
    switch (event.type) {
      case 'page_view':
        return (
          <div className="text-xs text-zinc-400 mt-1">
            Navigated to <span className="text-zinc-200 font-mono bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900">{formatRelativeUrl(event.url)}</span>
            {event.data?.referrer && (
              <div className="text-[10px] text-zinc-600 mt-1 truncate">
                Referrer: {formatRelativeUrl(event.data.referrer)}
              </div>
            )}
          </div>
        );
      case 'click':
        return (
          <div className="text-xs text-zinc-400 mt-1 space-y-1">
            <div>
              Clicked element <code className="text-zinc-200 font-mono text-[10px] bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900">{event.data?.selector}</code>
            </div>
            {event.data?.text && (
              <div className="text-[10px] text-zinc-500 italic">
                Inner text: "{event.data.text}"
              </div>
            )}
            <div className="text-[10px] text-zinc-600 font-mono">
              Coordinates: ({event.data?.x}px, {event.data?.y}px) · Element Offset: ({event.data?.offsetX || 0}px, {event.data?.offsetY || 0}px)
            </div>
          </div>
        );
      case 'rage_click':
        return (
          <div className="text-xs mt-1 space-y-1 bg-red-950/20 border border-red-900/30 p-2 rounded">
            <div className="text-red-400 font-bold flex items-center gap-1.5">
              <WarningCircle size={14} />
              Rage Click Detected
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Clicked the selector <code className="text-zinc-200 bg-zinc-950 px-1 rounded border border-zinc-900">{event.data?.selector}</code> 3+ times in under 1 second.
            </p>
          </div>
        );
      case 'dead_click':
        return (
          <div className="text-xs mt-1 space-y-1 bg-zinc-900/40 border border-zinc-850 p-2 rounded">
            <div className="text-zinc-500 font-bold flex items-center gap-1.5">
              <MouseLeftClick size={14} />
              Dead Click Detected
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Clicked on <code className="text-zinc-400 bg-zinc-950 px-1 rounded border border-zinc-900">{event.data?.selector}</code> but no page mutation occurred within 2 seconds.
            </p>
          </div>
        );
      case 'js_error':
        return (
          <div className="text-xs mt-1 space-y-1 bg-red-950/30 border border-red-900/40 p-2.5 rounded font-mono">
            <div className="text-red-500 font-bold flex items-center gap-1.5">
              <Bug size={14} />
              JavaScript Error thrown
            </div>
            <div className="text-zinc-300 font-semibold mt-1 break-all">{event.data?.message}</div>
            {event.data?.source && (
              <div className="text-[9px] text-zinc-500 mt-1">
                Source: {formatRelativeUrl(event.data.source)}:{event.data.lineno}
              </div>
            )}
          </div>
        );
      case 'quickback':
        return (
          <div className="text-xs mt-1 space-y-1 bg-amber-950/20 border border-amber-900/30 p-2 rounded">
            <div className="text-amber-400 font-bold flex items-center gap-1.5">
              <ArrowUDownLeft size={14} />
              Quickback Return
            </div>
            <p className="text-[10px] text-zinc-400 leading-normal">
              Navigated away, then pressed back to return to <span className="text-zinc-200 font-mono">{formatRelativeUrl(event.data?.url)}</span> in less than 5 seconds.
            </p>
          </div>
        );
      case 'excessive_scroll':
        return (
          <div className="text-xs mt-1 space-y-1 bg-purple-950/20 border border-purple-900/30 p-2 rounded">
            <div className="text-purple-400 font-bold flex items-center gap-1.5">
              <ArrowsDownUp size={14} />
              Excessive Scroll Hunting
            </div>
            <p className="text-[10px] text-zinc-400">
              User scrolling rapidly up and down at Y: {event.data?.scrollY}px. Indicates confusion or seeking behavior.
            </p>
          </div>
        );
      case 'page_refresh_frustration':
        return (
          <div className="text-xs mt-1 space-y-1 bg-yellow-950/20 border border-yellow-900/30 p-2 rounded">
            <div className="text-yellow-400 font-bold flex items-center gap-1.5">
              <ArrowsClockwise size={14} />
              Repetitive Refresh
            </div>
            <p className="text-[10px] text-zinc-400">
              User reloaded the path <span className="text-zinc-200 font-mono">{event.data?.path}</span> multiple times in succession.
            </p>
          </div>
        );
      case 'scroll_depth':
        return (
          <div className="text-xs text-zinc-500 font-mono mt-1">
            Reached scroll depth of <span className="text-zinc-400 font-bold">{event.data?.maxDepth}%</span> of page.
          </div>
        );
      case 'custom':
        return (
          <div className="text-xs text-zinc-400 mt-1 space-y-2">
            <div>
              Triggered custom tag event: <span className="text-amber-400 font-bold bg-amber-950/20 border border-amber-900/30 px-1.5 py-0.5 rounded">{event.data?.name}</span>
            </div>
            {event.data?.payload && (
              <pre className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-900 text-[10px] font-mono text-zinc-500 overflow-x-auto leading-relaxed max-w-full">
                {JSON.stringify(event.data.payload, null, 2)}
              </pre>
            )}
          </div>
        );
      default:
        return (
          <div className="text-xs text-zinc-500 font-mono mt-1">
            Payload: {JSON.stringify((event as any).data)}
          </div>
        );
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div>
        <Link 
          to="/sessions" 
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4 font-mono uppercase tracking-widest"
        >
          <ArrowLeft /> Back to Sessions
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-mono text-zinc-50 tracking-tight flex items-center gap-2">
              Session Inspector
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">ID: {id}</p>
          </div>
          
          {session && (
            <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 rounded-lg px-4 py-2 text-xs font-mono text-zinc-400">
              {session.country && (
                <span className="flex items-center gap-1">
                  <Flag size={12} /> {session.city}, {session.country}
                </span>
              )}
              {session.deviceType && (
                <span className="border-l border-zinc-800 pl-3 uppercase">
                  {session.deviceType}
                </span>
              )}
              {session.utmSource && (
                <span className="border-l border-zinc-800 pl-3">
                  campaign: {session.utmSource}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Event Timeline */}
        <div className="lg:col-span-5 relative max-h-[calc(100vh-14rem)] overflow-y-auto pr-3 space-y-6">
          
          <div className="sticky top-0 bg-zinc-950 py-2 border-b border-zinc-900 z-10 flex justify-between items-center text-xs font-mono text-zinc-500">
            <span>CHRONOLOGICAL USER JOURNEY</span>
            <span>{events.length} EVENTS</span>
          </div>

          <div className="relative pl-6 border-l border-zinc-850 space-y-6 pt-2 pb-2">
            {events.map((event, index) => {
              const offsetMs = new Date(event.timestamp).getTime() - sessionStartTime;
              const isActive = Math.abs(currentTimeMs - offsetMs) < 1500; // highlight close to player head
              
              return (
                <div key={event.id || index} className="relative group">
                  
                  {/* Visual timeline node */}
                  <button
                    onClick={() => setSeekTo(offsetMs)}
                    className={`absolute -left-[35px] top-0.5 p-1 rounded-full border transition-all ${
                      isActive 
                        ? 'bg-blue-600 border-blue-400 scale-110 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                        : 'bg-zinc-950 border-zinc-850 hover:border-zinc-600'
                    }`}
                    title="Click to seek player here"
                  >
                    {getEventIcon(event.type)}
                  </button>

                  {/* Interactive card content */}
                  <div 
                    onClick={() => setSeekTo(offsetMs)}
                    className={`border rounded-xl p-4 ml-2 transition-all cursor-pointer select-text ${
                      isActive
                        ? 'bg-blue-950/10 border-blue-900/60 shadow-lg shadow-blue-950/5'
                        : 'bg-zinc-900/30 border-zinc-850/60 hover:border-zinc-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mb-2">
                      <span className="uppercase tracking-widest font-bold">
                        {event.type}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="bg-zinc-850/50 px-1.5 py-0.5 rounded text-zinc-400">
                          {formatOffset(offsetMs)}
                        </span>
                        <span>
                          {format(new Date(event.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                    </div>

                    {renderEventDetails(event)}
                  </div>

                </div>
              );
            })}
            
            {events.length === 0 && (
              <div className="text-zinc-600 font-mono text-xs italic py-6">
                No chronological events recorded for this session.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Replayer + Collaboration drawer */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* rrweb player canvas */}
          <div className="bg-zinc-900/10 border border-zinc-800/60 p-6 rounded-xl relative">
            <SessionPlayer
              sessionId={id || ''}
              isLive={isLive}
              seekToTimestamp={seekTo}
              onGetCurrentTime={(fn) => { getCurrentTimeRef.current = fn; }}
              annotations={annotations}
            />
          </div>

          {/* Console logs terminal */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-900 bg-zinc-900/30">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-400 ml-2">
                Simulated Browser Console Output
              </h3>
              <span className="ml-auto text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                {activeLogs.length} / {logsWithOffset.length} logs
              </span>
            </div>
            
            <div className="p-4 h-48 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/90 select-text">
              {activeLogs.map((log, index) => {
                let colorClass = 'text-zinc-400';
                if (log.level === 'warn') colorClass = 'text-yellow-500';
                if (log.level === 'error') colorClass = 'text-red-500';
                
                return (
                  <div key={index} className={`flex items-start gap-2 ${colorClass}`}>
                    <span className="text-zinc-600 shrink-0">[{log.timeStr}]</span>
                    <span className="uppercase font-bold shrink-0">[{log.level}]</span>
                    <span className="break-all whitespace-pre-wrap">{log.message}</span>
                  </div>
                );
              })}
              {activeLogs.length === 0 && (
                <div className="text-zinc-700 italic text-center py-12">
                  No console outputs recorded at this playback offset.
                </div>
              )}
            </div>
          </div>

          {/* Collaborative Timeline Notes */}
          <div className="bg-zinc-900/10 border border-zinc-805/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/10">
              <ChatCenteredText size={16} className="text-amber-400" />
              <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-300">
                Timeline Markers
              </h3>
              <span className="ml-auto text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
                {annotations.length} note{annotations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Note items */}
            <div className="divide-y divide-zinc-900/80 max-h-48 overflow-y-auto">
              {annotations.map((ann) => (
                <div key={ann._id} className="flex items-start gap-3 px-5 py-3 hover:bg-zinc-900/20 group transition-colors">
                  <button
                    onClick={() => setSeekTo(ann.timestampMs)}
                    className="shrink-0 mt-0.5 flex items-center gap-1 text-[10px] font-mono text-amber-500 hover:text-amber-400 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/30 px-2 py-0.5 rounded transition-colors"
                  >
                    <ClockCountdown size={11} />
                    {(ann.timestampMs / 1000).toFixed(1)}s
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 leading-snug">{ann.note}</p>
                    <p className="text-[10px] text-zinc-650 font-mono mt-0.5">
                      by <span className="text-zinc-500">{ann.author}</span>
                      {' · '}
                      {format(new Date(ann.createdAt), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(ann._id)}
                    className="shrink-0 p-1 text-zinc-650 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              ))}
              {annotations.length === 0 && (
                <div className="px-5 py-8 text-center text-zinc-600 font-mono text-xs">
                  No notes pinned to this session yet. Use the tool below to tag timestamps.
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddNote} className="p-4 border-t border-zinc-900 bg-zinc-950/30 space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="w-32 shrink-0 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Add a timeline note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 font-mono"
                />
                <button
                  type="submit"
                  disabled={isAddingNote || !noteText}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-mono rounded text-xs uppercase tracking-widest transition-colors font-bold"
                >
                  <Plus size={14} weight="bold" />
                  {isAddingNote ? '...' : 'Add'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
