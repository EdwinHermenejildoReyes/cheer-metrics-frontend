'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, Clock, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import authRepository, { type SimpleUser } from '@/repositories/authRepository';

const ROLE_LABELS: Record<string, string> = {
  judge:   'Juez',
  athlete: 'Atleta',
  coach:   'Coach',
  '':      '—',
};

export default function UsersPage() {
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authRepository.listUsers();
      setUsers(res.data.filter((u) => !u.is_staff));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId: number) => {
    setApproving(userId);
    try {
      await authRepository.approveUser(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_approved: true } : u));
      toast.success('Usuario aprobado');
    } catch {
      toast.error('No se pudo aprobar el usuario');
    } finally {
      setApproving(null);
    }
  };

  const pending = users.filter((u) => !u.is_approved);
  const approved = users.filter((u) => u.is_approved);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-zinc-400" />
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Usuarios</h1>
          <p className="text-sm text-zinc-500">{pending.length} pendiente{pending.length !== 1 ? 's' : ''} de aprobación</p>
        </div>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Pendientes</h2>
              <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-amber-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Correo</th>
                      <th className="px-5 py-3">Rol</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pending.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-3.5 font-medium text-zinc-900">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-600">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="violet">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            loading={approving === u.id}
                            onClick={() => handleApprove(u.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Aprobar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Aprobados</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Correo</th>
                      <th className="px-5 py-3">Rol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {approved.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-3.5 font-medium text-zinc-900">
                          <span className="flex items-center gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-600">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="violet">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {users.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-20 text-zinc-400">
              <UserCog className="h-10 w-10" />
              <p className="text-sm">No hay usuarios registrados aún.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
