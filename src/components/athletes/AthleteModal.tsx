'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import athletesRepository from '@/repositories/athletesRepository';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Athlete } from '@/types/athletes';
import type { Gym } from '@/types/competitions';

const schema = z.object({
  first_name:  z.string().min(1, 'Requerido'),
  last_name:   z.string().min(1, 'Requerido'),
  birth_date:  z.string().min(1, 'Requerido'),
  gender:      z.enum(['F', 'M', 'O']),
  document_id: z.string().optional(),
  gym:         z.coerce.number().min(1, 'Seleccione un gimnasio'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (athlete: Athlete) => void;
  initial?: Athlete;
  defaultGymId?: number;
}

const GENDER_OPTIONS = [
  { value: 'F', label: 'Femenino' },
  { value: 'M', label: 'Masculino' },
  { value: 'O', label: 'Otro' },
];

export function AthleteModal({ open, onClose, onSaved, initial, defaultGymId }: Props) {
  const isEdit = !!initial;
  const [gyms, setGyms] = useState<Gym[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { gender: 'F', gym: defaultGymId ?? 0 },
  });

  useEffect(() => {
    competitionsRepository.listGyms({ page_size: '200' }).then((r) => setGyms(r.data.results));
  }, []);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { ...initial, gym: initial.gym, document_id: initial.document_id ?? '' }
          : { gender: 'F', gym: defaultGymId ?? 0, first_name: '', last_name: '', birth_date: '', document_id: '' }
      );
    }
  }, [open, initial, defaultGymId, reset]);

  const gymOptions = gyms.map((g) => ({ value: String(g.id), label: g.name }));

  const onSubmit = async (values: FormValues) => {
    try {
      const res = isEdit
        ? await athletesRepository.updateAthlete(initial!.id, values)
        : await athletesRepository.createAthlete(values);
      toast.success(isEdit ? 'Atleta actualizado' : 'Atleta creado');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar el atleta');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar atleta' : 'Nuevo atleta'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nombre" id="first_name" placeholder="María" error={errors.first_name?.message} {...register('first_name')} />
          <Input label="Apellido" id="last_name" placeholder="García" error={errors.last_name?.message} {...register('last_name')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha de nacimiento" id="birth_date" type="date" error={errors.birth_date?.message} {...register('birth_date')} />
          <Select label="Género" id="gender" options={GENDER_OPTIONS} error={errors.gender?.message} {...register('gender')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cédula / ID" id="document_id" placeholder="1234567890" {...register('document_id')} />
          <Select
            label="Gimnasio"
            id="gym"
            options={gymOptions}
            placeholder="Seleccionar..."
            error={errors.gym?.message}
            {...register('gym')}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}
