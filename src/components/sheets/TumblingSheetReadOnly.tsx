'use client';

import type { TumblingConfig } from '@/lib/scoringConfig';

type ExecDeds = (number | null)[];
const EXEC_DED_OPTS      = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS    = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];
const STANDING_EXEC_CATS = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const RUNNING_EXEC_CATS  = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const JUMPS_EXEC_CATS    = ['P. Brazos', 'P. Piernas', 'Sinc'];

function execScore(max: number, deds: ExecDeds): number {
  return parseFloat(Math.max(0, max - deds.reduce<number>((s, d) => s + (d ?? 0), 0)).toFixed(2));
}

function fmt(n: number) { return n.toFixed(2); }

function ExecSection({ label, max, categories, deds }: {
  label: string; max: number; categories: string[]; deds: ExecDeds;
}) {
  const score    = execScore(max, deds);
  const totalDed = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{label} — Ejecución</span>
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
                  <div key={amt} className={`flex-1 rounded-lg py-1.5 text-xs font-medium border flex flex-col items-center gap-0.5 ${active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-zinc-600 border-zinc-300'}`}>
                    <span>−{fmt(amt)}</span>
                    <span className={`text-[9px] ${active ? 'opacity-75' : 'opacity-50'}`}>{EXEC_DED_LABELS[aidx]}</span>
                  </div>
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
        <span className={`text-lg font-bold tabular-nums ${totalDed > 0 ? 'text-red-700' : 'text-zinc-900'}`}>{fmt(score)}</span>
      </div>
    </div>
  );
}

function SectionTotal({ label, breakdown, total }: {
  label: string; breakdown: { key: string; value: number }[]; total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-5 py-3" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-xs uppercase tracking-wide opacity-60">{label}</span>
        {breakdown.map(({ key, value }) => (
          <span key={key}>{key}: <strong className="tabular-nums">{fmt(value)}</strong></span>
        ))}
      </div>
      <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
    </div>
  );
}

