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
    if (!isAuthenticated) return;
    if (!user?.is_staff && !user?.is_approved) {
      router.replace('/pending');
    } else {
      router.replace('/competitions');
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
        router.replace('/competitions');
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Cheer Metrics</h1>
          <p className="mt-1 text-sm text-zinc-500">Inicia sesión para continuar</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-8 shadow-sm">

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

        <p className="mt-4 text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
