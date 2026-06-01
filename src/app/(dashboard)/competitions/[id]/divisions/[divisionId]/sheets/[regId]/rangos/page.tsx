'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import { getScoringConfig, DEFAULT_BUILDING_CONFIG, DEFAULT_TUMBLING_CONFIG } from '@/lib/scoringConfig';
import { useJudge } from '@/hooks/useJudge';
import type { BuildingConfig, TumblingConfig } from '@/lib/scoringConfig';
import type { ScoreSheet } from '@/types/competitions';

function fmt(n: number) { return n.toFixed(2); }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RangosSheetPage() {
  const router = useRouter();
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
  const [tCfg,          setTCfg]          = useState<TumblingConfig>(DEFAULT_TUMBLING_CONFIG);

  // ── Stunts difficulty ─────────────────────────────────────────────────────
  const [stuntsRango,   setStuntsRango]   = useState<number>(0);
  const [stuntsSkills,  setStuntsSkills]  = useState<number[]>([0, 0, 0, 0, 0]);
  const [stuntsPartMax, setStuntsPartMax] = useState<number>(0.0);

  // ── Pyramids difficulty ───────────────────────────────────────────────────
  const [pyramidsRangeIdx, setPyramidsRangeIdx] = useState<number | null>(null);
  const [pyramidsFine,     setPyramidsFine]     = useState<number>(0.0);

  // ── Tosses difficulty ─────────────────────────────────────────────────────
  const [tossesDiff, setTossesDiff] = useState<number>(0.0);

  // ── Standing (Estática) difficulty ────────────────────────────────────────
  const [standingRango,     setStandingRango]     = useState<number>(0);
  const [standingHabilidad, setStandingHabilidad] = useState<number>(0.0);

  // ── Running (Con Carrera) difficulty ─────────────────────────────────────
  const [runningRango,     setRunningRango]     = useState<number>(0);
  const [runningHabilidad, setRunningHabilidad] = useState<number>(0.0);

  // ── Jumps difficulty ──────────────────────────────────────────────────────
  const [jumpsDiff, setJumpsDiff] = useState<number>(0);

  // ── Notes ─────────────────────────────────────────────────────────────────
  const [construccionesNotes, setConstruccionesNotes] = useState('');
  const [gimnasiaNotes,       setGimnasiaNotes]       = useState('');

  // ── Computed ──────────────────────────────────────────────────────────────
  const stuntsSkillsTotal  = parseFloat(stuntsSkills.reduce((s, v) => s + v, 0).toFixed(2));
  const stuntsDriversTotal = parseFloat((stuntsSkillsTotal + stuntsPartMax).toFixed(2));
  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + pyramidsFine).toFixed(2))
    : 0.0;

  const standingDiff = tCfg.standingHasDiff ? standingRango : 0;
  const standingDrvs = tCfg.standingHasDiff ? standingHabilidad : 0;
  const runningDiff  = tCfg.runningHasDiff  ? runningRango  : 0;
  const runningDrvs  = tCfg.runningHasDiff  ? runningHabilidad  : 0;
  const jumpsDiffEffective = tCfg.jumpsHasDiff ? jumpsDiff : 0;

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
      const bcfg = sysConfig.building;
      const tcfg = sysConfig.tumbling;
      setBCfg(bcfg);
      setTCfg(tcfg);

      // Config-based defaults
      if (bcfg.stuntsHasDiff && bcfg.stuntsRango.length > 0) setStuntsRango(bcfg.stuntsRango[0].value);
      else setStuntsRango(0);
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

        // Stunts
        if (sheet.stunts_difficulty) {
          const v = parseFloat(sheet.stunts_difficulty);
          if (bcfg.stuntsRango.some(r => r.value === v)) setStuntsRango(v);
        }

        // Pyramids
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = bcfg.pyramidRango.findIndex((r) => v >= r.low && v <= r.high);
          if (idx !== -1) {
            setPyramidsRangeIdx(idx);
            const fine = parseFloat((v - bcfg.pyramidRango[idx].low).toFixed(1));
            setPyramidsFine(bcfg.pyramidFineSteps.includes(fine) ? fine : 0.0);
          }
        }

        // Tosses
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          const match = bcfg.tossDiffOpts.find((o) => o.value === v);
          if (match) setTossesDiff(match.value);
        }

        // Standing
        if (sheet.standing_difficulty) {
          const v = parseFloat(sheet.standing_difficulty);
          const match = tcfg.standingRango.find((o) => o.value === v);
          if (match) setStandingRango(match.value);
        }
        if (sheet.standing_drivers) {
          const v = parseFloat(sheet.standing_drivers);
          const match = tcfg.standingHabilidad.find((o) => o.value === v);
          if (match) setStandingHabilidad(match.value);
        }

        // Running
        if (sheet.running_difficulty) {
          const v = parseFloat(sheet.running_difficulty);
          const match = tcfg.runningRango.find((o) => o.value === v);
          if (match) setRunningRango(match.value);
        }
        if (sheet.running_drivers) {
          const v = parseFloat(sheet.running_drivers);
          const match = tcfg.runningHabilidad.find((o) => o.value === v);
          if (match) setRunningHabilidad(match.value);
        }

        // Jumps
        if (sheet.jumps_difficulty) {
          const v = parseFloat(sheet.jumps_difficulty);
          const match = tcfg.jumpsDiffOpts.find((o) => o.value === v);
          if (match) setJumpsDiff(match.value);
        }

        // Notes + raw score restoration
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            if (p._scores) {
              const s = p._scores;
              if (s.stuntsRango !== undefined && bcfg.stuntsRango.some(r => r.value === s.stuntsRango)) setStuntsRango(s.stuntsRango);
              if (Array.isArray(s.stuntsSkills)) {
                setStuntsSkills([0, 0, 0, 0, 0].map((_, i) => s.stuntsSkills[i] ?? 0));
              }
              if (s.stuntsPartMax !== undefined && bcfg.stuntsPartMaxOpts.some(o => o.value === s.stuntsPartMax)) setStuntsPartMax(s.stuntsPartMax);
            }
            setConstruccionesNotes(p.construcciones ?? '');
            setGimnasiaNotes(p.gimnasia ?? '');
          } catch {
            setConstruccionesNotes(sheet.notes);
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
        stunts_difficulty:   String(stuntsRango),
        stunts_drivers:      String(stuntsDriversTotal),
        pyramids_difficulty: String(pyramidsDiff),
        tosses_difficulty:   String(tossesDiff),
        standing_difficulty: String(standingDiff),
        standing_drivers:    String(standingDrvs),
        running_difficulty:  String(runningDiff),
        running_drivers:     String(runningDrvs),
        jumps_difficulty:    String(jumpsDiffEffective),
        notes: JSON.stringify({
          construcciones: construccionesNotes,
          gimnasia: gimnasiaNotes,
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
      toast.success('Rangos guardados');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-zinc-50 pb-16">

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-zinc-200 px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/competitions/${competitionId}/divisions/${divId}`)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Rangos (Dificultad)</p>
            <p className="text-sm font-semibold text-zinc-900 leading-tight">
              {teamName || `Inscripción #${registrationId}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-8 items-start">

        {/* ══ CONSTRUCCIONES ════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-6">
            Construcciones
          </h1>

          {/* ── ELEVACIONES ─────────────────────────────────────────────── */}
          {bCfg.hasStunts ? (
            <section className="flex flex-col gap-4 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Elevaciones — Stunts
              </h2>

              {!bCfg.stuntsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rango Base de Complejidad</span>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      {bCfg.stuntsRango.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStuntsRango(value)}
                          className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                            stuntsRango === value
                              ? 'border-transparent'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                          }`}
                          style={stuntsRango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                        >
                          <span>{label}</span>
                          <span className={`text-base font-bold tabular-nums ${stuntsRango === value ? 'text-white' : 'text-zinc-400'}`}>
                            {value.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grado de Dificultad per skill */}
                  {bCfg.stuntsSkillCount > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Grado de Dificultad — Habilidades</span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {stuntSkillLabels.map((skill, i) => (
                          <div key={skill} className="flex items-center gap-3 px-4 py-2.5">
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
                                  {value > 0 && <span className="ml-1 opacity-70">+{value.toFixed(2)}</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between px-4 py-2.5 bg-zinc-50 border-t border-zinc-100 text-xs">
                        <span className="text-zinc-500">
                          Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}
                        </span>
                        <span className="font-bold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                      </div>
                    </div>
                  )}

                  {/* Part Max */}
                  {bCfg.stuntsPartMaxOpts.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Part Max — Spotter / Base</span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                      </div>
                      <div className="p-4">
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
                    </div>
                  )}

                  {/* Stunts subtotal */}
                  <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-xs uppercase tracking-wide opacity-60">Total Elevaciones</span>
                      <span>Dif: <strong className="tabular-nums">{fmt(stuntsRango)}</strong></span>
                      <span>Drivers: <strong className="tabular-nums">{fmt(stuntsDriversTotal)}</strong></span>
                    </div>
                    <span className="text-xl font-bold tabular-nums">
                      {fmt(parseFloat((stuntsRango + stuntsDriversTotal).toFixed(2)))}
                    </span>
                  </div>
                </>
              )}
            </section>
          ) : (
            <section className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Elevaciones — Stunts</h2>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">No Aplica para esta División</p>
              </div>
            </section>
          )}

          {/* ── PIRÁMIDES ───────────────────────────────────────────────── */}
          {bCfg.hasPyramids ? (
            <section className="flex flex-col gap-4 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pirámides</h2>

              {!bCfg.pyramidsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rango de Complejidad</span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {bCfg.pyramidRango.map(({ low, high, label }, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPyramidsRangeIdx(idx);
                          setPyramidsFine(0.0);
                        }}
                        className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                          pyramidsRangeIdx === idx
                            ? 'border-transparent'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                        style={pyramidsRangeIdx === idx ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                      >
                        <span>{label}</span>
                        <span className={`text-sm font-bold tabular-nums ${pyramidsRangeIdx === idx ? 'text-white' : 'text-zinc-400'}`}>
                          {low.toFixed(1)} – {high.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>

                  {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                    <div className="border-t border-zinc-200 px-4 py-3 bg-zinc-50">
                      <p className="text-xs font-medium text-zinc-500 mb-2">
                        Ajuste fino — rango {bCfg.pyramidRango[pyramidsRangeIdx].low.toFixed(1)}–{bCfg.pyramidRango[pyramidsRangeIdx].high.toFixed(1)}
                      </p>
                      <div className="flex gap-1.5">
                        {bCfg.pyramidFineSteps.map((step) => {
                          const val = parseFloat((bCfg.pyramidRango[pyramidsRangeIdx].low + step).toFixed(1));
                          return (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setPyramidsFine(step)}
                              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors border ${
                                pyramidsFine === step
                                  ? 'border-transparent'
                                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-amber-400 hover:text-amber-700'
                              }`}
                              style={pyramidsFine === step ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-accent)' } : undefined}
                            >
                              {val.toFixed(1)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between px-4 py-2.5 border-t border-zinc-200 text-xs">
                    <span className="text-zinc-500">Pirámides — Dificultad</span>
                    <span className="font-bold text-zinc-900">{fmt(pyramidsDiff)}</span>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {/* ── LANZAMIENTOS ────────────────────────────────────────────── */}
          {bCfg.hasTosses && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lanzamientos — Tosses</h2>

              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {bCfg.tossDiffOpts.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTossesDiff(value)}
                      className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                        tossesDiff === value
                          ? 'border-transparent'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                      }`}
                      style={tossesDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                    >
                      <span>{label}</span>
                      <span className={`text-base font-bold tabular-nums ${tossesDiff === value ? 'text-white' : 'text-zinc-400'}`}>
                        {value === 0 ? '—' : value.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Comentarios Construcciones */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden mt-4">
            <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Construcciones</span>
            </div>
            <div className="p-3">
              <textarea value={construccionesNotes} onChange={(e) => setConstruccionesNotes(e.target.value)}
                placeholder="Observaciones sobre Elevaciones, Pirámides y Lanzamientos..." rows={4}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
          </div>
        </div>

        {/* ══ GIMNASIA ══════════════════════════════════════════════════════ */}
        <div>
          <h1 className="text-[10px] font-bold uppercase tracking-widest text-green-500 mb-6">
            Gimnasia
          </h1>

          {/* ── ESTÁTICA ────────────────────────────────────────────────── */}
          {tCfg.hasStanding ? (
            <section className="flex flex-col gap-4 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Gimnasia Estática (Standing)
              </h2>

              {!tCfg.standingHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <TumblingDiffCard
                    label="Rango Base"
                    options={tCfg.standingRango}
                    selected={standingRango}
                    onSelect={setStandingRango}
                  />
                  <TumblingDiffCard
                    label="Habilidad"
                    options={tCfg.standingHabilidad}
                    selected={standingHabilidad}
                    onSelect={setStandingHabilidad}
                    accent="emerald"
                  />

                  <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-xs uppercase tracking-wide opacity-60">Total Estática</span>
                      <span>Rango: <strong className="tabular-nums">{fmt(standingDiff)}</strong></span>
                      <span>Hab: <strong className="tabular-nums">{fmt(standingDrvs)}</strong></span>
                    </div>
                    <span className="text-xl font-bold tabular-nums">
                      {fmt(parseFloat((standingDiff + standingDrvs).toFixed(2)))}
                    </span>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {/* ── CON CARRERA ─────────────────────────────────────────────── */}
          {tCfg.hasRunning ? (
            <section className="flex flex-col gap-4 mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Gimnasia Con Carrera (Running)
              </h2>

              {!tCfg.runningHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <>
                  <TumblingDiffCard
                    label="Rango Base"
                    options={tCfg.runningRango}
                    selected={runningRango}
                    onSelect={setRunningRango}
                  />
                  <TumblingDiffCard
                    label="Habilidad"
                    options={tCfg.runningHabilidad}
                    selected={runningHabilidad}
                    onSelect={setRunningHabilidad}
                    accent="emerald"
                  />

                  <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-xs uppercase tracking-wide opacity-60">Total Con Carrera</span>
                      <span>Rango: <strong className="tabular-nums">{fmt(runningDiff)}</strong></span>
                      <span>Hab: <strong className="tabular-nums">{fmt(runningDrvs)}</strong></span>
                    </div>
                    <span className="text-xl font-bold tabular-nums">
                      {fmt(parseFloat((runningDiff + runningDrvs).toFixed(2)))}
                    </span>
                  </div>
                </>
              )}
            </section>
          ) : null}

          {/* ── SALTOS ──────────────────────────────────────────────────── */}
          {tCfg.hasJumps && (
            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Saltos (Jumps)
              </h2>

              {!tCfg.jumpsHasDiff ? (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                  <p className="text-sm text-zinc-400 mt-1">Solo Ejecución — no se califica rango aquí</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {tCfg.jumpsDiffOpts.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setJumpsDiff(value)}
                        className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
                          jumpsDiff === value
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`text-base font-bold tabular-nums ${jumpsDiff === value ? 'text-white' : 'text-zinc-400'}`}>
                          {value.toFixed(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Comentarios Gimnasia */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden mt-4">
            <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Gimnasia</span>
            </div>
            <div className="p-3">
              <textarea value={gimnasiaNotes} onChange={(e) => setGimnasiaNotes(e.target.value)}
                placeholder="Observaciones sobre Estática, Con Carrera y Saltos..." rows={4}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
          </div>
        </div>

        </div>{/* end grid */}
      </div>
    </div>
  );
}

// ── Reusable option-list card ────────────────────────────────────────────────
function TumblingDiffCard({
  label,
  options,
  selected,
  onSelect,
  accent = 'zinc',
}: {
  label: string;
  options: { value: number; label: string }[];
  selected: number;
  onSelect: (v: number) => void;
  accent?: 'zinc' | 'emerald';
}) {
  const activeClass = 'border-transparent';
  const activeStyle = accent === 'emerald'
    ? { backgroundColor: 'var(--brand-accent)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-accent)' }
    : { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' };
  const hoverClass  = accent === 'emerald'
    ? 'hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
    : 'hover:border-zinc-600 hover:bg-zinc-50';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {options.map(({ value, label: optLabel }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors border ${
              selected === value
                ? activeClass
                : `bg-white text-zinc-700 border-zinc-300 ${hoverClass}`
            }`}
            style={selected === value ? activeStyle : undefined}
          >
            <span>{optLabel}</span>
            <span className={`text-base font-bold tabular-nums ${selected === value ? 'text-white' : 'text-zinc-400'}`}>
              {value.toFixed(1)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