function TumblingDiffCard({ label, rangoOpts, habilidadOpts, rango, habilidad }: {
  label: string;
  rangoOpts: { value: number; label: string }[];
  habilidadOpts: { value: number; label: string }[];
  rango: number;
  habilidad: number;
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
              <div key={value}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${rango === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                style={rango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
              >
                <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${rango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                <span className="flex-1">{lbl}</span>
              </div>
            ))}
          </div>
        </div>
        {habilidadOpts.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2">Habilidad Realizada o Gran Parte</p>
            <div className="flex gap-1.5">
              {habilidadOpts.map(({ label: lbl, value }) => (
                <div key={value}
                  className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-2.5 text-xs font-medium border ${habilidad === value ? 'border-transparent' : 'bg-white text-zinc-600 border-zinc-300'}`}
                  style={habilidad === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                >
                  <span className="font-bold text-sm">{value.toFixed(1)}</span>
                  <span className="leading-tight text-center opacity-80">{lbl}</span>
                </div>
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

export interface TumblingSheetReadOnlyProps {
  tCfg: TumblingConfig;
  standingRango: number;
  standingHabilidad: number;
  standingExecDeds: ExecDeds;
  standingNotes: string;
  runningRango: number;
  runningHabilidad: number;
  runningExecDeds: ExecDeds;
  runningNotes: string;
  jumpsDiff: number;
  jumpsExecDeds: ExecDeds;
  jumpsNotes: string;
  creativityTumbling: number;
  showmanshipTumbling: number;
  standingDiffEff: number;
  standingHabEff: number;
  standingExecTotal: number;
  standingTotal: number;
  runningDiffEff: number;
  runningHabEff: number;
  runningExecTotal: number;
  runningTotal: number;
  jumpsDiffEff: number;
  jumpsExecTotal: number;
  jumpsTotal: number;
  tumblingSubtotal: number;
  sheetTotal: number;
}

export function TumblingSheetReadOnly({
  tCfg,
  standingRango, standingHabilidad, standingExecDeds, standingNotes,
  runningRango, runningHabilidad, runningExecDeds, runningNotes,
  jumpsDiff, jumpsExecDeds, jumpsNotes,
  creativityTumbling, showmanshipTumbling,
  standingDiffEff, standingHabEff, standingExecTotal, standingTotal,
  runningDiffEff, runningHabEff, runningExecTotal, runningTotal,
  jumpsDiffEff, jumpsExecTotal, jumpsTotal,
  tumblingSubtotal, sheetTotal,
}: TumblingSheetReadOnlyProps) {
  const maxStandingRango = tCfg.standingRango.length > 0 ? Math.max(...tCfg.standingRango.map(r => r.value)) : 0;
  const maxStandingHab   = tCfg.standingHabilidad.length > 0 ? Math.max(...tCfg.standingHabilidad.map(r => r.value)) : 0;
  const maxRunningRango  = tCfg.runningRango.length > 0 ? Math.max(...tCfg.runningRango.map(r => r.value)) : 0;
  const maxRunningHab    = tCfg.runningHabilidad.length > 0 ? Math.max(...tCfg.runningHabilidad.map(r => r.value)) : 0;
  const maxJumpsDiff     = tCfg.jumpsDiffOpts.length > 0 ? Math.max(...tCfg.jumpsDiffOpts.map(o => o.value)) : 0;

  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14 pointer-events-none select-none">

        {/* STANDING */}
        {tCfg.hasStanding && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">
              {tCfg.isCombinedSR ? 'Gimnasia — Estática / Con Carrera (Combinadas)' : 'Gimnasia Estática (Standing)'}
            </h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.standingHasDiff ? (
                <TumblingDiffCard label="Estática" rangoOpts={tCfg.standingRango} habilidadOpts={tCfg.standingHabilidad} rango={standingRango} habilidad={standingHabilidad} />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Gimnasia Estática" max={tCfg.standingExecMax} categories={STANDING_EXEC_CATS} deds={standingExecDeds} />
                <SectionTotal
                  label="Total Estática"
                  breakdown={tCfg.standingHasDiff
                    ? [{ key: 'Base', value: standingDiffEff }, { key: 'Hab', value: standingHabEff }, { key: 'Ejec', value: standingExecTotal }]
                    : [{ key: 'Ejec', value: standingExecTotal }]}
                  total={standingTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* RUNNING */}
        {tCfg.hasRunning && (
          <section className="flex flex-col gap-3 mt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Gimnasia con Carrera (Running)</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.runningHasDiff ? (
                <TumblingDiffCard label="Con Carrera" rangoOpts={tCfg.runningRango} habilidadOpts={tCfg.runningHabilidad} rango={runningRango} habilidad={runningHabilidad} />
              ) : (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Dificultad</p>
                    <p className="text-sm text-zinc-400 mt-1">Solo Ejecución para esta División</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Gimnasia con Carrera" max={tCfg.runningExecMax} categories={RUNNING_EXEC_CATS} deds={runningExecDeds} />
                <SectionTotal
                  label="Total Carrera"
                  breakdown={tCfg.runningHasDiff
                    ? [{ key: 'Base', value: runningDiffEff }, { key: 'Hab', value: runningHabEff }, { key: 'Ejec', value: runningExecTotal }]
                    : [{ key: 'Ejec', value: runningExecTotal }]}
                  total={runningTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* JUMPS */}
        {tCfg.hasJumps && (
          <section className="flex flex-col gap-3 mt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Saltos (Jumps)</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              {tCfg.jumpsHasDiff && tCfg.jumpsDiffOpts.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad — Saltos Avanzados</span>
                  </div>
                  <div className="p-4 flex flex-col gap-1.5">
                    {tCfg.jumpsDiffOpts.map(({ label: lbl, value }) => (
                      <div key={value}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${jumpsDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                        style={jumpsDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                      >
                        <span className={`w-8 text-center rounded font-bold tabular-nums text-xs ${jumpsDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                        <span className="flex-1">{lbl}</span>
                      </div>
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
                <ExecSection label="Saltos" max={tCfg.jumpsExecMax} categories={JUMPS_EXEC_CATS} deds={jumpsExecDeds} />
                <SectionTotal
                  label="Total Saltos"
                  breakdown={tCfg.jumpsHasDiff
                    ? [{ key: 'Dif', value: jumpsDiffEff }, { key: 'Ejec', value: jumpsExecTotal }]
                    : [{ key: 'Ejec', value: jumpsExecTotal }]}
                  total={jumpsTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* TUMBLING SUBTOTAL */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Gimnasia</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(tumblingSubtotal)}</span>
        </div>

        {/* CREATIVITY + SHOWMANSHIP */}
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
                    <input type="range" min="0" max="2.0" step="0.1" value={creativityTumbling} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                    <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(creativityTumbling)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante toda la rutina</p>
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
                  <input type="range" min="0" max={tCfg.showmanshipMax} step="0.1" value={showmanshipTumbling} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                  <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(showmanshipTumbling)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  {tCfg.hasCreativity ? 'Confianza, Limpieza y Conexión durante la rutina (Habilidades de Gimnasia)' : 'Cheer / Animación — máx 5.0 (se promedia con los otros dos jueces)'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* OBSERVATIONS */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
            <p className="text-[10px] text-zinc-400 mt-0.5">Aquí se consolidarán los comentarios de todas las secciones calificadas (Estática, Con Carrera, Saltos)</p>
          </div>
          {(standingNotes || runningNotes || jumpsNotes) ? (
            <div className="divide-y divide-zinc-100">
              {standingNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Estática</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{standingNotes}</p>
                </div>
              )}
              {runningNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Con Carrera</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{runningNotes}</p>
                </div>
              )}
              {jumpsNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Saltos</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{jumpsNotes}</p>
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
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Tumbling</p>
            <p className="text-xs opacity-70 mt-0.5">{tCfg.hasCreativity ? `Gimnasia + Creatividad (${fmt(creativityTumbling)}) + Showmanship (${fmt(showmanshipTumbling)})` : `Gimnasia + Cheer/Animación (${fmt(showmanshipTumbling)})`}</p>
          </div>
          <span className="text-4xl font-bold tabular-nums">{fmt(sheetTotal)}</span>
        </div>

        {/* SCORE SUMMARY */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden text-sm">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumen de puntajes</span>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-zinc-100">
              {tCfg.hasStanding && tCfg.standingHasDiff && (<>
                <tr><td className="px-4 py-2.5 text-zinc-600">Estática — Rango Base</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(standingDiffEff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxStandingRango)}</span></td></tr>
                <tr><td className="px-4 py-2.5 text-zinc-600">Estática — Habilidad</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(standingHabEff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxStandingHab)}</span></td></tr>
              </>)}
              {tCfg.hasStanding && (<tr><td className="px-4 py-2.5 text-zinc-600">Estática — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(standingExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(tCfg.standingExecMax)}</span></td></tr>)}
              {tCfg.hasRunning && tCfg.runningHasDiff && (<>
                <tr><td className="px-4 py-2.5 text-zinc-600">Con Carrera — Rango Base</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(runningDiffEff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxRunningRango)}</span></td></tr>
                <tr><td className="px-4 py-2.5 text-zinc-600">Con Carrera — Habilidad</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(runningHabEff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxRunningHab)}</span></td></tr>
              </>)}
              {tCfg.hasRunning && (<tr><td className="px-4 py-2.5 text-zinc-600">Con Carrera — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(runningExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(tCfg.runningExecMax)}</span></td></tr>)}
              {tCfg.hasJumps && tCfg.jumpsHasDiff && (<tr><td className="px-4 py-2.5 text-zinc-600">Saltos — Dificultad</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(jumpsDiffEff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxJumpsDiff)}</span></td></tr>)}
              {tCfg.hasJumps && (<tr><td className="px-4 py-2.5 text-zinc-600">Saltos — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(jumpsExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(tCfg.jumpsExecMax)}</span></td></tr>)}
              <tr className="bg-zinc-50"><td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--brand-primary)' }}>Subtotal Gimnasia</td><td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>{fmt(tumblingSubtotal)}</td></tr>
              {tCfg.hasCreativity && (<tr><td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(creativityTumbling)}</span><span className="text-zinc-400 font-normal"> / 2.00</span></td></tr>)}
              <tr><td className="px-4 py-2.5 text-zinc-600">{tCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(showmanshipTumbling)}</span><span className="text-zinc-400 font-normal"> / {fmt(tCfg.showmanshipMax)}</span></td></tr>
              <tr style={{ backgroundColor: 'var(--brand-primary)' }}><td className="px-4 py-2.5 font-bold" style={{ color: 'var(--brand-primary-text)' }}>TOTAL</td><td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg" style={{ color: 'var(--brand-primary-text)' }}>{fmt(sheetTotal)}</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
