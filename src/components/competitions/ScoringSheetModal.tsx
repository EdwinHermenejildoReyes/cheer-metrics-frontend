'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import competitionsRepository from '@/repositories/competitionsRepository';
import {
  SCORING_SYSTEM_FIELDS,
  FIELD_MAXIMA,
  AVG_FIELD_GROUPS,
  AVG_GROUP_MAX,
  type ScoreSheet,
  type ScoringSystem,
  type ScoreFieldKey,
} from '@/types/competitions';
import { cn } from '@/utils/cn';

// ── Zod schema ─────────────────────────────────────────────────────────────────

const optScore = (max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0, 'Mín. 0').max(max, `Máx. ${max}`).optional()
  );

const schema = z.object({
  // Building
  stunts_difficulty:    optScore(6),
  stunts_execution:     optScore(5),
  stunts_drivers:       optScore(0.5),
  pyramids_difficulty:  optScore(5.5),
  pyramids_execution:   optScore(5),
  tosses_difficulty:    optScore(2),
  tosses_execution:     optScore(2.5),
  // Tumbling
  standing_difficulty:  optScore(2.5),
  standing_execution:   optScore(5),
  standing_drivers:     optScore(0.5),
  running_difficulty:   optScore(2.5),
  running_execution:    optScore(5),
  running_drivers:      optScore(0.5),
  jumps_difficulty:     optScore(2),
  jumps_execution:      optScore(2.5),
  // Overall
  formations_score:     optScore(2),
  dance_difficulty:     optScore(1.5),
  dance_execution:      optScore(1.5),
  // Cross-sheet per judge
  creativity_building:  optScore(2),
  creativity_tumbling:  optScore(2),
  creativity_overall:   optScore(2),
  showmanship_building: optScore(2),
  showmanship_tumbling: optScore(2),
  showmanship_overall:  optScore(2),
  // Partner Stunt
  pg_technique:         optScore(5),
  pg_difficulty:        optScore(5),
  pg_form_appearance:   optScore(5),
  pg_transitions:       optScore(5),
  pg_expressiveness:    optScore(5),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Tab / section / field definitions ─────────────────────────────────────────

type FieldDef   = { key: ScoreFieldKey; label: string };
type SectionDef = { title: string; fields: FieldDef[] };
type TabDef     = { key: string; label: string; sections: SectionDef[] };

const ALL_TABS: TabDef[] = [
  {
    key: 'building', label: 'Elevaciones',
    sections: [
      {
        title: 'Stunts',
        fields: [
          { key: 'stunts_difficulty', label: 'Dificultad' },
          { key: 'stunts_execution',  label: 'Ejecución' },
          { key: 'stunts_drivers',    label: 'Conductores' },
        ],
      },
      {
        title: 'Pirámides',
        fields: [
          { key: 'pyramids_difficulty', label: 'Dificultad' },
          { key: 'pyramids_execution',  label: 'Ejecución' },
        ],
      },
      {
        title: 'Lanzamientos',
        fields: [
          { key: 'tosses_difficulty', label: 'Dificultad' },
          { key: 'tosses_execution',  label: 'Ejecución' },
        ],
      },
      {
        title: 'Juez de Elevaciones',
        fields: [
          { key: 'creativity_building',  label: 'Creatividad' },
          { key: 'showmanship_building', label: 'Showmanship' },
        ],
      },
    ],
  },
  {
    key: 'tumbling', label: 'Gimnasia',
    sections: [
      {
        title: 'Tumbling Estático',
        fields: [
          { key: 'standing_difficulty', label: 'Dificultad' },
          { key: 'standing_execution',  label: 'Ejecución' },
          { key: 'standing_drivers',    label: 'Conductores' },
        ],
      },
      {
        title: 'Tumbling con Carrera',
        fields: [
          { key: 'running_difficulty', label: 'Dificultad' },
          { key: 'running_execution',  label: 'Ejecución' },
          { key: 'running_drivers',    label: 'Conductores' },
        ],
      },
      {
        title: 'Saltos',
        fields: [
          { key: 'jumps_difficulty', label: 'Dificultad' },
          { key: 'jumps_execution',  label: 'Ejecución' },
        ],
      },
      {
        title: 'Juez de Gimnasia',
        fields: [
          { key: 'creativity_tumbling',  label: 'Creatividad' },
          { key: 'showmanship_tumbling', label: 'Showmanship' },
        ],
      },
    ],
  },
  {
    key: 'overall', label: 'General',
    sections: [
      {
        title: 'Formaciones y Transiciones',
        fields: [{ key: 'formations_score', label: 'Puntaje (inicio 2.0, −0.1 por error)' }],
      },
      {
        title: 'Baile',
        fields: [
          { key: 'dance_difficulty', label: 'Dificultad' },
          { key: 'dance_execution',  label: 'Ejecución' },
        ],
      },
      {
        title: 'Juez General',
        fields: [
          { key: 'creativity_overall',  label: 'Creatividad' },
          { key: 'showmanship_overall', label: 'Showmanship' },
        ],
      },
    ],
  },
  {
    key: 'partner', label: 'Parejas',
    sections: [
      {
        title: 'Partner Stunt',
        fields: [
          { key: 'pg_technique',       label: 'Técnica' },
          { key: 'pg_difficulty',      label: 'Dificultad' },
          { key: 'pg_form_appearance', label: 'Forma / Apariencia' },
          { key: 'pg_transitions',     label: 'Transiciones' },
          { key: 'pg_expressiveness',  label: 'Expresividad' },
        ],
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_AVG_KEYS = new Set(Object.values(AVG_FIELD_GROUPS).flat());

function computeRaw(values: Partial<FormValues>, activeFields: ScoreFieldKey[]): number {
  const baseFields = activeFields.filter((k) => !ALL_AVG_KEYS.has(k));
  let total = baseFields.reduce((acc, k) => acc + ((values[k as keyof FormValues] as number | undefined) ?? 0), 0);
  for (const groupFields of Object.values(AVG_FIELD_GROUPS)) {
    if (!groupFields.some((f) => activeFields.includes(f as ScoreFieldKey))) continue;
    const vals = groupFields
      .filter((f) => activeFields.includes(f as ScoreFieldKey))
      .map((f) => (values[f as keyof FormValues] as number | undefined) ?? 0);
    total += vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return total;
}

function computeMaxRaw(activeFields: ScoreFieldKey[]): number {
  const baseFields = activeFields.filter((k) => !ALL_AVG_KEYS.has(k));
  let total = baseFields.reduce((acc, k) => acc + FIELD_MAXIMA[k], 0);
  for (const groupFields of Object.values(AVG_FIELD_GROUPS)) {
    if (groupFields.some((f) => activeFields.includes(f as ScoreFieldKey))) {
      total += AVG_GROUP_MAX;
    }
  }
  return total;
}

function sumFields(values: Partial<FormValues>, keys: ScoreFieldKey[]): number {
  return keys.reduce((acc, k) => acc + ((values[k as keyof FormValues] as number | undefined) ?? 0), 0);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreInput({
  label, fieldKey, max, register, error, disabled,
}: {
  label: string; fieldKey: ScoreFieldKey; max: number;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  error?: string; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-700">{label}</label>
        <span className="text-[10px] text-zinc-400">/ {max}</span>
      </div>
      <input
        type="number" step="0.01" min={0} max={max}
        disabled={disabled} placeholder="0.00"
        {...register(fieldKey as keyof FormValues)}
        className={cn(
          'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums',
          'focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200',
          'disabled:bg-zinc-50 disabled:text-zinc-400',
          error && 'border-red-400'
        )}
      />
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (sheet: ScoreSheet) => void;
  registrationId: number;
  teamName: string;
  scoringSystem: ScoringSystem | '';
  initial?: ScoreSheet;
}

export function ScoringSheetModal({
  open, onClose, onSaved, registrationId, teamName, scoringSystem, initial,
}: Props) {
  const isEdit = !!initial;
  const [preferredTab, setPreferredTab] = useState('building');

  const activeFields: Set<ScoreFieldKey> = new Set(
    scoringSystem ? SCORING_SYSTEM_FIELDS[scoringSystem] : (Object.keys(FIELD_MAXIMA) as ScoreFieldKey[])
  );

  const visibleTabs = ALL_TABS.filter((tab) =>
    tab.sections.some((sec) => sec.fields.some((f) => activeFields.has(f.key)))
  );
  const activeTab = visibleTabs.find((t) => t.key === preferredTab)?.key ?? visibleTabs[0]?.key ?? 'building';

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
    control,
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const watched = useWatch({ control });

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const vals: Partial<FormValues> = { notes: initial.notes };
      (Object.keys(FIELD_MAXIMA) as ScoreFieldKey[]).forEach((k) => {
        const v = initial[k as keyof ScoreSheet];
        (vals as Record<string, unknown>)[k] = v !== null ? parseFloat(v as string) : undefined;
      });
      reset(vals as FormValues);
    } else {
      reset({ notes: '', formations_score: 2.0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const activeFieldList = scoringSystem
    ? SCORING_SYSTEM_FIELDS[scoringSystem]
    : (Object.keys(FIELD_MAXIMA) as ScoreFieldKey[]);

  const rawScore   = computeRaw(watched as Partial<FormValues>, activeFieldList);
  const maxRaw     = computeMaxRaw(activeFieldList);
  const percentage = maxRaw > 0 ? (rawScore / maxRaw) * 100 : 0;

  // Per-section keys for the summary
  const buildingKeys = ALL_TABS[0].sections
    .flatMap((s) => s.fields.map((f) => f.key))
    .filter((k) => activeFields.has(k) && !ALL_AVG_KEYS.has(k));
  const tumblingKeys = ALL_TABS[1].sections
    .flatMap((s) => s.fields.map((f) => f.key))
    .filter((k) => activeFields.has(k) && !ALL_AVG_KEYS.has(k));
  const overallKeys  = ALL_TABS[2].sections
    .flatMap((s) => s.fields.map((f) => f.key))
    .filter((k) => activeFields.has(k) && !ALL_AVG_KEYS.has(k));
  const partnerKeys  = ALL_TABS[3].sections
    .flatMap((s) => s.fields.map((f) => f.key))
    .filter((k) => activeFields.has(k));

  const avgCreativity = (() => {
    const grp = AVG_FIELD_GROUPS.creativity.filter((f) => activeFields.has(f as ScoreFieldKey));
    if (!grp.length) return null;
    const vals = grp.map((f) => (watched[f as keyof typeof watched] as number | undefined) ?? 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();
  const avgShowmanship = (() => {
    const grp = AVG_FIELD_GROUPS.showmanship.filter((f) => activeFields.has(f as ScoreFieldKey));
    if (!grp.length) return null;
    const vals = grp.map((f) => (watched[f as keyof typeof watched] as number | undefined) ?? 0);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  })();

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = { notes: values.notes ?? '' };
    (Object.keys(FIELD_MAXIMA) as ScoreFieldKey[]).forEach((k) => {
      payload[k] = activeFields.has(k) ? ((values[k as keyof FormValues] as number | undefined) ?? null) : null;
    });
    try {
      const res = isEdit
        ? await competitionsRepository.updateScoreSheet(initial!.id, payload)
        : await competitionsRepository.createScoreSheet({ ...payload, registration: registrationId });
      toast.success(isEdit ? 'Planilla actualizada' : 'Planilla registrada');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar la planilla');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Planilla — ${teamName}`} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Tabs */}
        <div className="flex gap-1 border-b border-zinc-200">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key} type="button"
              onClick={() => setPreferredTab(tab.key)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === tab.key
                  ? 'border-b-2 border-zinc-900 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {visibleTabs.map((tab) => {
          if (tab.key !== activeTab) return null;

          const tabKeys = tab.sections
            .flatMap((s) => s.fields.map((f) => f.key))
            .filter((k) => activeFields.has(k) && !ALL_AVG_KEYS.has(k));
          const tabTotal = sumFields(watched as Partial<FormValues>, tabKeys);
          const tabMax   = tabKeys.reduce((acc, k) => acc + FIELD_MAXIMA[k], 0);

          return (
            <div key={tab.key} className="flex flex-col gap-5">
              {tab.sections.map((sec) => {
                const sectionFields = sec.fields.filter((f) => activeFields.has(f.key));
                if (sectionFields.length === 0) return null;

                const isAvgSection = sectionFields.every((f) => ALL_AVG_KEYS.has(f.key));
                return (
                  <div key={sec.title}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {sec.title}
                      </p>
                      {isAvgSection && (
                        <span className="text-[10px] text-zinc-400 italic">promediado entre los 3 jueces</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {sectionFields.map((f) => (
                        <ScoreInput
                          key={f.key} label={f.label} fieldKey={f.key}
                          max={FIELD_MAXIMA[f.key]}
                          register={register}
                          error={errors[f.key as keyof FormValues]?.message}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Tab total (base fields only) */}
              {tabMax > 0 && (
                <div className="flex justify-end items-center gap-2 pt-1 border-t border-zinc-100 text-sm">
                  <span className="text-zinc-500">Total {tab.label}</span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {tabTotal.toFixed(2)}
                    <span className="font-normal text-zinc-400"> / {tabMax}</span>
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Score breakdown summary */}
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 flex flex-col gap-1.5 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-zinc-600">
            {buildingKeys.length > 0 && (
              <div className="flex justify-between">
                <span>Elevaciones</span>
                <span className="tabular-nums font-medium">{sumFields(watched as Partial<FormValues>, buildingKeys as ScoreFieldKey[]).toFixed(2)}</span>
              </div>
            )}
            {tumblingKeys.length > 0 && (
              <div className="flex justify-between">
                <span>Gimnasia</span>
                <span className="tabular-nums font-medium">{sumFields(watched as Partial<FormValues>, tumblingKeys as ScoreFieldKey[]).toFixed(2)}</span>
              </div>
            )}
            {overallKeys.length > 0 && (
              <div className="flex justify-between">
                <span>General</span>
                <span className="tabular-nums font-medium">{sumFields(watched as Partial<FormValues>, overallKeys as ScoreFieldKey[]).toFixed(2)}</span>
              </div>
            )}
            {partnerKeys.length > 0 && (
              <div className="flex justify-between">
                <span>Parejas</span>
                <span className="tabular-nums font-medium">{sumFields(watched as Partial<FormValues>, partnerKeys as ScoreFieldKey[]).toFixed(2)}</span>
              </div>
            )}
            {avgCreativity !== null && (
              <div className="flex justify-between">
                <span>Creatividad (avg)</span>
                <span className="tabular-nums font-medium">{avgCreativity.toFixed(2)}</span>
              </div>
            )}
            {avgShowmanship !== null && (
              <div className="flex justify-between">
                <span>Showmanship (avg)</span>
                <span className="tabular-nums font-medium">{avgShowmanship.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t border-zinc-200 pt-2 mt-1 flex justify-between font-semibold text-zinc-900">
            <span>Puntaje bruto</span>
            <span className="tabular-nums">
              {rawScore.toFixed(2)}
              <span className="ml-1 font-normal text-zinc-400 text-xs">/ {maxRaw.toFixed(1)} ({percentage.toFixed(1)}%)</span>
            </span>
          </div>
        </div>

        <Textarea
          label="Notas del juez (opcional)"
          id="notes"
          placeholder="Observaciones generales..."
          {...register('notes')}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Actualizar' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
