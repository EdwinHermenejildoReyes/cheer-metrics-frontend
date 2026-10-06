'use client';

import { useEffect } from 'react';
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
import { useState } from 'react';

const schema = z.object({
  name:            z.string().min(2, 'Mínimo 2 caracteres'),
  date:            z.string().min(1, 'Requerido'),
  end_datetime:    z.string().optional(),
  venue:           z.string().min(2, 'Requerido'),
  city:            z.string().min(2, 'Requerido'),
  scoring_family:  z.enum(['united', 'united_intl', 'iasf_567', 'icu', 'partner_stunt', 'future_flyer', 'best_cheer', 'icu_dance']),
  sheet_mode:      z.enum(['grupal', 'individual', 'icu_dance']),
  service_type:    z.enum(['full', 'registration_only', 'judging_only']),
  notes:           z.string().optional(),
  organization:    z.string().optional(),
  require_payment: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (competition: Competition) => void;
  initial?: Competition;
}

const normalizeScoringFamily = (f: string | null | undefined): ScoringFamily =>
  !f || f === 'united' ? 'united_intl' : f as ScoringFamily;

function formatDateTimeLocal(d: Date): string {
  // Format as "YYYY-MM-DDTHH:mm" for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Default sheet_mode for each scoring_family
const FAMILY_TO_SHEET_MODE: Record<string, 'grupal' | 'individual' | 'icu_dance'> = {
  united:        'grupal',
  united_intl:   'individual',
  iasf_567:      'individual',
  icu:           'individual',
  partner_stunt: 'individual',
  future_flyer:  'individual',
  best_cheer:    'individual',
  icu_dance:     'icu_dance',
};

const SCORING_FAMILY_OPTIONS = [
  { value: 'united_intl',   label: 'United Internacional' },
  { value: 'united',        label: 'United (local / grupal)' },
  { value: 'iasf_567',      label: 'IASF (N5, N6, N7)' },
  { value: 'icu',           label: 'ICU' },
  { value: 'partner_stunt', label: 'Partner / Group Stunts' },
  { value: 'future_flyer',  label: 'Future Flyer' },
  { value: 'best_cheer',    label: 'Best Cheerleader' },
  { value: 'icu_dance',     label: 'ICU Dance (POM / Hip Hop / Jazz / High Kick / Doubles HH)' },
];

const SHEET_MODE_OPTIONS = [
  { value: 'individual', label: 'Individual — Dificultad + Ejecución por hoja (DV Championship, IASF)' },
  { value: 'grupal',     label: 'Grupal — Building / Tumbling / Overall (competencias locales)' },
  { value: 'icu_dance',  label: 'ICU Dance (fijado por sistema de calificación)' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'full',              label: 'Inscripción + Jueceo' },
  { value: 'registration_only', label: 'Solo Inscripción' },
  { value: 'judging_only',      label: 'Solo Jueceo' },
];

const DEFAULT_VALUES: Partial<FormValues> = {
  scoring_family: 'united_intl',
  sheet_mode:     'individual',
  service_type:   'full',
  name: '', date: '', end_datetime: '', venue: '', city: '', notes: '', organization: '',
};

export function CompetitionModal({ open, onClose, onSaved, initial }: Props) {
  const isEdit     = !!initial;
  const user       = useSelector((s: RootState) => s.auth.user);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? {
          ...initial,
          scoring_family: normalizeScoringFamily(initial.scoring_family),
          sheet_mode: (initial.sheet_mode ?? 'individual') as 'grupal' | 'individual' | 'icu_dance',
          organization: initial.organization ? String(initial.organization) : '',
          end_datetime: initial.end_datetime
            ? new Date(initial.end_datetime).toISOString().slice(0, 16)
            : '',
        }
      : DEFAULT_VALUES,
  });

  const scoringFamily  = useWatch({ control, name: 'scoring_family' });
  const sheetMode      = useWatch({ control, name: 'sheet_mode' });
  const endDatetimeVal = useWatch({ control, name: 'end_datetime' });
  const derivedRegulation = scoringFamily ? SCORING_FAMILY_REGULATION[scoringFamily] : null;

  // Show inactive banner when editing a competition whose stored is_active=false
  // AND the current end_datetime form value doesn't already fix that
  const isInactive = isEdit && initial?.is_active === false &&
    (!endDatetimeVal || new Date(endDatetimeVal) <= new Date());

  // Auto-derive sheet_mode when scoring_family changes (only if not already editing a saved value)
  useEffect(() => {
    if (!isEdit && scoringFamily) {
      const suggested = FAMILY_TO_SHEET_MODE[scoringFamily];
      if (suggested) setValue('sheet_mode', suggested);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoringFamily]);

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
          ? {
              ...initial,
              scoring_family: normalizeScoringFamily(initial.scoring_family),
              sheet_mode: (initial.sheet_mode ?? 'individual') as 'grupal' | 'individual' | 'icu_dance',
              organization: initial.organization ? String(initial.organization) : defaultOrg,
              end_datetime: initial.end_datetime
                ? new Date(initial.end_datetime).toISOString().slice(0, 16)
                : '',
            }
          : { ...DEFAULT_VALUES, organization: defaultOrg },
      );
    }
  }, [open, initial, reset, user]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        organization: values.organization ? Number(values.organization) : null,
        end_datetime:  values.end_datetime || null,
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar competencia' : 'Nueva competencia'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* ── Inactive competition warning ── */}
        {isInactive && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">Esta competencia está inactiva</p>
            <p className="mt-0.5 text-amber-700">
              Los jueces no pueden acceder porque la fecha de cierre ya pasó.
              Para reactivarla, establece una fecha de cierre futura.
            </p>
            <button
              type="button"
              onClick={() => setValue('end_datetime', formatDateTimeLocal(new Date(Date.now() + 24 * 3600 * 1000)))}
              className="mt-2 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
            >
              Reactivar por 24 horas
            </button>
          </div>
        )}

        {/* Fila 1: Nombre (full width) */}
        <Input label="Nombre" id="name" placeholder="Copa Nacional 2025" error={errors.name?.message} {...register('name')} />

        {/* Fila 2: Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Fecha del evento" id="date" type="date" error={errors.date?.message} {...register('date')} />
          <div>
            <Input
              label="Cierre de acceso (opcional)"
              id="end_datetime"
              type="datetime-local"
              error={errors.end_datetime?.message}
              {...register('end_datetime')}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Sin valor: cierra a medianoche del día del evento.
            </p>
          </div>
        </div>

        {/* Fila 3: Sistema de calificación | Modo de planillas */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <Select
              label="Modo de planillas"
              id="sheet_mode"
              options={SHEET_MODE_OPTIONS}
              disabled={sheetMode === 'icu_dance'}
              error={errors.sheet_mode?.message}
              {...register('sheet_mode')}
            />
            {sheetMode === 'icu_dance' && (
              <p className="mt-1 text-xs text-zinc-400">Fijado automáticamente por ICU Dance.</p>
            )}
          </div>
        </div>

        {/* Fila 4: Módulos | Organización */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Módulos"
            id="service_type"
            options={SERVICE_TYPE_OPTIONS}
            error={errors.service_type?.message}
            {...register('service_type')}
          />
          <Select
            label="Organización"
            id="organization"
            options={orgOptions}
            {...register('organization')}
          />
        </div>

        {/* Fila 5: Sede | Ciudad */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Sede" id="venue" placeholder="Coliseo Mayor" error={errors.venue?.message} {...register('venue')} />
          <Input label="Ciudad" id="city" placeholder="Guayaquil" error={errors.city?.message} {...register('city')} />
        </div>

        {/* Fila 6: Notas (full width) */}
        <Textarea label="Notas" id="notes" placeholder="Información adicional..." {...register('notes')} />

        {/* Fila 7: Checkbox + Botones */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 rounded" {...register('require_payment')} />
            <span className="text-sm font-medium text-zinc-700">
              Bloquear planilla si el atleta tiene pago pendiente
            </span>
          </label>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
          </div>
        </div>

      </form>
    </Modal>
  );
}
