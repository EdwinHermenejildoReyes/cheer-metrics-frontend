'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageSpinner } from '@/components/ui/spinner';
import competitionsRepository from '@/repositories/competitionsRepository';
import type { ScoreSheet } from '@/types/competitions';

// ── Formations scale (2.0 → 1.0 in steps of −0.1) ───────────────────────────
const FORMATIONS_VALUES = [2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0];

// ── Dance levels ──────────────────────────────────────────────────────────────
const DANCE_LEVELS = [
  { label: 'Reducido',  sublabel: 'Bajo el Promedio',   value: 0.5 },
  { label: 'Moderado',  sublabel: 'Promedio',            value: 1.0 },
  { label: 'Elevado',   sublabel: 'Sobre el Promedio',   value: 1.5 },
];

const DANCE_DIFF_CRITERIA = [
  'Elementos Visuales', 'Trabajo de Pies', 'Trabajo en Parejas',
  'Variedad de Niveles', 'Trabajo de Suelo', 'Velocidad',
];

const DANCE_EXEC_CRITERIA = [
  'Técnica', 'Fuerza / Precisión de Movimientos',
  'Perfección', 'Sincronización / Timing', 'Energía / Entretenimiento',
];

function fmt(n: number) { return n.toFixed(2); }

// ── Dance level selector ──────────────────────────────────────────────────────
function DanceLevelSelector({
  label, criteria, value, onChange,
}: {
  label: string;
  criteria: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs font-semibold uppercase tracking-wide text-white">{label}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {criteria.map((c) => (
            <span key={c} className="text-[10px] text-zinc-400">· {c}</span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-zinc-200">
        {DANCE_LEVELS.map(({ label: lbl, sublabel, value: v }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex flex-col items-center gap-1 py-5 px-3 transition-colors ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className={`text-2xl font-bold tabular-nums ${active ? 'text-white' : 'text-zinc-900'}`}>
                {v.toFixed(1)}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-zinc-300' : 'text-zinc-700'}`}>
                {lbl}
              </span>
              <span className={`text-[10px] text-center ${active ? 'text-zinc-400' : 'text-zinc-400'}`}>
                {sublabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OverallSheetPage() {
  const router  = useRouter();
  const { id, divisionId, regId } = useParams<{ id: string; divisionId: string; regId: string }>();
  const competitionId  = Number(id);
  const divId          = Number(divisionId);
  const registrationId = Number(regId);

  const [teamName,      setTeamName]      = useState<string>('');
  const [existingSheet, setExistingSheet] = useState<ScoreSheet | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [formationsScore,    setFormationsScore]    = useState<number>(2.0);
  const [danceDifficulty,    setDanceDifficulty]    = useState<number>(0);   // 0 = not yet selected
  const [danceExecution,     setDanceExecution]     = useState<number>(0);
  const [creativityOverall,  setCreativityOverall]  = useState<number>(0.0);
  const [showmanshipOverall, setShowmanshipOverall] = useState<number>(0.0);
  const [formationsNotes,    setFormationsNotes]    = useState('');
  const [danceNotes,         setDanceNotes]         = useState('');

  // ── Computed ──────────────────────────────────────────────────────────────
  const overallSubtotal = parseFloat((formationsScore + danceDifficulty + danceExecution).toFixed(2));
  const sheetTotal      = parseFloat((overallSubtotal + creativityOverall + showmanshipOverall).toFixed(2));
  const errorsCount     = Math.round((2.0 - formationsScore) * 10);

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

        if (sheet.formations_score) {
          setFormationsScore(parseFloat(sheet.formations_score));
        }
        if (sheet.dance_difficulty) {
          const v = parseFloat(sheet.dance_difficulty);
          setDanceDifficulty(DANCE_LEVELS.find((l) => l.value === v) ? v : 0);
        }
        if (sheet.dance_execution) {
          const v = parseFloat(sheet.dance_execution);
          setDanceExecution(DANCE_LEVELS.find((l) => l.value === v) ? v : 0);
        }
        if (sheet.creativity_overall) {
          setCreativityOverall(Math.min(2.0, parseFloat(sheet.creativity_overall)));
        }
        if (sheet.showmanship_overall) {
          setShowmanshipOverall(Math.min(2.0, parseFloat(sheet.showmanship_overall)));
        }
        if (sheet.notes) {
          try {
            const p = JSON.parse(sheet.notes);
            setFormationsNotes(p.formations ?? '');
            setDanceNotes(p.dance ?? '');
          } catch {
            setFormationsNotes(sheet.notes);
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
        formations_score:    String(formationsScore),
        dance_difficulty:    String(danceDifficulty),
        dance_execution:     String(danceExecution),
        creativity_overall:  String(creativityOverall),
        showmanship_overall: String(showmanshipOverall),
        notes: JSON.stringify({ formations: formationsNotes, dance: danceNotes }),
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
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-medium">Planilla — General (Overall)</p>
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

        {/* ── DOS COLUMNAS: Formaciones | Baile ────────────────────────── */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* LEFT: Formaciones */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Formaciones y Transiciones</h2>
              <p className="text-xs text-zinc-400 mt-0.5">−0.1 por cada problema de espaciado en formaciones o choque/empalme en transiciones</p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Valor Inicial</span>
                <div className="flex items-center gap-3">
                  {errorsCount > 0 && (
                    <span className="text-xs text-red-500 tabular-nums">{errorsCount} error{errorsCount !== 1 ? 'es' : ''} × −0.1</span>
                  )}
                  <span className={`text-xl font-bold tabular-nums ${formationsScore < 2.0 ? 'text-red-700' : 'text-zinc-900'}`}>
                    {fmt(formationsScore)}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-11 gap-1">
                  {FORMATIONS_VALUES.map((v) => {
                    const active = formationsScore === v;
                    const errors = Math.round((2.0 - v) * 10);
                    return (
                      <button key={v} type="button" onClick={() => setFormationsScore(v)}
                        title={errors === 0 ? 'Sin errores' : `${errors} error${errors !== 1 ? 'es' : ''}`}
                        className={`flex flex-col items-center gap-0.5 rounded-lg py-2.5 text-xs font-semibold transition-colors border ${
                          active ? 'bg-zinc-900 text-white border-zinc-900'
                            : v < 1.5 ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : v < 1.8 ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        <span className="tabular-nums">{v.toFixed(1)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                  <span>← Más errores</span>
                  <span>Sin errores →</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Formaciones</span>
              </div>
              <div className="p-3">
                <textarea value={formationsNotes} onChange={(e) => setFormationsNotes(e.target.value)}
                  placeholder="Observaciones sobre formaciones y transiciones..." rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
          </section>

          {/* RIGHT: Baile */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Baile</h2>

            <DanceLevelSelector label="Dificultad de Baile" criteria={DANCE_DIFF_CRITERIA} value={danceDifficulty} onChange={setDanceDifficulty} />
            {danceDifficulty === 0 && <p className="text-xs text-amber-600 text-center">— Selecciona un nivel de dificultad —</p>}

            <DanceLevelSelector label="Ejecución de Baile" criteria={DANCE_EXEC_CRITERIA} value={danceExecution} onChange={setDanceExecution} />
            {danceExecution === 0 && <p className="text-xs text-amber-600 text-center">— Selecciona un nivel de ejecución —</p>}

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comentarios — Baile</span>
              </div>
              <div className="p-3">
                <textarea value={danceNotes} onChange={(e) => setDanceNotes(e.target.value)}
                  placeholder="Observaciones sobre dificultad y ejecución de baile..." rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
          </section>
        </div>

        {/* ── OVERALL SUBTOTAL ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl bg-purple-600 px-5 py-4 text-white shadow-sm">
          <div className="flex gap-6 text-sm items-center">
            <span className="text-purple-300 text-xs uppercase tracking-wide">Subtotal General</span>
            <span>Form: <strong>{fmt(formationsScore)}</strong></span>
            <span>Dif: <strong>{fmt(danceDifficulty)}</strong></span>
            <span>Ejec: <strong>{fmt(danceExecution)}</strong></span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{fmt(overallSubtotal)}</span>
        </div>

        {/* ── CREATIVITY + SHOWMANSHIP ─────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Creatividad & Showmanship</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Creatividad</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityOverall)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityOverall}
                    onChange={(e) => setCreativityOverall(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={creativityOverall}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setCreativityOverall(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante toda la rutina</p>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Showmanship</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipOverall)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipOverall}
                    onChange={(e) => setShowmanshipOverall(parseFloat(e.target.value))}
                    className="flex-1 accent-zinc-900"
                  />
                  <input
                    type="number"
                    min="0"
                    max="2.0"
                    step="0.1"
                    value={showmanshipOverall}
                    onChange={(e) => {
                      const v = Math.min(2.0, Math.max(0, parseFloat(e.target.value) || 0));
                      setShowmanshipOverall(parseFloat(v.toFixed(2)));
                    }}
                    className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">Confianza, Limpieza y Conexión durante la rutina (Habilidades de Construcción)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── GRAND TOTAL ───────────────────────────────────────────────── */}
        <div className="rounded-xl bg-zinc-900 px-6 py-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400 font-medium">Total Planilla Overall</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              General + Creatividad ({fmt(creativityOverall)}) + Showmanship ({fmt(showmanshipOverall)})
            </p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* ── Full competition stats (after save) ───────────────────────── */}
        {existingSheet && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Estadísticas de la Competencia
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {parseFloat(existingSheet.raw_score).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">/ {parseFloat(existingSheet.max_raw).toFixed(2)}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Descuentos</p>
                <p className="text-2xl font-bold tabular-nums text-red-600">
                  −{parseFloat(existingSheet.total_deductions).toFixed(2)}
                </p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">% de Perfección</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">
                  {existingSheet.percentage}%
                </p>
              </div>
            </div>
            <div className="border-t border-zinc-100 flex items-center justify-between px-6 py-4 bg-zinc-900 rounded-b-xl">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Puntaje Final</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500 tabular-nums">
                    Bruto {parseFloat(existingSheet.scaled_score).toFixed(2)}
                  </span>
                  {parseFloat(existingSheet.total_deductions) > 0 && (
                    <span className="text-xs text-red-400 tabular-nums">
                      − desc {parseFloat(existingSheet.total_deductions).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-3xl font-bold tabular-nums text-white">
                {parseFloat(existingSheet.final_score).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* ── Score summary ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {[
                { label: 'Formaciones y Transiciones', value: formationsScore },
                { label: 'Dificultad de Baile',        value: danceDifficulty },
                { label: 'Ejecución de Baile',         value: danceExecution },
              ].map(({ label, value }) => (
                <tr key={label}>
                  <td className="px-4 py-2.5 text-zinc-600">{label}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(value)}</td>
                </tr>
              ))}
              <tr className="bg-purple-50">
                <td className="px-4 py-2.5 font-semibold text-purple-800">Subtotal General</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-purple-800">{fmt(overallSubtotal)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(creativityOverall)}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-zinc-600">Showmanship (este juez)</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums text-zinc-900">{fmt(showmanshipOverall)}</td>
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
