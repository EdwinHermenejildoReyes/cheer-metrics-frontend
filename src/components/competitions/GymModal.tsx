'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Gym } from '@/types/competitions';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  city: z.string().min(2, 'Requerido'),
  country: z.string().length(3, 'Código de 3 letras (ej: ECU)').default('ECU'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (gym: Gym) => void;
  initial?: Gym;
}

export function GymModal({ open, onClose, onSaved, initial }: Props) {
  const isEdit = !!initial;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { country: 'ECU' },
  });

  useEffect(() => {
    if (open) reset(initial ?? { name: '', city: '', country: 'ECU' });
  }, [open, initial, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = isEdit
        ? await competitionsRepository.updateGym(initial!.id, values)
        : await competitionsRepository.createGym(values);
      toast.success(isEdit ? 'Gimnasio actualizado' : 'Gimnasio creado');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar el gimnasio');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar gimnasio' : 'Nuevo gimnasio'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre" id="name" placeholder="Star Athletics" error={errors.name?.message} {...register('name')} />
        <Input label="Ciudad" id="city" placeholder="Quito" error={errors.city?.message} {...register('city')} />
        <Input label="País (código)" id="country" placeholder="ECU" error={errors.country?.message} {...register('country')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}
