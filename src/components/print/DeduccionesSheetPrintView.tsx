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

const ZONE_ROWS = [
  { key: 'F' },
  { key: 'C' },
  { key: 'T' },
] as const;

const ZONE_COLS = [
  { key: 'IZQ' },
  { key: 'CTR' },
  { key: 'DER' },
] as const;

const TRACK_INTERVALS = [
  '0 a 15', '15 a 30', '30 a 45', '45 a 1',
  '1 a 1:15', '1:15 a 1:30', '1:30 a 1:45', '1:45 a 2:00',
  '2:00 a 2:15', '2:15 a 2:30',
];

const MIDPOINTS = new Set(['1 a 1:15', '2:00 a 2:15']);

const GROUP_COLOR = {
  falls:   { border: '#dc2626', bg: '#fef2f2', text: '#991b1b', badge: '#dc2626', badgeText: '#fff' },
  time:    { border: '#f97316', bg: '#fff7ed', text: '#9a3412', badge: '#f97316', badgeText: '#fff' },
  illegal: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e', badge: '#f59e0b', badgeText: '#fff' },
  admin:   { border: '#a3a3a3', bg: '#fafafa', text: '#525252', badge: '#737373', badgeText: '#fff' },
} as const;

type GroupKey = keyof typeof GROUP_COLOR;

const GROUPS: Array<{ key: GroupKey; label: string; types: DeductionType[] }> = [
  { key: 'falls',   label: 'CAÍDAS',          types: FALLS   },
  { key: 'time',    label: 'TIEMPO',           types: TIME    },
  { key: 'illegal', label: 'ILEGALIDADES',     types: ILLEGAL },
  { key: 'admin',   label: 'ADMINISTRATIVAS',  types: ADMIN   },
];

function groupOf(type: DeductionType): GroupKey {
  if (FALLS.includes(type))   return 'falls';
  if (TIME.includes(type))    return 'time';
  if (ILLEGAL.includes(type)) return 'illegal';
  return 'admin';
}

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

