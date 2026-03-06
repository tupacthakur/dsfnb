"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
}

export function PageWrapper({ children }: Props) {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)]">
      <Sidebar />
      <div className="md:ml-60 transition-[margin-left] duration-300 ease-out min-h-screen pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

