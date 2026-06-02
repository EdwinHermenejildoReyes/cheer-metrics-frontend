'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandingBar } from '@/components/layout/BrandingBar';
import { PageSpinner } from '@/components/ui/spinner';
import type { RootState } from '@/core/rootReducer';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router         = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user           = useSelector((s: RootState) => s.auth.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user && !user.is_staff && !user.is_approved) {
      router.replace('/pending');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || (user && !user.is_staff && !user.is_approved)) {
    return <PageSpinner />;
  }

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
