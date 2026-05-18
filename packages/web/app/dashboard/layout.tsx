import { AutoSync } from '@/components/dashboard/AutoSync';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { TimeTracker } from '@/components/dashboard/TimeTracker';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <AutoSync />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      <TimeTracker />
    </div>
  );
}
