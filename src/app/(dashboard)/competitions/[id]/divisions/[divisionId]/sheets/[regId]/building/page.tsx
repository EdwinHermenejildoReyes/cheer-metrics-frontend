'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import { PrintButton } from '@/components/print/PrintButton';
import { ScoreSheetPrintView } from '@/components/print/ScoreSheetPrintView';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_BUILDING_CONFIG } from '@/lib/scoringConfig';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { BuildingConfig } from '@/lib/scoringConfig';
import type { ScoreSheet } from '@/types/competitions';

// ── Execution categories (same for all scoring systems) ──────────────────────
const EXEC_CATS      = ['Volante', 'Base/Spotter', 'Transición', 'Sincronización'];
const TOSS_EXEC_CATS = ['Flyer', 'Base/Spotter', 'Altura'];
const EXEC_DED_OPTS   = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];

// ── Helpers ──────────────────────────────────────────────────────────────────
type ExecDeds = (number | null)[];
const EMPTY_EXEC: ExecDeds = [null, null, null, null];

function execScore(max: number, deds: ExecDeds): number {
  const sum = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return parseFloat(Math.max(0, max - sum).toFixed(2));
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── "No Aplica" placeholder ───────────────────────────────────────────────────
function NoAplicaBadge({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 text-center col-span-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
    </div>
  );
}

// ── Execution sub-component ──────────────────────────────────────────────────
function ExecSection({
  label, max, deds, onChange, cats = EXEC_CATS,
}: {
  label: string;
  max: number;
  deds: ExecDeds;
  onChange: (deds: ExecDeds) => void;
  cats?: string[];
}) {
  const score = execScore(max, deds);
  const totalDed = deds.reduce<number>((s, d) => s + (d ?? 0), 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label} — Ejecución</span>
          <span className="text-sm font-semibold tabular-nums text-zinc-600">Máx: {fmt(max)}</span>
        </div>
        <p className="text-[10px] text-zinc-400 mt-0.5">Se Descuenta por Cantidad, Frecuencia y/o Gravedad de Errores</p>
      </div>

      <div className="divide-y divide-zinc-100">
        {cats.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-sm text-zinc-700">{cat}</span>
            <div className="flex flex-1 gap-1.5">
              {EXEC_DED_OPTS.map((amt, aidx) => {
                const active = deds[i] === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const next = [...deds] as ExecDeds;
                      next[i] = active ? null : amt;
                      onChange(next);
                    }}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border flex flex-col items-center gap-0.5 ${
                      active
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-red-400 hover:text-red-600'
                    }`}
                  >
                    <span>−{fmt(amt)}</span>
                    <span className={`text-[9px] ${active ? 'opacity-75' : 'opacity-50'}`}>{EXEC_DED_LABELS[aidx]}</span>
                  </button>
                );
              })}
            </div>
            <span className={`w-10 text-right text-xs tabular-nums ${deds[i] != null ? 'text-red-600' : 'text-zinc-300'}`}>
              {deds[i] != null ? `−${fmt(deds[i]!)}` : '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-t border-zinc-200">
        <span className="text-xs text-zinc-400">
          Descuentos: −{fmt(totalDed)}
        </span>
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
          {fmt(score)}
        </span>
      </div>
    </div>
  );
}

// ── Scored total pill ────────────────────────────────────────────────────────
function SectionTotal({ label, breakdown, total }: {
  label: string;
  breakdown: { key: string; value: number }[];
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
        {breakdown.map(({ key, value }) => (
          <span key={key}>
            {key}: <strong className="tabular-nums">{fmt(value)}</strong>
          </span>
        ))}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function BuildingSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const { isJudge, isCompetitionActive } = useJudge();

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado. Ya no puedes acceder a las planillas.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [bCfg,          setBCfg]          = useState<BuildingConfig>(DEFAULT_BUILDING_CONFIG);

  // ── Stunts – difficulty ───────────────────────────────────────────────────
  const [stuntsRango,    setStuntsRango]    = useState<number>(0);
  const [stuntsSkills,   setStuntsSkills]   = useState<number[]>([0, 0, 0, 0, 0]);
  const [stuntsPartMax,  setStuntsPartMax]  = useState<number>(0.0);
  const [stuntsExecDeds, setStuntsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Pyramids ──────────────────────────────────────────────────────────────
  const [pyramidsRangeIdx,  setPyramidsRangeIdx]  = useState<number | null>(null);
  const [pyramidsFine,      setPyramidsFine]      = useState<number>(0.0);
  const [pyramidsExecDeds, setPyramidsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Tosses ────────────────────────────────────────────────────────────────
  const [tossesDiff,    setTossesDiff]    = useState<number>(0.0);
  const [tossesExecDeds, setTossesExecDeds] = useState<ExecDeds>([null, null, null]);

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityBuilding,  setCreativityBuilding]  = useState<number>(0.0);
  const [showmanshipBuilding, setShowmanshipBuilding] = useState<number>(0.0);

  const [stuntsNotes,   setStuntsNotes]   = useState('');
  const [pyramidsNotes, setPyramidsNotes] = useState('');
  const [tossesNotes,   setTossesNotes]   = useState('');

  // ── Computed totals ───────────────────────────────────────────────────────
  const stuntsSkillsTotal  = parseFloat(stuntsSkills.reduce((s, v) => s + v, 0).toFixed(2));
  const stuntsDriversTotal = parseFloat((stuntsSkillsTotal + stuntsPartMax).toFixed(2));
  const stuntsExecTotal    = execScore(bCfg.stuntsExecMax, stuntsExecDeds);
  const stuntsSectionTotal  = parseFloat((stuntsRango + stuntsExecTotal + stuntsDriversTotal).toFixed(2));

  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(1))
    : 0.0;
  const pyramidsExecTotal   = execScore(bCfg.pyramidsExecMax, pyramidsExecDeds);
  const pyramidsSectionTotal = parseFloat((pyramidsDiff + pyramidsExecTotal).toFixed(2));

  const tossesExecTotal   = execScore(bCfg.tossesExecMax, tossesExecDeds);
  const tossesSectionTotal = parseFloat((tossesDiff + tossesExecTotal).toFixed(2));

  const buildingTotal = parseFloat((stuntsSectionTotal + pyramidsSectionTotal + tossesSectionTotal).toFixed(2));
  const sheetTotal    = parseFloat((buildingTotal + creativityBuilding + showmanshipBuilding).toFixed(2));

  // ── Derived from config ───────────────────────────────────────────────────
  const stuntSkillLabels = Array.from(
    { length: bCfg.stuntsSkillCount },
    (_, i) => i === 4 ? 'Habilidad #5 / Coed' : `Habilidad #${i + 1}`
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
        competitionsRepository.getDivision(divId),
      ]);

      const reg = regRes.data.results.find((r) => r.id === registrationId);
      if (reg) setTeamName(reg.team_name);

      const sysConfig = getScoringConfig(divRes.data);
      const cfg = sysConfig.building;
      setBCfg(cfg);

      // Set config-based defaults
      if (cfg.stuntsHasDiff && cfg.stuntsRango.length > 0) {
        setStuntsRango(cfg.stuntsRango[0].value);
      } else {
        setStuntsRango(0);
      }

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (cfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = cfg.pyramidRango.findIndex(r => v >= r.low && v <= r.high);
          if (idx >= 0) {
            setPyramidsRangeIdx(idx);
            setPyramidsFine(parseFloat((v - cfg.pyramidRango[idx].low).toFixed(1)));
          }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          setTossesDiff(cfg.tossDiffOpts.some(o => o.value === v) ? v : 0.0);
        }
        if (sheet.creativity_building) {
          setCreativityBuilding(Math.min(2.0, parseFloat(sheet.creativity_building)));
        }
        if (sheet.showmanship_building) {
          setShowmanshipBuilding(Math.min(2.0, parseFloat(sheet.showmanship_building)));
        }
        if (sheet.notes) {
          try {
            const parsed = JSON.parse(sheet.notes);
            if (parsed._scores) {
              const s = parsed._scores;
              if (s.stuntsRango !== undefined && cfg.stuntsRango.some(r => r.value === s.stuntsRango)) setStuntsRango(s.stuntsRango);
              if (Array.isArray(s.stuntsSkills)) {
                setStuntsSkills([0, 0, 0, 0, 0].map((_, i) => s.stuntsSkills[i] ?? 0));
              }
              if (s.stuntsPartMax !== undefined && cfg.stuntsPartMaxOpts.some(o => o.value === s.stuntsPartMax)) setStuntsPartMax(s.stuntsPartMax);
            }
            setStuntsNotes(parsed.stunts ?? '');
            setPyramidsNotes(parsed.pyramids ?? '');
            setTossesNotes(parsed.tosses ?? '');
          } catch {
            setStuntsNotes(sheet.notes);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<ScoreSheet> = {
        stunts_difficulty:    String(stuntsRango),
        stunts_execution:     String(stuntsExecTotal),
        stunts_drivers:       String(stuntsDriversTotal),
        pyramids_difficulty:  String(pyramidsDiff),
        pyramids_execution:   String(pyramidsExecTotal),
        tosses_difficulty:    String(tossesDiff),
        tosses_execution:     String(tossesExecTotal),
        creativity_building:  String(creativityBuilding),
        showmanship_building: String(showmanshipBuilding),
        notes: JSON.stringify({
          stunts: stuntsNotes,
          pyramids: pyramidsNotes,
          tosses: tossesNotes,
          _scores: { stuntsRango, stuntsSkills, stuntsPartMax },
        }),
      };

      let saved: ScoreSheet;
      if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createScoreSheet({
          registration: registrationId as unknown as number,
          ...payload,
        } as Partial<ScoreSheet>);
        saved = res.data;
      }
      setExistingSheet(saved);
      toast.success('Planilla guardada');
    } catch (err) {
      toastApiError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      {/* ── Sticky top bar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Elevaciones (Building)</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right print:hidden">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total planilla</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(sheetTotal)}</p>
          </div>
          <PrintButton />
          <Button onClick={handleSave} loading={saving} className="print:hidden">
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Print-only view (hidden in browser, visible when printing) */}
      {existingSheet && (
        <ScoreSheetPrintView
          sheet={existingSheet}
          teamName={teamName || `Inscripción #${registrationId}`}
          sheetTypeLabel="Building — Elevaciones"
        />
      )}

      <div className="print:hidden max-w-6xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* ── STUNTS ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Elevaciones — Stunts
          </h2>
          {!bCfg.hasStunts ? (
            <NoAplicaBadge label="Sin Stunts — No Aplica para esta División" />
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              {!bCfg.stuntsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
                  </div>
                  <div className="p-4 flex flex-col gap-5">

                    {/* Rango Base */}
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
                      <div className="flex flex-col gap-1.5">
                        {bCfg.stuntsRango.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setStuntsRango(value)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                              stuntsRango === value
                                ? 'border-transparent'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                            }`}
                            style={stuntsRango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsRango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {value.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Grado de Dificultad per skill */}
                    {bCfg.stuntsSkillCount > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Grado de Dificultad — Habilidades (+0.10 / +0.20)</p>
                        <div className="flex flex-col gap-2">
                          {stuntSkillLabels.map((skill, i) => (
                            <div key={skill} className="flex items-center gap-3">
                              <span className="w-28 shrink-0 text-sm text-zinc-700">{skill}</span>
                              <div className="flex flex-1 gap-1.5">
                                {bCfg.stuntsSkillGrades.map(({ label, value }) => (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => {
                                      const next = [...stuntsSkills];
                                      next[i] = value;
                                      setStuntsSkills(next);
                                    }}
                                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors border ${
                                      stuntsSkills[i] === value
                                        ? 'border-transparent'
                                        : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                                    }`}
                                    style={stuntsSkills[i] === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                                  >
                                    {label}
                                    {value > 0 && (
                                      <span className="ml-1 opacity-70">+{value.toFixed(2)}</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex justify-between text-xs border-t border-zinc-100 pt-2">
                          <span className="text-zinc-500">
                            Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}
                          </span>
                          <span className="font-semibold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                        </div>
                      </div>
                    )}

                    {/* Part Max */}
                    {bCfg.stuntsPartMaxOpts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-0.5">Part Max — Spotter / Base</p>
                        <p className="text-[10px] text-zinc-400 mb-2">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                        <div className="flex flex-col gap-1.5">
                          {bCfg.stuntsPartMaxOpts.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setStuntsPartMax(value)}
                              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                                stuntsPartMax === value
                                  ? 'border-transparent'
                                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-violet-400 hover:text-violet-700'
                              }`}
                              style={stuntsPartMax === value ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-accent)' } : undefined}
                            >
                              <span className="flex-1">{label}</span>
                              <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsPartMax === value ? 'text-white/80' : 'text-zinc-400'}`}>
                                {value.toFixed(1)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RIGHT: Execution + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Elevaciones" max={bCfg.stuntsExecMax} deds={stuntsExecDeds} onChange={setStuntsExecDeds} />
                <SectionTotal
                  label="Total Elevaciones"
                  breakdown={
                    bCfg.stuntsHasDiff
                      ? [
                          { key: 'Dif', value: stuntsRango },
                          { key: 'Ejec', value: stuntsExecTotal },
                          { key: 'Drivers', value: stuntsDriversTotal },
                        ]
                      : [{ key: 'Ejec', value: stuntsExecTotal }]
                  }
                  total={stuntsSectionTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Elevaciones</span>
                  </div>
                  <div className="p-3">
                    <textarea
                      value={stuntsNotes}
                      onChange={(e) => setStuntsNotes(e.target.value)}
                      placeholder="Observaciones sobre Elevaciones..."
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── PYRAMIDS ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pirámides</h2>
          {!bCfg.hasPyramids ? (
            <NoAplicaBadge label="Sin Pirámides — No Aplica para esta División" />
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              {!bCfg.pyramidsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5"># Habilidades Diferentes del Nivel + # Estructuras x Gran Parte</p>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango</p>
                      <div className="flex flex-col gap-1.5">
                        {bCfg.pyramidRango.map(({ low, high, label }, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => { setPyramidsRangeIdx(idx); setPyramidsFine(0.0); }}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                              pyramidsRangeIdx === idx
                                ? 'border-transparent'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                            }`}
                            style={pyramidsRangeIdx === idx ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-sm font-bold tabular-nums ml-3 shrink-0 ${pyramidsRangeIdx === idx ? 'text-zinc-300' : 'text-zinc-400'}`}>
                              {low.toFixed(1)}–{high.toFixed(1)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Ajuste dentro del rango</p>
                        <div className="grid grid-cols-6 gap-1">
                          {bCfg.pyramidFineSteps.map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setPyramidsFine(step)}
                              className={`rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors border ${
                                pyramidsFine === step
                                  ? 'border-transparent'
                                  : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                              }`}
                              style={pyramidsFine === step ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                            >
                              +{step.toFixed(1)}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-right text-xs text-zinc-500">
                          Dificultad: <strong className="text-zinc-900 tabular-nums">{pyramidsDiff.toFixed(1)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* RIGHT: Execution + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Pirámides" max={bCfg.pyramidsExecMax} deds={pyramidsExecDeds} onChange={setPyramidsExecDeds} />
                <SectionTotal
                  label="Total Pirámides"
                  breakdown={
                    bCfg.pyramidsHasDiff
                      ? [{ key: 'Dif', value: pyramidsDiff }, { key: 'Ejec', value: pyramidsExecTotal }]
                      : [{ key: 'Ejec', value: pyramidsExecTotal }]
                  }
                  total={pyramidsSectionTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Pirámides</span>
                  </div>
                  <div className="p-3">
                    <textarea
                      value={pyramidsNotes}
                      onChange={(e) => setPyramidsNotes(e.target.value)}
                      placeholder="Observaciones sobre Pirámides..."
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── TOSSES ──────────────────────────────────────────────────── */}
        {bCfg.hasTosses && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lanzamientos — Tosses</h2>
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* LEFT: Difficulty */}
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Lanzamiento Apropiado del Nivel</p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-1.5">
                    {bCfg.tossDiffOpts.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTossesDiff(value)}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                          tossesDiff === value
                            ? 'border-transparent'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={tossesDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                      >
                        <span className="flex-1">{label}</span>
                        <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${tossesDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {value.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Execution + Total + Comments */}
              <div className="flex flex-col gap-4">
                <ExecSection label="Lanzamientos" max={bCfg.tossesExecMax} deds={tossesExecDeds} onChange={setTossesExecDeds} cats={TOSS_EXEC_CATS} />
                <SectionTotal
                  label="Total Lanzamientos"
                  breakdown={[
                    { key: 'Dif', value: tossesDiff },
                    { key: 'Ejec', value: tossesExecTotal },
                  ]}
                  total={tossesSectionTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Lanzamientos</span>
                  </div>
                  <div className="p-3">
                    <textarea
                      value={tossesNotes}
                      onChange={(e) => setTossesNotes(e.target.value)}
                      placeholder="Observaciones sobre Lanzamientos..."
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── BUILDING SUBTOTAL ────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Elevaciones</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(buildingTotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Creatividad & Showmanship</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Creativity */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Creatividad</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityBuilding)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityBuilding}
                    onChange={(e) => setCreativityBuilding(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityBuilding}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setCreativityBuilding(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante formaciones, transiciones y construcciones</p>
              </div>
            </div>

            {/* Showmanship */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Showmanship</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipBuilding}
                    onChange={(e) => setShowmanshipBuilding(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipBuilding}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setShowmanshipBuilding(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Ritmo, Confianza y Conexión durante la rutina</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-60 font-medium">Total Planilla Building</p>
            <p className="text-xs opacity-40 mt-0.5">
              Elevaciones + Creatividad ({fmt(creativityBuilding)}) + Showmanship ({fmt(showmanshipBuilding)})
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* Score summary table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Dificultad (Rango)</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(stuntsRango)}</td>
                </tr>
              )}
              {bCfg.hasStunts && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Ejecución</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(stuntsExecTotal)}</td>
                </tr>
              )}
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Stunts — Drivers (Grado+PM)</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(stuntsDriversTotal)}</td>
                </tr>
              )}
              {bCfg.hasPyramids && bCfg.pyramidsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Pirámides — Dificultad</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(pyramidsDiff)}</td>
                </tr>
              )}
              {bCfg.hasPyramids && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Pirámides — Ejecución</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(pyramidsExecTotal)}</td>
                </tr>
              )}
              {bCfg.hasTosses && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Dificultad</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(tossesDiff)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Ejecución</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(tossesExecTotal)}</td>
                  </tr>
                </>
              )}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--brand-primary)' }}>Subtotal Elevaciones</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>{fmt(buildingTotal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(creativityBuilding)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Showmanship (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</td>
              </tr>
              <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--brand-primary-text)' }}>TOTAL</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg" style={{ color: 'var(--brand-primary-text)' }}>{fmt(sheetTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
