import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useSessions, type SessionFilters } from '../api/hooks';
import { 
  Monitor, Phone, WarningCircle, 
  Clock, User, Tag, 
  Eye, Flame, MagnifyingGlass, Sparkle
} from '@phosphor-icons/react';
import { FilterBar } from '../components/ui/FilterBar';

export function SessionsPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');

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

  const { sessions, isError } = useSessions(filters);

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-zinc-500 font-mono">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-zinc-300 font-bold uppercase tracking-widest text-sm mb-1">Failed to load sessions</h2>
        <p className="text-xs text-zinc-500">Check server connection and MongoDB availability.</p>
      </div>
    );
  }

  // Filter list by Session ID or Visitor ID search query
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.id.toLowerCase().includes(query) ||
      session.visitorId.toLowerCase().includes(query) ||
      (session.city && session.city.toLowerCase().includes(query)) ||
      (session.country && session.country.toLowerCase().includes(query))
    );
  });

  const getDeviceIcon = (userAgent: string, deviceType?: string) => {
    const ua = userAgent.toLowerCase();
    if (deviceType === 'mobile' || ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')) {
      return <span title="Mobile Device"><Phone className="text-purple-400" weight="duotone" /></span>;
    }
    return <span title="Desktop Device"><Monitor className="text-blue-400" weight="duotone" /></span>;
  };

  const getBrowserName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('chrome') && !ua.includes('chromium')) return 'Chrome';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('firefox')) return 'Firefox';
    return 'Browser';
  };

  const formatDuration = (sec?: number) => {
    if (sec === undefined || sec === null) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getFlag = (country?: string) => {
    if (!country) return '📍';
    const c = country.toLowerCase();
    if (c.includes('united states') || c === 'us') return '🇺🇸';
    if (c.includes('united kingdom') || c === 'uk' || c.includes('england')) return '🇬🇧';
    if (c.includes('japan') || c === 'jp') return '🇯🇵';
    if (c.includes('germany') || c === 'de') return '🇩🇪';
    if (c.includes('france') || c === 'fr') return '🇫🇷';
    if (c.includes('india') || c === 'in') return '🇮🇳';
    if (c.includes('canada') || c === 'ca') return '🇨🇦';
    if (c.includes('brazil') || c === 'br') return '🇧🇷';
    if (c.includes('australia') || c === 'au') return '🇦🇺';
    return '📍';
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 select-none">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Sessions</h1>
          <p className="text-sm text-zinc-400 mt-1">Detailed visitor streams, behavioral logs, and full playback histories.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono font-bold text-zinc-300">
            {filteredSessions.length}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            matching sessions
          </span>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          {/* ID Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search by Session ID, Visitor ID, City, or Country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-zinc-700 text-zinc-200 pl-11 pr-4 py-2.5 rounded-lg text-sm font-mono outline-none transition-colors placeholder-zinc-700"
            />
          </div>
        </div>

        <FilterBar />
      </div>

      {/* Sessions Grid / Table */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-950/40 overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-zinc-500 font-mono uppercase bg-zinc-900/30 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 font-normal">Session Info</th>
              <th className="px-6 py-4 font-normal">Location</th>
              <th className="px-6 py-4 font-normal">Device & Environment</th>
              <th className="px-6 py-4 font-normal">Activity & Duration</th>
              <th className="px-6 py-4 font-normal">Friction Tags</th>
              <th className="px-6 py-4 font-normal text-right">Last Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {filteredSessions.map((session) => {
              const isFrustrated = (session.frustrationCount && session.frustrationCount > 0) || session.id.includes('error');
              const isBouncing = session.bounce;
              const durationVal = session.sessionDuration ?? 0;
              const pageviewsVal = session.pageViewsCount ?? 1;

              return (
                <tr key={session.id} className="hover:bg-zinc-900/30 transition-colors group">
                  {/* Session Info */}
                  <td className="px-6 py-4 font-mono">
                    <div className="flex flex-col">
                      <Link 
                        to={`/sessions/${session.id}`} 
                        className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                      >
                        {session.id.substring(0, 8)}...
                        <Sparkle size={10} className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
                      </Link>
                      <span className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                        <User size={10} />
                        {session.visitorId.substring(0, 8)}
                      </span>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4">
                    {session.country ? (
                      <div className="flex flex-col">
                        <span className="text-zinc-300 text-xs font-bold flex items-center gap-1.5">
                          <span>{getFlag(session.country)}</span>
                          {session.city || 'Unknown City'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {session.country}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-600 text-xs font-mono">📍 Local Host</span>
                    )}
                  </td>

                  {/* Device & UserAgent */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-zinc-300">
                        {getDeviceIcon(session.userAgent, session.deviceType)}
                        <span className="text-xs font-semibold">
                          {getBrowserName(session.userAgent)}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-600 truncate max-w-[180px] font-mono mt-0.5" title={session.userAgent}>
                        {session.userAgent}
                      </span>
                    </div>
                  </td>

                  {/* Activity & Duration */}
                  <td className="px-6 py-4 font-mono">
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-200 flex items-center gap-1.5">
                        <Clock size={12} className="text-zinc-500" />
                        {formatDuration(durationVal)}
                      </span>
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Eye size={10} />
                        {pageviewsVal} pageview{pageviewsVal !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>

                  {/* Friction Tags */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {isFrustrated && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-red-950/50 text-red-400 border border-red-900/30">
                          <Flame size={10} />
                          Friction ({session.frustrationCount || 1})
                        </span>
                      )}
                      {isBouncing && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                          Bounce
                        </span>
                      )}
                      {session.utmSource && session.utmSource !== 'none' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono rounded bg-blue-950/30 text-blue-400 border border-blue-900/20">
                          <Tag size={9} />
                          utm: {session.utmSource}
                        </span>
                      )}
                      {session.isBot && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-950/40 text-amber-500 border border-amber-900/20">
                          Bot
                        </span>
                      )}
                      {!isFrustrated && !isBouncing && !session.isBot && (
                        <span className="text-zinc-600 text-xs font-mono">Smooth Journey</span>
                      )}
                    </div>
                  </td>

                  {/* Last Active */}
                  <td className="px-6 py-4 text-right text-zinc-500 font-mono text-xs">
                    {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}
            
            {filteredSessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 font-mono text-sm">
                  <WarningCircle size={32} className="mx-auto text-zinc-700 mb-3" />
                  No matching sessions found. Try clearing filters or seeding demo data in the Demo Center.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
