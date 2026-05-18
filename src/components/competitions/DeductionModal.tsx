'use client';

import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import competitionsRepository from '@/repositories/competitionsRepository';
import {
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_CODES,
  DEDUCTION_AMOUNTS,
  type Deduction,
  type DeductionType,
} from '@/types/competitions';

const schema = z.object({
  deduction_type: z.string().min(1, 'Seleccione un tipo'),
  count:          z.coerce.number().int().min(1, 'Mínimo 1'),
  routine_time:   z.string().optional(),
  hit_zero:       z.boolean().optional(),
  notes:          z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (deduction: Deduction) => void;
  scoreSheetId: number;
}

// Group deductions by category for the select
const FALL_TYPES:    DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME_TYPES:    DeductionType[] = ['tiempo'];
const ILLEGAL_TYPES: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];

function makeOptions(types: DeductionType[]) {
  return types.map((key) => ({
    value: key,
    label: `${DEDUCTION_CODES[key]}  ${DEDUCTION_TYPE_LABELS[key]}  (−${DEDUCTION_AMOUNTS[key]})`,
  }));
}

const DEDUCTION_OPTIONS = [
  { label: '— Caídas —', value: '', disabled: true },
  ...makeOptions(FALL_TYPES),
  { label: '— Tiempo —', value: '', disabled: true },
  ...makeOptions(TIME_TYPES),
  { label: '— Ilegalidades —', value: '', disabled: true },
  ...makeOptions(ILLEGAL_TYPES),
];

export function DeductionModal({ open, onClose, onSaved, scoreSheetId }: Props) {
  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { count: 1, hit_zero: false },
  });

  const selectedType = watch('deduction_type') as DeductionType | '';

  useEffect(() => {
    if (open) reset({ deduction_type: '', count: 1, routine_time: '', hit_zero: false, notes: '' });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await competitionsRepository.createDeduction({
        score_sheet:    scoreSheetId,
        deduction_type: values.deduction_type as DeductionType,
        count:          values.count,
        routine_time:   values.routine_time ?? '',
        hit_zero:       values.hit_zero ?? false,
        notes:          values.notes ?? '',
      });
      toast.success('Descuento registrado');
      onSaved(res.data);
      onClose();
    } catch {
      toast.error('No se pudo registrar el descuento');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar descuento" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Select
          label="Tipo de descuento"
          id="deduction_type"
          options={DEDUCTION_OPTIONS.filter((o) => !('disabled' in o))}
          placeholder="Seleccionar..."
          error={errors.deduction_type?.message}
          {...register('deduction_type')}
        />

        {/* Show unit amount hint */}
        {selectedType && (
          <p className="text-xs text-zinc-500 -mt-2">
            Monto por unidad: <span className="font-semibold text-red-600">−{DEDUCTION_AMOUNTS[selectedType]}</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={selectedType === 'tiempo' ? 'Segundos de exceso' : 'Cantidad'}
            id="count"
            type="number"
            min={1}
            error={errors.count?.message}
            {...register('count')}
          />
          <Input
            label="Momento (ej. 1:23)"
            id="routine_time"
            placeholder="0:00"
            {...register('routine_time')}
          />
        </div>

        <Input
          label="Nota (opcional)"
          id="notes"
          placeholder="Caída en la pirámide..."
          {...register('notes')}
        />

        <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer select-none">
          <input type="checkbox" {...register('hit_zero')} className="rounded border-zinc-300" />
          HIT ZERO — la rutina llegó a cero en este descuento
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>Agregar</Button>
        </div>
      </form>
    </Modal>
  );
}
