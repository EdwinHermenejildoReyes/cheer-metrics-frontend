import {
  DEDUCTION_CODES,
  DEDUCTION_TYPE_LABELS,
  DEDUCTION_AMOUNTS,
  type DeductionType,
  type Deduction,
  type Organization,
} from '@/types/competitions';

const FALLS:   DeductionType[] = ['x', 'ca', 'csa', 'ec', 'cc', 'csc'];
const TIME:    DeductionType[] = ['tiempo', 'tiempo_grave'];
const ILLEGAL: DeductionType[] = ['pi', 'eap', 'rg', 'gfn', 'bfn', 'seg'];
const ADMIN:   DeductionType[] = ['ad', 'div'];

const GROUP_LABELS: Record<string, string> = {
  falls:   'Caídas',
  time:    'Tiempo',
  illegal: 'Ilegalidades',
  admin:   'Administrativas',
};

function groupOf(type: DeductionType): string {
  if (FALLS.includes(type))   return 'falls';
  if (TIME.includes(type))    return 'time';
  if (ILLEGAL.includes(type)) return 'illegal';
  return 'admin';
}

const GROUP_COLOR: Record<string, { border: string; bg: string; text: string; badge: string; badgeText: string }> = {
  falls:   { border: '#dc2626', bg: '#fef2f2', text: '#991b1b', badge: '#dc2626', badgeText: '#fff' },
  time:    { border: '#f97316', bg: '#fff7ed', text: '#9a3412', badge: '#f97316', badgeText: '#fff' },
  illegal: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', badge: '#f59e0b', badgeText: '#fff' },
  admin:   { border: '#a3a3a3', bg: '#fafafa', text: '#525252', badge: '#737373', badgeText: '#fff' },
};

function fmt(n: number) { return n.toFixed(2); }

export interface DeduccionesPrintData {
  teamName: string;
  divisionName?: string;
  organization?: Organization;
  deductions: Deduction[];
  totalDed: number;
  scaledScore: number;
  finalScore: number;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionBar({ label, color }: { label: string; color: typeof GROUP_COLOR[string] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', borderBottom: `1.5px solid ${color.border}40`, paddingBottom: '6px', marginBottom: '8px', marginTop: '10px' }}>
      <div style={{ width: '4px', height: '16px', borderRadius: '3px', backgroundColor: color.border, flexShrink: 0 }} />
      <p style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: color.text, margin: 0 }}>{label}</p>
    </div>
  );
}

