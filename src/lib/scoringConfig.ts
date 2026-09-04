import type { ScoringSystem, Division, DivisionCategory } from '@/types/competitions';

// ── Primitive option types ────────────────────────────────────────────────────
export interface RangoOpt  { value: number; label: string; note?: string; skillCount?: number }
export interface PyramidRangoOpt { low: number; high: number; label: string }

// ── Building config ───────────────────────────────────────────────────────────
export interface BuildingConfig {
  // Stunts
  hasStunts:            boolean;   // false → Tiny Novice (N/A)
  stuntsHasDiff:        boolean;   // false → Novice / Novice Plus (exec-only)
  stuntsRango:              RangoOpt[];
  stuntsRangoByCategory?:   Partial<Record<DivisionCategory, RangoOpt[]>>;
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
  pyramidDriversOpts:   RangoOpt[];  // non-empty only for escolar_ab
  // Tosses
  hasTosses:            boolean;
  tossDiffOpts:         RangoOpt[];
  tossesExecMax:        number;
  // Cross-sheet
  hasCreativity:        boolean;   // false for escolar_ab (cheer only)
  showmanshipMax:       number;    // 2.0 standard, 5.0 for escolar_ab
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
  // escolar_ab: standing section represents combined Standing+Running
  isCombinedSR:         boolean;
  // Cross-sheet
  hasCreativity:        boolean;
  showmanshipMax:       number;
}

// ── Shared option sets ────────────────────────────────────────────────────────

const ELITE_STUNT_RANGO: RangoOpt[] = [
  { value: 3.5, label: 'No cumple con 4.0',     skillCount: 0 },
  { value: 4.0, label: '4 Acumulativas',         skillCount: 4 },
  { value: 4.5, label: '2 Habilidades Diferentes', skillCount: 2 },
  { value: 5.0, label: '3 Habilidades Diferentes', skillCount: 3 },
  { value: 5.5, label: '4 Habilidades Diferentes', skillCount: 4 },
  { value: 6.0, label: '5 Habilidades Diferentes', skillCount: 5 },
];

// All Girl: el 6.0 requiere además al menos 1 habilidad de ≥Nivel 3
const ELITE_STUNT_RANGO_ALL_GIRL: RangoOpt[] = [
  { value: 3.5, label: 'No cumple con 4.0',       skillCount: 0 },
  { value: 4.0, label: '4 Acumulativas',           skillCount: 4 },
  { value: 4.5, label: '2 Habilidades Diferentes', skillCount: 2 },
  { value: 5.0, label: '3 Habilidades Diferentes', skillCount: 3 },
  { value: 5.5, label: '4 Habilidades Diferentes', skillCount: 4 },
  { value: 6.0, label: '5 Hab Dif / 1 Hab ≥Niv 3', skillCount: 5 },
];

// All Male: tabla general, sin requisito adicional en 6.0
const ELITE_STUNT_RANGO_ALL_MALE: RangoOpt[] = ELITE_STUNT_RANGO;

// Coed: el 6.0 requiere además al menos 1 habilidad Coed simultánea
const ELITE_STUNT_RANGO_COED: RangoOpt[] = [
  { value: 3.5, label: 'No cumple con 4.0',       skillCount: 0 },
  { value: 4.0, label: '4 Acumulativas',           skillCount: 4 },
  { value: 4.5, label: '2 Habilidades Diferentes', skillCount: 2 },
  { value: 5.0, label: '3 Habilidades Diferentes', skillCount: 3 },
  { value: 5.5, label: '4 Habilidades Diferentes', skillCount: 4 },
  { value: 6.0, label: '5 Hab Dif / 1 Hab Coed',  skillCount: 5 },
];

// Non-Tumbling: tabla general, sin requisito adicional en 6.0
const ELITE_STUNT_RANGO_NON_TUMBLING: RangoOpt[] = ELITE_STUNT_RANGO;

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

// Escolar (shared with old Prep — kept for CONFIGS['escolar'])
const PREP_STUNT_RANGO: RangoOpt[] = [
  { value: 2.5, label: 'No cumple con 3.0',                      skillCount: 0 },
  { value: 3.0, label: '4 Hab Dif por Gran Parte (Acumulativas)', skillCount: 3 },
  { value: 3.5, label: '2 Hab Dif Simultáneas por Gran Parte',    skillCount: 2 },
  { value: 4.0, label: '3 Hab Dif Simultáneas por Gran Parte',    skillCount: 3 },
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

// All Star Prep FECU 2026 — stunts rango 8.5–10.0, pyramids rango 10.0–13.0
const PREP_2026_STUNT_RANGO: RangoOpt[] = [
  { value:  8.5, label: 'No cumple con 9.0',                    skillCount: 0 },
  { value:  9.0, label: '4 Hab Dif por Gran Parte',             skillCount: 4 },
  { value:  9.5, label: '2 Hab Dif Simultáneas por Gran Parte', skillCount: 2 },
  { value: 10.0, label: '3 Hab Dif Simultáneas por Gran Parte', skillCount: 3 },
];

const PREP_2026_PART_MAX: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 1.0, label: 'Nivel × MÁX ó Avanzada × Gran Parte' },
];

