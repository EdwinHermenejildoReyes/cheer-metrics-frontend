'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_TUMBLING_CONFIG } from '@/lib/scoringConfig';
import type { TumblingConfig } from '@/lib/scoringConfig';
import type { ScoreSheet } from '@/types/competitions';

// ── Execution categories (same for all scoring systems) ──────────────────────
const STANDING_EXEC_CATS = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const RUNNING_EXEC_CATS  = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const JUMPS_EXEC_CATS    = ['P. Brazos', 'P. Piernas', 'Sinc'];
const EXEC_DED_OPTS      = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS    = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];

// ── Types & helpers ───────────────────────────────────────────────────────────
type ExecDeds = (number | null)[];

function emptyExec(cats: string[]): ExecDeds {
  return cats.map(() => null);
}

function execScore(max: number, deds: ExecDeds): number {
  const sum = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return parseFloat(Math.max(0, max - sum).toFixed(2));
}

function fmt(n: number) {
  return n.toFixed(2);
}

// ── Execution sub-component ───────────────────────────────────────────────────
function ExecSection({
  label, max, categories, deds, onChange,
}: {
  label: string;
  max: number;
  categories: string[];
  deds: ExecDeds;
  onChange: (deds: ExecDeds) => void;
}) {
  const score    = execScore(max, deds);
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
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-36 shrink-0 text-sm text-zinc-700">{cat}</span>
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
        <span className="text-xs text-zinc-400">Descuentos: −{fmt(totalDed)}</span>
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
          {fmt(score)}
        </span>
      </div>
    </div>
  );
}

// ── Section total pill ────────────────────────────────────────────────────────
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

