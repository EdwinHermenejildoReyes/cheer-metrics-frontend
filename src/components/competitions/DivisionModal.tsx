'use client';

import { useEffect } from 'react';
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
  type Division,
  type ScoringSystem,
} from '@/types/competitions';

function suggestScoringSystem(skillLevel: string, ageGroup: string, category: string): ScoringSystem {
  if (category === 'non_tumbling') return 'elite_nt';
  if (skillLevel === 'novice') return ageGroup === 'tiny' ? 'tiny_novice' : 'mini_novice';
  const map: Record<string, ScoringSystem> = {
    novice_plus: 'novice_plus',
    prep:        'prep',
    escolar:     'escolar',
    L1:          'elite_l1',
    L2:          'elite_l2_7',
    L3:          'elite_l2_7',
    L4:          'elite_l2_7',
    L5:          'elite_l2_7',
    L6:          'iasf_l6_7',
    L7:          'iasf_l6_7',
    elite:       'elite_l2_7',
    icc:         'elite_l2_7',
    iasf_cat:    'iasf_l6_7',
    star:        'elite_l2_7',
  };
  return map[skillLevel] ?? 'elite_l2_7';
}

const schema = z.object({
  name:           z.string().min(1, 'Requerido'),
  age_group:      z.string().min(1, 'Requerido'),
  skill_level:    z.string().min(1, 'Requerido'),
  category:       z.string().min(1, 'Requerido'),
  scoring_system: z.string().optional(),
  min_athletes:   z.coerce.number().nullable().optional(),
  max_athletes:   z.coerce.number().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (division: Division) => void;
  competitionId: number;
  initial?: Division;
}

const toOptions = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }));

const SCORING_OPTIONS = toOptions(SCORING_SYSTEM_LABELS);

export function DivisionModal({ open, onClose, onSaved, competitionId, initial }: Props) {
  const isEdit = !!initial;

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const [ageGroup, skillLevel, category] = useWatch({
    control,
    name: ['age_group', 'skill_level', 'category'],
  });

  // Auto-suggest scoring system when classification fields change (create mode only)
  useEffect(() => {
    if (isEdit || !ageGroup || !skillLevel || !category) return;
    setValue('scoring_system', suggestScoringSystem(skillLevel, ageGroup, category));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup, skillLevel, category, isEdit]);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              ...initial,
              scoring_system: initial.scoring_system || '',
              min_athletes: initial.min_athletes ?? undefined,
              max_athletes: initial.max_athletes ?? undefined,
            }
          : { name: '', age_group: '', skill_level: '', category: '', scoring_system: '' }
      );
    }
  }, [open, initial, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, competition: competitionId } as Partial<Division> & { competition: number };
      const res = isEdit
        ? await competitionsRepository.updateDivision(initial!.id, payload)
        : await competitionsRepository.createDivision(payload);
      toast.success(isEdit ? 'División actualizada' : 'División creada');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo guardar la división');
    }
  };

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
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Grupo de edad"
            id="age_group"
            options={toOptions(AGE_GROUP_LABELS)}
            placeholder="Seleccionar..."
            error={errors.age_group?.message}
            {...register('age_group')}
          />
          <Select
            label="Nivel"
            id="skill_level"
            options={toOptions(SKILL_LEVEL_LABELS)}
            placeholder="Seleccionar..."
            error={errors.skill_level?.message}
            {...register('skill_level')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            id="category"
            options={toOptions(CATEGORY_LABELS)}
            placeholder="Seleccionar..."
            error={errors.category?.message}
            {...register('category')}
          />
          <Select
            label="Sistema de puntuación"
            id="scoring_system"
            options={SCORING_OPTIONS}
            placeholder="Auto-sugerido..."
            {...register('scoring_system')}
          />
        </div>
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
