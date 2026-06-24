import { createBrowserRouter, RouterProvider, useRouteError } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { LoginModal } from './components/ui/LoginModal';
import { SessionsPage } from './pages/SessionsPage';
import { SessionDetailsPage } from './pages/SessionDetailsPage';
import { HeatmapsPage } from './pages/HeatmapsPage';
import { OverviewPage } from './pages/OverviewPage';
import { FunnelPage } from './pages/FunnelPage';
import { EventsPage } from './pages/EventsPage';
import { DemoCenterPage } from './pages/DemoCenterPage';
import {
  authEvents,
  AUTH_REQUIRED_EVENT,
  AUTH_INVALID_EVENT,
  setToken,
  getToken,
} from './api/client';

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
        element: <EventsPage />,
      },
      {
        path: 'funnels',
        element: <FunnelPage />,
      },
      {
        path: 'demo-center',
        element: <DemoCenterPage />,
      }
    ],
  },
]);

function App() {
  const [showLogin, setShowLogin] = useState(!getToken());
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    function onAuthRequired() {
      setAuthError(null);
      setShowLogin(true);
    }
    function onAuthInvalid() {
      setAuthError('Invalid password. Please try again.');
      setShowLogin(true);
    }

    authEvents.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
    authEvents.addEventListener(AUTH_INVALID_EVENT, onAuthInvalid);
    return () => {
      authEvents.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired);
      authEvents.removeEventListener(AUTH_INVALID_EVENT, onAuthInvalid);
    };
  }, []);

  function handleLogin(token: string) {
    setToken(token);
    setAuthError(null);
    setShowLogin(false);
  }

  return (
    <>
      {showLogin && <LoginModal onSuccess={handleLogin} error={authError} />}
      <RouterProvider router={router} />
    </>
  );
}

export default App;
