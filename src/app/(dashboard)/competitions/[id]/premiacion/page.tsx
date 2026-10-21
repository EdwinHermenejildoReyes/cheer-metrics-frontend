'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Medal, Award, Star } from 'lucide-react';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useBranding } from '@/contexts/BrandingContext';
import {
  type Competition,
  type Division,
  type DivisionRankings,
  type RankingEntry,
} from '@/types/competitions';

interface DivisionResult {
  division: Division;
  rankings: DivisionRankings;
}

function fmt(val: string | null): string {
  if (!val) return '—';
  return Number(val).toFixed(2);
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400 shrink-0" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-600 shrink-0" />;
  return null;
}

const RANK_BG: Record<number, string> = {
  1: 'bg-yellow-50 border-yellow-200',
  2: 'bg-zinc-50 border-zinc-200',
  3: 'bg-amber-50 border-amber-200',
};

const RANK_SCORE_COLOR: Record<number, string> = {
  1: 'text-yellow-600',
  2: 'text-zinc-500',
  3: 'text-amber-700',
};

function PodiumEntry({ entry }: { entry: RankingEntry }) {
  const bg = RANK_BG[entry.rank ?? 0] ?? 'bg-white border-zinc-100';
  const scoreColor = RANK_SCORE_COLOR[entry.rank ?? 0] ?? 'text-zinc-500';
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${bg}`}>
      <div className="flex items-center justify-center w-6 shrink-0">
        {entry.rank != null && entry.rank <= 3 ? (
          <MedalIcon rank={entry.rank} />
        ) : (
          <span className="text-xs font-bold text-zinc-400">#{entry.rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate leading-tight">{entry.team_name}</p>
        <p className="text-xs text-zinc-400 truncate leading-tight">{entry.gym_name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-bold tabular-nums ${scoreColor}`}>{fmt(entry.final_score)}</p>
        <p className="text-xs text-zinc-400 tabular-nums">{entry.percentage ? `${Number(entry.percentage).toFixed(1)}%` : '—'}</p>
      </div>
    </div>
  );
}

function DivisionCard({ result }: { result: DivisionResult }) {
  const { division, rankings } = result;
  const top3 = rankings.entries.filter((e) => e.has_score && e.rank != null && e.rank <= 3);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden break-inside-avoid print:shadow-none print:border-zinc-300">
      {/* Division header */}
      <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{division.name}</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">
          {rankings.entries.filter((e) => e.has_score).length} calificado{rankings.entries.filter((e) => e.has_score).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Podium entries */}
      <div className="px-3 py-3 space-y-2">
        {top3.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center py-3">Sin calificaciones aún</p>
        ) : (
          top3.map((entry) => (
            <PodiumEntry key={entry.registration_id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PremiacionPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { organization } = useBranding();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [results, setResults] = useState<DivisionResult[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });
  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';

  const load = useCallback(async () => {
    try {
      const compRes = await competitionsRepository.getCompetition(id);
      setCompetition(compRes.data);

      const divAll = await competitionsRepository.listDivisions({
        competition: String(compRes.data.id),
        page_size: '200',
      });

      const divisionsWithTeams = divAll.data.results.filter((d) => d.confirmed_count > 0);

      const rankingResults = await Promise.all(
        divisionsWithTeams.map(async (div) => {
          try {
            const rRes = await competitionsRepository.getDivisionRankings(div.public_id);
            return { division: div, rankings: rRes.data } satisfies DivisionResult;
          } catch {
            return null;
          }
        }),
      );

      setResults(rankingResults.filter((r): r is DivisionResult => r !== null));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s
  useEffect(() => {
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <PageSpinner />;

  const divisionsWithScores = results.filter((r) => r.rankings.entries.some((e) => e.has_score));

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
              <p className="text-xs mt-0.5" style={{ color: primaryText, opacity: 0.75 }}>Premiación · Cheer Metrics</p>
            </div>
          </div>
          <div className="text-right text-xs" style={{ color: primaryText, opacity: 0.75 }}>
            <p>Fecha de impresión</p>
            <p className="font-semibold mt-0.5" style={{ opacity: 1 }}>{today}</p>
          </div>
        </div>
        <div className="px-6 pt-4 pb-3" style={{ borderBottom: `2px solid ${primary}` }}>
          <h1 className="text-2xl font-bold text-zinc-900 leading-tight">
            Premiación — {competition?.name ?? ''}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Top 3 por división</p>
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
          <p className="text-xs text-zinc-400">{competition?.name}</p>
          <h1 className="text-sm font-semibold text-zinc-900 leading-tight">Premiación</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En vivo
          </span>
          <span className="text-xs text-zinc-400 tabular-nums">
            {divisionsWithScores.length} división{divisionsWithScores.length !== 1 ? 'es' : ''} con resultados
          </span>
          <PrintButton label="Imprimir / PDF" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {results.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
            <Star className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500">No hay equipos confirmados en esta competencia aún.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-3">
            {results.map((r) => (
              <DivisionCard key={r.division.id} result={r} />
            ))}
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
