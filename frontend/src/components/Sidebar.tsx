import React, { useRef } from 'react';

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
  const folderInputRef = useRef<HTMLInputElement | null>(null);
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
    <aside className="w-72 border-r border-slate-800 bg-slate-950/80 flex flex-col p-4 gap-4">
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
          disabled={isIndexing || !isConfigured}
        >
          {isIndexing ? 'Indexing…' : 'Index / Refresh'}
        </button>

        <div className="pt-2 border-t border-slate-800 mt-2 space-y-1">
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore - webkitdirectory is not in the standard type defs
            webkitdirectory="true"
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              try {
                const form = new FormData();
                Array.from(files).forEach((file) => {
                  form.append('files', file, (file as any).webkitRelativePath || file.name);
                });
                await fetch(`${config.backendUrl}/upload_and_index`, {
                  method: 'POST',
                  body: form,
                });
                // Trigger a status update by re-calling configure so the
                // user sees that the backend is alive.
                onConfigure();
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Folder upload failed', err);
              } finally {
                // reset so selecting the same folder again still fires change
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            className="w-full py-1 rounded bg-slate-900 hover:bg-slate-800 text-[11px] border border-slate-700"
            onClick={() => folderInputRef.current?.click()}
          >
            Choose folder (upload files)
          </button>
          <p className="text-[10px] text-slate-500">
            This uploads a copy of files in the selected folder to the local backend
            and indexes them for RAG. Use for quick experiments.
          </p>
        </div>
      </div>
      {statusText && <p className="text-[11px] text-slate-400 mt-1">{statusText}</p>}
    </aside>
  );
};
