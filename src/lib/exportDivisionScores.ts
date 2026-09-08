import type { Division, JudgeAssignment, JudgeScoreRecord, Registration, SheetType } from '@/types/competitions';

// ── Helpers ────────────────────────────────────────────────────────────────────

const f = (v: string | null | undefined): number => parseFloat(v ?? '0') || 0;
const n2 = (v: number): number => parseFloat(v.toFixed(2));

// ── Layout definitions per sheet type ─────────────────────────────────────────

interface FieldDef {
  label: string;
  get: (r: JudgeScoreRecord) => number;
}

interface SectionDef {
  label: string;
  fields: FieldDef[];
  withSum: boolean;
}

interface LayoutDef {
  tab: string;
  sections: SectionDef[];
  creativity?: (r: JudgeScoreRecord) => number;
  showmanship?: (r: JudgeScoreRecord) => number;
}

const LAYOUTS: Partial<Record<SheetType, LayoutDef>> = {
  tumbling: {
    tab: 'Gimnasia',
    sections: [
      {
        label: 'ESTÁTICA',
        fields: [
          { label: 'Dif',  get: r => f(r.standing_difficulty) },
          { label: 'Ejec', get: r => f(r.standing_execution) },
          { label: 'Dr',   get: r => f(r.standing_drivers) },
        ],
        withSum: true,
      },
      {
        label: 'CON CARRERA',
        fields: [
          { label: 'Dif',  get: r => f(r.running_difficulty) },
          { label: 'Ejec', get: r => f(r.running_execution) },
          { label: 'Dr',   get: r => f(r.running_drivers) },
        ],
        withSum: true,
      },
      {
        label: 'SALTOS',
        fields: [
          { label: 'Dif',  get: r => f(r.jumps_difficulty) },
          { label: 'Ejec', get: r => f(r.jumps_execution) },
        ],
        withSum: true,
      },
    ],
    creativity:  r => f(r.creativity_tumbling),
    showmanship: r => f(r.showmanship_tumbling),
  },

  overall: {
    tab: 'General',
    sections: [
      {
        label: 'FORMACIONES',
        fields: [
          { label: 'Puntos', get: r => f(r.formations_score) },
        ],
        withSum: false,
      },
      {
        label: 'BAILE',
        fields: [
          { label: 'Dif',  get: r => f(r.dance_difficulty) },
          { label: 'Ejec', get: r => f(r.dance_execution) },
        ],
        withSum: true,
      },
    ],
    creativity:  r => f(r.creativity_overall),
    showmanship: r => f(r.showmanship_overall),
  },

  building: {
    tab: 'Elevaciones',
    sections: [
      {
        label: 'STUNTS',
        fields: [
          { label: 'Dif',  get: r => f(r.stunts_difficulty) },
          { label: 'Ejec', get: r => f(r.stunts_execution) },
          { label: 'Dr',   get: r => f(r.stunts_drivers) },
        ],
        withSum: true,
      },
      {
        label: 'PIRÁMIDES',
        fields: [
          { label: 'Dif',  get: r => f(r.pyramids_difficulty) },
          { label: 'Ejec', get: r => f(r.pyramids_execution) },
          { label: 'Dr',   get: r => f(r.pyramids_drivers) },
        ],
        withSum: true,
      },
      {
        label: 'LANZAMIENTOS',
        fields: [
          { label: 'Dif',  get: r => f(r.tosses_difficulty) },
          { label: 'Ejec', get: r => f(r.tosses_execution) },
        ],
        withSum: true,
      },
    ],
    creativity:  r => f(r.creativity_building),
    showmanship: r => f(r.showmanship_building),
  },

  partner_stunt: {
    tab: 'Parejas',
    sections: [
      { label: 'TÉCNICA',       fields: [{ label: 'Puntos', get: r => f(r.pg_technique) }],        withSum: false },
      { label: 'DIFICULTAD',    fields: [{ label: 'Puntos', get: r => f(r.pg_difficulty) }],       withSum: false },
      { label: 'FORMA',         fields: [{ label: 'Puntos', get: r => f(r.pg_form_appearance) }],  withSum: false },
      { label: 'TRANSICIONES',  fields: [{ label: 'Puntos', get: r => f(r.pg_transitions) }],     withSum: false },
      { label: 'EXPRESIVIDAD',  fields: [{ label: 'Puntos', get: r => f(r.pg_expressiveness) }],  withSum: false },
    ],
  },

  building_difficulty: {
    tab: 'Elev. Dificultad',
    sections: [
      { label: 'STUNTS',        fields: [{ label: 'Dif', get: r => f(r.stunts_difficulty) }],    withSum: false },
      { label: 'PIRÁMIDES',     fields: [{ label: 'Dif', get: r => f(r.pyramids_difficulty) }],  withSum: false },
      { label: 'LANZAMIENTOS',  fields: [{ label: 'Dif', get: r => f(r.tosses_difficulty) }],    withSum: false },
    ],
  },

  building_execution: {
    tab: 'Elev. Ejecución',
    sections: [
      { label: 'STUNTS',        fields: [{ label: 'Ejec', get: r => f(r.stunts_execution) }],    withSum: false },
      { label: 'PIRÁMIDES',     fields: [{ label: 'Ejec', get: r => f(r.pyramids_execution) }],  withSum: false },
      { label: 'LANZAMIENTOS',  fields: [{ label: 'Ejec', get: r => f(r.tosses_execution) }],    withSum: false },
    ],
    creativity:  r => f(r.creativity_building),
    showmanship: r => f(r.showmanship_building),
  },

  tumbling_difficulty: {
    tab: 'Gim. Dificultad',
    sections: [
      { label: 'ESTÁTICA',      fields: [{ label: 'Dif', get: r => f(r.standing_difficulty) }],  withSum: false },
      { label: 'CON CARRERA',   fields: [{ label: 'Dif', get: r => f(r.running_difficulty) }],   withSum: false },
      { label: 'SALTOS',        fields: [{ label: 'Dif', get: r => f(r.jumps_difficulty) }],     withSum: false },
    ],
  },

  tumbling_execution: {
    tab: 'Gim. Ejecución',
    sections: [
      { label: 'ESTÁTICA',      fields: [{ label: 'Ejec', get: r => f(r.standing_execution) }],  withSum: false },
      { label: 'CON CARRERA',   fields: [{ label: 'Ejec', get: r => f(r.running_execution) }],   withSum: false },
      { label: 'SALTOS',        fields: [{ label: 'Ejec', get: r => f(r.jumps_execution) }],     withSum: false },
    ],
    creativity:  r => f(r.creativity_tumbling),
    showmanship: r => f(r.showmanship_tumbling),
  },
};

