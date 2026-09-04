'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Trophy, MinusCircle, Link2, ChevronsUp, RotateCw, Star, CircleMinus, Gauge, Users2, TrendingUp, BadgeCheck, Sparkles, Timer, ShieldCheck, ChevronUp, ChevronDown, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { RegistrationModal } from '@/components/competitions/RegistrationModal';
import { ScoringSheetModal } from '@/components/competitions/ScoringSheetModal';
import { DeductionModal } from '@/components/competitions/DeductionModal';
import { useDispatch } from 'react-redux';
import competitionsRepository from '@/repositories/competitionsRepository';
import authRepository from '@/repositories/authRepository';
import { setUser } from '@/store/auth/slices';
import { useJudge } from '@/hooks/useJudge';
import { useConfirm } from '@/hooks/useConfirm';
import { SkillReferencePanel } from '@/components/skill-tables/SkillReferencePanel';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  REGISTRATION_STATUS_LABELS,
  SHEET_TYPE_LABELS,
  type Division,
  type Registration,
  type RankingEntry,
  type ScoreSheet,
  type RegistrationStatus,
  type ScoringSystem,
  type SheetType,
} from '@/types/competitions';

function getSheetSlug(sheetType: SheetType, iasfWorld: boolean): string {
  if (iasfWorld) {
    if (sheetType === 'building') return 'iasf-building';
    if (sheetType === 'tumbling') return 'iasf-tumbling';
    if (sheetType === 'overall')  return 'iasf-overall';
  }
  if (sheetType === 'deductions_combined') return 'deducciones';
  return sheetType.replace(/_/g, '-');
}

const SHEET_TYPE_ICONS: Record<SheetType, LucideIcon> = {
  building:            ChevronsUp,
  tumbling:            RotateCw,
  overall:             Star,
  partner_stunt:       Users2,
  deducciones:         CircleMinus,
  rangos:              Gauge,
  building_difficulty: TrendingUp,
  building_execution:  BadgeCheck,
  tumbling_difficulty: TrendingUp,
  tumbling_execution:  Sparkles,
  deductions_only:     Timer,
  safety_rules:        ShieldCheck,
  building_combined:   ChevronsUp,
  tumbling_combined:   RotateCw,
  deductions_combined: ShieldCheck,
  icu_dance:                Star,
  icu_doubles:              Users2,
  icu_dance_deductions:     ShieldCheck,
  icu_dance_solo:           Star,
  icu_dance_principiantes:  Star,
};

const SHEET_TYPE_ORDER: SheetType[] = [
  'building', 'tumbling', 'overall', 'partner_stunt', 'deducciones', 'rangos',
  'building_difficulty', 'building_execution', 'tumbling_difficulty', 'tumbling_execution',
  'deductions_only', 'safety_rules',
  'building_combined', 'tumbling_combined', 'deductions_combined',
  'icu_dance', 'icu_doubles', 'icu_dance_deductions', 'icu_dance_solo', 'icu_dance_principiantes',
];

const SHEET_TYPE_COLORS: Record<SheetType, string> = {
  building:            'text-blue-500',
  tumbling:            'text-green-500',
  overall:             'text-purple-500',
  partner_stunt:       'text-orange-500',
  deducciones:         'text-red-500',
  rangos:              'text-amber-500',
  building_difficulty: 'text-blue-700',
  building_execution:  'text-blue-400',
  tumbling_difficulty: 'text-green-700',
  tumbling_execution:  'text-green-400',
  deductions_only:     'text-orange-500',
  safety_rules:        'text-amber-500',
  building_combined:   'text-blue-500',
  tumbling_combined:   'text-green-500',
  deductions_combined: 'text-amber-500',
  icu_dance:                'text-blue-500',
  icu_doubles:              'text-purple-500',
  icu_dance_deductions:     'text-amber-500',
  icu_dance_solo:           'text-sky-500',
  icu_dance_principiantes:  'text-teal-500',
};


const STATUS_VARIANT: Record<RegistrationStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending:   'warning',
  confirmed: 'success',
  withdrawn: 'danger',
};

