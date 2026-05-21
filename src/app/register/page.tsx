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

const schema = z
  .object({
    first_name: z.string().min(1, 'Requerido'),
    last_name:  z.string().min(1, 'Requerido'),
    email:      z.string().email('Correo inválido'),
    password:   z.string().min(8, 'Mínimo 8 caracteres'),
    re_password: z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.password === d.re_password, {
    message: 'Las contraseñas no coinciden',
    path: ['re_password'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace('/competitions');
  }, [isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await authRepository.signUp(values);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data?.email) {
        toast.error(data.email[0]);
      } else {
        toast.error('No se pudo crear la cuenta. Intente nuevamente.');
      }
      return;
    }

    // Auto-login after registration
    try {
      await authRepository.login({ email: values.email, password: values.password });
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      toast.success('Cuenta creada. ¡Bienvenido!');
      router.replace('/competitions');
    } catch {
      toast.success('Cuenta creada. Inicia sesión para continuar.');
      router.replace('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Cheer Metrics</h1>
          <p className="mt-1 text-sm text-zinc-500">Crea tu cuenta de juez</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
              label="Correo electrónico"
              id="email"
              type="email"
              placeholder="juez@cheermetrics.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
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
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-zinc-900 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
