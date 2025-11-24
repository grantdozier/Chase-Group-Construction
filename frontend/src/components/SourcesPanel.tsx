import React from 'react';

export interface SourceItem {
  id: string;
  source_path: string;
  score: number;
  text: string;
}

interface SourcesPanelProps {
  sources: SourceItem[];
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({ sources }) => {
  return (
    <div className="h-full flex flex-col border-l border-slate-800 bg-slate-950/40">
      <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
        Sources
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {sources.length === 0 && (
          <p className="text-slate-500 text-[11px]">No context yet. Ask a question to see retrieved files.</p>
        )}
        {sources.map((s, idx) => (
          <details
            key={s.id + idx}
            className="border border-slate-800 rounded bg-slate-900/60"
            open={idx === 0}
          >
            <summary className="cursor-pointer px-2 py-1 flex items-center justify-between gap-2">
              <span className="truncate text-slate-200 text-[11px]" title={s.source_path}>
                {s.source_path}
              </span>
              <span className="text-[10px] text-slate-500">score {s.score.toFixed(3)}</span>
            </summary>
            <div className="px-2 pb-2 pt-1 text-[11px] text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {s.text}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};
