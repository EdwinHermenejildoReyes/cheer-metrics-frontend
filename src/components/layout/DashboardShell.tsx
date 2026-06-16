'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { ConfirmProvider } from '@/hooks/useConfirm';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandingBar } from '@/components/layout/BrandingBar';
import { PageSpinner } from '@/components/ui/spinner';
import type { RootState } from '@/core/rootReducer';
import authRepository from '@/repositories/authRepository';
import { setUser } from '@/store/auth/slices';

const JUDGE_SYNC_INTERVAL = 15_000;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter();
  const dispatch        = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user            = useSelector((s: RootState) => s.auth.user);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user && !user.is_staff && !user.is_approved) {
      router.replace('/pending');
    }
  }, [isAuthenticated, user, router]);

  // Poll /me every 15s for judges so assignment changes by admin take effect immediately
  useEffect(() => {
    if (!user || user.is_staff || user.role !== 'judge') return;
    const interval = setInterval(async () => {
      try {
        const res = await authRepository.me();
        dispatch(setUser(res.data));
      } catch {
        // Silently ignore — judge keeps current assignments until next successful poll
      }
    }, JUDGE_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [user?.role, user?.is_staff, dispatch]);

  if (!isAuthenticated || (user && !user.is_staff && !user.is_approved)) {
    return <PageSpinner />;
  }

  return (
    <BrandingProvider>
      <ConfirmProvider>
      <div className="dashboard-shell flex h-screen overflow-hidden">
        <div className="print:hidden"><Sidebar /></div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="print:hidden"><BrandingBar /></div>
          <main className="dashboard-main flex flex-1 flex-col overflow-y-auto bg-plt-surface">
            {children}
          </main>
        </div>
      </div>
      </ConfirmProvider>
    </BrandingProvider>
  );
}
