'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/useConfirm';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Registration, Team } from '@/types/competitions';

const schema = z.object({
  team: z.coerce.number().min(1, 'Seleccione un equipo'),
  status: z.string().min(1, 'Requerido'),
  performance_order: z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (registration: Registration) => void;
  divisionId: number;
  initial?: Registration;
  registrations?: Registration[];
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'withdrawn', label: 'Retirada' },
];

export function RegistrationModal({ open, onClose, onSaved, divisionId, initial, registrations }: Props) {
  const isEdit = !!initial;
  const confirm = useConfirm();
  const [teams, setTeams] = useState<Team[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { status: 'pending' },
  });

  useEffect(() => {
    if (!isEdit) {
      competitionsRepository.listTeams({ page_size: '200' }).then((res) => setTeams(res.data.results));
    }
  }, [isEdit]);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { team: initial.team, status: initial.status, performance_order: initial.performance_order ?? undefined }
          : { team: 0, status: 'pending' }
      );
    }
  }, [open, initial, reset]);

  const teamOptions = teams.map((t) => ({ value: String(t.id), label: `${t.gym_name} – ${t.name}` }));

  const onSubmit = async (values: FormValues) => {
    try {
      const newOrder = values.performance_order ?? null;
      const oldOrder = initial?.performance_order ?? null;

      if (isEdit && newOrder !== null && oldOrder !== null && newOrder !== oldOrder) {
        const displaced = registrations?.find(
          (r) => r.performance_order === newOrder && r.id !== initial!.id
        );
        const lines = [
          `${initial!.team_name} pasará del puesto #${oldOrder} al #${newOrder}.`,
          displaced
            ? `${displaced.team_name} (actualmente #${newOrder}) pasará al #${oldOrder}.`
            : null,
        ].filter(Boolean).join('\n');

        const ok = await confirm({ title: 'Cambiar orden de presentación', message: lines, confirmLabel: 'Confirmar', variant: 'warning' });
        if (!ok) return;
      }

      const payload = { ...values, division: divisionId } as Partial<Registration> & { division: number };
      const res = isEdit
        ? await competitionsRepository.updateRegistration(initial!.public_id, payload)
        : await competitionsRepository.createRegistration(payload);
      toast.success(isEdit ? 'Inscripción actualizada' : 'Equipo inscrito');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar la inscripción');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar inscripción' : 'Inscribir equipo'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {isEdit ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-plt-text">Equipo</span>
            <div className="flex h-9 items-center rounded-lg border border-plt-border bg-plt-surface px-3 text-sm text-plt-muted">
              {initial!.team_name}
            </div>
          </div>
        ) : (
          <Select
            label="Equipo"
            id="team"
            options={teamOptions}
            placeholder="Seleccionar equipo..."
            error={errors.team?.message}
            {...register('team')}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Estado"
            id="status"
            options={STATUS_OPTIONS}
            error={errors.status?.message}
            {...register('status')}
          />
          <Input
            label="Orden de salida"
            id="performance_order"
            type="number"
            placeholder="1"
            {...register('performance_order')}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Inscribir'}</Button>
        </div>
      </form>
    </Modal>
  );
}
