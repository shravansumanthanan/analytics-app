import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useSessions, type SessionFilters } from '../api/hooks';
import { Monitor, Phone, WarningCircle } from '@phosphor-icons/react';
import { FilterBar } from '../components/ui/FilterBar';

export function SessionsPage() {
  const [searchParams] = useSearchParams();
  const filters: SessionFilters = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    device: (searchParams.get('device') as any) || 'all',
    frustratedOnly: searchParams.get('frustratedOnly') === 'true',
    visitedPath: searchParams.get('visitedPath') || undefined,
    clickedSelector: searchParams.get('clickedSelector') || undefined,
    hasError: searchParams.get('hasError') === 'true' || undefined,
    customEvent: searchParams.get('customEvent') || undefined,
    includeBots: searchParams.get('includeBots') === 'true',
  };
  const { sessions, isLoading, isError } = useSessions(filters);

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-zinc-500">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p className="font-mono uppercase tracking-widest text-sm">Failed to load sessions</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 font-mono text-zinc-500">Loading sessions...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Sessions</h1>
        <p className="text-sm text-zinc-400 mt-1">Raw session logs and telemetry data.</p>
      </div>

      <FilterBar />

      <div className="border border-zinc-800 rounded-lg bg-zinc-950/50 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/50 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-normal">Session ID</th>
              <th className="px-6 py-4 font-normal">Visitor ID</th>
              <th className="px-6 py-4 font-normal">Environment</th>
              <th className="px-6 py-4 font-normal">Events</th>
              <th className="px-6 py-4 font-normal text-right">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-zinc-900/50 transition-colors group">
                <td className="px-6 py-4 font-mono text-zinc-300">
                  <Link to={`/sessions/${session.id}`} className="hover:text-blue-400 transition-colors">
                    {session.id.substring(0, 8)}...
                  </Link>
                </td>
                <td className="px-6 py-4 font-mono text-zinc-500">
                  {session.visitorId.substring(0, 8)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-zinc-400">
                    {session.userAgent.includes('Mobile') ? <Phone weight="duotone" /> : <Monitor weight="duotone" />}
                    <span className="text-xs truncate max-w-[200px]" title={session.userAgent}>
                      {session.userAgent.split(' ')[0]}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono rounded bg-zinc-800 text-zinc-300">
                    {session.eventCount || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-zinc-500">
                  {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 font-mono text-sm">
                  No sessions recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
