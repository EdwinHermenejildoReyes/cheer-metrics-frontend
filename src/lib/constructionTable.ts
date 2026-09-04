import type { DivisionCategory, SkillLevel } from '@/types/competitions';

// ── Building / Construcción ───────────────────────────────────────────────────
// Source: International FECU 2026 — "TABLA DE CANTIDAD EN CONSTRUCCIÓN"
// Applies to ALL categories (All Girl, Coed, All Male, Non-Tumbling).

export interface ConstructionGroups {
  mayoria:    number;
  gran_parte: number;
  max:        number;
}

// [minAthletes, maxAthletes, mayoria, gran_parte, max]
const BUILDING_TABLE: readonly [number, number, number, number, number][] = [
  [ 5, 11, 1, 2, 3],
  [12, 17, 2, 3, 4],
  [18, 22, 3, 4, 5],
  [23, 30, 4, 5, 6],
  [31, 35, 5, 6, 7],
];

export function getConstructionGroups(athleteCount: number): ConstructionGroups | null {
  if (athleteCount < 5) return null;
  for (const [min, max, mayoria, gran_parte, maxVal] of BUILDING_TABLE) {
    if (athleteCount >= min && athleteCount <= max) {
      return { mayoria, gran_parte, max: maxVal };
    }
  }
  // > 35: use largest defined row
  return { mayoria: 5, gran_parte: 6, max: 7 };
}

// ── Coed-specific: Estilo Coed groups ────────────────────────────────────────
// Source: UCA Ecuador — "TABLA DE CANTIDAD COED"
// Based on number of MALE athletes and skill level.

export interface CoedStyleGroups {
  grupos_estilo_coed: number;
}

// N3 y N4: any number of males → always 1 coed group
// N5, N6, N7: [minMales, maxMales, grupos]
const COED_N5_N7: readonly [number, number, number][] = [
  [1,  3,  1],
  [4,  5,  2],
  [6,  7,  3],
  [8,  9,  4],
  [10, 11, 5],
  [12, 13, 6],
  [14, 16, 7],
];

const COED_HIGH_LEVELS: readonly SkillLevel[] = ['L5', 'L6', 'L7'];

export function getCoedStyleGroups(
  maleAthleteCount: number,
  skillLevel: SkillLevel,
): CoedStyleGroups | null {
  if (maleAthleteCount < 1) return null;

  if (!COED_HIGH_LEVELS.includes(skillLevel)) {
    // N3, N4 (and lower): always 1 group regardless of count
    return { grupos_estilo_coed: 1 };
  }

  for (const [min, max, grupos] of COED_N5_N7) {
    if (maleAthleteCount >= min && maleAthleteCount <= max) {
      return { grupos_estilo_coed: grupos };
    }
  }
  // > 16 males: use maximum defined row
  return { grupos_estilo_coed: 7 };
}

// ── Gymnastics / Gimnasia-Saltos ──────────────────────────────────────────────
// Source: International FECU 2026 — "TABLA DE CANTIDAD EN GIMNASIA/SALTOS"
// Same table for all categories.

export interface GymGroups {
  mayoria:    number;
  gran_parte: number;
  max:        number;
}

// [minAthletes, maxAthletes, mayoria, gran_parte, max]
const GYM_TABLE: readonly [number, number, number, number, number][] = [
  [ 5, 11,  5,  6, 10],
  [12, 17,  6,  7, 12],
  [18, 22,  9, 10, 18],
  [23, 30, 11, 12, 22],
  [31, 38, 15, 16, 30],
];

export function getGymGroups(athleteCount: number): GymGroups | null {
  if (athleteCount < 5) return null;
  for (const [min, max, mayoria, gran_parte, maxVal] of GYM_TABLE) {
    if (athleteCount >= min && athleteCount <= max) {
      return { mayoria, gran_parte, max: maxVal };
    }
  }
  // > 38: use largest defined row
  return { mayoria: 15, gran_parte: 16, max: 30 };
}

// ── Prep-specific gym table (FECU 2026, page 5) ───────────────────────────────
// Distinct from the International table — different ranges and counts.
const GYM_TABLE_PREP: readonly [number, number, number, number, number][] = [
  [10, 11,  5,  6,  7],
  [12, 15,  6,  7,  9],
  [16, 19,  8, 10, 12],
  [20, 23, 10, 13, 16],
  [24, 30, 12, 15, 19],
  [31, 35, 14, 18, 23],
];

export function getGymGroupsPrep(athleteCount: number): GymGroups | null {
  if (athleteCount < 10) return null;
  for (const [min, max, mayoria, gran_parte, maxVal] of GYM_TABLE_PREP) {
    if (athleteCount >= min && athleteCount <= max) {
      return { mayoria, gran_parte, max: maxVal };
    }
  }
  // > 35: use largest defined row
  return { mayoria: 14, gran_parte: 18, max: 23 };
}