function CodeReferenceGrid({ types }: { types: DeductionType[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(types.length, 6)}, 1fr)`, gap: '4px' }}>
      {types.map(type => {
        const grp = groupOf(type);
        const c = GROUP_COLOR[grp];
        return (
          <div key={type} style={{ border: `1px solid ${c.border}`, borderRadius: '5px', padding: '4px 3px', textAlign: 'center', backgroundColor: c.bg }}>
            <div style={{ fontWeight: 900, fontSize: '10px', color: c.text, lineHeight: 1 }}>{DEDUCTION_CODES[type]}</div>
            <div style={{ fontSize: '7.5px', color: c.text, opacity: 0.75, marginTop: '2px', lineHeight: 1.2 }}>{DEDUCTION_TYPE_LABELS[type]}</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#dc2626', marginTop: '3px', fontVariantNumeric: 'tabular-nums' }}>−{DEDUCTION_AMOUNTS[type]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DeduccionesSheetPrintView({ data }: { data: DeduccionesPrintData }) {
  const { teamName, divisionName, organization, deductions, totalDed, scaledScore, finalScore } = data;

  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';
  const orgName     = organization?.name ?? '';
  const logoUrl     = organization?.logo ?? '';

  const hasDeds = deductions.length > 0;

  // Group deductions by category for the registered table
  const byGroup: Record<string, Deduction[]> = { falls: [], time: [], illegal: [], admin: [] };
  for (const d of deductions) byGroup[groupOf(d.deduction_type)].push(d);

  return (
    <div
      className="hidden print:block"
      style={{ fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#18181b', padding: '20px 24px', maxWidth: '800px', margin: '0 auto' }}
    >
      <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } }`}</style>
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
          <p style={{ fontSize: '13px', fontWeight: 800, margin: '1px 0 0', color: primary }}>Deducciones</p>
        </div>
      </div>

      {/* ── Reference table: all deduction types ────────────────────────────── */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 5px' }}>Referencia de descuentos</p>

        {/* Falls */}
        <div style={{ marginBottom: '6px' }}>
          <SectionBar label={GROUP_LABELS.falls} color={GROUP_COLOR.falls} />
          <CodeReferenceGrid types={FALLS} />
        </div>

        {/* Time */}
        <div style={{ marginBottom: '6px' }}>
          <SectionBar label={GROUP_LABELS.time} color={GROUP_COLOR.time} />
          <CodeReferenceGrid types={TIME} />
        </div>

        {/* Illegalities */}
        <div style={{ marginBottom: '6px' }}>
          <SectionBar label={GROUP_LABELS.illegal} color={GROUP_COLOR.illegal} />
          <CodeReferenceGrid types={ILLEGAL} />
        </div>

        {/* Admin */}
        <div style={{ marginBottom: '6px' }}>
          <SectionBar label={GROUP_LABELS.admin} color={GROUP_COLOR.admin} />
          <CodeReferenceGrid types={ADMIN} />
        </div>
      </div>

      {/* ── Registered deductions ───────────────────────────────────────────── */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 5px' }}>
          Descuentos registrados{hasDeds ? ` (${deductions.length})` : ''}
        </p>

        {!hasDeds ? (
          <div style={{ border: '1.5px dashed #d4d4d8', borderRadius: '6px', padding: '14px', textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#a1a1aa', margin: 0 }}>Sin descuentos registrados</p>
          </div>
        ) : (
          <div style={{ border: '1px solid #e4e4e7', borderRadius: '6px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '52px 48px 1fr 60px 70px', gap: 0, backgroundColor: '#f4f4f5', padding: '4px 8px', borderBottom: '1px solid #e4e4e7' }}>
              {['Tiempo', 'Código', 'Descripción', 'Cant.', 'Monto'].map((h, i) => (
                <span key={h} style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#71717a', textAlign: i >= 3 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {deductions.map((ded, idx) => {
              const grp = groupOf(ded.deduction_type);
              const c = GROUP_COLOR[grp];
              const isLast = idx === deductions.length - 1;
              return (
                <div key={ded.id} style={{ display: 'grid', gridTemplateColumns: '52px 48px 1fr 60px 70px', gap: 0, alignItems: 'center', padding: '5px 8px', borderBottom: isLast ? 'none' : '1px solid #f4f4f5', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                  {/* Time */}
                  <span style={{ fontSize: '9px', fontVariantNumeric: 'tabular-nums', color: '#737373' }}>{ded.routine_time || '—'}</span>
                  {/* Code badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: c.badge, color: c.badgeText, borderRadius: '4px', padding: '1px 5px', fontSize: '8.5px', fontWeight: 900, width: 'fit-content' }}>
                    {DEDUCTION_CODES[ded.deduction_type]}
                  </span>
                  {/* Description */}
                  <div style={{ paddingRight: '6px' }}>
                    <p style={{ fontSize: '9px', color: '#3f3f46', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {ded.notes || DEDUCTION_TYPE_LABELS[ded.deduction_type]}
                    </p>
                    {ded.hit_zero && (
                      <p style={{ fontSize: '8px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '1px 0 0' }}>Hit Zero</p>
                    )}
                  </div>
                  {/* Count */}
                  <span style={{ fontSize: '9px', fontVariantNumeric: 'tabular-nums', color: '#3f3f46', textAlign: 'right' }}>
                    {ded.count > 1 ? `${ded.count} × −${ded.unit_amount}` : `× ${ded.count}`}
                  </span>
                  {/* Amount */}
                  <span style={{ fontSize: '10px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#dc2626', textAlign: 'right' }}>
                    −{ded.total_amount}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Score summary ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {/* Total deductions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#dc2626', borderRadius: '6px', padding: '8px 14px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff' }}>Total Descuentos</span>
          <span style={{ fontSize: '18px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>−{fmt(totalDed)}</span>
        </div>

        {/* Final score breakdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: primary, borderRadius: '6px', padding: '8px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '8.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: primaryText, opacity: 0.6 }}>Score final</span>
            <span style={{ fontSize: '10px', color: primaryText, fontVariantNumeric: 'tabular-nums' }}>
              Escalado: <strong>{fmt(scaledScore)}</strong>
            </span>
            <span style={{ fontSize: '10px', color: '#fca5a5', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              − {fmt(totalDed)}
            </span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: primaryText }}>{fmt(finalScore)}</span>
        </div>
      </div>
    </div>
  );
}
