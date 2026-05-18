'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { AthleteModal } from '@/components/athletes/AthleteModal';
import athletesRepository from '@/repositories/athletesRepository';
import { GENDER_LABELS, AGE_GROUP_LABELS_SHORT, type Athlete, type Gender } from '@/types/athletes';

const GENDER_VARIANT: Record<Gender, 'info' | 'violet' | 'default'> = {
  F: 'violet',
  M: 'info',
  O: 'default',
};

export default function AthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (q: string) => {
    try {
      const params: Record<string, string> = { page_size: '50' };
      if (q) params.search = q;
      const res = await athletesRepository.listAthletes(params);
      setAthletes(res.data.results);
      setTotal(res.data.count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const handleSaved = (saved: Athlete) => {
    setAthletes((prev) =>
      prev.some((a) => a.id === saved.id)
        ? prev.map((a) => (a.id === saved.id ? saved : a))
        : [saved, ...prev]
    );
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Atletas</h1>
          <p className="text-sm text-zinc-500">{total} atleta{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo atleta
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          placeholder="Buscar por nombre o cédula..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <PageSpinner />
      ) : athletes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
          <Users className="h-10 w-10" />
          <p className="text-sm">{search ? 'Sin resultados para esa búsqueda' : 'Aún no hay atletas registrados'}</p>
          {!search && <Button variant="secondary" onClick={() => setModalOpen(true)}>Registrar el primero</Button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Atleta</th>
                <th className="px-5 py-3">Cédula</th>
                <th className="px-5 py-3">Género</th>
                <th className="px-5 py-3">Edad</th>
                <th className="px-5 py-3">Divisiones elegibles</th>
                <th className="px-5 py-3">Gimnasio</th>
                <th className="px-5 py-3">Equipos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {athletes.map((a) => (
                <tr
                  key={a.id}
                  className="cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => router.push(`/athletes/${a.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-zinc-900">{a.full_name}</p>
                    <p className="text-xs text-zinc-400">{new Date(a.birth_date + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 font-mono text-xs">{a.document_id || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={GENDER_VARIANT[a.gender]}>{GENDER_LABELS[a.gender]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-zinc-900">{a.age} años</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {a.eligible_age_groups.length > 0
                        ? a.eligible_age_groups.map((g) => (
                            <Badge key={g} variant="default" className="text-[10px]">
                              {AGE_GROUP_LABELS_SHORT[g]}
                            </Badge>
                          ))
                        : <span className="text-xs text-zinc-400">—</span>
                      }
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">{a.gym_name}</td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">{a.memberships.length} equipo{a.memberships.length !== 1 ? 's' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AthleteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
