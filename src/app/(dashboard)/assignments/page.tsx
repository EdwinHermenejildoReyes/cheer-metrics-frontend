'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList, ArrowRight, CalendarDays, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useJudge } from '@/hooks/useJudge';
import type { RootState } from '@/core/rootReducer';
import { SHEET_TYPE_LABELS, type JudgeAssignment } from '@/types/competitions';

type AssignmentGroup = {
  competitionId: number;
  competitionName: string;
  competitionDate: string;
  isActive: boolean;
  assignments: JudgeAssignment[];
};

function CompetitionCard({ group, onGo }: { group: AssignmentGroup; onGo: () => void }) {
  const date = new Date(group.competitionDate + 'T12:00:00');
  const dateLabel = date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${group.isActive ? 'border-zinc-200' : 'border-zinc-100 opacity-60'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {group.isActive
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                : <Clock className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
              }
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${group.isActive ? 'text-green-600' : 'text-zinc-400'}`}>
                {group.isActive ? 'Activo' : 'Finalizado'}
              </span>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 leading-tight">{group.competitionName}</h3>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {dateLabel}
            </p>
          </div>
          {group.isActive && (
            <Button size="sm" onClick={onGo} className="shrink-0">
              Ir
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {group.assignments.map(a => (
            <Badge key={a.id} variant="info">
              {SHEET_TYPE_LABELS[a.sheet_type]}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  const router = useRouter();
  const user = useSelector((s: RootState) => s.auth.user);
  const { isCompetitionActive } = useJudge();

  const allAssignments = user?.judge_assignments ?? [];

  // Group by competition
  const byCompetition = allAssignments.reduce<Record<number, JudgeAssignment[]>>((acc, a) => {
    if (!acc[a.competition]) acc[a.competition] = [];
    acc[a.competition].push(a);
    return acc;
  }, {});

  const groups: AssignmentGroup[] = Object.values(byCompetition).map(list => ({
    competitionId:   list[0].competition,
    competitionName: list[0].competition_name,
    competitionDate: list[0].competition_date,
    isActive:        isCompetitionActive(list[0].competition),
    assignments:     list,
  }));

  const active = groups.filter(g => g.isActive);
  const past   = groups.filter(g => !g.isActive);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Mis asignaciones</h1>
        <p className="text-sm text-zinc-400 mt-1">Eventos en los que estás asignado como juez.</p>
      </div>

      {/* Active */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Activos ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 py-12 text-center">
            <ClipboardList className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No tienes eventos activos en este momento.</p>
          </div>
        ) : (
          active.map(group => (
            <CompetitionCard
              key={group.competitionId}
              group={group}
              onGo={() => router.push(`/competitions/${group.competitionId}`)}
            />
          ))
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Finalizados ({past.length})
          </h2>
          {past.map(group => (
            <CompetitionCard
              key={group.competitionId}
              group={group}
              onGo={() => {}}
            />
          ))}
        </section>
      )}
    </div>
  );
}
