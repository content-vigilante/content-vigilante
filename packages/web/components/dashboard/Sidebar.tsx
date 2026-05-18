'use client';

import { Owl } from '@/components/Owl';
import {
  BarChart3,
  CalendarDays,
  FileDown,
  FolderOpen,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Menu,
  PenSquare,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/context', label: 'Context', icon: FolderOpen },
  { href: '/dashboard/studio', label: 'Studio', icon: PenSquare },
  { href: '/dashboard/guardrails', label: 'Guardrails', icon: ShieldCheck },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/dashboard/inbox', label: 'Inbox', icon: Inbox },
  { href: '/dashboard/exports', label: 'Exports', icon: FileDown },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <>
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <Owl className="h-5 w-5" />
        <span className="font-display text-base font-bold tracking-[-0.018em]">
          Content <span className="font-medium">Vigilante</span>
        </span>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition ${
                active
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-fg)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-xs text-[var(--color-fg-muted)]">
        <div className="mb-1 flex items-center gap-1.5 font-medium text-[var(--color-fg)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-good)]" />
          Local-first mode
        </div>
        All data lives in your browser. Nothing leaves without your key.
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-elev)] px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Owl className="h-5 w-5" />
          <span className="font-display text-sm font-bold">
            Content <span className="font-medium">Vigilante</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 hover:bg-[var(--color-bg-card)]"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-5 md:flex">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-md p-1 text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-fg)]"
            >
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
