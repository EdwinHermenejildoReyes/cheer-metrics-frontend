'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import athletesRepository from '@/repositories/athletesRepository';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Athlete } from '@/types/athletes';
import type { Gym } from '@/types/competitions';

// ── Ecuador cédula validation (mod-10) ───────────────────────────────────────
function validateCedula(value: string | undefined): boolean {
  if (!value || !value.trim()) return true;
  const c = value.trim();
  if (!/^\d{10}$/.test(c)) return false;
  const province = parseInt(c.slice(0, 2), 10);
  if (province < 1 || province > 24) return false;
  if (parseInt(c[2], 10) >= 6) return false;
  const weights = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const total = weights.reduce((sum, w, i) => {
    const d = parseInt(c[i], 10) * w;
    return sum + (d >= 10 ? d - 9 : d);
  }, 0);
  return (10 - (total % 10)) % 10 === parseInt(c[9], 10);
}

const GENDER_OPTIONS = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'O', label: 'Otro' },
];

const schema = z.object({
  first_name:  z.string().min(2, 'Mínimo 2 caracteres'),
  last_name:   z.string().min(2, 'Mínimo 2 caracteres'),
  birth_date:  z.string().min(1, 'Requerido'),
  gender:      z.enum(['F', 'M', 'O']),
  document_id: z.string().optional().refine(validateCedula, {
    message: 'Cédula inválida — debe tener 10 dígitos y pasar el dígito verificador',
  }),
  gym: z.coerce.number().min(1, 'Seleccione un gimnasio'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSaved:   (athlete: Athlete) => void;
  gymId?:    number;   // when set, gym selector is hidden
  initial?:  Athlete;
}

export function AthleteModal({ open, onClose, onSaved, gymId, initial }: Props) {
  const isEdit  = !!initial;
  const fixedGym = gymId !== undefined;
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gyms,         setGyms]         = useState<Gym[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  useEffect(() => {
    if (!fixedGym) {
      competitionsRepository.listGyms({ page_size: '200' }).then(r => setGyms(r.data.results));
    }
  }, [fixedGym]);

  useEffect(() => {
    if (!open) return;
    const defaultGym = gymId ?? (initial?.gym ?? 0);
    reset(initial
      ? { first_name: initial.first_name, last_name: initial.last_name, birth_date: initial.birth_date, gender: initial.gender, document_id: initial.document_id ?? '', gym: initial.gym }
      : { first_name: '', last_name: '', birth_date: '', gender: 'F', document_id: '', gym: defaultGym },
    );
    setPhotoFile(null);
    setPhotoPreview(initial?.photo ?? null);
  }, [open, initial, gymId, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const fd = new FormData();
      fd.append('first_name',  values.first_name);
      fd.append('last_name',   values.last_name);
      fd.append('birth_date',  values.birth_date);
      fd.append('gender',      values.gender);
      fd.append('document_id', values.document_id ?? '');
      fd.append('gym',         String(values.gym));
      if (photoFile) fd.append('photo', photoFile);

      const res = isEdit
        ? await athletesRepository.updateAthlete(initial!.id, fd)
        : await athletesRepository.createAthlete(fd);
      toast.success(isEdit ? 'Atleta actualizado' : 'Atleta creado');
      onSaved(res.data);
      onClose();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const first = data && Object.values(data)[0]?.[0];
      toast.error(first ?? 'No se pudo guardar el atleta');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar atleta' : 'Nuevo atleta'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              : <Upload className="h-5 w-5 text-zinc-400" />
            }
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
                {photoPreview ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 hover:text-red-500 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">JPG, PNG · opcional</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
          }} />
        </div>

        {/* Names */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombres *" id="first_name" placeholder="Ana" error={errors.first_name?.message} {...register('first_name')} />
          <Input label="Apellidos *" id="last_name" placeholder="Pérez" error={errors.last_name?.message} {...register('last_name')} />
        </div>

        {/* Birth + Gender */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha de nacimiento *" id="birth_date" type="date" error={errors.birth_date?.message} {...register('birth_date')} />
          <Select label="Género *" id="gender" options={GENDER_OPTIONS} error={errors.gender?.message} {...register('gender')} />
        </div>

        {/* Cédula */}
        <Input
          label="Cédula ecuatoriana (opcional)"
          id="document_id"
          placeholder="1712345678"
          maxLength={10}
          error={errors.document_id?.message}
          {...register('document_id')}
        />

        {/* Gym selector — only when gymId is not preset */}
        {!fixedGym && (
          <Select
            label="Gimnasio *"
            id="gym"
            options={gyms.map(g => ({ value: String(g.id), label: g.name }))}
            placeholder="Seleccionar..."
            error={errors.gym?.message}
            {...register('gym')}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear atleta'}</Button>
        </div>
      </form>
    </Modal>
  );
}
