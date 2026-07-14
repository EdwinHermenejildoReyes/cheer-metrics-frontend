'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/core/rootReducer';
import { setUser } from '@/store/auth/slices';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import authRepository, { type InvitationValidation } from '@/repositories/authRepository';

const schema = z
  .object({
    first_name:  z.string().min(1, 'Requerido'),
    last_name:   z.string().min(1, 'Requerido'),
    password:    z.string().min(8, 'Mínimo 8 caracteres'),
    re_password: z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.password === d.re_password, {
    message: 'Las contraseñas no coinciden',
    path: ['re_password'],
  });

type FormValues = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = {
  org_admin: 'Administrador de organización',
  judge:     'Juez',
  athlete:   'Atleta',
  coach:     'Coach',
};

export default function RegisterPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const dispatch     = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const user            = useSelector((s: RootState) => s.auth.user);

  const token = searchParams.get('token');

  const [invitation, setInvitation]     = useState<InvitationValidation | null>(null);
  const [validating, setValidating]     = useState(!!token);
  const [tokenError, setTokenError]     = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user?.is_staff && !user?.is_approved) {
      router.replace('/pending');
    } else {
      router.replace('/competitions');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!token) return;
    authRepository.validateInvitation(token)
      .then((res) => setInvitation(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.detail ?? 'Invitación no válida o expirada.';
        setTokenError(msg);
      })
      .finally(() => setValidating(false));
  }, [token]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!token || !invitation) return;
    try {
      await authRepository.registerWithInvitation({ token, ...values });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (!data) {
        toast.error('No se pudo crear la cuenta. Intente nuevamente.');
        return;
      }
      const fieldMap: Record<string, keyof FormValues> = {
        first_name: 'first_name', last_name: 'last_name',
        password: 'password', re_password: 're_password',
      };
      let hasFieldError = false;
      for (const [key, field] of Object.entries(fieldMap)) {
        if ((data as Record<string, string[]>)[key]?.length) {
          setError(field, { message: (data as Record<string, string[]>)[key][0] });
          hasFieldError = true;
        }
      }
      if ((data as Record<string, string[]>).non_field_errors?.length) {
        toast.error((data as Record<string, string[]>).non_field_errors[0]);
      } else if (!hasFieldError) {
        const detail = (data as { detail?: string }).detail;
        toast.error(detail ?? 'No se pudo crear la cuenta. Intente nuevamente.');
      }
      return;
    }

    try {
      await authRepository.login({ email: invitation.email, password: values.password });
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      toast.success('Cuenta creada exitosamente.');
      router.replace('/competitions');
    } catch {
      toast.success('Cuenta creada. Inicia sesión para continuar.');
      router.replace('/login');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950" />
      <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-500 opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500 opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 opacity-15 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">Cheer Metrics</h1>
          <p className="mt-2 text-sm text-white/70">Crear cuenta</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-md px-8 py-8 shadow-2xl shadow-black/40">

          {/* No token */}
          {!token && (
            <div className="text-center">
              <p className="text-sm text-zinc-600">
                El acceso a Cheer Metrics es <strong>solo por invitación</strong>.
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Contacta al administrador para recibir tu invitación.
              </p>
            </div>
          )}

          {/* Validating */}
          {token && validating && (
            <p className="text-center text-sm text-zinc-500">Verificando invitación…</p>
          )}

          {/* Token error */}
          {token && !validating && tokenError && (
            <div className="text-center">
              <p className="text-sm font-medium text-red-600">{tokenError}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Solicita una nueva invitación al administrador.
              </p>
            </div>
          )}

          {/* Valid invitation — show form */}
          {token && !validating && invitation && (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {/* Invitation badge */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm">
                <p className="font-medium text-zinc-800">{invitation.email}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Rol: {ROLE_LABELS[invitation.role] ?? invitation.role}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre"
                  id="first_name"
                  placeholder="Juan"
                  autoFocus
                  error={errors.first_name?.message}
                  {...register('first_name')}
                />
                <Input
                  label="Apellido"
                  id="last_name"
                  placeholder="Pérez"
                  error={errors.last_name?.message}
                  {...register('last_name')}
                />
              </div>
              <Input
                label="Contraseña"
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirmar contraseña"
                id="re_password"
                type="password"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
                error={errors.re_password?.message}
                {...register('re_password')}
              />
              <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
                Crear cuenta
              </Button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-white/70">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-white hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
