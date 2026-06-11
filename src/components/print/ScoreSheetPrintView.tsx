import type { Organization, ScoreSheet } from '@/types/competitions';

// ── Field labels ──────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  stunts_difficulty:    'Stunts — Dificultad',
  stunts_execution:     'Stunts — Ejecución',
  stunts_drivers:       'Stunts — Drivers',
  pyramids_difficulty:  'Pirámides — Dificultad',
  pyramids_execution:   'Pirámides — Ejecución',
  tosses_difficulty:    'Lanzamientos — Dificultad',
  tosses_execution:     'Lanzamientos — Ejecución',
  standing_difficulty:  'Gymnasia parada — Dificultad',
  standing_execution:   'Gymnasia parada — Ejecución',
  standing_drivers:     'Gymnasia parada — Drivers',
  running_difficulty:   'Gymnasia corrida — Dificultad',
  running_execution:    'Gymnasia corrida — Ejecución',
  running_drivers:      'Gymnasia corrida — Drivers',
  jumps_difficulty:     'Saltos — Dificultad',
  jumps_execution:      'Saltos — Ejecución',
  formations_score:     'Formaciones',
  dance_difficulty:     'Danza — Dificultad',
  dance_execution:      'Danza — Ejecución',
  creativity_building:  'Creatividad (Building)',
  creativity_tumbling:  'Creatividad (Tumbling)',
  creativity_overall:   'Creatividad (Overall)',
  showmanship_building: 'Artisticidad (Building)',
  showmanship_tumbling: 'Artisticidad (Tumbling)',
  showmanship_overall:  'Artisticidad (Overall)',
  pg_technique:         'Técnica',
  pg_difficulty:        'Dificultad',
  pg_form_appearance:   'Forma y apariencia',
  pg_transitions:       'Transiciones',
  pg_expressiveness:    'Expresividad',
};

const SECTION_GROUPS: { label: string; fields: (keyof typeof FIELD_LABELS)[] }[] = [
  {
    label: 'Building (Elevaciones)',
    fields: ['stunts_difficulty', 'stunts_drivers', 'pyramids_difficulty', 'tosses_difficulty'],
  },
  {
    label: 'Tumbling (Gimnasia)',
    fields: ['standing_difficulty', 'standing_execution', 'standing_drivers', 'running_difficulty', 'running_execution', 'running_drivers', 'jumps_difficulty', 'jumps_execution'],
  },
  {
    label: 'Overall (General)',
    fields: ['formations_score', 'dance_difficulty', 'dance_execution'],
  },
  {
    label: 'Creatividad y Artisticidad',
    fields: ['creativity_building', 'creativity_tumbling', 'creativity_overall', 'showmanship_building', 'showmanship_tumbling', 'showmanship_overall'],
  },
  {
    label: 'Partner Stunt',
    fields: ['pg_technique', 'pg_difficulty', 'pg_form_appearance', 'pg_transitions', 'pg_expressiveness'],
  },
];

function fmt(v: string | null | undefined): string {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return isNaN(n) ? '—' : n.toFixed(2);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sheet: ScoreSheet;
  teamName: string;
  sheetTypeLabel: string;
  organization?: Organization | null;
}

