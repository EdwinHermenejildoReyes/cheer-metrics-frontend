'use client';

import { CheckCircle2 } from 'lucide-react';

const FORMATIONS_VALUES = [2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0];

function fmt(n: number) { return n.toFixed(2); }

function DanceLevelSelector({ label, criteria, levels, value }: {
  label: string;
  criteria: string[];
  levels: { label: string; sublabel: string; value: number }[];
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/20" style={{ backgroundColor: 'var(--brand-secondary, var(--brand-primary))' }}>
        <span className="text-xs font-semibold uppercase tracking-wide text-white">{label}</span>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {criteria.map((c) => (
            <span key={c} className="text-[10px] text-white/50">· {c}</span>
          ))}
        </div>
      </div>
      <div className={`grid divide-x divide-zinc-200 ${levels.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {levels.map(({ label: lbl, sublabel, value: v }) => {
          const active = value === v;
          return (
            <div key={v}
              className={`flex flex-col items-center gap-1 py-5 px-3 ${active ? '' : 'bg-white text-zinc-700'}`}
              style={active ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' } : undefined}
            >
              <span className={`text-2xl font-bold tabular-nums ${active ? '' : 'text-zinc-900'}`} style={active ? { color: 'var(--brand-primary-text)' } : undefined}>{v.toFixed(1)}</span>
              <span className={`text-xs font-semibold ${active ? 'opacity-90' : 'text-zinc-700'}`}>{lbl}</span>
              <span className={`text-[10px] text-center ${active ? 'opacity-60' : 'text-zinc-400'}`}>{sublabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface OverallSheetReadOnlyProps {
  isEscolarAB: boolean;
  danceDiffLevels: { label: string; sublabel: string; value: number }[];
  danceExecLevels: { label: string; sublabel: string; value: number }[];
  showmanshipMax: number;
  formationsScore: number;
  danceDifficulty: number;
  danceExecution: number;
  creativityOverall: number;
  showmanshipOverall: number;
  formationsNotes: string;
  danceNotes: string;
  errorsCount: number;
  overallSubtotal: number;
  sheetTotal: number;
  rawScore?: string | null;
  maxRaw?: string | null;
  scaledScore?: string | null;
  totalDeductions?: string | null;
  finalScore?: string | null;
  percentage?: string | null;
}

const DANCE_DIFF_CRITERIA = ['Elementos Visuales', 'Trabajo de Pies', 'Trabajo en Parejas', 'Variedad de Niveles', 'Trabajo de Suelo', 'Velocidad'];
const DANCE_EXEC_CRITERIA = ['Técnica', 'Fuerza / Precisión de Movimientos', 'Perfección', 'Sincronización / Timing', 'Energía / Entretenimiento'];

export function OverallSheetReadOnly({
  isEscolarAB, danceDiffLevels, danceExecLevels, showmanshipMax,
  formationsScore, danceDifficulty, danceExecution, creativityOverall, showmanshipOverall,
  formationsNotes, danceNotes, errorsCount, overallSubtotal, sheetTotal,
  rawScore, maxRaw, scaledScore, totalDeductions, finalScore, percentage,
}: OverallSheetReadOnlyProps) {
  const hasStats = rawScore != null && finalScore != null;

  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14 pointer-events-none select-none">

        {/* TWO COLUMNS: Formations | Dance */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* LEFT: Formations */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Formaciones y Transiciones</h2>
              <p className="text-xs text-zinc-400 mt-0.5">−0.1 por cada problema de espaciado en formaciones o choque/empalme en transiciones</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Valor Inicial</span>
                <div className="flex items-center gap-3">
                  {errorsCount > 0 && (
                    <span className="text-xs text-red-500 tabular-nums">{errorsCount} error{errorsCount !== 1 ? 'es' : ''} × −0.1</span>
                  )}
                  <span className={`text-xl font-bold tabular-nums ${formationsScore < 2.0 ? 'text-red-700' : 'text-zinc-900'}`}>{fmt(formationsScore)}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-11 gap-1">
                  {FORMATIONS_VALUES.map((v) => {
                    const active = formationsScore === v;
                    const errors = Math.round((2.0 - v) * 10);
                    return (
                      <div key={v}
                        title={errors === 0 ? 'Sin errores' : `${errors} error${errors !== 1 ? 'es' : ''}`}
                        className={`flex flex-col items-center gap-0.5 rounded-lg py-2.5 text-xs font-semibold border ${
                          active ? 'border-transparent'
                            : v < 1.5 ? 'bg-red-50 text-red-700 border-red-200'
                            : v < 1.8 ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-white text-zinc-700 border-zinc-300'
                        }`}
                        style={active ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                      >
                        <span className="tabular-nums">{v.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                  <span>← Más errores</span>
                  <span>Sin errores →</span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT: Dance */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Baile</h2>
            <DanceLevelSelector label="Dificultad de Baile" criteria={DANCE_DIFF_CRITERIA} levels={danceDiffLevels} value={danceDifficulty} />
            <DanceLevelSelector label="Ejecución de Baile" criteria={DANCE_EXEC_CRITERIA} levels={danceExecLevels} value={danceExecution} />
          </section>
        </div>

        {/* OVERALL SUBTOTAL */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <div className="flex gap-6 text-sm items-center">
            <span className="text-xs uppercase tracking-wide opacity-70">Subtotal General</span>
            <span>Form: <strong>{fmt(formationsScore)}</strong></span>
            <span>Dif: <strong>{fmt(danceDifficulty)}</strong></span>
            <span>Ejec: <strong>{fmt(danceExecution)}</strong></span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{fmt(overallSubtotal)}</span>
        </div>

        {/* CREATIVITY + SHOWMANSHIP */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">{isEscolarAB ? 'Cheer / Animación' : 'Creatividad & Showmanship'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>
          <div className={`grid gap-4 ${isEscolarAB ? 'grid-cols-1 max-w-md' : 'grid-cols-2'}`}>
            {!isEscolarAB && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityOverall)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="2.0" step="0.1" value={creativityOverall} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                    <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(creativityOverall)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante toda la rutina</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{isEscolarAB ? 'Cheer / Animación' : 'Showmanship'}</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipOverall)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max={showmanshipMax} step="0.1" value={showmanshipOverall} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                  <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(showmanshipOverall)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">{isEscolarAB ? 'Cheer / Animación — máx 5.0 (se promedia con los otros dos jueces)' : 'Confianza, Limpieza y Conexión durante la rutina (Habilidades de Construcción)'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* OBSERVATIONS */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
            <p className="text-[10px] text-zinc-400 mt-0.5">Aquí se consolidarán los comentarios de todas las secciones calificadas (Formaciones, Baile)</p>
          </div>
          {(formationsNotes || danceNotes) ? (
            <div className="divide-y divide-zinc-100">
              {formationsNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Formaciones</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{formationsNotes}</p>
                </div>
              )}
              {danceNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Baile</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{danceNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-zinc-400">Sin observaciones registradas</p>
            </div>
          )}
        </div>

        {/* GRAND TOTAL */}
        <div className="rounded-xl px-6 py-5 flex items-center justify-between shadow-lg" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <div>
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Overall</p>
            <p className="text-xs opacity-70 mt-0.5">{isEscolarAB ? `General + Cheer/Animación (${fmt(showmanshipOverall)})` : `General + Creatividad (${fmt(creativityOverall)}) + Showmanship (${fmt(showmanshipOverall)})`}</p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* COMPETITION STATS */}
        {hasStats && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Estadísticas de la Competencia</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-zinc-100 text-center">
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Puntaje Bruto</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">{parseFloat(rawScore!).toFixed(2)}</p>
                {maxRaw && <p className="text-xs text-zinc-400 mt-0.5">/ {parseFloat(maxRaw).toFixed(2)}</p>}
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Descuentos</p>
                <p className="text-2xl font-bold tabular-nums text-red-600">−{parseFloat(totalDeductions ?? '0').toFixed(2)}</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">% de Perfección</p>
                <p className="text-2xl font-bold tabular-nums text-zinc-900">{percentage}%</p>
              </div>
            </div>
            <div className="border-t border-zinc-100 flex items-center justify-between px-6 py-4 rounded-b-xl" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide">Puntaje Final</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-zinc-500 tabular-nums">Bruto {parseFloat(scaledScore ?? '0').toFixed(2)}</span>
                  {parseFloat(totalDeductions ?? '0') > 0 && (
                    <span className="text-xs text-red-400 tabular-nums">− desc {parseFloat(totalDeductions!).toFixed(2)}</span>
                  )}
                </div>
              </div>
              <span className="text-3xl font-bold tabular-nums text-white">{parseFloat(finalScore!).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* SCORE SUMMARY */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {[
                { label: 'Formaciones y Transiciones', value: formationsScore, max: 2.0 },
                { label: 'Dificultad de Baile', value: danceDifficulty, max: Math.max(...danceDiffLevels.map(l => l.value)) },
                { label: 'Ejecución de Baile', value: danceExecution, max: Math.max(...danceExecLevels.map(l => l.value)) },
              ].map(({ label, value, max }) => (
                <tr key={label}><td className="px-4 py-2.5 text-zinc-600">{label}</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(value)}</span><span className="text-zinc-400 font-normal"> / {fmt(max)}</span></td></tr>
              ))}
              <tr className="bg-zinc-50"><td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--brand-primary)' }}>Subtotal General</td><td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>{fmt(overallSubtotal)}</td></tr>
              {!isEscolarAB && (<tr><td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(creativityOverall)}</span><span className="text-zinc-400 font-normal"> / 2.00</span></td></tr>)}
              <tr><td className="px-4 py-2.5 text-zinc-600">{isEscolarAB ? 'Cheer / Animación (este juez)' : 'Showmanship (este juez)'}</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(showmanshipOverall)}</span><span className="text-zinc-400 font-normal"> / {fmt(showmanshipMax)}</span></td></tr>
              <tr style={{ backgroundColor: 'var(--brand-primary)' }}><td className="px-4 py-2.5 font-bold" style={{ color: 'var(--brand-primary-text)' }}>TOTAL</td><td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg" style={{ color: 'var(--brand-primary-text)' }}>{fmt(sheetTotal)}</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
