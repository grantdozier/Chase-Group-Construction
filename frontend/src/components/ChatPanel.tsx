import React from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  loading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, input, setInput, onSend, loading }) => {
  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <div className={m.role === 'user' ? 'text-sky-300 mb-1' : 'text-emerald-300 mb-1'}>
              {m.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded px-3 py-2 whitespace-pre-wrap text-slate-100">
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-800 p-3">
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full rounded bg-slate-900 border border-slate-700 px-3 py-2 text-sm resize-none h-20"
            placeholder="Ask a question about your indexed files..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm disabled:bg-slate-700 disabled:text-slate-400"
              onClick={onSend}
              disabled={loading || !input.trim()}
            >
              {loading ? 'Thinking…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
