'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, Trophy, MinusCircle, ClipboardList, Activity, Layers, Users, Target, Flag, Link2, BarChart3, Zap, Shield, AlertTriangle } from 'lucide-react';
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
  type Division,
  type Registration,
  type ScoreSheet,
  type RegistrationStatus,
  type ScoringSystem,
} from '@/types/competitions';


const STATUS_VARIANT: Record<RegistrationStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  pending:   'warning',
  confirmed: 'success',
  withdrawn: 'danger',
};

export default function DivisionDetailPage() {
  const confirm = useConfirm();
  const router = useRouter();
  const { id, divisionId } = useParams<{ id: string; divisionId: string }>();
  const competitionId = Number(id);
  const divId = Number(divisionId);

  const { isJudge, isCompetitionActive, canViewSheet } = useJudge();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [division, setDivision]       = useState<Division | null>(null);
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

  const loadSheets = useCallback(async () => {
    const res = await competitionsRepository.listScoreSheets({
      registration__division: String(divId),
      page_size: '100',
    });
    const map: Record<number, ScoreSheet> = {};
    res.data.results.forEach((s) => { map[s.registration] = s; });
    setScoreSheets(map);
  }, [divId]);

  const load = useCallback(async () => {
    try {
      const [divRes, regRes] = await Promise.all([
        competitionsRepository.getDivision(divId),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);
      setDivision(divRes.data);
      setRegistrations(regRes.data.results);
      await loadSheets();
    } finally {
      setLoading(false);
    }
  }, [divId, loadSheets]);

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
  };

  const handleDeleteReg = async (reg: Registration) => {
    if (!await confirm({ title: 'Eliminar inscripción', message: `¿Seguro que deseas eliminar la inscripción de ${reg.team_name}? Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar' })) return;
    try {
      await competitionsRepository.deleteRegistration(reg.id);
      setRegistrations((prev) => prev.filter((r) => r.id !== reg.id));
      toast.success('Inscripción eliminada');
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  const handleScoreSaved = (sheet: ScoreSheet) => {
    setScoreSheets((prev) => ({ ...prev, [sheet.registration]: sheet }));
  };

  const handleDeductionSaved = () => { loadSheets(); };

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

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}`)}
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
            <Button size="sm" variant="outline" onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/rankings`)}>
              <Trophy className="h-4 w-4" />
              Ver ranking
            </Button>
            {!isJudge && (
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
                    onClick={() => setExpandedRow(isExpanded ? null : reg.id)}
                  >
                    <span className="w-6 text-center text-sm font-medium text-zinc-400">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{reg.team_name}</p>
                      <p className="text-xs text-zinc-500">{reg.gym_name}</p>
                    </div>
                    <Badge variant={STATUS_VARIANT[reg.status]}>
                      {REGISTRATION_STATUS_LABELS[reg.status]}
                    </Badge>
                    {reg.performance_order && (
                      <span className="text-xs text-zinc-400">Salida #{reg.performance_order}</span>
                    )}
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
                      {!isJudge && (
                        <Button
                          size="sm"
                          variant={sheet ? 'secondary' : 'primary'}
                          onClick={() => { setScoringReg(reg); setScoreModalOpen(true); }}
                        >
                          {sheet ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          {sheet ? 'Editar' : 'Calificar'}
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'building') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Building"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/building`)}
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'building') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — Elevaciones"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/iasf-building`)}
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'tumbling') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Tumbling"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/tumbling`)}
                        >
                          <Activity className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'tumbling') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — Gimnasia"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/iasf-tumbling`)}
                        >
                          <Activity className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'overall') && isGrupalMode && !isIasfWorld && activeScoringSystem !== 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Overall"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/overall`)}
                        >
                          <Layers className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'overall') && isGrupalMode && isIasfWorld && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="IASF World — General"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/iasf-overall`)}
                        >
                          <Layers className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'partner_stunt') && isGrupalMode && activeScoringSystem === 'partner_stunt' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Partner Stunt"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/partner-stunt`)}
                        >
                          <Users className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'deducciones') && isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Deducciones"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/deducciones`)}
                        >
                          <Flag className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'rangos') && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Planilla Rangos (Dificultad)"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/rangos`)}
                        >
                          <Target className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'building_difficulty') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Dificultad — Elevaciones"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/building-difficulty`)}
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-blue-700" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'building_execution') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ejecución — Elevaciones"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/building-execution`)}
                        >
                          <Zap className="h-3.5 w-3.5 text-blue-400" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'tumbling_difficulty') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Dificultad — Gimnasia"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/tumbling-difficulty`)}
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-green-700" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'tumbling_execution') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Ejecución — Gimnasia"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/tumbling-execution`)}
                        >
                          <Zap className="h-3.5 w-3.5 text-green-400" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'overall') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Overall (General)"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/overall`)}
                        >
                          <Layers className="h-3.5 w-3.5 text-purple-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'deductions_only') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Deducciones (Caídas/Tiempo)"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/deductions-only`)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                      )}
                      {canViewSheet(competitionId, 'safety_rules') && !isGrupalMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reglas y Seguridad"
                          onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}/sheets/${reg.id}/safety-rules`)}
                        >
                          <Shield className="h-3.5 w-3.5 text-amber-500" />
                        </Button>
                      )}
                      {sheet && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Copiar enlace básico para coach"
                          onClick={() => {
                            const url = `${window.location.origin}/results/${reg.id}`;
                            navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'));
                          }}
                        >
                          <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                        </Button>
                      )}
                      {!isJudge && (
                        <>
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

                  {/* Expanded: score breakdown + deductions */}
                  {isExpanded && sheet && (
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rankings */}
      {ranked.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            Resultados <span className="font-normal text-zinc-400">({ranked.length} calificados)</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Pos.</th>
                  <th className="px-5 py-3">Equipo</th>
                  <th className="px-5 py-3">Gimnasio</th>
                  <th className="px-5 py-3 text-right">P. bruto</th>
                  <th className="px-5 py-3 text-right">Desc.</th>
                  <th className="px-5 py-3 text-right">P. final</th>
                  <th className="px-5 py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {ranked.map(({ reg, sheet }, pos) => (
                  <tr key={reg.id} className={pos === 0 ? 'bg-amber-50' : ''}>
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      {pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : `${pos + 1}°`}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{reg.team_name}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{reg.gym_name}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-zinc-600">
                      {parseFloat(sheet.raw_score).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-red-600">
                      -{parseFloat(sheet.total_deductions).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-zinc-900">
                      {parseFloat(sheet.final_score).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-zinc-500">
                      {sheet.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <RegistrationModal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        onSaved={handleRegSaved}
        divisionId={divId}
        initial={editingReg}
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
