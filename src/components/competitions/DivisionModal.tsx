'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import competitionsRepository from '@/repositories/competitionsRepository';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  type AgeGroup,
  type SkillLevel,
  type DivisionCategory,
  type Division,
  type ScoringSystem,
} from '@/types/competitions';

// ── Modality system ───────────────────────────────────────────────────────────

type Modality =
  | 'novice' | 'prep' | 'escolar'
  | 'elite' | 'iasf'
  | 'group_stunt' | 'future_flyer'
  | 'best_cheerleader' | 'paracheer' | 'cheer_parents';

interface ModalityConfig {
  label: string;
  ageGroups: AgeGroup[];
  skillLevels: SkillLevel[];
  autoCategory: DivisionCategory | null;
  allowedCategories?: DivisionCategory[];
  showNonTumbling?: boolean;
  defaultScoring?: ScoringSystem;
}

const MODALITY_CONFIG: Record<Modality, ModalityConfig> = {
  novice: {
    label: 'All Star Novice',
    ageGroups: ['tiny', 'mini', 'youth'],
    skillLevels: ['novice', 'novice_plus'],
    autoCategory: 'mixed',
  },
  prep: {
    label: 'All Star Prep',
    ageGroups: ['mini', 'youth', 'junior', 'senior'],
    skillLevels: ['prep'],
    autoCategory: 'mixed',
  },
  escolar: {
    label: 'Escolar',
    ageGroups: ['mini', 'youth', 'junior', 'senior', 'open'],
    skillLevels: ['escolar', 'escolar_l3', 'escolar_l4', 'escolar_l5', 'escolar_l6', 'escolar_l7'],
    autoCategory: 'mixed',
  },
  elite: {
    label: 'All Star Elite (N1–N4)',
    ageGroups: ['mini', 'youth', 'junior', 'senior', 'open'],
    skillLevels: ['L1', 'L2', 'L3', 'L4', 'L4_2'],
    autoCategory: null,
    allowedCategories: ['all_girl', 'coed', 'mixed'],
  },
  iasf: {
    label: 'All Star Elite IASF (N5–N7)',
    ageGroups: ['open'],
    skillLevels: ['L5', 'L6', 'L7'],
    autoCategory: null,
    allowedCategories: ['all_girl', 'coed', 'mixed'],
    showNonTumbling: true,
  },
  group_stunt: {
    label: 'Group Stunt / Partner Stunt',
    ageGroups: ['open'],
    skillLevels: ['group_stunt'],
    autoCategory: null,
    allowedCategories: ['all_girl', 'coed'],
    defaultScoring: 'partner_stunt',
  },
  future_flyer: {
    label: 'Future Flyer',
    ageGroups: ['mini', 'youth'],
    skillLevels: ['future_flyer'],
    autoCategory: 'mixed',
    defaultScoring: 'partner_stunt',
  },
  best_cheerleader: {
    label: 'Best Cheerleader',
    ageGroups: ['mini', 'youth', 'junior', 'senior', 'open'],
    skillLevels: ['best_cheerleader'],
    autoCategory: 'mixed',
  },
  paracheer: {
    label: 'Paracheer',
    ageGroups: ['open'],
    skillLevels: ['paracheer'],
    autoCategory: 'mixed',
  },
  cheer_parents: {
    label: 'Padres Showoff',
    ageGroups: ['open'],
    skillLevels: ['cheer_parents'],
    autoCategory: 'mixed',
  },
};

const MODALITY_OPTIONS = (Object.entries(MODALITY_CONFIG) as [Modality, ModalityConfig][]).map(
  ([value, { label }]) => ({ value, label }),
);

function modalityFromSkillLevel(sl: string): Modality {
  if (sl === 'novice' || sl === 'novice_plus') return 'novice';
  if (sl === 'prep') return 'prep';
  if (sl === 'escolar' || sl.startsWith('escolar_')) return 'escolar';
  if (['L1', 'L2', 'L3', 'L4', 'L4_2', 'elite', 'icc', 'star'].includes(sl)) return 'elite';
  if (['L5', 'L6', 'L7', 'iasf_cat'].includes(sl)) return 'iasf';
  if (sl === 'group_stunt') return 'group_stunt';
  if (sl === 'future_flyer') return 'future_flyer';
  if (sl === 'best_cheerleader') return 'best_cheerleader';
  if (sl === 'paracheer') return 'paracheer';
  if (sl === 'cheer_parents') return 'cheer_parents';
  return 'elite';
}

