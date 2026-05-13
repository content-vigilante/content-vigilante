'use client';

import { Owl } from '@/components/Owl';
import {
  BarChart3,
  CalendarDays,
  KanbanSquare,
  LayoutDashboard,
  PenSquare,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/studio', label: 'Studio', icon: PenSquare },
  { href: '/dashboard/guardrails', label: 'Guardrails', icon: ShieldCheck },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-elev)] px-3 py-5">
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
    </aside>
  );
}
