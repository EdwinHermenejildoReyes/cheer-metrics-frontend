import type { DivisionCategory } from '@/types/competitions';

export interface ConstructionGroups {
  stunts:   number;
  pyramids: number;
  tosses:   number;
}

// Lookup tables from the UCA Ecuador 2025 scoring system sheets.
// Each row: [minAthletes, stunts, pyramids, tosses]
// Values match the "TABLA DE CONTENIDO EN CONSTRUCCIÓN" sheets.

const ALL_GIRL_TABLE: [number, number, number, number][] = [
  [5,  1, 1, 1],
  [10, 2, 1, 2],
  [15, 3, 2, 3],
  [20, 4, 2, 4],
  [25, 5, 3, 5],
];

const COED_TABLE: [number, number, number, number][] = [
  [4,  1, 1, 1],
  [8,  2, 1, 2],
  [12, 3, 2, 3],
  [16, 4, 2, 4],
  [20, 5, 3, 5],
];

function lookup(table: [number, number, number, number][], count: number): ConstructionGroups {
  let row = table[0];
  for (const r of table) {
    if (count >= r[0]) row = r;
  }
  return { stunts: row[1], pyramids: row[2], tosses: row[3] };
}

export function getConstructionGroups(
  athleteCount: number,
  category: DivisionCategory,
): ConstructionGroups {
  if (athleteCount < 1) return { stunts: 0, pyramids: 0, tosses: 0 };
  const table = category === 'coed' ? COED_TABLE : ALL_GIRL_TABLE;
  return lookup(table, athleteCount);
}

export const CONSTRUCTION_TABLE_LABELS = {
  stunts:   'Grupos de Elevación',
  pyramids: 'Pirámides',
  tosses:   'Lanzamientos',
} as const;
