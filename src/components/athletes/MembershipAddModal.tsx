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
import { MEMBERSHIP_ROLE_LABELS, type Athlete, type MembershipRole, type TeamMembership } from '@/types/athletes';

const schema = z.object({
  athlete: z.coerce.number().min(1, 'Seleccione un atleta'),
  role:    z.string().min(1, 'Seleccione un rol'),
});

type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS = (Object.keys(MEMBERSHIP_ROLE_LABELS) as MembershipRole[]).map(
  (k) => ({ value: k, label: MEMBERSHIP_ROLE_LABELS[k] }),
);

interface Props {
  open:           boolean;
  onClose:        () => void;
  onSaved:        (membership: TeamMembership) => void;
  teamId:         number;
  teamName:       string;
  gymId:          number;
  existingIds:    number[]; // athlete IDs already in this team
}

export function MembershipAddModal({ open, onClose, onSaved, teamId, teamName, gymId, existingIds }: Props) {
  const [gymAthletes, setGymAthletes] = useState<Athlete[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues>, defaultValues: { athlete: 0, role: '' } });

  useEffect(() => {
    athletesRepository.listAthletes({ gym: String(gymId), page_size: '500' }).then(r => setGymAthletes(r.data.results));
  }, [gymId]);

  useEffect(() => {
    if (open) reset({ athlete: 0, role: '' });
  }, [open, reset]);

  const available = gymAthletes.filter(a => !existingIds.includes(a.id));
  const athleteOptions = available.map(a => ({ value: String(a.id), label: a.full_name }));

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await athletesRepository.createMembership({
        athlete: values.athlete,
        team:    teamId,
        role:    values.role as MembershipRole,
      });
      toast.success('Atleta agregado al equipo');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo agregar (puede que ya esté inscrito)');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Agregar atleta — ${teamName}`} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {available.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            Todos los atletas del gimnasio ya pertenecen a este equipo,<br />o no hay atletas registrados.
          </p>
        ) : (
          <>
            <Select
              label="Atleta"
              id="athlete"
              options={athleteOptions}
              placeholder="Seleccionar atleta..."
              error={errors.athlete?.message}
              {...register('athlete')}
            />
            <Select
              label="Rol"
              id="role"
              options={ROLE_OPTIONS}
              placeholder="Seleccionar rol..."
              error={errors.role?.message}
              {...register('role')}
            />
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          {available.length > 0 && (
            <Button type="submit" loading={isSubmitting}>Agregar</Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
