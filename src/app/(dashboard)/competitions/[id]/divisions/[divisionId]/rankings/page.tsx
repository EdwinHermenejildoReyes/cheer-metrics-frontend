'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { REGISTRATION_STATUS_LABELS, type DivisionRankings, type RankingEntry } from '@/types/competitions';

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold tabular-nums text-zinc-400">#{rank}</span>;
}

function fmt(val: string | null): string {
  return val !== null ? Number(val).toFixed(2) : '—';
}

function ScoredRow({ entry }: { entry: RankingEntry }) {
  const isTop3 = entry.rank !== null && entry.rank <= 3;
  return (
    <tr className={`border-b border-zinc-100 last:border-0 ${entry.rank === 1 ? 'bg-yellow-50' : entry.rank === 2 ? 'bg-zinc-50/60' : entry.rank === 3 ? 'bg-amber-50/40' : ''}`}>
      <td className="px-4 py-3 text-center w-12">
        <div className="flex justify-center items-center">
          <RankIcon rank={entry.rank!} />
        </div>
      </td>
      <td className="px-4 py-3">
        <p className={`text-sm ${isTop3 ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800'}`}>
          {entry.team_name}
        </p>
        <p className="text-xs text-zinc-400">{entry.gym_name}</p>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-zinc-500">
        {fmt(entry.raw_score)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-red-500">
        {entry.total_deductions && Number(entry.total_deductions) > 0
          ? `−${fmt(entry.total_deductions)}`
          : '—'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm font-bold text-zinc-900">
        {fmt(entry.final_score)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm text-zinc-400">
        {entry.percentage !== null ? `${Number(entry.percentage).toFixed(1)}%` : '—'}
      </td>
    </tr>
  );
}

export default function DivisionRankingsPage() {
  const router = useRouter();
  const { divisionId } = useParams<{ id: string; divisionId: string }>();
  const divId = Number(divisionId);

  const [data, setData] = useState<DivisionRankings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await competitionsRepository.getDivisionRankings(divId);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [divId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSpinner />;
  if (!data) return null;

  const scored   = data.entries.filter(e => e.has_score);
  const unscored = data.entries.filter(e => !e.has_score);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3 print:static print:border-b-2 print:border-zinc-900">
        <button
          onClick={() => router.back()}
          className="print:hidden p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-zinc-400">{data.competition_name}</p>
          <h1 className="text-sm font-semibold text-zinc-900 leading-tight">
            Ranking — {data.division_name}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-400 tabular-nums">
            {scored.length} calificado{scored.length !== 1 ? 's' : ''}
          </span>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Ranked table */}
        {scored.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center">
            <Trophy className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Aún no hay planillas calificadas en esta división.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400 w-12">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Equipo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Bruto</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Desc.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Final</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">%</th>
                </tr>
              </thead>
              <tbody>
                {scored.map(entry => (
                  <ScoredRow key={entry.registration_id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unscored */}
        {unscored.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Sin calificar</p>
            </div>
            <div className="divide-y divide-zinc-50">
              {unscored.map(entry => (
                <div key={entry.registration_id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">{entry.team_name}</p>
                    <p className="text-xs text-zinc-400">{entry.gym_name}</p>
                  </div>
                  <Badge variant={entry.status === 'confirmed' ? 'success' : 'warning'}>
                    {REGISTRATION_STATUS_LABELS[entry.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