// ── Total per judge (sum of all base fields + creativity + showmanship) ─────────

function judgeTotal(layout: LayoutDef, r: JudgeScoreRecord): number {
  let t = 0;
  for (const sec of layout.sections) {
    for (const fd of sec.fields) t += fd.get(r);
  }
  if (layout.creativity)  t += layout.creativity(r);
  if (layout.showmanship) t += layout.showmanship(r);
  return t;
}

// ── Column spec (data columns only, Juez is always col 0) ────────────────────

interface ColSpec {
  sectionLabel: string;
  fieldLabel:   string;
  getValue:     (r: JudgeScoreRecord) => number;
}

function buildCols(layout: LayoutDef): ColSpec[] {
  const cols: ColSpec[] = [];
  for (const sec of layout.sections) {
    const getters = sec.fields.map(fd => fd.get);
    for (const fd of sec.fields) {
      cols.push({ sectionLabel: sec.label, fieldLabel: fd.label, getValue: fd.get });
    }
    if (sec.withSum) {
      cols.push({
        sectionLabel: sec.label,
        fieldLabel:   'Σ',
        getValue:     r => getters.reduce((s, g) => s + g(r), 0),
      });
    }
  }
  if (layout.creativity) {
    cols.push({ sectionLabel: 'CREATIVIDAD', fieldLabel: '', getValue: layout.creativity });
  }
  if (layout.showmanship) {
    cols.push({ sectionLabel: 'SHOWMANSHIP', fieldLabel: '', getValue: layout.showmanship });
  }
  cols.push({ sectionLabel: 'TOTAL', fieldLabel: '', getValue: r => judgeTotal(layout, r) });
  return cols;
}

// ── Worksheet builder ─────────────────────────────────────────────────────────

type CellVal = string | number | null;
type Row     = CellVal[];
type Merge   = { s: { r: number; c: number }; e: { r: number; c: number } };