const PREP_2026_PYRAMID_RANGO: PyramidRangoOpt[] = [
  { low: 10.0, high: 11.0, label: 'Inferior: No cumple con 11.0' },
  { low: 11.0, high: 12.0, label: 'Bajo: 2 Hab Dif + 2 Estructuras' },
  { low: 12.0, high: 13.0, label: 'Medio: 3 Hab Dif + 2 Estructuras × Gran Parte' },
];

const PREP_2026_TUMBLING_RANGO: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'MAYORÍA: 1 pase del nivel' },
  { value: 1.5, label: 'GRAN PARTE: 1 pase del nivel' },
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

// ── Escolar AB (Adventure Brands) option sets ─────────────────────────────────

const ESCOLAR_AB_STUNT_RANGO: RangoOpt[] = [
  { value: 2.0, label: 'No cumple con 2.5',                      skillCount: 0 },
  { value: 2.5, label: '4 Hab Dif por Gran Parte (Acumulativas)', skillCount: 4 },
  { value: 3.0, label: '2 Hab Dif Simultáneas por Gran Parte',    skillCount: 2 },
  { value: 3.5, label: '3 Hab Dif Simultáneas por Gran Parte',    skillCount: 3 },
  { value: 3.7, label: '4+ Hab Dif Simultáneas por Gran Parte',   skillCount: 4 },
];

// Binary drivers: met the level or not (0 or 0.3)
const ESCOLAR_AB_DRIVERS: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.3, label: 'Del Nivel' },
];

const ESCOLAR_AB_PYRAMID_RANGO: PyramidRangoOpt[] = [
  { low: 2.0, high: 2.5, label: 'Inferior: No cumple con el Rango Bajo' },
  { low: 2.5, high: 3.0, label: 'Bajo: 2 Hab Dif + 2 Estructuras' },
  { low: 3.0, high: 3.5, label: 'Medio: 3 Hab Dif + 2 Estructuras x Gran Parte' },
];

// Combined Standing/Running rango (max diff 3.7, uses standing_* fields)
const ESCOLAR_AB_SR_RANGO: RangoOpt[] = [
  { value: 1.5, label: 'No cumple con 2.0' },
  { value: 2.0, label: 'MAYORÍA: pase del nivel (estático)' },
  { value: 2.5, label: 'GRAN PARTE: pase del nivel (estático)' },
  { value: 3.0, label: 'MAYORÍA: pases del nivel (estático + carrera)' },
  { value: 3.5, label: 'GRAN PARTE: pases del nivel (estático + carrera)' },
  { value: 3.7, label: 'MÁX: avanzado — estático + carrera (sincronizados)' },
];

const ESCOLAR_AB_JUMPS_DIFF: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'GRAN PARTE: salto avanzado del nivel' },
];

// ── International Elite 2026 option sets ─────────────────────────────────────

const INTL_STUNT_RANGO: RangoOpt[] = [
  { value:  8.5, label: 'No cumple con 9.0',                     skillCount: 0 },
  { value:  9.0, label: '4 Hab Dif por Gran Parte',              skillCount: 4 },
  { value:  9.5, label: '2 Hab Dif Simultáneas por Gran Parte',  skillCount: 2 },
  { value: 10.0, label: '3 Hab Dif Simultáneas por Gran Parte',  skillCount: 3 },
  { value: 10.5, label: '4 Hab Dif Simultáneas por Gran Parte',  skillCount: 4 },
  { value: 11.0, label: '5 Hab Dif Simultáneas por Gran Parte',  skillCount: 5 },
];

const INTL_STUNT_RANGO_COED: RangoOpt[] = [
  { value:  8.5, label: 'No cumple con 9.0',                         skillCount: 0 },
  { value:  9.0, label: '4 Hab Dif por Gran Parte',                  skillCount: 4 },
  { value:  9.5, label: '2 Hab Dif Simultáneas por Gran Parte',      skillCount: 2 },
  { value: 10.0, label: '3 Hab Dif Simultáneas por Gran Parte',      skillCount: 3 },
  { value: 10.5, label: '4 Hab Dif Simultáneas por Gran Parte',      skillCount: 4 },
  { value: 11.0, label: '4 Hab Dif + 1 Estilo Coed por Gran Parte',  skillCount: 5 },
];

