import type { Organization } from '@/types/competitions';
import type { BuildingConfig } from '@/lib/scoringConfig';

type ExecDeds = (number | null)[];

const EXEC_CATS      = ['Volante', 'Base/Spotter', 'Transición', 'Sincronización'];
const TOSS_EXEC_CATS = ['Flyer', 'Base/Spotter', 'Altura'];
const EXEC_DED_OPTS  = [0.05, 0.10, 0.20, 0.30];
const DED_LABELS     = ['Mín.', 'Men.', 'Múlt.', 'Gen.'];

function fmt(n: number) { return n.toFixed(2); }

function execScore(max: number, deds: ExecDeds) {
  return Math.max(0, max - deds.reduce<number>((s, d) => s + (d ?? 0), 0));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBar({ label, primary, primaryText }: { label: string; primary: string; primaryText: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1.5px solid ${primary}`, paddingBottom: '3px', marginBottom: '5px', marginTop: '10px' }}>
      <div style={{ width: '3px', height: '11px', borderRadius: '2px', backgroundColor: primary, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#52525b', margin: 0 }}>{label}</p>
    </div>
  );
}

function RadioOpts({ opts, selected, primary, primaryText }: {
  opts: { value: number; label: string }[];
  selected: number;
  primary: string;
  primaryText: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {opts.map(o => {
        const active = o.value === selected;
        return (
          <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 4px', borderRadius: '3px', backgroundColor: active ? primary : 'transparent', opacity: active ? 1 : 0.5 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${active ? primaryText : '#52525b'}`, backgroundColor: active ? primaryText : 'transparent', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: '9.5px', flex: 1, color: active ? primaryText : '#18181b' }}>{o.label}</span>
            <span style={{ fontSize: '9.5px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: active ? primaryText : '#71717a' }}>{fmt(o.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChipOpts({ opts, selected, primary, primaryText }: {
  opts: { value: number; label: string }[];
  selected: number;
  primary: string;
  primaryText: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
      {opts.map(o => {
        const active = o.value === selected;
        return (
          <span key={o.value} style={{ padding: '1px 6px', borderRadius: '3px', fontSize: '9px', fontVariantNumeric: 'tabular-nums', backgroundColor: active ? primary : '#f4f4f5', color: active ? primaryText : '#71717a', fontWeight: active ? 700 : 400 }}>
            {fmt(o.value)}
          </span>
        );
      })}
    </div>
  );
}

function ExecTable({ cats, deds, max, primary }: { cats: string[]; deds: ExecDeds; max: number; primary: string }) {
  const total = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  const score = execScore(max, deds);
  return (
    <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, borderBottom: '1px solid #e4e4e7' }}>Categoría</th>
          {EXEC_DED_OPTS.map((a, i) => (
            <th key={a} style={{ textAlign: 'center', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, width: '38px', borderBottom: '1px solid #e4e4e7' }}>
              −{fmt(a)}<br /><span style={{ fontSize: '8px' }}>{DED_LABELS[i]}</span>
            </th>
          ))}
          <th style={{ textAlign: 'right', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, width: '32px', borderBottom: '1px solid #e4e4e7' }}>Ded.</th>
        </tr>
      </thead>
      <tbody>
        {cats.map((cat, i) => (
          <tr key={cat} style={{ borderBottom: '1px solid #f4f4f5' }}>
            <td style={{ padding: '2px 3px' }}>{cat}</td>
            {EXEC_DED_OPTS.map(a => {
              const sel = deds[i] === a;
              return (
                <td key={a} style={{ textAlign: 'center', padding: '2px 3px' }}>
                  <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', border: `1.5px solid ${sel ? '#dc2626' : '#d4d4d8'}`, backgroundColor: sel ? '#dc2626' : 'transparent' }} />
                </td>
              );
            })}
            <td style={{ textAlign: 'right', padding: '2px 3px', color: deds[i] != null ? '#dc2626' : '#d4d4d8', fontVariantNumeric: 'tabular-nums' }}>
              {deds[i] != null ? `−${fmt(deds[i]!)}` : '—'}
            </td>
          </tr>
        ))}
        <tr style={{ borderTop: '1.5px solid #d4d4d8', backgroundColor: '#fafafa' }}>
          <td colSpan={EXEC_DED_OPTS.length + 1} style={{ padding: '2px 3px', color: '#52525b' }}>
            Desc. total: <span style={{ color: total > 0 ? '#dc2626' : '#71717a', fontWeight: 600 }}>−{fmt(total)}</span>
          </td>
          <td style={{ textAlign: 'right', padding: '2px 3px', fontWeight: 700, color: total > 0 ? '#dc2626' : '#18181b', fontVariantNumeric: 'tabular-nums' }}>{fmt(score)}</td>
        </tr>
      </tbody>
    </table>
  );
}

