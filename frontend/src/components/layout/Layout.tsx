import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useLiveEvents } from '../../api/hooks';

export function Layout() {
  useLiveEvents();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-blue-500/30">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
