import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Funnel, WarningCircle, Plus, ArrowRight } from '@phosphor-icons/react';
import { useFunnels, useFunnelAnalysis, type SessionFilters } from '../api/hooks';
import { FilterBar } from '../components/ui/FilterBar';
import { fetcher } from '../api/client';

export function FunnelPage() {
  const [searchParams] = useSearchParams();
  const filters: SessionFilters = {
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    device: (searchParams.get('device') as any) || 'all',
    frustratedOnly: searchParams.get('frustratedOnly') === 'true',
  };

  const { funnels, isLoading: funnelsLoading, mutate: mutateFunnels } = useFunnels();
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null);

  const { analysis, isLoading: analysisLoading, isError } = useFunnelAnalysis(
    selectedFunnelId,
    filters
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelSteps, setNewFunnelSteps] = useState<string[]>(['']);

  // Set initial selected funnel if available
  if (!selectedFunnelId && funnels.length > 0) {
    setSelectedFunnelId(funnels[0]._id);
  }

  const handleCreateFunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSteps = newFunnelSteps.filter(s => s.trim().length > 0);
    if (!newFunnelName || validSteps.length === 0) return;

    try {
      await fetcher('/funnels', {
        method: 'POST',
        body: JSON.stringify({ name: newFunnelName, steps: validSteps }),
      });
      setIsCreating(false);
      setNewFunnelName('');
      setNewFunnelSteps(['']);
      mutateFunnels();
    } catch (err) {
      console.error('Failed to create funnel', err);
    }
  };

  const addStep = () => setNewFunnelSteps([...newFunnelSteps, '']);
  const updateStep = (index: number, value: string) => {
    const steps = [...newFunnelSteps];
    steps[index] = value;
    setNewFunnelSteps(steps);
  };
  const removeStep = (index: number) => {
    const steps = [...newFunnelSteps];
    steps.splice(index, 1);
    setNewFunnelSteps(steps);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-mono text-zinc-50 tracking-tight">Funnels</h1>
          <p className="text-sm text-zinc-400 mt-1">Conversion tracking and step drop-off analysis.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
          >
            <Plus weight="bold" />
            New Funnel
          </button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateFunnel} className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-lg space-y-4">
          <h2 className="text-lg font-mono text-zinc-200">Create New Funnel</h2>
          <div>
            <label className="block text-xs font-mono text-zinc-500 uppercase mb-1">Funnel Name</label>
            <input
              type="text"
              value={newFunnelName}
              onChange={e => setNewFunnelName(e.target.value)}
              placeholder="e.g., Signup Flow"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono text-sm focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Steps (URLs)</label>
            <div className="space-y-2">
              {newFunnelSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-zinc-600 font-mono text-sm">{idx + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={e => updateStep(idx, e.target.value)}
                    placeholder="e.g., /pricing"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                  {newFunnelSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="text-zinc-500 hover:text-red-400 px-2"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStep}
              className="mt-3 text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={12} /> Add Step
            </button>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm font-mono text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-mono bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Save Funnel
            </button>
          </div>
        </form>
      )}

      {!isCreating && funnels.length > 0 && (
        <>
          <div className="flex items-center gap-4">
            <select
              value={selectedFunnelId || ''}
              onChange={e => setSelectedFunnelId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-sm rounded px-4 py-2 focus:outline-none focus:border-blue-500 min-w-[200px]"
            >
              {funnels.map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
            <div className="flex-1">
              <FilterBar />
            </div>
          </div>

          {analysisLoading && <div className="text-zinc-500 font-mono">Loading analysis...</div>}
          
          {isError && (
            <div className="p-8 flex flex-col items-center justify-center border border-zinc-800 bg-zinc-900/50 rounded-lg text-zinc-500">
              <WarningCircle size={48} className="text-red-500 mb-4" />
              <p className="font-mono uppercase tracking-widest text-sm">Failed to load analysis</p>
            </div>
          )}

          {!analysisLoading && !isError && analysis && analysis.steps && (
            <div className="space-y-6">
              {analysis.steps.map((step, idx) => {
                const maxSessions = analysis.steps[0].sessions || 1;
                const widthPercent = Math.max(0, (step.sessions / maxSessions) * 100);
                
                return (
                  <div key={idx} className="relative">
                    <div className="flex justify-between items-end mb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 font-mono text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-blue-400">{step.url}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xl text-zinc-200">{step.sessions}</div>
                        <div className="text-xs font-mono text-zinc-500 uppercase">Sessions</div>
                      </div>
                    </div>
                    
                    <div className="h-12 bg-zinc-900 rounded-r border-l-4 border-blue-500 relative overflow-hidden flex">
                      <div 
                        className="h-full bg-blue-900/30 transition-all duration-500" 
                        style={{ width: `${widthPercent}%` }}
                      ></div>
                    </div>

                    {idx < analysis.steps.length - 1 && (
                      <div className="flex justify-between items-center my-4 pl-4 pr-12 text-zinc-500">
                        <ArrowRight size={20} className="text-zinc-700" />
                        <div className="text-sm font-mono flex gap-6">
                          <span>
                            <span className="text-zinc-400">Conversion:</span> {analysis.steps[idx+1].conversionRate}%
                          </span>
                          <span>
                            <span className="text-red-400/70">Drop-off:</span> {analysis.steps[idx+1].dropoffRate}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!isCreating && funnelsLoading && <div className="text-zinc-500 font-mono">Loading funnels...</div>}
      
      {!isCreating && !funnelsLoading && funnels.length === 0 && (
        <div className="p-12 border border-zinc-800 border-dashed rounded-lg flex flex-col items-center justify-center text-zinc-500">
          <Funnel size={48} className="text-zinc-700 mb-4" />
          <p className="font-mono text-sm mb-4">No funnels defined yet.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded font-mono text-sm transition-colors"
          >
            Create your first funnel
          </button>
        </div>
      )}
    </div>
  );
}
