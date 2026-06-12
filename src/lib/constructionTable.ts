import type { DivisionCategory } from '@/types/competitions';

// ── Building (Construcción) ───────────────────────────────────────────────────

export interface ConstructionGroups {
  stunts:   number;
  pyramids: number;
  tosses:   number;
}

// Each row: [minAthletes, stunts, pyramids, tosses]
// Source: UCA Ecuador 2025 "TABLA DE CONTENIDO EN CONSTRUCCIÓN" sheets.

const ALL_GIRL_BUILDING: [number, number, number, number][] = [
  [5,  1, 1, 1],
  [10, 2, 1, 2],
  [15, 3, 2, 3],
  [20, 4, 2, 4],
  [25, 5, 3, 5],
];

const COED_BUILDING: [number, number, number, number][] = [
  [4,  1, 1, 1],
  [8,  2, 1, 2],
  [12, 3, 2, 3],
  [16, 4, 2, 4],
  [20, 5, 3, 5],
];

function lookupBuilding(table: [number, number, number, number][], count: number): ConstructionGroups {
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
  const table = category === 'coed' ? COED_BUILDING : ALL_GIRL_BUILDING;
  return lookupBuilding(table, athleteCount);
}

// ── Gymnastics (Gimnasia) ─────────────────────────────────────────────────────

export interface GymGroups {
  standing: number;  // atletas evaluados en Estática
  running:  number;  // atletas evaluados con Carrera
}

// Each row: [minAthletes, standing, running]
// Source: UCA Ecuador 2025 "TABLA DE CONTENIDO EN GIMNASIA" sheets.

const ALL_GIRL_GYM: [number, number, number][] = [
  [5,  2, 2],
  [10, 3, 3],
  [15, 4, 4],
  [20, 5, 5],
  [25, 6, 6],
];

const COED_GYM: [number, number, number][] = [
  [4,  2, 2],
  [8,  3, 3],
  [12, 4, 4],
  [16, 5, 5],
  [20, 6, 6],
];

function lookupGym(table: [number, number, number][], count: number): GymGroups {
  let row = table[0];
  for (const r of table) {
    if (count >= r[0]) row = r;
  }
  return { standing: row[1], running: row[2] };
}

export function getGymGroups(
  athleteCount: number,
  category: DivisionCategory,
): GymGroups {
  if (athleteCount < 1) return { standing: 0, running: 0 };
  const table = category === 'coed' ? COED_GYM : ALL_GIRL_GYM;
  return lookupGym(table, athleteCount);
}