function buildWorksheet(
  layout: LayoutDef,
  registrations: Registration[],
  judges: JudgeAssignment[],
  judgeRecordsMap: Record<number, Record<number, JudgeScoreRecord>>,
) {
  const cols      = buildCols(layout);
  const totalCols = cols.length + 1; // +1 for Juez
  const merges: Merge[] = [];

  // ── Row 0: section labels ──────────────────────────────────────────────────
  const sectionRow: Row = Array(totalCols).fill(null);
  sectionRow[0] = 'Juez'; // merged down through row 1

  let ci = 0;
  while (ci < cols.length) {
    const label = cols[ci].sectionLabel;
    let end = ci;
    while (end + 1 < cols.length && cols[end + 1].sectionLabel === label) end++;
    const excelCol = ci + 1;
    sectionRow[excelCol] = label;
    if (end > ci) {
      merges.push({ s: { r: 0, c: excelCol }, e: { r: 0, c: end + 1 } });
    }
    ci = end + 1;
  }
  // Merge Juez vertically across both header rows
  merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });

  // ── Row 1: field labels ────────────────────────────────────────────────────
  const fieldRow: Row = [''];
  for (const col of cols) {
    fieldRow.push(col.fieldLabel || col.sectionLabel);
  }

  const rows: Row[] = [sectionRow, fieldRow, Array(totalCols).fill(null)];
  let rowIdx = 3;

  // ── One block per registration ────────────────────────────────────────────
  for (const reg of registrations) {
    const regRecords = judgeRecordsMap[reg.id] ?? {};
    const activeJudges = judges.filter(j => {
      const rec = regRecords[j.id];
      return rec && judgeTotal(layout, rec) > 0;
    });
    if (activeJudges.length === 0) continue;

    // Team name row — merged across all columns
    const teamRow: Row = Array(totalCols).fill(null);
    teamRow[0] = `${reg.team_name}  ·  ${reg.gym_name}`;
    merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: totalCols - 1 } });
    rows.push(teamRow);
    rowIdx++;

    for (const judge of activeJudges) {
      const rec  = regRecords[judge.id];
      const judgeRow: Row = [judge.user_name];
      for (const col of cols) judgeRow.push(n2(col.getValue(rec)));
      rows.push(judgeRow);
      rowIdx++;
    }

    rows.push(Array(totalCols).fill(null)); // blank separator
    rowIdx++;
  }

  // ── Column widths ─────────────────────────────────────────────────────────
  const colWidths = [{ wch: 24 }, ...cols.map(col => {
    if (col.sectionLabel === 'TOTAL')        return { wch: 9 };
    if (col.sectionLabel === 'CREATIVIDAD')  return { wch: 13 };
    if (col.sectionLabel === 'SHOWMANSHIP')  return { wch: 13 };
    if (col.fieldLabel === 'Σ')              return { wch: 8 };
    return { wch: 7 };
  })];

  return { rows, merges, colWidths };
}

// ── Public export function ────────────────────────────────────────────────────

export async function exportDivisionScores(
  division: Division,
  registrations: Registration[],
  judgesBySheet: Partial<Record<SheetType, JudgeAssignment[]>>,
  judgeRecordsMap: Record<number, Record<number, JudgeScoreRecord>>,
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');
  const wb = utils.book_new();

  const confirmed = registrations.filter(r => r.status === 'confirmed');
  let hasData = false;

  for (const [sheetType, judges] of Object.entries(judgesBySheet) as [SheetType, JudgeAssignment[]][]) {
    const layout = LAYOUTS[sheetType];
    if (!layout || !judges?.length) continue;

    const { rows, merges, colWidths } = buildWorksheet(layout, confirmed, judges, judgeRecordsMap);
    const ws = utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;
    ws['!cols']   = colWidths;

    utils.book_append_sheet(wb, ws, layout.tab.slice(0, 31));
    hasData = true;
  }

  if (!hasData) {
    utils.book_append_sheet(
      wb,
      utils.aoa_to_sheet([['Sin planillas asignadas para esta división']]),
      'Sin datos',
    );
  }

  const safeName = division.name.replace(/[/\\?%*:|"<>]/g, '-');
  writeFile(wb, `${safeName}_calificaciones.xlsx`);
}
