'use client';

import type { BuildingConfig } from '@/lib/scoringConfig';

type ExecDeds = (number | null)[];
const EXEC_DED_OPTS   = [0.05, 0.10, 0.20, 0.30];
const EXEC_DED_LABELS = ['Mínimos', 'Menores', 'Múltiples', 'Generalizados'];
const EXEC_CATS       = ['Flyer', 'Base/Spotter', 'Transición', 'Sincronización'];
const TOSS_EXEC_CATS  = ['Flyer', 'Base/Spotter', 'Altura'];

function execScore(max: number, deds: ExecDeds): number {
  return parseFloat(Math.max(0, max - deds.reduce<number>((s, d) => s + (d ?? 0), 0)).toFixed(2));
}

function fmt(n: number) { return n.toFixed(2); }

function ExecSection({ label, max, deds, cats = EXEC_CATS }: {
  label: string; max: number; deds: ExecDeds; cats?: string[];
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
        {cats.map((cat, i) => (
          <div key={cat} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-28 shrink-0 text-sm text-zinc-700">{cat}</span>
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

export interface BuildingSheetReadOnlyProps {
  bCfg: BuildingConfig;
  stuntsRango: number;
  stuntsSkills: (number | null)[];
  stuntsPartMax: number | null;
  stuntsExecDeds: ExecDeds;
  pyramidsRangeIdx: number | null;
  pyramidsFine: number;
  pyramidsExecDeds: ExecDeds;
  pyramidsDrivers: number;
  tossesExecDeds: ExecDeds;
  tossesDiff: number;
  creativityBuilding: number;
  showmanshipBuilding: number;
  stuntsNotes: string;
  pyramidsNotes: string;
  tossesNotes: string;
  stuntsSkillsTotal: number;
  stuntsDriversTotal: number;
  stuntsExecTotal: number;
  stuntsSectionTotal: number;
  pyramidsDiff: number;
  pyramidsExecTotal: number;
  pyramidsSectionTotal: number;
  tossesExecTotal: number;
  tossesSectionTotal: number;
  buildingTotal: number;
  sheetTotal: number;
}

export function BuildingSheetReadOnly({
  bCfg,
  stuntsRango, stuntsSkills, stuntsPartMax, stuntsExecDeds,
  pyramidsRangeIdx, pyramidsFine, pyramidsExecDeds, pyramidsDrivers,
  tossesExecDeds, tossesDiff,
  creativityBuilding, showmanshipBuilding,
  stuntsNotes, pyramidsNotes, tossesNotes,
  stuntsSkillsTotal, stuntsDriversTotal, stuntsExecTotal, stuntsSectionTotal,
  pyramidsDiff, pyramidsExecTotal, pyramidsSectionTotal,
  tossesExecTotal, tossesSectionTotal,
  buildingTotal, sheetTotal,
}: BuildingSheetReadOnlyProps) {
  const activeStuntsRangoOpt = bCfg.stuntsRango.find(r => r.value === stuntsRango);
  const activeSkillCount = activeStuntsRangoOpt?.skillCount ?? bCfg.stuntsSkillCount;
  const stuntSkillLabels = Array.from({ length: bCfg.stuntsSkillCount }, (_, i) => `Habilidad #${i + 1}`);

  const maxStuntsRango   = bCfg.stuntsRango.length > 0 ? Math.max(...bCfg.stuntsRango.map(r => r.value)) : 0;
  const maxStuntsSkills  = bCfg.stuntsSkillCount > 0 && bCfg.stuntsSkillGrades.length > 0 ? bCfg.stuntsSkillCount * Math.max(...bCfg.stuntsSkillGrades.map(g => g.value)) : 0;
  const maxStuntsPartMax = bCfg.stuntsPartMaxOpts.length > 0 ? Math.max(...bCfg.stuntsPartMaxOpts.map(o => o.value)) : 0;
  const maxStuntsDrivers = parseFloat((maxStuntsSkills + maxStuntsPartMax).toFixed(2));
  const maxPyramidsDiff  = bCfg.pyramidRango.length > 0 ? parseFloat((bCfg.pyramidRango[bCfg.pyramidRango.length - 1].high + (bCfg.pyramidFineSteps.length > 0 ? Math.max(...bCfg.pyramidFineSteps) : 0)).toFixed(1)) : 0;
  const maxPyramidsDrivers = bCfg.pyramidDriversOpts.length > 0 ? Math.max(...bCfg.pyramidDriversOpts.map(o => o.value)) : 0;
  const maxTossesDiff    = bCfg.tossDiffOpts.length > 0 ? Math.max(...bCfg.tossDiffOpts.map(o => o.value)) : 0;

  return (
    <div className="bg-zinc-50 rounded-2xl overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-14 pointer-events-none select-none">

        {/* STUNTS */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Elevaciones — Stunts</h2>
          {!bCfg.hasStunts ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Stunts — No Aplica para esta División</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">
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
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                  </div>
                  <div className="p-4 flex flex-col gap-5">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango Base de Complejidad</p>
                      <div className="flex flex-col gap-1.5">
                        {bCfg.stuntsRango.map(({ value, label }) => (
                          <div key={value}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${stuntsRango === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                            style={stuntsRango === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsRango === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {bCfg.stuntsSkillCount > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Grado de Dificultad — Habilidades (+0.10 / +0.20)</p>
                        <div className="flex flex-col gap-2">
                          {stuntSkillLabels.map((skill, i) => {
                            const skillDisabled = i >= activeSkillCount;
                            return (
                              <div key={skill} className="flex items-center gap-3">
                                <span className={`w-28 shrink-0 text-sm ${skillDisabled ? 'text-zinc-400' : 'text-zinc-700'}`}>{skill}</span>
                                <div className="flex flex-1 gap-1.5">
                                  {bCfg.stuntsSkillGrades.map(({ label, value }) => (
                                    <div key={label}
                                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium border text-center ${
                                        skillDisabled
                                          ? 'bg-zinc-100 text-zinc-400 border-zinc-200 opacity-50'
                                          : stuntsSkills[i] !== null && stuntsSkills[i] === value
                                            ? 'border-transparent'
                                            : 'bg-white text-zinc-600 border-zinc-300'
                                      }`}
                                      style={!skillDisabled && stuntsSkills[i] !== null && stuntsSkills[i] === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                                    >
                                      {label}{value > 0 && <span className="ml-1 opacity-70">+{value.toFixed(2)}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex justify-between text-xs border-t border-zinc-100 pt-2">
                          <span className="text-zinc-500">Rango {fmt(stuntsRango)} + Grado Dif {fmt(stuntsSkillsTotal)}</span>
                          <span className="font-semibold text-zinc-900">Total Drivers: {fmt(stuntsDriversTotal)}</span>
                        </div>
                      </div>
                    )}
                    {bCfg.stuntsPartMaxOpts.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-0.5">Part Max — Spotter / Base</p>
                        <p className="text-[10px] text-zinc-400 mb-2">Habilidad en Canon o Sincronizado · Sin Repetir Atletas</p>
                        <div className="flex flex-col gap-1.5">
                          {bCfg.stuntsPartMaxOpts.map(({ value, label }) => (
                            <div key={value}
                              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${stuntsPartMax !== null && stuntsPartMax === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                              style={stuntsPartMax !== null && stuntsPartMax === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                            >
                              <span className="flex-1">{label}</span>
                              <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${stuntsPartMax !== null && stuntsPartMax === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Elevaciones" max={bCfg.stuntsExecMax} deds={stuntsExecDeds} />
                <SectionTotal
                  label="Total Elevaciones"
                  breakdown={bCfg.stuntsHasDiff
                    ? [{ key: 'Dif', value: stuntsRango }, { key: 'Ejec', value: stuntsExecTotal }, { key: 'Drivers', value: stuntsDriversTotal }]
                    : [{ key: 'Ejec', value: stuntsExecTotal }]}
                  total={stuntsSectionTotal}
                />
              </div>
            </div>
          )}
        </section>

        {/* PYRAMIDS */}
        <section className="flex flex-col gap-3 mt-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Pirámides</h2>
          {!bCfg.hasPyramids ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Sin Pirámides — No Aplica para esta División</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 items-start">
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
                    <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5"># Habilidades Diferentes del Nivel + # Estructuras x Gran Parte</p>
                  </div>
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-2">Rango</p>
                      <div className="flex flex-col gap-1.5">
                        {bCfg.pyramidRango.map(({ low, high, label }, idx) => (
                          <div key={idx}
                            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${pyramidsRangeIdx === idx ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                            style={pyramidsRangeIdx === idx ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                          >
                            <span className="flex-1">{label}</span>
                            <span className={`text-sm font-bold tabular-nums ml-3 shrink-0 ${pyramidsRangeIdx === idx ? 'text-zinc-300' : 'text-zinc-400'}`}>{low.toFixed(1)}–{high.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {pyramidsRangeIdx !== null && bCfg.pyramidFineSteps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500 mb-2">Ajuste dentro del rango</p>
                        <div className="grid grid-cols-6 gap-1">
                          {bCfg.pyramidFineSteps.map((step) => (
                            <div key={step}
                              className={`rounded-lg py-2 text-xs font-semibold tabular-nums border text-center ${pyramidsFine === step ? 'border-transparent' : 'bg-white text-zinc-600 border-zinc-300'}`}
                              style={pyramidsFine === step ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                            >
                              +{step.toFixed(1)}
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-right text-xs text-zinc-500">Dificultad: <strong className="text-zinc-900 tabular-nums">{pyramidsDiff.toFixed(1)}</strong></p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ExecSection label="Pirámides" max={bCfg.pyramidsExecMax} deds={pyramidsExecDeds} />
                {bCfg.pyramidDriversOpts.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                      <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Drivers — Pirámides</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                      {bCfg.pyramidDriversOpts.map(({ value, label }) => (
                        <div key={value}
                          className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${pyramidsDrivers === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                          style={pyramidsDrivers === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                        >
                          <span className="flex-1">{label}</span>
                          <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${pyramidsDrivers === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <SectionTotal
                  label="Total Pirámides"
                  breakdown={bCfg.pyramidsHasDiff
                    ? [{ key: 'Dif', value: pyramidsDiff }, { key: 'Ejec', value: pyramidsExecTotal }, ...(bCfg.pyramidDriversOpts.length > 0 ? [{ key: 'Drivers', value: pyramidsDrivers }] : [])]
                    : [{ key: 'Ejec', value: pyramidsExecTotal }]}
                  total={pyramidsSectionTotal}
                />
              </div>
            </div>
          )}
        </section>

        {/* TOSSES */}
        {bCfg.hasTosses && (
          <section className="flex flex-col gap-3 mt-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">Lanzamientos — Tosses</h2>
            <div className="grid grid-cols-2 gap-5 items-start">
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Dificultad</span>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Lanzamiento Apropiado del Nivel</p>
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-1.5">
                    {bCfg.tossDiffOpts.map(({ value, label }) => (
                      <div key={value}
                        className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium border text-left ${tossesDiff === value ? 'border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
                        style={tossesDiff === value ? { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)', borderColor: 'var(--brand-primary)' } : undefined}
                      >
                        <span className="flex-1">{label}</span>
                        <span className={`text-base font-bold tabular-nums ml-3 shrink-0 ${tossesDiff === value ? 'text-zinc-300' : 'text-zinc-400'}`}>{value.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <ExecSection label="Lanzamientos" max={bCfg.tossesExecMax} deds={tossesExecDeds} cats={TOSS_EXEC_CATS} />
                <SectionTotal
                  label="Total Lanzamientos"
                  breakdown={[{ key: 'Dif', value: tossesDiff }, { key: 'Ejec', value: tossesExecTotal }]}
                  total={tossesSectionTotal}
                />
              </div>
            </div>
          </section>
        )}

        {/* BUILDING SUBTOTAL */}
        <div className="flex items-center justify-between rounded-xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary-text)' }}>
          <span className="text-sm font-semibold uppercase tracking-wide">Subtotal Elevaciones</span>
          <span className="text-2xl font-bold tabular-nums">{fmt(buildingTotal)}</span>
        </div>

        {/* CREATIVITY + SHOWMANSHIP */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-700">{bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Puntuado por este juez — se promedia con los otros dos jueces</p>
          </div>
          <div className={`grid gap-4 ${bCfg.hasCreativity ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {bCfg.hasCreativity && (
              <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                  <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Creatividad</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(creativityBuilding)}</span>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="2.0" step="0.1" value={creativityBuilding} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                    <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(creativityBuilding)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">Creatividad, Innovación y/o visual durante formaciones, transiciones y construcciones</p>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">{bCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}</span>
                <span className="text-lg font-bold tabular-nums text-zinc-900">{fmt(showmanshipBuilding)}</span>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max={bCfg.showmanshipMax} step="0.1" value={showmanshipBuilding} readOnly className="flex-1 accent-zinc-900" onChange={() => {}} />
                  <span className="w-16 h-9 rounded-lg border border-zinc-300 px-2 text-center text-sm font-semibold tabular-nums flex items-center justify-center">{fmt(showmanshipBuilding)}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-snug">{bCfg.hasCreativity ? 'Ritmo, Confianza y Conexión durante la rutina' : 'Cheer / Animación — máx 5.0 (se promedia con los otros dos jueces)'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* OBSERVATIONS */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
            <span className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Observaciones del juez</span>
            <p className="text-[10px] text-zinc-400 mt-0.5">Aquí se consolidarán los comentarios de todas las secciones calificadas (Elevaciones, Pirámides, Lanzamientos)</p>
          </div>
          {(stuntsNotes || pyramidsNotes || tossesNotes) ? (
            <div className="divide-y divide-zinc-100">
              {stuntsNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Elevaciones</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{stuntsNotes}</p>
                </div>
              )}
              {pyramidsNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Pirámides</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{pyramidsNotes}</p>
                </div>
              )}
              {tossesNotes && (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Lanzamientos</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{tossesNotes}</p>
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
            <p className="text-base uppercase tracking-wide font-bold">Total Planilla Building</p>
            <p className="text-xs opacity-70 mt-0.5">{bCfg.hasCreativity ? `Elevaciones + Creatividad (${fmt(creativityBuilding)}) + Showmanship (${fmt(showmanshipBuilding)})` : `Elevaciones + Cheer/Animación (${fmt(showmanshipBuilding)})`}</p>
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
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Stunts — Dificultad (Rango)</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(stuntsRango)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxStuntsRango)}</span></td></tr>
              )}
              {bCfg.hasStunts && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Stunts — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(stuntsExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(bCfg.stuntsExecMax)}</span></td></tr>
              )}
              {bCfg.hasStunts && bCfg.stuntsHasDiff && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Stunts — Drivers (Grado+PM)</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(stuntsDriversTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxStuntsDrivers)}</span></td></tr>
              )}
              {bCfg.hasPyramids && bCfg.pyramidsHasDiff && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Pirámides — Dificultad</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(pyramidsDiff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxPyramidsDiff)}</span></td></tr>
              )}
              {bCfg.hasPyramids && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Pirámides — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(pyramidsExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(bCfg.pyramidsExecMax)}</span></td></tr>
              )}
              {bCfg.hasPyramids && bCfg.pyramidDriversOpts.length > 0 && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Pirámides — Drivers</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(pyramidsDrivers)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxPyramidsDrivers)}</span></td></tr>
              )}
              {bCfg.hasTosses && (<>
                <tr><td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Dificultad</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(tossesDiff)}</span><span className="text-zinc-400 font-normal"> / {fmt(maxTossesDiff)}</span></td></tr>
                <tr><td className="px-4 py-2.5 text-zinc-600">Lanzamientos — Ejecución</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(tossesExecTotal)}</span><span className="text-zinc-400 font-normal"> / {fmt(bCfg.tossesExecMax)}</span></td></tr>
              </>)}
              <tr className="bg-zinc-50"><td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--brand-primary)' }}>Subtotal Elevaciones</td><td className="px-4 py-2.5 text-right font-bold tabular-nums" style={{ color: 'var(--brand-primary)' }}>{fmt(buildingTotal)}</td></tr>
              {bCfg.hasCreativity && (
                <tr><td className="px-4 py-2.5 text-zinc-600">Creatividad (este juez)</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(creativityBuilding)}</span><span className="text-zinc-400 font-normal"> / 2.00</span></td></tr>
              )}
              <tr><td className="px-4 py-2.5 text-zinc-600">{bCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td><td className="px-4 py-2.5 text-right tabular-nums text-zinc-900 whitespace-nowrap"><span className="font-semibold">{fmt(showmanshipBuilding)}</span><span className="text-zinc-400 font-normal"> / {fmt(bCfg.showmanshipMax)}</span></td></tr>
              <tr style={{ backgroundColor: 'var(--brand-primary)' }}><td className="px-4 py-2.5 font-bold" style={{ color: 'var(--brand-primary-text)' }}>TOTAL</td><td className="px-4 py-2.5 text-right font-bold tabular-nums text-lg" style={{ color: 'var(--brand-primary-text)' }}>{fmt(sheetTotal)}</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
