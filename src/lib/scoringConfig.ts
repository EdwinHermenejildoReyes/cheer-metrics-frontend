import type { ScoringSystem, Division } from '@/types/competitions';

// ── Primitive option types ────────────────────────────────────────────────────
export interface RangoOpt  { value: number; label: string }
export interface PyramidRangoOpt { low: number; high: number; label: string }

// ── Building config ───────────────────────────────────────────────────────────
export interface BuildingConfig {
  // Stunts
  hasStunts:            boolean;   // false → Tiny Novice (N/A)
  stuntsHasDiff:        boolean;   // false → Novice / Novice Plus (exec-only)
  stuntsRango:          RangoOpt[];
  stuntsSkillCount:     number;    // 5 for Elite, 3 for Prep
  stuntsSkillGrades:    RangoOpt[];
  stuntsPartMaxOpts:    RangoOpt[];
  stuntsExecMax:        number;
  // Pyramids
  hasPyramids:          boolean;
  pyramidsHasDiff:      boolean;
  pyramidRango:         PyramidRangoOpt[];
  pyramidFineSteps:     number[];
  pyramidsExecMax:      number;
  // Tosses
  hasTosses:            boolean;
  tossDiffOpts:         RangoOpt[];
  tossesExecMax:        number;
}

// ── Tumbling config ───────────────────────────────────────────────────────────
export interface TumblingConfig {
  // Standing
  hasStanding:          boolean;
  standingHasDiff:      boolean;
  standingRango:        RangoOpt[];
  standingHabilidad:    RangoOpt[];
  standingExecMax:      number;
  // Running
  hasRunning:           boolean;
  runningHasDiff:       boolean;
  runningRango:         RangoOpt[];
  runningHabilidad:     RangoOpt[];
  runningExecMax:       number;
  // Jumps
  hasJumps:             boolean;
  jumpsHasDiff:         boolean;
  jumpsDiffOpts:        RangoOpt[];
  jumpsExecMax:         number;
}

// ── Shared option sets ────────────────────────────────────────────────────────

const ELITE_STUNT_RANGO: RangoOpt[] = [
  { value: 3.5, label: 'No cumple con 4.0' },
  { value: 4.0, label: '4 Hab Dif por Gran Parte (Acumulativas)' },
  { value: 4.5, label: '2 Hab Dif Simultáneas por Gran Parte' },
  { value: 5.0, label: '3 Hab Dif Simultáneas por Gran Parte' },
  { value: 5.5, label: '4 Hab Dif Simultáneas por Gran Parte' },
  { value: 6.0, label: '5 Hab Dif Simultáneas por Gran Parte' },
];

const ELITE_SKILL_GRADES: RangoOpt[] = [
  { value: 0.00, label: 'No Cumple' },
  { value: 0.10, label: 'Avanzado' },
  { value: 0.20, label: 'Elite' },
];

const ELITE_PART_MAX: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.1, label: 'Nivel x MÁX · Avz x GRAN PARTE' },
  { value: 0.3, label: 'Avz x MÁX · Elite x GRAN PARTE' },
  { value: 0.5, label: 'Elite x MÁX' },
];

const ELITE_PYRAMID_RANGO: PyramidRangoOpt[] = [
  { low: 3.0, high: 3.5, label: 'No cumple con 3.5' },
  { low: 3.5, high: 4.0, label: '2 Hab Dif + 2 Estructuras' },
  { low: 4.0, high: 4.5, label: '3 Hab Dif + 2 Estructuras' },
  { low: 4.5, high: 5.0, label: '4 Hab Dif + 2 Estructuras' },
  { low: 5.0, high: 5.5, label: '5 Hab Dif + 2 Estructuras' },
];

const ELITE_TOSS_DIFF: RangoOpt[] = [
  { value: 0.0, label: 'No Realiza' },
  { value: 1.0, label: 'Menos de la MAYORÍA' },
  { value: 1.5, label: 'MAYORÍA del Nivel' },
  { value: 2.0, label: 'MAYORÍA Sincronizado o en Canon' },
];

const ELITE_TUMBLING_RANGO: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'Menos de la MAYORÍA: 1 pase del nivel' },
  { value: 1.5, label: 'MAYORÍA: 1 pase del nivel' },
  { value: 2.0, label: 'GRAN PARTE: 1 pase del nivel' },
];

const ELITE_HABILIDAD: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.3, label: 'Avanzada x Gran Parte' },
  { value: 0.5, label: 'Elite x Gran Parte' },
];

const ELITE_JUMPS: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'MAYORÍA: 1 Salto Avanzado' },
  { value: 1.5, label: 'GRAN PARTE: 2 Conectados + Variedad' },
  { value: 2.0, label: 'GRAN PARTE: 3 Conectados ó 2+1 (variedad)' },
];

