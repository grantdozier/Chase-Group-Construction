import React, { useEffect, useState } from 'react';

interface WorkflowStepData {
  step_id: string;
  data: Record<string, unknown>;
}

interface WorkflowRun {
  id: string;
  label: string;
  address?: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  steps: WorkflowStepData[];
}

interface WorkflowPageProps {
  backendFetch: (path: string, options?: RequestInit) => Promise<any>;
}

export const WorkflowPage: React.FC<WorkflowPageProps> = ({ backendFetch }) => {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingStepId, setSavingStepId] = useState<string | null>(null);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [beaconUser, setBeaconUser] = useState('');
  const [beaconPass, setBeaconPass] = useState('');

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = (await backendFetch('/workflow/runs')) as WorkflowRun[];
      setRuns(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const run = (await backendFetch('/workflow/runs', {
        method: 'POST',
        body: JSON.stringify({ label: newLabel.trim(), address: newAddress.trim() || null }),
      })) as WorkflowRun;
      setRuns((prev) => [run, ...prev]);
      setSelectedId(run.id);
      setNewLabel('');
      setNewAddress('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selected = runs.find((r) => r.id === selectedId) || null;

  const stepDefinitions: { id: string; title: string; description: string; field: string }[] = [
    {
      id: 'beacon_tax',
      title: 'Lafayette Parish Assessor',
      description: 'Owner, parcel ID, acreage, valuation, basic property info gathered from the Lafayette Parish Assessor (Beacon) real estate map search.',
      field: 'notes',
    },
    {
      id: 'secretary_of_state',
      title: 'Cora (Secretary of State)',
      description: 'Entity name, registered agent, officers / managers, and other entities connected to the owner from coraweb.sos.la.gov.',
      field: 'notes',
    },
    {
      id: 'usgs_flood',
      title: 'USGS Flood Data',
      description: 'Flood zone classification, flood risk, and key notes from USGS or related flood data tools.',
      field: 'notes',
    },
    {
      id: 'google_search',
      title: 'Google / Web Search',
      description: 'Important links, local news, zoning issues, nearby projects, anything on the open web that affects this deal.',
      field: 'notes',
    },
    {
      id: 'owner_intel',
      title: 'Owner Intel',
      description: 'Other properties, social / professional background, connections, and what may motivate this owner.',
      field: 'notes',
    },
    {
      id: 'proposal',
      title: 'Proposal Angle',
      description: 'How we want to pitch this project, key benefits, and special design ideas for the eventual proposal.',
      field: 'notes',
    },
  ];

  const getStepData = (stepId: string): Record<string, unknown> => {
    const step = selected?.steps.find((s) => s.step_id === stepId);
    return step?.data || {};
  };

  const handleStepChange = (stepId: string, field: string, value: string) => {
    if (!selected) return;
    const updatedRuns = runs.map((run) => {
      if (run.id !== selected.id) return run;
      const steps = [...(run.steps || [])];
      const idx = steps.findIndex((s) => s.step_id === stepId);
      const existing = idx >= 0 ? steps[idx] : { step_id: stepId, data: {} } as WorkflowStepData;
      const newData = { ...(existing.data || {}), [field]: value };
      const updatedStep: WorkflowStepData = { ...existing, data: newData };
      if (idx >= 0) steps[idx] = updatedStep;
      else steps.push(updatedStep);
      return { ...run, steps };
    });
    setRuns(updatedRuns);
  };

  const handleStepSave = async (stepId: string) => {
    if (!selected) return;
    try {
      setSavingStepId(stepId);
      const step = selected.steps.find((s) => s.step_id === stepId) || { step_id: stepId, data: {} };
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: step.data || {} }),
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingStepId(null);
    }
  };

  const handleRunBeacon = async () => {
    if (!selected) return;
    const stepId = 'beacon_tax';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunUsgs = async () => {
    if (!selected) return;
    const stepId = 'usgs_flood';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunGoogle = async () => {
    if (!selected) return;
    const stepId = 'google_search';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunOwnerIntel = async () => {
    if (!selected) return;
    const stepId = 'owner_intel';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunProposal = async () => {
    if (!selected) return;
    const stepId = 'proposal';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  const handleRunSos = async () => {
    if (!selected) return;
    const stepId = 'secretary_of_state';
    try {
      setRunningStepId(stepId);
      const updated = (await backendFetch(`/workflow/runs/${selected.id}/run_step/${stepId}`, {
        method: 'POST',
      })) as WorkflowRun;
      setRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunningStepId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-slate-800 px-4 py-2 flex items-center justify-between bg-slate-950/60">
        <div>
          <h2 className="text-sm font-semibold">Real Estate Workflow</h2>
          <p className="text-[11px] text-slate-400">
            Create and track property investigations. Automation steps will plug in here later.
          </p>
        </div>
        {loading && <span className="text-[11px] text-slate-400">Loading...</span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-slate-800 bg-slate-950/40 flex flex-col">
          <div className="p-3 border-b border-slate-800 text-xs font-semibold">Investigations</div>
          <div className="p-3 space-y-2 text-xs border-b border-slate-800">
            <input
              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs mb-1"
              placeholder="Label (e.g. Hwy 90 by Kaliste)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <input
              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs"
              placeholder="Address / notes (optional)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
            <button
              type="button"
              className="w-full mt-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
              onClick={handleCreate}
              disabled={!newLabel.trim() || loading}
            >
              New Investigation
            </button>
            <button
              type="button"
              className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px]"
              onClick={loadRuns}
              disabled={loading}
            >
              Refresh List
            </button>
            <div className="mt-3 border-t border-slate-800 pt-2 space-y-1">
              <div className="text-[11px] font-semibold">Beacon Credentials</div>
              <input
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-[11px]"
                placeholder="Beacon username"
                value={beaconUser}
                onChange={(e) => setBeaconUser(e.target.value)}
              />
              <input
                type="password"
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-[11px]"
                placeholder="Beacon password"
                value={beaconPass}
                onChange={(e) => setBeaconPass(e.target.value)}
              />
              <button
                type="button"
                className="w-full py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] disabled:bg-slate-800 disabled:text-slate-500"
                disabled={!beaconUser || !beaconPass}
                onClick={async () => {
                  try {
                    setError(null);
                    await backendFetch('/workflow/credentials/beacon', {
                      method: 'POST',
                      body: JSON.stringify({ username: beaconUser, password: beaconPass }),
                    });
                  } catch (err: any) {
                    setError(err.message);
                  }
                }}
              >
                Save Beacon credentials (local only)
              </button>
            </div>
            {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
          </div>
          <div className="flex-1 overflow-y-auto text-xs p-2 space-y-1">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className={`w-full text-left px-2 py-1 rounded border text-[11px] truncate ${
                  run.id === selectedId
                    ? 'bg-sky-900/60 border-sky-700 text-sky-50'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => setSelectedId(run.id)}
              >
                <div className="truncate">{run.label}</div>
                {run.address && (
                  <div className="truncate text-[10px] text-slate-400">{run.address}</div>
                )}
              </button>
            ))}
            {!runs.length && !loading && (
              <p className="text-[11px] text-slate-500">No investigations yet. Create one above.</p>
            )}
          </div>
        </aside>

        <main className="flex-1 p-4 overflow-y-auto text-sm">
          {!selected && <p className="text-slate-400 text-xs">Select or create an investigation.</p>}
          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold mb-1">{selected.label}</h3>
                {selected.address && (
                  <p className="text-xs text-slate-400 mb-1">{selected.address}</p>
                )}
                <p className="text-[11px] text-slate-500">
                  Created {new Date(selected.created_at).toLocaleString()} • Last updated{' '}
                  {new Date(selected.updated_at).toLocaleString()}
                </p>
                <div className="mt-2 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
                    onClick={handleRunBeacon}
                    disabled={runningStepId === 'beacon_tax' || loading}
                  >
                    {runningStepId === 'beacon_tax' ? 'Running Beacon (stub)...' : 'Run Beacon step (stub)'}
                  </button>
                  <span className="text-slate-500">
                    This button currently fills in placeholder Beacon data; later it will drive real automation.
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {stepDefinitions.map((step) => {
                  const data = getStepData(step.id);
                  const value = (data[step.field] as string) || '';

                  const structuredItems: { label: string; key: string }[] = [];
                  if (step.id === 'beacon_tax') {
                    structuredItems.push(
                      { label: 'Owner', key: 'owner' },
                      { label: 'Parcel #', key: 'parcel_id' },
                      { label: 'Acreage', key: 'acreage' },
                      { label: 'Assessed Value', key: 'value' },
                    );
                  } else if (step.id === 'secretary_of_state') {
                    structuredItems.push(
                      { label: 'Registered Agent', key: 'registered_agent' },
                      { label: 'Agent Address', key: 'registered_office_address' },
                      { label: 'Status', key: 'status' },
                      { label: 'Officers', key: 'officers' },
                    );
                  }

                  // Show the structured panel whenever we have *any* of these keys,
                  // even if values are empty strings or arrays. This makes it
                  // obvious what the backend attempted to fill.
                  const hasStructured = structuredItems.some((item) => Object.prototype.hasOwnProperty.call(data, item.key));

                  return (
                    <div key={step.id} className="border border-slate-800 rounded bg-slate-950/40 p-3 flex flex-col gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-100 mb-1">{step.title}</h4>
                        <p className="text-[11px] text-slate-400">{step.description}</p>
                      </div>

                      {hasStructured && (
                        <div className="rounded border border-slate-800 bg-slate-950/70 px-2 py-1 text-[11px] space-y-0.5">
                          {structuredItems.map((item) => {
                            const v = data[item.key];
                            if (item.key === 'officers' && Array.isArray(v)) {
                              return (
                                <div key={item.key}>
                                  <span className="font-semibold">Officers:</span>
                                  <ul className="list-disc list-inside ml-2">
                                    {v.map((row: any, idx: number) => (
                                      <li key={idx}>{String(row)}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            return (
                              <div key={item.key} className="flex justify-between gap-2">
                                <span className="font-semibold text-slate-200">{item.label}:</span>
                                <span className="text-slate-100 text-right break-words">{v !== undefined && v !== null && String(v).length ? String(v) : '—'}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <textarea
                        className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs min-h-[80px] resize-vertical"
                        value={value}
                        onChange={(e) => handleStepChange(step.id, step.field, e.target.value)}
                        placeholder="Type notes or paste key info from the website here..."
                      />
                      <div className="flex justify-between items-center gap-2">
                        {step.id === 'secretary_of_state' && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={handleRunSos}
                            disabled={runningStepId === 'secretary_of_state' || loading}
                          >
                            {runningStepId === 'secretary_of_state' ? 'Running Cora (stub)...' : 'Run Cora step (stub)'}
                          </button>
                        )}
                        {step.id === 'usgs_flood' && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={handleRunUsgs}
                            disabled={runningStepId === 'usgs_flood' || loading}
                          >
                            {runningStepId === 'usgs_flood' ? 'Running USGS (stub)...' : 'Run USGS step (stub)'}
                          </button>
                        )}
                        {step.id === 'google_search' && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={handleRunGoogle}
                            disabled={runningStepId === 'google_search' || loading}
                          >
                            {runningStepId === 'google_search' ? 'Running Google (stub)...' : 'Run Google step (stub)'}
                          </button>
                        )}
                        {step.id === 'owner_intel' && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={handleRunOwnerIntel}
                            disabled={runningStepId === 'owner_intel' || loading}
                          >
                            {runningStepId === 'owner_intel' ? 'Running Owner Intel (stub)...' : 'Run Owner Intel step (stub)'}
                          </button>
                        )}
                        {step.id === 'proposal' && (
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={handleRunProposal}
                            disabled={runningStepId === 'proposal' || loading}
                          >
                            {runningStepId === 'proposal' ? 'Running Proposal (stub)...' : 'Run Proposal step (stub)'}
                          </button>
                        )}
                        <div className="flex-1 flex justify-end">
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-[11px] disabled:bg-slate-700 disabled:text-slate-400"
                            onClick={() => handleStepSave(step.id)}
                            disabled={savingStepId === step.id}
                          >
                            {savingStepId === step.id ? 'Saving...' : 'Save step'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
