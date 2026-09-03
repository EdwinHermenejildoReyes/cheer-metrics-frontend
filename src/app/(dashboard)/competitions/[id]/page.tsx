'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Users, UserCog, Trash2, X, ChevronDown, ChevronUp, Upload, TriangleAlert, ListOrdered, ClipboardList, Receipt, Link as LinkIcon, Copy, Check, Printer, Trophy } from 'lucide-react';
import { PrintButton } from '@/components/print/PrintButton';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { CompetitionModal } from '@/components/competitions/CompetitionModal';
import { DivisionModal } from '@/components/competitions/DivisionModal';
import { SheetTypeMultiSelect } from '@/components/competitions/SheetTypeMultiSelect';
import { DivisionMultiSelect } from '@/components/competitions/DivisionMultiSelect';
import competitionsRepository, { type RestConflict } from '@/repositories/competitionsRepository';
import authRepository, { type SimpleUser } from '@/repositories/authRepository';
import publicRegistrationRepository from '@/repositories/publicRegistrationRepository';
import getEnvVars from '@/utils/getEnvVars';
import { useJudge } from '@/hooks/useJudge';
import { useConfirm } from '@/hooks/useConfirm';
import { printItineraryPdf, fetchItineraryRegistrations } from '@/lib/exportItinerary';
import { useBranding } from '@/contexts/BrandingContext';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  SCORING_FAMILY_LABELS,
  SHEET_TYPE_LABELS,
  SHEET_TYPE_GROUPS,
  GRUPAL_SHEET_TYPES,
  type Competition,
  type Division,
  type JudgeAssignment,
  type JudgePanel,
  type SheetType,
  type ScoringSystem,
} from '@/types/competitions';

