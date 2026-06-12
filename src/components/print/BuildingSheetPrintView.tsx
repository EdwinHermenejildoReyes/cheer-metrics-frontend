import type { Organization } from '@/types/competitions';
import type { BuildingConfig } from '@/lib/scoringConfig';

type ExecDeds = (number | null)[];

function fmt(n: number) { return n.toFixed(2); }

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBar({ label, primary }: { label: string; primary: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `1.5px solid ${primary}20`, paddingBottom: '6px', marginBottom: '8px' }}>
      <div style={{ width: '4px', height: '16px', borderRadius: '3px', backgroundColor: primary, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#3f3f46', margin: 0 }}>{label}</p>
    </div>
  );
}

function RadioOpts({ opts, selected, primary, primaryText }: {
  opts: { value: number; label: string }[];
  selected: number | null;
  primary: string;
  primaryText: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
      {opts.map(o => {
        const active = selected !== null && o.value === selected;
        return (
          <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', backgroundColor: active ? primary : '#f4f4f5', border: `1px solid ${active ? primary : '#e4e4e7'}`, opacity: active ? 1 : 0.55 }}>
            <span style={{ fontSize: '8.5px', color: active ? primaryText : '#52525b', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: active ? primaryText : '#71717a', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.value)}</span>
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
      {opts.map(o => {
        const active = o.value === selected;
        return (
          <span key={o.value} style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '8px', fontVariantNumeric: 'tabular-nums', backgroundColor: active ? primary : '#f4f4f5', color: active ? primaryText : '#71717a', fontWeight: active ? 700 : 400 }}>
            {fmt(o.value)}
          </span>
        );
      })}
    </div>
  );
}

function TotalPill({ label, breakdown, value, primary, primaryText }: {
  label: string; breakdown: string; value: number; primary: string; primaryText: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: `${primary}15`, borderRadius: '6px', marginTop: '8px', fontSize: '10px', border: `1px solid ${primary}25` }}>
      <div>
        <span style={{ fontWeight: 700, color: '#18181b' }}>{label}</span>
        {breakdown && <span style={{ color: '#71717a', marginLeft: '6px', fontSize: '8.5px' }}>{breakdown}</span>}
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '13px', color: primary }}>{fmt(value)}</span>
    </div>
  );
}

function SliderRow({ label, value, max, primary }: { label: string; value: number; max: number; primary: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '10px' }}>
      <span style={{ width: '110px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '5px', backgroundColor: '#e4e4e7', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: primary, borderRadius: '3px' }} />
      </div>
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: '52px', textAlign: 'right' }}>{fmt(value)} / {fmt(max)}</span>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 3px' }}>{text}</p>;
}

// ── Main component ────────────────────────────────────────────────────────────

export interface BuildingPrintData {
  className?: string;
  teamName: string;
  divisionName?: string;
  organization?: Organization | null;
  bCfg: BuildingConfig;
  stuntsRango: number;
  stuntsSkills: (number | null)[];
  stuntsPartMax: number | null;
  stuntsExecDeds: ExecDeds;
  stuntsNotes: string;
  pyramidsRangeIdx: number | null;
  pyramidsFine: number;
  pyramidsExecDeds: ExecDeds;
  pyramidsDrivers: number;
  pyramidsNotes: string;
  tossesDiff: number;
  tossesExecDeds: ExecDeds;
  tossesNotes: string;
  creativityBuilding: number;
  showmanshipBuilding: number;
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

  // Max values for summary
  const maxStuntsRango     = p.bCfg.stuntsRango.length > 0 ? Math.max(...p.bCfg.stuntsRango.map(r => r.value)) : 0;
  const maxStuntsSkills    = p.bCfg.stuntsSkillCount > 0 && p.bCfg.stuntsSkillGrades.length > 0
    ? p.bCfg.stuntsSkillCount * Math.max(...p.bCfg.stuntsSkillGrades.map(g => g.value)) : 0;
  const maxStuntsPartMax   = p.bCfg.stuntsPartMaxOpts.length > 0 ? Math.max(...p.bCfg.stuntsPartMaxOpts.map(o => o.value)) : 0;
  const maxStuntsDrivers   = parseFloat((maxStuntsSkills + maxStuntsPartMax).toFixed(2));
  const maxPyramidsDiff    = p.bCfg.pyramidRango.length > 0
    ? parseFloat((p.bCfg.pyramidRango[p.bCfg.pyramidRango.length - 1].high +
        (p.bCfg.pyramidFineSteps.length > 0 ? Math.max(...p.bCfg.pyramidFineSteps) : 0)).toFixed(1)) : 0;
  const maxPyramidsDrivers = p.bCfg.pyramidDriversOpts.length > 0 ? Math.max(...p.bCfg.pyramidDriversOpts.map(o => o.value)) : 0;
  const maxTossesDiff      = p.bCfg.tossDiffOpts.length > 0 ? Math.max(...p.bCfg.tossDiffOpts.map(o => o.value)) : 0;

