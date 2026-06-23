'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Competition, Organization } from '@/types/competitions';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  date: z.string().min(1, 'Requerido'),
  venue: z.string().min(2, 'Requerido'),
  city: z.string().min(2, 'Requerido'),
  regulation: z.enum(['IASF', 'ICU', 'AMBAS']),
  service_type: z.enum(['full', 'registration_only', 'judging_only']),
  notes: z.string().optional(),
  organization: z.string().optional(),
  require_payment: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (competition: Competition) => void;
  initial?: Competition;
}

const REGULATION_OPTIONS = [
  { value: 'IASF', label: 'IASF' },
  { value: 'ICU', label: 'ICU' },
  { value: 'AMBAS', label: 'AMBAS' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'full',              label: 'Inscripción + Jueceo' },
  { value: 'registration_only', label: 'Solo Inscripción' },
  { value: 'judging_only',      label: 'Solo Jueceo' },
];

export function CompetitionModal({ open, onClose, onSaved, initial }: Props) {
  const isEdit = !!initial;
  const [orgs, setOrgs] = useState<Organization[]>([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, organization: initial.organization ? String(initial.organization) : '' }
      : { regulation: 'IASF', service_type: 'full' as const },
  });

  useEffect(() => {
    competitionsRepository.listOrganizations({ page_size: '100' }).then((res) => {
      setOrgs(res.data.results);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { ...initial, organization: initial.organization ? String(initial.organization) : '' }
          : { regulation: 'IASF', service_type: 'full' as const, name: '', date: '', venue: '', city: '', notes: '', organization: '' },
      );
    }
  }, [open, initial, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        organization: values.organization ? Number(values.organization) : null,
      };
      const res = isEdit
        ? await competitionsRepository.updateCompetition(initial!.id, payload)
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
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha" id="date" type="date" error={errors.date?.message} {...register('date')} />
          <Select
            label="Reglamento"
            id="regulation"
            options={REGULATION_OPTIONS}
            error={errors.regulation?.message}
            {...register('regulation')}
          />
        </div>
        <Select
          label="Módulos"
          id="service_type"
          options={SERVICE_TYPE_OPTIONS}
          error={errors.service_type?.message}
          {...register('service_type')}
        />
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
