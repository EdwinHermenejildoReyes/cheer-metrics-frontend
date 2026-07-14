'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Trophy, MinusCircle, Link2, ChevronsUp, RotateCw, Star, CircleMinus, Gauge, Users2, TrendingUp, BadgeCheck, Sparkles, Timer, ShieldCheck, ChevronUp, ChevronDown, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageSpinner } from '@/components/ui/spinner';
import { RegistrationModal } from '@/components/competitions/RegistrationModal';
import { ScoringSheetModal } from '@/components/competitions/ScoringSheetModal';
import { DeductionModal } from '@/components/competitions/DeductionModal';
import competitionsRepository from '@/repositories/competitionsRepository';
import { useJudge } from '@/hooks/useJudge';
import { useConfirm } from '@/hooks/useConfirm';
import {
  AGE_GROUP_LABELS,
  SKILL_LEVEL_LABELS,
  CATEGORY_LABELS,
  SCORING_SYSTEM_LABELS,
  REGISTRATION_STATUS_LABELS,
  SHEET_TYPE_LABELS,
  type Division,
  type Registration,
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
};

const SHEET_TYPE_ORDER: SheetType[] = [
  'building', 'tumbling', 'overall', 'partner_stunt', 'deducciones', 'rangos',
  'building_difficulty', 'building_execution', 'tumbling_difficulty', 'tumbling_execution',
  'deductions_only', 'safety_rules',
  'building_combined', 'tumbling_combined', 'deductions_combined',
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
};


const STATUS_VARIANT: Record<RegistrationStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending:   'warning',
  confirmed: 'success',
  withdrawn: 'danger',
};

