'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Users, Building2, ClipboardList, ArrowRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import athletesRepository from '@/repositories/athletesRepository';
import { useJudge } from '@/hooks/useJudge';
import type { Competition } from '@/types/competitions';

type Stats = {
  totalCompetitions: number;
  activeCompetitions: number;
  totalRegistrations: number;
  totalAthletes: number;
  totalGyms: number;
};

function StatCard({
  label, value, sub, icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
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

function ActiveCompCard({ comp }: { comp: Competition }) {
  const date = new Date(comp.date + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 truncate">{comp.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {dateLabel}
          {comp.venue && <span className="text-zinc-300">·</span>}
          {comp.venue && <span>{comp.venue}</span>}
        </p>
      </div>
      <Link href={`/competitions/${comp.id}`}>
        <Button size="sm" variant="outline" className="shrink-0">
          Ver
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { isJudge } = useJudge();

  const [stats, setStats]           = useState<Stats | null>(null);
  const [activeComps, setActiveComps] = useState<Competition[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (isJudge) {
      router.replace('/assignments');
      return;
    }

    async function load() {
      try {
        const [compsRes, regsRes, athletesRes, gymsRes] = await Promise.all([
          competitionsRepository.listCompetitions({ page_size: '100' }),
          competitionsRepository.listRegistrations({ page_size: '1' }),
          athletesRepository.listAthletes({ page_size: '1' }),
          competitionsRepository.listGyms({ page_size: '1' }),
        ]);

        const comps  = compsRes.data.results;
        const active = comps.filter(c => c.is_active);

        setStats({
          totalCompetitions:  compsRes.data.count,
          activeCompetitions: active.length,
          totalRegistrations: regsRes.data.count,
          totalAthletes:      athletesRes.data.count,
          totalGyms:          gymsRes.data.count,
        });
        setActiveComps(active);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isJudge, router]);

  if (isJudge || loading) return <PageSpinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Inicio</h1>
        <p className="text-sm text-zinc-400 mt-1">Resumen general de la plataforma.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Competencias"
          value={stats!.totalCompetitions}
          sub={`${stats!.activeCompetitions} activa${stats!.activeCompetitions !== 1 ? 's' : ''}`}
          icon={Trophy}
        />
        <StatCard
          label="Inscripciones"
          value={stats!.totalRegistrations}
          icon={ClipboardList}
        />
        <StatCard
          label="Atletas"
          value={stats!.totalAthletes}
          icon={Users}
        />
        <StatCard
          label="Gimnasios"
          value={stats!.totalGyms}
          icon={Building2}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Competencias activas ({activeComps.length})
        </h2>
        {activeComps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center">
            <Trophy className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No hay competencias activas en este momento.</p>
          </div>
        ) : (
          activeComps.map(comp => (
            <ActiveCompCard key={comp.id} comp={comp} />
          ))
        )}
      </section>
    </div>
  );
}
