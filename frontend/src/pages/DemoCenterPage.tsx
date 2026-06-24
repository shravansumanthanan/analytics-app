import { useState, useEffect } from 'react';
import { socket } from '../api/socket';
import { fetcher, API_BASE_URL } from '../api/client';
import { 
  Sparkle, Trash, Check, Copy, 
  Terminal, ShieldCheck, Database, ArrowSquareOut,
  AppWindow, Info
} from '@phosphor-icons/react';
import { useSessions } from '../api/hooks';
import { formatRelativeUrl } from '../utils/url';

export function DemoCenterPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const { mutate: mutateSessions } = useSessions();

  const trackerScriptUrl = `${API_BASE_URL.replace('/api', '')}/tracker.js`;
  const DEMO_STORE_URL = import.meta.env.VITE_DEMO_URL || (API_BASE_URL.includes('localhost') ? 'http://localhost:3001' : `${API_BASE_URL.replace('/api', '')}/demo/`);

  const integrationCode = `<!-- Paste this in your website's <head> -->
<script 
  src="${trackerScriptUrl}" 
  data-project-id="demo_project_001" 
  defer
></script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(integrationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    function onNewEvents(events: any[]) {
      if (Array.isArray(events)) {
        setLiveEvents(prev => [...events, ...prev].slice(0, 15));
      }
    }

    socket.on('new-events', onNewEvents);
    return () => {
      socket.off('new-events', onNewEvents);
    };
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res: any = await fetcher('/seed', { method: 'POST' });
      setSeedResult(`Seeded: ${res.counts.sessions} sessions, ${res.counts.events} events, ${res.counts.recordings} recordings.`);
      mutateSessions();
    } catch (err: any) {
      setSeedResult(`Error seeding: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all telemetry data?')) return;
    setIsClearing(true);
    setSeedResult(null);
    try {
      await fetcher('/clear', { method: 'POST' });
      setSeedResult('Database cleared completely.');
      setLiveEvents([]);
      mutateSessions();
    } catch (err: any) {
      setSeedResult(`Error clearing: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-[100vh]">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-mono text-zinc-50 tracking-tight flex items-center gap-3">
          <Sparkle weight="duotone" className="text-blue-500 animate-pulse" />
          Demo & Onboarding Center
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Get started, simulate sessions, and learn how Analytics OS works.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column - Steps & Seeding */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: Recruiter Quick Start */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-blue-950/50 border border-blue-900/50 text-blue-400 font-mono text-sm flex items-center justify-center font-bold">
                1
              </span>
              <h2 className="text-lg font-mono text-zinc-100">Seed Demo Telemetry</h2>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed">
              Before exploring the dashboards, populate the system with a complete set of mock user sessions. This generates clicks, scroll maps, rage clicks, JS errors, and conversions.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-5 py-2.5 rounded font-mono text-sm font-bold transition-colors"
              >
                <Database weight="bold" />
                {isSeeding ? 'Seeding Data...' : 'Seed Sample Data'}
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 disabled:border-zinc-900 disabled:text-zinc-600 text-red-400 px-5 py-2.5 rounded font-mono text-sm font-bold transition-colors"
              >
                <Trash weight="bold" />
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>

            {seedResult && (
              <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded text-xs font-mono text-zinc-300 animate-fade-in flex items-center gap-2">
                <Info size={14} className="text-blue-400" />
                {seedResult}
              </div>
            )}
          </div>

          {/* Step 2: Live Simulator Store */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-blue-950/50 border border-blue-900/50 text-blue-400 font-mono text-sm flex items-center justify-center font-bold">
                2
              </span>
              <h2 className="text-lg font-mono text-zinc-100">Test Live Session Recording</h2>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed">
              Launch the validation demo store. Move your mouse, click buttons, trigger simulated error states, and watch events stream directly into the dashboard in real-time.
            </p>

            <div className="pt-2">
              <a
                href={DEMO_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 px-5 py-2.5 rounded font-mono text-sm font-bold transition-all"
              >
                <AppWindow weight="bold" />
                Open Demo Store
                <ArrowSquareOut size={14} />
              </a>
            </div>
          </div>

          {/* Step 3: Embed On Your Own Website */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-blue-950/50 border border-blue-900/50 text-blue-400 font-mono text-sm flex items-center justify-center font-bold">
                3
              </span>
              <h2 className="text-lg font-mono text-zinc-100">Install Script On Any Website</h2>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed">
              To deploy Analytics OS on a real webpage, paste the tracking snippet into your page's HTML. The script automatically manages session cookies, browser identification, rage clicks, and DOM capture.
            </p>

            <div className="relative">
              <pre className="bg-black/80 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-300 overflow-x-auto pr-16 select-all">
                {integrationCode}
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Copy code"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Live Telemetry Stream */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            {/* Logs title */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800 bg-zinc-900/30">
              <Terminal size={18} className="text-blue-400 animate-pulse" />
              <h3 className="font-mono text-sm uppercase tracking-wider text-zinc-200">
                Live Ingestion Stream
              </h3>
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-950/50 border border-blue-900/50 text-[10px] font-mono text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                Listening
              </div>
            </div>

            {/* Stream body */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-3 bg-black/90">
              {liveEvents.map((evt, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-lg space-y-2 transition-all animate-slide-in duration-300"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold uppercase px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900/30">
                      {evt.type}
                    </span>
                    <span className="text-zinc-600">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-zinc-300 truncate font-mono text-xs">
                    <span className="text-zinc-500">URL: </span>
                    {formatRelativeUrl(evt.url)}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <div>
                      <span className="text-zinc-600">Sess: </span>
                      {evt.sessionId.substring(0, 8)}...
                    </div>
                    <div>
                      {evt.country && `📍 ${evt.city}, ${evt.country}`}
                    </div>
                  </div>
                </div>
              ))}
              
              {liveEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-center space-y-3 py-16">
                  <ShieldCheck size={40} className="text-zinc-800" />
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-500">No events received yet</p>
                    <p className="text-[10px] max-w-[250px] mx-auto text-zinc-600 leading-normal">
                      Click around the demo store, simulate custom tags, or post metrics to see telemetry logs float in instantly.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
