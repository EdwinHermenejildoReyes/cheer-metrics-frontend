'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import authRepository, { type Invitation } from '@/repositories/authRepository';
import type { RootState } from '@/core/rootReducer';

const ROLE_OPTIONS = [
  { value: 'org_admin', label: 'Administrador de organización' },
  { value: 'judge',     label: 'Juez' },
];

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Org. Admin',
  judge:     'Juez',
  athlete:   'Atleta',
  coach:     'Coach',
};

const schema = z.object({
  email: z.string().email('Correo inválido'),
  role:  z.string().min(1, 'Selecciona un rol'),
});

type FormValues = z.infer<typeof schema>;

function InvitationStatus({ inv }: { inv: Invitation }) {
  if (inv.accepted) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" /> Aceptada
      </span>
    );
  }
  if (!inv.is_valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> Expirada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pendiente
    </span>
  );
}

export default function InvitationsPage() {
  const router = useRouter();
  const user   = useSelector((s: RootState) => s.auth.user);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading]         = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user && !user.is_staff) {
      router.replace('/home');
      return;
    }
    authRepository.listInvitations()
      .then((res) => setInvitations(res.data.results))
      .catch(() => toast.error('No se pudieron cargar las invitaciones.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await authRepository.createInvitation(values);
      setInvitations((prev) => [res.data, ...prev]);
      reset();
      toast.success(`Invitación enviada a ${values.email}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { email?: string[]; detail?: string } } })
        ?.response?.data;
      toast.error(detail?.email?.[0] ?? detail?.detail ?? 'No se pudo enviar la invitación.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await authRepository.deleteInvitation(id);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      toast.success('Invitación eliminada.');
    } catch {
      toast.error('No se pudo eliminar la invitación.');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold text-plt-text">Invitaciones</h1>
        <p className="mt-1 text-sm text-plt-muted">
          Envía invitaciones por correo para que los usuarios creen su cuenta.
        </p>
      </div>

      {/* Create form */}
      <div className="rounded-xl border border-plt-border bg-plt-bg p-6">
        <h2 className="mb-4 text-sm font-semibold text-plt-text">Nueva invitación</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Correo electrónico"
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-plt-text">
              Rol
            </label>
            <select
              id="role"
              className="h-9 w-full rounded-lg border border-plt-border bg-plt-bg px-3 text-sm text-plt-text focus:outline-none focus:ring-2 focus:ring-plt-primary"
              {...register('role')}
            >
              <option value="">Seleccionar…</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
          </div>
          <Button type="submit" loading={isSubmitting} className="shrink-0 gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-plt-border bg-plt-bg">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-center text-sm text-plt-muted">Cargando…</p>
          ) : invitations.length === 0 ? (
            <p className="p-6 text-center text-sm text-plt-muted">
              No hay invitaciones enviadas todavía.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-plt-border bg-plt-surface text-xs font-semibold uppercase tracking-wider text-plt-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Enviada</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-plt-border">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-plt-surface/50">
                    <td className="px-4 py-3 font-medium text-plt-text">{inv.email}</td>
                    <td className="px-4 py-3 text-plt-muted">{ROLE_LABELS[inv.role] ?? inv.role}</td>
                    <td className="px-4 py-3"><InvitationStatus inv={inv} /></td>
                    <td className="px-4 py-3 text-plt-muted">
                      {new Date(inv.created_at).toLocaleDateString('es-EC', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!inv.accepted && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="rounded p-1.5 text-plt-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Eliminar invitación"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