const INTL_SKILL_GRADES: RangoOpt[] = [
  { value: 0.00, label: 'No Cumple' },
  { value: 0.30, label: 'Avanzada' },
  { value: 0.50, label: 'Élite' },
];

const INTL_PART_MAX: RangoOpt[] = [
  { value: 0.0, label: 'No Cumple' },
  { value: 0.5, label: 'Nivel x MÁX · Avz x GRAN PARTE' },
  { value: 1.0, label: 'Avz x MÁX · Élite x GRAN PARTE' },
  { value: 1.5, label: 'Élite x MÁX' },
];

const INTL_PYRAMID_RANGO: PyramidRangoOpt[] = [
  { low: 10.0, high: 11.0, label: 'No cumple con 11.0' },
  { low: 11.0, high: 12.0, label: '2 Hab Dif + 2 Estructuras' },
  { low: 12.0, high: 13.0, label: '3 Hab Dif + 2 Estructuras x Gran Parte' },
  { low: 13.0, high: 14.0, label: '4 Hab Dif + 2 Estructuras x Gran Parte' },
  { low: 14.0, high: 15.0, label: '5 Hab Dif + 2 Estructuras x Gran Parte' },
];

// INTL_TOSS_DIFF: same labels/values as ELITE_TOSS_DIFF
const INTL_TUMBLING_RANGO: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'MAYORÍA: 1 pase del nivel' },
  { value: 1.5, label: 'GRAN PARTE: 1 pase del nivel' },
];

// INTL_HABILIDAD: same labels/values as ELITE_HABILIDAD
const INTL_JUMPS: RangoOpt[] = [
  { value: 0.5, label: 'No cumple con 1.0' },
  { value: 1.0, label: 'GRAN PARTE: 1 Salto Avanzado' },
  { value: 1.5, label: 'GRAN PARTE: 2 Conectados + Variedad' },
  { value: 2.0, label: 'MÁX: 3 Conectados ó 2+1 (variedad)' },
];

const INTL_PYRAMID_FINE_STEPS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5];

// ── Building configs ──────────────────────────────────────────────────────────

const ELITE_BUILDING: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      true,
  stuntsRango:        ELITE_STUNT_RANGO,
  stuntsRangoByCategory: {
    all_girl:     ELITE_STUNT_RANGO_ALL_GIRL,
    all_male:     ELITE_STUNT_RANGO_ALL_MALE,
    coed:         ELITE_STUNT_RANGO_COED,
    non_tumbling: ELITE_STUNT_RANGO_NON_TUMBLING,
  },
  stuntsSkillCount:   5,
  stuntsSkillGrades:  ELITE_SKILL_GRADES,
  stuntsPartMaxOpts:  ELITE_PART_MAX,
  stuntsExecMax:      4.0,
  hasPyramids:        true,
  pyramidsHasDiff:    true,
  pyramidRango:       ELITE_PYRAMID_RANGO,
  pyramidFineSteps:   PYRAMID_FINE_STEPS,
  pyramidsExecMax:    4.0,
  pyramidDriversOpts: [],
  hasTosses:          true,
  tossDiffOpts:       ELITE_TOSS_DIFF,
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     2.0,
};

const PREP_BUILDING: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      true,
  stuntsRango:        PREP_STUNT_RANGO,
  stuntsSkillCount:   3,
  stuntsSkillGrades:  PREP_SKILL_GRADES,
  stuntsPartMaxOpts:  PREP_PART_MAX,
  stuntsExecMax:      4.0,
  hasPyramids:        true,
  pyramidsHasDiff:    true,
  pyramidRango:       PREP_PYRAMID_RANGO,
  pyramidFineSteps:   PYRAMID_FINE_STEPS,
  pyramidsExecMax:    4.0,
  pyramidDriversOpts: [],
  hasTosses:          false,
  tossDiffOpts:       [],
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     2.0,
};

const MINI_NOVICE_BUILDING: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      false,
  stuntsRango:        [],
  stuntsSkillCount:   0,
  stuntsSkillGrades:  [],
  stuntsPartMaxOpts:  [],
  stuntsExecMax:      4.0,
  hasPyramids:        true,
  pyramidsHasDiff:    false,
  pyramidRango:       [],
  pyramidFineSteps:   [],
  pyramidsExecMax:    4.0,
  pyramidDriversOpts: [],
  hasTosses:          false,
  tossDiffOpts:       [],
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     2.0,
};

