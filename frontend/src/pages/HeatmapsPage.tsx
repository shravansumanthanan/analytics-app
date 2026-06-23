import { useState, useEffect, useRef } from 'react';
import { useTrackedUrls, useHeatmap, useSessions } from '../api/hooks';
import { MapTrifold, Crosshair, WarningCircle } from '@phosphor-icons/react';
import type { HeatmapPoint } from '../api/types';

export function HeatmapsPage() {
  const { urls, isLoading: isLoadingUrls, isError: isErrorUrls } = useTrackedUrls();
  const { sessions } = useSessions();
  
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('');
  
  // Derive the active URL without causing immediate synchronous re-renders
  const activeUrl = selectedUrl || (urls && urls.length > 0 ? urls[0] : null);

  const { points, isLoading: isLoadingPoints, isError: isErrorPoints } = useHeatmap(activeUrl, selectedSession || null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [resolvedPoints, setResolvedPoints] = useState<HeatmapPoint[]>([]);
  const [iframeHeight, setIframeHeight] = useState(2000);
  const [isIframeReady, setIsIframeReady] = useState(false);

  // Reset iframe state when URL or Session filter changes
  useEffect(() => {
    setIsIframeReady(false);
    setIframeHeight(2000);
    setResolvedPoints([]);
  }, [activeUrl, selectedSession]);

  // Setup messaging bridge with iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!event.data) return;

      if (event.data.type === 'aos-ready') {
        setIsIframeReady(true);
      }

      if (event.data.type === 'aos-resolved' && Array.isArray(event.data.points)) {
        setResolvedPoints(event.data.points);
      }

      if (event.data.type === 'aos-resize' && typeof event.data.height === 'number') {
        setIframeHeight(event.data.height);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Post points to iframe to resolve layout mapping
  useEffect(() => {
    if (!points || points.length === 0) {
      setResolvedPoints([]);
      return;
    }

    if (!isIframeReady) {
      // Fallback coordinate mapping assuming standard 1200px width layout
      const fallbackPoints = points.map(p => {
        const isRelativePoint = p.x < 0 || Math.abs(p.x) < 600;
        return {
          ...p,
          x: isRelativePoint ? 600 + p.x : p.x,
        };
      });
      setResolvedPoints(fallbackPoints);
      return;
    }

    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'aos-resolve',
        clicks: points
      }, '*');
    }
  }, [points, isIframeReady]);

  // Draw heatmap
  useEffect(() => {
    if (!canvasRef.current || !resolvedPoints || resolvedPoints.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw thermal points
    resolvedPoints.forEach(point => {
      const drawX = point.x;
      const drawY = point.y;

      // Skip invalid or out-of-bounds coordinates
      if (drawX < 0 || drawX > canvas.width || drawY < 0 || drawY > canvas.height) return;

      const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 30);
      
      // Color grading based on click intensity
      if (point.count > 5) {
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.85)');   // Red
        gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.65)'); // Orange
        gradient.addColorStop(0.6, 'rgba(234, 179, 8, 0.45)');   // Yellow
        gradient.addColorStop(0.8, 'rgba(34, 197, 94, 0.2)');   // Green
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');      // Blue/Fade
      } else if (point.count > 2) {
        gradient.addColorStop(0, 'rgba(234, 179, 8, 0.75)');    // Yellow
        gradient.addColorStop(0.4, 'rgba(34, 197, 94, 0.45)');  // Green
        gradient.addColorStop(0.8, 'rgba(59, 130, 246, 0.2)');   // Blue
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.7)');    // Blue
        gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.35)');  // Cyan
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      }
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 30, 0, 2 * Math.PI);
      ctx.fill();

      // Draw center core dot
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(drawX, drawY, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [resolvedPoints]);

  if (isErrorUrls) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-zinc-500 font-mono">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p>Failed to load tracked URLs.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-[100dvh] flex flex-col space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-mono text-zinc-50 tracking-tight flex items-center gap-3">
            <MapTrifold weight="duotone" className="text-purple-500" />
            Heatmaps
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Interaction density visualization.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Session</span>
          <select 
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-zinc-600 font-mono max-w-[200px]"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
          >
            <option value="">All Sessions</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.id.substring(0, 8)}... ({session.userAgent.split(' ')[0] || 'Unknown Device'})
              </option>
            ))}
          </select>

          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest ml-2">Target URL</span>
          <select 
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-zinc-600 font-mono"
            value={activeUrl || ''}
            onChange={(e) => setSelectedUrl(e.target.value)}
            disabled={isLoadingUrls || urls.length === 0}
          >
            {urls.length === 0 && <option value="">No tracked URLs</option>}
            {urls.map(url => (
              <option key={url} value={url}>{url}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 relative border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden flex items-center justify-center isolate">
        {/* Abstract background grid representing the page */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {!activeUrl ? (
          <div className="flex flex-col items-center text-zinc-500 gap-4">
            <Crosshair size={48} weight="duotone" className="opacity-50" />
            <p className="font-mono text-sm uppercase tracking-widest">Select a URL to view heatmap</p>
          </div>
        ) : isErrorPoints ? (
          <div className="flex flex-col items-center text-zinc-500 gap-4">
            <WarningCircle size={48} className="text-red-500 mb-4" />
            <p className="font-mono text-sm uppercase tracking-widest">Failed to load heatmap data</p>
          </div>
        ) : isLoadingPoints ? (
          <div className="font-mono text-zinc-500 animate-pulse">Rendering heatmap...</div>
        ) : (
          <div className="absolute inset-0 overflow-auto flex justify-center bg-zinc-950/20 animate-fade-in">
            <div 
              className="relative bg-white rounded-lg shadow-2xl overflow-hidden mt-4 transition-all duration-300 ease-out"
              style={{ width: '1200px', height: `${iframeHeight}px` }}
            >
              {/* Webpage iframe loaded behind the heatmap canvas */}
              <iframe 
                ref={iframeRef}
                src={activeUrl} 
                className="absolute inset-0 w-full h-full border-0 select-none pointer-events-none opacity-85"
                title="Heatmap Target Webpage"
              />
              {/* The canvas layered directly on top of the iframe */}
              <canvas 
                ref={canvasRef} 
                width={1200} 
                height={iframeHeight} 
                className="absolute inset-0 pointer-events-none z-10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
