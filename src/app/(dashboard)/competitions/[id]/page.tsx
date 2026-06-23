'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Users, UserCog, Trash2, ChevronDown, ChevronUp, Upload, TriangleAlert, ListOrdered, ClipboardList, Receipt, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { PrintButton } from '@/components/print/PrintButton';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { CompetitionModal } from '@/components/competitions/CompetitionModal';
import { DivisionModal } from '@/components/competitions/DivisionModal';
import competitionsRepository, { type RestConflict } from '@/repositories/competitionsRepository';
import authRepository, { type SimpleUser } from '@/repositories/authRepository';
import publicRegistrationRepository from '@/repositories/publicRegistrationRepository';
import getEnvVars from '@/utils/getEnvVars';
import { useJudge } from '@/hooks/useJudge';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  SHEET_TYPE_LABELS,
  GRUPAL_SHEET_TYPES,
  INDIVIDUAL_SHEET_TYPES,
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
  const [newJudgeSheet, setNewJudgeSheet] = useState<SheetType | ''>('');
  const [newJudgeFrom, setNewJudgeFrom] = useState('');
  const [newJudgeUntil, setNewJudgeUntil] = useState('');
  const [addingJudge, setAddingJudge] = useState(false);

  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<RestConflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [assigningOrders, setAssigningOrders] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);

  // Registration tokens
  const [tokensModalOpen, setTokensModalOpen] = useState(false);
  interface RegToken { id: number; token: string; expires_at: string; max_uses: number | null; used_count: number; notes: string; is_valid: boolean; }
  const [tokens, setTokens] = useState<RegToken[]>([]);
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [newTokenMaxUses, setNewTokenMaxUses] = useState('');
  const [newTokenNotes, setNewTokenNotes] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { isJudge, isCompetitionActive } = useJudge();

  const hasJudging      = competition?.service_type !== 'registration_only';
  const hasRegistration = competition?.service_type !== 'judging_only';

  const availableSheetTypes = competition?.sheet_mode === 'individual'
    ? INDIVIDUAL_SHEET_TYPES
    : GRUPAL_SHEET_TYPES;

  const effectiveJudgeSheet: SheetType = (newJudgeSheet && availableSheetTypes.includes(newJudgeSheet as SheetType))
    ? newJudgeSheet as SheetType
    : availableSheetTypes[0];

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

  const handleAutoAssignOrders = async () => {
    setItineraryModalOpen(false);
    setAssigningOrders(true);
    try {
      const res = await competitionsRepository.autoAssignOrders(competitionId);
      toast.success(res.data.message);
      await load();
    } catch {
      toast.error('No se pudo generar el itinerario.');
    } finally {
      setAssigningOrders(false);
    }
  };

  const loadConflicts = useCallback(async () => {
    setConflictsLoading(true);
    try {
      const res = await competitionsRepository.getScheduleConflicts(competitionId);
      setConflicts(res.data);
    } finally {
      setConflictsLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    if (conflictsOpen) loadConflicts();
  }, [conflictsOpen, loadConflicts]);

  const loadTokens = useCallback(async () => {
    const res = await publicRegistrationRepository.listTokens(competitionId);
    setTokens(res.results ?? res);
  }, [competitionId]);

  useEffect(() => {
    if (tokensModalOpen) loadTokens();
  }, [tokensModalOpen, loadTokens]);

  const handleCreateToken = async () => {
    if (!newTokenExpiry) { toast.error('Indica la fecha de expiración.'); return; }
    setCreatingToken(true);
    try {
      await publicRegistrationRepository.createToken({
        competition: competitionId,
        expires_at: new Date(newTokenExpiry).toISOString(),
        max_uses: newTokenMaxUses ? Number(newTokenMaxUses) : null,
        notes: newTokenNotes,
      });
      toast.success('Token creado');
      setNewTokenExpiry('');
      setNewTokenMaxUses('');
      setNewTokenNotes('');
      await loadTokens();
    } catch {
      toast.error('No se pudo crear el token.');
    } finally {
      setCreatingToken(false);
    }
  };

  const handleDeleteToken = async (tokenId: number) => {
    try {
      await publicRegistrationRepository.deleteToken(tokenId);
      toast.success('Token eliminado');
      await loadTokens();
    } catch {
      toast.error('No se pudo eliminar el token.');
    }
  };

  const copyTokenLink = (token: string, tokenId: number) => {
    const { webUrl } = getEnvVars();
    const base = (webUrl ?? window.location.origin).replace(/\/$/, '');
    navigator.clipboard.writeText(`${base}/registro?token=${token}`);
    setCopiedId(tokenId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddJudge = async () => {
    if (!newJudgeUserId) return;
    if (!newJudgeFrom || !newJudgeUntil) {
      toast.error('Debes indicar la fecha/hora de inicio y fin de acceso.');
      return;
    }
    if (newJudgeFrom >= newJudgeUntil) {
      toast.error('La fecha de inicio debe ser anterior a la fecha de fin.');
      return;
    }
    setAddingJudge(true);
    try {
      await competitionsRepository.createJudgeAssignment({
        user: Number(newJudgeUserId),
        competition: competitionId,
        sheet_type: effectiveJudgeSheet,
        access_from: new Date(newJudgeFrom).toISOString(),
        access_until: new Date(newJudgeUntil).toISOString(),
      });
      toast.success('Juez asignado');
      setNewJudgeUserId('');
      setNewJudgeFrom('');
      setNewJudgeUntil('');
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
                onClick={() => setItineraryModalOpen(true)}
                disabled={assigningOrders}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                {assigningOrders ? 'Generando…' : 'Generar itinerario'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/competitions/${competitionId}/backstage`)}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Backstage
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/competitions/${competitionId}/import`)}
              >
                <Upload className="h-3.5 w-3.5" />
                Importar inscripción
              </Button>
              {hasRegistration && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/competitions/${competitionId}/billing`)}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Facturación
                </Button>
              )}
              {hasRegistration && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTokensModalOpen(true)}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Links de inscripción
                </Button>
              )}
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
                    <td className="px-5 py-3.5 text-zinc-600">
                      {CATEGORY_LABELS[div.category]}
                      {div.is_non_tumbling && <span className="ml-1.5 rounded-full bg-yellow-100 text-yellow-800 px-1.5 py-0.5 text-[10px] font-medium">NT</span>}
                    </td>
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

      {/* ── Panel de conflictos de descanso (solo admin) ───────────────── */}
      {!isJudge && (
        <div className="print:hidden flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setConflictsOpen((v) => !v)}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-left hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <TriangleAlert className={`h-4 w-4 ${conflicts.length > 0 && conflictsOpen ? 'text-amber-500' : 'text-zinc-400'}`} />
              <span className="text-sm font-semibold text-zinc-900">Conflictos de descanso</span>
              {conflicts.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {conflicts.length}
                </span>
              )}
            </div>
            {conflictsOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>

          {conflictsOpen && (
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              {conflictsLoading ? (
                <p className="px-5 py-4 text-sm text-zinc-400">Verificando conflictos…</p>
              ) : conflicts.length === 0 ? (
                <div className="flex items-center gap-2 px-5 py-4 text-sm text-zinc-500">
                  <span className="text-green-500">✓</span>
                  Todos los atletas tienen al menos 3 presentaciones de descanso entre apariciones.
                </div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-zinc-100 bg-amber-50">
                    <p className="text-xs text-amber-700">
                      Los siguientes atletas no tienen suficiente descanso entre dos presentaciones consecutivas (mínimo 3 salidas).
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium text-zinc-500">
                        <th className="px-4 py-2.5">Atleta</th>
                        <th className="px-4 py-2.5">1ª aparición</th>
                        <th className="px-4 py-2.5">2ª aparición</th>
                        <th className="px-4 py-2.5 text-center">Diferencia</th>
                        <th className="px-4 py-2.5 text-center">Faltan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {conflicts.map((c, i) => (
                        <tr key={i} className="hover:bg-amber-50/40">
                          <td className="px-4 py-3 font-medium text-zinc-900">{c.athlete_name}</td>
                          <td className="px-4 py-3 text-zinc-600 text-xs">
                            <span className="font-mono font-semibold text-zinc-800">#{c.order_a}</span>
                            {' '}{c.team_a}
                            <span className="block text-zinc-400">{c.division_a}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 text-xs">
                            <span className="font-mono font-semibold text-zinc-800">#{c.order_b}</span>
                            {' '}{c.team_b}
                            <span className="block text-zinc-400">{c.division_b}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              {c.gap}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-amber-600 font-medium">
                            +{c.missing}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
                    <button
                      type="button"
                      onClick={loadConflicts}
                      className="text-xs text-zinc-500 hover:text-zinc-700 underline"
                    >
                      Actualizar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Panel de jueces (solo admin, solo si tiene jueceo) ─────────── */}
      {!isJudge && hasJudging && (
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
              <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50 lg:flex lg:items-end">
                <div className="col-span-2 lg:flex-1">
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
                <div className="lg:w-44">
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Planilla</label>
                  <select
                    value={effectiveJudgeSheet}
                    onChange={(e) => setNewJudgeSheet(e.target.value as SheetType)}
                    className="w-full h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {availableSheetTypes.map((st) => (
                      <option key={st} value={st}>{SHEET_TYPE_LABELS[st]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">
                    Acceso desde <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newJudgeFrom}
                    onChange={(e) => setNewJudgeFrom(e.target.value)}
                    className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">
                    Acceso hasta <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newJudgeUntil}
                    onChange={(e) => setNewJudgeUntil(e.target.value)}
                    className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <div className="col-span-2 flex justify-end lg:col-span-1">
                  <Button size="sm" onClick={handleAddJudge} disabled={!newJudgeUserId || !effectiveJudgeSheet || !newJudgeFrom || !newJudgeUntil || addingJudge}>
                    <Plus className="h-4 w-4" />
                    Asignar
                  </Button>
                </div>
              </div>

              {/* List */}
              {assignments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-zinc-400">Sin jueces asignados a esta competencia.</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-900">{a.user_name}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${a.is_access_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                            {a.is_access_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{SHEET_TYPE_LABELS[a.sheet_type]}</p>
                        {(a.access_from || a.access_until) && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                            {a.access_from ? new Date(a.access_from).toLocaleString('es-EC') : '—'}
                            {' → '}
                            {a.access_until ? new Date(a.access_until).toLocaleString('es-EC') : '—'}
                          </p>
                        )}
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

      {/* ── Modal: confirmar generación de itinerario ───────────────────── */}
      <Modal
        open={itineraryModalOpen}
        onClose={() => setItineraryModalOpen(false)}
        title="Generar itinerario automático"
        size="sm"
      >
        <p className="text-sm text-zinc-500 mb-5">
          Se asignará el orden de presentación de todas las inscripciones activas siguiendo la progresión oficial de menor a mayor dificultad.
        </p>

        <div className="flex flex-col gap-1.5 mb-5">
          {[
            { label: 'Escolar',  detail: 'todas las categorías' },
            { label: 'Prep',     detail: 'todas las categorías' },
            { label: 'Tiny',     detail: 'Novice → Novice Plus → L1…' },
            { label: 'Youth',    detail: 'All Girl / All Male → 1.0, 1.1, 2, 3' },
            { label: 'Junior',   detail: 'All Girl / All Male → L1, L2, L3…' },
            { label: 'Senior',   detail: 'All Girl / All Male → L1, L2, L3, L4' },
            { label: 'Coed',     detail: 'todas las edades → L4, L5, L6, L7' },
          ].map((row, i) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-zinc-800 w-14">{row.label}</span>
              <span className="text-xs text-zinc-400">{row.detail}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-5">
          Los órdenes de presentación existentes serán reemplazados.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setItineraryModalOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleAutoAssignOrders} loading={assigningOrders}>
            <ListOrdered className="h-3.5 w-3.5" />
            Generar itinerario
          </Button>
        </div>
      </Modal>

      {/* ── Modal: links de inscripción ────────────────────────────────── */}
      <Modal
        open={tokensModalOpen}
        onClose={() => setTokensModalOpen(false)}
        title="Links de inscripción"
        size="lg"
      >
        {/* Create form */}
        <div className="flex flex-col gap-3 pb-4 border-b border-zinc-100 mb-4">
          <p className="text-xs text-zinc-500">Genera un link para que los gimnasios se inscriban sin necesitar una cuenta.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Expira el *</label>
              <input
                type="datetime-local"
                value={newTokenExpiry}
                onChange={(e) => setNewTokenExpiry(e.target.value)}
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Usos máx.</label>
              <input
                type="number"
                min={1}
                value={newTokenMaxUses}
                onChange={(e) => setNewTokenMaxUses(e.target.value)}
                placeholder="∞ ilimitado"
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Nota (opcional)</label>
              <input
                type="text"
                value={newTokenNotes}
                onChange={(e) => setNewTokenNotes(e.target.value)}
                placeholder="Ej. Gimnasio XYZ"
                className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleCreateToken} disabled={!newTokenExpiry || creatingToken}>
              <Plus className="h-4 w-4" />
              Crear link
            </Button>
          </div>
        </div>

        {/* Token list */}
        {tokens.length === 0 ? (
          <p className="text-sm text-zinc-400 py-2">Sin links creados aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tokens.map((tk) => (
              <div key={tk.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tk.is_valid ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                      {tk.is_valid ? 'Activo' : 'Inactivo'}
                    </span>
                    {tk.notes && <span className="text-xs font-medium text-zinc-700">{tk.notes}</span>}
                  </div>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Expira: {new Date(tk.expires_at).toLocaleString('es-EC')}
                    {tk.max_uses != null && ` · ${tk.used_count}/${tk.max_uses} usos`}
                    {tk.max_uses == null && tk.used_count > 0 && ` · ${tk.used_count} usos`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyTokenLink(tk.token, tk.id)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    {copiedId === tk.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === tk.id ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteToken(tk.id)}
                    className="rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

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
