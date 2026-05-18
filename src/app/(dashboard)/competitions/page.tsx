'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { CompetitionModal } from '@/components/competitions/CompetitionModal';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { Competition } from '@/types/competitions';

export default function CompetitionsPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | undefined>();

  const load = async () => {
    try {
      const res = await competitionsRepository.listCompetitions();
      setCompetitions(res.data.results);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved: Competition) => {
    setCompetitions((prev) =>
      prev.some((c) => c.id === saved.id)
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev]
    );
  };

  const openEdit = (e: React.MouseEvent, competition: Competition) => {
    e.stopPropagation();
    setEditing(competition);
    setModalOpen(true);
  };

  const openNew = () => { setEditing(undefined); setModalOpen(true); };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Competencias</h1>
          <p className="text-sm text-zinc-500">{competitions.length} competencia{competitions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" />
          Nueva competencia
        </Button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : competitions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
          <CalendarDays className="h-10 w-10" />
          <p className="text-sm">Aún no hay competencias registradas</p>
          <Button variant="secondary" onClick={openNew}>Crear la primera</Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Ciudad</th>
                <th className="px-5 py-3">Reglamento</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {competitions.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => router.push(`/competitions/${c.id}`)}
                >
                  <td className="px-5 py-3.5 font-medium text-zinc-900">{c.name}</td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      {c.city}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="info">{c.regulation}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="icon" variant="ghost" onClick={(e) => openEdit(e, c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CompetitionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        initial={editing}
      />
    </div>
  );
}
