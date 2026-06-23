import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { useSessions, type SessionFilters } from '../api/hooks';
import { WarningCircle } from '@phosphor-icons/react';
import { FilterBar } from '../components/ui/FilterBar';

export function OverviewPage() {
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
  };

  const { sessions, isLoading, isError } = useSessions(filters);

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-zinc-500">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p className="font-mono uppercase tracking-widest text-sm">Failed to load overview metrics</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 font-mono text-zinc-500">Loading metrics...</div>;
  }

  // 1. Calculate Average Session Duration
  const validSessions = sessions.filter(s => s.startedAt && s.lastActiveAt);
  const totalDuration = validSessions.reduce((acc, s) => {
    const start = new Date(s.startedAt).getTime();
    const end = new Date(s.lastActiveAt).getTime();
    return acc + Math.max(0, (end - start) / 1000);
  }, 0);
  const avgDurationSec = validSessions.length > 0 ? totalDuration / validSessions.length : 0;
  
  const m = Math.floor(avgDurationSec / 60);
  const s = Math.round(avgDurationSec % 60);
  const avgDurationStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

  // 2. Calculate Total Events Tracked
  const totalEvents = sessions.reduce((acc, s) => acc + (s.eventCount || 0), 0);
  const totalEventsStr = new Intl.NumberFormat().format(totalEvents);

  // 3. Aggregate Sessions Over Time (Mon-Sun based on startedAt)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  sessions.forEach(session => {
    if (session.startedAt) {
      const dayName = daysOfWeek[new Date(session.startedAt).getDay()];
      if (dayName in counts) {
        counts[dayName as keyof typeof counts]++;
      }
    }
  });

  const chartData = [
    { name: 'Mon', sessions: counts.Mon },
    { name: 'Tue', sessions: counts.Tue },
    { name: 'Wed', sessions: counts.Wed },
    { name: 'Thu', sessions: counts.Thu },
    { name: 'Fri', sessions: counts.Fri },
    { name: 'Sat', sessions: counts.Sat },
    { name: 'Sun', sessions: counts.Sun },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">System telemetry and active sessions.</p>
      </div>

      <FilterBar />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Total Sessions</p>
          <div className="text-4xl font-mono text-zinc-50">{sessions.length || 0}</div>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Avg Duration</p>
          <div className="text-4xl font-mono text-zinc-50">{avgDurationStr}</div>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Events Tracked</p>
          <div className="text-4xl font-mono text-zinc-50">{totalEventsStr}</div>
        </div>
      </div>

      <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
        <h2 className="text-sm font-mono text-zinc-400 mb-6 uppercase tracking-widest">Sessions Over Time</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                cursor={{ fill: '#27272a' }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fafa' }}
                itemStyle={{ color: '#3b82f6' }}
              />
              <Bar dataKey="sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
