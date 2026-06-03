import type { Organization } from '@/types/competitions';

type BandColor = 'red' | 'amber' | 'emerald';

interface Band { label: string; range: string; min: number; max: number; color: BandColor }

interface Category {
  key: string;
  label: string;
  description: string;
  max: number;
  bands: Band[];
}

const CATEGORIES: Category[] = [
  {
    key: 'pg_technique',
    label: 'Ejecución de Técnica',
    max: 30,
    description: 'Ejecución técnica correcta de las elevaciones, que parezcan fáciles',
    bands: [
      { label: 'Bajo el promedio',  range: '0 – 10',  min: 0,  max: 10,  color: 'red' },
      { label: 'Promedio',          range: '10 – 20', min: 10, max: 20,  color: 'amber' },
      { label: 'Sobre el promedio', range: '20 – 30', min: 20, max: 30,  color: 'emerald' },
    ],
  },
  {
    key: 'pg_difficulty',
    label: 'Dificultad',
    max: 25,
    description: 'Dificultad y capacidad para realizar las elevaciones en la rutina',
    bands: [
      { label: '3 habilidades del nivel',  range: '0 – 10',  min: 0,  max: 10, color: 'red' },
      { label: '4 habilidades del nivel',  range: '15 – 20', min: 15, max: 20, color: 'amber' },
      { label: '5+ habilidades del nivel', range: '20 – 25', min: 20, max: 25, color: 'emerald' },
    ],
  },
  {
    key: 'pg_form_appearance',
    label: 'Forma y Apariencia',
    max: 20,
    description: 'Brazos rectos, flexibilidad, inmovilidad, línea base-flyer, expresiones',
    bands: [
      { label: 'Le cuesta mucho mostrar', range: '0 – 7',   min: 0,  max: 7,  color: 'red' },
      { label: 'Le cuesta mostrar',       range: '7 – 15',  min: 7,  max: 15, color: 'amber' },
      { label: 'No le cuesta mostrar',    range: '15 – 20', min: 15, max: 20, color: 'emerald' },
    ],
  },
  {
    key: 'pg_transitions',
    label: 'Transiciones',
    max: 15,
    description: 'Ritmo, efecto visual, creatividad, menor cantidad de pausas',
    bands: [
      { label: 'Múltiples problemas / pausas', range: '0 – 7',   min: 0,  max: 7,  color: 'red' },
      { label: 'Pocos problemas',              range: '8 – 12',  min: 8,  max: 12, color: 'amber' },
      { label: 'Sin problemas',                range: '12 – 15', min: 12, max: 15, color: 'emerald' },
    ],
  },
  {
    key: 'pg_expressiveness',
    label: 'Expresividad / Showmanship',
    max: 10,
    description: 'Energía, coreografía adaptada a la música, expresiones faciales',
    bands: [
      { label: 'Reducido', range: '0 – 4',  min: 0, max: 4,  color: 'red' },
      { label: 'Moderado', range: '4 – 7',  min: 4, max: 7,  color: 'amber' },
      { label: 'Elevado',  range: '7 – 10', min: 7, max: 10, color: 'emerald' },
    ],
  },
];

const MAX_TOTAL = CATEGORIES.reduce((s, c) => s + c.max, 0); // 100

const BAND_PALETTE: Record<BandColor, { border: string; bg: string; text: string; bar: string }> = {
  red:     { border: '#fca5a5', bg: '#fef2f2', text: '#991b1b', bar: '#f87171' },
  amber:   { border: '#fcd34d', bg: '#fffbeb', text: '#92400e', bar: '#fbbf24' },
  emerald: { border: '#6ee7b7', bg: '#ecfdf5', text: '#065f46', bar: '#34d399' },
};

function activeBandFor(cat: Category, value: number): Band {
  return [...cat.bands].reverse().find(b => value >= b.min) ?? cat.bands[0];
}

function fmt(n: number) { return n.toFixed(0); }
function fmt2(n: number) { return n.toFixed(2); }

export interface PartnerStuntPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization;
  scores: Record<string, number>;
  notes: string;
  total: number;
  rawScore?: number;
  totalDeductions?: number;
  finalScore?: number;
  percentage?: string;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionBar({ label, primary }: { label: string; primary: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: `1.5px solid ${primary}`, paddingBottom: '3px', marginBottom: '5px', marginTop: '10px' }}>
      <div style={{ width: '3px', height: '11px', borderRadius: '2px', backgroundColor: primary, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#52525b', margin: 0 }}>{label}</p>
    </div>
  );
}

