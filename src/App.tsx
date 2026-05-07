import { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage, checkHealth } from './lib/api';
import type { Message, Session } from './lib/types';
import { useLocation } from './hooks/useLocation';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import TypingIndicator from './components/TypingIndicator';
import WelcomeScreen from './components/WelcomeScreen';
import StatusBar from './components/StatusBar';
import AboutPage from './components/AboutPage';

const FLASK = import.meta.env.VITE_FLASK_BACKEND_URL || 'http://localhost:5000';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${FLASK}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function App() {
  const [sessions, setSessions]               = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [backendStatus, setBackendStatus]     = useState<'online' | 'offline' | 'checking'>('checking');
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [showAbout, setShowAbout]             = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Location hook
  const { location, status: locationStatus, request: requestLocation } = useLocation();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // ── Health polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    checkBackendHealth();
    const id = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(id);
  }, []);

  async function checkBackendHealth() {
    setBackendStatus('checking');
    try {
      await checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  }

  // ── Sessions ────────────────────────────────────────────────────────────────
  useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    try {
      const data = await apiFetch('/api/sessions');
      setSessions(data.sessions as Session[]);
    } catch { /* ignore */ }
  }

  async function fetchMessages(sessionId: string) {
    try {
      const data = await apiFetch(`/api/chat/${sessionId}`);
      setMessages(data.messages as Message[]);
    } catch {
      setMessages([]);
    }
  }

  async function deleteSession(id: string) {
    try {
      await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' });
    } catch { /* best-effort */ }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  async function handleSend(text: string) {
    const optimisticUser: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setLoading(true);

    try {
      const response = await sendMessage({
        message: text,
        session_id: activeSessionId ?? undefined,
        // Always attach location when available so the LLM can use it
        location: location ?? undefined,
      });

      const sessionId = response.session_id;

      if (!activeSessionId) {
        setActiveSessionId(sessionId);
        fetchSessions();
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.response,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s
        )
      );
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Something went wrong. Please try again. ${err instanceof Error ? err.message : ''}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
    fetchMessages(id);
  }

  function handleNewChat() {
    setActiveSessionId(null);
    setMessages([]);
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {sidebarOpen && (
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onDelete={deleteSession}
          onAbout={() => setShowAbout(true)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-slate-800 truncate">
              {showAbout
                ? 'About'
                : activeSessionId
                  ? sessions.find((s) => s.id === activeSessionId)?.title || 'Chat'
                  : 'MedAssist AI'}
            </h2>
          </div>
          <StatusBar
            status={backendStatus}
            locationStatus={locationStatus}
            location={location}
            onRequestLocation={requestLocation}
          />
        </header>

        {/* Body */}
        {showAbout ? (
          <AboutPage onBack={() => setShowAbout(false)} />
        ) : !activeSessionId && messages.length === 0 ? (
          <WelcomeScreen
            onSuggestionClick={handleSend}
            location={location}
            locationStatus={locationStatus}
            onRequestLocation={requestLocation}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {!showAbout && <ChatInput onSend={handleSend} disabled={loading} />}
      </div>
    </div>
  );
}

export default App;