function TotalPill({ label, breakdown, value, primary, primaryText }: {
  label: string; breakdown: string; value: number; primary: string; primaryText: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: `${primary}18`, borderRadius: '4px', marginTop: '5px', fontSize: '10px' }}>
      <div>
        <span style={{ fontWeight: 600, color: '#18181b' }}>{label}</span>
        <span style={{ color: '#71717a', marginLeft: '6px', fontSize: '9px' }}>{breakdown}</span>
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: primary }}>{fmt(value)}</span>
    </div>
  );
}

function SliderRow({ label, value, max, primary }: { label: string; value: number; max: number; primary: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '10px' }}>
      <span style={{ width: '130px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '5px', backgroundColor: '#e4e4e7', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: primary, borderRadius: '3px' }} />
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: '48px', textAlign: 'right' }}>{fmt(value)} / {fmt(max)}</span>
    </div>
  );
}

function NoteBox({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div style={{ marginTop: '4px', padding: '3px 6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '3px', fontSize: '9.5px' }}>
      <span style={{ fontWeight: 600, color: '#92400e' }}>Comentarios: </span>
      <span style={{ color: '#78350f' }}>{text}</span>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '5px 0 2px' }}>{text}</p>;
}

// ── Main component ────────────────────────────────────────────────────────────

export interface BuildingPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization | null;
  bCfg: BuildingConfig;
  // Stunts
  stuntsRango: number;
  stuntsSkills: number[];
  stuntsPartMax: number;
  stuntsExecDeds: ExecDeds;
  stuntsNotes: string;
  // Pyramids
  pyramidsRangeIdx: number | null;
  pyramidsFine: number;
  pyramidsExecDeds: ExecDeds;
  pyramidsDrivers: number;
  pyramidsNotes: string;
  // Tosses
  tossesDiff: number;
  tossesExecDeds: ExecDeds;
  tossesNotes: string;
  // Cross-sheet
  creativityBuilding: number;
  showmanshipBuilding: number;
  // Computed
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

export function BuildingSheetPrintView(p: BuildingPrintData) {
  const primary     = p.organization?.primary_color ?? '#18181b';
  const primaryText = p.organization?.text_on_primary ?? '#ffffff';
  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const stuntSkillLabels = Array.from(
    { length: p.bCfg.stuntsSkillCount },
    (_, i) => i === 4 ? 'Hab #5 / Coed' : `Hab #${i + 1}`,
  );

  return (
    <div className="hidden print:block" style={{ fontFamily: 'sans-serif', fontSize: '10px', color: '#18181b', lineHeight: 1.35 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: primary, color: primaryText, padding: '7px 14px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {p.organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.organization.logo} alt="" style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          )}
          <div>
            {p.organization?.name && <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>{p.organization.name}</p>}
            <p style={{ fontSize: '9px', opacity: 0.75, margin: 0 }}>Planilla de Puntuación · Building (Elevaciones)</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '9px', opacity: 0.8 }}>
          <p style={{ margin: 0 }}>Fecha de impresión</p>
          <p style={{ fontWeight: 600, margin: 0 }}>{today}</p>
        </div>
      </div>

      {/* ── Team / Division ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 14px 6px', borderBottom: `2px solid ${primary}`, marginBottom: '2px' }}>
        <h1 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>{p.teamName}</h1>
        {p.divisionName && <p style={{ fontSize: '9.5px', color: '#71717a', margin: '1px 0 0' }}>{p.divisionName} · Elevaciones (Building)</p>}
      </div>

      <div style={{ padding: '0 14px' }}>

        {/* ── STUNTS ──────────────────────────────────────────────────── */}
        {p.bCfg.hasStunts && (
          <>
            <SectionBar label="Elevaciones — Stunts" primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

              {/* LEFT: Difficulty */}
              <div>
                {p.bCfg.stuntsHasDiff ? (
                  <>
                    <SubLabel text="Rango Base de Complejidad" />
                    <RadioOpts opts={p.bCfg.stuntsRango} selected={p.stuntsRango} primary={primary} primaryText={primaryText} />

                    {p.bCfg.stuntsSkillCount > 0 && (
                      <>
                        <SubLabel text="Grado de Dificultad — Habilidades" />
                        <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse' }}>
                          <tbody>
                            {stuntSkillLabels.map((lbl, i) => (
                              <tr key={lbl}>
                                <td style={{ padding: '1px 3px', width: '72px', color: '#52525b' }}>{lbl}</td>
                                <td style={{ padding: '1px 3px' }}>
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    {p.bCfg.stuntsSkillGrades.map(g => {
                                      const sel = p.stuntsSkills[i] === g.value;
                                      return (
                                        <span key={g.value} style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: sel ? primary : '#f4f4f5', color: sel ? primaryText : '#71717a', fontWeight: sel ? 700 : 400, fontSize: '9px' }}>
                                          {g.label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', paddingTop: '2px', borderTop: '1px solid #e4e4e7', fontSize: '9.5px' }}>
                          <span style={{ color: '#52525b' }}>Total habilidades</span>
                          <strong>{fmt(p.stuntsSkillsTotal)}</strong>
                        </div>
                      </>
                    )}

                    {p.bCfg.stuntsPartMaxOpts.length > 0 && (
                      <>
                        <SubLabel text="Part Max — Spotter / Base" />
                        <RadioOpts opts={p.bCfg.stuntsPartMaxOpts} selected={p.stuntsPartMax} primary={primary} primaryText={primaryText} />
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '3px', borderTop: '1px solid #e4e4e7', fontSize: '9.5px' }}>
                      <span style={{ color: '#52525b' }}>Rango {fmt(p.stuntsRango)} + Drivers {fmt(p.stuntsDriversTotal)}</span>
                      <strong>Dif: {fmt(p.stuntsRango + p.stuntsDriversTotal)}</strong>
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: '9.5px', marginTop: '6px' }}>Sin dificultad — solo ejecución</p>
                )}
              </div>

              {/* RIGHT: Execution */}
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.bCfg.stuntsExecMax)})`} />
                <ExecTable cats={EXEC_CATS} deds={p.stuntsExecDeds} max={p.bCfg.stuntsExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.stuntsNotes} />
            <TotalPill
              label="Total Stunts"
              breakdown={p.bCfg.stuntsHasDiff
                ? `Rango ${fmt(p.stuntsRango)} + Ejec ${fmt(p.stuntsExecTotal)} + Drivers ${fmt(p.stuntsDriversTotal)}`
                : `Ejec ${fmt(p.stuntsExecTotal)}`}
              value={p.stuntsSectionTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── PYRAMIDS ────────────────────────────────────────────────── */}
        {p.bCfg.hasPyramids && (
          <>
            <SectionBar label="Pirámides" primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

              {/* LEFT: Difficulty */}
              <div>
                {p.bCfg.pyramidsHasDiff ? (
                  <>
                    <SubLabel text="Rango" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {p.bCfg.pyramidRango.map((r, idx) => {
                        const sel = p.pyramidsRangeIdx === idx;
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 4px', borderRadius: '3px', backgroundColor: sel ? primary : 'transparent', opacity: sel ? 1 : 0.5 }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${sel ? primaryText : '#52525b'}`, backgroundColor: sel ? primaryText : 'transparent', flexShrink: 0, display: 'inline-block' }} />
                            <span style={{ fontSize: '9.5px', flex: 1, color: sel ? primaryText : '#18181b' }}>{r.label}</span>
                            <span style={{ fontSize: '9px', color: sel ? primaryText : '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>{r.low.toFixed(1)}–{r.high.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {p.pyramidsRangeIdx !== null && p.bCfg.pyramidFineSteps.length > 0 && (
                      <>
                        <SubLabel text="Ajuste dentro del rango" />
                        <ChipOpts
                          opts={p.bCfg.pyramidFineSteps.map(s => ({ value: s, label: `+${s.toFixed(1)}` }))}
                          selected={p.pyramidsFine}
                          primary={primary}
                          primaryText={primaryText}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '9.5px' }}>
                          <span style={{ color: '#52525b' }}>Dificultad pirámides</span>
                          <strong>{fmt(p.pyramidsDiff)}</strong>
                        </div>
                      </>
                    )}

                    {p.bCfg.pyramidDriversOpts.length > 0 && (
                      <>
                        <SubLabel text="Drivers — Pirámides" />
                        <RadioOpts opts={p.bCfg.pyramidDriversOpts} selected={p.pyramidsDrivers} primary={primary} primaryText={primaryText} />
                      </>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: '9.5px', marginTop: '6px' }}>Sin dificultad — solo ejecución</p>
                )}
              </div>

              {/* RIGHT: Execution */}
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.bCfg.pyramidsExecMax)})`} />
                <ExecTable cats={EXEC_CATS} deds={p.pyramidsExecDeds} max={p.bCfg.pyramidsExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.pyramidsNotes} />
            <TotalPill
              label="Total Pirámides"
              breakdown={p.bCfg.pyramidsHasDiff
                ? `Dif ${fmt(p.pyramidsDiff)} + Ejec ${fmt(p.pyramidsExecTotal)}${p.bCfg.pyramidDriversOpts.length > 0 ? ` + Drivers ${fmt(p.pyramidsDrivers)}` : ''}`
                : `Ejec ${fmt(p.pyramidsExecTotal)}`}
              value={p.pyramidsSectionTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── TOSSES ──────────────────────────────────────────────────── */}
        {p.bCfg.hasTosses && (
          <>
            <SectionBar label="Lanzamientos — Tosses" primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <SubLabel text="Dificultad" />
                <RadioOpts opts={p.bCfg.tossDiffOpts} selected={p.tossesDiff} primary={primary} primaryText={primaryText} />
              </div>
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.bCfg.tossesExecMax)})`} />
                <ExecTable cats={TOSS_EXEC_CATS} deds={p.tossesExecDeds} max={p.bCfg.tossesExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.tossesNotes} />
            <TotalPill
              label="Total Lanzamientos"
              breakdown={`Dif ${fmt(p.tossesDiff)} + Ejec ${fmt(p.tossesExecTotal)}`}
              value={p.tossesSectionTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── Building subtotal ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', backgroundColor: primary, color: primaryText, borderRadius: '5px', margin: '8px 0' }}>
          <span style={{ fontWeight: 600, fontSize: '11px' }}>Subtotal Elevaciones</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>{fmt(p.buildingTotal)}</span>
        </div>

        {/* ── Cross-sheet ──────────────────────────────────────────────── */}
        <SectionBar label={p.bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'} primary={primary} primaryText={primaryText} />
        <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 4px' }}>Puntaje de este juez — se promedia con los otros dos jueces al calcular el puntaje final</p>
        {p.bCfg.hasCreativity && (
          <SliderRow label="Creatividad" value={p.creativityBuilding} max={2.0} primary={primary} />
        )}
        <SliderRow
          label={p.bCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
          value={p.showmanshipBuilding}
          max={p.bCfg.showmanshipMax}
          primary={primary}
        />

        {/* ── Grand total ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', backgroundColor: primary, color: primaryText, borderRadius: '6px', margin: '8px 0 4px' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>TOTAL PLANILLA BUILDING</p>
            <p style={{ fontSize: '8.5px', opacity: 0.7, margin: '1px 0 0' }}>
              {p.bCfg.hasCreativity
                ? `Elevaciones ${fmt(p.buildingTotal)} + Creatividad ${fmt(p.creativityBuilding)} + Showmanship ${fmt(p.showmanshipBuilding)}`
                : `Elevaciones ${fmt(p.buildingTotal)} + Cheer/Animación ${fmt(p.showmanshipBuilding)}`}
            </p>
          </div>
          <span style={{ fontWeight: 700, fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sheetTotal)}</span>
        </div>

        {/* ── Score summary table ──────────────────────────────────────── */}
        <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse', marginTop: '6px', borderTop: '1px solid #e4e4e7' }}>
          <tbody>
            {p.bCfg.hasStunts && p.bCfg.stuntsHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Stunts — Dificultad</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.stuntsRango)}</td>
              </tr>
            )}
            {p.bCfg.hasStunts && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Stunts — Ejecución</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.stuntsExecTotal)}</td>
              </tr>
            )}
            {p.bCfg.hasStunts && p.bCfg.stuntsHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Stunts — Drivers (Grades + PM)</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.stuntsDriversTotal)}</td>
              </tr>
            )}
            {p.bCfg.hasPyramids && p.bCfg.pyramidsHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Pirámides — Dificultad</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.pyramidsDiff)}</td>
              </tr>
            )}
            {p.bCfg.hasPyramids && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Pirámides — Ejecución</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.pyramidsExecTotal)}</td>
              </tr>
            )}
            {p.bCfg.hasPyramids && p.bCfg.pyramidDriversOpts.length > 0 && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Pirámides — Drivers</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.pyramidsDrivers)}</td>
              </tr>
            )}
            {p.bCfg.hasTosses && (
              <>
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '2px 4px', color: '#52525b' }}>Lanzamientos — Dificultad</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.tossesDiff)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '2px 4px', color: '#52525b' }}>Lanzamientos — Ejecución</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.tossesExecTotal)}</td>
                </tr>
              </>
            )}
            <tr style={{ backgroundColor: `${primary}15`, borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '3px 4px', fontWeight: 700, color: primary }}>Subtotal Elevaciones</td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: primary }}>{fmt(p.buildingTotal)}</td>
            </tr>
            {p.bCfg.hasCreativity && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Creatividad (este juez)</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.creativityBuilding)}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>{p.bCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.showmanshipBuilding)}</td>
            </tr>
            <tr style={{ backgroundColor: primary }}>
              <td style={{ padding: '4px', fontWeight: 700, fontSize: '11px', color: primaryText }}>TOTAL</td>
              <td style={{ padding: '4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '13px', color: primaryText }}>{fmt(p.sheetTotal)}</td>
            </tr>
          </tbody>
        </table>

      </div>

      <p style={{ marginTop: '12px', padding: '6px 14px 0', fontSize: '8px', color: '#a1a1aa', textAlign: 'center', borderTop: '1px solid #e4e4e7' }}>
        Generado por Cheer Metrics · Ecuador
      </p>
    </div>
  );
}
