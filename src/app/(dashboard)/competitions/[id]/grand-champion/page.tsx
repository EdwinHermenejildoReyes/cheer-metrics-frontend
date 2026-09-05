'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useBranding } from '@/contexts/BrandingContext';
import { type GrandChampionData, type GrandChampionEntry } from '@/types/competitions';

function fmt(val: string): string {
  return Number(val).toFixed(2);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold tabular-nums text-zinc-400">#{rank}</span>;
}

function EntryRow({ entry }: { entry: GrandChampionEntry }) {
  const isTop3 = entry.rank <= 3;
  return (
    <tr className={`border-b border-zinc-100 last:border-0 ${entry.rank === 1 ? 'bg-yellow-50' : entry.rank === 2 ? 'bg-zinc-50/60' : entry.rank === 3 ? 'bg-amber-50/40' : ''}`}>
      <td className="px-4 py-3 text-center w-12">
        <div className="flex justify-center items-center">
          <RankIcon rank={entry.rank} />
        </div>
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm ${isTop3 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800'}`}>
          {entry.team_name}
        </p>
        <p className="text-xs text-zinc-400">{entry.gym_name}</p>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-500">{entry.division_name}</td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-zinc-500">{fmt(entry.raw_score)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-red-500">
        {Number(entry.total_deductions) > 0 ? `−${fmt(entry.total_deductions)}` : '—'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm font-bold text-zinc-900">{fmt(entry.final_score)}</td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-zinc-400">
        {Number(entry.percentage).toFixed(1)}%
      </td>
    </tr>
  );
}

export default function GrandChampionPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { organization } = useBranding();

  const [data, setData] = useState<GrandChampionData | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const load = useCallback(async () => {
    try {
      const res = await competitionsRepository.getGrandChampion(id);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 5s so results reflect judge saves in real time
  useEffect(() => {
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const champion = data.entries[0] ?? null;
  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Print-only branded header */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: primary, color: primaryText }}>
          <div className="flex items-center gap-4">
            {organization?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={organization.logo} alt="" className="h-12 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            )}
            <div>
              {organization?.name && (
                <p className="text-base font-bold" style={{ color: primaryText }}>{organization.name}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: primaryText, opacity: 0.75 }}>Gran Campeón · Cheer Metrics</p>
            </div>
          </div>
          <div className="text-right text-xs" style={{ color: primaryText, opacity: 0.75 }}>
            <p>Fecha de impresión</p>
            <p className="font-semibold mt-0.5" style={{ opacity: 1 }}>{today}</p>
          </div>
        </div>
        <div className="px-6 pt-4 pb-3" style={{ borderBottom: `2px solid ${primary}` }}>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">Gran Campeón — {data.competition_name}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{data.entries.length} equipo{data.entries.length !== 1 ? 's' : ''} calificado{data.entries.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Screen header */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-zinc-400">{data.competition_name}</p>
          <h1 className="text-sm font-semibold text-zinc-900 leading-tight">Gran Campeón</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En vivo
          </span>
          <span className="text-xs text-zinc-400 tabular-nums">
            {data.entries.length} calificado{data.entries.length !== 1 ? 's' : ''}
          </span>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Gran Campeón highlight */}
        {champion ? (
          <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 px-6 py-5 flex items-center gap-5">
            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100 border-2 border-yellow-300">
              <Trophy className="w-7 h-7 text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-yellow-600 mb-0.5">Gran Campeón</p>
              <p className="text-xl font-bold text-zinc-900 leading-tight truncate">{champion.team_name}</p>
              <p className="text-sm text-zinc-500">{champion.gym_name} · <span className="text-zinc-400">{champion.division_name}</span></p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold tabular-nums text-zinc-900">{fmt(champion.final_score)}</p>
              <p className="text-sm text-zinc-400 tabular-nums">{Number(champion.percentage).toFixed(1)}%</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
            <Trophy className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Aún no hay planillas calificadas en esta competencia.</p>
          </div>
        )}

        {/* Full ranking table */}
        {data.entries.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 w-12">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Equipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">División</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Bruto</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Desc.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Final</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">%</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map(entry => (
                  <EntryRow key={entry.registration_id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
