'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_TUMBLING_CONFIG } from '@/lib/scoringConfig';
import { useJudge } from '@/hooks/useJudge';
import { toastApiError } from '@/utils/apiErrors';
import type { TumblingConfig } from '@/lib/scoringConfig';
import type { ScoreSheet, UnpaidAthlete } from '@/types/competitions';
import { PaymentWarningBanner } from '@/components/competitions/PaymentWarningBanner';

function fmt(n: number) { return n.toFixed(2); }

function SectionTotal({ label, breakdown, total }: {
  label: string; breakdown: { key: string; value: number }[]; total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
        {breakdown.map(({ key, value }) => <span key={key}>{key}: <strong className="tabular-nums">{fmt(value)}</strong></span>)}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
    </div>
  );
}

function TumblingDiffCard({ label, rangoOpts, habilidadOpts, rango, onRango, habilidad, onHabilidad }: {
  label: string;
  rangoOpts: { value: number; label: string }[];
  habilidadOpts: { value: number; label: string }[];
  rango: number; onRango: (v: number) => void;
  habilidad: number; onHabilidad: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Dificultad</span>
      </div>
      <div className="p-4 flex flex-col gap-5">
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
          <div className="flex flex-col gap-1.5">
            {rangoOpts.map(({ label: lbl, value }) => (
              <button key={value} type="button" onClick={() => onRango(value)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${rango === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'}`}
                style={rango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
              >
                <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${rango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                <span className="flex-1">{lbl}</span>
              </button>
            ))}
          </div>
        </div>
        {habilidadOpts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Habilidad Realizada o Gran Parte</p>
            <div className="flex gap-1.5">
              {habilidadOpts.map(({ label: lbl, value }) => (
                <button key={value} type="button" onClick={() => onHabilidad(value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors border ${habilidad === value ? 'border-transparent' : 'bg-white text-zinc-600 border-zinc-300 hover:border-violet-400 hover:text-violet-700'}`}
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
          <span className="text-zinc-500">Base {fmt(rango)} + habilidad {fmt(habilidad)}</span>
          <span className="font-semibold text-zinc-900">Total: {fmt(rango + habilidad)}</span>
        </div>
      </div>
    </div>
  );
}

export default function TumblingDifficultyPage() {
  const router = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const { isJudge, isCompetitionActive } = useJudge();
  const readOnly = !isJudge;

  useEffect(() => {
    if (isJudge && !isCompetitionActive(competitionId)) {
      toast.error('El evento ha finalizado.');
      router.replace(`/competitions/${competitionId}`);
    }
  }, [isJudge, competitionId, isCompetitionActive, router]);

  const [teamName,       setTeamName]       = useState('');
  const [existingSheet,  setExistingSheet]  = useState<ScoreSheet | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [tCfg,           setTCfg]           = useState<TumblingConfig>(DEFAULT_TUMBLING_CONFIG);
  const [unpaidAthletes, setUnpaidAthletes] = useState<UnpaidAthlete[]>([]);
  const [requirePayment, setRequirePayment] = useState(false);

  const [standingRango,    setStandingRango]    = useState<number>(0);
  const [standingHabilidad, setStandingHabilidad] = useState<number>(0.0);
  const [runningRango,     setRunningRango]     = useState<number>(0);
  const [runningHabilidad, setRunningHabilidad] = useState<number>(0.0);
  const [jumpsDiff,        setJumpsDiff]        = useState<number>(0);
  const [creativityTumbling,  setCreativityTumbling]  = useState<number>(0.0);
  const [showmanshipTumbling, setShowmanshipTumbling] = useState<number>(0.0);
  const [standingNotes, setStandingNotes] = useState('');
  const [runningNotes,  setRunningNotes]  = useState('');
  const [jumpsNotes,    setJumpsNotes]    = useState('');

  const standingDiffEff = tCfg.standingHasDiff ? standingRango : 0;
  const standingHabEff  = tCfg.standingHasDiff ? standingHabilidad : 0;
  const runningDiffEff  = tCfg.runningHasDiff  ? runningRango  : 0;
  const runningHabEff   = tCfg.runningHasDiff  ? runningHabilidad  : 0;
  const jumpsDiffEff    = tCfg.jumpsHasDiff    ? jumpsDiff     : 0;

  const diffSubtotal = parseFloat((
    (tCfg.hasStanding ? standingDiffEff + standingHabEff : 0) +
    (tCfg.hasRunning  ? runningDiffEff + runningHabEff   : 0) +
    (tCfg.hasJumps    ? jumpsDiffEff                     : 0)
  ).toFixed(2));
  const sheetTotal = parseFloat((diffSubtotal + creativityTumbling + showmanshipTumbling).toFixed(2));

  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes, divRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
        competitionsRepository.getDivision(divId),
      ]);
      const reg = regRes.data.results.find(r => r.id === registrationId);
      if (reg) { setTeamName(reg.team_name); setUnpaidAthletes(reg.unpaid_athletes); setRequirePayment(reg.competition_require_payment); }
      const tcfg = getScoringConfig(divRes.data).tumbling;
      setTCfg(tcfg);

      if (tcfg.standingHasDiff && tcfg.standingRango.length > 0) setStandingRango(tcfg.standingRango[0].value);
      if (tcfg.runningHasDiff  && tcfg.runningRango.length  > 0) setRunningRango(tcfg.runningRango[0].value);
      if (tcfg.jumpsHasDiff    && tcfg.jumpsDiffOpts.length > 0) setJumpsDiff(tcfg.jumpsDiffOpts[0].value);

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        if (sheet.standing_difficulty) {
          const v = parseFloat(sheet.standing_difficulty);
          const match = tcfg.standingRango.find(o => o.value === v);
          if (match) setStandingRango(v);
        }
        if (sheet.standing_drivers) {
          const v = parseFloat(sheet.standing_drivers);
          const match = tcfg.standingHabilidad.find(o => o.value === v);
          if (match) setStandingHabilidad(v);
        }
        if (sheet.running_difficulty) {
          const v = parseFloat(sheet.running_difficulty);
          const match = tcfg.runningRango.find(o => o.value === v);
          if (match) setRunningRango(v);
        }
        if (sheet.running_drivers) {
          const v = parseFloat(sheet.running_drivers);
          const match = tcfg.runningHabilidad.find(o => o.value === v);
          if (match) setRunningHabilidad(v);
        }
        if (sheet.jumps_difficulty) {
          const v = parseFloat(sheet.jumps_difficulty);
          const match = tcfg.jumpsDiffOpts.find(o => o.value === v);
          if (match) setJumpsDiff(v);
        }
        if (sheet.creativity_tumbling)  setCreativityTumbling(Math.min(2.0, parseFloat(sheet.creativity_tumbling)));
        if (sheet.showmanship_tumbling) setShowmanshipTumbling(Math.min(tcfg.showmanshipMax, parseFloat(sheet.showmanship_tumbling)));

        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setStandingNotes(p.td_standing ?? '');
            setRunningNotes(p.td_running ?? '');
            setJumpsNotes(p.td_jumps ?? '');
          } catch { /* noop */ }
        }
      }
    } finally { setLoading(false); }
  }, [registrationId, divId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const notesPayload = (() => {
        let existing: Record<string, unknown> = {};
        try { existing = JSON.parse(existingSheet?.notes ?? '{}'); } catch { /* noop */ }
        return JSON.stringify({ ...existing, td_standing: standingNotes, td_running: runningNotes, td_jumps: jumpsNotes });
      })();

      const payload: Partial<ScoreSheet> = {
        standing_difficulty:  String(tCfg.hasStanding ? standingDiffEff   : 0),
        standing_drivers:     String(tCfg.hasStanding ? standingHabEff    : 0),
        running_difficulty:   String(tCfg.hasRunning  ? runningDiffEff    : 0),
        running_drivers:      String(tCfg.hasRunning  ? runningHabEff     : 0),
        jumps_difficulty:     String(tCfg.hasJumps    ? jumpsDiffEff      : 0),
        creativity_tumbling:  String(tCfg.hasCreativity ? creativityTumbling : 0),
        showmanship_tumbling: String(showmanshipTumbling),
        notes: notesPayload,
      };

      let saved: ScoreSheet;
      if (existingSheet) {
        const res = await competitionsRepository.updateScoreSheet(existingSheet.id, payload);
        saved = res.data;
      } else {
        const res = await competitionsRepository.createScoreSheet({ registration: registrationId as unknown as number, ...payload } as Partial<ScoreSheet>);
        saved = res.data;
      }
      setExistingSheet(saved);
      toast.success('Planilla guardada');
    } catch (err) {
      toastApiError(err);
    } finally { setSaving(false); }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Dificultad Gimnasia</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">{teamName || `Inscripción #${registrationId}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total planilla</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900">{fmt(sheetTotal)}</p>
          </div>
          {readOnly ? (
            <span className="text-xs font-medium text-zinc-400 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200">Solo lectura</span>
          ) : (
            <Button onClick={handleSave} loading={saving} disabled={requirePayment && unpaidAthletes.length > 0}>
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          )}
        </div>
      </div>
      {readOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Solo lectura — solo los jueces asignados pueden calificar.</p>
        </div>
      )}
      <PaymentWarningBanner unpaidAthletes={unpaidAthletes} requirePayment={requirePayment} />

      <div className={`max-w-4xl mx-auto px-6 py-8 flex flex-col gap-10${readOnly ? ' pointer-events-none select-none opacity-75' : ''}`}>

        {tCfg.hasStanding && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">{tCfg.isCombinedSR ? 'Gimnasia Estática / Con Carrera' : 'Gimnasia Estática (Standing)'}</h2>
            {tCfg.standingHasDiff ? (
              <TumblingDiffCard label="Estática" rangoOpts={tCfg.standingRango} habilidadOpts={tCfg.standingHabilidad} rango={standingRango} onRango={setStandingRango} habilidad={standingHabilidad} onHabilidad={setStandingHabilidad} />
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-center">
                <p className="text-xs text-zinc-400">Sin dificultad — solo ejecución para esta división</p>
              </div>
            )}
            <SectionTotal label="Total Estática" breakdown={[{ key: 'Base', value: standingDiffEff }, { key: 'Hab', value: standingHabEff }]} total={standingDiffEff + standingHabEff} />
          </section>
        )}

        {tCfg.hasRunning && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Gimnasia con Carrera (Running)</h2>
            {tCfg.runningHasDiff ? (
              <TumblingDiffCard label="Con Carrera" rangoOpts={tCfg.runningRango} habilidadOpts={tCfg.runningHabilidad} rango={runningRango} onRango={setRunningRango} habilidad={runningHabilidad} onHabilidad={setRunningHabilidad} />
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-center">
                <p className="text-xs text-zinc-400">Sin dificultad — solo ejecución para esta división</p>
              </div>
            )}
            <SectionTotal label="Total Carrera" breakdown={[{ key: 'Base', value: runningDiffEff }, { key: 'Hab', value: runningHabEff }]} total={runningDiffEff + runningHabEff} />
          </section>
        )}

        {tCfg.hasJumps && tCfg.jumpsHasDiff && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Saltos — Dificultad</h2>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad — Saltos Avanzados</span>
              </div>
              <div className="p-4 flex flex-col gap-1.5">
                {tCfg.jumpsDiffOpts.map(({ label, value }) => (
                  <button key={value} type="button" onClick={() => setJumpsDiff(value)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${jumpsDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'}`}
                    style={jumpsDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                  >
                    <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${jumpsDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                    <span className="flex-1">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <SectionTotal label="Total Saltos" breakdown={[{ key: 'Dif', value: jumpsDiffEff }]} total={jumpsDiffEff} />
          </section>
        )}

        {/* ── Subtotal ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Dificultad</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(diffSubtotal)}</span>
        </div>

        {/* ── Creativity + Showmanship ──────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">{tCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>
          <div className={`grid gap-4 ${tCfg.hasCreativity ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {tCfg.hasCreativity && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityTumbling)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="2.0" step="0.1" value={creativityTumbling} onChange={e => setCreativityTumbling(parseFloat(e.target.value))} className="flex-1 accent-zinc-900" />
                    <input type="number" min="0" max="2.0" step="0.1" value={creativityTumbling} onChange={e => setCreativityTumbling(parseFloat(Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0)).toFixed(2)))} className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                  <p className="text-[11px] text-zinc-400">Creatividad, Innovación y/o visual durante la rutina</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{tCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipTumbling)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max={tCfg.showmanshipMax} step="0.1" value={showmanshipTumbling} onChange={e => setShowmanshipTumbling(parseFloat(e.target.value))} className="flex-1 accent-zinc-900" />
                  <input type="number" min="0" max={tCfg.showmanshipMax} step="0.1" value={showmanshipTumbling} onChange={e => setShowmanshipTumbling(parseFloat(Math.min(tCfg.showmanshipMax, Math.max(0, parseFloat(e.target.value) || 0)).toFixed(2)))} className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
                <p className="text-[11px] text-zinc-400">{tCfg.hasCreativity ? 'Confianza, Limpieza y Conexión' : 'Cheer / Animación — máx 5.0'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Observations */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {[
              { key: 'standing', label: 'Estática', value: standingNotes, set: setStandingNotes, show: tCfg.hasStanding },
              { key: 'running',  label: 'Con Carrera', value: runningNotes, set: setRunningNotes, show: tCfg.hasRunning },
              { key: 'jumps',    label: 'Saltos', value: jumpsNotes, set: setJumpsNotes, show: tCfg.hasJumps },
            ].filter(s => s.show).map(({ key, label, value, set }) => (
              <div key={key} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{label}</p>
                <textarea value={value} onChange={e => set(e.target.value)} placeholder={`Observaciones sobre ${label}...`} rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            ))}
          </div>
        </div>

        {/* Grand total */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <div>
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla — Dificultad Gimnasia</p>
            <p className="text-xs opacity-70 mt-0.5">Dif. + Creatividad ({fmt(creativityTumbling)}) + Showmanship ({fmt(showmanshipTumbling)})</p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>
      </div>
    </div>
  );
}
