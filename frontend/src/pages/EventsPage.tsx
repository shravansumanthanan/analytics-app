import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from '../utils/date';
import { useEventsList, type ExportEvent } from '../api/hooks';
import { WarningCircle, CaretLeft, CaretRight, Play } from '@phosphor-icons/react';

export function EventsPage() {
  const [page, setPage] = useState(1);
  const limit = 25;

  const { events, total, isLoading, isError } = useEventsList({ page, limit });

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-zinc-500">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p className="font-mono uppercase tracking-widest text-sm">Failed to load events feed</p>
      </div>
    );
  }

  if (isLoading && events.length === 0) {
    return <div className="p-8 font-mono text-zinc-500">Loading events stream...</div>;
  }

  const totalPages = Math.ceil(total / limit) || 1;

  function getBadgeStyles(type: string) {
    switch (type) {
      case 'page_view':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'click':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      case 'custom':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'js_error':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'rage_click':
      case 'dead_click':
      case 'quickback':
      case 'excessive_scroll':
      case 'page_refresh_frustration':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
    }
  }

  function renderEventDetails(event: ExportEvent) {
    switch (event.type) {
      case 'click':
      case 'rage_click':
      case 'dead_click':
        return (
          <span className="font-mono text-xs text-zinc-400">
            {event.text ? `"${event.text}" on ` : ''}
            <span className="text-zinc-600 font-semibold">{event.selector}</span>
          </span>
        );
      case 'js_error':
        return <span className="text-red-400 font-mono text-xs">{event.errorMessage}</span>;
      case 'scroll_depth':
        return <span className="text-zinc-400 font-mono text-xs">Reached {event.maxDepth}% depth</span>;
      case 'custom':
        return (
          <span className="text-emerald-400 font-mono text-xs">
            Payload: {event.text || 'tracked'}
          </span>
        );
      default:
        return <span className="text-zinc-600 font-mono text-xs">—</span>;
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Events Stream</h1>
        <p className="text-sm text-zinc-400 mt-1">Raw incoming telemetry event feed.</p>
      </div>

      <div className="border border-zinc-800 rounded-lg bg-zinc-950/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-normal">Timestamp</th>
                <th className="px-6 py-4 font-normal">Type</th>
                <th className="px-6 py-4 font-normal">URL Path</th>
                <th className="px-6 py-4 font-normal">Context Details</th>
                <th className="px-6 py-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {events.map((event) => {
                let urlPath = event.url;
                try {
                  urlPath = new URL(event.url).pathname;
                } catch {
                  // Fallback if not valid full URL
                }

                return (
                  <tr key={event.eventId} className="hover:bg-zinc-900/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500 whitespace-nowrap">
                      {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-mono uppercase rounded ${getBadgeStyles(event.type)}`}>
                        {event.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-zinc-300 truncate max-w-[200px]" title={event.url}>
                      {urlPath}
                    </td>
                    <td className="px-6 py-4 truncate max-w-[300px]" title={event.selector || event.errorMessage || ''}>
                      {renderEventDetails(event)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/sessions/${event.sessionId}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50 rounded transition-colors uppercase tracking-wider"
                      >
                        <Play size={12} weight="fill" />
                        Replay
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 font-mono text-sm">
                    No events captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/20 border-t border-zinc-800">
            <span className="text-xs font-mono text-zinc-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} events
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-400 transition-colors"
              >
                <CaretLeft size={16} />
              </button>
              <span className="text-xs font-mono text-zinc-400 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-zinc-800 hover:bg-zinc-900 disabled:opacity-40 disabled:hover:bg-transparent text-zinc-400 transition-colors"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
