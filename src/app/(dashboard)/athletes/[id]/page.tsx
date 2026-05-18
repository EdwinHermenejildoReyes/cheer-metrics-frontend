'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { AthleteModal } from '@/components/athletes/AthleteModal';
import { MembershipModal } from '@/components/athletes/MembershipModal';
import athletesRepository from '@/repositories/athletesRepository';
import {
  GENDER_LABELS,
  MEMBERSHIP_ROLE_LABELS,
  AGE_GROUP_LABELS_SHORT,
  type Athlete,
  type TeamMembership,
  type Gender,
} from '@/types/athletes';

const GENDER_VARIANT: Record<Gender, 'info' | 'violet' | 'default'> = {
  F: 'violet',
  M: 'info',
  O: 'default',
};

export default function AthleteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const athleteId = Number(id);

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await athletesRepository.getAthlete(athleteId);
      setAthlete(res.data);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const handleAthleteUpdated = (updated: Athlete) => setAthlete(updated);

  const handleMembershipSaved = (m: TeamMembership) => {
    setAthlete((prev) => prev ? { ...prev, memberships: [...prev.memberships, m] } : prev);
  };

  const handleDeleteMembership = async (m: TeamMembership) => {
    if (!confirm(`¿Quitar a ${athlete?.full_name} del equipo ${m.team_name}?`)) return;
    try {
      await athletesRepository.deleteMembership(m.id);
      setAthlete((prev) =>
        prev ? { ...prev, memberships: prev.memberships.filter((x) => x.id !== m.id) } : prev
      );
      toast.success('Membresía eliminada');
    } catch {
      toast.error('No se pudo eliminar la membresía');
    }
  };

  if (loading) return <PageSpinner />;
  if (!athlete) return <div className="p-8 text-zinc-500">Atleta no encontrado.</div>;

  const dob = new Date(athlete.birth_date + 'T00:00:00');

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push('/athletes')}
          className="mt-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900">{athlete.full_name}</h1>
            <Badge variant={GENDER_VARIANT[athlete.gender]}>{GENDER_LABELS[athlete.gender]}</Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{athlete.gym_name}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-4">Datos personales</h2>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div>
            <p className="text-zinc-500">Fecha de nacimiento</p>
            <p className="font-medium text-zinc-900">
              {dob.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Edad</p>
            <p className="font-medium text-zinc-900">{athlete.age} años</p>
          </div>
          <div>
            <p className="text-zinc-500">Cédula / ID</p>
            <p className="font-medium text-zinc-900 font-mono">{athlete.document_id || '—'}</p>
          </div>
          <div>
            <p className="text-zinc-500">Gimnasio</p>
            <p className="font-medium text-zinc-900">{athlete.gym_name}</p>
          </div>
        </div>

        {/* Eligible age groups */}
        <div className="mt-5 pt-5 border-t border-zinc-100">
          <p className="text-zinc-500 text-sm mb-2">Divisiones elegibles (edad actual)</p>
          <div className="flex flex-wrap gap-2">
            {athlete.eligible_age_groups.length > 0
              ? athlete.eligible_age_groups.map((g) => (
                  <Badge key={g} variant="success">{AGE_GROUP_LABELS_SHORT[g]}</Badge>
                ))
              : <span className="text-sm text-zinc-400">Sin divisiones elegibles</span>
            }
          </div>
        </div>
      </div>

      {/* Memberships */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Equipos <span className="font-normal text-zinc-400">({athlete.memberships.length})</span>
          </h2>
          <Button size="sm" onClick={() => setMembershipModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar a equipo
          </Button>
        </div>

        {athlete.memberships.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-zinc-400 rounded-xl border border-dashed border-zinc-200">
            <Users className="h-7 w-7" />
            <p className="text-sm">Sin membresías de equipo</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Equipo</th>
                  <th className="px-5 py-3">Gimnasio</th>
                  <th className="px-5 py-3">Rol</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {athlete.memberships.map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{m.team_name}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{m.gym_name}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="default">{MEMBERSHIP_ROLE_LABELS[m.role]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteMembership(m)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AthleteModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={handleAthleteUpdated}
        initial={athlete}
      />
      <MembershipModal
        open={membershipModalOpen}
        onClose={() => setMembershipModalOpen(false)}
        onSaved={handleMembershipSaved}
        athleteId={athlete.id}
        athleteName={athlete.full_name}
      />
    </div>
  );
}
