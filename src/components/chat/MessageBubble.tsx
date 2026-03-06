"use client";

import { ReactNode } from "react";

interface Props {
  role: "user" | "assistant";
  children: ReactNode;
}

export function MessageBubble({ role, children }: Props) {
  const isUser = role === "user";

  return (
    <div
      className={`flex w-full ${
        isUser ? "justify-end" : "justify-start"
      } text-sm`}
    >
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-2.5 leading-relaxed ${
          isUser
            ? "bg-[var(--indigo)] text-white rounded-br-sm"
            : "bg-white/10 text-white border border-white/20 rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

