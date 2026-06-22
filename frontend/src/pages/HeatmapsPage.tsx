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

    // Draw points
    points.forEach(point => {
      const intensity = Math.min(point.count * 20, 100) / 100;
      
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 20);
      gradient.addColorStop(0, `rgba(168, 85, 247, ${intensity})`);
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');
      
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 20, 0, 2 * Math.PI);
      ctx.fill();

      // Draw center dot
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
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
          <div className="absolute inset-0 overflow-auto">
            <div className="relative w-[1920px] h-[2000px] bg-zinc-900/10">
              <canvas 
                ref={canvasRef} 
                width={1920} 
                height={2000} 
                className="absolute inset-0 pointer-events-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
