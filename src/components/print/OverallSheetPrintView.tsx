import type { Organization } from '@/types/competitions';

const FORMATIONS_VALUES = [2.0, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0];

const DANCE_DIFF_CRITERIA = [
  'Elementos Visuales', 'Trabajo de Pies', 'Trabajo en Parejas',
  'Variedad de Niveles', 'Trabajo de Suelo', 'Velocidad',
];
const DANCE_EXEC_CRITERIA = [
  'Técnica', 'Fuerza / Precisión de Movimientos',
  'Perfección', 'Sincronización / Timing', 'Energía / Entretenimiento',
];

function fmt(n: number) { return n.toFixed(2); }

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBar({ label, primary }: { label: string; primary: string }) {
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

function NoteBox({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div style={{ marginTop: '4px', padding: '3px 6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '3px', fontSize: '9.5px' }}>
      <span style={{ fontWeight: 600, color: '#92400e' }}>Comentarios: </span>
      <span style={{ color: '#78350f' }}>{text}</span>
    </div>
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

// ── Dance level card ──────────────────────────────────────────────────────────

function DanceLevelCard({ label, criteria, levels, selected, primary, primaryText }: {
  label: string;
  criteria: string[];
  levels: { label: string; sublabel: string; value: number }[];
  selected: number;
  primary: string;
  primaryText: string;
}) {
  return (
    <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden' }}>
      <div style={{ padding: '4px 8px', backgroundColor: '#3f3f46', borderBottom: '1px solid #3f3f46' }}>
        <p style={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff', margin: '0 0 2px' }}>{label}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 8px' }}>
          {criteria.map(c => (
            <span key={c} style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)' }}>· {c}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${levels.length}, 1fr)` }}>
        {levels.map(({ label: lbl, sublabel, value: v }) => {
          const active = selected === v;
          return (
            <div key={v} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              padding: '6px 4px',
              backgroundColor: active ? primary : '#fafafa',
              color: active ? primaryText : '#18181b',
              borderRight: '1px solid #e4e4e7',
              textAlign: 'center',
            }}>
              <span style={{ fontWeight: 700, fontSize: '16px', fontVariantNumeric: 'tabular-nums', opacity: active ? 1 : 0.35 }}>{fmt(v)}</span>
              <span style={{ fontWeight: 700, fontSize: '9px', opacity: active ? 1 : 0.4 }}>{lbl}</span>
              <span style={{ fontSize: '8px', opacity: active ? 0.75 : 0.35 }}>{sublabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface OverallPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization | null;
  isEscolarAB: boolean;
  danceDiffLevels: { label: string; sublabel: string; value: number }[];
  danceExecLevels: { label: string; sublabel: string; value: number }[];
  showmanshipMax: number;
  // State
  formationsScore: number;
  danceDifficulty: number;
  danceExecution: number;
  creativityOverall: number;
  showmanshipOverall: number;
  formationsNotes: string;
  danceNotes: string;
  // Computed
  errorsCount: number;
  overallSubtotal: number;
  sheetTotal: number;
  // Competition stats (after save)
  rawScore?: string | null;
  maxRaw?: string | null;
  scaledScore?: string | null;
  totalDeductions?: string | null;
  finalScore?: string | null;
  percentage?: string | null;
}

export function OverallSheetPrintView(p: OverallPrintData) {
  const primary     = p.organization?.primary_color ?? '#18181b';
  const primaryText = p.organization?.text_on_primary ?? '#ffffff';
  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

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
            <p style={{ fontSize: '9px', opacity: 0.75, margin: 0 }}>Planilla de Puntuación · Overall (General)</p>
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
        {p.divisionName && <p style={{ fontSize: '9.5px', color: '#71717a', margin: '1px 0 0' }}>{p.divisionName} · Overall (General)</p>}
      </div>

      <div style={{ padding: '0 14px' }}>

        {/* ── DOS COLUMNAS: Formaciones | Baile ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>

          {/* LEFT: Formaciones */}
          <div>
            <SectionBar label="Formaciones y Transiciones" primary={primary} />
            <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 4px' }}>−0.1 por cada problema de espaciado o choque/empalme en transiciones</p>

            {/* Formation grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px' }}>
              {FORMATIONS_VALUES.map(v => {
                const active = p.formationsScore === v;
                const errors = Math.round((2.0 - v) * 10);
                const color = v < 1.5 ? '#fef2f2' : v < 1.8 ? '#fffbeb' : '#fafafa';
                const textColor = v < 1.5 ? '#991b1b' : v < 1.8 ? '#92400e' : '#18181b';
                return (
                  <div key={v} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                    padding: '4px 2px', borderRadius: '4px',
                    backgroundColor: active ? primary : color,
                    color: active ? primaryText : textColor,
                    border: active ? 'none' : '1px solid #e4e4e7',
                    opacity: active ? 1 : (v === p.formationsScore ? 1 : 0.6),
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(1)}</span>
                    {errors > 0 && (
                      <span style={{ fontSize: '7px', opacity: 0.7 }}>−{errors}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', padding: '3px 6px', backgroundColor: p.errorsCount > 0 ? '#fef2f2' : `${primary}15`, borderRadius: '4px' }}>
              <span style={{ fontSize: '9.5px', color: p.errorsCount > 0 ? '#991b1b' : '#52525b' }}>
                {p.errorsCount > 0 ? `${p.errorsCount} error${p.errorsCount !== 1 ? 'es' : ''} × −0.1` : 'Sin errores'}
              </span>
              <strong style={{ fontSize: '12px', fontVariantNumeric: 'tabular-nums', color: p.errorsCount > 0 ? '#991b1b' : primary }}>{fmt(p.formationsScore)}</strong>
            </div>

            <NoteBox text={p.formationsNotes} />
          </div>

          {/* RIGHT: Baile */}
          <div>
            <SectionBar label="Baile" primary={primary} />
            <SubLabel text="Dificultad de Baile" />
            <DanceLevelCard
              label="Dificultad"
              criteria={DANCE_DIFF_CRITERIA}
              levels={p.danceDiffLevels}
              selected={p.danceDifficulty}
              primary={primary}
              primaryText={primaryText}
            />

            <SubLabel text="Ejecución de Baile" />
            <DanceLevelCard
              label="Ejecución"
              criteria={DANCE_EXEC_CRITERIA}
              levels={p.danceExecLevels}
              selected={p.danceExecution}
              primary={primary}
              primaryText={primaryText}
            />

            <NoteBox text={p.danceNotes} />
          </div>
        </div>

        {/* ── Overall subtotal ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', backgroundColor: primary, color: primaryText, borderRadius: '5px', margin: '8px 0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '10px' }}>
            <span style={{ fontWeight: 600, fontSize: '11px' }}>Subtotal General</span>
            <span>Form: <strong>{fmt(p.formationsScore)}</strong></span>
            <span>Dif: <strong>{fmt(p.danceDifficulty)}</strong></span>
            <span>Ejec: <strong>{fmt(p.danceExecution)}</strong></span>
          </div>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>{fmt(p.overallSubtotal)}</span>
        </div>

        {/* ── Cross-sheet ──────────────────────────────────────────────── */}
        <SectionBar label={p.isEscolarAB ? 'Cheer / Animación' : 'Creatividad & Showmanship'} primary={primary} />
        <p style={{ fontSize: '8.5px', color: '#a1a1aa', margin: '0 0 4px' }}>Puntaje de este juez — se promedia con los otros dos jueces al calcular el puntaje final</p>
        {!p.isEscolarAB && (
          <SliderRow label="Creatividad" value={p.creativityOverall} max={2.0} primary={primary} />
        )}
        <SliderRow
          label={p.isEscolarAB ? 'Cheer / Animación' : 'Showmanship'}
          value={p.showmanshipOverall}
          max={p.showmanshipMax}
          primary={primary}
        />

        {/* ── Grand total ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', backgroundColor: primary, color: primaryText, borderRadius: '6px', margin: '8px 0 4px' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>TOTAL PLANILLA OVERALL</p>
            <p style={{ fontSize: '8.5px', opacity: 0.7, margin: '1px 0 0' }}>
              {p.isEscolarAB
                ? `General ${fmt(p.overallSubtotal)} + Cheer/Animación ${fmt(p.showmanshipOverall)}`
                : `General ${fmt(p.overallSubtotal)} + Creatividad ${fmt(p.creativityOverall)} + Showmanship ${fmt(p.showmanshipOverall)}`}
            </p>
          </div>
          <span style={{ fontWeight: 700, fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sheetTotal)}</span>
        </div>

        {/* ── Competition stats ────────────────────────────────────────── */}
        {p.finalScore && (
          <>
            <SectionBar label="Estadísticas de la Competencia" primary={primary} />
            <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '2px 4px', color: '#52525b' }}>Puntaje bruto</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {parseFloat(p.rawScore ?? '0').toFixed(2)} / {parseFloat(p.maxRaw ?? '0').toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '2px 4px', color: '#52525b' }}>Puntaje escalado</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{parseFloat(p.scaledScore ?? '0').toFixed(2)}</td>
                </tr>
                {parseFloat(p.totalDeductions ?? '0') > 0 && (
                  <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '2px 4px', color: '#dc2626' }}>Total deducciones</td>
                    <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#dc2626' }}>−{parseFloat(p.totalDeductions!).toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '2px 4px', color: '#52525b' }}>Porcentaje del máximo</td>
                  <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{p.percentage}%</td>
                </tr>
                <tr style={{ backgroundColor: primary }}>
                  <td style={{ padding: '4px 6px', fontWeight: 700, fontSize: '11px', color: primaryText }}>Puntaje Final</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '13px', color: primaryText }}>{parseFloat(p.finalScore).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ── Score summary table ──────────────────────────────────────── */}
        <table style={{ width: '100%', fontSize: '9.5px', borderCollapse: 'collapse', marginTop: '8px', borderTop: '1px solid #e4e4e7' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>Formaciones y Transiciones</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.formationsScore)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>Dificultad de Baile</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.danceDifficulty)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>Ejecución de Baile</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.danceExecution)}</td>
            </tr>
            <tr style={{ backgroundColor: `${primary}15`, borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '3px 4px', fontWeight: 700, color: primary }}>Subtotal General</td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: primary }}>{fmt(p.overallSubtotal)}</td>
            </tr>
            {!p.isEscolarAB && (
              <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
                <td style={{ padding: '2px 4px', color: '#52525b' }}>Creatividad (este juez)</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.creativityOverall)}</td>
              </tr>
            )}
            <tr style={{ borderBottom: '1px solid #f4f4f5' }}>
              <td style={{ padding: '2px 4px', color: '#52525b' }}>{p.isEscolarAB ? 'Cheer / Animación (este juez)' : 'Showmanship (este juez)'}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(p.showmanshipOverall)}</td>
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
