'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RootState } from '@/core/rootReducer';
import { clearAuth } from '@/store/auth/slices';
import authRepository from '@/repositories/authRepository';

export default function PendingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.is_staff || user?.is_approved) {
      router.replace('/competitions');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    await authRepository.logout().catch(() => {});
    dispatch(clearAuth());
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Cuenta pendiente de aprobación</h1>
        <p className="text-sm text-zinc-500 mb-1">
          Tu cuenta ha sido creada correctamente.
        </p>
        <p className="text-sm text-zinc-500 mb-8">
          Un administrador debe aprobarla antes de que puedas acceder al sistema. Te avisarán cuando esté lista.
        </p>
        {user && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-1">Cuenta registrada</p>
            <p className="text-sm font-medium text-zinc-900">{user.first_name} {user.last_name}</p>
            <p className="text-sm text-zinc-500">{user.email}</p>
          </div>
        )}
        <Button variant="secondary" className="w-full" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
