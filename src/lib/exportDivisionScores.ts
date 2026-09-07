import type { Division, JudgeAssignment, JudgeScoreRecord, Registration, SheetType } from '@/types/competitions';

const SHEET_TYPE_ES: Partial<Record<SheetType, string>> = {
  building:            'Elevaciones',
  tumbling:            'Gimnasia',
  overall:             'General',
  partner_stunt:       'Parejas',
  building_difficulty: 'Elev. Dificultad',
  building_execution:  'Elev. Ejecución',
  tumbling_difficulty: 'Gim. Dificultad',
  tumbling_execution:  'Gim. Ejecución',
  deducciones:         'Deducciones',
  deductions_only:     'Deducciones',
  safety_rules:        'Reglas/Seguridad',
  rangos:              'Rangos',
};

function f(v: string | null | undefined): number {
  return parseFloat(v ?? '0') || 0;
}

function judgeSubtotal(sheetType: SheetType, r: JudgeScoreRecord): number {
  switch (sheetType) {
    case 'building':
    case 'building_combined':
      return f(r.stunts_difficulty) + f(r.stunts_execution) + f(r.stunts_drivers)
           + f(r.pyramids_difficulty) + f(r.pyramids_execution) + f(r.pyramids_drivers)
           + f(r.tosses_difficulty) + f(r.tosses_execution);
    case 'building_difficulty':
      return f(r.stunts_difficulty) + f(r.pyramids_difficulty) + f(r.tosses_difficulty);
    case 'building_execution':
      return f(r.stunts_execution) + f(r.pyramids_execution) + f(r.tosses_execution);
    case 'tumbling':
    case 'tumbling_combined':
      return f(r.standing_difficulty) + f(r.standing_execution) + f(r.standing_drivers)
           + f(r.running_difficulty) + f(r.running_execution) + f(r.running_drivers)
           + f(r.jumps_difficulty) + f(r.jumps_execution);
    case 'tumbling_difficulty':
      return f(r.standing_difficulty) + f(r.running_difficulty) + f(r.jumps_difficulty);
    case 'tumbling_execution':
      return f(r.standing_execution) + f(r.running_execution) + f(r.jumps_execution);
    case 'overall':
      return f(r.formations_score) + f(r.dance_difficulty) + f(r.dance_execution);
    case 'partner_stunt':
      return f(r.pg_technique) + f(r.pg_difficulty) + f(r.pg_form_appearance)
           + f(r.pg_transitions) + f(r.pg_expressiveness);
    default:
      return 0;
  }
}

export async function exportDivisionScores(
  division: Division,
  registrations: Registration[],
  judgesBySheet: Partial<Record<SheetType, JudgeAssignment[]>>,
  judgeRecordsMap: Record<number, Record<number, JudgeScoreRecord>>,
): Promise<void> {
  const { utils, writeFile } = await import('xlsx');

  const wb = utils.book_new();

  const sheetEntries = (Object.entries(judgesBySheet) as [SheetType, JudgeAssignment[]][])
    .filter(([, judges]) => judges.length > 0);

  if (sheetEntries.length === 0) {
    // No judges assigned — create a minimal sheet
    const ws = utils.aoa_to_sheet([['Sin planillas asignadas para esta división']]);
    utils.book_append_sheet(wb, ws, 'Sin datos');
    writeFile(wb, `${division.name}_scores.xlsx`);
    return;
  }

  // One Excel sheet per scoring sheet type
  for (const [sheetType, judges] of sheetEntries) {
    const label = SHEET_TYPE_ES[sheetType] ?? sheetType;

    // Header row 1: section titles
    const headerJudges = judges.map((j) => j.user_name);
    const header = ['Pos.', 'Equipo', 'Gimnasio', ...headerJudges, 'Promedio'];

    const rows: (string | number)[][] = [header];

    const sorted = [...registrations]
      .filter((r) => {
        const records = judgeRecordsMap[r.id];
        if (!records) return false;
        return judges.some((j) => {
          const rec = records[j.id];
          return rec && judgeSubtotal(sheetType, rec) > 0;
        });
      })
      .map((r) => {
        const records = judgeRecordsMap[r.id] ?? {};
        const scores = judges.map((j) => {
          const rec = records[j.id];
          return rec ? judgeSubtotal(sheetType, rec) : 0;
        });
        const avg = scores.length > 0
          ? scores.reduce((s, x) => s + x, 0) / scores.length
          : 0;
        return { reg: r, scores, avg };
      })
      .sort((a, b) => b.avg - a.avg);

    sorted.forEach(({ reg, scores, avg }, idx) => {
      rows.push([
        idx + 1,
        reg.team_name,
        reg.gym_name,
        ...scores.map((s) => parseFloat(s.toFixed(2))),
        parseFloat(avg.toFixed(2)),
      ]);
    });

    const ws = utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 22 },
      ...judges.map(() => ({ wch: 18 })),
      { wch: 12 },
    ];

    utils.book_append_sheet(wb, ws, label.slice(0, 31)); // Excel tab max 31 chars
  }

  // Summary sheet: all sheet types side by side
  const allJudgeIds = new Map<number, string>();
  for (const judges of Object.values(judgesBySheet)) {
    judges?.forEach((j) => allJudgeIds.set(j.id, j.user_name));
  }

  const summaryHeader = ['Pos.', 'Equipo', 'Gimnasio'];
  for (const [sheetType, judges] of sheetEntries) {
    const label = SHEET_TYPE_ES[sheetType] ?? sheetType;
    judges.forEach((j) => summaryHeader.push(`${label} — ${j.user_name}`));
    summaryHeader.push(`${label} Prom.`);
  }
  summaryHeader.push('TOTAL');

  const summaryRows: (string | number)[][] = [summaryHeader];

  const regTotals = registrations.map((r) => {
    const records = judgeRecordsMap[r.id] ?? {};
    let grandTotal = 0;
    const cells: (string | number)[] = [];
    for (const [sheetType, judges] of sheetEntries) {
      const scores = judges.map((j) => {
        const rec = records[j.id];
        return rec ? judgeSubtotal(sheetType, rec) : 0;
      });
      const avg = scores.length > 0 ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
      scores.forEach((s) => cells.push(parseFloat(s.toFixed(2))));
      cells.push(parseFloat(avg.toFixed(2)));
      grandTotal += avg;
    }
    return { reg: r, cells, grandTotal };
  })
  .filter(({ grandTotal }) => grandTotal > 0)
  .sort((a, b) => b.grandTotal - a.grandTotal);

  regTotals.forEach(({ reg, cells, grandTotal }, idx) => {
    summaryRows.push([idx + 1, reg.team_name, reg.gym_name, ...cells, parseFloat(grandTotal.toFixed(2))]);
  });

  const summaryWs = utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 22 }, ...summaryHeader.slice(3).map(() => ({ wch: 16 }))];
  utils.book_append_sheet(wb, summaryWs, 'Resumen');

  const safeName = division.name.replace(/[/\\?%*:|"<>]/g, '-');
  writeFile(wb, `${safeName}_calificaciones.xlsx`);
}
