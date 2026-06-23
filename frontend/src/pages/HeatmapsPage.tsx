import { useState, useEffect, useRef } from 'react';
import { useTrackedUrls, useHeatmap, useSessions } from '../api/hooks';
import { 
  MapTrifold, Crosshair, WarningCircle, CursorClick, 
  SelectionBackground, Hourglass, Funnel 
} from '@phosphor-icons/react';
import type { HeatmapPoint } from '../api/types';

export function HeatmapsPage() {
  const { urls, isLoading: isLoadingUrls, isError: isErrorUrls } = useTrackedUrls();
  const { sessions } = useSessions();
  
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>('');
  
  // Heatmap Controls State
  const [heatmapType, setHeatmapType] = useState<'click' | 'area' | 'attention'>('click');
  const [convertedOnly, setConvertedOnly] = useState(false);
  const [goalType, setGoalType] = useState<'path' | 'event'>('path');
  const [goalValue, setGoalValue] = useState('');

  // Derive the active URL without causing immediate synchronous re-renders
  const activeUrl = selectedUrl || (urls && urls.length > 0 ? urls[0] : null);

  // Hook to fetch heatmap data (handles clicks / scroll attention based on type and conversion parameters)
  const { points, isLoading: isLoadingPoints, isError: isErrorPoints } = useHeatmap(
    activeUrl,
    heatmapType === 'attention'
      ? { type: 'attention', sessionId: selectedSession || null }
      : {
          type: 'click',
          sessionId: selectedSession || null,
          convertedOnly: convertedOnly,
          conversionPath: convertedOnly && goalType === 'path' ? goalValue : undefined,
          conversionEvent: convertedOnly && goalType === 'event' ? goalValue : undefined
        }
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [resolvedPoints, setResolvedPoints] = useState<HeatmapPoint[]>([]);
  const [iframeHeight, setIframeHeight] = useState(2000);
  const [isIframeReady, setIsIframeReady] = useState(false);

  // Reset iframe state when URL, Session, Type, or Goal filter changes
  useEffect(() => {
    setIsIframeReady(false);
    setIframeHeight(2000);
    setResolvedPoints([]);
    
    // Request clearing overlays in iframe if it was active
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
      } catch {
        // Ignored
      }
    }
  }, [activeUrl, selectedSession, heatmapType, convertedOnly, goalValue]);

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

  // Post points to iframe or handle local fallback
  useEffect(() => {
    const iframe = iframeRef.current;
    
    if (heatmapType === 'click') {
      if (!points || !Array.isArray(points) || points.length === 0) {
        setResolvedPoints([]);
        if (iframe && iframe.contentWindow && isIframeReady) {
          iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
        }
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

      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
        iframe.contentWindow.postMessage({
          type: 'aos-resolve',
          clicks: points
        }, '*');
      }
    } else if (heatmapType === 'area') {
      setResolvedPoints([]);
      if (iframe && iframe.contentWindow && isIframeReady) {
        if (points && Array.isArray(points) && points.length > 0) {
          iframe.contentWindow.postMessage({
            type: 'aos-area-resolve',
            clicks: points
          }, '*');
        } else {
          iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
        }
      }
    } else if (heatmapType === 'attention') {
      setResolvedPoints([]);
      if (iframe && iframe.contentWindow && isIframeReady) {
        iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
      }
    }
  }, [points, isIframeReady, heatmapType]);

  // Draw click heatmap or scroll attention gradient on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (heatmapType === 'click' && resolvedPoints && resolvedPoints.length > 0) {
      // Draw thermal points
      resolvedPoints.forEach(point => {
        const drawX = point.x;
        const drawY = point.y;

        if (drawX < 0 || drawX > canvas.width || drawY < 0 || drawY > canvas.height) return;

        const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 30);
        
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

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    } else if (heatmapType === 'attention' && points && typeof points === 'object' && !Array.isArray(points)) {
      // Draw attention map linear gradient
      const aggregatedMap = points as Record<string, number>;
      const counts = Object.values(aggregatedMap);
      
      if (counts.length > 0) {
        const maxCount = Math.max(...counts, 1);
        const numBands = Math.ceil(canvas.height / 100);
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        for (let i = 0; i < numBands; i++) {
          const stopPos = i / (numBands - 1 || 1);
          const count = aggregatedMap[i.toString()] || 0;
          const ratio = count / maxCount;

          let r = 59, g = 130, b = 246; // Blue (default, low attention)
          if (ratio > 0.6) {
            // Yellow to Red
            const t = (ratio - 0.6) / 0.4;
            r = Math.round(234 + t * (239 - 234));
            g = Math.round(179 + t * (68 - 179));
            b = Math.round(8 + t * (68 - 8));
          } else if (ratio > 0.2) {
            // Blue to Yellow
            const t = (ratio - 0.2) / 0.4;
            r = Math.round(59 + t * (234 - 59));
            g = Math.round(130 + t * (179 - 130));
            b = Math.round(246 + t * (8 - 246));
          }

          // Scale opacity based on ratio to overlay nicely
          const alpha = ratio * 0.55;
          gradient.addColorStop(stopPos, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw decorative fold lines
        const lines = [
          { pct: 0.25, label: 'Top Fold (25%)' },
          { pct: 0.50, label: 'Mid Page (50%)' },
          { pct: 0.75, label: 'Bottom Page (75%)' }
        ];

        lines.forEach(line => {
          const y = canvas.height * line.pct;

          // Draw dashed guide line
          ctx.beginPath();
          ctx.setLineDash([6, 4]);
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]); // Reset line dash

          // Draw pill background
          ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
          ctx.beginPath();
          ctx.roundRect(10, y - 10, 110, 20, 4);
          ctx.fill();

          // Draw text label
          ctx.fillStyle = '#f4f4f5';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(line.label, 15, y);
        });
      }
    }
  }, [resolvedPoints, points, heatmapType]);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-mono text-zinc-50 tracking-tight flex items-center gap-3">
            <MapTrifold weight="duotone" className="text-purple-500" />
            Heatmaps
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Interaction density and attention maps.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Target URL */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">URL</span>
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

          {/* Session Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Session</span>
            <select 
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-zinc-600 font-mono max-w-[180px]"
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
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-6 flex flex-col justify-start">
          
          {/* Heatmap Type Button Group */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Map Mode</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setHeatmapType('click')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
                  heatmapType === 'click'
                    ? 'bg-purple-950/40 border-purple-800 text-purple-200 shadow-md shadow-purple-950/20'
                    : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <CursorClick size={18} weight={heatmapType === 'click' ? 'fill' : 'regular'} />
                <span>Click Map</span>
              </button>
              
              <button
                onClick={() => setHeatmapType('area')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
                  heatmapType === 'area'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200 shadow-md shadow-emerald-950/20'
                    : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <SelectionBackground size={18} weight={heatmapType === 'area' ? 'fill' : 'regular'} />
                <span>Area Click Map</span>
              </button>

              <button
                onClick={() => setHeatmapType('attention')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-mono transition-all duration-200 ${
                  heatmapType === 'attention'
                    ? 'bg-blue-950/40 border-blue-800 text-blue-200 shadow-md shadow-blue-950/20'
                    : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <Hourglass size={18} weight={heatmapType === 'attention' ? 'fill' : 'regular'} />
                <span>Attention Map</span>
              </button>
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Conversion Segment filters (Hidden on Attention Map since it focuses on vertical view time) */}
          {heatmapType !== 'attention' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Funnel size={14} className="text-zinc-400" />
                  Goal Filters
                </h3>
                <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Conversion
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 font-mono select-none">
                <input
                  type="checkbox"
                  checked={convertedOnly}
                  onChange={(e) => setConvertedOnly(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-purple-600 focus:ring-purple-800 focus:ring-offset-zinc-900 w-4 h-4"
                />
                <span>Converting Sessions Only</span>
              </label>

              {convertedOnly && (
                <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-lg animate-fade-in space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Goal Metric</span>
                    <div className="flex rounded border border-zinc-800 overflow-hidden text-xs font-mono">
                      <button
                        onClick={() => { setGoalType('path'); setGoalValue(''); }}
                        className={`flex-1 py-1 text-center border-r border-zinc-800 transition-colors ${
                          goalType === 'path' ? 'bg-zinc-850 text-zinc-200' : 'bg-transparent text-zinc-500'
                        }`}
                      >
                        Destination
                      </button>
                      <button
                        onClick={() => { setGoalType('event'); setGoalValue(''); }}
                        className={`flex-1 py-1 text-center transition-colors ${
                          goalType === 'event' ? 'bg-zinc-850 text-zinc-200' : 'bg-transparent text-zinc-500'
                        }`}
                      >
                        Custom Event
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {goalType === 'path' ? 'URL Substring' : 'Event Name'}
                    </span>
                    <input
                      type="text"
                      value={goalValue}
                      onChange={(e) => setGoalValue(e.target.value)}
                      placeholder={goalType === 'path' ? '/success' : 'checkout_completed'}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend Details */}
          <div className="flex-1 flex flex-col justify-end space-y-3">
            <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Density Legend</h4>
            <div className="p-3 bg-zinc-950/30 border border-zinc-850/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">High Density</span>
                <span className="w-3 h-3 rounded-full bg-red-500 border border-red-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Medium Density</span>
                <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Low Density</span>
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Visual Map Canvas Container */}
        <div className="lg:col-span-3 relative border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden flex items-center justify-center isolate">
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
              <div 
                className="relative bg-white rounded-lg shadow-2xl overflow-hidden mt-4 mb-4 transition-all duration-300 ease-out"
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
                {heatmapType !== 'area' && (
                  <canvas 
                    ref={canvasRef} 
                    width={1200} 
                    height={iframeHeight} 
                    className="absolute inset-0 pointer-events-none z-10"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
