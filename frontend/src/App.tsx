import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SessionsPage } from './pages/SessionsPage';
import { SessionDetailsPage } from './pages/SessionDetailsPage';
import { HeatmapsPage } from './pages/HeatmapsPage';
import { OverviewPage } from './pages/OverviewPage';

function ErrorBoundary() {
  const error = useRouteError() as Error | { message?: string } | null;
  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[100dvh] text-zinc-500 font-mono bg-zinc-950">
      <h1 className="text-2xl text-red-500 mb-4 tracking-widest uppercase">Fatal Error</h1>
      <p className="mb-8 text-zinc-400">{error?.message || "An unexpected error occurred during rendering."}</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="px-6 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 transition-colors uppercase tracking-widest text-sm"
      >
        Reload Application
      </button>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'sessions',
        element: <SessionsPage />,
      },
      {
        path: 'sessions/:id',
        element: <SessionDetailsPage />,
      },
      {
        path: 'heatmaps',
        element: <HeatmapsPage />,
      },
      {
        path: 'events',
        element: <div className="p-8"><h1 className="text-2xl font-mono mb-4 text-zinc-50 tracking-tight">Events</h1><p className="text-zinc-400 text-sm">Events feed coming soon.</p></div>,
      }
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
