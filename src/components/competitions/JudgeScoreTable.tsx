'use client';

import type { JudgeAssignment, JudgeScoreRecord, SheetType } from '@/types/competitions';

type FieldKey = keyof JudgeScoreRecord;
type Color = 'blue' | 'green' | 'purple' | 'orange';

interface ColField   { key: FieldKey; label: string; }
interface ColGroup   { label: string; color: Color; fields: ColField[]; showSubtotal: boolean; }

const f = (v: string | null | undefined): number => parseFloat(v ?? '0') || 0;

const PALETTE: Record<Color, { header: string; sub: string }> = {
  blue:   { header: 'bg-blue-50 text-blue-700',     sub: 'bg-blue-50 text-blue-700 font-semibold' },
  green:  { header: 'bg-green-50 text-green-700',   sub: 'bg-green-50 text-green-700 font-semibold' },
  purple: { header: 'bg-purple-50 text-purple-700', sub: 'bg-purple-50 text-purple-700 font-semibold' },
  orange: { header: 'bg-orange-50 text-orange-700', sub: 'bg-orange-50 text-orange-700 font-semibold' },
};

const BUILDING_GROUPS: ColGroup[] = [
  { label: 'STUNT',        color: 'blue',   showSubtotal: true, fields: [
    { key: 'stunts_difficulty',   label: 'Dif' },
    { key: 'stunts_execution',    label: 'Ejec' },
    { key: 'stunts_drivers',      label: 'Dr' },
  ]},
  { label: 'PIRÁMIDES',    color: 'blue',   showSubtotal: true, fields: [
    { key: 'pyramids_difficulty', label: 'Dif' },
    { key: 'pyramids_execution',  label: 'Ejec' },
    { key: 'pyramids_drivers',    label: 'Dr' },
  ]},
  { label: 'LANZAMIENTOS', color: 'blue',   showSubtotal: true, fields: [
    { key: 'tosses_difficulty',   label: 'Dif' },
    { key: 'tosses_execution',    label: 'Ejec' },
  ]},
  { label: 'Creatividad',  color: 'purple', showSubtotal: false, fields: [{ key: 'creativity_building',  label: '' }] },
  { label: 'Showmanship',  color: 'purple', showSubtotal: false, fields: [{ key: 'showmanship_building', label: '' }] },
];

const TUMBLING_GROUPS: ColGroup[] = [
  { label: 'ESTÁTICA',    color: 'green',  showSubtotal: true, fields: [
    { key: 'standing_difficulty', label: 'Dif' },
    { key: 'standing_execution',  label: 'Ejec' },
    { key: 'standing_drivers',    label: 'Dr' },
  ]},
  { label: 'CON CARRERA', color: 'green',  showSubtotal: true, fields: [
    { key: 'running_difficulty',  label: 'Dif' },
    { key: 'running_execution',   label: 'Ejec' },
    { key: 'running_drivers',     label: 'Dr' },
  ]},
  { label: 'SALTOS',      color: 'green',  showSubtotal: true, fields: [
    { key: 'jumps_difficulty',    label: 'Dif' },
    { key: 'jumps_execution',     label: 'Ejec' },
  ]},
  { label: 'Creatividad', color: 'purple', showSubtotal: false, fields: [{ key: 'creativity_tumbling',  label: '' }] },
  { label: 'Showmanship', color: 'purple', showSubtotal: false, fields: [{ key: 'showmanship_tumbling', label: '' }] },
];

