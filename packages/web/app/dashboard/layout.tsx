import type { ReactNode } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