const PYRAMID_FINE_STEPS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];

// Prep shares skill grade values (labels differ slightly but scores identical)
const PREP_STUNT_RANGO: RangoOpt[] = [
  { value: 2.5, label: 'No cumple con 3.0' },
  { value: 3.0, label: '4 Hab Dif por Gran Parte (Acumulativas)' },
  { value: 3.5, label: '2 Hab Dif Simultáneas por Gran Parte' },
  { value: 4.0, label: '3 Hab Dif Simultáneas por Gran Parte' },
];

const PREP_SKILL_GRADES: RangoOpt[] = [
  { value: 0.00, label: 'No Cumple' },
  { value: 0.10, label: 'Del Nivel' },
  { value: 0.20, label: 'Avanzada/Elite' },
];

const PREP_PART_MAX: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.4, label: 'Nivel x MÁX · Avz x GRAN PARTE' },
];

const PREP_PYRAMID_RANGO: PyramidRangoOpt[] = [
  { low: 2.0, high: 2.5, label: 'Inferior: No cumple con el Rango Bajo' },
  { low: 2.5, high: 3.0, label: 'Bajo: 2 Hab Dif + 2 Estructuras' },
  { low: 3.0, high: 3.5, label: 'Medio: 3 Hab Dif + 2 Estructuras x Gran Parte' },
];

const PREP_TUMBLING_RANGO: RangoOpt[] = [
  { value: 1.5, label: 'No cumple con 2.0' },
  { value: 2.0, label: 'MAYORÍA: 1 pase del nivel' },
  { value: 2.5, label: 'GRAN PARTE: 1 pase del nivel' },
];

const PREP_HABILIDAD: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.3, label: 'Nivel x MÁX / Avanzada x GRAN PARTE' },
  { value: 0.5, label: 'Avanzada x MÁX' },
];

// Prep jumps: sync required but NOT connected nor variety
const PREP_JUMPS: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'MAYORÍA: 1 Salto Avanzado' },
  { value: 1.5, label: 'GRAN PARTE: 2 Saltos (sincronizados)' },
  { value: 2.0, label: 'MÁX: 2 Saltos (sincronizados)' },
];

// ── Building configs ──────────────────────────────────────────────────────────

const ELITE_BUILDING: BuildingConfig = {
  hasStunts:        true,
  stuntsHasDiff:    true,
  stuntsRango:      ELITE_STUNT_RANGO,
  stuntsSkillCount: 5,
  stuntsSkillGrades: ELITE_SKILL_GRADES,
  stuntsPartMaxOpts: ELITE_PART_MAX,
  stuntsExecMax:    4.0,
  hasPyramids:      true,
  pyramidsHasDiff:  true,
  pyramidRango:     ELITE_PYRAMID_RANGO,
  pyramidFineSteps: PYRAMID_FINE_STEPS,
  pyramidsExecMax:  4.0,
  hasTosses:        true,
  tossDiffOpts:     ELITE_TOSS_DIFF,
  tossesExecMax:    2.0,
};

const PREP_BUILDING: BuildingConfig = {
  hasStunts:        true,
  stuntsHasDiff:    true,
  stuntsRango:      PREP_STUNT_RANGO,
  stuntsSkillCount: 3,
  stuntsSkillGrades: PREP_SKILL_GRADES,
  stuntsPartMaxOpts: PREP_PART_MAX,
  stuntsExecMax:    4.0,
  hasPyramids:      true,
  pyramidsHasDiff:  true,
  pyramidRango:     PREP_PYRAMID_RANGO,
  pyramidFineSteps: PYRAMID_FINE_STEPS,
  pyramidsExecMax:  4.0,
  hasTosses:        false,
  tossDiffOpts:     [],
  tossesExecMax:    2.0,
};

const MINI_NOVICE_BUILDING: BuildingConfig = {
  hasStunts:        true,
  stuntsHasDiff:    false,
  stuntsRango:      [],
  stuntsSkillCount: 0,
  stuntsSkillGrades: [],
  stuntsPartMaxOpts: [],
  stuntsExecMax:    4.0,
  hasPyramids:      true,
  pyramidsHasDiff:  false,
  pyramidRango:     [],
  pyramidFineSteps: [],
  pyramidsExecMax:  4.0,
  hasTosses:        false,
  tossDiffOpts:     [],
  tossesExecMax:    2.0,
};

