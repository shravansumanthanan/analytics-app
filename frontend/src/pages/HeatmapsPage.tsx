import { useState, useEffect, useRef } from 'react';
import { useTrackedUrls, useHeatmap } from '../api/hooks';
import { MapTrifold, Crosshair, WarningCircle } from '@phosphor-icons/react';

export function HeatmapsPage() {
  const { urls, isLoading: isLoadingUrls, isError: isErrorUrls } = useTrackedUrls();
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // Derive the active URL without causing immediate synchronous re-renders
  const activeUrl = selectedUrl || (urls && urls.length > 0 ? urls[0] : null);

  const { points, isLoading: isLoadingPoints, isError: isErrorPoints } = useHeatmap(activeUrl);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !points || points.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Auto-detect if coordinates are relative offsets from the center of the page
    const isRelative = points.some(p => p.x < 0) || points.every(p => Math.abs(p.x) < canvas.width / 2);

    // Draw thermal points
    points.forEach(point => {
      const drawX = isRelative ? (canvas.width / 2) + point.x : point.x;
      const drawY = point.y;

      const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 30);
      
      // Color grading based on click intensity
      if (point.count > 5) {
        // High density: Red core -> Orange -> Yellow -> Green -> Fade
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.85)');   // Red
        gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.65)'); // Orange
        gradient.addColorStop(0.6, 'rgba(234, 179, 8, 0.45)');   // Yellow
        gradient.addColorStop(0.8, 'rgba(34, 197, 94, 0.2)');   // Green
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');      // Blue/Fade
      } else if (point.count > 2) {
        // Medium density: Yellow core -> Green -> Blue -> Fade
        gradient.addColorStop(0, 'rgba(234, 179, 8, 0.75)');    // Yellow
        gradient.addColorStop(0.4, 'rgba(34, 197, 94, 0.45)');  // Green
        gradient.addColorStop(0.8, 'rgba(59, 130, 246, 0.2)');   // Blue
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        // Low density: Blue core -> Cyan -> Fade
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
  }, [points]);

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
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Target URL</span>
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
          <div className="absolute inset-0 overflow-auto flex justify-center bg-zinc-950/20">
            <div className="relative w-[1200px] h-[2000px] bg-white rounded-lg shadow-2xl overflow-hidden mt-4">
              {/* Webpage iframe loaded behind the heatmap canvas */}
              <iframe 
                src={activeUrl} 
                className="absolute inset-0 w-full h-full border-0 select-none pointer-events-none opacity-85"
                title="Heatmap Target Webpage"
              />
              {/* The canvas layered directly on top of the iframe */}
              <canvas 
                ref={canvasRef} 
                width={1200} 
                height={2000} 
                className="absolute inset-0 pointer-events-none z-10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