// ── Difficulty card for standing/running tumbling ─────────────────────────────
function TumblingDiffCard({
  label,
  rangoOpts, habilidadOpts,
  rango, onRango,
  habilidad, onHabilidad,
}: {
  label: string;
  rangoOpts: { value: number; label: string }[];
  habilidadOpts: { value: number; label: string }[];
  rango: number; onRango: (v: number) => void;
  habilidad: number; onHabilidad: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label} — Dificultad</span>
      </div>
      <div className="p-4 flex flex-col gap-5">

        {/* Rango Base */}
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
          <div className="flex flex-col gap-1.5">
            {rangoOpts.map(({ label: lbl, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => onRango(value)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                  rango === value
                    ? 'border-transparent'
                    : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                }`}
                style={rango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
              >
                <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${
                  rango === value ? 'text-zinc-300' : 'text-zinc-400'
                }`}>
                  {value.toFixed(1)}
                </span>
                <span className="flex-1">{lbl}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Habilidad Realizada */}
        {habilidadOpts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Habilidad Realizada o Gran Parte</p>
            <div className="flex gap-1.5">
              {habilidadOpts.map(({ label: lbl, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onHabilidad(value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors border ${
                    habilidad === value
                      ? 'border-transparent'
                      : 'bg-white text-zinc-600 border-zinc-300 hover:border-violet-400 hover:text-violet-700'
                  }`}
                  style={habilidad === value ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-accent)' } : undefined}
                >
                  <span className="font-bold text-sm">{value.toFixed(1)}</span>
                  <span className="leading-tight text-center opacity-80">{lbl}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs border-t border-zinc-100 pt-2">
          <span className="text-zinc-500">
            Base {fmt(rango)} + habilidad {fmt(habilidad)}
          </span>
          <span className="font-semibold text-zinc-900">
            Total: {fmt(rango + habilidad)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TumblingSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [tCfg,          setTCfg]          = useState<TumblingConfig>(DEFAULT_TUMBLING_CONFIG);

  // ── Standing difficulty ───────────────────────────────────────────────────
  const [standingRango,    setStandingRango]    = useState<number>(0);
  const [standingHabilidad, setStandingHabilidad] = useState<number>(0.0);
  const [standingExecDeds, setStandingExecDeds] = useState<ExecDeds>(emptyExec(STANDING_EXEC_CATS));

  // ── Running difficulty ────────────────────────────────────────────────────
  const [runningRango,    setRunningRango]    = useState<number>(0);
  const [runningHabilidad, setRunningHabilidad] = useState<number>(0.0);
  const [runningExecDeds, setRunningExecDeds] = useState<ExecDeds>(emptyExec(RUNNING_EXEC_CATS));

  // ── Jumps ─────────────────────────────────────────────────────────────────
  const [jumpsDiff,     setJumpsDiff]     = useState<number>(0);
  const [jumpsExecDeds, setJumpsExecDeds] = useState<ExecDeds>(emptyExec(JUMPS_EXEC_CATS));

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityTumbling,  setCreativityTumbling]  = useState<number>(0.0);
  const [showmanshipTumbling, setShowmanshipTumbling] = useState<number>(0.0);

  const [standingNotes, setStandingNotes] = useState('');
  const [runningNotes,  setRunningNotes]  = useState('');
  const [jumpsNotes,    setJumpsNotes]    = useState('');

  // ── Computed totals ───────────────────────────────────────────────────────
  const standingExecTotal   = execScore(tCfg.standingExecMax, standingExecDeds);
  const standingDiffEff     = tCfg.standingHasDiff ? standingRango : 0;
  const standingHabEff      = tCfg.standingHasDiff ? standingHabilidad : 0;
  const standingTotal       = parseFloat((standingDiffEff + standingHabEff + standingExecTotal).toFixed(2));

  const runningExecTotal    = execScore(tCfg.runningExecMax, runningExecDeds);
  const runningDiffEff      = tCfg.runningHasDiff ? runningRango : 0;
  const runningHabEff       = tCfg.runningHasDiff ? runningHabilidad : 0;
  const runningTotal        = parseFloat((runningDiffEff + runningHabEff + runningExecTotal).toFixed(2));

  const jumpsExecTotal      = execScore(tCfg.jumpsExecMax, jumpsExecDeds);
  const jumpsDiffEff        = tCfg.jumpsHasDiff ? jumpsDiff : 0;
  const jumpsTotal          = parseFloat((jumpsDiffEff + jumpsExecTotal).toFixed(2));

  const tumblingSubtotal    = parseFloat((
    (tCfg.hasStanding ? standingTotal : 0) +
    (tCfg.hasRunning  ? runningTotal  : 0) +
    (tCfg.hasJumps    ? jumpsTotal    : 0)
  ).toFixed(2));
  const sheetTotal          = parseFloat((tumblingSubtotal + creativityTumbling + showmanshipTumbling).toFixed(2));

  // ── Load ─────────────────────────────────────────────────────────────────
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
      const tcfg = sysConfig.tumbling;
      setTCfg(tcfg);

      // Config-based defaults
      if (tcfg.standingHasDiff && tcfg.standingRango.length > 0) setStandingRango(tcfg.standingRango[0].value);
      else setStandingRango(0);
      if (tcfg.runningHasDiff && tcfg.runningRango.length > 0) setRunningRango(tcfg.runningRango[0].value);
      else setRunningRango(0);
      if (tcfg.jumpsHasDiff && tcfg.jumpsDiffOpts.length > 0) setJumpsDiff(tcfg.jumpsDiffOpts[0].value);
      else setJumpsDiff(0);

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        if (sheet.standing_difficulty) {
          const v = parseFloat(sheet.standing_difficulty);
          const match = tcfg.standingRango.find((o) => o.value === v);
          setStandingRango(match ? v : (tcfg.standingRango[0]?.value ?? 0));
        }
        if (sheet.standing_drivers) {
          const v = parseFloat(sheet.standing_drivers);
          const match = tcfg.standingHabilidad.find((o) => o.value === v);
          setStandingHabilidad(match ? v : 0.0);
        }
        if (sheet.running_difficulty) {
          const v = parseFloat(sheet.running_difficulty);
          const match = tcfg.runningRango.find((o) => o.value === v);
          setRunningRango(match ? v : (tcfg.runningRango[0]?.value ?? 0));
        }
        if (sheet.running_drivers) {
          const v = parseFloat(sheet.running_drivers);
          const match = tcfg.runningHabilidad.find((o) => o.value === v);
          setRunningHabilidad(match ? v : 0.0);
        }
        if (sheet.jumps_difficulty) {
          const v = parseFloat(sheet.jumps_difficulty);
          const match = tcfg.jumpsDiffOpts.find((o) => o.value === v);
          setJumpsDiff(match ? v : (tcfg.jumpsDiffOpts[0]?.value ?? 0));
        }
        if (sheet.creativity_tumbling) {
          setCreativityTumbling(Math.min(2.0, parseFloat(sheet.creativity_tumbling)));
        }
        if (sheet.showmanship_tumbling) {
          setShowmanshipTumbling(Math.min(2.0, parseFloat(sheet.showmanship_tumbling)));
        }
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStandingNotes(p.standing ?? '');
            setRunningNotes(p.running ?? '');
            setJumpsNotes(p.jumps ?? '');
          } catch {
            setStandingNotes(sheet.notes);
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
        standing_difficulty:  String(standingDiffEff),
        standing_drivers:     String(standingHabEff),
        standing_execution:   String(standingExecTotal),
        running_difficulty:   String(runningDiffEff),
        running_drivers:      String(runningHabEff),
        running_execution:    String(runningExecTotal),
        jumps_difficulty:     String(jumpsDiffEff),
        jumps_execution:      String(jumpsExecTotal),
        creativity_tumbling:  String(creativityTumbling),
        showmanship_tumbling: String(showmanshipTumbling),
        notes: JSON.stringify({ standing: standingNotes, running: runningNotes, jumps: jumpsNotes }),
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
    } catch {
      toast.error('No se pudo guardar');
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
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Gimnasia (Tumbling)</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total planilla</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(sheetTotal)}</p>
          </div>
          <Button onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* ── GIMNASIA ESTÁTICA ────────────────────────────────────────── */}
        {tCfg.hasStanding && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Gimnasia Estática (Standing)</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.standingHasDiff ? (
                <TumblingDiffCard
                  label="Estática"
                  rangoOpts={tCfg.standingRango}
                  habilidadOpts={tCfg.standingHabilidad}
                  rango={standingRango} onRango={setStandingRango}
                  habilidad={standingHabilidad} onHabilidad={setStandingHabilidad}
                />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection
                  label="Gimnasia Estática"
                  max={tCfg.standingExecMax}
                  categories={STANDING_EXEC_CATS}
                  deds={standingExecDeds}
                  onChange={setStandingExecDeds}
                />
                <SectionTotal
                  label="Total Estática"
                  breakdown={
                    tCfg.standingHasDiff
                      ? [
                          { key: 'Base', value: standingDiffEff },
                          { key: 'Hab',  value: standingHabEff  },
                          { key: 'Ejec', value: standingExecTotal },
                        ]
                      : [{ key: 'Ejec', value: standingExecTotal }]
                  }
                  total={standingTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Estática</span>
                  </div>
                  <div className="p-3">
                    <textarea value={standingNotes} onChange={(e) => setStandingNotes(e.target.value)}
                      placeholder="Observaciones sobre Gimnasia Estática..." rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── GIMNASIA CON CARRERA ─────────────────────────────────────── */}
        {tCfg.hasRunning && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Gimnasia con Carrera (Running)</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.runningHasDiff ? (
                <TumblingDiffCard
                  label="Con Carrera"
                  rangoOpts={tCfg.runningRango}
                  habilidadOpts={tCfg.runningHabilidad}
                  rango={runningRango} onRango={setRunningRango}
                  habilidad={runningHabilidad} onHabilidad={setRunningHabilidad}
                />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection
                  label="Gimnasia con Carrera"
                  max={tCfg.runningExecMax}
                  categories={RUNNING_EXEC_CATS}
                  deds={runningExecDeds}
                  onChange={setRunningExecDeds}
                />
                <SectionTotal
                  label="Total Carrera"
                  breakdown={
                    tCfg.runningHasDiff
                      ? [
                          { key: 'Base', value: runningDiffEff },
                          { key: 'Hab',  value: runningHabEff  },
                          { key: 'Ejec', value: runningExecTotal },
                        ]
                      : [{ key: 'Ejec', value: runningExecTotal }]
                  }
                  total={runningTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Con Carrera</span>
                  </div>
                  <div className="p-3">
                    <textarea value={runningNotes} onChange={(e) => setRunningNotes(e.target.value)}
                      placeholder="Observaciones sobre Gimnasia con Carrera..." rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── SALTOS ───────────────────────────────────────────────────── */}
        {tCfg.hasJumps && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Saltos (Jumps)</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.jumpsHasDiff && tCfg.jumpsDiffOpts.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad — Saltos Avanzados</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1.5">
                    {tCfg.jumpsDiffOpts.map(({ label: lbl, value }) => (
                      <button key={value} type="button" onClick={() => setJumpsDiff(value)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                          jumpsDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={jumpsDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}>
                        <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${jumpsDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>
                          {value.toFixed(1)}
                        </span>
                        <span className="flex-1">{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Saltos" max={tCfg.jumpsExecMax} categories={JUMPS_EXEC_CATS} deds={jumpsExecDeds} onChange={setJumpsExecDeds} />
                <SectionTotal
                  label="Total Saltos"
                  breakdown={
                    tCfg.jumpsHasDiff
                      ? [{ key: 'Dif', value: jumpsDiffEff }, { key: 'Ejec', value: jumpsExecTotal }]
                      : [{ key: 'Ejec', value: jumpsExecTotal }]
                  }
                  total={jumpsTotal}
                />
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Saltos</span>
                  </div>
                  <div className="p-3">
                    <textarea value={jumpsNotes} onChange={(e) => setJumpsNotes(e.target.value)}
                      placeholder="Observaciones sobre Saltos..." rows={3}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TUMBLING SUBTOTAL ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Gimnasia</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(tumblingSubtotal)}</span>
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
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityTumbling)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityTumbling}
                    onChange={(e) => setCreativityTumbling(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityTumbling}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setCreativityTumbling(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante toda la rutina</p>
              </div>
            </div>

            {/* Showmanship */}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Showmanship</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipTumbling)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipTumbling}
                    onChange={(e) => setShowmanshipTumbling(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipTumbling}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setShowmanshipTumbling(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Confianza, Limpieza y Conexión durante la rutina (Habilidades de Gimnasia)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <div>
            <p className="text-xs uppercase tracking-wide opacity-60 font-medium">Total Planilla Tumbling</p>
            <p className="text-xs opacity-40 mt-0.5">
              Gimnasia + Creatividad ({fmt(creativityTumbling)}) + Showmanship ({fmt(showmanshipTumbling)})
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* ── Score summary table ───────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {tCfg.hasStanding && tCfg.standingHasDiff && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Estática — Rango Base</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(standingDiffEff)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Estática — Habilidad</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(standingHabEff)}</td>
                  </tr>
                </>
              )}
              {tCfg.hasStanding && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Estática — Ejecución</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(standingExecTotal)}</td>
                </tr>
              )}
              {tCfg.hasRunning && tCfg.runningHasDiff && (
                <>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Rango Base</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(runningDiffEff)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Habilidad</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(runningHabEff)}</td>
                  </tr>
                </>
              )}
              {tCfg.hasRunning && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Con Carrera — Ejecución</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(runningExecTotal)}</td>
                </tr>
              )}
              {tCfg.hasJumps && tCfg.jumpsHasDiff && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Saltos — Dificultad</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(jumpsDiffEff)}</td>
                </tr>
              )}
              {tCfg.hasJumps && (
                <tr>
                  <td className="px-4 py-2.5 text-zinc-600">Saltos — Ejecución</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(jumpsExecTotal)}</td>
                </tr>
              )}
              <tr className="bg-zinc-50">
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--brand-primary)' }}>Subtotal Gimnasia</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>{fmt(tumblingSubtotal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(creativityTumbling)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Showmanship (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(showmanshipTumbling)}</td>
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
