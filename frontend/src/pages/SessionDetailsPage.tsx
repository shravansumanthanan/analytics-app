import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useSessionEvents } from '../api/hooks';
import { ArrowLeft, MouseLeftClick, Eye, Code, WarningCircle } from '@phosphor-icons/react';
import type { AnalyticsEvent } from '../api/types';

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { events, isLoading, isError } = useSessionEvents(id || null);

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

  const renderEventDetails = (event: AnalyticsEvent) => {
    switch (event.type) {
      case 'page_view':
        return (
          <div className="mt-2 text-sm text-zinc-400">
            Viewed <span className="text-zinc-300 font-mono">{event.data?.title || event.url}</span>
            {event.data?.referrer && <div className="text-xs mt-1 text-zinc-500">Ref: {event.data.referrer}</div>}
          </div>
        );
      case 'click':
        return (
          <div className="mt-2 text-sm text-zinc-400">
            Clicked <span className="text-zinc-300 font-mono">{event.data?.selector}</span>
            <div className="text-xs mt-1 font-mono text-zinc-500">
              x: {event.data?.x}, y: {event.data?.y}
            </div>
          </div>
        );
      case 'custom':
        return (
          <div className="mt-2 text-sm text-zinc-400">
            Action: <span className="text-zinc-300">{event.data?.name}</span>
            {event.data?.payload && (
              <pre className="mt-2 p-2 bg-zinc-950 rounded border border-zinc-800 text-[10px] font-mono text-zinc-500 overflow-x-auto">
                {JSON.stringify(event.data.payload, null, 2)}
              </pre>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye weight="duotone" className="text-blue-400" />;
      case 'click': return <MouseLeftClick weight="duotone" className="text-purple-400" />;
      case 'custom': return <Code weight="duotone" className="text-amber-400" />;
      default: return <div className="w-2 h-2 rounded-full bg-zinc-600" />;
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6 font-mono uppercase tracking-widest">
          <ArrowLeft /> Back to Sessions
        </Link>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Timeline</h1>
        <p className="text-sm text-zinc-400 mt-1 font-mono">Session ID: {id}</p>
      </div>

      <div className="relative pl-4 border-l border-zinc-800/80 space-y-8 mt-12">
        {events.map((event, index) => (
          <div key={event.id || index} className="relative">
            <div className="absolute -left-[33px] p-1 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center">
              {getEventIcon(event.type)}
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-4 ml-4 hover:border-zinc-700 transition-colors">
              <div className="flex justify-between items-start">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-2 py-0.5 rounded">
                  {event.type}
                </span>
                <span className="text-xs font-mono text-zinc-500">
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
    </div>
  );
}
