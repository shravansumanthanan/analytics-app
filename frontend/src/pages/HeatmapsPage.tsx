import { useState, useEffect, useRef, useMemo } from 'react';
import { useTrackedUrls, useHeatmap, useSessions } from '../api/hooks';
import { 
  MapTrifold, Crosshair, WarningCircle, CursorClick, 
  SelectionBackground, Hourglass, Funnel
} from '@phosphor-icons/react';
import type { HeatmapPoint } from '../api/types';
import { formatRelativeUrl } from '../utils/url';

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

  // Tooltip inspect state
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Derive the active URL without causing immediate synchronous re-renders
  const activeUrl = selectedUrl || (urls && urls.length > 0 ? urls[0] : null);

  // Hook to fetch heatmap data (handles clicks / scroll attention based on type and conversion parameters)
  const { points: rawPoints, isLoading: isLoadingPoints, isError: isErrorPoints } = useHeatmap(
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

  // Aggregate clicks by rounding coordinates to create hotspots
  const points = Array.isArray(rawPoints) ? (() => {
    const aggregationMap = new Map<string, any>();
    
    rawPoints.forEach(point => {
      // Round coordinates to nearest 10 pixels to create clusters
      const roundedX = Math.round(point.x / 10) * 10;
      const roundedY = Math.round(point.y / 10) * 10;
      const key = `${roundedX},${roundedY},${point.selector || 'unknown'}`;
      
      if (aggregationMap.has(key)) {
        const existing = aggregationMap.get(key);
        existing.count += 1;
      } else {
        aggregationMap.set(key, {
          x: roundedX,
          y: roundedY,
          offsetX: point.offsetX,
          offsetY: point.offsetY,
          selector: point.selector,
          count: 1
        });
      }
    });
    
    return Array.from(aggregationMap.values());
  })() : rawPoints;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [resolvedPoints, setResolvedPoints] = useState<HeatmapPoint[]>([]);
  const [iframeHeight, setIframeHeight] = useState(1500);
  const [isIframeReady, setIsIframeReady] = useState(false);

  // Render-time state reset when URL or filters change
  const [prevUrl, setPrevUrl] = useState(activeUrl);
  const [prevSession, setPrevSession] = useState(selectedSession);
  const [prevType, setPrevType] = useState(heatmapType);
  const [prevConverted, setPrevConverted] = useState(convertedOnly);
  const [prevGoal, setPrevGoal] = useState(goalValue);

  if (
    activeUrl !== prevUrl ||
    selectedSession !== prevSession ||
    heatmapType !== prevType ||
    convertedOnly !== prevConverted ||
    goalValue !== prevGoal
  ) {
    setPrevUrl(activeUrl);
    setPrevSession(selectedSession);
    setPrevType(heatmapType);
    setPrevConverted(convertedOnly);
    setPrevGoal(goalValue);
    setIsIframeReady(false);
    setIframeHeight(1500);
    setResolvedPoints([]);
    setHoveredPoint(null);
  }

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
        if (iframe && iframe.contentWindow && isIframeReady) {
          iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
        }
        return;
      }

      if (isIframeReady && iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
        iframe.contentWindow.postMessage({
          type: 'aos-resolve',
          clicks: points
        }, '*');
      }
    } else if (heatmapType === 'area') {
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
      if (iframe && iframe.contentWindow && isIframeReady) {
        iframe.contentWindow.postMessage({ type: 'aos-clear-overlays' }, '*');
      }
    }
  }, [points, isIframeReady, heatmapType]);

  const resolvedPointsToRender = useMemo(() => {
    return isIframeReady ? resolvedPoints : (
      heatmapType === 'click' && points && Array.isArray(points) ? points.map(p => {
        const isRelativePoint = p.x < 0 || Math.abs(p.x) < 600;
        return {
          ...p,
          x: isRelativePoint ? 600 + p.x : p.x,
        };
      }) : []
    );
  }, [isIframeReady, resolvedPoints, heatmapType, points]);

  // Draw click heatmap or scroll attention gradient on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (heatmapType === 'click' && resolvedPointsToRender && resolvedPointsToRender.length > 0) {
      // Draw thermal points
      resolvedPointsToRender.forEach(point => {
        const drawX = point.x;
        const drawY = point.y;

        if (drawX < 0 || drawX > canvas.width || drawY < 0 || drawY > canvas.height) return;

        const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, 35);
        
        // Adjust thresholds for better color distribution with low-count data
        if (point.count >= 3) {
          // High density - Red/Orange
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.9)');   // Red
          gradient.addColorStop(0.3, 'rgba(245, 158, 11, 0.7)'); // Orange
          gradient.addColorStop(0.6, 'rgba(234, 179, 8, 0.5)');   // Yellow
          gradient.addColorStop(0.8, 'rgba(34, 197, 94, 0.25)');   // Green
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');      // Blue/Fade
        } else if (point.count === 2) {
          // Medium density - Yellow/Orange
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.85)');    // Orange
          gradient.addColorStop(0.4, 'rgba(234, 179, 8, 0.6)');    // Yellow
          gradient.addColorStop(0.7, 'rgba(34, 197, 94, 0.3)');  // Green
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        } else {
          // Low density - Blue/Cyan
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.75)');    // Blue
          gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.4)');  // Cyan
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
        }
        
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(drawX, drawY, 35, 0, 2 * Math.PI);
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(drawX, drawY, 3, 0, 2 * Math.PI);
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
  }, [resolvedPointsToRender, points, heatmapType]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || heatmapType !== 'click') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find any points close to coordinates (e.g. 20 pixels radius)
    const match = resolvedPointsToRender.find(p => {
      const dist = Math.sqrt(Math.pow(p.x - mouseX, 2) + Math.pow(p.y - mouseY, 2));
      return dist < 20;
    });

    if (match) {
      setHoveredPoint(match);
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredPoint(null);
  };

  if (isErrorUrls) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-zinc-500 font-mono">
        <WarningCircle size={48} className="text-red-500 mb-4" />
        <p>Failed to load tracked URLs.</p>
      </div>
    );
  }

  // Calculate page statistics
  const totalPageClicks = points && Array.isArray(points)
    ? points.reduce((sum, p) => sum + (p.count || 1), 0)
    : 0;
  
  const distinctElements = points && Array.isArray(points)
    ? new Set(points.map(p => p.selector)).size
    : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto h-[100dvh] flex flex-col space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-mono text-zinc-50 tracking-tight flex items-center gap-3">
            <MapTrifold weight="duotone" className="text-purple-500" />
            Heatmaps
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Overlay interaction densities and scroll retention folds visually.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Target URL */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Target Path</span>
            <select 
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-zinc-600 font-mono"
              value={activeUrl || ''}
              onChange={(e) => setSelectedUrl(e.target.value)}
              disabled={isLoadingUrls || urls.length === 0}
            >
              {urls.length === 0 && <option value="">No tracked URLs</option>}
              {urls.map(url => (
                <option key={url} value={url}>{formatRelativeUrl(url)}</option>
              ))}
            </select>
          </div>

          {/* Session Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">User Session</span>
            <select 
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded px-3 py-1.5 focus:outline-none focus:border-zinc-600 font-mono max-w-[180px]"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.id.substring(0, 8)}... ({session.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-5 flex flex-col justify-start overflow-y-auto">
          
          {/* Page statistics card */}
          {activeUrl && heatmapType !== 'attention' && (
            <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-lg space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Page Click Telemetry</span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono text-zinc-400">
                <div>
                  <span className="text-zinc-600 block text-[9px] uppercase">Total Clicks</span>
                  <span className="text-zinc-200 text-lg font-bold">{totalPageClicks}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block text-[9px] uppercase">Selectors</span>
                  <span className="text-zinc-200 text-lg font-bold">{distinctElements}</span>
                </div>
              </div>
            </div>
          )}

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
                <span>Click Heatmap</span>
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
                <span>Area Maps</span>
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
                <span>Scroll Attention</span>
              </button>
            </div>
          </div>

          <hr className="border-zinc-850" />

          {/* Conversion Segment filters */}
          {heatmapType !== 'attention' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Funnel size={14} className="text-zinc-400" />
                  Goal Filters
                </h3>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 font-mono select-none">
                <input
                  type="checkbox"
                  checked={convertedOnly}
                  onChange={(e) => setConvertedOnly(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-purple-600 focus:ring-purple-800 focus:ring-offset-zinc-900 w-4 h-4"
                />
                <span>Converted Only</span>
              </label>

              {convertedOnly && (
                <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-850 rounded-lg animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Goal Type</span>
                    <div className="flex rounded border border-zinc-800 overflow-hidden text-xs font-mono">
                      <button
                        onClick={() => { setGoalType('path'); setGoalValue(''); }}
                        className={`flex-1 py-1 text-center border-r border-zinc-800 transition-colors ${
                          goalType === 'path' ? 'bg-zinc-850 text-zinc-200' : 'bg-transparent text-zinc-500'
                        }`}
                      >
                        Path
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
                      {goalType === 'path' ? 'Destination Path' : 'Event Key'}
                    </span>
                    <input
                      type="text"
                      value={goalValue}
                      onChange={(e) => setGoalValue(e.target.value)}
                      placeholder={goalType === 'path' ? '/success' : 'subscribe'}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-700 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Density legend */}
          <div className="pt-4 border-t border-zinc-850 space-y-3">
            <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Density Legend</h4>
            <div className="p-3 bg-zinc-950/30 border border-zinc-850 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">High (3+ clicks)</span>
                <span className="w-3 h-3 rounded-full bg-red-500 border border-red-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Medium (2 clicks)</span>
                <span className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-500">Low (1 click)</span>
                <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Visual Map Canvas Container */}
        <div className="lg:col-span-3 relative border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden flex items-center justify-center isolate">
          {/* Abstract background grid */}
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
              <p className="font-mono text-sm uppercase tracking-widest animate-pulse">Select a URL to render heatmap</p>
            </div>
          ) : isErrorPoints ? (
            <div className="flex flex-col items-center text-zinc-500 gap-4">
              <WarningCircle size={48} className="text-red-500 mb-4" />
              <p className="font-mono text-sm uppercase tracking-widest">Failed to load heatmap data</p>
            </div>
          ) : isLoadingPoints ? (
            <div className="font-mono text-zinc-500 animate-pulse">Querying coordinates...</div>
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
                  sandbox="allow-scripts allow-same-origin"
                />
                
                {/* The canvas layered directly on top of the iframe */}
                {heatmapType !== 'area' && (
                  <canvas 
                    ref={canvasRef} 
                    width={1200} 
                    height={iframeHeight} 
                    className="absolute inset-0 z-10 cursor-crosshair"
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={handleCanvasMouseLeave}
                  />
                )}

                {/* Floating canvas hover inspector tooltip */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-300 shadow-2xl z-20 pointer-events-none max-w-[280px] leading-normal"
                    style={{ left: `${tooltipPos.x + 15}px`, top: `${tooltipPos.y + 15}px` }}
                  >
                    <div className="font-bold text-purple-400">Selector:</div>
                    <code className="text-zinc-200 break-all block bg-zinc-900 p-1 rounded border border-zinc-850 my-1">{hoveredPoint.selector || 'unknown element'}</code>
                    <div className="flex justify-between items-center mt-2 border-t border-zinc-900 pt-1">
                      <span>Total Clicks:</span>
                      <span className="text-zinc-100 font-bold bg-zinc-900 px-1.5 rounded">{hoveredPoint.count} clicks</span>
                    </div>
                    <div className="flex justify-between items-center text-zinc-500 mt-1">
                      <span>Coords:</span>
                      <span>({hoveredPoint.x}px, {hoveredPoint.y}px)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
