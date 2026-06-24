import { NavLink } from 'react-router-dom';
import { ChartLineUp, ListDashes, MapTrifold, Target, Sparkle, Funnel } from '@phosphor-icons/react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Overview', path: '/', icon: ChartLineUp },
  { name: 'Sessions', path: '/sessions', icon: ListDashes },
  { name: 'Heatmaps', path: '/heatmaps', icon: MapTrifold },
  { name: 'Events', path: '/events', icon: Target },
  { name: 'Funnels', path: '/funnels', icon: Funnel },
  { name: 'Demo Center', path: '/demo-center', icon: Sparkle },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col h-[100dvh] sticky top-0">
      <div className="p-6 h-16 flex items-center border-b border-zinc-800/50">
        <div className="flex items-center gap-3 text-zinc-50 font-mono tracking-wider text-sm">
          <div className="w-4 h-4 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
          <span>ANALYTICS_OS</span>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <div className="px-2 mb-4 mt-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Modules
          </p>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                isActive 
                  ? "bg-zinc-800/80 text-zinc-50" 
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
              )
            }
          >
            <item.icon className="w-4 h-4" weight="duotone" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <span className="text-xs font-mono text-zinc-400">US</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-300">Admin</span>
            <span className="text-[10px] text-zinc-600 font-mono">Workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
