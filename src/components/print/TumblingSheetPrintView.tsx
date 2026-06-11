import type { Organization } from '@/types/competitions';
import type { TumblingConfig } from '@/lib/scoringConfig';

type ExecDeds = (number | null)[];

const STANDING_EXEC_CATS = ['Aprox.', 'Con. Corporal', 'Aterrizajes', 'Sinc'];
const JUMPS_EXEC_CATS    = ['P. Brazos', 'P. Piernas', 'Sinc'];
const EXEC_DED_OPTS      = [0.05, 0.10, 0.20, 0.30];
const DED_LABELS         = ['Mín.', 'Men.', 'Múlt.', 'Gen.'];

function fmt(n: number) { return n.toFixed(2); }

function execScore(max: number, deds: ExecDeds) {
  return Math.max(0, max - deds.reduce<number>((s, d) => s + (d ?? 0), 0));
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBar({ label, primary }: { label: string; primary: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `1.5px solid ${primary}20`, paddingBottom: '6px', marginBottom: '8px' }}>
      <div style={{ width: '4px', height: '16px', borderRadius: '3px', backgroundColor: primary, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#3f3f46', margin: 0 }}>{label}</p>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 3px' }}>{text}</p>;
}

function RadioOpts({ opts, selected, primary, primaryText }: {
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
          <div key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', backgroundColor: active ? primary : '#f4f4f5', border: `1px solid ${active ? primary : '#e4e4e7'}`, opacity: active ? 1 : 0.55 }}>
            <span style={{ fontSize: '8.5px', color: active ? primaryText : '#52525b', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: active ? primaryText : '#71717a', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ExecTable({ cats, deds, max, primary }: { cats: string[]; deds: ExecDeds; max: number; primary: string }) {
  const total = deds.reduce<number>((s, d) => s + (d ?? 0), 0);
  const score = execScore(max, deds);
  return (
    <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, borderBottom: '1px solid #e4e4e7' }}>Categoría</th>
          {EXEC_DED_OPTS.map((a, i) => (
            <th key={a} style={{ textAlign: 'center', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, width: '38px', borderBottom: '1px solid #e4e4e7' }}>
              −{fmt(a)}<br /><span style={{ fontSize: '7.5px' }}>{DED_LABELS[i]}</span>
            </th>
          ))}
          <th style={{ textAlign: 'right', padding: '1px 3px 2px', color: '#a1a1aa', fontWeight: 500, width: '32px', borderBottom: '1px solid #e4e4e7' }}>Ded.</th>
        </tr>
      </thead>
      <tbody>
        {cats.map((cat, i) => (
          <tr key={cat} style={{ borderBottom: '1px solid #f4f4f5' }}>
            <td style={{ padding: '2px 3px', fontSize: '9px' }}>{cat}</td>
            {EXEC_DED_OPTS.map(a => {
              const sel = deds[i] === a;
              return (
                <td key={a} style={{ textAlign: 'center', padding: '2px 3px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${sel ? '#dc2626' : '#d4d4d8'}`, backgroundColor: sel ? '#dc2626' : 'transparent' }} />
                </td>
              );
            })}
            <td style={{ textAlign: 'right', padding: '2px 3px', color: deds[i] != null ? '#dc2626' : '#d4d4d8', fontVariantNumeric: 'tabular-nums', fontSize: '9px' }}>
              {deds[i] != null ? `−${fmt(deds[i]!)}` : '—'}
            </td>
          </tr>
        ))}
        <tr style={{ borderTop: '1.5px solid #d4d4d8', backgroundColor: '#f4f4f5' }}>
          <td colSpan={EXEC_DED_OPTS.length + 1} style={{ padding: '2px 3px', color: '#52525b', fontSize: '9px' }}>
            Desc. total: <span style={{ color: total > 0 ? '#dc2626' : '#71717a', fontWeight: 600 }}>−{fmt(total)}</span>
          </td>
          <td style={{ textAlign: 'right', padding: '2px 3px', fontWeight: 700, color: total > 0 ? '#dc2626' : '#18181b', fontVariantNumeric: 'tabular-nums', fontSize: '9px' }}>{fmt(score)}</td>
        </tr>
      </tbody>
    </table>
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

function GymDiffCard({ label, rangoOpts, habilidadOpts, rango, habilidad, primary, primaryText }: {
  label: string;
  rangoOpts: { value: number; label: string }[];
  habilidadOpts: { value: number; label: string }[];
  rango: number;
  habilidad: number;
  primary: string;
  primaryText: string;
}) {
  return (
    <div>
      <SubLabel text={`${label} — Dificultad`} />
      <RadioOpts opts={rangoOpts} selected={rango} primary={primary} primaryText={primaryText} />
      {habilidadOpts.length > 0 && (
        <>
          <SubLabel text="Habilidad / Gran Parte" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {habilidadOpts.map(o => {
              const sel = habilidad === o.value;
              return (
                <span key={o.value} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '8.5px', backgroundColor: sel ? primary : '#f4f4f5', border: `1px solid ${sel ? primary : '#e4e4e7'}`, color: sel ? primaryText : '#71717a', fontWeight: sel ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(o.value)} <span style={{ fontSize: '8px', opacity: 0.8 }}>{o.label}</span>
                </span>
              );
            })}
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '3px', borderTop: '1px solid #e4e4e7', fontSize: '9px' }}>
        <span style={{ color: '#52525b' }}>Base {fmt(rango)} + Hab {fmt(habilidad)}</span>
        <strong>Total: {fmt(rango + habilidad)}</strong>
      </div>
    </div>
  );
}

function JumpsDiffCard({ diffOpts, jumpsDiff, primary, primaryText }: {
  diffOpts: { value: number; label: string }[];
  jumpsDiff: number;
  primary: string;
  primaryText: string;
}) {
  return (
    <div>
      <SubLabel text="Saltos — Dificultad" />
      {diffOpts.length > 0
        ? <RadioOpts opts={diffOpts} selected={jumpsDiff} primary={primary} primaryText={primaryText} />
        : <p style={{ fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic', margin: 0 }}>Solo ejecución</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface TumblingPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization | null;
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

export function TumblingSheetPrintView(p: TumblingPrintData) {
  const primary     = p.organization?.primary_color ?? '#18181b';
  const primaryText = p.organization?.text_on_primary ?? '#ffffff';
  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const standingLabel = p.tCfg.isCombinedSR ? 'Gimnasia Estática + Carrera (Combinadas)' : 'Gimnasia Estática (Standing)';

  // Max values for summary
  const maxStandingDiff = (p.tCfg.standingRango.length > 0 ? Math.max(...p.tCfg.standingRango.map(r => r.value)) : 0)
                        + (p.tCfg.standingHabilidad.length > 0 ? Math.max(...p.tCfg.standingHabilidad.map(r => r.value)) : 0);
  const maxRunningDiff  = (p.tCfg.runningRango.length > 0 ? Math.max(...p.tCfg.runningRango.map(r => r.value)) : 0)
                        + (p.tCfg.runningHabilidad.length > 0 ? Math.max(...p.tCfg.runningHabilidad.map(r => r.value)) : 0);
  const maxJumpsDiff    = p.tCfg.jumpsDiffOpts.length > 0 ? Math.max(...p.tCfg.jumpsDiffOpts.map(o => o.value)) : 0;

  return (
    <div className="hidden print:block" style={{ fontFamily: 'sans-serif', fontSize: '9.5px', color: '#18181b', lineHeight: 1.35 }}>
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
            <p style={{ fontSize: '8.5px', opacity: 0.75, margin: 0 }}>Planilla de Puntuación · Tumbling (Gimnasia)</p>
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
        {p.divisionName && <p style={{ fontSize: '9px', color: '#71717a', margin: '1px 0 0' }}>{p.divisionName} · Tumbling (Gimnasia)</p>}
      </div>

      {/* ── 2-column body ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', padding: '0 14px' }}>

        {/* ── LEFT: scoring sections ──────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* STANDING card */}
          {p.tCfg.hasStanding && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label={standingLabel} primary={primary} />
              {p.tCfg.standingHasDiff
                ? <GymDiffCard label="Estática" rangoOpts={p.tCfg.standingRango} habilidadOpts={p.tCfg.standingHabilidad} rango={p.standingRango} habilidad={p.standingHabilidad} primary={primary} primaryText={primaryText} />
                : <p style={{ fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic', margin: '0 0 6px' }}>Solo ejecución</p>}
              <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.standingExecMax)})`} />
              <ExecTable cats={STANDING_EXEC_CATS} deds={p.standingExecDeds} max={p.tCfg.standingExecMax} primary={primary} />
              <TotalPill
                label={p.tCfg.isCombinedSR ? 'Total Gimnasia Combinada' : 'Total Estática'}
                breakdown={p.tCfg.standingHasDiff
                  ? `Base ${fmt(p.standingDiffEff)} + Hab ${fmt(p.standingHabEff)} + Ejec ${fmt(p.standingExecTotal)}`
                  : `Ejec ${fmt(p.standingExecTotal)}`}
                value={p.standingTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* RUNNING card */}
          {p.tCfg.hasRunning && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label="Gimnasia Con Carrera (Running)" primary={primary} />
              {p.tCfg.runningHasDiff
                ? <GymDiffCard label="Con Carrera" rangoOpts={p.tCfg.runningRango} habilidadOpts={p.tCfg.runningHabilidad} rango={p.runningRango} habilidad={p.runningHabilidad} primary={primary} primaryText={primaryText} />
                : <p style={{ fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic', margin: '0 0 6px' }}>Solo ejecución</p>}
              <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.runningExecMax)})`} />
              <ExecTable cats={STANDING_EXEC_CATS} deds={p.runningExecDeds} max={p.tCfg.runningExecMax} primary={primary} />
              <TotalPill
                label="Total Con Carrera"
                breakdown={p.tCfg.runningHasDiff
                  ? `Base ${fmt(p.runningDiffEff)} + Hab ${fmt(p.runningHabEff)} + Ejec ${fmt(p.runningExecTotal)}`
                  : `Ejec ${fmt(p.runningExecTotal)}`}
                value={p.runningTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* JUMPS card */}
          {p.tCfg.hasJumps && (
            <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
              <SectionBar label="Saltos" primary={primary} />
              <JumpsDiffCard diffOpts={p.tCfg.jumpsDiffOpts} jumpsDiff={p.jumpsDiff} primary={primary} primaryText={primaryText} />
              <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.jumpsExecMax)})`} />
              <ExecTable cats={JUMPS_EXEC_CATS} deds={p.jumpsExecDeds} max={p.tCfg.jumpsExecMax} primary={primary} />
              <TotalPill
                label="Total Saltos"
                breakdown={p.tCfg.jumpsHasDiff
                  ? `Dif ${fmt(p.jumpsDiffEff)} + Ejec ${fmt(p.jumpsExecTotal)}`
                  : `Ejec ${fmt(p.jumpsExecTotal)}`}
                value={p.jumpsTotal}
                primary={primary}
                primaryText={primaryText}
              />
            </div>
          )}

          {/* Subtotal bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', backgroundColor: primary, color: primaryText, borderRadius: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '11px' }}>Subtotal Gimnasia</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '14px' }}>{fmt(p.tumblingSubtotal)}</span>
          </div>
        </div>

        {/* ── RIGHT: cross-sheet + grand total + summary ──────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Grand total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: primary, color: primaryText, borderRadius: '8px' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '11px', margin: 0 }}>TOTAL PLANILLA TUMBLING</p>
              <p style={{ fontSize: '8.5px', opacity: 0.7, margin: '2px 0 0' }}>
                {p.tCfg.hasCreativity
                  ? `Gimn. ${fmt(p.tumblingSubtotal)} + Creat. ${fmt(p.creativityTumbling)} + Show. ${fmt(p.showmanshipTumbling)}`
                  : `Gimn. ${fmt(p.tumblingSubtotal)} + Cheer ${fmt(p.showmanshipTumbling)}`}
              </p>
            </div>
            <span style={{ fontWeight: 700, fontSize: '24px', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sheetTotal)}</span>
          </div>

          {/* Creativity / Showmanship card */}
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '8px', padding: '10px 12px', backgroundColor: '#fafafa' }}>
            <SectionBar label={p.tCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'} primary={primary} />
            <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 6px' }}>Se promedia con los otros dos jueces</p>
            {p.tCfg.hasCreativity && (
              <SliderRow label="Creatividad" value={p.creativityTumbling} max={2.0} primary={primary} />
            )}
            <SliderRow
              label={p.tCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
              value={p.showmanshipTumbling}
              max={p.tCfg.showmanshipMax}
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
                {p.tCfg.hasStanding && p.tCfg.standingHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>{p.tCfg.isCombinedSR ? 'Gimn. Comb.' : 'Estática'} — Dificultad</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.standingDiffEff + p.standingHabEff)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxStandingDiff)}</span>
                    </td>
                  </tr>
                )}
                {p.tCfg.hasStanding && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>{p.tCfg.isCombinedSR ? 'Gimn. Comb.' : 'Estática'} — Ejecución</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.standingExecTotal)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(p.tCfg.standingExecMax)}</span>
                    </td>
                  </tr>
                )}
                {p.tCfg.hasRunning && p.tCfg.runningHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Con Carrera — Dificultad</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.runningDiffEff + p.runningHabEff)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxRunningDiff)}</span>
                    </td>
                  </tr>
                )}
                {p.tCfg.hasRunning && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Con Carrera — Ejecución</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.runningExecTotal)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(p.tCfg.runningExecMax)}</span>
                    </td>
                  </tr>
                )}
                {p.tCfg.hasJumps && p.tCfg.jumpsHasDiff && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Saltos — Dificultad</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.jumpsDiffEff)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(maxJumpsDiff)}</span>
                    </td>
                  </tr>
                )}
                {p.tCfg.hasJumps && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Saltos — Ejecución</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.jumpsExecTotal)}</span>
                      <span style={{ color: '#a1a1aa' }}> / {fmt(p.tCfg.jumpsExecMax)}</span>
                    </td>
                  </tr>
                )}
                <tr style={{ backgroundColor: `${primary}12`, borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '4px 10px', fontWeight: 700, color: primary }}>Subtotal Gimnasia</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: primary }}>{fmt(p.tumblingSubtotal)}</td>
                </tr>
                {p.tCfg.hasCreativity && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '4px 10px', color: '#52525b' }}>Creatividad (este juez)</td>
                    <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700 }}>{fmt(p.creativityTumbling)}</span>
                      <span style={{ color: '#a1a1aa' }}> / 2.00</span>
                    </td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '4px 10px', color: '#52525b' }}>{p.tCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td>
                  <td style={{ padding: '4px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700 }}>{fmt(p.showmanshipTumbling)}</span>
                    <span style={{ color: '#a1a1aa' }}> / {fmt(p.tCfg.showmanshipMax)}</span>
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
