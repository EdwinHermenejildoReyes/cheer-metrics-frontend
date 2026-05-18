'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { ScoreSheet } from '@/types/competitions';

// ── Paper-form execution maxima ──────────────────────────────────────────────
const STUNTS_EXEC_MAX  = 4.00;
const PYRAMIDS_EXEC_MAX = 4.00;
const TOSSES_EXEC_MAX  = 2.00;

// ── Selection options ────────────────────────────────────────────────────────
const STUNT_RANGO = [
  { value: 3.5, label: 'No cumple con 4.0' },
  { value: 4.0, label: '4 Acumulativas' },
  { value: 4.5, label: '2 Habilidades Diferentes' },
  { value: 5.0, label: '3 Habilidades Diferentes' },
  { value: 5.5, label: '4 Habilidades Diferentes' },
  { value: 6.0, label: '5 Had Dif / 1 Hab Coed (Niv 3/4.2/4)' },
];
const STUNT_SKILLS = ['Habilidad #1', 'Habilidad #2', 'Habilidad #3', 'Habilidad #4', 'Habilidad #5 / Coed'];
const SKILL_GRADES = [
  { label: 'No Cumple', value: 0 },
  { label: 'Avanzado',  value: 0.10 },
  { label: 'Elite',     value: 0.20 },
];
const PART_MAX_OPTS = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.1, label: 'Nivel x MÁX · Avz x GRAN PARTE' },
  { value: 0.3, label: 'Avz x MÁX · Elite x GRAN PARTE' },
  { value: 0.5, label: 'Elite x MÁX' },
];
const PYRAMID_RANGO = [
  { low: 3.0, high: 3.5, label: 'No cumple con 3.5' },
  { low: 3.5, high: 4.0, label: '2 Hab Dif + 2 Estructuras' },
  { low: 4.0, high: 4.5, label: '3 Hab Dif + 2 Estructuras' },
  { low: 4.5, high: 5.0, label: '4 Hab Dif + 2 Estructuras' },
  { low: 5.0, high: 5.5, label: '5 Hab Dif + 2 Estructuras' },
];
const PYRAMID_FINE_STEPS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];
const TOSS_DIFF_OPTS = [0.0, 1.0, 1.5, 2.0];
const EXEC_CATS      = ['Volante', 'Base/Spotter', 'Transición', 'Sincronización'];
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

