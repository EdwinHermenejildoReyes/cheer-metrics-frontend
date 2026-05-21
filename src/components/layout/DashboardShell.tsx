'use client';

import { BrandingProvider } from '@/contexts/BrandingContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandingBar } from '@/components/layout/BrandingBar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <BrandingBar />
          <main className="flex flex-1 flex-col overflow-y-auto bg-zinc-50">
            {children}
          </main>
        </div>
      </div>
    </BrandingProvider>
  );
}
