'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy, Users, Building2, ClipboardList,
  ArrowRight, CalendarDays, CheckCircle2, Clock,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import athletesRepository from '@/repositories/athletesRepository';
import { useJudge } from '@/hooks/useJudge';
import { REGISTRATION_STATUS_LABELS } from '@/types/competitions';
import type { Competition, Registration, ScoreSheet } from '@/types/competitions';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string, opts?: Intl.DateTimeFormatOptions) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-EC', opts ?? { day: 'numeric', month: 'long', year: 'numeric' });
}

function statusVariant(status: string): 'success' | 'warning' | 'secondary' {
  if (status === 'confirmed') return 'success';
  if (status === 'pending')   return 'warning';
  return 'secondary';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon }: {
  label: string; value: number; sub?: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
        <div className="rounded-lg bg-zinc-100 p-2">
          <Icon className="h-4 w-4 text-zinc-500" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums text-zinc-900">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CompBreakdownCard({ comp, regs, sheeted }: {
  comp: Competition;
  regs: Registration[];
  sheeted: number;
}) {
  const total    = regs.length;
  const pending  = total - sheeted;
  const pct      = total > 0 ? Math.round((sheeted / total) * 100) : 0;
  const confirmed = regs.filter(r => r.status === 'confirmed').length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-green-600">Activa</span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 truncate">{comp.name}</h3>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-3 h-3 shrink-0" />
            {fmtDate(comp.date, { weekday: 'long', day: 'numeric', month: 'long' })}
            {comp.venue && <><span className="text-zinc-300 mx-0.5">·</span>{comp.venue}</>}
          </p>
        </div>
        <Link href={`/competitions/${comp.id}`}>
          <Button size="sm" variant="outline" className="shrink-0">
            Ver <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {total > 0 ? (
        <div className="px-5 pb-4 space-y-3">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-zinc-500">Planillas completadas</span>
              <span className="font-semibold tabular-nums text-zinc-700">{sheeted} / {confirmed}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Inscripciones',  value: total,    color: 'text-zinc-900' },
              { label: 'Con planilla',   value: sheeted,  color: 'text-green-600' },
              { label: 'Sin planilla',   value: pending,  color: pending > 0 ? 'text-amber-600' : 'text-zinc-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-zinc-50 px-3 py-2 text-center">
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="px-5 pb-4 text-xs text-zinc-400">Sin inscripciones registradas.</p>
      )}
    </div>
  );
}

function UpcomingCard({ comp }: { comp: Competition }) {
  return (
    <Link
      href={`/competitions/${comp.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">{comp.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {fmtDate(comp.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 shrink-0 transition-colors" />
    </Link>
  );
}

function RecentRegRow({ reg }: { reg: Registration }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">{reg.team_name}</p>
        <p className="text-xs text-zinc-400 truncate">
          {reg.division_name} · {reg.competition_name}
        </p>
      </div>
      <Badge variant={statusVariant(reg.status)} className="shrink-0 text-[10px]">
        {REGISTRATION_STATUS_LABELS[reg.status]}
      </Badge>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DashboardData = {
  totalCompetitions:  number;
  activeCompetitions: number;
  totalRegistrations: number;
  totalAthletes:      number;
  totalGyms:          number;
  activeComps:        Competition[];
  upcomingComps:      Competition[];
  recentRegs:         Registration[];
  regsByComp:         Record<string, Registration[]>;
  sheetedRegIds:      Set<number>;
};

export default function DashboardPage() {
  const router = useRouter();
  const { isJudge } = useJudge();

  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isJudge) {
      router.replace('/assignments');
      return;
    }

    async function load() {
      try {
        const today = new Date().toISOString().slice(0, 10);

        const [compsRes, regsRes, sheetsRes, athletesRes, gymsRes] = await Promise.all([
          competitionsRepository.listCompetitions({ page_size: '100' }),
          competitionsRepository.listRegistrations({ page_size: '200' }),
          competitionsRepository.listScoreSheets({ page_size: '200' }),
          athletesRepository.listAthletes({ page_size: '1' }),
          competitionsRepository.listGyms({ page_size: '1' }),
        ]);

        const allComps   = compsRes.data.results;
        const allRegs    = regsRes.data.results as Registration[];
        const allSheets  = sheetsRes.data.results as ScoreSheet[];

        const activeComps   = allComps.filter(c => c.is_active);
        const upcomingComps = allComps.filter(c => !c.is_active && c.date >= today);

        const sheetedRegIds = new Set(allSheets.map(s => s.registration));

        const regsByComp = allRegs.reduce<Record<string, Registration[]>>((acc, r) => {
          (acc[r.competition_name] ??= []).push(r);
          return acc;
        }, {});

        const recentRegs = [...allRegs].sort((a, b) => b.id - a.id).slice(0, 6);

        setData({
          totalCompetitions:  compsRes.data.count,
          activeCompetitions: activeComps.length,
          totalRegistrations: regsRes.data.count,
          totalAthletes:      athletesRes.data.count,
          totalGyms:          gymsRes.data.count,
          activeComps,
          upcomingComps,
          recentRegs,
          regsByComp,
          sheetedRegIds,
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isJudge, router]);

  if (isJudge || loading) return <PageSpinner />;

  const d = data!;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Inicio</h1>
        <p className="text-sm text-zinc-400 mt-1">Resumen general de la plataforma.</p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Competencias"
          value={d.totalCompetitions}
          sub={`${d.activeCompetitions} activa${d.activeCompetitions !== 1 ? 's' : ''}`}
          icon={Trophy}
        />
        <StatCard label="Inscripciones" value={d.totalRegistrations} icon={ClipboardList} />
        <StatCard label="Atletas"       value={d.totalAthletes}      icon={Users} />
        <StatCard label="Gimnasios"     value={d.totalGyms}          icon={Building2} />
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left: Active + Upcoming */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active competitions with sheet breakdown */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Competencias activas ({d.activeComps.length})
            </h2>
            {d.activeComps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center">
                <Trophy className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No hay competencias activas.</p>
              </div>
            ) : (
              d.activeComps.map(comp => (
                <CompBreakdownCard
                  key={comp.id}
                  comp={comp}
                  regs={d.regsByComp[comp.name] ?? []}
                  sheeted={(d.regsByComp[comp.name] ?? []).filter(r => d.sheetedRegIds.has(r.id)).length}
                />
              ))
            )}
          </section>

          {/* Upcoming competitions */}
          {d.upcomingComps.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Próximas competencias ({d.upcomingComps.length})
                </h2>
              </div>
              {d.upcomingComps.map(comp => (
                <UpcomingCard key={comp.id} comp={comp} />
              ))}
            </section>
          )}
        </div>

        {/* Right: Recent registrations */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Últimas inscripciones
          </h2>
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-1">
            {d.recentRegs.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">Sin inscripciones aún.</p>
            ) : (
              d.recentRegs.map(reg => <RecentRegRow key={reg.id} reg={reg} />)
            )}
          </div>
          <Link
            href="/competitions"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors pt-1"
          >
            Ver todas las competencias <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