const GROUPS: Partial<Record<SheetType, ColGroup[]>> = {
  building:            BUILDING_GROUPS,
  building_combined:   BUILDING_GROUPS,
  building_difficulty: [
    { label: 'STUNT',        color: 'blue', showSubtotal: false, fields: [{ key: 'stunts_difficulty',   label: 'Dif' }] },
    { label: 'PIRÁMIDES',    color: 'blue', showSubtotal: false, fields: [{ key: 'pyramids_difficulty', label: 'Dif' }] },
    { label: 'LANZAMIENTOS', color: 'blue', showSubtotal: false, fields: [{ key: 'tosses_difficulty',   label: 'Dif' }] },
  ],
  building_execution: [
    { label: 'STUNT',        color: 'blue',   showSubtotal: false, fields: [{ key: 'stunts_execution',   label: 'Ejec' }] },
    { label: 'PIRÁMIDES',    color: 'blue',   showSubtotal: false, fields: [{ key: 'pyramids_execution', label: 'Ejec' }] },
    { label: 'LANZAMIENTOS', color: 'blue',   showSubtotal: false, fields: [{ key: 'tosses_execution',   label: 'Ejec' }] },
    { label: 'Creatividad',  color: 'purple', showSubtotal: false, fields: [{ key: 'creativity_building',  label: '' }] },
    { label: 'Showmanship',  color: 'purple', showSubtotal: false, fields: [{ key: 'showmanship_building', label: '' }] },
  ],
  tumbling:            TUMBLING_GROUPS,
  tumbling_combined:   TUMBLING_GROUPS,
  tumbling_difficulty: [
    { label: 'ESTÁTICA',    color: 'green', showSubtotal: false, fields: [{ key: 'standing_difficulty', label: 'Dif' }] },
    { label: 'CON CARRERA', color: 'green', showSubtotal: false, fields: [{ key: 'running_difficulty',  label: 'Dif' }] },
    { label: 'SALTOS',      color: 'green', showSubtotal: false, fields: [{ key: 'jumps_difficulty',    label: 'Dif' }] },
  ],
  tumbling_execution: [
    { label: 'ESTÁTICA',    color: 'green',  showSubtotal: false, fields: [{ key: 'standing_execution', label: 'Ejec' }] },
    { label: 'CON CARRERA', color: 'green',  showSubtotal: false, fields: [{ key: 'running_execution',  label: 'Ejec' }] },
    { label: 'SALTOS',      color: 'green',  showSubtotal: false, fields: [{ key: 'jumps_execution',    label: 'Ejec' }] },
    { label: 'Creatividad', color: 'purple', showSubtotal: false, fields: [{ key: 'creativity_tumbling',  label: '' }] },
    { label: 'Showmanship', color: 'purple', showSubtotal: false, fields: [{ key: 'showmanship_tumbling', label: '' }] },
  ],
  overall: [
    { label: 'DANZA',       color: 'purple', showSubtotal: true, fields: [
      { key: 'dance_difficulty', label: 'Dif' },
      { key: 'dance_execution',  label: 'Ejec' },
    ]},
    { label: 'FORMACIONES', color: 'purple', showSubtotal: false, fields: [{ key: 'formations_score',   label: '' }] },
    { label: 'Creatividad', color: 'purple', showSubtotal: false, fields: [{ key: 'creativity_overall', label: '' }] },
    { label: 'Showmanship', color: 'purple', showSubtotal: false, fields: [{ key: 'showmanship_overall', label: '' }] },
  ],
  partner_stunt: [
    { label: 'Técnica',      color: 'orange', showSubtotal: false, fields: [{ key: 'pg_technique',       label: '' }] },
    { label: 'Dificultad',   color: 'orange', showSubtotal: false, fields: [{ key: 'pg_difficulty',      label: '' }] },
    { label: 'Forma',        color: 'orange', showSubtotal: false, fields: [{ key: 'pg_form_appearance', label: '' }] },
    { label: 'Transiciones', color: 'orange', showSubtotal: false, fields: [{ key: 'pg_transitions',     label: '' }] },
    { label: 'Expresividad', color: 'orange', showSubtotal: false, fields: [{ key: 'pg_expressiveness',  label: '' }] },
  ],
};

function groupTotal(group: ColGroup, rec: JudgeScoreRecord): number {
  return group.fields.reduce((s, fld) => s + f(rec[fld.key] as string | null), 0);
}

function recordTotal(groups: ColGroup[], rec: JudgeScoreRecord): number {
  return groups.reduce((s, g) => s + groupTotal(g, rec), 0);
}

interface Props {
  sheetType: SheetType;
  judges: JudgeAssignment[];
  records: Record<number, JudgeScoreRecord>; // judgeAssignmentId → record
}