// ── Execution sub-component ──────────────────────────────────────────────────
function ExecSection({
  label, max, deds, onChange,
}: {
  label: string;
  max: number;
  deds: ExecDeds;
  onChange: (deds: ExecDeds) => void;
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
        {EXEC_CATS.map((cat, i) => (
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
    <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-5 py-3 text-white">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-zinc-400 text-xs uppercase tracking-wide">{label}</span>
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

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // ── Stunts – difficulty ───────────────────────────────────────────────────
  const [stuntsRango,    setStuntsRango]    = useState<number>(3.5);
  const [stuntsSkills,   setStuntsSkills]   = useState<number[]>([0, 0, 0, 0, 0]);
  const [stuntsPartMax,  setStuntsPartMax]  = useState<number>(0.0);
  const [stuntsExecDeds, setStuntsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Pyramids ──────────────────────────────────────────────────────────────
  const [pyramidsRangeIdx,  setPyramidsRangeIdx]  = useState<number | null>(null);
  const [pyramidsFine,      setPyramidsFine]      = useState<number>(0.0);
  const [pyramidsExecDeds, setPyramidsExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Tosses ────────────────────────────────────────────────────────────────
  const [tossesDiff,    setTossesDiff]    = useState<number>(0.0);
  const [tossesExecDeds, setTossesExecDeds] = useState<ExecDeds>([...EMPTY_EXEC]);

  // ── Cross-sheet ───────────────────────────────────────────────────────────
  const [creativityBuilding,  setCreativityBuilding]  = useState<number>(0.0);
  const [showmanshipBuilding, setShowmanshipBuilding] = useState<number>(0.0);

  const [notes, setNotes] = useState('');

  // ── Computed totals ───────────────────────────────────────────────────────
  const stuntsDiffTotal   = parseFloat((stuntsRango + stuntsSkills.reduce((s, v) => s + v, 0)).toFixed(2));
  const stuntsExecTotal   = execScore(STUNTS_EXEC_MAX, stuntsExecDeds);
  const stuntsSectionTotal = parseFloat((stuntsDiffTotal + stuntsExecTotal + stuntsPartMax).toFixed(2));

  const pyramidsDiff = pyramidsRangeIdx !== null
    ? parseFloat((PYRAMID_RANGO[pyramidsRangeIdx].low + pyramidsFine).toFixed(1))
    : 0.0;
  const pyramidsExecTotal   = execScore(PYRAMIDS_EXEC_MAX, pyramidsExecDeds);
  const pyramidsSectionTotal = parseFloat((pyramidsDiff + pyramidsExecTotal).toFixed(2));

  const tossesExecTotal   = execScore(TOSSES_EXEC_MAX, tossesExecDeds);
  const tossesSectionTotal = parseFloat((tossesDiff + tossesExecTotal).toFixed(2));

  const buildingTotal = parseFloat((stuntsSectionTotal + pyramidsSectionTotal + tossesSectionTotal).toFixed(2));
  const sheetTotal    = parseFloat((buildingTotal + creativityBuilding + showmanshipBuilding).toFixed(2));

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [sheetRes, regRes] = await Promise.all([
        competitionsRepository.listScoreSheets({ registration: String(registrationId) }),
        competitionsRepository.listRegistrations({ division: String(divId), page_size: '100' }),
      ]);

      const reg = regRes.data.results.find((r) => r.id === registrationId);
      if (reg) setTeamName(reg.team_name);

      if (sheetRes.data.results.length > 0) {
        const sheet = sheetRes.data.results[0];
        setExistingSheet(sheet);
        if (!reg) setTeamName(sheet.team_name);

        // Pre-populate numeric fields where possible
        if (sheet.pyramids_difficulty) {
          const v = parseFloat(sheet.pyramids_difficulty);
          const idx = PYRAMID_RANGO.findIndex(r => v >= r.low && v <= r.high);
          if (idx >= 0) {
            setPyramidsRangeIdx(idx);
            setPyramidsFine(parseFloat((v - PYRAMID_RANGO[idx].low).toFixed(1)));
          }
        }
        if (sheet.tosses_difficulty) {
          const v = parseFloat(sheet.tosses_difficulty);
          setTossesDiff(TOSS_DIFF_OPTS.includes(v) ? v : 0.0);
        }
        if (sheet.stunts_drivers) {
          const v = parseFloat(sheet.stunts_drivers);
          setStuntsPartMax(PART_MAX_OPTS.some((o) => o.value === v) ? v : 0.0);
        }
        if (sheet.creativity_building) {
          setCreativityBuilding(Math.min(2.0, parseFloat(sheet.creativity_building)));
        }
        if (sheet.showmanship_building) {
          setShowmanshipBuilding(Math.min(2.0, parseFloat(sheet.showmanship_building)));
        }
        if (sheet.notes) setNotes(sheet.notes);
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
        stunts_difficulty:    String(stuntsDiffTotal),
        stunts_execution:     String(stuntsExecTotal),
        stunts_drivers:       String(stuntsPartMax),
        pyramids_difficulty:  String(pyramidsDiff),
        pyramids_execution:   String(pyramidsExecTotal),
        tosses_difficulty:    String(tossesDiff),
        tosses_execution:     String(tossesExecTotal),
        creativity_building:  String(creativityBuilding),
        showmanship_building: String(showmanshipBuilding),
        notes,
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
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — Elevaciones (Building)</p>
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

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* ── STUNTS ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Elevaciones — Stunts
          </h2>

          {/* Difficulty card */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
            </div>
            <div className="p-4 flex flex-col gap-5">

              {/* Rango Base */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
                <div className="flex flex-col gap-1.5">
                  {STUNT_RANGO.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStuntsRango(value)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                        stuntsRango === value
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                      }`}
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
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Grado de Dificultad — Habilidades (+0.10 / +0.20)</p>
                <div className="flex flex-col gap-2">
                  {STUNT_SKILLS.map((skill, i) => (
                    <div key={skill} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm text-zinc-700">{skill}</span>
                      <div className="flex flex-1 gap-1.5">
                        {SKILL_GRADES.map(({ label, value }) => (
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
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                            }`}
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
                    Base {fmt(stuntsRango)} + bonus {fmt(stuntsSkills.reduce((s, v) => s + v, 0))}
                  </span>
                  <span className="font-semibold text-zinc-900">Dificultad: {fmt(stuntsDiffTotal)}</span>
                </div>
              </div>

              {/* Part Max */}
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-0.5">Part Max — Spotter / Base</p>
                <p className="text-[10px] text-zinc-400 mb-2">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                <div className="flex flex-col gap-1.5">
                  {PART_MAX_OPTS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStuntsPartMax(value)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                        stuntsPartMax === value
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-violet-400 hover:text-violet-700'
                      }`}
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
          </div>

          {/* Execution */}
          <ExecSection label="Elevaciones" max={STUNTS_EXEC_MAX} deds={stuntsExecDeds} onChange={setStuntsExecDeds} />

          {/* Section total */}
          <SectionTotal
            label="Total Elevaciones"
            breakdown={[
              { key: 'Dif', value: stuntsDiffTotal },
              { key: 'Ejec', value: stuntsExecTotal },
              { key: 'PM', value: stuntsPartMax },
            ]}
            total={stuntsSectionTotal}
          />
        </section>

        {/* ── PYRAMIDS ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Pirámides</h2>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
              <p className="text-[10px] text-zinc-400 mt-0.5"># Habilidades Diferentes del Nivel + # Estructuras x Gran Parte</p>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Rango</p>
                <div className="flex flex-col gap-1.5">
                  {PYRAMID_RANGO.map(({ low, high, label }, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => { setPyramidsRangeIdx(idx); setPyramidsFine(0.0); }}
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors border text-left ${
                        pyramidsRangeIdx === idx
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="flex-1">{label}</span>
                      <span className={`text-sm font-bold tabular-nums ml-3 shrink-0 ${pyramidsRangeIdx === idx ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        {low.toFixed(1)}–{high.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {pyramidsRangeIdx !== null && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-2">Ajuste dentro del rango</p>
                  <div className="grid grid-cols-6 gap-1">
                    {PYRAMID_FINE_STEPS.map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => setPyramidsFine(step)}
                        className={`rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors border ${
                          pyramidsFine === step
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600'
                        }`}
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

          <ExecSection label="Pirámides" max={PYRAMIDS_EXEC_MAX} deds={pyramidsExecDeds} onChange={setPyramidsExecDeds} />

          <SectionTotal
            label="Total Pirámides"
            breakdown={[
              { key: 'Dif', value: pyramidsDiff },
              { key: 'Ejec', value: pyramidsExecTotal },
            ]}
            total={pyramidsSectionTotal}
          />
        </section>

        {/* ── TOSSES ──────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lanzamientos — Tosses</h2>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Dificultad</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-1.5">
                {TOSS_DIFF_OPTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTossesDiff(v)}
                    className={`rounded-lg py-3 text-sm font-semibold transition-colors border ${
                      tossesDiff === v
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {v === 0 ? '—' : v.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ExecSection label="Lanzamientos" max={TOSSES_EXEC_MAX} deds={tossesExecDeds} onChange={setTossesExecDeds} />

          <SectionTotal
            label="Total Lanzamientos"
            breakdown={[
              { key: 'Dif', value: tossesDiff },
              { key: 'Ejec', value: tossesExecTotal },
            ]}
            total={tossesSectionTotal}
          />
        </section>

        {/* ── BUILDING SUBTOTAL ────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-blue-600 px-5 py-4 text-white shadow-sm">
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

        {/* ── NOTES ────────────────────────────────────────────────────── */}
        <section>
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notas del juez</span>
            </div>
            <div className="p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones, comentarios sobre la rutina..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>
        </section>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl bg-zinc-900 px-6 py-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Total Planilla Building</p>
            <p className="text-xs text-zinc-500 mt-0.5">
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
              {[
                { label: 'Stunts — Dificultad',  value: stuntsDiffTotal },
                { label: 'Stunts — Ejecución',   value: stuntsExecTotal },
                { label: 'Stunts — Part Max',     value: stuntsPartMax },
                { label: 'Pirámides — Dificultad', value: pyramidsDiff },
                { label: 'Pirámides — Ejecución', value: pyramidsExecTotal },
                { label: 'Lanzamientos — Dificultad', value: tossesDiff },
                { label: 'Lanzamientos — Ejecución',  value: tossesExecTotal },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-zinc-600">{label}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(value)}</td>
                </tr>
              ))}
              <tr className="bg-blue-50">
                <td className="px-4 py-2.5 font-semibold text-blue-800">Subtotal Elevaciones</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-blue-800">{fmt(buildingTotal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(creativityBuilding)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Showmanship (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</td>
              </tr>
              <tr className="bg-zinc-900">
                <td className="px-4 py-2.5 font-bold text-white">TOTAL</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-white text-lg">{fmt(sheetTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
