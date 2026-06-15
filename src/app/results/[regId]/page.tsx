'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, FileDown, AlertTriangle } from 'lucide-react';
import type { PublicResult } from '@/repositories/competitionsRepository';
import { getScoringConfig } from '@/lib/scoringConfig';
import type { Division, Deduction, DeductionType } from '@/types/competitions';
import { BuildingSheetReadOnly } from '@/components/sheets/BuildingSheetReadOnly';
import { TumblingSheetReadOnly } from '@/components/sheets/TumblingSheetReadOnly';
import { OverallSheetReadOnly } from '@/components/sheets/OverallSheetReadOnly';
import { PartnerStuntSheetReadOnly } from '@/components/sheets/PartnerStuntSheetReadOnly';
import { DeduccionesSheetReadOnly } from '@/components/sheets/DeduccionesSheetReadOnly';

const BASE = process.env.NEXT_PUBLIC_MAIN_API_URL ?? '/api/v1/';

function n(v: string | null | undefined): number {
  if (!v) return 0;
  return parseFloat(v);
}

function hasAny(...vals: (string | null | undefined)[]): boolean {
  return vals.some(v => v && parseFloat(v) !== 0);
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

  const hasScore = data.has_score;
  const totalDed = n(data.total_deductions);

  // Parse notes JSON
  let parsedNotes: Record<string, string> = {};
  if (data.notes) {
    try {
      parsedNotes = JSON.parse(data.notes);
    } catch {
      parsedNotes = { _plain: data.notes };
    }
  }

  // ── Scoring config ────────────────────────────────────────────────────────
  const scoringSystem = data.scoring_system ?? 'elite_l2_7';
  const pseudoDiv = { scoring_system: scoringSystem, suggested_scoring_system: scoringSystem } as Division;
  const sysConfig = getScoringConfig(pseudoDiv);
  const bCfg = sysConfig.building;
  const tCfg = sysConfig.tumbling;

  const isPartnerStuntSystem = scoringSystem === 'partner_stunt';
  const hasBuilding = !isPartnerStuntSystem && hasAny(data.stunts_difficulty, data.stunts_execution, data.stunts_drivers,
                             data.pyramids_difficulty, data.pyramids_execution, data.tosses_difficulty);
  const hasTumbling = !isPartnerStuntSystem && hasAny(data.standing_difficulty, data.standing_execution,
                             data.running_difficulty, data.running_execution,
                             data.jumps_difficulty, data.jumps_execution);
  const hasOverall  = !isPartnerStuntSystem;
  const hasPartner  = isPartnerStuntSystem;

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

  const deductionsForPrint: Deduction[] = (data.deductions ?? []).map((d, i) => ({
    id: i + 1,
    score_sheet: 0,
    deduction_type: d.type as DeductionType,
    deduction_type_display: d.type,
    count: d.count,
    unit_amount: d.count > 0 ? (parseFloat(d.total) / d.count).toFixed(2) : '0.00',
    total_amount: d.total,
    routine_time: d.routine_time,
    hit_zero: d.hit_zero,
    notes: d.notes,
  }));

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white"
      style={{ '--brand-primary': primary, '--brand-primary-text': primaryText, '--brand-secondary': primary, '--brand-accent': primary } as React.CSSProperties}>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 6mm; }
          .no-print { display: none !important; }
          body {
            zoom: 0.65;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-section { break-before: page; padding-top: 4mm; }
          .print-section:first-of-type { break-before: auto; padding-top: 0; }
          .print-section-label { display: none; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto py-6 px-4 print:p-0 print:max-w-none">

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
              <FileDown className="h-3.5 w-3.5" />
              Exportar PDF
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

        {!hasScore ? (
          <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-8 text-center text-zinc-400">
            <Trophy className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
            <p className="text-sm">El puntaje aún no está disponible.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {hasBuilding && (
              <section className="print-section">
                <p className="print-section-label text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">Building</p>
                <BuildingSheetReadOnly
                  bCfg={bCfg}
                  stuntsRango={bStuntsRango}
                  stuntsSkills={bStuntsSkills}
                  stuntsPartMax={bStuntsPartMax}
                  stuntsExecDeds={bStuntsExecDeds}
                  pyramidsRangeIdx={bPyramidsRangeIdx}
                  pyramidsFine={bPyramidsFine}
                  pyramidsExecDeds={bPyramidsExecDeds}
                  pyramidsDrivers={bPyramidsDrivers}
                  tossesExecDeds={bTossesExecDeds}
                  tossesDiff={bTossesDiff}
                  creativityBuilding={bCreativity}
                  showmanshipBuilding={bShowmanship}
                  stuntsNotes={parsedNotes.stunts ?? ''}
                  pyramidsNotes={parsedNotes.pyramids ?? ''}
                  tossesNotes={parsedNotes.tosses ?? ''}
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
              </section>
            )}

            {hasTumbling && (
              <section className="print-section">
                <p className="print-section-label text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">Tumbling</p>
                <TumblingSheetReadOnly
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
              </section>
            )}

            {hasOverall && (
              <section className="print-section">
                <p className="print-section-label text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">Overall</p>
                <OverallSheetReadOnly
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
              </section>
            )}

            {hasPartner && (
              <section className="print-section">
                <p className="print-section-label text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">Partner Stunt</p>
                <PartnerStuntSheetReadOnly
                  scores={pgScores}
                  notes={pgNotes}
                  total={pgTotal}
                  rawScore={n(data.raw_score)}
                  totalDeductions={totalDed}
                  finalScore={n(data.final_score)}
                  percentage={data.percentage ?? undefined}
                />
              </section>
            )}

            <section className="print-section">
              <p className="print-section-label text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 px-1">Deducciones</p>
              <DeduccionesSheetReadOnly
                deductions={deductionsForPrint}
                totalDed={totalDed}
                scaledScore={n(data.scaled_score)}
                finalScore={n(data.final_score)}
              />
            </section>
          </div>
        )}

        <p className="text-center text-xs text-zinc-400 mt-6 no-print">
          Cheer Metrics · Ecuador · Resultado generado automáticamente
        </p>
      </div>
    </div>
  );
}
