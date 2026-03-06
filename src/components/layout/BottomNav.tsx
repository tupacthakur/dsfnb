"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, BarChart3, Settings } from "lucide-react";

const items = [
  { href: "/", label: "Command", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-between border-t border-white/10 bg-[rgba(10,15,30,0.9)] px-6 backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 text-[10px]"
          >
            <Icon
              className={`h-4 w-4 ${
                active ? "text-[var(--indigo)]" : "text-slate-400"
              }`}
            />
            <span
              className={`${
                active ? "text-[var(--indigo)]" : "text-slate-400"
              }`}
            >
              {item.label}
            </span>
            {active && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--mint)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