const TINY_NOVICE_BUILDING: BuildingConfig = {
  hasStunts:          false,
  stuntsHasDiff:      false,
  stuntsRango:        [],
  stuntsSkillCount:   0,
  stuntsSkillGrades:  [],
  stuntsPartMaxOpts:  [],
  stuntsExecMax:      4.0,
  hasPyramids:        false,
  pyramidsHasDiff:    false,
  pyramidRango:       [],
  pyramidFineSteps:   [],
  pyramidsExecMax:    4.0,
  pyramidDriversOpts: [],
  hasTosses:          false,
  tossDiffOpts:       [],
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     2.0,
};

const NOVICE_PLUS_BUILDING: BuildingConfig = { ...MINI_NOVICE_BUILDING };

const ESCOLAR_AB_BUILDING: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      true,
  stuntsRango:        ESCOLAR_AB_STUNT_RANGO,
  stuntsSkillCount:   0,
  stuntsSkillGrades:  [],
  stuntsPartMaxOpts:  ESCOLAR_AB_DRIVERS,
  stuntsExecMax:      4.0,
  hasPyramids:        true,
  pyramidsHasDiff:    true,
  pyramidRango:       ESCOLAR_AB_PYRAMID_RANGO,
  pyramidFineSteps:   PYRAMID_FINE_STEPS,
  pyramidsExecMax:    4.0,
  pyramidDriversOpts: ESCOLAR_AB_DRIVERS,
  hasTosses:          false,
  tossDiffOpts:       [],
  tossesExecMax:      2.0,
  hasCreativity:      false,
  showmanshipMax:     5.0,
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
  isCombinedSR:     false,
  hasCreativity:    true,
  showmanshipMax:   2.0,
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
  isCombinedSR:     false,
  hasCreativity:    true,
  showmanshipMax:   2.0,
};

// All Star Prep FECU 2026 — raw max 91.5, same overall/cross sheet behavior as INTL
const PREP_BUILDING_2026: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      true,
  stuntsRango:        PREP_2026_STUNT_RANGO,
  stuntsSkillCount:   3,
  stuntsSkillGrades:  INTL_SKILL_GRADES,   // 0 / 0.3 / 0.5 per skill
  stuntsPartMaxOpts:  PREP_2026_PART_MAX,
  stuntsExecMax:      15.0,
  hasPyramids:        true,
  pyramidsHasDiff:    true,
  pyramidRango:       PREP_2026_PYRAMID_RANGO,
  pyramidFineSteps:   INTL_PYRAMID_FINE_STEPS,
  pyramidsExecMax:    15.0,
  pyramidDriversOpts: [],
  hasTosses:          false,
  tossDiffOpts:       [],
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     5.0,
};

const PREP_TUMBLING_2026: TumblingConfig = {
  hasStanding:       true,
  standingHasDiff:   true,
  standingRango:     PREP_2026_TUMBLING_RANGO,
  standingHabilidad: PREP_HABILIDAD,   // [0.0, 0.3, 0.5] — unchanged
  standingExecMax:   2.0,
  hasRunning:        true,
  runningHasDiff:    true,
  runningRango:      PREP_2026_TUMBLING_RANGO,
  runningHabilidad:  PREP_HABILIDAD,
  runningExecMax:    2.0,
  hasJumps:          true,
  jumpsHasDiff:      true,
  jumpsDiffOpts:     PREP_JUMPS,   // [0.5, 1.0, 1.5, 2.0] — correct per PDF
  jumpsExecMax:      2.0,
  isCombinedSR:      false,
  hasCreativity:     true,
  showmanshipMax:    5.0,
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
  isCombinedSR:     false,
  hasCreativity:    true,
  showmanshipMax:   2.0,
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
  isCombinedSR:     false,
  hasCreativity:    true,
  showmanshipMax:   2.0,
};

// Combined Standing/Running — uses standing_* fields only; running section hidden
const ESCOLAR_AB_TUMBLING: TumblingConfig = {
  hasStanding:      true,
  standingHasDiff:  true,
  standingRango:    ESCOLAR_AB_SR_RANGO,
  standingHabilidad: ESCOLAR_AB_DRIVERS,   // binary 0 or 0.3 → standing_drivers
  standingExecMax:  4.0,
  hasRunning:       false,
  runningHasDiff:   false,
  runningRango:     [],
  runningHabilidad: [],
  runningExecMax:   4.0,
  hasJumps:         true,
  jumpsHasDiff:     true,
  jumpsDiffOpts:    ESCOLAR_AB_JUMPS_DIFF,
  jumpsExecMax:     2.0,
  isCombinedSR:     true,
  hasCreativity:    false,
  showmanshipMax:   5.0,
};

