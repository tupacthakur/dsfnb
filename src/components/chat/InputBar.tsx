"use client";

import { useState, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface Props {
  disabled?: boolean;
  onSend: (content: string) => Promise<void> | void;
}

export function InputBar({ disabled, onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const content = value.trim();
    if (!content || disabled || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-[var(--midnight-800)] px-4 py-3">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-end gap-2 rounded-2xl border border-white/20 bg-[var(--midnight-800)] px-3 py-2 shadow-sm">
          <textarea
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Koravo about your operations…"
            className="min-h-[36px] max-h-32 flex-1 resize-none bg-transparent text-xs text-white outline-none placeholder:text-white/60"
            disabled={disabled || sending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || sending || !value.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--indigo)] text-white shadow-sm transition-transform duration-180 hover:scale-105 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[10px] text-white/70">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