const TINY_NOVICE_BUILDING: BuildingConfig = {
  hasStunts:        false,
  stuntsHasDiff:    false,
  stuntsRango:      [],
  stuntsSkillCount: 0,
  stuntsSkillGrades: [],
  stuntsPartMaxOpts: [],
  stuntsExecMax:    4.0,
  hasPyramids:      false,
  pyramidsHasDiff:  false,
  pyramidRango:     [],
  pyramidFineSteps: [],
  pyramidsExecMax:  4.0,
  hasTosses:        false,
  tossDiffOpts:     [],
  tossesExecMax:    2.0,
};

const NOVICE_PLUS_BUILDING: BuildingConfig = {
  ...MINI_NOVICE_BUILDING,
};

// ── Tumbling configs ──────────────────────────────────────────────────────────

const ELITE_TUMBLING: TumblingConfig = {
  hasStanding:      true,
  standingHasDiff:  true,
  standingRango:    ELITE_TUMBLING_RANGO,
  standingHabilidad: ELITE_HABILIDAD,
  standingExecMax:  4.0,
  hasRunning:       true,
  runningHasDiff:   true,
  runningRango:     ELITE_TUMBLING_RANGO,
  runningHabilidad: ELITE_HABILIDAD,
  runningExecMax:   4.0,
  hasJumps:         true,
  jumpsHasDiff:     true,
  jumpsDiffOpts:    ELITE_JUMPS,
  jumpsExecMax:     2.0,
};

const PREP_TUMBLING: TumblingConfig = {
  hasStanding:      true,
  standingHasDiff:  true,
  standingRango:    PREP_TUMBLING_RANGO,
  standingHabilidad: PREP_HABILIDAD,
  standingExecMax:  4.0,
  hasRunning:       true,
  runningHasDiff:   true,
  runningRango:     PREP_TUMBLING_RANGO,
  runningHabilidad: PREP_HABILIDAD,
  runningExecMax:   4.0,
  hasJumps:         true,
  jumpsHasDiff:     true,
  jumpsDiffOpts:    PREP_JUMPS,
  jumpsExecMax:     2.0,
};

const MINI_NOVICE_TUMBLING: TumblingConfig = {
  hasStanding:      false,
  standingHasDiff:  false,
  standingRango:    [],
  standingHabilidad: [],
  standingExecMax:  4.0,
  hasRunning:       false,
  runningHasDiff:   false,
  runningRango:     [],
  runningHabilidad: [],
  runningExecMax:   4.0,
  hasJumps:         true,
  jumpsHasDiff:     false,
  jumpsDiffOpts:    [],
  jumpsExecMax:     2.0,
};

const NOVICE_PLUS_TUMBLING: TumblingConfig = {
  hasStanding:      true,
  standingHasDiff:  false,
  standingRango:    [],
  standingHabilidad: [],
  standingExecMax:  4.0,
  hasRunning:       true,
  runningHasDiff:   false,
  runningRango:     [],
  runningHabilidad: [],
  runningExecMax:   4.0,
  hasJumps:         true,
  jumpsHasDiff:     false,
  jumpsDiffOpts:    [],
  jumpsExecMax:     2.0,
};

// ── Config map ────────────────────────────────────────────────────────────────

interface ScoringConfig {
  building: BuildingConfig;
  tumbling: TumblingConfig;
}

const CONFIGS: Record<ScoringSystem, ScoringConfig> = {
  elite_l1:      { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  elite_l2_7:    { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  elite_nt:      { building: ELITE_BUILDING,        tumbling: { ...ELITE_TUMBLING, hasStanding: false, hasRunning: false } },
  prep:          { building: PREP_BUILDING,         tumbling: PREP_TUMBLING },
  tiny_novice:   { building: TINY_NOVICE_BUILDING,  tumbling: MINI_NOVICE_TUMBLING },
  mini_novice:   { building: MINI_NOVICE_BUILDING,  tumbling: MINI_NOVICE_TUMBLING },
  novice_plus:   { building: NOVICE_PLUS_BUILDING,  tumbling: NOVICE_PLUS_TUMBLING },
  // IASF L6-L7: same scoring structure as Elite for our purposes
  iasf_l6_7:    { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  // Partner stunt has a completely different page, use elite as safe fallback
  partner_stunt: { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
};

export function getScoringConfig(division: Division): ScoringConfig {
  const sys = (division.scoring_system || division.suggested_scoring_system) as ScoringSystem;
  return CONFIGS[sys] ?? CONFIGS['elite_l2_7'];
}

export function getEffectiveScoringSystem(division: Division): ScoringSystem {
  return (division.scoring_system || division.suggested_scoring_system) as ScoringSystem;
}

export const DEFAULT_BUILDING_CONFIG: BuildingConfig = ELITE_BUILDING;
export const DEFAULT_TUMBLING_CONFIG: TumblingConfig = ELITE_TUMBLING;
