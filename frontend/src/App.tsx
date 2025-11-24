import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar, BackendConfig } from './components/Sidebar';
import { ChatPanel, ChatMessage } from './components/ChatPanel';
import { SourcesPanel, SourceItem } from './components/SourcesPanel';
import { WorkflowPage } from './components/WorkflowPage';

interface QueryResponse {
  answer: string;
  context: SourceItem[];
}

const defaultBackendUrl = 'http://localhost:8000';

const App: React.FC = () => {
  const [config, setConfig] = useState<BackendConfig>(() => {
    if (typeof window !== 'undefined') {
      const storedKey = window.localStorage.getItem('local_rag_openai_key') || '';
      return {
        backendUrl: defaultBackendUrl,
        rootPaths: [''],
        apiKey: storedKey,
      };
    }
    return {
      backendUrl: defaultBackendUrl,
      rootPaths: [''],
      apiKey: '',
    };
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [input, setInput] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [statusText, setStatusText] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [activeModule, setActiveModule] = useState<'rag' | 'workflow'>('rag');

  const backendFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const url = `${config.backendUrl.replace(/\/$/, '')}${path}`;
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
      }
      if (res.status === 204) return null;
      return res.json();
    },
    [config.backendUrl]
  );

  const handleConfigure = async () => {
    try {
      setStatusText('Configuring backend...');
      await backendFetch('/config', {
        method: 'POST',
        body: JSON.stringify({
          root_paths: config.rootPaths.filter(Boolean),
          openai_api_key: config.apiKey,
        }),
      });
      setIsConfigured(true);
      setStatusText('Backend configured. You can now index your files.');
    } catch (err: any) {
      console.error(err);
      setStatusText(`Config failed: ${err.message}`);
      setIsConfigured(false);
    }
  };

  const handleIndex = async () => {
    if (!isConfigured) return;
    try {
      setIsIndexing(true);
      setStatusText('Indexing files...');
      const data = await backendFetch('/index', {
        method: 'POST',
        body: JSON.stringify({ full_rebuild: true }),
      });
      setStatusText(`Indexed files: ${data.indexed_files}`);
    } catch (err: any) {
      console.error(err);
      setStatusText(`Index failed: ${err.message}`);
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;

    const userMessage: ChatMessage = {
      id: `m-${Date.now()}-u`,
      role: 'user',
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMessage].slice(-5).map((m) => ({ role: m.role, content: m.content }));
      const data = (await backendFetch('/query', {
        method: 'POST',
        body: JSON.stringify({ query: content, top_k: 8, rerank_k: 20, history }),
      })) as QueryResponse;

      const assistantMessage: ChatMessage = {
        id: `m-${Date.now()}-a`,
        role: 'assistant',
        content: data.answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSources(data.context || []);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `m-${Date.now()}-e`,
        role: 'assistant',
        content: `Error querying backend: ${err.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const pingHealth = async () => {
      try {
        const res = await backendFetch('/health');
        if (res && res.status === 'ok') {
          setStatusText('Backend reachable. Configure to get started.');
        }
      } catch {
        setStatusText('Backend not reachable. Start the FastAPI server on localhost:8000.');
      }
    };
    pingHealth();
  }, [backendFetch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('local_rag_openai_key', config.apiKey || '');
    }
  }, [config.apiKey]);

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-50">
      {activeModule === 'rag' && (
        <Sidebar
          config={config}
          onChange={setConfig}
          onConfigure={handleConfigure}
          onIndex={handleIndex}
          isConfigured={isConfigured}
          isIndexing={isIndexing}
          statusText={statusText}
        />
      )}
      <main className="flex-1 flex flex-col">
        <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2 flex items-center gap-2 text-xs">
          <button
            type="button"
            className={`px-3 py-1 rounded ${
              activeModule === 'rag'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => setActiveModule('rag')}
          >
            Local RAG Assistant
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded ${
              activeModule === 'workflow'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
            onClick={() => setActiveModule('workflow')}
          >
            Real Estate Workflow
          </button>
        </div>
        <div className="flex flex-1">
          {activeModule === 'rag' && (
            <>
              <div className="flex-1">
                <ChatPanel
                  messages={messages}
                  input={input}
                  setInput={setInput}
                  onSend={handleSend}
                  loading={loading}
                />
              </div>
              <div className="w-80 border-l border-slate-800">
                <SourcesPanel sources={sources} />
              </div>
            </>
          )}
          {activeModule === 'workflow' && (
            <div className="flex-1">
              <WorkflowPage backendFetch={backendFetch} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
