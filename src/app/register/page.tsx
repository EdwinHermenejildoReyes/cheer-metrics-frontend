'use client';

import { useEffect, useState } from 'react';
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
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Organization } from '@/types/competitions';

const ROLES = [
  { value: 'judge',   label: 'Juez',    description: 'Califico planillas en competencias' },
  { value: 'athlete', label: 'Atleta',  description: 'Compito en divisiones' },
  { value: 'coach',   label: 'Coach',   description: 'Dirijo un equipo o gimnasio' },
] as const;

const schema = z
  .object({
    first_name:   z.string().min(1, 'Requerido'),
    last_name:    z.string().min(1, 'Requerido'),
    email:        z.string().email('Correo inválido'),
    role:         z.string().refine((v) => ['judge', 'athlete', 'coach'].includes(v), 'Selecciona un rol'),
    organization: z.coerce.number().nullable().optional(),
    password:     z.string().min(8, 'Mínimo 8 caracteres'),
    re_password:  z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.password === d.re_password, {
    message: 'Las contraseñas no coinciden',
    path: ['re_password'],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!user?.is_staff && !user?.is_approved) {
      router.replace('/pending');
    } else {
      router.replace('/competitions');
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    competitionsRepository.listOrganizations({ page_size: '100' })
      .then((res) => setOrganizations(res.data.results))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const selectedRole = watch('role');

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        organization: values.organization || null,
      };
      await authRepository.signUp(payload);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (!data) {
        toast.error('No se pudo crear la cuenta. Intente nuevamente.');
        return;
      }

      const fieldMap: Record<string, keyof FormValues> = {
        first_name:   'first_name',
        last_name:    'last_name',
        email:        'email',
        password:     'password',
        re_password:  're_password',
        role:         'role',
        organization: 'organization',
      };
      let hasFieldError = false;
      for (const [key, field] of Object.entries(fieldMap)) {
        if (data[key]?.length) {
          setError(field, { message: data[key][0] });
          hasFieldError = true;
        }
      }
      if (data.non_field_errors?.length) {
        toast.error(data.non_field_errors[0]);
      } else if (!hasFieldError) {
        toast.error('No se pudo crear la cuenta. Intente nuevamente.');
      }
      return;
    }

    try {
      await authRepository.login({ email: values.email, password: values.password });
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      toast.success('Cuenta creada. Tu solicitud está pendiente de aprobación.');
      router.replace('/pending');
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
          <p className="mt-1 text-sm text-zinc-500">Crea tu cuenta</p>
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

            {/* Role picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">¿Cuál es tu rol?</span>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setValue('role', r.value, { shouldValidate: true })}
                    className={[
                      'flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-colors',
                      selectedRole === r.value
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400',
                    ].join(' ')}
                  >
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className={['text-[10px] leading-tight', selectedRole === r.value ? 'text-zinc-300' : 'text-zinc-400'].join(' ')}>
                      {r.description}
                    </span>
                  </button>
                ))}
              </div>
              {errors.role && (
                <p className="text-xs text-red-500">{errors.role.message}</p>
              )}
            </div>

            {/* Organization picker */}
            {organizations.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="organization" className="text-sm font-medium text-zinc-700">
                  Organización <span className="font-normal text-zinc-400">(opcional)</span>
                </label>
                <select
                  id="organization"
                  className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  {...register('organization')}
                >
                  <option value="">Sin organización</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {errors.organization && (
                  <p className="text-xs text-red-500">{errors.organization.message as string}</p>
                )}
              </div>
            )}

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
