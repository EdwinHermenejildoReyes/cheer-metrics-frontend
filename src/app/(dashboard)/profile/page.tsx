'use client';

import { useRef, useState } from 'react';
import { Camera, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
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

const ROLE_LABELS: Record<string, string> = {
  judge:   'Juez',
  athlete: 'Atleta',
  coach:   'Coach',
  '':      'Sin rol asignado',
};

// ── Info form ────────────────────────────────────────────────────────────────

const infoSchema = z.object({
  first_name: z.string().min(1, 'Requerido'),
  last_name:  z.string().min(1, 'Requerido'),
});
type InfoValues = z.infer<typeof infoSchema>;

// ── Password form ─────────────────────────────────────────────────────────────

const pwSchema = z
  .object({
    current_password: z.string().min(1, 'Requerido'),
    new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
    re_new_password:  z.string().min(1, 'Requerido'),
  })
  .refine((d) => d.new_password === d.re_new_password, {
    message: 'Las contraseñas no coinciden',
    path: ['re_new_password'],
  });
type PwValues = z.infer<typeof pwSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);

  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const infoForm = useForm<InfoValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: { first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' },
  });

  const pwForm = useForm<PwValues>({ resolver: zodResolver(pwSchema) });

  if (!user) return null;

  // ── Avatar ───────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      await authRepository.updateMe(fd);
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      setAvatarFile(null);
      toast.success('Foto actualizada');
    } catch {
      toast.error('No se pudo actualizar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Info ─────────────────────────────────────────────────────────────────

  const onInfoSubmit = async (values: InfoValues) => {
    try {
      await authRepository.updateMe(values);
      const meRes = await authRepository.me();
      dispatch(setUser(meRes.data));
      toast.success('Perfil actualizado');
    } catch {
      toast.error('No se pudo actualizar el perfil');
    }
  };

  // ── Password ──────────────────────────────────────────────────────────────

  const onPwSubmit = async (values: PwValues) => {
    try {
      await authRepository.setPassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success('Contraseña cambiada');
      pwForm.reset();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data?.current_password) {
        pwForm.setError('current_password', { message: data.current_password[0] });
      } else {
        toast.error('No se pudo cambiar la contraseña');
      }
    }
  };

  const avatarSrc = avatarPreview ?? user.avatar ?? null;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Mi perfil</h1>
        <p className="text-sm text-zinc-500">Gestiona tu información personal</p>
      </div>

      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-700">Foto de perfil</h2>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-900 flex items-center justify-center">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">
                  {initials(user.first_name, user.last_name)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-zinc-600">JPG, PNG o GIF. Máximo 5 MB.</p>
            {avatarFile && (
              <Button size="sm" loading={uploadingAvatar} onClick={handleAvatarSave}>
                Guardar foto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal info ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-700">Información personal</h2>
        <form onSubmit={infoForm.handleSubmit(onInfoSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre"
              id="first_name"
              error={infoForm.formState.errors.first_name?.message}
              {...infoForm.register('first_name')}
            />
            <Input
              label="Apellido"
              id="last_name"
              error={infoForm.formState.errors.last_name?.message}
              {...infoForm.register('last_name')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">Correo electrónico</label>
            <p className="h-9 flex items-center rounded-lg bg-zinc-50 border border-zinc-200 px-3 text-sm text-zinc-500 select-none">
              {user.email}
            </p>
          </div>
          <Button
            type="submit"
            size="sm"
            loading={infoForm.formState.isSubmitting}
            className="self-start"
          >
            Guardar cambios
          </Button>
        </form>
      </div>

      {/* ── Role & status ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-700">Rol y estado</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Rol</span>
            <span className="text-sm font-medium text-zinc-900">
              {user.is_staff ? 'Administrador' : ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Estado</span>
            {user.is_staff || user.is_approved ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                Aprobado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-500">
                <Clock className="h-4 w-4" />
                Pendiente de aprobación
              </span>
            )}
          </div>
          {user.is_staff && (
            <div className="col-span-2 flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cuenta de administrador con acceso completo
            </div>
          )}
        </div>
      </div>

      {/* ── Change password ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-zinc-700">Cambiar contraseña</h2>
        <form onSubmit={pwForm.handleSubmit(onPwSubmit)} className="flex flex-col gap-4">
          <Input
            label="Contraseña actual"
            id="current_password"
            type="password"
            autoComplete="current-password"
            error={pwForm.formState.errors.current_password?.message}
            {...pwForm.register('current_password')}
          />
          <Input
            label="Nueva contraseña"
            id="new_password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            error={pwForm.formState.errors.new_password?.message}
            {...pwForm.register('new_password')}
          />
          <Input
            label="Confirmar nueva contraseña"
            id="re_new_password"
            type="password"
            autoComplete="new-password"
            error={pwForm.formState.errors.re_new_password?.message}
            {...pwForm.register('re_new_password')}
          />
          <Button
            type="submit"
            size="sm"
            loading={pwForm.formState.isSubmitting}
            className="self-start"
          >
            Cambiar contraseña
          </Button>
        </form>
      </div>
    </div>
  );
}