export function DeduccionesSheetPrintView({ data, className }: { data: DeduccionesPrintData; className?: string }) {
  const { teamName, divisionName, organization, deductions, totalDed, scaledScore, finalScore } = data;

  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';

  const dedsByZone: Record<string, Deduction[]> = {};
  for (const d of deductions) {
    const k = d.routine_time || 'sin tiempo';
    if (!dedsByZone[k]) dedsByZone[k] = [];
    dedsByZone[k].push(d);
  }

  const sinTiempoDeds = dedsByZone['sin tiempo'] ?? [];

  const bd     = '1px solid #e4e4e7';
  const bdLight = '1px solid #f3f4f6';
  const bdDash  = '1px dashed #f3f4f6';

  const thBase: React.CSSProperties = {
    padding: '2px 4px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#71717a',
    textAlign: 'center',
    fontSize: '8px',
    lineHeight: 1.3,
  };

  return (
    <div
      className={className ?? 'hidden print:block'}
      style={{ fontFamily: 'system-ui, sans-serif', fontSize: '9px', color: '#18181b', lineHeight: 1.3 }}
    >
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #e4e4e7', paddingBottom: '5px', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organization.logo} alt="" style={{ height: '26px', objectFit: 'contain' }} />
          )}
          <div>
            {organization?.name && (
              <p style={{ fontSize: '7.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', margin: 0 }}>{organization.name}</p>
            )}
            <p style={{ fontSize: '13px', fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{teamName}</p>
            {divisionName && <p style={{ fontSize: '7.5px', color: '#71717a', margin: '1px 0 0' }}>{divisionName}</p>}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '7.5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a', margin: 0 }}>Planilla</p>
          <p style={{ fontSize: '11px', fontWeight: 800, margin: 0, color: primary }}>Deducciones</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7.5px', color: '#71717a', textTransform: 'uppercase', margin: 0 }}>Descuentos</p>
            <p style={{ fontSize: '15px', fontWeight: 900, color: totalDed > 0 ? '#dc2626' : '#d4d4d8', margin: 0, fontVariantNumeric: 'tabular-nums' }}>−{fmt(totalDed)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '7.5px', color: '#71717a', textTransform: 'uppercase', margin: 0 }}>Score final</p>
            <p style={{ fontSize: '15px', fontWeight: 900, color: '#18181b', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{fmt(finalScore)}</p>
          </div>
        </div>
      </div>

      {/* ── 3-column body ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55mm 1fr 50mm', gap: '3mm', alignItems: 'start' }}>

        {/* ═══ LEFT — Palette ════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {GROUPS.map(({ key, label, types }) => {
            const c = GROUP_COLOR[key];
            return (
              <div key={key}>
                <div style={{ backgroundColor: c.bg, borderLeft: `3px solid ${c.border}`, padding: '2px 5px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 800, fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.07em', color: c.text }}>{label}</span>
                  <span style={{ fontSize: '7px', color: c.text, opacity: 0.5, marginLeft: '5px' }}>
                    {key === 'falls' ? '→ pista' : '→ lista'}
                  </span>
                </div>
                {types.map(type => {
                  const cnt = key !== 'falls'
                    ? (deductions.find(d => d.deduction_type === type && !d.routine_time)?.count ?? 0)
                    : 0;
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', padding: '1.5px 5px', borderBottom: `1px solid ${c.border}15` }}>
                      <span style={{ fontWeight: 900, fontSize: '9px', color: c.text, width: '26px', flexShrink: 0 }}>{DEDUCTION_CODES[type]}</span>
                      <span style={{ fontSize: '7px', color: c.text, opacity: 0.75, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 3).join(' ')}
                      </span>
                      {cnt > 0 && (
                        <span style={{ backgroundColor: '#dc2626', color: '#fff', borderRadius: '8px', fontSize: '6.5px', fontWeight: 900, padding: '0 3px', marginRight: '3px', lineHeight: '12px' }}>
                          ×{cnt}
                        </span>
                      )}
                      <span style={{ fontSize: '8px', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>−{DEDUCTION_AMOUNTS[type]}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ═══ CENTER — Track grid ═══════════════════════════════════════════════ */}
        <div style={{ border: bd, borderRadius: '5px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f5' }}>
                <th style={{ ...thBase, borderRight: bd, width: '18mm' }}>Tiempo</th>
                <th style={{ ...thBase, borderRight: bd, width: '5mm', color: '#c4c4c4' }}></th>
                {ZONE_COLS.map((col, ci) => (
                  <th key={col.key} style={{ ...thBase, borderRight: ci < 2 ? bdLight : 'none' }}>{col.key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRACK_INTERVALS.map((intervalKey, iIdx) => {
                const isMid  = MIDPOINTS.has(intervalKey);
                const rowBg  = isMid ? '#f8fafc' : (iIdx % 2 === 0 ? '#ffffff' : '#fafafa');
                const isLast = iIdx === TRACK_INTERVALS.length - 1;
                const [from, to] = intervalKey.split(' a ');

                return ZONE_ROWS.map((row, rIdx) => {
                  const isLastSub = rIdx === ZONE_ROWS.length - 1;
                  return (
                    <tr key={`${intervalKey}-${row.key}`} style={{ backgroundColor: rowBg }}>
                      {rIdx === 0 && (
                        <td
                          rowSpan={3}
                          style={{
                            borderRight: bd,
                            borderBottom: isLast ? 'none' : bd,
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            padding: '1px 3px',
                            backgroundColor: isMid ? '#f1f5f9' : rowBg,
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '7.5px', color: isMid ? '#374151' : '#6b7280', display: 'block', lineHeight: 1.2 }}>{from}</span>
                          <span style={{ fontSize: '6px', color: '#d1d5db', display: 'block' }}>a</span>
                          <span style={{ fontWeight: 700, fontSize: '7.5px', color: isMid ? '#374151' : '#6b7280', display: 'block', lineHeight: 1.2 }}>{to}</span>
                        </td>
                      )}

                      <td style={{
                        borderRight: bd,
                        borderBottom: isLastSub ? (isLast ? 'none' : bd) : bdDash,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        padding: '0',
                        width: '5mm',
                        fontSize: '7px',
                        fontWeight: 700,
                        color: '#d1d5db',
                      }}>
                        {row.key}
                      </td>

                      {ZONE_COLS.map((col, cIdx) => {
                        const fullKey  = `${intervalKey} / ${row.key}·${col.key}`;
                        const zoneDeds = dedsByZone[fullKey] ?? [];
                        return (
                          <td
                            key={col.key}
                            style={{
                              borderRight: cIdx < 2 ? bdLight : 'none',
                              borderBottom: isLastSub ? (isLast ? 'none' : bd) : bdDash,
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              padding: '1px 2px',
                              height: '13px',
                            }}
                          >
                            {zoneDeds.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px', justifyContent: 'center', alignItems: 'center' }}>
                                {zoneDeds.map(ded => {
                                  const c = GROUP_COLOR[groupOf(ded.deduction_type)];
                                  return (
                                    <span
                                      key={ded.id}
                                      style={{ backgroundColor: c.badge, color: c.badgeText, borderRadius: '2px', padding: '0 2px', fontSize: '7px', fontWeight: 900, lineHeight: '11px', whiteSpace: 'nowrap' }}
                                    >
                                      {DEDUCTION_CODES[ded.deduction_type]}{ded.count > 1 ? `×${ded.count}` : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ display: 'inline-block', width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#e5e7eb' }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}

              {sinTiempoDeds.length > 0 && (
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td colSpan={2} style={{ borderTop: bd, borderRight: bd, padding: '2px 5px', fontSize: '7px', color: '#9ca3af', textAlign: 'right', fontStyle: 'italic' }}>
                    Sin tiempo
                  </td>
                  <td colSpan={3} style={{ borderTop: bd, padding: '2px 5px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                      {sinTiempoDeds.map(ded => {
                        const c = GROUP_COLOR[groupOf(ded.deduction_type)];
                        return (
                          <span key={ded.id} style={{ backgroundColor: c.badge, color: c.badgeText, borderRadius: '3px', padding: '0 3px', fontSize: '7px', fontWeight: 900, lineHeight: '13px' }}>
                            {DEDUCTION_CODES[ded.deduction_type]}{ded.count > 1 ? `×${ded.count}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ borderTop: bdLight, backgroundColor: '#f9fafb', padding: '2px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: '6.5px', color: '#9ca3af', margin: 0 }}>F = Frente · C = Centro · T = Fondo · Solo caídas en la pista</p>
          </div>
        </div>

        {/* ═══ RIGHT — Reference ═════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa', margin: '0 0 2px' }}>Referencia</p>
          {GROUPS.map(({ key, label, types }) => {
            const c = GROUP_COLOR[key];
            return (
              <div key={key} style={{ border: `1px solid ${c.border}40`, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: c.bg, padding: '2px 5px', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.text }}>{label}</div>
                {types.map(type => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5px 5px', borderTop: `1px solid ${c.border}20` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ fontWeight: 900, fontSize: '8px', color: '#1f2937', width: '24px', flexShrink: 0 }}>{DEDUCTION_CODES[type]}</span>
                      <span style={{ fontSize: '6.5px', color: '#71717a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '58px' }}>
                        {DEDUCTION_TYPE_LABELS[type].split(' ').slice(0, 2).join(' ')}
                      </span>
                    </div>
                    <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>−{DEDUCTION_AMOUNTS[type]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Score summary ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#dc2626', borderRadius: '5px', padding: '5px 10px' }}>
          <span style={{ fontSize: '8.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fff' }}>Total Descuentos</span>
          <span style={{ fontSize: '14px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#fff' }}>−{fmt(totalDed)}</span>
        </div>
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: primary, borderRadius: '5px', padding: '5px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '7.5px', textTransform: 'uppercase', letterSpacing: '0.06em', color: primaryText, opacity: 0.6 }}>Score final</span>
            <span style={{ fontSize: '8.5px', color: primaryText, fontVariantNumeric: 'tabular-nums' }}>
              Escalado: <strong>{fmt(scaledScore)}</strong>
            </span>
            <span style={{ fontSize: '8.5px', color: '#fca5a5', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>− {fmt(totalDed)}</span>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: primaryText }}>{fmt(finalScore)}</span>
        </div>
      </div>
    </div>
  );
}
