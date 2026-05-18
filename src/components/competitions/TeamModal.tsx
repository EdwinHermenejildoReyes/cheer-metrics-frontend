'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Team } from '@/types/competitions';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (team: Team) => void;
  gymId: number;
  initial?: Team;
}

export function TeamModal({ open, onClose, onSaved, gymId, initial }: Props) {
  const isEdit = !!initial;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) reset(initial ? { name: initial.name } : { name: '' });
  }, [open, initial, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = isEdit
        ? await competitionsRepository.updateTeam(initial!.id, { ...values, gym: gymId })
        : await competitionsRepository.createTeam({ ...values, gym: gymId });
      toast.success(isEdit ? 'Equipo actualizado' : 'Equipo creado');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar el equipo');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar equipo' : 'Nuevo equipo'} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre del equipo" id="name" placeholder="Senior Elite" error={errors.name?.message} {...register('name')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}
