'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/core/rootReducer';
import { setUser } from '@/store/auth/slices';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import authRepository from '@/repositories/authRepository';
import api from '@/services/api';

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Requerido'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  useEffect(() => {
    // Ensures Django sets the csrftoken cookie before any mutating request.
    api.get('auth/csrf/').catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user?.is_staff && !user?.is_approved) {
      router.replace('/pending');
    } else {
      router.replace('/home');
    }
  }, [isAuthenticated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await authRepository.login(values);
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      if (!meRes.data.is_staff && !meRes.data.is_approved) {
        router.replace('/pending');
      } else {
        router.replace('/home');
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        toast.error('Correo o contraseña incorrectos.');
      } else {
        toast.error('No se pudo iniciar sesión. Intente nuevamente.');
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">

      {/* ── Mesh gradient background ───────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950" />
      {/* Colored blobs */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-violet-500  opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-indigo-500  opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2  left-1/2  h-72    w-72    -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400  opacity-15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4  right-1/4 h-48    w-48    rounded-full bg-fuchsia-500 opacity-20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-1/3  h-40    w-40    rounded-full bg-cyan-400   opacity-15 blur-2xl" />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            Cheer Metrics
          </h1>
          <p className="mt-2 text-sm text-white/70">Inicia sesión para continuar</p>
        </div>

        {/* Card — frosted glass */}
        <div className="rounded-2xl border border-white/20 bg-white/95 backdrop-blur-md px-8 py-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="Correo electrónico"
              id="email"
              type="email"
              placeholder="admin@cheermetrics.com"
              autoComplete="email"
              autoFocus
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Contraseña"
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" size="lg" loading={isSubmitting} className="mt-1 w-full">
              Iniciar sesión
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-white/70">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-semibold text-white hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
