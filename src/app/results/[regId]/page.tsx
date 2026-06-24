'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, FileDown, AlertTriangle, Medal } from 'lucide-react';
import type { PublicResult, PublicDivisionRanking } from '@/repositories/competitionsRepository';
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

// ── Score summary card ────────────────────────────────────────────────────────

interface ScoreItem { label: string; value: number; max?: number; }

function ScoreBlock({ title, items, color }: { title: string; items: ScoreItem[]; color: string }) {
  if (items.every(i => i.value === 0)) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 text-xs font-semibold uppercase tracking-widest"
        style={{ backgroundColor: `${color}15`, color }}>
        {title}
      </div>
      <div className="divide-y divide-zinc-100">
        {items.map(({ label, value, max }) => value !== 0 && (
          <div key={label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-zinc-600">{label}</span>
            <span className="text-sm font-semibold text-zinc-900">
              {value.toFixed(2)}{max ? <span className="text-xs font-normal text-zinc-400"> / {max}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreSummary({ data, primary }: { data: PublicResult; primary: string }) {
  const scoringSystem = data.scoring_system ?? 'elite_l2_7';
  const pseudoDiv = { scoring_system: scoringSystem, suggested_scoring_system: scoringSystem } as Division;
  const sysConfig = getScoringConfig(pseudoDiv);
  const bCfg = sysConfig.building;

  const hasBuilding = hasAny(data.stunts_difficulty, data.pyramids_difficulty, data.tosses_difficulty);
  const hasTumbling = hasAny(data.standing_difficulty, data.running_difficulty, data.jumps_difficulty);
  const hasOverall  = hasAny(data.formations_score, data.dance_difficulty, data.dance_execution);
  const hasPartner  = hasAny(data.pg_technique, data.pg_difficulty);

  const buildingItems: ScoreItem[] = [
    { label: 'Dif. Elevaciones',  value: n(data.stunts_difficulty) },
    { label: 'Dif. Pirámides',    value: n(data.pyramids_difficulty) },
    ...(bCfg.hasTosses ? [{ label: 'Dif. Lanzamientos', value: n(data.tosses_difficulty) }] : []),
    { label: 'Creatividad',       value: n(data.creativity_building) },
    { label: 'Showmanship',       value: n(data.showmanship_building) },
  ];

  const tumblingItems: ScoreItem[] = [
    { label: 'Dif. Piso',         value: n(data.standing_difficulty) },
    { label: 'Dif. Carrera',      value: n(data.running_difficulty) },
    { label: 'Dif. Saltos',       value: n(data.jumps_difficulty) },
    { label: 'Creatividad',       value: n(data.creativity_tumbling) },
    { label: 'Showmanship',       value: n(data.showmanship_tumbling) },
  ];

  const overallItems: ScoreItem[] = [
    { label: 'Formaciones',       value: n(data.formations_score) },
    { label: 'Dif. Baile',        value: n(data.dance_difficulty) },
    { label: 'Ejec. Baile',       value: n(data.dance_execution) },
    { label: 'Creatividad',       value: n(data.creativity_overall) },
    { label: 'Showmanship',       value: n(data.showmanship_overall) },
  ];

  const partnerItems: ScoreItem[] = [
    { label: 'Técnica',           value: n(data.pg_technique) },
    { label: 'Dificultad',        value: n(data.pg_difficulty) },
    { label: 'Forma / Apariencia', value: n(data.pg_form_appearance) },
    { label: 'Transiciones',      value: n(data.pg_transitions) },
    { label: 'Expresividad',      value: n(data.pg_expressiveness) },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Final score banner */}
      <div className="rounded-xl px-5 py-4 flex items-center justify-between"
        style={{ backgroundColor: primary }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70 text-white">Puntaje final</p>
          <p className="text-4xl font-bold text-white mt-0.5">{n(data.final_score).toFixed(3)}</p>
          <p className="text-sm text-white/70 mt-0.5">{n(data.percentage).toFixed(2)}%</p>
        </div>
        <div className="text-right text-sm text-white/80 space-y-1">
          <p>Puntaje bruto: <strong className="text-white">{n(data.scaled_score).toFixed(3)}</strong></p>
          {n(data.total_deductions) > 0 && (
            <p>Deducciones: <strong className="text-white">−{n(data.total_deductions).toFixed(2)}</strong></p>
          )}
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        {hasBuilding && <ScoreBlock title="Elevaciones"    items={buildingItems} color={primary} />}
        {hasTumbling && <ScoreBlock title="Gimnasia"       items={tumblingItems} color={primary} />}
        {hasOverall  && <ScoreBlock title="General"        items={overallItems}  color={primary} />}
        {hasPartner  && <ScoreBlock title="Partner Stunt"  items={partnerItems}  color={primary} />}
      </div>
    </div>
  );
}

// ── Ranking table ─────────────────────────────────────────────────────────────

function RankingTable({ ranking, currentRegId, primary, primaryText }:
  { ranking: PublicDivisionRanking; currentRegId: number; primary: string; primaryText: string }) {

  const scored   = ranking.entries.filter(e => e.has_score);
  const unscored = ranking.entries.filter(e => !e.has_score);

  const medalColor = (rank: number | null) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-zinc-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-zinc-300';
  };

  const Row = ({ e }: { e: typeof ranking.entries[0] }) => {
    const isCurrent = e.registration_id === currentRegId;
    return (
      <tr key={e.registration_id}
        className={isCurrent ? 'font-semibold' : 'hover:bg-zinc-50'}
        style={isCurrent ? { backgroundColor: `${primary}12` } : {}}>
        <td className="px-4 py-3 text-center w-10">
          {e.rank !== null ? (
            e.rank <= 3
              ? <Medal className={`h-4 w-4 mx-auto ${medalColor(e.rank)}`} />
              : <span className={`text-sm ${isCurrent ? '' : 'text-zinc-400'}`}>{e.rank}</span>
          ) : <span className="text-xs text-zinc-300">—</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div>
              <p className={`text-sm ${isCurrent ? '' : 'text-zinc-800'}`}
                style={isCurrent ? { color: primary } : {}}>
                {e.team_name}
                {isCurrent && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">(tu equipo)</span>}
              </p>
              <p className="text-xs text-zinc-400">{e.gym_name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right text-sm">
          {e.has_score ? (
            <span className="font-semibold" style={isCurrent ? { color: primary } : {}}>
              {parseFloat(e.final_score!).toFixed(3)}
            </span>
          ) : <span className="text-zinc-300 text-xs">Pendiente</span>}
        </td>
        <td className="px-4 py-3 text-right text-sm text-zinc-500">
          {e.has_score ? `${parseFloat(e.percentage!).toFixed(2)}%` : '—'}
        </td>
      </tr>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 border-b border-zinc-100">
            <th className="px-4 py-3 text-center">#</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3 text-right">Puntaje</th>
            <th className="px-4 py-3 text-right">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {scored.map(e => <Row key={e.registration_id} e={e} />)}
          {unscored.length > 0 && scored.length > 0 && (
            <tr><td colSpan={4} className="px-4 py-2 text-[11px] text-zinc-400 uppercase tracking-wide bg-zinc-50">Sin calificación</td></tr>
          )}
          {unscored.map(e => <Row key={e.registration_id} e={e} />)}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'ranking' | 'detail';

export default function PublicResultPage() {
  const { regId } = useParams<{ regId: string }>();
  const [data,    setData]    = useState<PublicResult | null>(null);
  const [ranking, setRanking] = useState<PublicDivisionRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [tab, setTab] = useState<Tab>('ranking');

  useEffect(() => {
    if (!/^\d+$/.test(regId ?? '')) { setError(true); setLoading(false); return; }
    fetch(`${BASE}registrations/${regId}/public-result/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [regId]);

  // Fetch ranking when tab becomes 'ranking' and data is loaded
  useEffect(() => {
    if (!data?.division_id) return;
    setRankLoading(true);
    fetch(`${BASE}divisions/${data.division_id}/public-rankings/`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setRanking)
      .catch(() => {})
      .finally(() => setRankLoading(false));
  }, [data?.division_id]);

  const primary     = data?.organization?.primary_color   ?? '#18181b';
  const primaryText = data?.organization?.text_on_primary ?? '#ffffff';
  const orgName     = data?.organization?.name            ?? 'Cheer Metrics';
  const logoUrl     = data?.organization?.logo            ?? '';

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-3 text-zinc-500">
      <AlertTriangle className="h-10 w-10 text-zinc-300" />
      <p className="text-sm">No se encontró el resultado o no está disponible.</p>
    </div>
  );

  const hasScore    = data.has_score;
  const totalDed    = n(data.total_deductions);
  const scoringSystem = data.scoring_system ?? 'elite_l2_7';
  const pseudoDiv   = { scoring_system: scoringSystem, suggested_scoring_system: scoringSystem } as Division;
  const sysConfig   = getScoringConfig(pseudoDiv);
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

  let parsedNotes: Record<string, string> = {};
  if (data.notes) { try { parsedNotes = JSON.parse(data.notes); } catch { parsedNotes = { _plain: data.notes }; } }

  const noteScores      = ((parsedNotes as Record<string, unknown>)._scores ?? {}) as Record<string, unknown>;
  const hasBuildingScores = 'stuntsExecDeds' in noteScores;
  const hasTumblingScores = 'standingExecDeds' in noteScores;

  // Building
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

  // Tumbling
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

  // Overall
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

  // Partner stunt
  const pgScores: Record<string, number> = {
    pg_technique:       n(data.pg_technique),
    pg_difficulty:      n(data.pg_difficulty),
    pg_form_appearance: n(data.pg_form_appearance),
    pg_transitions:     n(data.pg_transitions),
    pg_expressiveness:  n(data.pg_expressiveness),
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
          body { zoom: 0.65; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-section { break-before: page; padding-top: 4mm; }
          .print-section:first-of-type { break-before: auto; padding-top: 0; }
          .print-section-label { display: none; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto py-6 px-4 print:p-0 print:max-w-none">

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
              PDF
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

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div className="no-print flex gap-1 rounded-xl bg-zinc-200/60 p-1 mb-4">
          {([
            { key: 'ranking', label: 'Ranking División' },
            { key: 'detail',  label: 'Mi Resultado' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 rounded-lg py-2 text-sm font-medium transition-all"
              style={tab === t.key
                ? { backgroundColor: primary, color: primaryText }
                : { color: '#52525b' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Ranking tab ───────────────────────────────────────────────── */}
        {tab === 'ranking' && (
          <div className="no-print">
            {rankLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
              </div>
            ) : ranking ? (
              <RankingTable
                ranking={ranking}
                currentRegId={data.registration_id}
                primary={primary}
                primaryText={primaryText}
              />
            ) : (
              <div className="rounded-xl bg-white border border-zinc-200 px-5 py-8 text-center text-zinc-400 text-sm">
                No se pudo cargar el ranking.
              </div>
            )}
          </div>
        )}

        {/* ── Detail tab ────────────────────────────────────────────────── */}
        {tab === 'detail' && (
          <>
            {!hasScore ? (
              <div className="rounded-2xl bg-white border border-zinc-200 px-5 py-8 text-center text-zinc-400">
                <Trophy className="h-8 w-8 mx-auto mb-3 text-zinc-200" />
                <p className="text-sm">El puntaje aún no está disponible.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Score summary */}
                <ScoreSummary data={data} primary={primary} />

                {/* Detailed sheets */}
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
          </>
        )}

        <p className="text-center text-xs text-zinc-400 mt-6 no-print">
          Cheer Metrics · Ecuador · Resultado generado automáticamente
        </p>
      </div>
    </div>
  );
}