  return (
    <div className={p.className ?? 'hidden print:block'} style={{ fontFamily: 'sans-serif', fontSize: '9.5px', color: '#18181b', lineHeight: 1.35 }}>

      {/* @page margins */}
      <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } }`}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: primary, color: primaryText, padding: '7px 14px', marginBottom: '7px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {p.organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.organization.logo} alt="" style={{ height: '26px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          )}
          <div>
            {p.organization?.name && <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>{p.organization.name}</p>}
            <p style={{ fontSize: '8.5px', opacity: 0.75, margin: 0 }}>Planilla de Puntuación · Building (Elevaciones)</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8.5px', opacity: 0.8 }}>
          <p style={{ margin: 0 }}>Fecha de impresión</p>
          <p style={{ fontWeight: 600, margin: 0 }}>{today}</p>
        </div>
      </div>

      {/* ── Team / Division ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 14px 5px', borderBottom: `2px solid ${primary}`, marginBottom: '6px' }}>
        <h1 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{p.teamName}</h1>
        {p.divisionName && <p style={{ fontSize: '9px', color: '#71717a', margin: '1px 0 0' }}>{p.divisionName} · Elevaciones (Building)</p>}
      </div>

      {/* ── 2-column body ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', padding: '0 14px' }}>

        {/* ── LEFT: scoring sections ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* STUNTS card */}
          {p.bCfg.hasStunts && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label="Elevaciones — Stunts" primary={primary} />
              {p.bCfg.stuntsHasDiff ? (
                <>
                  <SubLabel text="Rango Base de Complejidad" />
                  <RadioOpts opts={p.bCfg.stuntsRango} selected={p.stuntsRango} primary={primary} primaryText={primaryText} />

                  {p.bCfg.stuntsSkillCount > 0 && (
                    <>
                      <SubLabel text="Grado de Dificultad — Habilidades" />
                      <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                        <tbody>
                          {stuntSkillLabels.map((lbl, i) => (
                            <tr key={lbl} style={{ borderBottom: '1px solid #f4f4f5' }}>
                              <td style={{ padding: '2px 3px', width: '68px', color: '#52525b' }}>{lbl}</td>
                              <td style={{ padding: '2px 3px' }}>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {p.bCfg.stuntsSkillGrades.map(g => {
                                    const sel = p.stuntsSkills[i] !== null && p.stuntsSkills[i] === g.value;
                                    return (
                                      <span key={g.value} style={{ padding: '1px 5px', borderRadius: '3px', backgroundColor: sel ? primary : '#f4f4f5', color: sel ? primaryText : '#71717a', fontWeight: sel ? 700 : 400, fontSize: '8px' }}>
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
                    </>
                  )}

                  {p.bCfg.stuntsPartMaxOpts.length > 0 && (
                    <>
                      <SubLabel text="Part Max — Spotter / Base" />
                      <RadioOpts opts={p.bCfg.stuntsPartMaxOpts} selected={p.stuntsPartMax} primary={primary} primaryText={primaryText} />
                    </>
                  )}
                </>
              ) : (
                <p style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: '9px', margin: '4px 0 0' }}>Sin dificultad</p>
              )}
              <TotalPill
                label="Total Stunts"
                breakdown={p.bCfg.stuntsHasDiff ? `Rango ${fmt(p.stuntsRango)} + Drivers ${fmt(p.stuntsDriversTotal)}` : ''}
                value={p.stuntsSectionTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* PYRAMIDS card */}
          {p.bCfg.hasPyramids && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label="Pirámides" primary={primary} />
              {p.bCfg.pyramidsHasDiff ? (
                <>
                  <SubLabel text="Rango" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {p.bCfg.pyramidRango.map((r, idx) => {
                      const sel = p.pyramidsRangeIdx === idx;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', backgroundColor: sel ? primary : '#f4f4f5', border: `1px solid ${sel ? primary : '#e4e4e7'}`, opacity: sel ? 1 : 0.55 }}>
                          <span style={{ fontSize: '8.5px', color: sel ? primaryText : '#52525b' }}>{r.label}</span>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: sel ? primaryText : '#a1a1aa', fontVariantNumeric: 'tabular-nums' }}>{r.low.toFixed(1)}–{r.high.toFixed(1)}</span>
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
                <p style={{ color: '#a1a1aa', fontStyle: 'italic', fontSize: '9px', margin: '4px 0 0' }}>Sin dificultad</p>
              )}
              <TotalPill
                label="Total Pirámides"
                breakdown={p.bCfg.pyramidsHasDiff
                  ? `Rango ${fmt(p.pyramidsDiff)}${p.bCfg.pyramidDriversOpts.length > 0 ? ` + Dr. ${fmt(p.pyramidsDrivers)}` : ''}`
                  : ''}
                value={p.pyramidsSectionTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* TOSSES card */}
          {p.bCfg.hasTosses && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label="Lanzamientos — Tosses" primary={primary} />
              <SubLabel text="Dificultad" />
              <RadioOpts opts={p.bCfg.tossDiffOpts} selected={p.tossesDiff} primary={primary} primaryText={primaryText} />
              <TotalPill
                label="Total Lanzamientos"
                breakdown={`Dif ${fmt(p.tossesDiff)}`}
                value={p.tossesSectionTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* Building subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', backgroundColor: primary, color: primaryText, borderRadius: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '11px' }}>Subtotal Elevaciones</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>{fmt(p.buildingTotal)}</span>
          </div>
        </div>

        {/* ── RIGHT: grand total + cross-sheet + summary ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Grand total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: primary, color: primaryText, borderRadius: '8px' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '11px', margin: 0 }}>TOTAL PLANILLA BUILDING</p>
              <p style={{ fontSize: '8.5px', opacity: 0.7, margin: '2px 0 0' }}>
                {p.bCfg.hasCreativity
                  ? `Elev. ${fmt(p.buildingTotal)} + Creat. ${fmt(p.creativityBuilding)} + Show. ${fmt(p.showmanshipBuilding)}`
                  : `Elev. ${fmt(p.buildingTotal)} + Cheer ${fmt(p.showmanshipBuilding)}`}
              </p>
            </div>
            <span style={{ fontWeight: 700, fontSize: '24px', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sheetTotal)}</span>
          </div>

          {/* Creativity / Showmanship card */}
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
            <SectionBar label={p.bCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'} primary={primary} />
            <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 6px' }}>Se promedia con los otros dos jueces</p>
            {p.bCfg.hasCreativity && (
              <SliderRow label="Creatividad" value={p.creativityBuilding} max={2.0} primary={primary} />
            )}
            <SliderRow
              label={p.bCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
              value={p.showmanshipBuilding}
              max={p.bCfg.showmanshipMax}
              primary={primary}
            />
          </div>

          {/* Score summary card */}
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fafafa' }}>
            <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #e4e4e7' }}>
              <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Resumen de puntajes</p>
            </div>
            <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse' }}>
              <tbody>
                {p.bCfg.hasStunts && p.bCfg.stuntsHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Stunts — Dificultad (Rango)</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.stuntsRango)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxStuntsRango)}</span>
                    </td>
                  </tr>
                )}
                {p.bCfg.hasStunts && p.bCfg.stuntsHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Stunts — Drivers (Grades + PM)</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.stuntsDriversTotal)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxStuntsDrivers)}</span>
                    </td>
                  </tr>
                )}
                {p.bCfg.hasPyramids && p.bCfg.pyramidsHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Pirámides — Dificultad</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.pyramidsDiff)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxPyramidsDiff)}</span>
                    </td>
                  </tr>
                )}
                {p.bCfg.hasPyramids && p.bCfg.pyramidDriversOpts.length > 0 && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Pirámides — Drivers</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.pyramidsDrivers)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxPyramidsDrivers)}</span>
                    </td>
                  </tr>
                )}
                {p.bCfg.hasTosses && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Lanzamientos — Dificultad</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.tossesDiff)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxTossesDiff)}</span>
                    </td>
                  </tr>
                )}
                <tr style={{ backgroundColor: `${primary}12`, borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '4px 10px', fontWeight: 700, color: primary }}>Subtotal Elevaciones</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: primary }}>{fmt(p.buildingTotal)}</td>
                </tr>
                {p.bCfg.hasCreativity && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Creatividad (este juez)</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.creativityBuilding)}</span>
                      <span style={{ color: '#a1a1aa' }}> / 2.00</span>
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '4px 10px', color: '#52525b' }}>{p.bCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700 }}>{fmt(p.showmanshipBuilding)}</span>
                    <span style={{ color: '#a1a1aa' }}> / {fmt(p.bCfg.showmanshipMax)}</span>
                  </td>
                </tr>
                <tr style={{ backgroundColor: primary }}>
                  <td style={{ padding: '5px 10px', fontWeight: 700, fontSize: '11px', color: primaryText }}>TOTAL</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '14px', color: primaryText }}>{fmt(p.sheetTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <p style={{ marginTop: '10px', padding: '5px 14px 0', fontSize: '8px', color: '#a1a1aa', textAlign: 'center', borderTop: '1px solid #e4e4e7' }}>
        Generado por Cheer Metrics · Ecuador
      </p>
    </div>
  );
}