export function JudgeScoreTable({ sheetType, judges, records }: Props) {
  const rawGroups = GROUPS[sheetType];
  if (!rawGroups || judges.length === 0) return null;

  const judgeRows = judges.map((j) => ({ judge: j, rec: records[j.id] ?? null }));
  const scored    = judgeRows.filter((r) => r.rec !== null);

  // Hide sub-columns that are all zero across all records
  const groups: ColGroup[] = rawGroups
    .map((g) => ({
      ...g,
      fields: g.fields.filter((fld) =>
        scored.some((r) => f(r.rec![fld.key] as string | null) !== 0)
      ),
    }))
    .filter((g) => g.fields.length > 0);

  if (groups.length === 0 && scored.length === 0) return null;

  const avgField  = (key: FieldKey) =>
    scored.length ? scored.reduce((s, r) => s + f(r.rec![key] as string | null), 0) / scored.length : 0;
  const avgGroup  = (g: ColGroup) => g.fields.reduce((s, fld) => s + avgField(fld.key), 0);
  const avgTotal  = scored.length ? scored.reduce((s, r) => s + recordTotal(groups, r.rec!), 0) / scored.length : 0;

  const TD  = (extra = '') => `px-2 py-2 text-right tabular-nums text-zinc-600 text-xs ${extra}`;
  const SEP = 'border-l border-zinc-200';

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          {/* Row 1 – group labels */}
          <tr>
            <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 bg-zinc-50 border-b border-zinc-200 align-bottom min-w-[130px]">
              Juez
            </th>
            {groups.map((g) => {
              const cols = g.fields.length + (g.showSubtotal ? 1 : 0);
              return (
                <th
                  key={g.label}
                  colSpan={cols}
                  className={`px-2 py-1.5 text-center font-bold uppercase tracking-wide border-b border-zinc-100 border-l border-zinc-200 ${PALETTE[g.color].header}`}
                >
                  {g.label}
                </th>
              );
            })}
            <th rowSpan={2} className="px-3 py-2 text-right font-bold text-zinc-900 bg-zinc-50 border-b border-zinc-200 border-l border-zinc-200 align-bottom">
              TOTAL
            </th>
          </tr>
          {/* Row 2 – field labels */}
          <tr>
            {groups.map((g) =>
              g.fields.map((fld, fi) => (
                <th
                  key={fld.key}
                  className={`px-2 py-1 text-right font-medium text-zinc-400 bg-zinc-50 border-b border-zinc-200 ${fi === 0 ? SEP : ''}`}
                >
                  {fld.label}
                </th>
              )).concat(
                g.showSubtotal
                  ? [<th key={`${g.label}-sigma`} className={`px-2 py-1 text-right font-semibold border-b border-zinc-200 ${PALETTE[g.color].sub}`}>Σ</th>]
                  : []
              )
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-100">
          {judgeRows.map(({ judge, rec }) => {
            const tot = rec ? recordTotal(groups, rec) : null;
            return (
              <tr key={judge.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-medium text-zinc-800 max-w-[160px] truncate">
                  {judge.user_name}
                  {!rec && <span className="ml-1.5 text-[10px] font-normal text-zinc-400">Sin registro</span>}
                </td>
                {groups.map((g) =>
                  g.fields.map((fld, fi) => (
                    <td key={fld.key} className={TD(fi === 0 ? SEP : '')}>
                      {rec ? f(rec[fld.key] as string | null).toFixed(2) : <span className="text-zinc-300">—</span>}
                    </td>
                  )).concat(
                    g.showSubtotal
                      ? [
                          <td key={`${g.label}-sig`} className={`px-2 py-2 text-right tabular-nums text-xs font-semibold ${PALETTE[g.color].sub}`}>
                            {rec ? groupTotal(g, rec).toFixed(2) : <span className="opacity-40">—</span>}
                          </td>,
                        ]
                      : []
                  )
                )}
                <td className={`px-3 py-2 text-right tabular-nums text-xs font-bold border-l border-zinc-200 ${tot !== null && tot > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {tot !== null ? tot.toFixed(2) : <span className="text-zinc-300">—</span>}
                </td>
              </tr>
            );
          })}

          {/* Promedio row */}
          {scored.length > 1 && (
            <tr className="bg-zinc-50 border-t-2 border-zinc-300">
              <td className="px-3 py-2 font-semibold text-zinc-500 uppercase tracking-wide">
                Promedio
              </td>
              {groups.map((g) =>
                g.fields.map((fld, fi) => (
                  <td key={fld.key} className={TD(`font-medium text-zinc-700 ${fi === 0 ? SEP : ''}`)}>
                    {avgField(fld.key).toFixed(2)}
                  </td>
                )).concat(
                  g.showSubtotal
                    ? [
                        <td key={`${g.label}-avg-sig`} className={`px-2 py-2 text-right tabular-nums text-xs font-semibold ${PALETTE[g.color].sub}`}>
                          {avgGroup(g).toFixed(2)}
                        </td>,
                      ]
                    : []
                )
              )}
              <td className="px-3 py-2 text-right tabular-nums font-bold text-zinc-800 text-xs border-l border-zinc-200">
                {avgTotal.toFixed(2)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
