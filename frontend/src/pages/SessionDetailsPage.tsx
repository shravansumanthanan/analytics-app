import { useParams, Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { useSessionEvents, useSessions, useAnnotations } from '../api/hooks';
import { fetcher } from '../api/client';
import { SessionPlayer } from '../components/ui/SessionPlayer';
import {
  ArrowLeft, MouseLeftClick, Eye, Code, WarningCircle,
  Bug, ArrowUDownLeft, ArrowsDownUp, ArrowsClockwise,
  ChatCenteredText, Plus, ClockCountdown, Trash,
} from '@phosphor-icons/react';
import type { AnalyticsEvent } from '../api/types';

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { events, isLoading, isError } = useSessionEvents(id || null);
  const { sessions } = useSessions();
  const { annotations, mutate: mutateAnnotations } = useAnnotations(id || null);

  // Annotation form state
  const [noteText, setNoteText] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  // Reference to get current player time
  const getCurrentTimeRef = useRef<(() => number) | null>(null);

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-zinc-500">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p className="font-mono uppercase tracking-widest text-sm">Failed to load session timeline</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 font-mono text-zinc-500">Loading timeline...</div>;
  }

  const session = sessions.find(s => s.id === id);
  const isLive = session ? (Date.now() - new Date(session.lastActiveAt).getTime() < 60000) : false;

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

  const renderEventDetails = (event: AnalyticsEvent) => {
    switch (event.type) {
      case 'page_view':
        return (
          <div className="mt-1 text-sm text-zinc-400">
            Viewed <span className="text-zinc-300 font-mono">{event.data?.title || event.url}</span>
            {event.data?.referrer && <div className="text-xs mt-1 text-zinc-500">Ref: {event.data.referrer}</div>}
          </div>
        );
      case 'click':
        return (
          <div className="mt-1 text-sm text-zinc-400">
            Clicked <span className="text-zinc-300 font-mono">{event.data?.selector}</span>
            <div className="text-xs mt-1 font-mono text-zinc-500">
              x: {event.data?.x}, y: {event.data?.y}
            </div>
          </div>
        );
      case 'rage_click':
        return (
          <div className="mt-1 text-sm text-red-400 font-mono font-semibold">
            Rage Clicked on {event.data?.selector}
          </div>
        );
      case 'dead_click':
        return (
          <div className="mt-1 text-sm text-zinc-500 font-mono">
            Dead Click on {event.data?.selector}
          </div>
        );
      case 'js_error':
        return (
          <div className="mt-1 text-sm text-red-500 font-mono">
            <div className="font-semibold">{event.data?.message}</div>
            {event.data?.source && <div className="text-xs text-zinc-500 mt-0.5">{event.data.source}:{event.data.lineno}</div>}
          </div>
        );
      case 'quickback':
        return (
          <div className="mt-1 text-sm text-amber-400 font-mono">
            Quickback from <span className="text-zinc-300">{event.data?.url}</span> ({Math.round(event.data?.timeSpentMs / 100) / 10}s)
          </div>
        );
      case 'excessive_scroll':
        return (
          <div className="mt-1 text-sm text-purple-400 font-mono">
            Rapid scroll hunting at Y: {event.data?.scrollY}px
          </div>
        );
      case 'page_refresh_frustration':
        return (
          <div className="mt-1 text-sm text-yellow-400 font-mono">
            Repetitive page reload on <span className="text-zinc-300">{event.data?.path}</span>
          </div>
        );
      case 'scroll_depth':
        return (
          <div className="mt-1 text-xs text-zinc-500 font-mono">
            Reached max scroll depth of <span className="text-zinc-400">{event.data?.maxDepth}%</span>
          </div>
        );
      case 'custom':
        return (
          <div className="mt-1 text-sm text-zinc-400">
            Action: <span className="text-zinc-300">{event.data?.name}</span>
            {event.data?.payload && (
              <pre className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-500 overflow-x-auto">
                {JSON.stringify(event.data.payload, null, 2)}
              </pre>
            )}
          </div>
        );
      default:
        return (
          <div className="mt-1 text-xs text-zinc-500 font-mono">
            Event details: {JSON.stringify((event as any).data)}
          </div>
        );
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye weight="duotone" className="text-blue-400" />;
      case 'click': return <MouseLeftClick weight="duotone" className="text-purple-400" />;
      case 'rage_click': return <WarningCircle weight="bold" className="text-red-500" />;
      case 'dead_click': return <MouseLeftClick weight="bold" className="text-zinc-600" />;
      case 'js_error': return <Bug weight="bold" className="text-red-600" />;
      case 'quickback': return <ArrowUDownLeft weight="bold" className="text-amber-500" />;
      case 'excessive_scroll': return <ArrowsDownUp weight="bold" className="text-purple-500" />;
      case 'page_refresh_frustration': return <ArrowsClockwise weight="bold" className="text-yellow-500" />;
      case 'custom': return <Code weight="duotone" className="text-amber-400" />;
      default: return <div className="w-2 h-2 rounded-full bg-zinc-600" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6 font-mono uppercase tracking-widest">
          <ArrowLeft /> Back to Sessions
        </Link>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Session Details</h1>
        <p className="text-sm text-zinc-400 mt-1 font-mono">Session ID: {id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Timeline */}
        <div className="lg:col-span-5 relative pl-4 border-l border-zinc-800/80 space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2">
          {events.map((event, index) => (
            <div key={event.id || index} className="relative">
              <div className="absolute -left-[33px] p-1 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center">
                {getEventIcon(event.type)}
              </div>
              <div className="bg-zinc-900/40 border border-zinc-850/50 rounded-lg p-3 ml-4 hover:border-zinc-700/60 transition-colors">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-800/40 px-1.5 py-0.5 rounded">
                    {event.type}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                  </span>
                </div>
                {renderEventDetails(event)}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-zinc-500 font-mono text-sm ml-4">No events found for this session.</div>
          )}
        </div>

        {/* Right Column: Replayer + Annotations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Session Player */}
          <div className="bg-zinc-900/10 border border-zinc-800/60 p-6 rounded-xl">
            <SessionPlayer
              sessionId={id || ''}
              isLive={isLive}
              seekToTimestamp={seekTo}
              onGetCurrentTime={(fn) => { getCurrentTimeRef.current = fn; }}
              annotations={annotations}
            />
          </div>

          {/* Collaboration / Notes Panel */}
          <div className="bg-zinc-900/10 border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/60">
              <ChatCenteredText size={16} className="text-amber-400" />
              <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-300">
                Collaboration Notes
              </h3>
              <span className="ml-auto text-[10px] font-mono text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                {annotations.length} note{annotations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Annotation list */}
            <div className="divide-y divide-zinc-800/40 max-h-48 overflow-y-auto">
              {annotations.length === 0 ? (
                <div className="px-5 py-6 text-center text-zinc-600 font-mono text-xs">
                  No notes yet. Add one below to mark moments in the recording.
                </div>
              ) : (
                annotations.map((ann) => (
                  <div key={ann._id} className="flex items-start gap-3 px-5 py-3 hover:bg-zinc-900/30 group transition-colors">
                    <button
                      onClick={() => setSeekTo(ann.timestampMs)}
                      className="shrink-0 mt-0.5 flex items-center gap-1 text-[10px] font-mono text-amber-500 hover:text-amber-400 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-900/40 px-2 py-1 rounded transition-colors"
                      title="Seek to this moment"
                    >
                      <ClockCountdown size={11} />
                      {(ann.timestampMs / 1000).toFixed(1)}s
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 leading-snug">{ann.note}</p>
                      <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                        by <span className="text-zinc-500">{ann.author}</span>
                        {' · '}
                        {format(new Date(ann.createdAt), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(ann._id)}
                      className="shrink-0 p-1 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete note"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add note form */}
            <form onSubmit={handleAddNote} className="p-4 border-t border-zinc-800/60 space-y-3 bg-zinc-950/30">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="w-32 shrink-0 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-700 font-mono"
                />
                <input
                  type="text"
                  required
                  placeholder="Add a note at current playhead position..."
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
              <p className="text-[10px] text-zinc-700 font-mono">
                Note will be pinned to the current position in the player timeline.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