export default function CompetitionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [divModalOpen, setDivModalOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<Division | undefined>();
  const [judgesOpen, setJudgesOpen] = useState(false);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [panels, setPanels] = useState<JudgePanel[]>([]);
  const [newJudgeUserId, setNewJudgeUserId] = useState('');
  const [newJudgePanelId, setNewJudgePanelId] = useState('');
  const [newJudgeSheets, setNewJudgeSheets] = useState<SheetType[]>([]);
  const [newJudgeFrom, setNewJudgeFrom] = useState('');
  const [newJudgeUntil, setNewJudgeUntil] = useState('');
  const [addingJudge, setAddingJudge] = useState(false);
  const [judgeScope, setJudgeScope] = useState<'all' | 'specific'>('all');
  const [selectedDivIds, setSelectedDivIds] = useState<number[]>([]);

  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<RestConflict[]>([]);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [assigningOrders, setAssigningOrders] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);

  // Export itinerary modal
  const [exportModalOpen, setExportModalOpen]   = useState(false);
  const [exportStartTime, setExportStartTime]   = useState('08:30');
  const [exportLoading, setExportLoading]       = useState(false);

  // Registration tokens
  const [tokensModalOpen, setTokensModalOpen] = useState(false);
  interface RegToken { id: number; token: string; expires_at: string; max_uses: number | null; used_count: number; notes: string; is_valid: boolean; }
  const [tokens, setTokens] = useState<RegToken[]>([]);
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [newTokenMaxUses, setNewTokenMaxUses] = useState('');
  const [newTokenNotes, setNewTokenNotes] = useState('');
  const [creatingToken, setCreatingToken] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { isJudge, isCompetitionActive, canViewDivision } = useJudge();
  const { organization } = useBranding();
  const confirm = useConfirm();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDropdown = (name: string) =>
    setOpenDropdown(prev => (prev === name ? null : name));

  const hasJudging      = competition?.service_type !== 'registration_only';
  const hasRegistration = competition?.service_type !== 'judging_only';


  useEffect(() => {
    if (!competition) return;
    if (isJudge && !isCompetitionActive(competition.id)) {
      toast.error('El evento ha finalizado.');
      router.replace('/competitions');
    }
  }, [isJudge, competition, isCompetitionActive, router]);

  const load = useCallback(async () => {
    try {
      const compRes = await competitionsRepository.getCompetition(id);
      setCompetition(compRes.data);
      const divRes = await competitionsRepository.listDivisions({
        competition: String(compRes.data.id),
        page_size: '100',
      });
      setDivisions(divRes.data.results);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadJudges = useCallback(async () => {
    if (!competition) return;
    const [assignRes, usersRes, panelsRes] = await Promise.all([
      competitionsRepository.listJudgeAssignments({ competition: String(competition.id), page_size: '100' }),
      authRepository.listUsers(),
      competitionsRepository.listJudgePanels({ competition__public_id: id, page_size: '100' }),
    ]);
    setAssignments(assignRes.data.results);
    setUsers(usersRes.data);
    setPanels(panelsRes.data.results);
  }, [competition, id]);


  useEffect(() => { load(); }, [load]);

  const handleJudgesToggle = useCallback(() => {
    if (!judgesOpen) loadJudges();
    setJudgesOpen((v) => !v);
  }, [judgesOpen, loadJudges]);

  const handleAutoAssignOrders = async () => {
    setItineraryModalOpen(false);
    setAssigningOrders(true);
    try {
      const res = await competitionsRepository.autoAssignOrders(id);
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
      const res = await competitionsRepository.getScheduleConflicts(id);
      setConflicts(res.data);
    } finally {
      setConflictsLoading(false);
    }
  }, [id]);

  const handleConflictsToggle = useCallback(() => {
    if (!conflictsOpen) loadConflicts();
    setConflictsOpen((v) => !v);
  }, [conflictsOpen, loadConflicts]);

  const loadTokens = useCallback(async () => {
    const res = await publicRegistrationRepository.listTokens(id);
    setTokens(res.results ?? res);
  }, [id]);

  const handleTokensOpen = useCallback(() => {
    setTokensModalOpen(true);
    setOpenDropdown(null);
    loadTokens();
  }, [loadTokens]);

  const handleCreateToken = async () => {
    if (!newTokenExpiry) { toast.error('Indica la fecha de expiración.'); return; }
    setCreatingToken(true);
    try {
      await publicRegistrationRepository.createToken({
        competition: competition!.id,
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
    const ok = await confirm({ title: '¿Eliminar token?', message: 'El link de inscripción dejará de funcionar.\nEsta acción no se puede deshacer.', confirmLabel: 'Eliminar' });
    if (!ok) return;
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
    if (newJudgeSheets.length === 0) {
      toast.error('Selecciona al menos una planilla.');
      return;
    }
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
      await Promise.all(
        newJudgeSheets.map((sheet) =>
          competitionsRepository.createJudgeAssignment({
            user: Number(newJudgeUserId),
            competition: competition!.id,
            sheet_type: sheet,
            panel: newJudgePanelId ? Number(newJudgePanelId) : null,
            divisions: selectedDivIds,
            access_from: new Date(newJudgeFrom).toISOString(),
            access_until: new Date(newJudgeUntil).toISOString(),
          })
        )
      );
      const count = newJudgeSheets.length;
      toast.success(`${count} planilla${count !== 1 ? 's' : ''} asignada${count !== 1 ? 's' : ''}`);
      setNewJudgeUserId('');
      setNewJudgePanelId('');
      setNewJudgeSheets([]);
      setNewJudgeFrom('');
      setNewJudgeUntil('');
      setJudgeScope('all');
      setSelectedDivIds([]);
      await loadJudges();
    } catch {
      toast.error('No se pudo asignar el juez (puede que ya esté asignado a alguna planilla)');
    } finally {
      setAddingJudge(false);
    }
  };

  const handleRemoveJudge = async (assignmentId: number) => {
    const ok = await confirm({ title: '¿Eliminar asignación?', message: 'Esta acción eliminará al juez de la competencia.\nEsta acción no se puede deshacer.', confirmLabel: 'Eliminar' });
    if (!ok) return;
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

  const handleExportPdf = async () => {
    setExportLoading(true);
    try {
      const regs = await fetchItineraryRegistrations(competitionsRepository, id);
      printItineraryPdf(competition!, organization, regs, exportStartTime);
      setExportModalOpen(false);
    } catch {
      toast.error('No se pudo generar el PDF.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!competition) return <div className="p-8 text-zinc-500">Competencia no encontrada.</div>;

  const visibleDivisions = isJudge
    ? divisions.filter((d) => canViewDivision(competition.id, d.id))
    : divisions;

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
              {competition.scoring_family && (
                <Badge variant="info">{SCORING_FAMILY_LABELS[competition.scoring_family]}</Badge>
              )}
              <Badge variant="default">{competition.regulation}</Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date(competition.date + 'T00:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}{competition.venue}, {competition.city}
            </p>
            {competition.notes && <p className="text-sm text-zinc-400 mt-1">{competition.notes}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2" ref={actionsRef}>
          <PrintButton />
          {!isJudge && (
            <>
              {/* ── Itinerario ──────────────────────────────── */}
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => toggleDropdown('itinerario')}>
                  <ListOrdered className="h-3.5 w-3.5" />
                  Itinerario
                  <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${openDropdown === 'itinerario' ? 'rotate-180' : ''}`} />
                </Button>
                {openDropdown === 'itinerario' && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      onClick={() => { setExportModalOpen(true); setOpenDropdown(null); }}
                    >
                      <Printer className="h-3.5 w-3.5 text-zinc-400" />
                      Exportar PDF
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                      onClick={() => { if (!assigningOrders) { setItineraryModalOpen(true); setOpenDropdown(null); } }}
                      disabled={assigningOrders}
                    >
                      <ListOrdered className="h-3.5 w-3.5 text-zinc-400" />
                      {assigningOrders ? 'Generando…' : 'Generar itinerario'}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Ver ─────────────────────────────────────── */}
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => toggleDropdown('ver')}>
                  <Trophy className="h-3.5 w-3.5" />
                  Ver
                  <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${openDropdown === 'ver' ? 'rotate-180' : ''}`} />
                </Button>
                {openDropdown === 'ver' && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      onClick={() => { router.push(`/competitions/${id}/grand-champion`); setOpenDropdown(null); }}
                    >
                      <Trophy className="h-3.5 w-3.5 text-zinc-400" />
                      Gran Campeón
                    </button>
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      onClick={() => { router.push(`/competitions/${id}/backstage`); setOpenDropdown(null); }}
                    >
                      <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
                      Backstage
                    </button>
                  </div>
                )}
              </div>

              {/* ── Administrar ─────────────────────────────── */}
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => toggleDropdown('admin')}>
                  <UserCog className="h-3.5 w-3.5" />
                  Administrar
                  <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${openDropdown === 'admin' ? 'rotate-180' : ''}`} />
                </Button>
                {openDropdown === 'admin' && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
                    {competition.scoring_family === 'icu_dance' && (
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        onClick={() => { router.push(`/competitions/${id}/panels`); setOpenDropdown(null); }}
                      >
                        <Users className="h-3.5 w-3.5 text-zinc-400" />
                        Paneles ICU
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                      onClick={() => { router.push(`/competitions/${id}/import`); setOpenDropdown(null); }}
                    >
                      <Upload className="h-3.5 w-3.5 text-zinc-400" />
                      Importar inscripción
                    </button>
                    {hasRegistration && (
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        onClick={() => { router.push(`/competitions/${id}/billing`); setOpenDropdown(null); }}
                      >
                        <Receipt className="h-3.5 w-3.5 text-zinc-400" />
                        Facturación
                      </button>
                    )}
                    {hasRegistration && (
                      <button
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                        onClick={handleTokensOpen}
                      >
                        <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
                        Links de inscripción
                      </button>
                    )}
                  </div>
                )}
              </div>

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

        {visibleDivisions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-zinc-400 rounded-xl border border-dashed border-zinc-200">
            <Users className="h-8 w-8" />
            <p className="text-sm">{isJudge ? 'No tienes divisiones asignadas.' : 'Sin divisiones. Agrega la primera.'}</p>
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
                {visibleDivisions.map((div) => (
                  <tr
                    key={div.id}
                    className="cursor-pointer hover:bg-zinc-50 transition-colors"
                    onClick={() => router.push(`/competitions/${id}/divisions/${div.public_id}`)}
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
            onClick={handleConflictsToggle}
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
            onClick={handleJudgesToggle}
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
            <div className="rounded-xl border border-zinc-200 bg-white">
              {/* Add form */}
              <div className="grid grid-cols-2 gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50 lg:flex lg:items-start">
                <div className="col-span-2 lg:w-72">
                  <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Usuario</label>
                  <div className="relative">
                    <select
                      value={newJudgeUserId}
                      onChange={(e) => setNewJudgeUserId(e.target.value)}
                      className="w-full h-9 appearance-none rounded-lg border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 hover:border-zinc-400"
                    >
                      <option value="">— Seleccionar —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.email}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  </div>
                </div>
                {panels.length > 0 && (
                  <div>
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Panel</label>
                    <div className="relative">
                      <select
                        value={newJudgePanelId}
                        onChange={(e) => setNewJudgePanelId(e.target.value)}
                        className="w-full h-9 appearance-none rounded-lg border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 hover:border-zinc-400"
                      >
                        <option value="">— Sin panel —</option>
                        {panels.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    </div>
                  </div>
                )}
                <div className="col-span-2 lg:flex-1 flex flex-col gap-3">
                  {/* Division selector */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Divisiones</label>
                    <div className="flex flex-col gap-1.5">
                      <div className="inline-flex rounded-lg border border-zinc-300 overflow-hidden w-fit">
                        <button
                          type="button"
                          onClick={() => { setJudgeScope('all'); setSelectedDivIds([]); }}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors ${judgeScope === 'all' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                        >
                          Todas
                        </button>
                        <button
                          type="button"
                          onClick={() => setJudgeScope('specific')}
                          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-300 ${judgeScope === 'specific' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                        >
                          Específicas
                        </button>
                      </div>
                      {judgeScope === 'specific' && (
                        <DivisionMultiSelect
                          divisions={divisions}
                          value={selectedDivIds}
                          onChange={setSelectedDivIds}
                        />
                      )}
                    </div>
                  </div>

                  {/* Sheet type selector */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-1 block">Planilla</label>
                    <SheetTypeMultiSelect
                      value={newJudgeSheets}
                      onChange={setNewJudgeSheets}
                      sheetMode={competition.sheet_mode}
                      disabledTypes={(() => {
                        if (!newJudgeUserId) return [];
                        const existing = assignments.filter((a) => String(a.user) === newJudgeUserId).map((a) => a.sheet_type);
                        const disabled = new Set<SheetType>();
                        for (const st of existing) {
                          const group = SHEET_TYPE_GROUPS.find((g) => g.types.includes(st));
                          if (!group) continue;
                          const isGrupal = GRUPAL_SHEET_TYPES.includes(st);
                          const conflicts = isGrupal
                            ? group.types.filter((t) => !GRUPAL_SHEET_TYPES.includes(t))
                            : group.types.filter((t) => GRUPAL_SHEET_TYPES.includes(t));
                          conflicts.forEach((c) => disabled.add(c));
                          disabled.add(st);
                        }
                        return [...disabled];
                      })()}
                    />
                  </div>
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
                <div className="col-span-2 flex justify-end lg:col-span-1 lg:self-end">
                  <Button size="sm" onClick={handleAddJudge} disabled={!newJudgeUserId || newJudgeSheets.length === 0 || !newJudgeFrom || !newJudgeUntil || addingJudge}>
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
                  {Object.values(
                    assignments.reduce((acc, a) => {
                      if (!acc[a.user]) acc[a.user] = { user_name: a.user_name, user: a.user, items: [] };
                      acc[a.user].items.push(a);
                      return acc;
                    }, {} as Record<number, { user_name: string; user: number; items: JudgeAssignment[] }>)
                  ).map((group) => {
                    const isActive = group.items.some((a) => a.is_access_active);
                    const rangeGroups = Object.values(
                      group.items.reduce((racc, a) => {
                        const key = `${a.access_from}|${a.access_until}`;
                        if (!racc[key]) racc[key] = { from: a.access_from, until: a.access_until, items: [] as JudgeAssignment[] };
                        racc[key].items.push(a);
                        return racc;
                      }, {} as Record<string, { from: string | null; until: string | null; items: JudgeAssignment[] }>)
                    );
                    return (
                      <div key={group.user} className="px-5 py-3.5">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium text-zinc-900">{group.user_name}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {rangeGroups.map((rg) => {
                            const rangeKey = `${rg.from}|${rg.until}`;
                            return (
                              <div key={rangeKey}>
                                <div className="flex flex-wrap gap-1.5">
                                  {rg.items.map((a) => (
                                    <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                                      {SHEET_TYPE_LABELS[a.sheet_type]}
                                      {a.panel_name && (
                                        <span className="rounded bg-blue-100 text-blue-700 px-1 py-0.5 text-[10px] font-semibold leading-none">
                                          {a.panel_name}
                                        </span>
                                      )}
                                      {a.divisions.length > 0 && (
                                        <span className="rounded bg-emerald-100 text-emerald-700 px-1 py-0.5 text-[10px] font-semibold leading-none">
                                          {a.divisions.map(did => divisions.find(d => d.id === did)?.name ?? String(did)).join(', ')}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveJudge(a.id)}
                                        className="text-zinc-400 hover:text-red-500 transition-colors"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                                  {rg.from && rg.from !== 'null' ? new Date(rg.from).toLocaleString('es-EC') : '—'}
                                  {' → '}
                                  {rg.until && rg.until !== 'null' ? new Date(rg.until).toLocaleString('es-EC') : '—'}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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

      {/* ── Modal: exportar itinerario ─────────────────────────────────── */}
      <Modal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exportar itinerario"
        size="md"
      >
        <p className="text-sm text-zinc-500 mb-4">
          Ingresa la hora de inicio del evento. Se calcularán automáticamente los tiempos de registro, foto, warm up, backstage y presentación para cada equipo.
        </p>
        <div className="mb-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5 block">
            Hora de inicio del evento
          </label>
          <input
            type="time"
            value={exportStartTime}
            onChange={(e) => setExportStartTime(e.target.value)}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
        <div className="mt-4 rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-500 space-y-1 mb-5">
          <p className="font-medium text-zinc-700 mb-1">Tiempos entre etapas</p>
          <p>Registro → Foto: <strong>5 min</strong></p>
          <p>Foto → Warm up: <strong>5 min</strong></p>
          <p>Warm up → Backstage: <strong>6 min</strong></p>
          <p>Backstage → Presentación: <strong>5 min</strong></p>
          <p>Entre presentaciones: <strong>5 min</strong> · Duración máx.: <strong>2:30 min</strong></p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setExportModalOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleExportPdf} loading={exportLoading}>
            <Printer className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        </div>
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
        competitionId={competition.id}
        sheetMode={competition.sheet_mode}
        initial={editingDivision}
      />
    </div>
  );
}
