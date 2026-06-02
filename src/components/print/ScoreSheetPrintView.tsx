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
    fields: ['stunts_difficulty', 'stunts_execution', 'stunts_drivers', 'pyramids_difficulty', 'pyramids_execution', 'tosses_difficulty', 'tosses_execution'],
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
    <div className="hidden print:block text-black text-sm font-sans">

      {/* ── Branded header bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: primary, color: primaryText }}
      >
        <div className="flex items-center gap-4">
          {organization?.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={organization.logo}
              alt=""
              className="h-12 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          )}
          <div>
            {organization?.name && (
              <p className="text-base font-bold leading-tight" style={{ color: primaryText }}>
                {organization.name}
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: primaryText, opacity: 0.75 }}>
              Planilla de Puntuación · Cheer Metrics
            </p>
          </div>
        </div>
        <div className="text-right text-xs" style={{ color: primaryText, opacity: 0.75 }}>
          <p>Fecha de impresión</p>
          <p className="font-semibold mt-0.5" style={{ opacity: 1 }}>{today}</p>
        </div>
      </div>

      {/* ── Team / division info ───────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-3 mb-4" style={{ borderBottom: `2px solid ${primary}` }}>
        <h1 className="text-2xl font-bold text-zinc-900 leading-tight">{teamName}</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{sheet.division_name} · {sheetTypeLabel}</p>
      </div>

      {/* ── Score groups ──────────────────────────────────────────────── */}
      <div className="px-6">
        {visibleGroups.map(group => (
          <div key={group.label} className="mb-4">
            <div className="flex items-center gap-2 mb-1.5 pb-0.5" style={{ borderBottom: `1px solid ${primary}20` }}>
              <div className="w-1 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: primary }} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{group.label}</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {group.fields
                  .filter(f => sheet[f as keyof ScoreSheet] !== null && sheet[f as keyof ScoreSheet] !== undefined)
                  .map(field => (
                    <tr key={field} style={{ borderBottom: '1px solid #f4f4f5' }}>
                      <td className="py-1 pr-4 text-zinc-600">{FIELD_LABELS[field]}</td>
                      <td className="py-1 text-right font-semibold tabular-nums text-zinc-900 w-16">
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
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5 pb-0.5" style={{ borderBottom: `1px solid ${primary}20` }}>
              <div className="w-1 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: primary }} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Subtotales</p>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {subtotals.map(r => (
                  <tr key={r.label} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td className="py-1 pr-4 text-zinc-600">{r.label}</td>
                    <td className="py-1 text-right font-semibold tabular-nums text-zinc-900 w-16">{fmt(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Deductions ─────────────────────────────────────────────── */}
        {sheet.deductions?.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1.5 pb-0.5" style={{ borderBottom: '1px solid #fca5a520' }}>
              <div className="w-1 h-3.5 rounded-sm shrink-0 bg-red-500" />
              <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">Deducciones</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="text-left py-1 pr-4 font-medium">Tipo</th>
                  <th className="text-right py-1 pr-4 font-medium w-12">Cnt.</th>
                  <th className="text-right py-1 font-medium w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {sheet.deductions.map(d => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f4f4f5' }}>
                    <td className="py-1 pr-4 text-zinc-600">{d.deduction_type_display}</td>
                    <td className="py-1 pr-4 text-right tabular-nums">{d.count}</td>
                    <td className="py-1 text-right tabular-nums text-red-700">−{fmt(d.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Final scores ───────────────────────────────────────────── */}
        <div className="mt-2" style={{ borderTop: `2px solid ${primary}` }}>
          <table className="w-full text-sm mt-3">
            <tbody>
              <tr>
                <td className="py-1 pr-4 text-zinc-500">Puntaje bruto</td>
                <td className="py-1 text-right font-semibold tabular-nums text-zinc-700 w-20">{fmt(sheet.raw_score)}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 text-zinc-500">Puntaje escalado</td>
                <td className="py-1 text-right font-semibold tabular-nums text-zinc-700">{fmt(sheet.scaled_score)}</td>
              </tr>
              {Number(sheet.total_deductions) > 0 && (
                <tr>
                  <td className="py-1 pr-4 text-red-600">Total deducciones</td>
                  <td className="py-1 text-right font-semibold tabular-nums text-red-600">−{fmt(sheet.total_deductions)}</td>
                </tr>
              )}
              <tr>
                <td
                  className="py-2.5 pl-4 font-bold text-base rounded-l-lg"
                  style={{ backgroundColor: primary, color: primaryText }}
                >
                  Puntaje final
                </td>
                <td
                  className="py-2.5 pr-4 text-right font-bold tabular-nums text-base rounded-r-lg"
                  style={{ backgroundColor: primary, color: primaryText }}
                >
                  {fmt(sheet.final_score)}
                </td>
              </tr>
              <tr>
                <td className="pt-1.5 pr-4 text-zinc-400 text-xs">Porcentaje del máximo</td>
                <td className="pt-1.5 text-right text-xs tabular-nums text-zinc-400">{Number(sheet.percentage).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-8 mx-6 pt-4 text-[10px] text-zinc-400 text-center" style={{ borderTop: '1px solid #e4e4e7' }}>
        Generado por Cheer Metrics · Ecuador
      </p>
    </div>
  );
}
