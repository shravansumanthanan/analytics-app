import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useSessions } from '../api/hooks';
import { WarningCircle } from '@phosphor-icons/react';

export function OverviewPage() {
  const { sessions, isLoading, isError } = useSessions();

  // Simple mock aggregation for the chart
  const data = [
    { name: 'Mon', sessions: 12 },
    { name: 'Tue', sessions: 19 },
    { name: 'Wed', sessions: 15 },
    { name: 'Thu', sessions: 22 },
    { name: 'Fri', sessions: 30 },
    { name: 'Sat', sessions: 28 },
    { name: 'Sun', sessions: 18 },
  ];

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">System telemetry and active sessions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Total Sessions</p>
          <div className="text-4xl font-mono text-zinc-50">{sessions.length || 0}</div>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Avg Duration</p>
          <div className="text-4xl font-mono text-zinc-50">1m 12s</div>
        </div>
        <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Events Tracked</p>
          <div className="text-4xl font-mono text-zinc-50">1,402</div>
        </div>
      </div>

      <div className="p-6 rounded-lg border border-zinc-800 bg-zinc-950/50">
        <h2 className="text-sm font-mono text-zinc-400 mb-6 uppercase tracking-widest">Sessions Over Time</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
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
