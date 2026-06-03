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

function SectionBar({ label, primary, primaryText }: { label: string; primary: string; primaryText: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1.5px solid ${primary}`, paddingBottom: '3px', marginBottom: '5px', marginTop: '10px' }}>
      <div style={{ width: '3px', height: '11px', borderRadius: '2px', backgroundColor: primary, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#52525b', margin: 0 }}>{label}</p>
    </div>
  );
}

function SubLabel({ text }: { text: string }) {
  return <p style={{ fontSize: '8.5px', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '5px 0 2px' }}>{text}</p>;
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

// ── Difficulty card (standing or running) ─────────────────────────────────────

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
          <SubLabel text="Habilidad Realizada / Gran Parte" />
          <div style={{ display: 'flex', gap: '3px' }}>
            {habilidadOpts.map(o => {
              const sel = habilidad === o.value;
              return (
                <span key={o.value} style={{ flex: 1, padding: '2px 4px', borderRadius: '3px', textAlign: 'center', fontSize: '9px', backgroundColor: sel ? primary : '#f4f4f5', color: sel ? primaryText : '#71717a', fontWeight: sel ? 700 : 400 }}>
                  {fmt(o.value)}<br /><span style={{ fontSize: '8px', opacity: 0.8 }}>{o.label}</span>
                </span>
              );
            })}
          </div>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '3px', borderTop: '1px solid #e4e4e7', fontSize: '9.5px' }}>
        <span style={{ color: '#52525b' }}>Base {fmt(rango)} + Hab {fmt(habilidad)}</span>
        <strong>Total: {fmt(rango + habilidad)}</strong>
      </div>
    </div>
  );
}

// ── Jumps diff card ───────────────────────────────────────────────────────────

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
        : <p style={{ fontSize: '9.5px', color: '#a1a1aa', fontStyle: 'italic', margin: 0 }}>Solo ejecución</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface TumblingPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization | null;
  tCfg: TumblingConfig;
  // Standing
  standingRango: number;
  standingHabilidad: number;
  standingExecDeds: ExecDeds;
  standingNotes: string;
  // Running
  runningRango: number;
  runningHabilidad: number;
  runningExecDeds: ExecDeds;
  runningNotes: string;
  // Jumps
  jumpsDiff: number;
  jumpsExecDeds: ExecDeds;
  jumpsNotes: string;
  // Cross-sheet
  creativityTumbling: number;
  showmanshipTumbling: number;
  // Computed
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
            <p style={{ fontSize: '9px', opacity: 0.75, margin: 0 }}>Planilla de Puntuación · Tumbling (Gimnasia)</p>
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
        {p.divisionName && <p style={{ fontSize: '9.5px', color: '#71717a', margin: '1px 0 0' }}>{p.divisionName} · Tumbling (Gimnasia)</p>}
      </div>

      <div style={{ padding: '0 14px' }}>

        {/* ── STANDING ────────────────────────────────────────────────── */}
        {p.tCfg.hasStanding && (
          <>
            <SectionBar label={standingLabel} primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                {p.tCfg.standingHasDiff
                  ? <GymDiffCard label="Estática" rangoOpts={p.tCfg.standingRango} habilidadOpts={p.tCfg.standingHabilidad} rango={p.standingRango} habilidad={p.standingHabilidad} primary={primary} primaryText={primaryText} />
                  : <p style={{ fontSize: '9.5px', color: '#a1a1aa', fontStyle: 'italic', marginTop: '6px' }}>Solo ejecución</p>}
              </div>
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.standingExecMax)})`} />
                <ExecTable cats={STANDING_EXEC_CATS} deds={p.standingExecDeds} max={p.tCfg.standingExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.standingNotes} />
            <TotalPill
              label={p.tCfg.isCombinedSR ? 'Total Gimnasia Combinada' : 'Total Estática'}
              breakdown={p.tCfg.standingHasDiff
                ? `Base ${fmt(p.standingDiffEff)} + Hab ${fmt(p.standingHabEff)} + Ejec ${fmt(p.standingExecTotal)}`
                : `Ejec ${fmt(p.standingExecTotal)}`}
              value={p.standingTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── RUNNING ─────────────────────────────────────────────────── */}
        {p.tCfg.hasRunning && (
          <>
            <SectionBar label="Gimnasia Con Carrera (Running)" primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                {p.tCfg.runningHasDiff
                  ? <GymDiffCard label="Con Carrera" rangoOpts={p.tCfg.runningRango} habilidadOpts={p.tCfg.runningHabilidad} rango={p.runningRango} habilidad={p.runningHabilidad} primary={primary} primaryText={primaryText} />
                  : <p style={{ fontSize: '9.5px', color: '#a1a1aa', fontStyle: 'italic', marginTop: '6px' }}>Solo ejecución</p>}
              </div>
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.runningExecMax)})`} />
                <ExecTable cats={STANDING_EXEC_CATS} deds={p.runningExecDeds} max={p.tCfg.runningExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.runningNotes} />
            <TotalPill
              label="Total Con Carrera"
              breakdown={p.tCfg.runningHasDiff
                ? `Base ${fmt(p.runningDiffEff)} + Hab ${fmt(p.runningHabEff)} + Ejec ${fmt(p.runningExecTotal)}`
                : `Ejec ${fmt(p.runningExecTotal)}`}
              value={p.runningTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── JUMPS ───────────────────────────────────────────────────── */}
        {p.tCfg.hasJumps && (
          <>
            <SectionBar label="Saltos" primary={primary} primaryText={primaryText} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <JumpsDiffCard diffOpts={p.tCfg.jumpsDiffOpts} jumpsDiff={p.jumpsDiff} primary={primary} primaryText={primaryText} />
              </div>
              <div>
                <SubLabel text={`Ejecución (máx ${fmt(p.tCfg.jumpsExecMax)})`} />
                <ExecTable cats={JUMPS_EXEC_CATS} deds={p.jumpsExecDeds} max={p.tCfg.jumpsExecMax} primary={primary} />
              </div>
            </div>
            <NoteBox text={p.jumpsNotes} />
            <TotalPill
              label="Total Saltos"
              breakdown={p.tCfg.jumpsHasDiff
                ? `Dif ${fmt(p.jumpsDiffEff)} + Ejec ${fmt(p.jumpsExecTotal)}`
                : `Ejec ${fmt(p.jumpsExecTotal)}`}
              value={p.jumpsTotal}
              primary={primary}
              primaryText={primaryText}
            />
          </>
        )}

        {/* ── Tumbling subtotal ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', backgroundColor: primary, color: primaryText, borderRadius: '5px', margin: '8px 0' }}>
          <span style={{ fontWeight: 600, fontSize: '11px' }}>Subtotal Gimnasia</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>{fmt(p.tumblingSubtotal)}</span>
        </div>

        {/* ── Cross-sheet ──────────────────────────────────────────────── */}
        <SectionBar label={p.tCfg.hasCreativity ? 'Creatividad & Showmanship' : 'Cheer / Animación'} primary={primary} primaryText={primaryText} />
        <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 4px' }}>Puntaje de este juez — se promedia con los otros dos jueces al calcular el puntaje final</p>
        {p.tCfg.hasCreativity && (
          <SliderRow label="Creatividad" value={p.creativityTumbling} max={2.0} primary={primary} />
        )}
        <SliderRow
          label={p.tCfg.hasCreativity ? 'Showmanship' : 'Cheer / Animación'}
          value={p.showmanshipTumbling}
          max={p.tCfg.showmanshipMax}
          primary={primary}
        />

        {/* ── Grand total ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', backgroundColor: primary, color: primaryText, borderRadius: '6px', margin: '8px 0 4px' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>TOTAL PLANILLA TUMBLING</p>
            <p style={{ fontSize: '8.5px', opacity: 0.7, margin: '1px 0 0' }}>
              {p.tCfg.hasCreativity
                ? `Gimnasia ${fmt(p.tumblingSubtotal)} + Creatividad ${fmt(p.creativityTumbling)} + Showmanship ${fmt(p.showmanshipTumbling)}`
                : `Gimnasia ${fmt(p.tumblingSubtotal)} + Cheer/Animación ${fmt(p.showmanshipTumbling)}`}
            </p>
          </div>
          <span style={{ fontWeight: 700, fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sheetTotal)}</span>
        </div>

        {/* ── Score summary table ──────────────────────────────────────── */}
        <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse', marginTop: '6px', borderTop: '1px solid #e4e4e7' }}>
          <tbody>
            {p.tCfg.hasStanding && p.tCfg.standingHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>{p.tCfg.isCombinedSR ? 'Gimnasia Comb.' : 'Estática'} — Dificultad</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.standingDiffEff + p.standingHabEff)}</td>
              </tr>
            )}
            {p.tCfg.hasStanding && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>{p.tCfg.isCombinedSR ? 'Gimnasia Comb.' : 'Estática'} — Ejecución</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.standingExecTotal)}</td>
              </tr>
            )}
            {p.tCfg.hasRunning && p.tCfg.runningHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Con Carrera — Dificultad</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.runningDiffEff + p.runningHabEff)}</td>
              </tr>
            )}
            {p.tCfg.hasRunning && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Con Carrera — Ejecución</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.runningExecTotal)}</td>
              </tr>
            )}
            {p.tCfg.hasJumps && p.tCfg.jumpsHasDiff && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Saltos — Dificultad</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.jumpsDiffEff)}</td>
              </tr>
            )}
            {p.tCfg.hasJumps && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Saltos — Ejecución</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.jumpsExecTotal)}</td>
              </tr>
            )}
            <tr style={{ backgroundColor: `${primary}15`, borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '3px 4px', fontWeight: 700, color: primary }}>Subtotal Gimnasia</td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: primary }}>{fmt(p.tumblingSubtotal)}</td>
            </tr>
            {p.tCfg.hasCreativity && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Creatividad (este juez)</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.creativityTumbling)}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>{p.tCfg.hasCreativity ? 'Showmanship (este juez)' : 'Cheer / Animación (este juez)'}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.showmanshipTumbling)}</td>
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
