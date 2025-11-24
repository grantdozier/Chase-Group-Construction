import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar, BackendConfig } from './components/Sidebar';
import { ChatPanel, ChatMessage } from './components/ChatPanel';
import { SourcesPanel, SourceItem } from './components/SourcesPanel';

interface QueryResponse {
  answer: string;
  context: SourceItem[];
}

const defaultBackendUrl = 'http://localhost:8000';

const App: React.FC = () => {
  const [config, setConfig] = useState<BackendConfig>({
    backendUrl: defaultBackendUrl,
    rootPaths: [''],
    apiKey: '',
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [input, setInput] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [statusText, setStatusText] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

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
      const data = (await backendFetch('/query', {
        method: 'POST',
        body: JSON.stringify({ query: content, top_k: 8, rerank_k: 20 }),
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

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-50">
      <Sidebar
        config={config}
        onChange={setConfig}
        onConfigure={handleConfigure}
        onIndex={handleIndex}
        isConfigured={isConfigured}
        isIndexing={isIndexing}
        statusText={statusText}
      />
      <main className="flex-1 flex flex-col">
        <div className="flex flex-1">
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
        </div>
      </main>
    </div>
  );
};

export default App;