function suggestScoringSystem(skillLevel: string, ageGroup: string, isNonTumbling: boolean): ScoringSystem {
  if (isNonTumbling) return 'elite_nt';
  if (skillLevel === 'novice') return ageGroup === 'tiny' ? 'tiny_novice' : 'mini_novice';
  const map: Record<string, ScoringSystem> = {
    novice_plus: 'novice_plus',
    prep:        'prep',
    escolar:     'escolar', escolar_l3: 'escolar', escolar_l4: 'escolar',
    escolar_l5:  'escolar', escolar_l6: 'escolar', escolar_l7: 'escolar',
    L1:    'elite_l1',
    L2:    'elite_l2_7', L3: 'elite_l2_7', L4: 'elite_l2_7', L4_2: 'elite_l2_7',
    L5:    'elite_l2_7',
    L6:    'iasf_l6_7', L7: 'iasf_l6_7',
    group_stunt:  'partner_stunt',
    future_flyer: 'partner_stunt',
    elite: 'elite_l2_7', icc: 'elite_l2_7', iasf_cat: 'iasf_l6_7', star: 'elite_l2_7',
  };
  return map[skillLevel] ?? 'elite_l2_7';
}

// ── Form ──────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:            z.string().min(1, 'Requerido'),
  age_group:       z.string().min(1, 'Requerido'),
  skill_level:     z.string().min(1, 'Requerido'),
  category:        z.string().min(1, 'Requerido'),
  is_non_tumbling: z.boolean().optional(),
  scoring_system:  z.string().optional(),
  min_athletes:    z.coerce.number().nullable().optional(),
  max_athletes:    z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (division: Division) => void;
  competitionId: number;
  initial?: Division;
}

const toOptions = (map: Record<string, string>, keys?: string[]) => {
  const entries = keys
    ? keys.map((k) => [k, map[k]] as [string, string])
    : (Object.entries(map) as [string, string][]);
  return entries.map(([value, label]) => ({ value, label }));
};

const SCORING_OPTIONS = toOptions(SCORING_SYSTEM_LABELS);

