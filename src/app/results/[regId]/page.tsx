'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Clock, Printer, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import type { PublicResult, PublicResultDeduction } from '@/repositories/competitionsRepository';
import { getScoringConfig } from '@/lib/scoringConfig';
import type { Division, Organization } from '@/types/competitions';
import { BuildingSheetPrintView } from '@/components/print/BuildingSheetPrintView';
import { TumblingSheetPrintView } from '@/components/print/TumblingSheetPrintView';
import { OverallSheetPrintView } from '@/components/print/OverallSheetPrintView';
import { PartnerStuntSheetPrintView } from '@/components/print/PartnerStuntSheetPrintView';

const BASE = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';

function n(v: string | null | undefined): number {
  if (!v) return 0;
  return parseFloat(v);
}
function fmt(v: string | null | undefined) {
  const num = n(v);
  return num === 0 ? '–' : num.toFixed(2);
}
function fmtAlways(v: string | null | undefined) {
  return n(v).toFixed(2);
}
function hasAny(...vals: (string | null | undefined)[]): boolean {
  return vals.some(v => v && parseFloat(v) !== 0);
}

// ── Protest timer ─────────────────────────────────────────────────────────────

function ProtestTimer({ updatedAt }: { updatedAt: string }) {
  const deadline = new Date(new Date(updatedAt).getTime() + 15 * 60 * 1000);
  const [remaining, setRemaining] = useState<number>(deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updatedAt]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-3 text-zinc-500">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm">La ventana de reclamo ha expirado.</p>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const isUrgent = remaining < 3 * 60 * 1000;

  return (
    <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${isUrgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
      <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
      <div>
        <p className="text-sm font-semibold">
          Ventana de reclamo: {mins}:{secs.toString().padStart(2, '0')} restantes
        </p>
        <p className="text-xs opacity-75">Vence a las {deadline.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
}

// ── Row helpers ───────────────────────────────────────────────────────────────

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <tr className="border-b border-zinc-100 last:border-0">
      <td className="py-2 pr-4 text-sm text-zinc-600 leading-snug">
        {label}
        {sub && <span className="block text-[10px] text-zinc-400">{sub}</span>}
      </td>
      <td className="py-2 text-right text-sm font-semibold tabular-nums text-zinc-900 whitespace-nowrap">{value}</td>
    </tr>
  );
}

function SectionTotal({ label, value, primary }: {
  label: string; value: string; primary: string; primaryText: string;
}) {
  return (
    <tr style={{ backgroundColor: `${primary}15` }}>
      <td className="py-2.5 pr-4 text-sm font-bold" style={{ color: primary }}>{label}</td>
      <td className="py-2.5 text-right text-base font-black tabular-nums" style={{ color: primary }}>{value}</td>
    </tr>
  );
}

function SheetCard({
  title, letter, children, primary, primaryText,
}: {
  title: string; letter: string; children: React.ReactNode; primary: string; primaryText: string;
}) {
  return (
    <div className="sheet-card rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: primary }}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shrink-0"
          style={{ backgroundColor: `${primaryText}20`, color: primaryText }}>
          {letter}
        </div>
        <p className="text-sm font-bold tracking-wide" style={{ color: primaryText }}>{title}</p>
      </div>
      <table className="w-full px-2">
        <tbody className="divide-y divide-zinc-50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

function NoteBlock({ label, text }: { label: string; text: string | null | undefined }) {
  if (!text || text.trim() === '') return null;
  return (
    <tr>
      <td colSpan={2} className="px-2 py-3 bg-zinc-50/80">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
        <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line">{text}</p>
      </td>
    </tr>
  );
}

function CrossRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value || parseFloat(value) === 0) return null;
  return (
    <tr className="border-b border-zinc-100 last:border-0 bg-violet-50/40">
      <td className="py-2 pr-4 text-sm text-violet-700 leading-snug">{label}</td>
      <td className="py-2 text-right text-sm font-semibold tabular-nums text-violet-900">{parseFloat(value).toFixed(2)}</td>
    </tr>
  );
}

// ── Deduction rows ────────────────────────────────────────────────────────────

function DeductionRow({ d }: { d: PublicResultDeduction }) {
  return (
    <tr className="border-b border-red-50 last:border-0">
      <td className="py-2 pr-4">
        <p className="text-sm text-zinc-700">
          {d.type}
          {d.count > 1 && <span className="ml-1.5 text-xs text-zinc-400">×{d.count}</span>}
          {d.hit_zero && <span className="ml-1.5 text-[10px] font-bold text-red-700 bg-red-50 rounded px-1">HIT ZERO</span>}
        </p>
        {d.routine_time && <p className="text-[10px] text-zinc-400 mt-0.5">Tiempo: {d.routine_time}</p>}
        {d.notes && <p className="text-[10px] text-zinc-400 mt-0.5">{d.notes}</p>}
      </td>
      <td className="py-2 text-right text-sm font-bold tabular-nums text-red-600 whitespace-nowrap">
        −{parseFloat(d.total).toFixed(2)}
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PublicResultPage() {
  const { regId } = useParams<{ regId: string }>();
  const [data, setData]       = useState<PublicResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch(`${BASE}registrations/${regId}/public-result/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [regId]);

  const primary     = data?.organization?.primary_color   ?? '#18181b';
  const primaryText = data?.organization?.text_on_primary ?? '#ffffff';
  const orgName     = data?.organization?.name            ?? 'Cheer Metrics';
  const logoUrl     = data?.organization?.logo            ?? '';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-3 text-zinc-500">
        <AlertTriangle className="h-10 w-10 text-zinc-300" />
        <p className="text-sm">No se encontró el resultado o no está disponible.</p>
      </div>
    );
  }

  const hasScore      = data.has_score;
  const totalDed      = n(data.total_deductions);
  const hasDeductions = totalDed > 0;

  // Parse notes JSON
  let parsedNotes: Record<string, string> = {};
  if (data.notes) {
    try {
      parsedNotes = JSON.parse(data.notes);
    } catch {
      parsedNotes = { _plain: data.notes };
    }
  }

  const hasBuilding    = hasAny(data.stunts_difficulty, data.stunts_execution, data.stunts_drivers,
                                data.pyramids_difficulty, data.pyramids_execution, data.tosses_difficulty);
  const hasTumbling    = hasAny(data.standing_difficulty, data.standing_execution,
                                data.running_difficulty, data.running_execution,
                                data.jumps_difficulty, data.jumps_execution);
  const hasOverall     = hasAny(data.formations_score, data.dance_difficulty, data.dance_execution);
  const hasPartner     = hasAny(data.pg_technique, data.pg_difficulty, data.pg_form_appearance,
                                data.pg_transitions, data.pg_expressiveness);
  const hasCreativity  = hasAny(data.creativity_building, data.creativity_tumbling, data.creativity_overall);
  const hasShowmanship = hasAny(data.showmanship_building, data.showmanship_tumbling, data.showmanship_overall);

  // ── Scoring config ────────────────────────────────────────────────────────
  const scoringSystem = data.scoring_system ?? 'elite_l2_7';
  const pseudoDiv = { scoring_system: scoringSystem, suggested_scoring_system: scoringSystem } as Division;
  const sysConfig = getScoringConfig(pseudoDiv);
  const bCfg = sysConfig.building;
  const tCfg = sysConfig.tumbling;

  const noteScores = ((parsedNotes as Record<string, unknown>)._scores ?? {}) as Record<string, unknown>;
  const hasBuildingScores = 'stuntsExecDeds' in noteScores;
  const hasTumblingScores = 'standingExecDeds' in noteScores;

  // ── Building data ─────────────────────────────────────────────────────────
  const bStuntsRango        = n(data.stunts_difficulty);
  const bStuntsSkills       = hasBuildingScores ? ((noteScores.stuntsSkills as number[]) ?? [0,0,0,0,0]) : [0,0,0,0,0];
  const bStuntsPartMax      = hasBuildingScores ? ((noteScores.stuntsPartMax as number) ?? 0) : 0;
  const bStuntsExecDeds     = hasBuildingScores ? ((noteScores.stuntsExecDeds as (number|null)[]) ?? [null,null,null,null]) : [null,null,null,null];
  const bPyramidsExecDeds   = hasBuildingScores ? ((noteScores.pyramidsExecDeds as (number|null)[]) ?? [null,null,null,null]) : [null,null,null,null];
  const bTossesExecDeds     = hasBuildingScores ? ((noteScores.tossesExecDeds as (number|null)[]) ?? [null,null,null]) : [null,null,null];
  const bPyramidsRangeIdx   = hasBuildingScores ? ((noteScores.pyramidsRangeIdx as number | null) ?? null) : null;
  const bPyramidsFine       = hasBuildingScores ? ((noteScores.pyramidsFine as number) ?? 0) : 0;
  const bStuntsSkillsTotal  = bStuntsSkills.reduce((s: number, v: number) => s + v, 0);
  const bStuntsDriversTotal = n(data.stunts_drivers);
  const bStuntsExecTotal    = n(data.stunts_execution);
  const bStuntsSectionTotal = parseFloat((bStuntsRango + bStuntsExecTotal + bStuntsDriversTotal).toFixed(2));
  const bPyramidsDiff       = n(data.pyramids_difficulty);
  const bPyramidsExecTotal  = n(data.pyramids_execution);
  const bPyramidsDrivers    = n(data.pyramids_drivers);
  const bPyramidsSectionTotal = parseFloat((bPyramidsDiff + bPyramidsExecTotal + bPyramidsDrivers).toFixed(2));
  const bTossesDiff         = n(data.tosses_difficulty);
  const bTossesExecTotal    = n(data.tosses_execution);
  const bTossesSectionTotal = bCfg.hasTosses ? parseFloat((bTossesDiff + bTossesExecTotal).toFixed(2)) : 0;
  const bBuildingTotal      = n(data.building_total);
  const bCreativity         = n(data.creativity_building);
  const bShowmanship        = n(data.showmanship_building);
  const bSheetTotal         = parseFloat((bBuildingTotal + bCreativity + bShowmanship).toFixed(2));

  // ── Tumbling data ─────────────────────────────────────────────────────────
  const tStandingRango      = n(data.standing_difficulty);
  const tStandingHabilidad  = n(data.standing_drivers);
  const tStandingExecDeds   = hasTumblingScores ? ((noteScores.standingExecDeds as (number|null)[]) ?? [null,null,null,null]) : [null,null,null,null];
  const tRunningRango       = n(data.running_difficulty);
  const tRunningHabilidad   = n(data.running_drivers);
  const tRunningExecDeds    = hasTumblingScores ? ((noteScores.runningExecDeds as (number|null)[]) ?? [null,null,null,null]) : [null,null,null,null];
  const tJumpsDiff          = n(data.jumps_difficulty);
  const tJumpsExecDeds      = hasTumblingScores ? ((noteScores.jumpsExecDeds as (number|null)[]) ?? [null,null,null]) : [null,null,null];
  const tStandingExecTotal  = n(data.standing_execution);
  const tStandingTotal      = parseFloat((tStandingRango + tStandingHabilidad + tStandingExecTotal).toFixed(2));
  const tRunningExecTotal   = n(data.running_execution);
  const tRunningTotal       = parseFloat((tRunningRango + tRunningHabilidad + tRunningExecTotal).toFixed(2));
  const tJumpsExecTotal     = n(data.jumps_execution);
  const tJumpsTotal         = parseFloat((tJumpsDiff + tJumpsExecTotal).toFixed(2));
  const tTumblingSubtotal   = n(data.tumbling_total);
  const tCreativity         = n(data.creativity_tumbling);
  const tShowmanship        = n(data.showmanship_tumbling);
  const tSheetTotal         = parseFloat((tTumblingSubtotal + tCreativity + tShowmanship).toFixed(2));

  // ── Overall data ──────────────────────────────────────────────────────────
  const isEscolarAB     = scoringSystem === 'escolar_ab';
  const hasDanceLimited = !isEscolarAB && ['tiny_novice','mini_novice','novice_plus','prep','escolar','elite_l1','intl_l1','intl_l2_7','intl_nt'].includes(scoringSystem);
  const DANCE_LEVELS_FULL    = [{label:'Reducido',sublabel:'Bajo el Promedio',value:0.5},{label:'Moderado',sublabel:'Promedio',value:1.0},{label:'Elevado',sublabel:'Sobre el Promedio',value:1.5}];
  const DANCE_LEVELS_ESC     = [{label:'Reducido',sublabel:'Bajo el Promedio',value:0.5},{label:'Elevado',sublabel:'Promedio / Alto',value:1.0}];
  const DANCE_DIFF_LEVELS_AB = [{label:'Reducido',sublabel:'Bajo el Promedio',value:0.5},{label:'Elevado',sublabel:'Promedio / Alto',value:1.0}];
  const DANCE_EXEC_LEVELS_AB = [{label:'Reducido',sublabel:'Bajo el Promedio',value:0.5},{label:'Moderado',sublabel:'Promedio',value:1.0},{label:'Elevado',sublabel:'Sobre el Promedio',value:1.5},{label:'Superior',sublabel:'Nivel Alto',value:2.0}];
  const danceDiffLevels     = isEscolarAB ? DANCE_DIFF_LEVELS_AB : (hasDanceLimited ? DANCE_LEVELS_ESC : DANCE_LEVELS_FULL);
  const danceExecLevels     = isEscolarAB ? DANCE_EXEC_LEVELS_AB : (hasDanceLimited ? DANCE_LEVELS_ESC : DANCE_LEVELS_FULL);
  const overallShowmanshipMax = isEscolarAB ? 5.0 : 2.0;
  const oFormationsScore    = n(data.formations_score);
  const oDanceDifficulty    = n(data.dance_difficulty);
  const oDanceExecution     = n(data.dance_execution);
  const oCreativity         = n(data.creativity_overall);
  const oShowmanship        = n(data.showmanship_overall);
  const oErrorsCount        = Math.round((2.0 - oFormationsScore) * 10);
  const oOverallSubtotal    = parseFloat((oFormationsScore + oDanceDifficulty + oDanceExecution).toFixed(2));
  const oSheetTotal         = parseFloat((oOverallSubtotal + (isEscolarAB ? 0 : oCreativity) + oShowmanship).toFixed(2));

  // ── Partner stunt data ────────────────────────────────────────────────────
  const pgScores: Record<string, number> = {
    pg_technique:      n(data.pg_technique),
    pg_difficulty:     n(data.pg_difficulty),
    pg_form_appearance: n(data.pg_form_appearance),
    pg_transitions:    n(data.pg_transitions),
    pg_expressiveness: n(data.pg_expressiveness),
  };
  const pgTotal = Object.values(pgScores).reduce((s, v) => s + v, 0);
  const pgNotes = parsedNotes._plain ?? (!data.notes?.startsWith('{') ? (data.notes ?? '') : '');

  // Organization cast for print views (they only use primary_color, text_on_primary, name, logo)
  const orgForPrint = data.organization as unknown as Organization | undefined;

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 10mm; }
          .no-print { display: none !important; }
          body { font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .sheet-card { break-inside: avoid; page-break-inside: avoid; }
          .result-gap { gap: 12px !important; }
        }
      `}</style>

      <div className="max-w-2xl mx-auto py-6 px-4 print:p-0 print:max-w-none">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl print:rounded-none overflow-hidden mb-4"
          style={{ backgroundColor: primary, color: primaryText }}>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={orgName} className="h-8 object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <Trophy className="h-6 w-6 opacity-80" />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-75">{orgName}</p>
                <p className="text-xs opacity-60">{data.competition_name}</p>
                <p className="text-xs opacity-50">{data.competition_date}</p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ backgroundColor: `${primaryText}20`, color: primaryText }}
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </button>
          </div>
          <div className="px-5 pb-5">
            <h1 className="text-2xl font-bold leading-tight" style={{ color: primaryText }}>
              {data.team_name}
            </h1>
            <p className="text-sm opacity-70 mt-0.5">{data.gym_name}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: `${primaryText}20`, color: primaryText }}>
                {data.division_name}
              </span>
              {data.performance_order && (
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: `${primaryText}15`, color: primaryText }}>
                  Salida #{data.performance_order}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Protest timer ────────────────────────────────────────────── */}
        {hasScore && data.score_updated_at && (
          <div className="mb-4 no-print">
            <ProtestTimer updatedAt={data.score_updated_at} />
          </div>
        )}

        {!hasScore ? (
          <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-8 text-center text-zinc-400">
            <Trophy className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
            <p className="text-sm">El puntaje aún no está disponible.</p>
          </div>
        ) : (
          <>
            {/* ── Print-only: full planilla views ──────────────────────── */}
            {hasBuilding && (
              <BuildingSheetPrintView
                teamName={data.team_name}
                divisionName={data.division_name}
                organization={orgForPrint}
                bCfg={bCfg}
                stuntsRango={bStuntsRango}
                stuntsSkills={bStuntsSkills}
                stuntsPartMax={bStuntsPartMax}
                stuntsExecDeds={bStuntsExecDeds}
                stuntsNotes={parsedNotes.stunts ?? ''}
                pyramidsRangeIdx={bPyramidsRangeIdx}
                pyramidsFine={bPyramidsFine}
                pyramidsExecDeds={bPyramidsExecDeds}
                pyramidsDrivers={bPyramidsDrivers}
                pyramidsNotes={parsedNotes.pyramids ?? ''}
                tossesDiff={bTossesDiff}
                tossesExecDeds={bTossesExecDeds}
                tossesNotes={parsedNotes.tosses ?? ''}
                creativityBuilding={bCreativity}
                showmanshipBuilding={bShowmanship}
                stuntsSkillsTotal={bStuntsSkillsTotal}
                stuntsDriversTotal={bStuntsDriversTotal}
                stuntsExecTotal={bStuntsExecTotal}
                stuntsSectionTotal={bStuntsSectionTotal}
                pyramidsDiff={bPyramidsDiff}
                pyramidsExecTotal={bPyramidsExecTotal}
                pyramidsSectionTotal={bPyramidsSectionTotal}
                tossesExecTotal={bTossesExecTotal}
                tossesSectionTotal={bTossesSectionTotal}
                buildingTotal={bBuildingTotal}
                sheetTotal={bSheetTotal}
              />
            )}

            {hasTumbling && (
              <TumblingSheetPrintView
                teamName={data.team_name}
                divisionName={data.division_name}
                organization={orgForPrint}
                tCfg={tCfg}
                standingRango={tStandingRango}
                standingHabilidad={tStandingHabilidad}
                standingExecDeds={tStandingExecDeds}
                standingNotes={parsedNotes.standing ?? ''}
                runningRango={tRunningRango}
                runningHabilidad={tRunningHabilidad}
                runningExecDeds={tRunningExecDeds}
                runningNotes={parsedNotes.running ?? ''}
                jumpsDiff={tJumpsDiff}
                jumpsExecDeds={tJumpsExecDeds}
                jumpsNotes={parsedNotes.jumps ?? ''}
                creativityTumbling={tCreativity}
                showmanshipTumbling={tShowmanship}
                standingDiffEff={tStandingRango}
                standingHabEff={tStandingHabilidad}
                standingExecTotal={tStandingExecTotal}
                standingTotal={tStandingTotal}
                runningDiffEff={tRunningRango}
                runningHabEff={tRunningHabilidad}
                runningExecTotal={tRunningExecTotal}
                runningTotal={tRunningTotal}
                jumpsDiffEff={tJumpsDiff}
                jumpsExecTotal={tJumpsExecTotal}
                jumpsTotal={tJumpsTotal}
                tumblingSubtotal={tTumblingSubtotal}
                sheetTotal={tSheetTotal}
              />
            )}

            {hasOverall && (
              <OverallSheetPrintView
                teamName={data.team_name}
                divisionName={data.division_name}
                organization={orgForPrint}
                isEscolarAB={isEscolarAB}
                danceDiffLevels={danceDiffLevels}
                danceExecLevels={danceExecLevels}
                showmanshipMax={overallShowmanshipMax}
                formationsScore={oFormationsScore}
                danceDifficulty={oDanceDifficulty}
                danceExecution={oDanceExecution}
                creativityOverall={oCreativity}
                showmanshipOverall={oShowmanship}
                formationsNotes={parsedNotes.formations ?? ''}
                danceNotes={parsedNotes.dance ?? ''}
                errorsCount={oErrorsCount}
                overallSubtotal={oOverallSubtotal}
                sheetTotal={oSheetTotal}
                rawScore={data.raw_score}
                maxRaw={data.max_raw}
                scaledScore={data.scaled_score}
                totalDeductions={data.total_deductions}
                finalScore={data.final_score}
                percentage={data.percentage}
              />
            )}

            {hasPartner && (
              <PartnerStuntSheetPrintView
                data={{
                  teamName: data.team_name,
                  divisionName: data.division_name,
                  organization: orgForPrint,
                  scores: pgScores,
                  notes: pgNotes,
                  total: pgTotal,
                  rawScore: n(data.raw_score),
                  totalDeductions: totalDed,
                  finalScore: n(data.final_score),
                  percentage: data.percentage ?? undefined,
                }}
              />
            )}

            {/* ── Screen-only summary view ──────────────────────────────── */}
            <div className="result-gap flex flex-col gap-4 print:hidden">

              {/* ── Label ────────────────────────────────────────────────── */}
              <div className="flex items-center gap-2 text-zinc-500">
                <FileText className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-widest">Recopilación de planillas</p>
              </div>

              {/* ── SHEET A — Elevaciones ─────────────────────────────────── */}
              {hasBuilding && (
                <SheetCard title="Planilla A — Elevaciones (Building)" letter="A" primary={primary} primaryText={primaryText}>
                  {n(data.stunts_difficulty) !== 0 && (
                    <Row label="Stunts — Dificultad (Rango)" value={fmt(data.stunts_difficulty)} />
                  )}
                  {n(data.stunts_drivers) !== 0 && (
                    <Row label="Stunts — Dificultad (Drivers)" value={fmt(data.stunts_drivers)} />
                  )}
                  {n(data.stunts_execution) !== 0 && (
                    <Row label="Stunts — Ejecución" value={fmt(data.stunts_execution)} />
                  )}
                  {n(data.pyramids_difficulty) !== 0 && (
                    <Row label="Pirámides — Dificultad" value={fmt(data.pyramids_difficulty)} />
                  )}
                  {n(data.pyramids_drivers) !== 0 && (
                    <Row label="Pirámides — Drivers" value={fmt(data.pyramids_drivers)} />
                  )}
                  {n(data.pyramids_execution) !== 0 && (
                    <Row label="Pirámides — Ejecución" value={fmt(data.pyramids_execution)} />
                  )}
                  {n(data.tosses_difficulty) !== 0 && (
                    <Row label="Lanzamientos — Dificultad" value={fmt(data.tosses_difficulty)} />
                  )}
                  {n(data.tosses_execution) !== 0 && (
                    <Row label="Lanzamientos — Ejecución" value={fmt(data.tosses_execution)} />
                  )}
                  <CrossRow label="Creatividad (Juez Building)" value={data.creativity_building} />
                  <CrossRow label="Showmanship / Animación (Juez Building)" value={data.showmanship_building} />
                  <SectionTotal label="Total Elevaciones" value={fmtAlways(data.building_total)}
                    primary={primary} primaryText={primaryText} />
                  <NoteBlock label="Comentarios — Elevaciones" text={parsedNotes.stunts} />
                  <NoteBlock label="Comentarios — Pirámides" text={parsedNotes.pyramids} />
                  <NoteBlock label="Comentarios — Lanzamientos" text={parsedNotes.tosses} />
                </SheetCard>
              )}

              {/* ── SHEET B — Gimnasia ────────────────────────────────────── */}
              {hasTumbling && (
                <SheetCard title="Planilla B — Gimnasia (Tumbling)" letter="B" primary={primary} primaryText={primaryText}>
                  {n(data.standing_difficulty) !== 0 && (
                    <Row label="Estática — Rango Base" value={fmt(data.standing_difficulty)} />
                  )}
                  {n(data.standing_drivers) !== 0 && (
                    <Row label="Estática — Habilidad" value={fmt(data.standing_drivers)} />
                  )}
                  {n(data.standing_execution) !== 0 && (
                    <Row label="Estática — Ejecución" value={fmt(data.standing_execution)} />
                  )}
                  {n(data.running_difficulty) !== 0 && (
                    <Row label="Con Carrera — Rango Base" value={fmt(data.running_difficulty)} />
                  )}
                  {n(data.running_drivers) !== 0 && (
                    <Row label="Con Carrera — Habilidad" value={fmt(data.running_drivers)} />
                  )}
                  {n(data.running_execution) !== 0 && (
                    <Row label="Con Carrera — Ejecución" value={fmt(data.running_execution)} />
                  )}
                  {n(data.jumps_difficulty) !== 0 && (
                    <Row label="Saltos — Dificultad" value={fmt(data.jumps_difficulty)} />
                  )}
                  {n(data.jumps_execution) !== 0 && (
                    <Row label="Saltos — Ejecución" value={fmt(data.jumps_execution)} />
                  )}
                  <CrossRow label="Creatividad (Juez Tumbling)" value={data.creativity_tumbling} />
                  <CrossRow label="Showmanship / Animación (Juez Tumbling)" value={data.showmanship_tumbling} />
                  <SectionTotal label="Total Gimnasia" value={fmtAlways(data.tumbling_total)}
                    primary={primary} primaryText={primaryText} />
                  <NoteBlock label="Comentarios — Estática" text={parsedNotes.standing} />
                  <NoteBlock label="Comentarios — Con Carrera" text={parsedNotes.running} />
                  <NoteBlock label="Comentarios — Saltos" text={parsedNotes.jumps} />
                </SheetCard>
              )}

              {/* ── SHEET C — General ─────────────────────────────────────── */}
              {hasOverall && (
                <SheetCard title="Planilla C — General (Overall)" letter="C" primary={primary} primaryText={primaryText}>
                  {n(data.formations_score) !== 0 && (
                    <Row label="Formaciones / Espaciado" value={fmt(data.formations_score)} />
                  )}
                  {n(data.dance_difficulty) !== 0 && (
                    <Row label="Baile — Dificultad" value={fmt(data.dance_difficulty)} />
                  )}
                  {n(data.dance_execution) !== 0 && (
                    <Row label="Baile — Ejecución" value={fmt(data.dance_execution)} />
                  )}
                  <CrossRow label="Creatividad (Juez Overall)" value={data.creativity_overall} />
                  <CrossRow label="Showmanship / Animación (Juez Overall)" value={data.showmanship_overall} />
                  <SectionTotal label="Total General" value={fmtAlways(data.overall_total)}
                    primary={primary} primaryText={primaryText} />
                  <NoteBlock label="Comentarios — Formaciones" text={parsedNotes.formations} />
                  <NoteBlock label="Comentarios — Baile" text={parsedNotes.dance} />
                </SheetCard>
              )}

              {/* ── Partner Stunt ─────────────────────────────────────────── */}
              {hasPartner && (
                <SheetCard title="Planilla — Partner Stunt" letter="P" primary={primary} primaryText={primaryText}>
                  {n(data.pg_technique) !== 0 && <Row label="Técnica" value={fmt(data.pg_technique)} />}
                  {n(data.pg_difficulty) !== 0 && <Row label="Dificultad" value={fmt(data.pg_difficulty)} />}
                  {n(data.pg_form_appearance) !== 0 && <Row label="Forma / Apariencia" value={fmt(data.pg_form_appearance)} />}
                  {n(data.pg_transitions) !== 0 && <Row label="Transiciones" value={fmt(data.pg_transitions)} />}
                  {n(data.pg_expressiveness) !== 0 && <Row label="Expresividad" value={fmt(data.pg_expressiveness)} />}
                  <SectionTotal label="Total Partner Stunt" value={fmtAlways(data.partner_stunt_total)}
                    primary={primary} primaryText={primaryText} />
                  <NoteBlock label="Comentarios del juez" text={pgNotes} />
                </SheetCard>
              )}

              {/* ── Puntaje cruzado promediado ────────────────────────────── */}
              {(hasCreativity || hasShowmanship) && (
                <div className="sheet-card rounded-2xl border border-violet-200 bg-violet-50 overflow-hidden">
                  <div className="px-5 py-2.5 border-b border-violet-200">
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-500">
                      Puntaje cruzado — promedio de los tres jueces
                    </p>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {hasCreativity && (
                        <tr className="border-b border-violet-100">
                          <td className="px-5 py-2.5 text-sm text-violet-800">
                            Creatividad
                            <span className="block text-[10px] text-violet-400">
                              {[data.creativity_building, data.creativity_tumbling, data.creativity_overall]
                                .filter(v => v && parseFloat(v) !== 0)
                                .map(v => parseFloat(v!).toFixed(2))
                                .join(' + ')}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right text-sm font-bold tabular-nums text-violet-900">
                            {fmtAlways(data.avg_creativity)}
                          </td>
                        </tr>
                      )}
                      {hasShowmanship && (
                        <tr>
                          <td className="px-5 py-2.5 text-sm text-violet-800">
                            Showmanship / Animación
                            <span className="block text-[10px] text-violet-400">
                              {[data.showmanship_building, data.showmanship_tumbling, data.showmanship_overall]
                                .filter(v => v && parseFloat(v) !== 0)
                                .map(v => parseFloat(v!).toFixed(2))
                                .join(' + ')}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right text-sm font-bold tabular-nums text-violet-900">
                            {fmtAlways(data.avg_showmanship)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Resumen de puntaje bruto ──────────────────────────────── */}
              <div className="sheet-card rounded-2xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Resumen</p>
                </div>
                <table className="w-full">
                  <tbody>
                    {hasBuilding && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">Elevaciones (Building)</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.building_total)}
                        </td>
                      </tr>
                    )}
                    {hasTumbling && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">Gimnasia (Tumbling)</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.tumbling_total)}
                        </td>
                      </tr>
                    )}
                    {hasOverall && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">General (Overall)</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.overall_total)}
                        </td>
                      </tr>
                    )}
                    {hasPartner && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">Partner Stunt</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.partner_stunt_total)}
                        </td>
                      </tr>
                    )}
                    {hasCreativity && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">Creatividad (promedio)</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.avg_creativity)}
                        </td>
                      </tr>
                    )}
                    {hasShowmanship && (
                      <tr className="border-b border-zinc-100">
                        <td className="px-5 py-2.5 text-sm text-zinc-600">Showmanship / Animación (promedio)</td>
                        <td className="px-5 py-2.5 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {fmtAlways(data.avg_showmanship)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-zinc-200 bg-zinc-50">
                      <td className="px-5 py-2.5 text-sm font-bold text-zinc-800">Puntaje bruto</td>
                      <td className="px-5 py-2.5 text-right text-sm font-bold tabular-nums text-zinc-900">
                        {fmtAlways(data.raw_score)}
                        {data.max_raw && (
                          <span className="ml-1 text-xs font-normal text-zinc-400">
                            / {parseFloat(data.max_raw).toFixed(0)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Descuentos ────────────────────────────────────────────── */}
              {hasDeductions && (
                <div className="sheet-card rounded-2xl border border-red-200 bg-white overflow-hidden">
                  <div className="px-5 py-2.5 border-b border-red-100 bg-red-50">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400">Descuentos</p>
                  </div>
                  <table className="w-full px-2">
                    <tbody>
                      {data.deductions?.map((d, i) => <DeductionRow key={i} d={d} />)}
                      <tr className="bg-red-50">
                        <td className="px-5 py-2.5 text-sm font-bold text-red-700">Total descuentos</td>
                        <td className="px-5 py-2.5 text-right text-base font-black tabular-nums text-red-700">
                          −{totalDed.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Puntaje final ─────────────────────────────────────────── */}
              <div className="sheet-card rounded-2xl overflow-hidden" style={{ backgroundColor: primary }}>
                <div className="px-5 py-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60"
                      style={{ color: primaryText }}>Puntaje Final</p>
                    <p className="text-xs opacity-40 mt-0.5" style={{ color: primaryText }}>
                      {parseFloat(data.percentage ?? '0').toFixed(2)}% de rendimiento
                    </p>
                  </div>
                  <span className="text-5xl font-black tabular-nums" style={{ color: primaryText }}>
                    {fmtAlways(data.final_score)}
                  </span>
                </div>
              </div>

            </div>
          </>
        )}

        <p className="text-center text-xs text-zinc-400 mt-6 no-print">
          Cheer Metrics · Ecuador · Resultado generado automáticamente
        </p>
      </div>
    </div>
  );
}
