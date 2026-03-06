"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { InputBar } from "./InputBar";

interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: { content: string; role: string; createdAt: string } | null;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export function ChatWindow() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoadingSessions(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/sessions");
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read sessions response from server");
      }
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to load sessions");
        return;
      }
      const list: ChatSession[] = json.data.sessions;
      setSessions(list);
      if (!activeSessionId && list.length > 0) {
        void selectSession(list[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error loading sessions",
      );
    } finally {
      setLoadingSessions(false);
    }
  };

  const selectSession = async (id: string) => {
    setActiveSessionId(id);
    setLoadingMessages(true);
    setMessages([]);
    setError(null);
    try {
      const res = await fetch(`/api/chat/sessions/${id}`);
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read messages response from server");
      }
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to load messages");
        return;
      }
      setMessages(json.data.messages as ChatMessage[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error loading messages",
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const createSession = async () => {
    setError(null);
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: null }),
      });
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read create-session response from server");
      }
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to create session");
        return;
      }
      const session: ChatSession = json.data.session;
      setSessions((prev) => [session, ...prev]);
      await selectSession(session.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error creating session",
      );
    }
  };

  const handleSend = async (content: string) => {
    if (!activeSessionId) {
      await createSession();
      if (!activeSessionId && sessions.length === 0) return;
    }
    const sessionId = activeSessionId ?? sessions[0]?.id;
    if (!sessionId) return;

    const optimisticUser: ChatMessage = {
      id: `temp-user-${Date.now().toString()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      let json: any;
      try {
        json = await res.json();
      } catch {
        throw new Error("Failed to read chat response from server");
      }
      if (!res.ok || !json.success) {
        setError(json?.error?.message ?? "Failed to send message");
        return;
      }
      const assistant = json.data.message as ChatMessage;
      setMessages((prev) => [...prev, assistant]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unexpected error sending message",
      );
    }
  };

  useEffect(() => {
    void loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        {/* Left panel: sessions */}
        <aside className="hidden w-64 flex-col border-r border-[var(--border)] bg-white/70 px-3 py-3 text-xs dark:bg-[var(--midnight-800)] md:flex">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Sessions
            </span>
            <button
              type="button"
              onClick={createSession}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-[var(--indigo-dim)] px-2 text-[10px] font-medium text-[var(--indigo)] hover:bg-[var(--indigo-glow)]"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto">
            {loadingSessions && (
              <div className="flex items-center justify-center py-4 text-[var(--text-muted)]">
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading…
              </div>
            )}
            {!loadingSessions &&
              sessions.map((s) => {
                const active = s.id === activeSessionId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void selectSession(s.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-[11px] ${
                      active
                        ? "bg-[var(--indigo-dim)] border-l-2 border-l-[var(--indigo)] text-[var(--text-primary)]"
                        : "hover:bg-slate-100/80 dark:hover:bg-[var(--midnight-700)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <div className="truncate font-medium">
                      {s.title ?? "Untitled chat"}
                    </div>
                    {s.lastMessage && (
                      <div className="mt-0.5 line-clamp-1 text-[10px] text-[var(--text-muted)]">
                        {s.lastMessage.content}
                      </div>
                    )}
                  </button>
                );
              })}
            {!loadingSessions && sessions.length === 0 && (
              <div className="py-4 text-[11px] text-[var(--text-muted)]">
                No sessions yet. Start your first chat.
              </div>
            )}
          </div>
        </aside>

        {/* Right panel: messages */}
        <section className="flex min-h-screen flex-1 flex-col bg-[var(--midnight-800)] text-white">
          <header className="border-b border-white/10 bg-[var(--midnight-800)] px-4 py-3">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-sm font-semibold text-white">
                  Chat
                </h1>
                <p className="text-[11px] text-white/80">
                  Ask Koravo about your F&amp;B operations. Responses are narrated
                  by your configured model.
                </p>
              </div>
              <button
                type="button"
                disabled={generatingReport}
                onClick={async () => {
                  setReportMessage(null);
                  setGeneratingReport(true);
                  try {
                    const res = await fetch("/api/reports/generate", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ title: "Chat Insight Summary" }),
                    });
                    if (!res.ok) {
                      throw new Error(`HTTP ${res.status}`);
                    }
                    let json: any;
                    try {
                      json = await res.json();
                    } catch {
                      throw new Error(
                        "Failed to read report response from server",
                      );
                    }
                    if (!json.success) {
                      throw new Error(
                        json.error?.message ?? "Report generation failed",
                      );
                    }
                    setReportMessage("Report generated from recent insights.");
                  } catch (err) {
                    setReportMessage(
                      err instanceof Error
                        ? err.message
                        : "Unexpected error generating report",
                    );
                  } finally {
                    setGeneratingReport(false);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 shadow-sm hover:bg-white/20"
              >
                {generatingReport && (
                  <Loader2 className="h-3 w-3 animate-spin text-white/70" />
                )}
                <span>Generate report</span>
              </button>
            </div>
          </header>

          <div className="flex-1 bg-[var(--midnight-800)] px-4 py-3 md:px-6">
            <div className="mx-auto flex h-full max-w-4xl flex-col gap-3">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-[var(--midnight-700)] p-4">
                {loadingMessages && (
                  <div className="flex items-center justify-center py-4 text-xs text-white/70">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading conversation…
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-white/80">
                    <p className="font-medium text-white">
                      Start a conversation
                    </p>
                    <p>
                      Ask about revenue, margin, waste, vendors, or regimes. Koravo
                      will answer using your configured LLM endpoint.
                    </p>
                  </div>
                )}
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role === "user" ? "user" : "assistant"}
                  >
                    {m.content}
                  </MessageBubble>
                ))}
              </div>
              {error && (
                <p className="text-[11px] text-[var(--red)]">{error}</p>
              )}
              {reportMessage && (
                <p className="text-[11px] text-white/80">
                  {reportMessage}
                </p>
              )}
            </div>
          </div>

          <InputBar disabled={false} onSend={handleSend} />
        </section>
      </div>
    </main>
  );
}

