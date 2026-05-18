'use client';

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import athletesRepository from '@/repositories/athletesRepository';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { TeamMembership, MembershipRole } from '@/types/athletes';
import type { Team } from '@/types/competitions';
import { MEMBERSHIP_ROLE_LABELS } from '@/types/athletes';

const schema = z.object({
  team: z.coerce.number().min(1, 'Seleccione un equipo'),
  role: z.string().min(1, 'Seleccione un rol'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (membership: TeamMembership) => void;
  athleteId: number;
  athleteName: string;
}

const ROLE_OPTIONS = (Object.keys(MEMBERSHIP_ROLE_LABELS) as (keyof typeof MEMBERSHIP_ROLE_LABELS)[]).map(
  (k) => ({ value: k, label: MEMBERSHIP_ROLE_LABELS[k] })
);

export function MembershipModal({ open, onClose, onSaved, athleteId, athleteName }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { team: 0, role: '' },
  });

  useEffect(() => {
    competitionsRepository.listTeams({ page_size: '200' }).then((r) => setTeams(r.data.results));
  }, []);

  useEffect(() => {
    if (open) reset({ team: 0, role: '' });
  }, [open, reset]);

  const teamOptions = teams.map((t) => ({ value: String(t.id), label: `${t.gym_name} – ${t.name}` }));

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await athletesRepository.createMembership({
        ...values,
        role: values.role as MembershipRole,
        athlete: athleteId,
      });
      toast.success('Atleta agregado al equipo');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo agregar al equipo (puede que ya esté inscrito)');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agregar a equipo — ${athleteName}`} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Select
          label="Equipo"
          id="team"
          options={teamOptions}
          placeholder="Seleccionar equipo..."
          error={errors.team?.message}
          {...register('team')}
        />
        <Select
          label="Rol"
          id="role"
          options={ROLE_OPTIONS}
          placeholder="Seleccionar rol..."
          error={errors.role?.message}
          {...register('role')}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Agregar</Button>
        </div>
      </form>
    </Modal>
  );
}
