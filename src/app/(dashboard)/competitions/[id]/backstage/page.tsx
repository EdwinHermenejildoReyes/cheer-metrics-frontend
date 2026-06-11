'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getConstructionGroups } from '@/lib/constructionTable';
import type { Registration, Division } from '@/types/competitions';

interface RegWithDiv extends Registration {
  divisionData?: Division;
}

export default function BackstagePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const competitionId = Number(id);

  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState<number | null>(null);
  const [regs,     setRegs]     = useState<RegWithDiv[]>([]);
  const [divisions, setDivisions] = useState<Record<number, Division>>({});
  const [counts,   setCounts]   = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const [regsRes, divsRes] = await Promise.all([
        competitionsRepository.listRegistrations({ competition: String(competitionId), page_size: '200' }),
        competitionsRepository.listDivisions({ competition: String(competitionId), page_size: '100' }),
      ]);
      const divMap: Record<number, Division> = {};
      for (const d of divsRes.data.results) divMap[d.id] = d;
      setDivisions(divMap);

      const sorted = regsRes.data.results
        .filter(r => r.is_enable)
        .sort((a, b) => {
          const pa = a.performance_order ?? 9999;
          const pb = b.performance_order ?? 9999;
          return pa !== pb ? pa - pb : (a.team_name).localeCompare(b.team_name);
        });
      setRegs(sorted);

      const initial: Record<number, string> = {};
      for (const r of sorted) {
        initial[r.id] = r.athlete_count != null ? String(r.athlete_count) : '';
      }
      setCounts(initial);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (regId: number) => {
    const raw = counts[regId];
    const val = raw === '' ? null : parseInt(raw, 10);
    if (raw !== '' && (isNaN(val as number) || (val as number) < 1)) {
      toast.error('Ingresa un número válido de atletas');
      return;
    }
    setSaving(regId);
    try {
      await competitionsRepository.updateRegistration(regId, { athlete_count: val } as Partial<Registration>);
      toast.success('Conteo guardado');
      await load();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm flex items-center gap-3">
        <button
          onClick={() => router.push(`/competitions/${competitionId}`)}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Conteo de Atletas</p>
          <p className="text-sm font-semibold text-zinc-900 leading-tight">Backstage</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-400">
          <Users className="h-3.5 w-3.5" />
          <span>{regs.length} equipos</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-xs text-zinc-400 mb-4">
          Ingresa el número de atletas que calentaron y están listos para competir. El sistema calculará automáticamente los grupos de construcción a evaluar.
        </p>

        {regs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-5 py-10 text-center">
            <p className="text-sm text-zinc-400">Sin inscripciones activas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {regs.map(reg => {
              const div = divisions[reg.division];
              const countStr = counts[reg.id] ?? '';
              const count    = parseInt(countStr, 10);
              const hasCount = !isNaN(count) && count > 0;
              const groups   = hasCount && div ? getConstructionGroups(count, div.category) : null;
              const isSaving = saving === reg.id;
              const isDirty  = countStr !== (reg.athlete_count != null ? String(reg.athlete_count) : '');

              return (
                <div key={reg.id} className="rounded-xl bg-white border border-zinc-200 p-4 flex flex-col gap-3 shadow-sm">
                  {/* Top row: order + team + division */}
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 shrink-0">
                      <span className="text-xs font-bold text-zinc-600 tabular-nums">
                        {reg.performance_order ?? '—'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{reg.team_name}</p>
                      <p className="text-xs text-zinc-400 truncate">{reg.gym_name} · {reg.division_name}</p>
                    </div>
                    {reg.athlete_count != null && !isDirty && (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Athlete count input */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(counts[reg.id] || '0', 10);
                          if (cur > 1) setCounts(p => ({ ...p, [reg.id]: String(cur - 1) }));
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 font-bold text-lg flex items-center justify-center transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={countStr}
                        placeholder="0"
                        onChange={e => setCounts(p => ({ ...p, [reg.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(reg.id); }}
                        className="w-16 h-8 rounded-lg border border-zinc-300 bg-white text-center text-sm font-bold tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(counts[reg.id] || '0', 10);
                          setCounts(p => ({ ...p, [reg.id]: String(isNaN(cur) ? 1 : cur + 1) }));
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 font-bold text-lg flex items-center justify-center transition-colors"
                      >+</button>
                      <span className="text-xs text-zinc-400">atletas</span>
                    </div>

                    {isDirty && (
                      <button
                        type="button"
                        onClick={() => handleSave(reg.id)}
                        disabled={isSaving}
                        className="ml-auto rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                      </button>
                    )}
                  </div>

                  {/* Construction groups result */}
                  {groups && (
                    <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Elevaciones</p>
                        <p className="text-2xl font-black text-zinc-900 tabular-nums">{groups.stunts}</p>
                        <p className="text-[9px] text-zinc-400">grupos</p>
                      </div>
                      <div className="text-center border-x border-zinc-200">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Pirámides</p>
                        <p className="text-2xl font-black text-zinc-900 tabular-nums">{groups.pyramids}</p>
                        <p className="text-[9px] text-zinc-400">grupos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Lanzamientos</p>
                        <p className="text-2xl font-black text-zinc-900 tabular-nums">{groups.tosses}</p>
                        <p className="text-[9px] text-zinc-400">grupos</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