function CategoryCard({ cat, value, primary }: { cat: Category; value: number; primary: string }) {
  const pct = (value / cat.max) * 100;
  const active = activeBandFor(cat, value);
  const palette = BAND_PALETTE[active.color];

  return (
    <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden', marginBottom: '5px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '6px 10px', backgroundColor: '#f4f4f5', borderBottom: '1px solid #e4e4e7' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '10px', color: '#18181b', margin: 0 }}>{cat.label}</p>
          <p style={{ fontSize: '8px', color: '#71717a', margin: '1px 0 0' }}>{cat.description}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: primary }}>{fmt(value)}</span>
          <span style={{ fontSize: '8px', color: '#a1a1aa', marginLeft: '2px' }}>/ {cat.max}</span>
        </div>
      </div>

      {/* Bands + progress */}
      <div style={{ padding: '6px 10px' }}>
        {/* Band chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '5px' }}>
          {cat.bands.map(b => {
            const isActive = active === b;
            const p = BAND_PALETTE[b.color];
            return (
              <span key={b.label} style={{
                fontSize: '8px',
                fontWeight: isActive ? 700 : 400,
                padding: '1px 6px',
                borderRadius: '99px',
                border: `1px solid ${isActive ? p.border : '#e4e4e7'}`,
                backgroundColor: isActive ? p.bg : 'transparent',
                color: isActive ? p.text : '#a1a1aa',
              }}>
                {b.range} · {b.label}
              </span>
            );
          })}
        </div>

        {/* Progress bar */}
        <div style={{ height: '5px', borderRadius: '99px', backgroundColor: '#f4f4f5', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', backgroundColor: palette.bar, width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function PartnerStuntSheetPrintView({ data }: { data: PartnerStuntPrintData }) {
  const { teamName, divisionName, organization, scores, notes, total, rawScore, totalDeductions, finalScore, percentage } = data;

  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';
  const orgName     = organization?.name ?? '';
  const logoUrl     = organization?.logo ?? '';

  const pct = MAX_TOTAL > 0 ? (total / MAX_TOTAL) * 100 : 0;
  const hasCompStats = finalScore !== undefined;

  return (
    <div
      className="hidden print:block"
      style={{ fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#18181b', padding: '20px 24px', maxWidth: '800px', margin: '0 auto' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '2px solid #e4e4e7', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={orgName} style={{ height: '36px', objectFit: 'contain' }} />
          )}
          <div>
            {orgName && <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', margin: 0 }}>{orgName}</p>}
            <p style={{ fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{teamName}</p>
            {divisionName && <p style={{ fontSize: '9px', color: '#71717a', margin: '2px 0 0' }}>{divisionName}</p>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#71717a', margin: 0 }}>Planilla</p>
          <p style={{ fontSize: '13px', fontWeight: 800, margin: '1px 0 0', color: primary }}>Partner Stunt</p>
          <p style={{ fontSize: '9px', color: '#a1a1aa', margin: '2px 0 0' }}>Máximo: {MAX_TOTAL} pts</p>
        </div>
      </div>

      {/* ── Category cards ───────────────────────────────────────────────────── */}
      <SectionBar label="Categorías de evaluación" primary={primary} />
      {CATEGORIES.map(cat => (
        <CategoryCard key={cat.key} cat={cat} value={scores[cat.key] ?? 0} primary={primary} />
      ))}

      {/* ── Score summary table ──────────────────────────────────────────────── */}
      <SectionBar label="Resumen de puntajes" primary={primary} />
      <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: 0, backgroundColor: '#f4f4f5', padding: '4px 10px', borderBottom: '1px solid #e4e4e7' }}>
          {['Categoría', 'Máx.', 'Puntaje'].map((h, i) => (
            <span key={h} style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {/* Rows */}
        {CATEGORIES.map((cat, idx) => {
          const v = scores[cat.key] ?? 0;
          const active = activeBandFor(cat, v);
          const palette = BAND_PALETTE[active.color];
          const catPct = (v / cat.max) * 100;
          const isLast = idx === CATEGORIES.length - 1;
          return (
            <div key={cat.key} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', gap: 0, alignItems: 'center', padding: '5px 10px', borderBottom: isLast ? 'none' : '1px solid #f4f4f5', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
              <div>
                <p style={{ fontSize: '9px', fontWeight: 600, color: '#3f3f46', margin: 0 }}>{cat.label}</p>
                <div style={{ height: '3px', borderRadius: '99px', backgroundColor: '#f4f4f5', overflow: 'hidden', marginTop: '3px', width: '80%' }}>
                  <div style={{ height: '100%', borderRadius: '99px', backgroundColor: palette.bar, width: `${catPct}%` }} />
                </div>
              </div>
              <span style={{ fontSize: '9px', color: '#a1a1aa', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cat.max}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#18181b', textAlign: 'right' }}>{fmt(v)}</span>
            </div>
          );
        })}
        {/* Total row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: primary }}>
          <div>
            <p style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: primaryText, opacity: 0.65, margin: 0 }}>Total Partner Stunt</p>
            <p style={{ fontSize: '8px', color: primaryText, opacity: 0.45, margin: '1px 0 0' }}>{pct.toFixed(1)}% de {MAX_TOTAL} pts</p>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: primaryText }}>{fmt(total)}</span>
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────────────────────── */}
      {notes && (
        <>
          <SectionBar label="Comentarios del juez" primary={primary} />
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', padding: '8px 10px', backgroundColor: '#fafafa', marginBottom: '8px' }}>
            <p style={{ fontSize: '9px', color: '#3f3f46', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        </>
      )}

      {/* ── Competition stats ─────────────────────────────────────────────────── */}
      {hasCompStats && (
        <>
          <SectionBar label="Puntaje final de competencia" primary={primary} />
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #e4e4e7' }}>
              {[
                { label: 'Puntaje Bruto',   value: fmt(rawScore ?? 0),          color: '#18181b' },
                { label: 'Descuentos',       value: `−${fmt2(totalDeductions ?? 0)}`, color: '#dc2626' },
                { label: '% Perfección',     value: `${percentage ?? '0'}%`,     color: '#18181b' },
              ].map((item, i) => (
                <div key={item.label} style={{ padding: '10px', textAlign: 'center', borderRight: i < 2 ? '1px solid #e4e4e7' : 'none' }}>
                  <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a1a1aa', margin: '0 0 2px' }}>{item.label}</p>
                  <p style={{ fontSize: '16px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: item.color, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: primary }}>
              <p style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: primaryText, opacity: 0.6, margin: 0 }}>Puntaje Final</p>
              <span style={{ fontSize: '22px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: primaryText }}>{fmt(finalScore ?? 0)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