export function DivisionModal({ open, onClose, onSaved, competitionId, initial }: Props) {
  const isEdit = !!initial;

  const [modality, setModality] = useState<Modality>('elite');
  const config = MODALITY_CONFIG[modality];

  const {
    register, handleSubmit, reset, setValue, control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const [ageGroup, skillLevel, isNonTumbling] = useWatch({
    control,
    name: ['age_group', 'skill_level', 'is_non_tumbling'],
  });

  // Open: derive modality from existing data (edit) or default (create)
  useEffect(() => {
    if (!open) return;
    const initModality = initial?.skill_level
      ? modalityFromSkillLevel(initial.skill_level)
      : 'elite';
    setModality(initModality);
    reset(
      initial
        ? {
            ...initial,
            is_non_tumbling: initial.is_non_tumbling ?? false,
            scoring_system:  initial.scoring_system || '',
            min_athletes:    initial.min_athletes ?? undefined,
            max_athletes:    initial.max_athletes ?? undefined,
          }
        : { name: '', age_group: '', skill_level: '', category: '', is_non_tumbling: false, scoring_system: '' },
    );
  }, [open, initial, reset]);

  // When modality changes: reset classification fields
  const handleModalityChange = (next: Modality) => {
    setModality(next);
    const cfg = MODALITY_CONFIG[next];
    setValue('skill_level', cfg.skillLevels.length === 1 ? cfg.skillLevels[0] : '');
    setValue('age_group',   cfg.ageGroups.length   === 1 ? cfg.ageGroups[0]   : '');
    setValue('category',    cfg.autoCategory ?? '');
    setValue('is_non_tumbling', false);
    setValue('scoring_system', cfg.defaultScoring ?? '');
  };

  // Auto-suggest scoring system in create mode
  useEffect(() => {
    if (isEdit || !ageGroup || !skillLevel) return;
    if (config.defaultScoring) return;
    setValue('scoring_system', suggestScoringSystem(skillLevel, ageGroup, isNonTumbling ?? false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup, skillLevel, isNonTumbling, modality, isEdit]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, competition: competitionId } as Partial<Division> & { competition: number };
      const res = isEdit
        ? await competitionsRepository.updateDivision(initial!.public_id, payload)
        : await competitionsRepository.createDivision(payload);
      toast.success(isEdit ? 'División actualizada' : 'División creada');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar la división');
    }
  };

  // Derived option lists
  const ageGroupOptions = config.ageGroups.map((ag) => ({
    value: ag,
    label: AGE_GROUP_LABELS[ag],
  }));
  const skillLevelOptions = config.skillLevels.map((sl) => ({
    value: sl,
    label: SKILL_LEVEL_LABELS[sl as SkillLevel] ?? sl,
  }));
  const categoryOptions = (config.allowedCategories ?? []).map((cat) => ({
    value: cat,
    label: CATEGORY_LABELS[cat as DivisionCategory],
  }));

  const singleAge      = ageGroupOptions.length === 1;
  const singleLevel    = skillLevelOptions.length === 1;
  const autoCategory   = config.autoCategory !== null;
  const showNtCheckbox = config.showNonTumbling === true;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar división' : 'Nueva división'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        <Input
          label="Nombre de la división"
          id="name"
          placeholder="Senior Elite All Girl"
          error={errors.name?.message}
          {...register('name')}
        />

        {/* Modality — UI-only; drives all filtered dropdowns below */}
        <Select
          label="Modalidad"
          id="modality"
          options={MODALITY_OPTIONS}
          value={modality}
          onChange={(e) => handleModalityChange(e.target.value as Modality)}
        />

        <div className="grid grid-cols-2 gap-3">
          {/* Age Group */}
          <Select
            label="Grupo de edad"
            id="age_group"
            options={ageGroupOptions}
            placeholder={singleAge ? undefined : 'Seleccionar...'}
            disabled={singleAge}
            error={errors.age_group?.message}
            {...register('age_group')}
          />

          {/* Skill Level */}
          <Select
            label="Nivel"
            id="skill_level"
            options={skillLevelOptions}
            placeholder={singleLevel ? undefined : 'Seleccionar...'}
            disabled={singleLevel}
            error={errors.skill_level?.message}
            {...register('skill_level')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Category */}
          {autoCategory ? (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700">Categoría</span>
              <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400">
                {CATEGORY_LABELS[config.autoCategory!]}
              </div>
              <input type="hidden" {...register('category')} />
            </div>
          ) : (
            <Select
              label="Categoría"
              id="category"
              options={categoryOptions}
              placeholder="Seleccionar..."
              error={errors.category?.message}
              {...register('category')}
            />
          )}

          <Select
            label="Sistema de puntuación"
            id="scoring_system"
            options={SCORING_OPTIONS}
            placeholder="Auto-sugerido..."
            {...register('scoring_system')}
          />
        </div>

        {/* Non Tumbling — only for IASF modality */}
        {showNtCheckbox && (
          <label className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 cursor-pointer hover:bg-zinc-100 transition-colors">
            <input
              type="checkbox"
              {...register('is_non_tumbling')}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900"
            />
            <div>
              <p className="text-sm font-medium text-zinc-800">Non Tumbling</p>
              <p className="text-xs text-zinc-500">
                Aplica reglas NT a la categoría seleccionada — usa sistema de puntuación{' '}
                <span className="font-mono">elite_nt</span>
              </p>
            </div>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Mín. atletas" id="min_athletes" type="number" placeholder="16" {...register('min_athletes')} />
          <Input label="Máx. atletas" id="max_athletes" type="number" placeholder="36" {...register('max_athletes')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Guardar cambios' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  );
}
