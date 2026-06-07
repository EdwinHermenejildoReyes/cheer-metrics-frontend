'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Users, UserCog, Trash2, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { PrintButton } from '@/components/print/PrintButton';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { CompetitionModal } from '@/components/competitions/CompetitionModal';
import { DivisionModal } from '@/components/competitions/DivisionModal';
import competitionsRepository from '@/repositories/competitionsRepository';
import authRepository, { type SimpleUser } from '@/repositories/authRepository';
import { useJudge } from '@/hooks/useJudge';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  SHEET_TYPE_LABELS,
  type Competition,
  type Division,
  type JudgeAssignment,
  type SheetType,
  type ScoringSystem,
} from '@/types/competitions';

export default function CompetitionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const competitionId = Number(id);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [divModalOpen, setDivModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | undefined>();
  const [judgesOpen, setJudgesOpen] = useState(false);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [newJudgeUserId, setNewJudgeUserId] = useState('');
  const [newJudgeSheet, setNewJudgeSheet] = useState<SheetType>('building');
  const [addingJudge, setAddingJudge] = useState(false);
  const { isJudge, isCompetitionActive } = useJudge();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado.');
      router.replace('/competitions');
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const load = useCallback(async () => {
    try {
      const [compRes, divRes] = await Promise.all([
        competitionsRepository.getCompetition(competitionId),
        competitionsRepository.listDivisions({ competition: String(competitionId), page_size: '100' }),
      ]);
      setCompetition(compRes.data);
      setDivisions(divRes.data.results);
    } finally {
      setLoading(false);
    }
  }, [competitionId]);

  const loadJudges = useCallback(async () => {
    const [assignRes, usersRes] = await Promise.all([
      competitionsRepository.listJudgeAssignments({ competition: String(competitionId), page_size: '100' }),
      authRepository.listUsers(),
    ]);
    setAssignments(assignRes.data.results);
    setUsers(usersRes.data);
  }, [competitionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (judgesOpen) loadJudges();
  }, [judgesOpen, loadJudges]);

  const handleAddJudge = async () => {
    if (!newJudgeUserId) return;
    setAddingJudge(true);
    try {
      await competitionsRepository.createJudgeAssignment({
        user: Number(newJudgeUserId),
        competition: competitionId,
        sheet_type: newJudgeSheet,
      });
      toast.success('Juez asignado');
      setNewJudgeUserId('');
      await loadJudges();
    } catch {
      toast.error('No se pudo asignar el juez (puede que ya esté asignado)');
    } finally {
      setAddingJudge(false);
    }
  };

  const handleRemoveJudge = async (assignmentId: number) => {
    try {
      await competitionsRepository.deleteJudgeAssignment(assignmentId);
      toast.success('Asignación eliminada');
      await loadJudges();
    } catch {
      toast.error('No se pudo eliminar la asignación');
    }
  };

  const handleCompSaved = (saved: Competition) => setCompetition(saved);

  const handleDivSaved = (saved: Division) => {
    setDivisions((prev) =>
      prev.some((d) => d.id === saved.id)
        ? prev.map((d) => (d.id === saved.id ? saved : d))
        : [...prev, saved]
    );
  };

  const openEditDiv = (e: React.MouseEvent, div: Division) => {
    e.stopPropagation();
    setEditingDivision(div);
    setDivModalOpen(true);
  };

  if (loading) return <PageSpinner />;
  if (!competition) return <div className="p-8 text-zinc-500">Competencia no encontrada.</div>;

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/competitions')}
            className="mt-0.5 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-zinc-900">{competition.name}</h1>
              <Badge variant="info">{competition.regulation}</Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date(competition.date + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}{competition.venue}, {competition.city}
            </p>
            {competition.notes && <p className="text-sm text-zinc-400 mt-1">{competition.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {!isJudge && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/competitions/${competitionId}/import`)}
              >
                <Upload className="h-3.5 w-3.5" />
                Importar inscripción
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setCompModalOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Divisions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Divisiones</h2>
          {!isJudge && (
            <Button size="sm" onClick={() => { setEditingDivision(undefined); setDivModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              Agregar división
            </Button>
          )}
        </div>

        {divisions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-zinc-400 rounded-xl border border-dashed border-zinc-200">
            <Users className="h-8 w-8" />
            <p className="text-sm">Sin divisiones. Agrega la primera.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">División</th>
                  <th className="px-5 py-3">Edad</th>
                  <th className="px-5 py-3">Nivel</th>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3">Sistema</th>
                  <th className="px-5 py-3">Atletas</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {divisions.map((div) => (
                  <tr
                    key={div.id}
                    className="cursor-pointer hover:bg-zinc-50 transition-colors"
                    onClick={() => router.push(`/competitions/${competitionId}/divisions/${div.id}`)}
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{div.name}</td>
                    <td className="px-5 py-3.5 text-zinc-600">{AGE_GROUP_LABELS[div.age_group]}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="violet">{SKILL_LEVEL_LABELS[div.skill_level]}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600">{CATEGORY_LABELS[div.category]}</td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      {SCORING_SYSTEM_LABELS[(div.scoring_system || div.suggested_scoring_system) as ScoringSystem] ?? '–'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">
                      {div.min_athletes ?? '–'} – {div.max_athletes ?? '–'}
                    </td>
                    {!isJudge && (
                      <td className="px-5 py-3.5 text-right">
                        <Button size="icon" variant="ghost" onClick={(e) => openEditDiv(e, div)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Panel de jueces (solo admin) ───────────────────────────────── */}
      {!isJudge && (
        <div className="print:hidden flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setJudgesOpen((v) => !v)}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-900">Jueces asignados</span>
              {assignments.length > 0 && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {assignments.length}
                </span>
              )}
            </div>
            {judgesOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>

          {judgesOpen && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {/* Add form */}
              <div className="flex items-end gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
                <div className="flex-1">
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Usuario</label>
                  <select
                    value={newJudgeUserId}
                    onChange={(e) => setNewJudgeUserId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="">— Seleccionar —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-48">
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Planilla</label>
                  <select
                    value={newJudgeSheet}
                    onChange={(e) => setNewJudgeSheet(e.target.value as SheetType)}
                    className="w-full h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {(Object.keys(SHEET_TYPE_LABELS) as SheetType[]).map((st) => (
                      <option key={st} value={st}>{SHEET_TYPE_LABELS[st]}</option>
                    ))}
                  </select>
                </div>
                <Button size="sm" onClick={handleAddJudge} disabled={!newJudgeUserId || addingJudge}>
                  <Plus className="h-4 w-4" />
                  Asignar
                </Button>
              </div>

              {/* List */}
              {assignments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-zinc-400">Sin jueces asignados a esta competencia.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{a.user_name}</p>
                        <p className="text-xs text-zinc-500">{SHEET_TYPE_LABELS[a.sheet_type]}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveJudge(a.id)}
                        className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CompetitionModal
        open={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        onSaved={handleCompSaved}
        initial={competition}
      />
      <DivisionModal
        open={divModalOpen}
        onClose={() => setDivModalOpen(false)}
        onSaved={handleDivSaved}
        competitionId={competitionId}
        initial={editingDivision}
      />
    </div>
  );
}
