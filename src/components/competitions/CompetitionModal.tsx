'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import competitionsRepository from '@/repositories/competitionsRepository';
import { SCORING_FAMILY_REGULATION, type Competition, type Organization, type ScoringFamily } from '@/types/competitions';
import type { RootState } from '@/core/rootReducer';

const schema = z.object({
  name:           z.string().min(2, 'Mínimo 2 caracteres'),
  date:           z.string().min(1, 'Requerido'),
  venue:          z.string().min(2, 'Requerido'),
  city:           z.string().min(2, 'Requerido'),
  scoring_family: z.enum(['united', 'iasf_567', 'icu', 'partner_stunt', 'future_flyer', 'best_cheer']),
  service_type:   z.enum(['full', 'registration_only', 'judging_only']),
  sheet_mode:     z.enum(['grupal', 'individual']),
  notes:          z.string().optional(),
  organization:   z.string().optional(),
  require_payment: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (competition: Competition) => void;
  initial?: Competition;
}

const SCORING_FAMILY_OPTIONS = [
  { value: 'united',        label: 'United' },
  { value: 'iasf_567',      label: 'IASF (N5, N6, N7)' },
  { value: 'icu',           label: 'ICU' },
  { value: 'partner_stunt', label: 'Partner / Group Stunts' },
  { value: 'future_flyer',  label: 'Future Flyer' },
  { value: 'best_cheer',    label: 'Best Cheerleader' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'full',              label: 'Inscripción + Jueceo' },
  { value: 'registration_only', label: 'Solo Inscripción' },
  { value: 'judging_only',      label: 'Solo Jueceo' },
];

const SHEET_MODE_OPTIONS = [
  { value: 'grupal',     label: 'Grupal (construcción, tumbling, overall…)' },
  { value: 'individual', label: 'Individual (dificultad / ejecución separados)' },
];

const DEFAULT_VALUES: Partial<FormValues> = {
  scoring_family: 'united',
  service_type: 'full',
  sheet_mode: 'grupal',
  name: '', date: '', venue: '', city: '', notes: '', organization: '',
};

export function CompetitionModal({ open, onClose, onSaved, initial }: Props) {
  const isEdit = !!initial;
  const user   = useSelector((s: RootState) => s.auth.user);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, scoring_family: (initial.scoring_family ?? 'united') as ScoringFamily, sheet_mode: (initial.sheet_mode ?? 'grupal') as 'grupal' | 'individual', organization: initial.organization ? String(initial.organization) : '' }
      : DEFAULT_VALUES,
  });

  const scoringFamily = useWatch({ control, name: 'scoring_family' });
  const serviceType   = useWatch({ control, name: 'service_type' });
  const derivedRegulation = scoringFamily ? SCORING_FAMILY_REGULATION[scoringFamily] : null;

  useEffect(() => {
    competitionsRepository.listOrganizations({ page_size: '100' }).then((res) => {
      setOrgs(res.data.results);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      const defaultOrg = user?.role === 'org_admin' && user.organization ? String(user.organization) : '';
      reset(
        initial
          ? { ...initial, scoring_family: (initial.scoring_family ?? 'united') as ScoringFamily, sheet_mode: (initial.sheet_mode ?? 'grupal') as 'grupal' | 'individual', organization: initial.organization ? String(initial.organization) : defaultOrg }
          : { ...DEFAULT_VALUES, organization: defaultOrg },
      );
    }
  }, [open, initial, reset, user]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        organization: values.organization ? Number(values.organization) : null,
      };
      const res = isEdit
        ? await competitionsRepository.updateCompetition(initial!.public_id, payload)
        : await competitionsRepository.createCompetition(payload);
      toast.success(isEdit ? 'Competencia actualizada' : 'Competencia creada');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar la competencia');
    }
  };

  const orgOptions = [
    { value: '', label: '— Sin organización —' },
    ...orgs.map((o) => ({ value: String(o.id), label: o.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar competencia' : 'Nueva competencia'}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Nombre" id="name" placeholder="Copa Nacional 2025" error={errors.name?.message} {...register('name')} />
        <Input label="Fecha" id="date" type="date" error={errors.date?.message} {...register('date')} />

        {/* Sistema de calificación + Reglamento derivado */}
        <div>
          <Select
            label="Sistema de Calificación"
            id="scoring_family"
            options={SCORING_FAMILY_OPTIONS}
            error={errors.scoring_family?.message}
            {...register('scoring_family')}
          />
          {derivedRegulation && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
              Reglamento:
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {derivedRegulation}
              </span>
            </p>
          )}
        </div>

        <Select
          label="Módulos"
          id="service_type"
          options={SERVICE_TYPE_OPTIONS}
          error={errors.service_type?.message}
          {...register('service_type')}
        />
        {serviceType !== 'registration_only' && (
          <Select
            label="Modo de planillas"
            id="sheet_mode"
            options={SHEET_MODE_OPTIONS}
            error={errors.sheet_mode?.message}
            {...register('sheet_mode')}
          />
        )}
        <Input label="Sede" id="venue" placeholder="Coliseo Mayor" error={errors.venue?.message} {...register('venue')} />
        <Input label="Ciudad" id="city" placeholder="Quito" error={errors.city?.message} {...register('city')} />
        <Select
          label="Organización"
          id="organization"
          options={orgOptions}
          {...register('organization')}
        />
        <Textarea label="Notas" id="notes" placeholder="Información adicional..." {...register('notes')} />
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" className="h-4 w-4 rounded" {...register('require_payment')} />
          <span className="text-sm font-medium text-zinc-700">
            Bloquear planilla si el atleta tiene pago pendiente
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}
