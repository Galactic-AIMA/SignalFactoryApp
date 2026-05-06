"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/editor", label: "Editor" },
  { href: "/batch", label: "Lotes" },
  { href: "/assets", label: "Assets" },
  { href: "/logs", label: "Logs" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-sf-border bg-sf-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sf-accent text-xl">✦</span>
          <span className="font-display text-lg font-bold tracking-wide text-sf-text">
            SignalFactory
          </span>
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                pathname === item.href
                  ? "bg-sf-primary/20 text-sf-primary"
                  : "text-sf-muted hover:text-sf-text hover:bg-sf-surface"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