export default function DivisionDetailPage() {
  const confirm = useConfirm();
  const dispatch = useDispatch();
  const router = useRouter();
  const { id, divisionId } = useParams<{ id: string; divisionId: string }>();

  const { isJudge, isCompetitionActive, sheetTypesForCompetition, canViewSheetForDivision, assignments } = useJudge();

  // Refresh judge assignments on mount so new assignments set by admin are visible
  // without requiring the judge to log out and back in.
  useEffect(() => {
    if (!isJudge) return;
    authRepository.me().then((res) => dispatch(setUser(res.data))).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [division, setDivision]       = useState<Division | null>(null);

  useEffect(() => {
    if (!division) return;
    if (isJudge && !isCompetitionActive(division.competition)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${id}`);
    }
  }, [isJudge, division, isCompetitionActive, router, id]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [scoreSheets, setScoreSheets]     = useState<Record<number, ScoreSheet>>({});
  const [icuRankings, setIcuRankings]     = useState<Record<number, RankingEntry>>({});
  const isIcuDanceModeRef                 = useRef(false);
  const [loading, setLoading]             = useState(true);
  const [expandedRow, setExpandedRow]     = useState<number | null>(null);

  const [regModalOpen, setRegModalOpen]   = useState(false);
  const [editingReg, setEditingReg]       = useState<Registration | undefined>();
  const [scoreModalOpen, setScoreModalOpen]   = useState(false);
  const [scoringReg, setScoringReg]           = useState<Registration | undefined>();
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [deductionSheetId, setDeductionSheetId]     = useState<number | null>(null);


  const loadIcuRankings = useCallback(async () => {
    const res = await competitionsRepository.getDivisionRankings(divisionId);
    const map: Record<number, RankingEntry> = {};
    res.data.entries.forEach((e) => { map[e.registration_id] = e; });
    setIcuRankings(map);
  }, [divisionId]);

  const loadSheets = useCallback(async () => {
    const res = await competitionsRepository.listScoreSheets({
      registration__division__public_id: divisionId,
      page_size: '100',
    });
    const map: Record<number, ScoreSheet> = {};
    res.data.results.forEach((s) => { map[s.registration] = s; });
    setScoreSheets(map);
    if (isIcuDanceModeRef.current) await loadIcuRankings();
  }, [divisionId, loadIcuRankings]);

  const load = useCallback(async () => {
    try {
      const divRes = await competitionsRepository.getDivision(divisionId);
      setDivision(divRes.data);
      isIcuDanceModeRef.current = divRes.data.competition_sheet_mode === 'icu_dance';
      const regRes = await competitionsRepository.listRegistrations({
        division: String(divRes.data.id),
        page_size: '100',
      });
      setRegistrations(regRes.data.results);
      await loadSheets();
    } finally {
      setLoading(false);
    }
  }, [divisionId, loadSheets]);

  useEffect(() => { load(); }, [load]);

  // Polling: refresh score sheets every 5s for admin (judge scores update in real time)
  useEffect(() => {
    if (isJudge) return;
    const interval = setInterval(() => { loadSheets(); }, 5000);
    return () => clearInterval(interval);
  }, [isJudge, loadSheets]);

  const handleRegSaved = (saved: Registration) => {
    setRegistrations((prev) =>
      prev.some((r) => r.id === saved.id)
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [...prev, saved]
    );
    load();
  };

  const handleDeleteReg = async (reg: Registration) => {
    if (!await confirm({ title: 'Eliminar inscripción', message: `¿Seguro que deseas eliminar la inscripción de ${reg.team_name}? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar' })) return;
    try {
      await competitionsRepository.deleteRegistration(reg.public_id);
      setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
      toast.success('Inscripción eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleMoveReg = async (reg: Registration, direction: 'up' | 'down') => {
    try {
      await competitionsRepository.moveRegistration(reg.public_id, direction);
      setRegistrations((prev) => {
        const delta = direction === 'up' ? -1 : 1;
        const updated = prev.map((r) => {
          if (r.id === reg.id) return { ...r, performance_order: (r.performance_order ?? 0) + delta };
          if (r.performance_order === (reg.performance_order ?? 0) + delta) return { ...r, performance_order: reg.performance_order };
          return r;
        });
        return [...updated].sort((a, b) => {
          if (a.performance_order == null) return 1;
          if (b.performance_order == null) return -1;
          return a.performance_order - b.performance_order;
        });
      });
    } catch {
      toast.error('No se pudo mover la inscripción');
    }
  };

  const handleScoreSaved = (sheet: ScoreSheet) => {
    setScoreSheets((prev) => ({ ...prev, [sheet.registration]: sheet }));
  };

  const handleDeductionSaved = () => { loadSheets(); };

  const handleSendReport = async (reg: Registration) => {
    try {
      const res = await competitionsRepository.sendScoreReport(reg.public_id);
      toast.success(res.data.detail);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? 'No se pudo enviar el reporte');
    }
  };

  const handleWhatsAppPdf = (reg: Registration, sheet: ScoreSheet) => {
    let coachPhone = (reg.contact_phone ?? '').replace(/\D/g, '');
    if (coachPhone.startsWith('0')) coachPhone = '593' + coachPhone.slice(1);
    else if (coachPhone && !coachPhone.startsWith('593')) coachPhone = '593' + coachPhone;

    const apiBase = process.env.NEXT_PUBLIC_MAIN_API_URL?.replace(/\/$/, '') ?? '';
    const pdfUrl  = `${apiBase}/registrations/${reg.public_id}/public-pdf/`;
    const msg =
      `Hola Coach de *${reg.team_name}* 🏆\n\n` +
      `Resultado de calificación — *${division?.name ?? ''}*\n\n` +
      `📊 Puntaje final: *${parseFloat(sheet.final_score ?? '0').toFixed(2)}* (${parseFloat(sheet.percentage ?? '0').toFixed(1)}%)\n\n` +
      `⚠️ Tienes *15 minutos* para presentar un reclamo.\n\n` +
      `Descarga tu reporte en PDF:\n${pdfUrl}\n\n` +
      `Desglose completo:\n${window.location.origin}/results/${reg.public_id}`;
    const url = `https://wa.me/${coachPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendWhatsApp = async (reg: Registration) => {
    try {
      const res = await competitionsRepository.sendWhatsappReport(reg.public_id);
      toast.success(res.data.detail);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? 'No se pudo enviar el mensaje de WhatsApp');
    }
  };

  const handleDeleteDeduction = async (deductionId: number) => {
    try {
      await competitionsRepository.deleteDeduction(deductionId);
      toast.success('Descuento eliminado');
      loadSheets();
    } catch {
      toast.error('No se pudo eliminar el descuento');
    }
  };

  // Ranking: sorted by final_score desc; ICU divisions use IcuJudgeScore aggregates
  const ranked = registrations
    .filter((r) => scoreSheets[r.id])
    .map((r) => ({ reg: r, sheet: scoreSheets[r.id] }))
    .sort((a, b) => {
      if (isIcuDanceModeRef.current) {
        const fa = parseFloat(icuRankings[a.reg.id]?.final_score ?? '0');
        const fb = parseFloat(icuRankings[b.reg.id]?.final_score ?? '0');
        return fb - fa;
      }
      return parseFloat(b.sheet.final_score ?? '0') - parseFloat(a.sheet.final_score ?? '0');
    });

  if (loading) return <PageSpinner />;
  if (!division) return <div className="p-8 text-zinc-500">División no encontrada.</div>;

  const activeScoringSystem = (division.scoring_system || division.suggested_scoring_system) as ScoringSystem;
  const isIasfWorld = activeScoringSystem === 'iasf_world_l6_7';
  const isIcuDanceMode = division.competition_sheet_mode === 'icu_dance';
  const isGrupalMode = !isIcuDanceMode && (division.competition_sheet_mode ?? 'grupal') !== 'individual';
  const hasJudging = division.competition_service_type !== 'registration_only';
  const hasRegistration = division.competition_service_type !== 'judging_only';
  const compId = division.competition;
  const isSheetAllowedInDivision = (st: SheetType) =>
    !division.allowed_sheet_types || division.allowed_sheet_types.includes(st);
  const canViewSheetInDivision = (st: SheetType) =>
    canViewSheetForDivision(compId, division.id, st) && isSheetAllowedInDivision(st);

  // Compound assignments expand to their component sheet types for icon/button display
  const COMPOUND_EXPANSION: Partial<Record<SheetType, SheetType[]>> = {
    building_combined:   ['building_difficulty', 'building_execution'],
    tumbling_combined:   ['tumbling_difficulty',  'tumbling_execution'],
    deductions_combined: ['deductions_only',       'safety_rules'],
  };
  const ICU_SHEET_TYPES = ['icu_dance', 'icu_doubles', 'icu_dance_deductions', 'icu_dance_solo', 'icu_dance_principiantes'];

  // For icon display: every active assignment for this competition is shown,
  // regardless of the assignment's division scope. Division scope enforcement
  // is a backend concern when the judge actually opens the scoresheet.
  const judgeVisibleSheets = assignments
    .filter((a) => a.competition === compId && a.is_access_active)
    .map((a) => a.sheet_type)
    .filter((sheetType, idx, arr) => arr.indexOf(sheetType) === idx) // dedupe
    .filter((sheetType) => {
      if (!isSheetAllowedInDivision(sheetType)) return false;
      const isIcuSheet = ICU_SHEET_TYPES.includes(sheetType);
      if (isIcuSheet !== isIcuDanceMode) return false;
      if (isIcuDanceMode) {
        if (sheetType === 'icu_dance_deductions') return true;
        return sheetType === activeScoringSystem;
      }
      return true;
    })
    .sort((a, b) => SHEET_TYPE_ORDER.indexOf(a) - SHEET_TYPE_ORDER.indexOf(b));

  const judgeExpandedSheets: SheetType[] = judgeVisibleSheets.flatMap(
    (st) => COMPOUND_EXPANSION[st] ?? [st]
  );

  return (
    <div className="flex flex-col gap-6 p-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(`/competitions/${id}`)}
            className="mt-0.5 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{division.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="default">{AGE_GROUP_LABELS[division.age_group]}</Badge>
              <Badge variant="violet">{SKILL_LEVEL_LABELS[division.skill_level]}</Badge>
              <Badge variant="info">{CATEGORY_LABELS[division.category]}</Badge>
              {division.is_non_tumbling && <Badge variant="warning">Non Tumbling</Badge>}
              {activeScoringSystem && (
                <Badge variant="success">{SCORING_SYSTEM_LABELS[activeScoringSystem]}</Badge>
              )}
              <span className="text-sm text-zinc-500">{division.competition_name}</span>
            </div>
          </div>
        </div>
        {!isJudge && (
          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-xs text-zinc-400">En vivo</span>
          </div>
        )}
      </div>

      {/* Skill reference tables — cheerleader only */}
      {hasJudging && !isIcuDanceMode && (
        <div className="flex flex-col gap-2">
          <SkillReferencePanel skillLevel={division.skill_level} sheetType="building" />
          <SkillReferencePanel skillLevel={division.skill_level} sheetType="tumbling" />
        </div>
      )}

      {/* Registrations */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Inscripciones <span className="font-normal text-zinc-400">({registrations.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/rankings`)}>
              <Trophy className="h-4 w-4" />
              Ver ranking
            </Button>
            {!isJudge && hasRegistration && (
              <Button size="sm" onClick={() => { setEditingReg(undefined); setRegModalOpen(true); }}>
                <Plus className="h-4 w-4" />
                Inscribir equipo
              </Button>
            )}
          </div>
        </div>

        {registrations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-zinc-400 rounded-xl border border-dashed border-zinc-200">
            <Trophy className="h-8 w-8" />
            <p className="text-sm">Sin equipos inscritos aún</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {registrations.map((reg, idx) => {
              const sheet = scoreSheets[reg.id];
              const isExpanded = expandedRow === reg.id;
              return (
                <div key={reg.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-zinc-50"
                    onClick={() => {
                      if (isJudge && hasJudging) {
                        if (judgeExpandedSheets.length === 1) {
                          router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/${getSheetSlug(judgeExpandedSheets[0], isIasfWorld)}`);
                        } else if (judgeExpandedSheets.length > 1) {
                          setExpandedRow(isExpanded ? null : reg.id);
                        }
                      } else if (!isJudge) {
                        setExpandedRow(isExpanded ? null : reg.id);
                      }
                    }}
                  >
                    <span className="w-6 text-center text-sm font-medium text-zinc-400">{reg.performance_order ?? idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-zinc-900 truncate">{reg.team_name}</p>
                        {reg.panel && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                            {reg.panel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">{reg.gym_name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[reg.status]}>
                      {REGISTRATION_STATUS_LABELS[reg.status]}
                    </Badge>
                    {sheet ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                          {isIcuDanceMode
                            ? parseFloat(icuRankings[reg.id]?.final_score ?? '0').toFixed(2)
                            : parseFloat(sheet.final_score ?? '0').toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {isIcuDanceMode
                            ? `${parseFloat(icuRankings[reg.id]?.percentage ?? '0').toFixed(1)}%`
                            : `${parseFloat(sheet.percentage ?? '0').toFixed(1)}%`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Sin puntaje</span>
                    )}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Admin: edit button + all mode-specific sheet shortcuts */}
                      {!isJudge && hasJudging && (
                        <>
                          <Button
                            size="sm"
                            variant={sheet ? 'secondary' : 'primary'}
                            onClick={() => { setScoringReg(reg); setScoreModalOpen(true); }}
                          >
                            {sheet ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {sheet ? 'Editar' : 'Calificar'}
                          </Button>
                          {isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && isSheetAllowedInDivision('building') && (
                            <Button size="icon" variant="ghost" title="Planilla Building"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building`)}>
                              <ChevronsUp className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                          )}
                          {isGrupalMode && isIasfWorld && isSheetAllowedInDivision('building') && (
                            <Button size="icon" variant="ghost" title="IASF World — Elevaciones"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-building`)}>
                              <ChevronsUp className="h-3.5 w-3.5 text-blue-500" />
                            </Button>
                          )}
                          {isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && isSheetAllowedInDivision('tumbling') && (
                            <Button size="icon" variant="ghost" title="Planilla Tumbling"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling`)}>
                              <RotateCw className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          {isGrupalMode && isIasfWorld && isSheetAllowedInDivision('tumbling') && (
                            <Button size="icon" variant="ghost" title="IASF World — Gimnasia"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-tumbling`)}>
                              <RotateCw className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          )}
                          {isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && isSheetAllowedInDivision('overall') && (
                            <Button size="icon" variant="ghost" title="Planilla Overall"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/overall`)}>
                              <Star className="h-3.5 w-3.5 text-purple-500" />
                            </Button>
                          )}
                          {isGrupalMode && isIasfWorld && isSheetAllowedInDivision('overall') && (
                            <Button size="icon" variant="ghost" title="IASF World — General"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-overall`)}>
                              <Star className="h-3.5 w-3.5 text-purple-500" />
                            </Button>
                          )}
                          {isGrupalMode && activeScoringSystem === 'partner_stunt' && isSheetAllowedInDivision('partner_stunt') && (
                            <Button size="icon" variant="ghost" title="Planilla Partner Stunt"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/partner-stunt`)}>
                              <Users2 className="h-3.5 w-3.5 text-orange-500" />
                            </Button>
                          )}
                          {isGrupalMode && isSheetAllowedInDivision('deducciones') && (
                            <Button size="icon" variant="ghost" title="Planilla Deducciones"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/deducciones`)}>
                              <CircleMinus className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                          {!isIcuDanceMode && isSheetAllowedInDivision('rangos') && (
                            <Button size="icon" variant="ghost" title="Planilla Rangos (Dificultad)"
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/rangos`)}>
                              <Gauge className="h-3.5 w-3.5 text-amber-500" />
                            </Button>
                          )}
                          {!isGrupalMode && !isIcuDanceMode && (
                            <>
                              {isSheetAllowedInDivision('building_difficulty') && (
                                <Button size="icon" variant="ghost" title="Dificultad — Elevaciones"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building-difficulty`)}>
                                  <TrendingUp className="h-3.5 w-3.5 text-blue-700" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('building_execution') && (
                                <Button size="icon" variant="ghost" title="Ejecución — Elevaciones"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building-execution`)}>
                                  <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('tumbling_difficulty') && (
                                <Button size="icon" variant="ghost" title="Dificultad — Gimnasia"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling-difficulty`)}>
                                  <TrendingUp className="h-3.5 w-3.5 text-green-700" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('tumbling_execution') && (
                                <Button size="icon" variant="ghost" title="Ejecución — Gimnasia"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling-execution`)}>
                                  <Sparkles className="h-3.5 w-3.5 text-green-400" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('overall') && (
                                <Button size="icon" variant="ghost" title="Overall (General)"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/overall`)}>
                                  <Star className="h-3.5 w-3.5 text-purple-500" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('deductions_only') && (
                                <Button size="icon" variant="ghost" title="Deducciones (Caídas/Tiempo)"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/deductions-only`)}>
                                  <Timer className="h-3.5 w-3.5 text-orange-500" />
                                </Button>
                              )}
                              {isSheetAllowedInDivision('safety_rules') && (
                                <Button size="icon" variant="ghost" title="Reglas y Seguridad"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/safety-rules`)}>
                                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                                </Button>
                              )}
                            </>
                          )}
                          {isIcuDanceMode && (
                            <>
                              {activeScoringSystem === 'icu_dance' && (
                                <Button size="icon" variant="ghost" title="ICU Dance"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/icu-dance`)}>
                                  <Star className="h-3.5 w-3.5 text-blue-500" />
                                </Button>
                              )}
                              {activeScoringSystem === 'icu_doubles' && (
                                <Button size="icon" variant="ghost" title="ICU Doubles HH"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/icu-doubles`)}>
                                  <Users2 className="h-3.5 w-3.5 text-purple-500" />
                                </Button>
                              )}
                              {activeScoringSystem === 'icu_dance_solo' && (
                                <Button size="icon" variant="ghost" title="ICU Dance Solo / Dúo"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/icu-dance-solo`)}>
                                  <Star className="h-3.5 w-3.5 text-sky-500" />
                                </Button>
                              )}
                              {activeScoringSystem === 'icu_dance_principiantes' && (
                                <Button size="icon" variant="ghost" title="ICU Dance Principiantes"
                                  onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/icu-dance-principiantes`)}>
                                  <Star className="h-3.5 w-3.5 text-teal-500" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" title="Deducciones ICU Dance"
                                onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/icu-dance-deductions`)}>
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {/* Judge: one icon per assigned sheet, purely data-driven */}
                      {isJudge && hasJudging && judgeExpandedSheets.map((sheetType) => {
                        const Icon = SHEET_TYPE_ICONS[sheetType];
                        return (
                          <Button
                            key={sheetType}
                            size="icon"
                            variant="ghost"
                            title={SHEET_TYPE_LABELS[sheetType]}
                            onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/${getSheetSlug(sheetType, isIasfWorld)}`)}
                          >
                            <Icon className={`h-3.5 w-3.5 ${SHEET_TYPE_COLORS[sheetType]}`} />
                          </Button>
                        );
                      })}
                      {sheet && !isJudge && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copiar enlace básico para coach"
                          onClick={() => {
                            const url = `${window.location.origin}/results/${reg.public_id}`;
                            navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'));
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                        </Button>
                      )}
                      {!isJudge && (
                        <>
                          <Button size="icon" variant="ghost" title="Mover arriba" disabled={idx === 0} onClick={() => handleMoveReg(reg, 'up')}>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Mover abajo" disabled={idx === registrations.length - 1} onClick={() => handleMoveReg(reg, 'down')}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditingReg(reg); setRegModalOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteReg(reg)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded: score breakdown (admin only, when judging enabled) */}
                  {isExpanded && !isJudge && hasJudging && sheet && (
                    <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4 flex flex-col gap-4">
                      {/* Section totals */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Desglose de puntaje</p>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                          {parseFloat(sheet.building_total) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Elevaciones</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.building_total).toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(sheet.tumbling_total) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Gimnasia</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.tumbling_total).toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(sheet.overall_total) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>General</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.overall_total).toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(sheet.avg_creativity) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Creatividad (avg)</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.avg_creativity).toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(sheet.avg_showmanship) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Showmanship (avg)</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.avg_showmanship).toFixed(2)}</span>
                            </div>
                          )}
                          {parseFloat(sheet.partner_stunt_total) > 0 && (
                            <div className="flex justify-between text-zinc-600">
                              <span>Parejas</span>
                              <span className="tabular-nums font-medium">{parseFloat(sheet.partner_stunt_total).toFixed(2)}</span>
                            </div>
                          )}
                          {(parseFloat(sheet.icu_dance_total) > 0 || (isIcuDanceMode && icuRankings[reg.id]?.has_score)) && (
                            <div className="flex justify-between text-zinc-600">
                              <span>ICU Dance {icuRankings[reg.id]?.judge_count ? `(${icuRankings[reg.id].judge_count} juez${(icuRankings[reg.id].judge_count ?? 0) !== 1 ? 'ces' : ''})` : ''}</span>
                              <span className="tabular-nums font-medium">
                                {isIcuDanceMode
                                  ? parseFloat(icuRankings[reg.id]?.raw_score ?? '0').toFixed(2)
                                  : parseFloat(sheet.icu_dance_total).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-zinc-200 flex justify-between text-sm font-medium text-zinc-800">
                          <span>Puntaje bruto</span>
                          <span className="tabular-nums">
                            {parseFloat(sheet.raw_score ?? '0').toFixed(2)}
                            <span className="ml-1 font-normal text-zinc-400 text-xs">/ {parseFloat(sheet.max_raw ?? '0').toFixed(0)} ({parseFloat(sheet.percentage ?? '0').toFixed(1)}%)</span>
                          </span>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Descuentos</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setDeductionSheetId(sheet.id); setDeductionModalOpen(true); }}
                          >
                            <MinusCircle className="h-3.5 w-3.5" />
                            Agregar
                          </Button>
                        </div>
                        {sheet.deductions.length === 0 ? (
                          <p className="text-xs text-zinc-400">Sin descuentos</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {sheet.deductions.map((d) => (
                              <div key={d.id} className="flex items-center justify-between text-sm">
                                <span className="text-zinc-700 flex items-center gap-1.5 flex-wrap">
                                  {d.routine_time && (
                                    <span className="text-zinc-400 text-xs tabular-nums">{d.routine_time}</span>
                                  )}
                                  {d.deduction_type_display}
                                  {d.count > 1 && <span className="text-zinc-400">×{d.count}</span>}
                                  {d.hit_zero && (
                                    <span className="text-xs font-bold text-red-700 bg-red-50 rounded px-1">HIT ZERO</span>
                                  )}
                                  {d.notes && <span className="text-zinc-400 text-xs">— {d.notes}</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-red-600">−{d.total_amount}</span>
                                  <button
                                    onClick={() => handleDeleteDeduction(d.id)}
                                    className="text-zinc-400 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Final score */}
                      <div className="border-t border-zinc-200 pt-3 flex flex-col gap-1 text-sm">
                        <div className="flex justify-between text-zinc-500">
                          <span>Total descuentos</span>
                          <span className="tabular-nums text-red-600">-{parseFloat(sheet.total_deductions).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-zinc-900 text-base">
                          <span>Puntaje final</span>
                          <span className="tabular-nums">{parseFloat(sheet.final_score ?? '0').toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Contact / report */}
                      <div className="border-t border-zinc-200 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Enviar reporte al coach</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {reg.contact_email ? (
                            <Button size="sm" variant="outline" onClick={() => handleSendReport(reg)}>
                              <Mail className="h-3.5 w-3.5" />
                              {reg.contact_email}
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-400">Sin correo registrado</span>
                          )}
                          {reg.contact_phone && (
                            <Button size="sm" variant="outline" onClick={() => handleWhatsAppPdf(reg, sheet)}>
                              <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                              WhatsApp · {reg.contact_phone}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded: sheet picker (judges with multiple assignments, when judging enabled) */}
                  {isExpanded && isJudge && hasJudging && judgeExpandedSheets.length > 1 && (
                    <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Ir a planilla</p>
                      <div className="flex flex-wrap gap-2">
                        {judgeExpandedSheets.map((sheetType) => {
                          const Icon = SHEET_TYPE_ICONS[sheetType];
                          return (
                            <button
                              key={sheetType}
                              onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/${getSheetSlug(sheetType, isIasfWorld)}`)}
                              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100 transition-colors"
                            >
                              <Icon className={`h-3.5 w-3.5 ${SHEET_TYPE_COLORS[sheetType]}`} />
                              {SHEET_TYPE_LABELS[sheetType]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 1 + Section 2: Results */}
      {ranked.length > 0 && (() => {
        const f = (v: string | null | undefined) => v ? parseFloat(v) : 0;

        const hasBuilding    = ranked.some(({ sheet }) => f(sheet.building_total)      > 0);
        const hasTumbling    = ranked.some(({ sheet }) => f(sheet.tumbling_total)      > 0);
        const hasOverall     = ranked.some(({ sheet }) => f(sheet.overall_total)       > 0);
        const hasCreativity  = ranked.some(({ sheet }) => f(sheet.avg_creativity)      > 0);
        const hasShowmanship = ranked.some(({ sheet }) => f(sheet.avg_showmanship)     > 0);
        const hasPartner     = ranked.some(({ sheet }) => f(sheet.partner_stunt_total) > 0);
        const hasIcuDance    = isIcuDanceMode
          ? Object.values(icuRankings).some((e) => e.has_score)
          : ranked.some(({ sheet }) => f(sheet.icu_dance_total) > 0);

        const hasBuildingDetail = ranked.some(({ sheet }) =>
          f(sheet.stunts_difficulty) > 0 || f(sheet.pyramids_difficulty) > 0 || f(sheet.tosses_difficulty) > 0
        );
        const hasTumblingDetail = ranked.some(({ sheet }) =>
          f(sheet.standing_difficulty) > 0 || f(sheet.running_difficulty) > 0 || f(sheet.jumps_difficulty) > 0
        );
        const hasOverallDetail = ranked.some(({ sheet }) =>
          f(sheet.formations_score) > 0 || f(sheet.dance_difficulty) > 0
        );
        const hasPyrDrivers   = ranked.some(({ sheet }) => f(sheet.pyramids_drivers)  > 0);
        const hasStandDrivers = ranked.some(({ sheet }) => f(sheet.standing_drivers)  > 0);
        const hasRunDrivers   = ranked.some(({ sheet }) => f(sheet.running_drivers)   > 0);

        const thSpan = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-zinc-50 border-b border-zinc-200 align-bottom';
        const sep = 'border-l border-zinc-200';

        return (
          <div className="flex flex-col gap-6">

            {/* SECTION 1: Desglose por planilla — tabla unificada con detalle completo */}
            {(hasBuildingDetail || hasTumblingDetail || hasOverallDetail) && (() => {
              const CAIDAS   = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
              const TIEMPO   = ['tiempo'];
              const ILEGALES = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
              const ADMIN    = ['ad', 'div'];
              const sumDed = (deds: typeof ranked[0]['sheet']['deductions'], types: string[]) =>
                deds.filter(d => types.includes(d.deduction_type)).reduce((s, d) => s + parseFloat(d.total_amount), 0);
              const hasDed    = ranked.some(({ sheet }) => sheet.deductions.some(d => [...CAIDAS, ...TIEMPO].includes(d.deduction_type)));
              const hasSafety = ranked.some(({ sheet }) => sheet.deductions.some(d => [...ILEGALES, ...ADMIN].includes(d.deduction_type)));

              // Colspan calculado dinámicamente por sección
              const pyrCols   = hasPyrDrivers   ? 4 : 3;
              const standCols = hasStandDrivers ? 4 : 3;
              const runCols   = hasRunDrivers   ? 4 : 3;
              const elevCols  = 4 + pyrCols + 3 + 1;   // stunt(4)+pir(3-4)+lanz(3)+subtotal(1)
              const gimCols   = standCols + runCols + 3 + 1; // parado+corr+saltos(3)+subtotal(1)
              const genCols   = 4;                       // danza(2)+form(1)+subtotal(1)

              // th helpers
              const thSec1 = (cs: number, label: string, cls: string) =>
                <th colSpan={cs} className={`px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide border-b border-zinc-100 border-l border-zinc-200 ${cls}`}>{label}</th>;
              const thGrp = (cs: number, label: string, cls: string) =>
                <th colSpan={cs} className={`px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide border-b border-zinc-100 border-l border-zinc-200 ${cls}`}>{label}</th>;
              const thCol = (label: string, extra = '') =>
                <th className={`px-2 py-1 text-right text-xs font-medium text-zinc-400 bg-zinc-50 border-b border-zinc-200 ${extra}`}>{label}</th>;
              const thColSep = (label: string) => thCol(label, 'border-l border-zinc-200');
              const thSubtot = (label: string, cls: string) =>
                <th rowSpan={2} className={`px-3 py-1 text-right text-xs font-semibold border-b border-zinc-200 border-l border-zinc-200 align-bottom ${cls}`}>{label}</th>;

              // td helpers
              const td  = (v: number) => <td className="px-2 py-2.5 text-right tabular-nums text-zinc-600">{v.toFixed(2)}</td>;
              const tdS = (v: number) => <td className="px-2 py-2.5 text-right tabular-nums text-zinc-600 border-l border-zinc-200">{v.toFixed(2)}</td>;
              const tdΣ = (v: number) => <td className="px-2 py-2.5 text-right tabular-nums font-medium text-zinc-800 bg-zinc-50">{v.toFixed(2)}</td>;

              return (
                <div className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Desglose por planilla <span className="font-normal text-zinc-400">({ranked.length} calificados)</span>
                  </h2>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full text-sm whitespace-nowrap">
                      <thead>
                        {/* ── Fila 1: secciones de planilla ── */}
                        <tr>
                          <th rowSpan={3} className={`${thSpan} text-left pl-3 pr-4`}>Equipo</th>
                          {hasBuildingDetail  && thSec1(elevCols,  'Elevaciones', 'bg-blue-50 text-blue-700')}
                          {hasTumblingDetail  && thSec1(gimCols,   'Gimnasia',    'bg-green-50 text-green-700')}
                          {hasOverallDetail   && thSec1(genCols,   'General',     'bg-purple-50 text-purple-700')}
                          {hasCreativity      && <th rowSpan={3} className={`${thSpan} text-right border-l border-zinc-200`}>Cre.<br/><span className="font-normal normal-case">(prom.)</span></th>}
                          {hasShowmanship     && <th rowSpan={3} className={`${thSpan} text-right border-l border-zinc-200`}>Show.<br/><span className="font-normal normal-case">(prom.)</span></th>}
                          {hasDed             && <th rowSpan={3} className={`${thSpan} text-right text-red-600 border-l border-zinc-200`}>Desc.</th>}
                          {hasSafety          && <th rowSpan={3} className={`${thSpan} text-right text-amber-600 border-l border-zinc-200`}>Reglas</th>}
                          <th rowSpan={3} className={`${thSpan} text-right font-bold text-zinc-900 border-l border-zinc-200`}>Total</th>
                        </tr>
                        {/* ── Fila 2: grupos dentro de cada sección ── */}
                        <tr>
                          {hasBuildingDetail && <>
                            {thGrp(4,         'Stunt',            'bg-blue-50 text-blue-600')}
                            {thGrp(pyrCols,   'Pirámides',        'bg-blue-50 text-blue-600')}
                            {thGrp(3,         'Lanzamientos',     'bg-blue-50 text-blue-600')}
                            {thSubtot('Sub.', 'text-blue-600 bg-blue-50')}
                          </>}
                          {hasTumblingDetail && <>
                            {thGrp(standCols, 'Estática',         'bg-green-50 text-green-600')}
                            {thGrp(runCols,   'Con Carrera',      'bg-green-50 text-green-600')}
                            {thGrp(3,         'Saltos',           'bg-green-50 text-green-600')}
                            {thSubtot('Sub.', 'text-green-600 bg-green-50')}
                          </>}
                          {hasOverallDetail && <>
                            {thGrp(2,         'Danza',            'bg-purple-50 text-purple-600')}
                            <th rowSpan={2} className="px-3 py-1 text-right text-xs font-semibold border-b border-zinc-200 border-l border-zinc-200 align-bottom bg-purple-50 text-purple-600">Form.</th>
                            {thSubtot('Sub.', 'text-purple-600 bg-purple-50')}
                          </>}
                        </tr>
                        {/* ── Fila 3: sub-columnas detalle ── */}
                        <tr>
                          {hasBuildingDetail && <>
                            {thColSep('Dif')}{thCol('Ejec')}{thCol('Dr')}{thΣ()}
                            {thColSep('Dif')}{thCol('Ejec')}{hasPyrDrivers && thCol('Dr')}{thΣ()}
                            {thColSep('Dif')}{thCol('Ejec')}{thΣ()}
                          </>}
                          {hasTumblingDetail && <>
                            {thColSep('Dif')}{thCol('Ejec')}{hasStandDrivers && thCol('Dr')}{thΣ()}
                            {thColSep('Dif')}{thCol('Ejec')}{hasRunDrivers   && thCol('Dr')}{thΣ()}
                            {thColSep('Dif')}{thCol('Ejec')}{thΣ()}
                          </>}
                          {hasOverallDetail && <>
                            {thColSep('Dif')}{thCol('Ejec')}
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {ranked.map(({ reg, sheet }, pos) => {
                          const stuntsT = f(sheet.stunts_difficulty)  + f(sheet.stunts_execution)  + f(sheet.stunts_drivers);
                          const pyrT    = f(sheet.pyramids_difficulty) + f(sheet.pyramids_execution) + f(sheet.pyramids_drivers);
                          const tossesT = f(sheet.tosses_difficulty)   + f(sheet.tosses_execution);
                          const standT  = f(sheet.standing_difficulty) + f(sheet.standing_execution) + f(sheet.standing_drivers);
                          const runT    = f(sheet.running_difficulty)  + f(sheet.running_execution)  + f(sheet.running_drivers);
                          const jumpT   = f(sheet.jumps_difficulty)    + f(sheet.jumps_execution);
                          const desc    = sumDed(sheet.deductions, [...CAIDAS, ...TIEMPO]);
                          const reglas  = sumDed(sheet.deductions, [...ILEGALES, ...ADMIN]);
                          return (
                            <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                              <td className="px-3 py-2.5 font-medium text-zinc-900 pr-4">{reg.team_name}</td>
                              {hasBuildingDetail && <>
                                {tdS(f(sheet.stunts_difficulty))}{td(f(sheet.stunts_execution))}{td(f(sheet.stunts_drivers))}{tdΣ(stuntsT)}
                                {tdS(f(sheet.pyramids_difficulty))}{td(f(sheet.pyramids_execution))}{hasPyrDrivers && td(f(sheet.pyramids_drivers))}{tdΣ(pyrT)}
                                {tdS(f(sheet.tosses_difficulty))}{td(f(sheet.tosses_execution))}{tdΣ(tossesT)}
                                <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-blue-700 border-l border-zinc-200">{f(sheet.building_total).toFixed(2)}</td>
                              </>}
                              {hasTumblingDetail && <>
                                {tdS(f(sheet.standing_difficulty))}{td(f(sheet.standing_execution))}{hasStandDrivers && td(f(sheet.standing_drivers))}{tdΣ(standT)}
                                {tdS(f(sheet.running_difficulty))}{td(f(sheet.running_execution))}{hasRunDrivers && td(f(sheet.running_drivers))}{tdΣ(runT)}
                                {tdS(f(sheet.jumps_difficulty))}{td(f(sheet.jumps_execution))}{tdΣ(jumpT)}
                                <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-green-700 border-l border-zinc-200">{f(sheet.tumbling_total).toFixed(2)}</td>
                              </>}
                              {hasOverallDetail && <>
                                {tdS(f(sheet.dance_difficulty))}{td(f(sheet.dance_execution))}
                                <td className="px-2 py-2.5 text-right tabular-nums text-zinc-600 border-l border-zinc-200">{f(sheet.formations_score).toFixed(2)}</td>
                                <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-purple-700 border-l border-zinc-200">{f(sheet.overall_total).toFixed(2)}</td>
                              </>}
                              {hasCreativity   && <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 border-l border-zinc-200">{f(sheet.avg_creativity).toFixed(2)}</td>}
                              {hasShowmanship  && <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600 border-l border-zinc-200">{f(sheet.avg_showmanship).toFixed(2)}</td>}
                              {hasDed          && <td className="px-3 py-2.5 text-right tabular-nums font-medium text-red-600 border-l border-zinc-200">{desc   > 0 ? `-(${desc.toFixed(2)})`   : '—'}</td>}
                              {hasSafety       && <td className="px-3 py-2.5 text-right tabular-nums font-medium text-amber-600 border-l border-zinc-200">{reglas > 0 ? `-(${reglas.toFixed(2)})` : '—'}</td>}
                              <td className="px-3 py-2.5 text-right tabular-nums font-bold text-zinc-900 border-l border-zinc-200">{f(sheet.final_score).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );

              // helper inline para la fila 3 (Σ sin separador izquierdo)
              function thΣ() {
                return <th className="px-2 py-1 text-right text-xs font-semibold text-zinc-500 bg-zinc-50 border-b border-zinc-200">Σ</th>;
              }
            })()}

            {/* SECTION 2: Ranking final */}
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-zinc-900">
                Resultados <span className="font-normal text-zinc-400">({ranked.length} calificados)</span>
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-3">Pos.</th>
                      <th className="px-4 py-3">Equipo</th>
                      <th className="px-4 py-3">Gimnasio</th>
                      {hasBuilding    && <th className="px-4 py-3 text-right">Elevaciones</th>}
                      {hasTumbling    && <th className="px-4 py-3 text-right">Gimnasia</th>}
                      {hasOverall     && <th className="px-4 py-3 text-right">General</th>}
                      {hasPartner     && <th className="px-4 py-3 text-right">Partner</th>}
                      {hasCreativity  && <th className="px-4 py-3 text-right">Creatividad</th>}
                      {hasShowmanship && <th className="px-4 py-3 text-right">Showmanship</th>}
                      {hasIcuDance    && <th className="px-4 py-3 text-right">ICU Dance</th>}
                      <th className="px-4 py-3 text-right">Desc.</th>
                      <th className="px-4 py-3 text-right">P. final</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {ranked.map(({ reg, sheet }, pos) => (
                      <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3.5 font-medium text-zinc-900">
                          {pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : `${pos + 1}°`}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-zinc-900">{reg.team_name}</td>
                        <td className="px-4 py-3.5 text-zinc-500">{reg.gym_name}</td>
                        {hasBuilding    && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.building_total).toFixed(2)}</td>}
                        {hasTumbling    && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.tumbling_total).toFixed(2)}</td>}
                        {hasOverall     && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.overall_total).toFixed(2)}</td>}
                        {hasPartner     && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.partner_stunt_total).toFixed(2)}</td>}
                        {hasCreativity  && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.avg_creativity).toFixed(2)}</td>}
                        {hasShowmanship && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">{f(sheet.avg_showmanship).toFixed(2)}</td>}
                        {hasIcuDance    && <td className="px-4 py-3.5 text-right tabular-nums text-zinc-600">
                          {isIcuDanceMode
                            ? parseFloat(icuRankings[reg.id]?.raw_score ?? '0').toFixed(2)
                            : f(sheet.icu_dance_total).toFixed(2)}
                        </td>}
                        <td className="px-4 py-3.5 text-right tabular-nums text-red-600">
                          -{isIcuDanceMode
                            ? parseFloat(icuRankings[reg.id]?.total_deductions ?? '0').toFixed(2)
                            : f(sheet.total_deductions).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-zinc-900">
                          {isIcuDanceMode
                            ? parseFloat(icuRankings[reg.id]?.final_score ?? '0').toFixed(2)
                            : parseFloat(sheet.final_score ?? '0').toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-zinc-500">
                          {isIcuDanceMode
                            ? `${parseFloat(icuRankings[reg.id]?.percentage ?? '0').toFixed(1)}%`
                            : `${parseFloat(sheet.percentage ?? '0').toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      <RegistrationModal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        onSaved={handleRegSaved}
        divisionId={division.id}
        initial={editingReg}
        registrations={registrations}
      />
      <ScoringSheetModal
        open={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        onSaved={handleScoreSaved}
        registrationId={scoringReg?.id ?? 0}
        teamName={scoringReg?.team_name ?? ''}
        scoringSystem={activeScoringSystem}
        initial={scoringReg ? scoreSheets[scoringReg.id] : undefined}
      />
      <DeductionModal
        open={deductionModalOpen}
        onClose={() => setDeductionModalOpen(false)}
        onSaved={handleDeductionSaved}
        scoreSheetId={deductionSheetId ?? 0}
      />
    </div>
  );
}