export function ScoreSheetPrintView({ sheet, teamName, sheetTypeLabel, organization }: Props) {
  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const primary     = organization?.primary_color  ?? '#18181b';
  const primaryText = organization?.text_on_primary ?? '#ffffff';

  const visibleGroups = SECTION_GROUPS.filter(g =>
    g.fields.some(f => sheet[f as keyof ScoreSheet] !== null && sheet[f as keyof ScoreSheet] !== undefined),
  );

  const subtotals = [
    { label: 'Building total',         value: sheet.building_total },
    { label: 'Tumbling total',          value: sheet.tumbling_total },
    { label: 'Overall total',           value: sheet.overall_total },
    { label: 'Creatividad (promedio)',  value: sheet.avg_creativity },
    { label: 'Artisticidad (promedio)', value: sheet.avg_showmanship },
    { label: 'Partner Stunt total',     value: sheet.partner_stunt_total },
  ].filter(r => r.value && Number(r.value) > 0);

  return (
    <div className="hidden print:block text-black font-sans" style={{ fontSize: '11px', lineHeight: '1.4' }}>

      {/* ── Branded header bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-2.5"
        style={{ backgroundColor: primary, color: primaryText }}
      >
        <div className="flex items-center gap-3">
          {organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logo}
              alt=""
              style={{ height: '32px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
            />
          )}
          <div>
            {organization?.name && (
              <p style={{ fontSize: '13px', fontWeight: 700, color: primaryText, lineHeight: 1.2 }}>
                {organization.name}
              </p>
            )}
            <p style={{ fontSize: '10px', color: primaryText, opacity: 0.75, marginTop: '1px' }}>
              Planilla de Puntuación · Cheer Metrics
            </p>
          </div>
        </div>
        <div className="text-right" style={{ fontSize: '10px', color: primaryText, opacity: 0.75 }}>
          <p>Fecha de impresión</p>
          <p style={{ fontWeight: 600, opacity: 1, marginTop: '1px' }}>{today}</p>
        </div>
      </div>

      {/* ── Team / division info ───────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-2" style={{ borderBottom: `2px solid ${primary}`, marginBottom: '10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#18181b', lineHeight: 1.2 }}>{teamName}</h1>
        <p style={{ fontSize: '11px', color: '#71717a', marginTop: '2px' }}>{sheet.division_name} · {sheetTypeLabel}</p>
      </div>

      {/* ── Score groups ──────────────────────────────────────────────── */}
      <div className="px-5">
        {visibleGroups.map(group => (
          <div key={group.label} style={{ marginBottom: '8px' }}>
            <div className="flex items-center gap-1.5" style={{ borderBottom: `1px solid ${primary}25`, paddingBottom: '2px', marginBottom: '3px' }}>
              <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: primary, flexShrink: 0 }} />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a' }}>{group.label}</p>
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                {group.fields
                  .filter(f => sheet[f as keyof ScoreSheet] !== null && sheet[f as keyof ScoreSheet] !== undefined)
                  .map(field => (
                    <tr key={field} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td style={{ padding: '2px 12px 2px 0', color: '#52525b' }}>{FIELD_LABELS[field]}</td>
                      <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#18181b', width: '56px' }}>
                        {fmt(sheet[field as keyof ScoreSheet] as string)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── Subtotals ──────────────────────────────────────────────── */}
        {subtotals.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div className="flex items-center gap-1.5" style={{ borderBottom: `1px solid ${primary}25`, paddingBottom: '2px', marginBottom: '3px' }}>
              <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: primary, flexShrink: 0 }} />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a' }}>Subtotales</p>
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <tbody>
                {subtotals.map(r => (
                  <tr key={r.label} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '2px 12px 2px 0', color: '#52525b' }}>{r.label}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#18181b', width: '56px' }}>{fmt(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Deductions ─────────────────────────────────────────────── */}
        {sheet.deductions?.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <div className="flex items-center gap-1.5" style={{ borderBottom: '1px solid #fca5a530', paddingBottom: '2px', marginBottom: '3px' }}>
              <div style={{ width: '3px', height: '12px', borderRadius: '2px', backgroundColor: '#ef4444', flexShrink: 0 }} />
              <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ef4444' }}>Deducciones</p>
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#a1a1aa' }}>
                  <th style={{ textAlign: 'left', padding: '2px 12px 2px 0', fontWeight: 500 }}>Tipo</th>
                  <th style={{ textAlign: 'right', padding: '2px 12px 2px 0', fontWeight: 500, width: '40px' }}>Cnt.</th>
                  <th style={{ textAlign: 'right', padding: '2px 0', fontWeight: 500, width: '56px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sheet.deductions.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td style={{ padding: '2px 12px 2px 0', color: '#52525b' }}>{d.deduction_type_display}</td>
                    <td style={{ padding: '2px 12px 2px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.count}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#b91c1c' }}>−{fmt(d.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Final scores ───────────────────────────────────────────── */}
        <div style={{ borderTop: `2px solid ${primary}`, marginTop: '4px' }}>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginTop: '6px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#71717a' }}>Puntaje bruto</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#3f3f46', width: '72px' }}>{fmt(sheet.raw_score)}</td>
              </tr>
              <tr>
                <td style={{ padding: '2px 12px 2px 0', color: '#71717a' }}>Puntaje escalado</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#3f3f46' }}>{fmt(sheet.scaled_score)}</td>
              </tr>
              {Number(sheet.total_deductions) > 0 && (
                <tr>
                  <td style={{ padding: '2px 12px 2px 0', color: '#dc2626' }}>Total deducciones</td>
                  <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>−{fmt(sheet.total_deductions)}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '6px 12px 6px 12px', fontWeight: 700, fontSize: '13px', backgroundColor: primary, color: primaryText, borderRadius: '6px 0 0 6px' }}>
                  Puntaje final
                </td>
                <td style={{ padding: '6px 12px 6px 0', textAlign: 'right', fontWeight: 700, fontSize: '13px', fontVariantNumeric: 'tabular-nums', backgroundColor: primary, color: primaryText, borderRadius: '0 6px 6px 0' }}>
                  {fmt(sheet.final_score)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '3px 12px 0 0', color: '#a1a1aa', fontSize: '10px' }}>Porcentaje del máximo</td>
                <td style={{ padding: '3px 0 0 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#a1a1aa', fontSize: '10px' }}>{Number(sheet.percentage).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ marginTop: '16px', marginLeft: '20px', marginRight: '20px', paddingTop: '8px', fontSize: '9px', color: '#a1a1aa', textAlign: 'center', borderTop: '1px solid #e4e4e7' }}>
        Generado por Cheer Metrics · Ecuador
      </p>
    </div>
  );
}
