import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Funnel, CaretDown, CaretUp, XCircle } from '@phosphor-icons/react';

export function FilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const device = searchParams.get('device') || 'all';
  const frustratedOnly = searchParams.get('frustratedOnly') === 'true';
  const includeBots = searchParams.get('includeBots') === 'true';
  const hasError = searchParams.get('hasError') === 'true';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const visitedPath = searchParams.get('visitedPath') || '';
  const clickedSelector = searchParams.get('clickedSelector') || '';
  const customEvent = searchParams.get('customEvent') || '';

  const updateFilter = (key: string, value: string | boolean) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all' || value === false || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasAnyFilterActive = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 items-center justify-between bg-zinc-900/50 p-4 border border-zinc-800 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <Funnel className="text-zinc-500" size={20} />
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500 uppercase font-mono">Date:</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-zinc-500">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <select 
            value={device} 
            onChange={(e) => updateFilter('device', e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
          >
            <option value="all">All Devices</option>
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={frustratedOnly} 
              onChange={(e) => updateFilter('frustratedOnly', e.target.checked)}
              className="rounded border border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500 w-4 h-4"
            />
            Frustrated Only
          </label>

          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={includeBots} 
              onChange={(e) => updateFilter('includeBots', e.target.checked)}
              className="rounded border border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-amber-500 w-4 h-4"
            />
            Include Bots
          </label>
        </div>

        <div className="flex items-center gap-3">
          {hasAnyFilterActive && (
            <button 
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-850 hover:bg-zinc-800 border border-zinc-850 rounded transition-colors font-mono uppercase tracking-wider cursor-pointer"
            >
              <XCircle size={15} />
              Clear Filters
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-850 hover:bg-zinc-800 border border-zinc-850 rounded transition-colors font-mono uppercase tracking-wider cursor-pointer"
          >
            {isExpanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
            Segmentation
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-900/30 border border-zinc-850 rounded-lg animate-fade-in">
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Visited Path</span>
            <input 
              type="text" 
              value={visitedPath}
              onChange={(e) => updateFilter('visitedPath', e.target.value)}
              placeholder="/pricing or /docs"
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Clicked Selector</span>
            <input 
              type="text" 
              value={clickedSelector}
              onChange={(e) => updateFilter('clickedSelector', e.target.value)}
              placeholder="button#checkout"
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Custom Event</span>
            <input 
              type="text" 
              value={customEvent}
              onChange={(e) => updateFilter('customEvent', e.target.value)}
              placeholder="add_to_cart"
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={hasError} 
                onChange={(e) => updateFilter('hasError', e.target.checked)}
                className="rounded border border-zinc-700 bg-zinc-800 text-red-500 focus:ring-red-500 w-4 h-4"
              />
              Has JS Error
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
