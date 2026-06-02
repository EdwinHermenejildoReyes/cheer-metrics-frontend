import type { ScoreSheet } from '@/types/competitions';

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
}

export function ScoreSheetPrintView({ sheet, teamName, sheetTypeLabel }: Props) {
  const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

  const visibleGroups = SECTION_GROUPS.filter(g =>
    g.fields.some(f => sheet[f as keyof ScoreSheet] !== null && sheet[f as keyof ScoreSheet] !== undefined),
  );

  return (
    <div className="hidden print:block text-black text-sm font-sans">
      {/* Header */}
      <div className="border-b-2 border-zinc-900 pb-3 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-0.5">Planilla de puntuación</p>
            <h1 className="text-xl font-bold text-zinc-900">{teamName}</h1>
            <p className="text-sm text-zinc-600 mt-0.5">{sheet.division_name} · {sheetTypeLabel}</p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Fecha de impresión</p>
            <p className="font-medium text-zinc-700">{today}</p>
          </div>
        </div>
      </div>

      {/* Score groups */}
      {visibleGroups.map(group => (
        <div key={group.label} className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 border-b border-zinc-200 pb-0.5">{group.label}</p>
          <table className="w-full text-xs">
            <tbody>
              {group.fields
                .filter(f => sheet[f as keyof ScoreSheet] !== null && sheet[f as keyof ScoreSheet] !== undefined)
                .map(field => (
                  <tr key={field} className="border-b border-zinc-100">
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

      {/* Subtotals */}
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 border-b border-zinc-200 pb-0.5">Subtotales</p>
        <table className="w-full text-xs">
          <tbody>
            {[
              { label: 'Building total',        value: sheet.building_total },
              { label: 'Tumbling total',         value: sheet.tumbling_total },
              { label: 'Overall total',          value: sheet.overall_total },
              { label: 'Creatividad (promedio)', value: sheet.avg_creativity },
              { label: 'Artisticidad (promedio)',value: sheet.avg_showmanship },
              { label: 'Partner Stunt total',    value: sheet.partner_stunt_total },
            ].filter(r => r.value && Number(r.value) > 0).map(r => (
              <tr key={r.label} className="border-b border-zinc-100">
                <td className="py-1 pr-4 text-zinc-600">{r.label}</td>
                <td className="py-1 text-right font-semibold tabular-nums text-zinc-900 w-16">{fmt(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deductions */}
      {sheet.deductions?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 border-b border-zinc-200 pb-0.5">Deducciones</p>
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
                <tr key={d.id} className="border-b border-zinc-100">
                  <td className="py-1 pr-4 text-zinc-600">{d.deduction_type_display}</td>
                  <td className="py-1 pr-4 text-right tabular-nums">{d.count}</td>
                  <td className="py-1 text-right tabular-nums text-red-700">−{fmt(d.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Final scores */}
      <div className="border-t-2 border-zinc-900 pt-3 mt-2">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="py-0.5 pr-4 text-zinc-600">Puntaje bruto</td>
              <td className="py-0.5 text-right font-semibold tabular-nums w-20">{fmt(sheet.raw_score)}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-4 text-zinc-600">Puntaje escalado</td>
              <td className="py-0.5 text-right font-semibold tabular-nums">{fmt(sheet.scaled_score)}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-4 text-red-600">Total deducciones</td>
              <td className="py-0.5 text-right font-semibold tabular-nums text-red-600">−{fmt(sheet.total_deductions)}</td>
            </tr>
            <tr className="text-base">
              <td className="pt-2 pr-4 font-bold text-zinc-900">Puntaje final</td>
              <td className="pt-2 text-right font-bold tabular-nums text-zinc-900">{fmt(sheet.final_score)}</td>
            </tr>
            <tr>
              <td className="py-0.5 pr-4 text-zinc-500 text-xs">Porcentaje</td>
              <td className="py-0.5 text-right text-xs tabular-nums text-zinc-500">{Number(sheet.percentage).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[10px] text-zinc-400 text-center">Generado por Cheer Metrics · Ecuador</p>
    </div>
  );
}
