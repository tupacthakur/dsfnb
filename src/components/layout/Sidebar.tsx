"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  {
    href: "/",
    label: "Command Centre",
    icon: LayoutDashboard,
  },
  {
    href: "/chat",
    label: "Chat",
    icon: MessageSquare,
  },
  {
    href: "/dashboard",
    label: "Analytics Hub",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark");
  };

  return (
    <aside
      className={`hidden md:flex fixed inset-y-0 left-0 z-50 flex-col border-r border-white/10 bg-[var(--midnight)] text-slate-100 transition-[width] duration-300 ease-out ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--mint)]/10 text-[var(--mint)]">
            <span className="text-xs font-bold">K</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-[0.24em] text-white">
                KORAVO
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                F&amp;B Intelligence
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-4 space-y-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-2 flex items-center gap-3 rounded-xl px-3 h-10 text-sm transition-colors ${
                  active
                    ? "bg-[var(--indigo-glow)] text-white border-l-2 border-l-[var(--indigo)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mt-3 mx-2">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] ${
              collapsed ? "justify-center" : ""
            } bg-emerald-500/10 text-emerald-300`}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--mint)]" />
            {!collapsed && <span>SAGE Active</span>}
          </div>
        </div>
      </nav>

      <div className="relative px-3 py-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--indigo)] text-xs font-semibold">
              KA
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white">
                  Koravo Admin
                </span>
                <span className="text-[10px] text-slate-400">ADMIN</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10"
          >
            <Sun className="hidden h-4 w-4 dark:block" />
            <Moon className="h-4 w-4 dark:hidden" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--indigo)] bg-[var(--midnight-800)] text-slate-200 shadow-sm"
        >
          <ChevronLeft
            className={`h-3 w-3 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </aside>
  );
}