export default function DivisionDetailPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { id, divisionId } = useParams<{ id: string; divisionId: string }>();

  const { isJudge, isCompetitionActive, canViewSheet, sheetTypesForCompetition } = useJudge();

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
  const [loading, setLoading]             = useState(true);
  const [expandedRow, setExpandedRow]     = useState<number | null>(null);

  const [regModalOpen, setRegModalOpen]   = useState(false);
  const [editingReg, setEditingReg]       = useState<Registration | undefined>();
  const [scoreModalOpen, setScoreModalOpen]   = useState(false);
  const [scoringReg, setScoringReg]           = useState<Registration | undefined>();
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [deductionSheetId, setDeductionSheetId]     = useState<number | null>(null);

  const [waPreview, setWaPreview] = useState<{ reg: Registration; sheet: ScoreSheet; url: string; msg: string } | null>(null);

  const loadSheets = useCallback(async () => {
    const res = await competitionsRepository.listScoreSheets({
      registration__division__public_id: divisionId,
      page_size: '100',
    });
    const map: Record<number, ScoreSheet> = {};
    res.data.results.forEach((s) => { map[s.registration] = s; });
    setScoreSheets(map);
  }, [divisionId]);

  const load = useCallback(async () => {
    try {
      const divRes = await competitionsRepository.getDivision(divisionId);
      setDivision(divRes.data);
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
      `📊 Puntaje final: *${parseFloat(sheet.final_score).toFixed(2)}* (${sheet.percentage}%)\n\n` +
      `⚠️ Tienes *15 minutos* para presentar un reclamo.\n\n` +
      `Descarga tu reporte en PDF:\n${pdfUrl}\n\n` +
      `Desglose completo:\n${window.location.origin}/results/${reg.public_id}`;
    const url = `https://wa.me/${coachPhone}?text=${encodeURIComponent(msg)}`;
    setWaPreview({ reg, sheet, url, msg });
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

  // Ranking: sorted by final_score desc
  const ranked = registrations
    .filter((r) => scoreSheets[r.id])
    .map((r) => ({ reg: r, sheet: scoreSheets[r.id] }))
    .sort((a, b) => parseFloat(b.sheet.final_score) - parseFloat(a.sheet.final_score));

  if (loading) return <PageSpinner />;
  if (!division) return <div className="p-8 text-zinc-500">División no encontrada.</div>;

  const activeScoringSystem = (division.scoring_system || division.suggested_scoring_system) as ScoringSystem;
  const isIasfWorld = activeScoringSystem === 'iasf_world_l6_7';
  const isGrupalMode = (division.competition_sheet_mode ?? 'grupal') !== 'individual';
  const hasJudging = division.competition_service_type !== 'registration_only';
  const hasRegistration = division.competition_service_type !== 'judging_only';
  const judgeSheetTypes = sheetTypesForCompetition(division.competition);
  const judgeVisibleSheets = judgeSheetTypes.filter((sheetType) => {
    if (sheetType === 'rangos') return true;
    if (isGrupalMode) {
      if (sheetType === 'partner_stunt') return activeScoringSystem === 'partner_stunt';
      if (['building', 'tumbling', 'overall'].includes(sheetType)) return activeScoringSystem !== 'partner_stunt';
      if (['building_difficulty', 'building_execution', 'tumbling_difficulty', 'tumbling_execution', 'deductions_only', 'safety_rules'].includes(sheetType)) return false;
      return true; // deducciones
    } else {
      if (['building', 'tumbling', 'partner_stunt', 'deducciones'].includes(sheetType)) return false;
      return true; // building_difficulty/execution, tumbling_difficulty/execution, overall, deductions_only, safety_rules
    }
  }).sort((a, b) => SHEET_TYPE_ORDER.indexOf(a) - SHEET_TYPE_ORDER.indexOf(b));

  return (
    <div className="flex flex-col gap-6 p-8">

      {/* WhatsApp preview modal */}
      {waPreview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={() => setWaPreview(null)}>
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-2 bg-[#25D366] px-5 py-4">
              <MessageCircle className="h-5 w-5 text-white" />
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">WhatsApp — {waPreview.reg.team_name}</p>
                <p className="text-white/80 text-xs">{waPreview.reg.contact_phone}</p>
              </div>
              <button onClick={() => setWaPreview(null)} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>

            {/* Message preview */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2">Mensaje que se enviará</p>
              <div className="rounded-xl bg-[#dcf8c6] px-4 py-3 text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed font-mono text-xs max-h-64 overflow-y-auto">
                {waPreview.msg}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="outline" className="flex-1" onClick={() => setWaPreview(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white"
                onClick={() => { window.location.href = waPreview.url; }}
              >
                <MessageCircle className="h-4 w-4" />
                Abrir en WhatsApp
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

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
                        if (judgeVisibleSheets.length === 1) {
                          router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/${getSheetSlug(judgeVisibleSheets[0], isIasfWorld)}`);
                        } else if (judgeVisibleSheets.length > 1) {
                          setExpandedRow(isExpanded ? null : reg.id);
                        }
                      } else if (!isJudge) {
                        setExpandedRow(isExpanded ? null : reg.id);
                      }
                    }}
                  >
                    <span className="w-6 text-center text-sm font-medium text-zinc-400">{reg.performance_order ?? idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{reg.team_name}</p>
                      <p className="text-xs text-zinc-500">{reg.gym_name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[reg.status]}>
                      {REGISTRATION_STATUS_LABELS[reg.status]}
                    </Badge>
                    {sheet ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                          {parseFloat(sheet.final_score).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-zinc-400">{sheet.percentage}%</p>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Sin puntaje</span>
                    )}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!isJudge && hasJudging && (
                        <Button
                          size="sm"
                          variant={sheet ? 'secondary' : 'primary'}
                          onClick={() => { setScoringReg(reg); setScoreModalOpen(true); }}
                        >
                          {sheet ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {sheet ? 'Editar' : 'Calificar'}
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'building') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Building"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building`)}
                        >
                          <ChevronsUp className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'building') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — Elevaciones"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-building`)}
                        >
                          <ChevronsUp className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'tumbling') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Tumbling"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling`)}
                        >
                          <RotateCw className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'tumbling') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — Gimnasia"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-tumbling`)}
                        >
                          <RotateCw className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'overall') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Overall"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/overall`)}
                        >
                          <Star className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'overall') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — General"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/iasf-overall`)}
                        >
                          <Star className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'partner_stunt') && isGrupalMode && activeScoringSystem === 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Partner Stunt"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/partner-stunt`)}
                        >
                          <Users2 className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'deducciones') && isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Deducciones"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/deducciones`)}
                        >
                          <CircleMinus className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'rangos') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Rangos (Dificultad)"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/rangos`)}
                        >
                          <Gauge className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'building_difficulty') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Dificultad — Elevaciones"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building-difficulty`)}
                        >
                          <TrendingUp className="h-3.5 w-3.5 text-blue-700" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'building_execution') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ejecución — Elevaciones"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/building-execution`)}
                        >
                          <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'tumbling_difficulty') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Dificultad — Gimnasia"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling-difficulty`)}
                        >
                          <TrendingUp className="h-3.5 w-3.5 text-green-700" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'tumbling_execution') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ejecución — Gimnasia"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/tumbling-execution`)}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-green-400" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'overall') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Overall (General)"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/overall`)}
                        >
                          <Star className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'deductions_only') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Deducciones (Caídas/Tiempo)"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/deductions-only`)}
                        >
                          <Timer className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                      )}
                      {hasJudging && canViewSheet(division.competition,'safety_rules') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reglas y Seguridad"
                          onClick={() => router.push(`/competitions/${id}/divisions/${divisionId}/sheets/${reg.public_id}/safety-rules`)}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      {sheet && (
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
                        </div>
                        <div className="mt-2 pt-2 border-t border-zinc-200 flex justify-between text-sm font-medium text-zinc-800">
                          <span>Puntaje bruto</span>
                          <span className="tabular-nums">
                            {parseFloat(sheet.raw_score).toFixed(2)}
                            <span className="ml-1 font-normal text-zinc-400 text-xs">/ {parseFloat(sheet.max_raw).toFixed(0)} ({sheet.percentage}%)</span>
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
                          <span className="tabular-nums">{parseFloat(sheet.final_score).toFixed(2)}</span>
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
                  {isExpanded && isJudge && hasJudging && judgeVisibleSheets.length > 1 && (
                    <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">Ir a planilla</p>
                      <div className="flex flex-wrap gap-2">
                        {judgeVisibleSheets.map((sheetType) => {
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

        const thBase = 'px-3 py-1 text-right text-xs font-medium text-zinc-400 bg-zinc-50 border-b border-zinc-200';
        const thGroup = 'px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wide bg-zinc-50 border-b border-zinc-100';
        const thSpan = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide bg-zinc-50 border-b border-zinc-200 align-bottom';
        const tdBase = 'px-3 py-2.5 text-right tabular-nums text-zinc-600';
        const tdTotal = 'px-3 py-2.5 text-right tabular-nums font-medium text-zinc-800 bg-zinc-50';
        const sep = 'border-l border-zinc-200';

        return (
          <div className="flex flex-col gap-6">

            {/* SECTION 1: Desglose por planilla */}
            {(hasBuildingDetail || hasTumblingDetail || hasOverallDetail) && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-zinc-900">
                  Desglose por planilla <span className="font-normal text-zinc-400">({ranked.length} calificados)</span>
                </h2>

                {/* Building breakdown */}
                {hasBuildingDetail && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 flex items-center gap-1.5">
                      <ChevronsUp className="h-3 w-3" /> Planilla — Elevaciones
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr>
                            <th rowSpan={2} className={`${thSpan} text-left pr-4 pl-3`}>Equipo</th>
                            <th colSpan={4} className={`${thGroup} ${sep}`}>Stunt / Elevaciones</th>
                            <th colSpan={hasPyrDrivers ? 4 : 3} className={`${thGroup} ${sep}`}>Pirámides</th>
                            <th colSpan={3} className={`${thGroup} ${sep}`}>Lanzamientos</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Cre.</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Show.</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-blue-700 ${sep}`}>Subtotal</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-zinc-800 ${sep}`}>Total</th>
                          </tr>
                          <tr>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            <th className={thBase}>Dr</th>
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            {hasPyrDrivers && <th className={thBase}>Dr</th>}
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {ranked.map(({ reg, sheet }, pos) => {
                            const stuntsT = f(sheet.stunts_difficulty) + f(sheet.stunts_execution) + f(sheet.stunts_drivers);
                            const pyrT    = f(sheet.pyramids_difficulty) + f(sheet.pyramids_execution) + f(sheet.pyramids_drivers);
                            const tossesT = f(sheet.tosses_difficulty) + f(sheet.tosses_execution);
                            const sub     = f(sheet.building_total);
                            const cre     = f(sheet.creativity_building);
                            const show    = f(sheet.showmanship_building);
                            return (
                              <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                                <td className="px-3 py-2.5 font-medium text-zinc-900 pr-4">{reg.team_name}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.stunts_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.stunts_execution).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.stunts_drivers).toFixed(2)}</td>
                                <td className={tdTotal}>{stuntsT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.pyramids_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.pyramids_execution).toFixed(2)}</td>
                                {hasPyrDrivers && <td className={tdBase}>{f(sheet.pyramids_drivers).toFixed(2)}</td>}
                                <td className={tdTotal}>{pyrT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.tosses_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.tosses_execution).toFixed(2)}</td>
                                <td className={tdTotal}>{tossesT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{cre.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{show.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-semibold text-blue-700 ${sep}`}>{sub.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-zinc-900 ${sep}`}>{(sub + cre + show).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tumbling breakdown */}
                {hasTumblingDetail && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-green-500 flex items-center gap-1.5">
                      <RotateCw className="h-3 w-3" /> Planilla — Gimnasia
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr>
                            <th rowSpan={2} className={`${thSpan} text-left pr-4 pl-3`}>Equipo</th>
                            <th colSpan={hasStandDrivers ? 4 : 3} className={`${thGroup} ${sep}`}>Parado</th>
                            <th colSpan={hasRunDrivers ? 4 : 3} className={`${thGroup} ${sep}`}>Corriendo</th>
                            <th colSpan={3} className={`${thGroup} ${sep}`}>Saltos</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Cre.</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Show.</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-green-700 ${sep}`}>Subtotal</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-zinc-800 ${sep}`}>Total</th>
                          </tr>
                          <tr>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            {hasStandDrivers && <th className={thBase}>Dr</th>}
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            {hasRunDrivers && <th className={thBase}>Dr</th>}
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                            <th className={`${thBase} font-semibold text-zinc-500`}>Σ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {ranked.map(({ reg, sheet }, pos) => {
                            const standT = f(sheet.standing_difficulty) + f(sheet.standing_execution) + f(sheet.standing_drivers);
                            const runT   = f(sheet.running_difficulty) + f(sheet.running_execution) + f(sheet.running_drivers);
                            const jumpT  = f(sheet.jumps_difficulty) + f(sheet.jumps_execution);
                            const sub    = f(sheet.tumbling_total);
                            const cre    = f(sheet.creativity_tumbling);
                            const show   = f(sheet.showmanship_tumbling);
                            return (
                              <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                                <td className="px-3 py-2.5 font-medium text-zinc-900 pr-4">{reg.team_name}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.standing_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.standing_execution).toFixed(2)}</td>
                                {hasStandDrivers && <td className={tdBase}>{f(sheet.standing_drivers).toFixed(2)}</td>}
                                <td className={tdTotal}>{standT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.running_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.running_execution).toFixed(2)}</td>
                                {hasRunDrivers && <td className={tdBase}>{f(sheet.running_drivers).toFixed(2)}</td>}
                                <td className={tdTotal}>{runT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.jumps_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.jumps_execution).toFixed(2)}</td>
                                <td className={tdTotal}>{jumpT.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{cre.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{show.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-semibold text-green-700 ${sep}`}>{sub.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-zinc-900 ${sep}`}>{(sub + cre + show).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Overall breakdown */}
                {hasOverallDetail && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-500 flex items-center gap-1.5">
                      <Star className="h-3 w-3" /> Planilla — General
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead>
                          <tr>
                            <th rowSpan={2} className={`${thSpan} text-left pr-4 pl-3`}>Equipo</th>
                            <th colSpan={2} className={`${thGroup} ${sep}`}>Danza</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Formaciones</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Cre.</th>
                            <th rowSpan={2} className={`${thSpan} text-right ${sep}`}>Show.</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-purple-700 ${sep}`}>Subtotal</th>
                            <th rowSpan={2} className={`${thSpan} text-right font-bold text-zinc-800 ${sep}`}>Total</th>
                          </tr>
                          <tr>
                            <th className={`${thBase} ${sep}`}>Dif</th>
                            <th className={thBase}>Ejec</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {ranked.map(({ reg, sheet }, pos) => {
                            const sub  = f(sheet.overall_total);
                            const cre  = f(sheet.creativity_overall);
                            const show = f(sheet.showmanship_overall);
                            return (
                              <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                                <td className="px-3 py-2.5 font-medium text-zinc-900 pr-4">{reg.team_name}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.dance_difficulty).toFixed(2)}</td>
                                <td className={tdBase}>{f(sheet.dance_execution).toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{f(sheet.formations_score).toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{cre.toFixed(2)}</td>
                                <td className={`${tdBase} ${sep}`}>{show.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-semibold text-purple-700 ${sep}`}>{sub.toFixed(2)}</td>
                                <td className={`px-3 py-2.5 text-right tabular-nums font-bold text-zinc-900 ${sep}`}>{(sub + cre + show).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Deductions breakdown */}
                {(() => {
                  const CAIDAS = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
                  const TIEMPO = ['tiempo', 'tiempo_grave'];
                  const hasDedDetail = ranked.some(({ sheet }) =>
                    sheet.deductions.some(d => [...CAIDAS, ...TIEMPO].includes(d.deduction_type))
                  );
                  if (!hasDedDetail) return null;
                  const sumT = (deds: typeof ranked[0]['sheet']['deductions'], types: string[]) =>
                    deds.filter(d => types.includes(d.deduction_type)).reduce((s, d) => s + parseFloat(d.total_amount), 0);
                  return (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500 flex items-center gap-1.5">
                        <CircleMinus className="h-3 w-3" /> Planilla — Descuentos (Caídas / Tiempo)
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full text-sm whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              <th className="px-3 py-2 text-left">Equipo</th>
                              <th className="px-3 py-2 text-right">Caídas</th>
                              <th className="px-3 py-2 text-right">Tiempo</th>
                              <th className="px-3 py-2 text-right font-bold text-red-600">Total Desc.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {ranked.map(({ reg, sheet }, pos) => {
                              const caidas = sumT(sheet.deductions, CAIDAS);
                              const tiempo = sumT(sheet.deductions, TIEMPO);
                              return (
                                <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                                  <td className="px-3 py-2.5 font-medium text-zinc-900">{reg.team_name}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{caidas > 0 ? `-${caidas.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{tiempo > 0 ? `-${tiempo.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-700">{(caidas + tiempo) > 0 ? `-(${(caidas + tiempo).toFixed(2)})` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* Safety rules breakdown */}
                {(() => {
                  const ILEGALES = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
                  const ADMIN    = ['ad', 'div'];
                  const hasSafetyDetail = ranked.some(({ sheet }) =>
                    sheet.deductions.some(d => [...ILEGALES, ...ADMIN].includes(d.deduction_type))
                  );
                  if (!hasSafetyDetail) return null;
                  const sumT = (deds: typeof ranked[0]['sheet']['deductions'], types: string[]) =>
                    deds.filter(d => types.includes(d.deduction_type)).reduce((s, d) => s + parseFloat(d.total_amount), 0);
                  return (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3" /> Planilla — Reglas y Seguridad
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                        <table className="w-full text-sm whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              <th className="px-3 py-2 text-left">Equipo</th>
                              <th className="px-3 py-2 text-right">Ilegales</th>
                              <th className="px-3 py-2 text-right">Admin</th>
                              <th className="px-3 py-2 text-right font-bold text-red-600">Total Desc.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {ranked.map(({ reg, sheet }, pos) => {
                              const ileg  = sumT(sheet.deductions, ILEGALES);
                              const admin = sumT(sheet.deductions, ADMIN);
                              return (
                                <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                                  <td className="px-3 py-2.5 font-medium text-zinc-900">{reg.team_name}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{ileg > 0 ? `-${ileg.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">{admin > 0 ? `-${admin.toFixed(2)}` : '—'}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-700">{(ileg + admin) > 0 ? `-(${(ileg + admin).toFixed(2)})` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

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
                        <td className="px-4 py-3.5 text-right tabular-nums text-red-600">
                          -{f(sheet.total_deductions).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-zinc-900">
                          {parseFloat(sheet.final_score).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-zinc-500">
                          {sheet.percentage}%
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
