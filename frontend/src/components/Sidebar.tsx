import React from 'react';

export interface BackendConfig {
  backendUrl: string;
  rootPaths: string[];
  apiKey: string;
}

interface SidebarProps {
  config: BackendConfig;
  onChange: (config: BackendConfig) => void;
  onConfigure: () => void;
  onIndex: () => void;
  isConfigured: boolean;
  isIndexing: boolean;
  statusText?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChange,
  onConfigure,
  onIndex,
  isConfigured,
  isIndexing,
  statusText,
}) => {
  const updateField = (field: keyof BackendConfig, value: string | string[]) => {
    onChange({ ...config, [field]: value } as BackendConfig);
  };

  const updateRootPath = (index: number, value: string) => {
    const next = [...config.rootPaths];
    next[index] = value;
    updateField('rootPaths', next);
  };

  const addRootPath = () => {
    updateField('rootPaths', [...config.rootPaths, '']);
  };

  const removeRootPath = (index: number) => {
    const next = config.rootPaths.filter((_, i) => i !== index);
    updateField('rootPaths', next);
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-4">
      <div>
        <h1 className="text-lg font-semibold mb-1">Local RAG Assistant</h1>
        <p className="text-xs text-slate-400">Configure your local backend and index your files.</p>
      </div>

      <div className="space-y-2 text-xs">
        <label className="block font-semibold">Backend URL</label>
        <input
          className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
          value={config.backendUrl}
          onChange={(e) => updateField('backendUrl', e.target.value)}
        />
      </div>

      <div className="space-y-2 text-xs">
        <label className="block font-semibold">Root Paths</label>
        <div className="space-y-1">
          {config.rootPaths.map((path, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
                value={path}
                onChange={(e) => updateRootPath(index, e.target.value)}
                placeholder="C:\\path\\to\\project"
              />
              <button
                className="text-red-400 text-xs"
                onClick={() => removeRootPath(index)}
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="text-xs text-sky-400 hover:text-sky-300"
            type="button"
            onClick={addRootPath}
          >
            + Add path
          </button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <label className="block font-semibold">OpenAI API Key</label>
        <input
          className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-xs"
          type="password"
          value={config.apiKey}
          onChange={(e) => updateField('apiKey', e.target.value)}
          placeholder="sk-... (sent only to your local backend)"
        />
      </div>

      <div className="flex flex-col gap-2 mt-2 text-xs">
        <button
          className="w-full py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400"
          type="button"
          onClick={onConfigure}
          disabled={!config.rootPaths.length || !config.apiKey || !config.backendUrl}
        >
          {isConfigured ? 'Reconfigure' : 'Configure backend'}
        </button>
        <button
          className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400"
          type="button"
          onClick={onIndex}
          disabled={!isConfigured || isIndexing}
        >
          {isIndexing ? 'Indexing…' : 'Index / Refresh'}
        </button>
        {statusText && <p className="text-[11px] text-slate-400 mt-1">{statusText}</p>}
      </div>
    </aside>
  );
};