const INTL_BUILDING: BuildingConfig = {
  hasStunts:          true,
  stuntsHasDiff:      true,
  stuntsRango:        INTL_STUNT_RANGO,
  stuntsRangoByCategory: {
    all_girl:     INTL_STUNT_RANGO,
    all_male:     INTL_STUNT_RANGO,
    coed:         INTL_STUNT_RANGO_COED,
    non_tumbling: INTL_STUNT_RANGO,
  },
  stuntsSkillCount:   5,
  stuntsSkillGrades:  INTL_SKILL_GRADES,
  stuntsPartMaxOpts:  INTL_PART_MAX,
  stuntsExecMax:      15.0,
  hasPyramids:        true,
  pyramidsHasDiff:    true,
  pyramidRango:       INTL_PYRAMID_RANGO,
  pyramidFineSteps:   INTL_PYRAMID_FINE_STEPS,
  pyramidsExecMax:    15.0,
  pyramidDriversOpts: [],
  hasTosses:          true,
  tossDiffOpts:       ELITE_TOSS_DIFF,
  tossesExecMax:      2.0,
  hasCreativity:      true,
  showmanshipMax:     5.0,
};

const INTL_TUMBLING: TumblingConfig = {
  hasStanding:       true,
  standingHasDiff:   true,
  standingRango:     INTL_TUMBLING_RANGO,
  standingHabilidad: ELITE_HABILIDAD,
  standingExecMax:   2.0,
  hasRunning:        true,
  runningHasDiff:    true,
  runningRango:      INTL_TUMBLING_RANGO,
  runningHabilidad:  ELITE_HABILIDAD,
  runningExecMax:    2.0,
  hasJumps:          true,
  jumpsHasDiff:      true,
  jumpsDiffOpts:     INTL_JUMPS,
  jumpsExecMax:      2.0,
  isCombinedSR:      false,
  hasCreativity:     true,
  showmanshipMax:    5.0,
};

// ── Config map ────────────────────────────────────────────────────────────────

interface ScoringConfig {
  building: BuildingConfig;
  tumbling: TumblingConfig;
}

const CONFIGS: Record<ScoringSystem, ScoringConfig> = {
  elite_l1:      { building: { ...ELITE_BUILDING, hasTosses: false }, tumbling: ELITE_TUMBLING },
  elite_l2_7:    { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  elite_nt:      { building: ELITE_BUILDING,        tumbling: { ...ELITE_TUMBLING, hasStanding: false, hasRunning: false } },
  prep:          { building: PREP_BUILDING_2026,     tumbling: PREP_TUMBLING_2026 },
  escolar:       { building: PREP_BUILDING_2026,    tumbling: PREP_TUMBLING_2026 },
  escolar_ab:    { building: ESCOLAR_AB_BUILDING,   tumbling: ESCOLAR_AB_TUMBLING },
  tiny_novice:   { building: TINY_NOVICE_BUILDING,  tumbling: MINI_NOVICE_TUMBLING },
  mini_novice:   { building: MINI_NOVICE_BUILDING,  tumbling: MINI_NOVICE_TUMBLING },
  novice_plus:   { building: NOVICE_PLUS_BUILDING,  tumbling: NOVICE_PLUS_TUMBLING },
  // IASF L6-L7: same UCA scoring structure as Elite for our purposes
  iasf_l6_7:      { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  // International Elite 2026: FECU Ecuador — new scoring scale per INTL_FULL_FIELD_MAXIMA
  intl_l1:         { building: { ...INTL_BUILDING, hasTosses: false }, tumbling: INTL_TUMBLING },
  intl_l2_7:       { building: INTL_BUILDING,                          tumbling: INTL_TUMBLING },
  intl_nt:         { building: INTL_BUILDING,                          tumbling: { ...INTL_TUMBLING, hasStanding: false, hasRunning: false } },
  // IASF World has dedicated slider-based pages; use elite as fallback for modal
  iasf_world_l6_7: { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  // Partner stunt has a completely different page, use elite as safe fallback
  partner_stunt:   { building: ELITE_BUILDING,        tumbling: ELITE_TUMBLING },
  // ICU Dance has dedicated pages; use elite as safe fallback for modal
  icu_dance:                { building: ELITE_BUILDING, tumbling: ELITE_TUMBLING },
  icu_doubles:              { building: ELITE_BUILDING, tumbling: ELITE_TUMBLING },
  icu_dance_solo:           { building: ELITE_BUILDING, tumbling: ELITE_TUMBLING },
  icu_dance_principiantes:  { building: ELITE_BUILDING, tumbling: ELITE_TUMBLING },
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
