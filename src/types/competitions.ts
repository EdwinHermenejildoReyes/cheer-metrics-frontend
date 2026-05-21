export type SheetType =
  | 'building' | 'tumbling' | 'rangos' | 'overall' | 'partner_stunt' | 'deducciones';

export const SHEET_TYPE_LABELS: Record<SheetType, string> = {
  building:      'Building (Elevaciones)',
  tumbling:      'Tumbling (Gimnasia)',
  rangos:        'Rangos (Dificultad)',
  overall:       'Overall (General)',
  partner_stunt: 'Partner Stunt',
  deducciones:   'Deducciones',
};

export interface JudgeAssignment {
  id: number;
  user: number;
  user_name: string;
  competition: number;
  competition_name: string;
  competition_date: string;
  sheet_type: SheetType;
}

export type Regulation = 'UCA' | 'IASF' | 'ICU';
export type AgeGroup = 'tiny' | 'mini' | 'youth' | 'junior' | 'senior' | 'open';
export type SkillLevel =
  | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7'
  | 'novice' | 'novice_plus' | 'prep' | 'escolar' | 'elite' | 'icc' | 'iasf_cat' | 'star';
export type DivisionCategory = 'all_girl' | 'coed' | 'all_male' | 'non_tumbling';
export type RegistrationStatus = 'pending' | 'confirmed' | 'withdrawn';

// Deduction codes matching the Level Up / Adventure Brands United system
export type DeductionType =
  | 'x' | 'ca' | 'csa' | 'ec' | 'cc' | 'csc'
  | 'tiempo'
  | 'pi' | 'eap' | 'rg' | 'gfn' | 'bfn' | 'seg';

export type ScoringSystem =
  | 'tiny_novice' | 'mini_novice' | 'novice_plus' | 'prep'
  | 'elite_l1' | 'elite_l2_7' | 'elite_nt' | 'partner_stunt' | 'iasf_l6_7';

// Keys of all sub-score fields on ScoreSheet
export type ScoreFieldKey =
  | 'stunts_difficulty' | 'stunts_execution' | 'stunts_drivers'
  | 'pyramids_difficulty' | 'pyramids_execution'
  | 'tosses_difficulty' | 'tosses_execution'
  | 'standing_difficulty' | 'standing_execution' | 'standing_drivers'
  | 'running_difficulty' | 'running_execution' | 'running_drivers'
  | 'jumps_difficulty' | 'jumps_execution'
  | 'formations_score' | 'dance_difficulty' | 'dance_execution'
  | 'creativity_building' | 'creativity_tumbling' | 'creativity_overall'
  | 'showmanship_building' | 'showmanship_tumbling' | 'showmanship_overall'
  | 'pg_technique' | 'pg_difficulty' | 'pg_form_appearance'
  | 'pg_transitions' | 'pg_expressiveness';

export interface Organization {
  id: number;
  name: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_on_primary: string;
  is_enable: boolean;
}

export interface Competition {
  id: number;
  organization: number | null;
  organization_detail: Organization | null;
  name: string;
  date: string;
  venue: string;
  city: string;
  regulation: Regulation;
  notes: string;
  is_enable: boolean;
}

export interface Division {
  id: number;
  competition: number;
  competition_name: string;
  name: string;
  age_group: AgeGroup;
  skill_level: SkillLevel;
  category: DivisionCategory;
  scoring_system: ScoringSystem | '';
  suggested_scoring_system: ScoringSystem;
  min_athletes: number | null;
  max_athletes: number | null;
  is_enable: boolean;
}

export interface Gym {
  id: number;
  name: string;
  city: string;
  country: string;
  is_enable: boolean;
  teams: Team[];
}

export interface Team {
  id: number;
  gym: number;
  gym_name: string;
  name: string;
  is_enable: boolean;
}

export interface Registration {
  id: number;
  division: number;
  division_name: string;
  competition_name: string;
  team: number;
  team_name: string;
  gym_name: string;
  status: RegistrationStatus;
  performance_order: number | null;
  is_enable: boolean;
}

export interface Deduction {
  id: number;
  score_sheet: number;
  deduction_type: DeductionType;
  deduction_type_display: string;
  count: number;
  unit_amount: string;
  total_amount: string;
  routine_time: string;
  hit_zero: boolean;
  notes: string;
}

export interface ScoreSheet {
  id: number;
  registration: number;
  team_name: string;
  division_name: string;
  scoring_system: ScoringSystem | '';
  notes: string;
  // Sheet A – Building
  stunts_difficulty:    string | null;
  stunts_execution:     string | null;
  stunts_drivers:       string | null;
  pyramids_difficulty:  string | null;
  pyramids_execution:   string | null;
  tosses_difficulty:    string | null;
  tosses_execution:     string | null;
  // Sheet B – Tumbling
  standing_difficulty:  string | null;
  standing_execution:   string | null;
  standing_drivers:     string | null;
  running_difficulty:   string | null;
  running_execution:    string | null;
  running_drivers:      string | null;
  jumps_difficulty:     string | null;
  jumps_execution:      string | null;
  // Sheet C – Overall
  formations_score:     string | null;
  dance_difficulty:     string | null;
  dance_execution:      string | null;
  // Cross-sheet (per judge)
  creativity_building:  string | null;
  creativity_tumbling:  string | null;
  creativity_overall:   string | null;
  showmanship_building: string | null;
  showmanship_tumbling: string | null;
  showmanship_overall:  string | null;
  // Partner Stunt
  pg_technique:         string | null;
  pg_difficulty:        string | null;
  pg_form_appearance:   string | null;
  pg_transitions:       string | null;
  pg_expressiveness:    string | null;
  // Computed totals (read-only)
  building_total:       string;
  tumbling_total:       string;
  overall_total:        string;
  avg_creativity:       string;
  avg_showmanship:      string;
  cross_sheet_total:    string;
  partner_stunt_total:  string;
  raw_score:            string;
  max_raw:              string;
  scaled_score:         string;
  deductions:           Deduction[];
  total_deductions:     string;
  final_score:          string;
  percentage:           string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Display labels ─────────────────────────────────────────────────────────────

export const REGULATION_LABELS: Record<Regulation, string> = {
  UCA: 'UCA', IASF: 'IASF', ICU: 'ICU',
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  tiny:   'Tiny (4–6)',
  mini:   'Mini (5–9)',
  youth:  'Youth (8–12)',
  junior: 'Junior (9–16)',
  senior: 'Senior (12–19)',
  open:   'Open (12+)',
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  L1: 'Level 1', L2: 'Level 2', L3: 'Level 3', L4: 'Level 4',
  L5: 'Level 5', L6: 'Level 6', L7: 'Level 7',
  novice: 'All Star Novice', novice_plus: 'Novice Plus',
  prep: 'Prep', escolar: 'Escolar', elite: 'Elite',
  icc: 'ICC', iasf_cat: 'IASF', star: 'Star',
};

export const CATEGORY_LABELS: Record<DivisionCategory, string> = {
  all_girl: 'All Girl', coed: 'Coed', all_male: 'All Male', non_tumbling: 'Non-Tumbling',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', withdrawn: 'Retirada',
};

// Deduction labels — format: "CODE  Description"
export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  x:      'Salida de superficie',
  ca:     'Caída de atleta',
  csa:    'Caída seria de atleta',
  ec:     'Error de construcción',
  cc:     'Caída de construcción',
  csc:    'Caída seria de construcción',
  tiempo: 'Exceso de tiempo',
  pi:     'Política de imagen',
  eap:    'Estándares atléticos de presentación',
  rg:     'Reglas generales',
  gfn:    'Gimnasia fuera del nivel',
  bfn:    'Acrobacia fuera del nivel',
  seg:    'Infracción de seguridad',
};

export const DEDUCTION_CODES: Record<DeductionType, string> = {
  x: 'X', ca: 'CA', csa: 'CSA', ec: 'EC', cc: 'CC', csc: 'CSC',
  tiempo: 'TIEMPO', pi: 'PI', eap: 'EAP', rg: 'RG', gfn: 'GFN', bfn: 'BFN', seg: 'SEG',
};

export const DEDUCTION_AMOUNTS: Record<DeductionType, string> = {
  x:      '0.05',
  ca:     '0.15',
  csa:    '0.15',
  ec:     '0.25',
  cc:     '0.75',
  csc:    '1.25',
  tiempo: '0.05',
  pi:     '0.01',
  eap:    '0.25',
  rg:     '0.05',
  gfn:    '0.05',
  bfn:    '0.10',
  seg:    '0.50',
};

export const SCORING_SYSTEM_LABELS: Record<ScoringSystem, string> = {
  tiny_novice:   'Tiny & All Star Novice',
  mini_novice:   'Mini Novice',
  novice_plus:   'Novice Plus',
  prep:          'Prep / Escolar',
  elite_l1:      'Elite Nivel 1',
  elite_l2_7:    'Elite Nivel 2–7',
  elite_nt:      'Elite Non-Tumbling',
  partner_stunt: 'Partner Stunt',
  iasf_l6_7:     'IASF Nivel 6–7',
};

// Active score fields per scoring system (mirrors backend SCORING_SYSTEM_CONFIG)
const _BUILDING_BASE: ScoreFieldKey[] = [
  'stunts_difficulty', 'stunts_execution', 'stunts_drivers',
  'pyramids_difficulty', 'pyramids_execution',
];
const _TOSSES: ScoreFieldKey[]       = ['tosses_difficulty', 'tosses_execution'];
const _TUMBLING_BASE: ScoreFieldKey[] = ['standing_difficulty', 'standing_execution'];
const _TUMBLING_FULL: ScoreFieldKey[] = [
  'standing_difficulty', 'standing_execution', 'standing_drivers',
  'running_difficulty',  'running_execution',  'running_drivers',
];
const _JUMPS: ScoreFieldKey[]   = ['jumps_difficulty', 'jumps_execution'];
const _OVERALL: ScoreFieldKey[] = ['formations_score', 'dance_difficulty', 'dance_execution'];
const _CROSS: ScoreFieldKey[]   = [
  'creativity_building', 'creativity_tumbling', 'creativity_overall',
  'showmanship_building', 'showmanship_tumbling', 'showmanship_overall',
];
const _PARTNER: ScoreFieldKey[] = [
  'pg_technique', 'pg_difficulty', 'pg_form_appearance', 'pg_transitions', 'pg_expressiveness',
];

export const SCORING_SYSTEM_FIELDS: Record<ScoringSystem, ScoreFieldKey[]> = {
  tiny_novice:   [..._BUILDING_BASE, ..._TUMBLING_BASE, ..._JUMPS, ..._OVERALL, ..._CROSS],
  mini_novice:   [..._BUILDING_BASE, ..._TUMBLING_BASE, 'standing_drivers', ..._JUMPS, ..._OVERALL, ..._CROSS],
  novice_plus:   [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  prep:          [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  elite_l1:      [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  elite_l2_7:    [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  elite_nt:      [..._BUILDING_BASE, ..._TOSSES, ..._JUMPS, ..._OVERALL, ..._CROSS],
  partner_stunt: _PARTNER,
  iasf_l6_7:     [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
};

// Max value per field (used for live totals in the modal)
export const FIELD_MAXIMA: Record<ScoreFieldKey, number> = {
  stunts_difficulty:    6,
  stunts_execution:     4,
  stunts_drivers:       0.5,
  pyramids_difficulty:  5.5,
  pyramids_execution:   4,
  tosses_difficulty:    2,
  tosses_execution:     2,
  standing_difficulty:  2,
  standing_execution:   4,
  standing_drivers:     0.5,
  running_difficulty:   2,
  running_execution:    4,
  running_drivers:      0.5,
  jumps_difficulty:     2,
  jumps_execution:      2,
  formations_score:     2,
  dance_difficulty:     1.5,
  dance_execution:      1.5,
  // per-judge max = 2.0; effective contribution = average → max 2.0
  creativity_building:  2,
  creativity_tumbling:  2,
  creativity_overall:   2,
  showmanship_building: 2,
  showmanship_tumbling: 2,
  showmanship_overall:  2,
  pg_technique:         5,
  pg_difficulty:        5,
  pg_form_appearance:   5,
  pg_transitions:       5,
  pg_expressiveness:    5,
};

// Fields whose contribution to raw_score is averaged across the group, not summed
export const AVG_FIELD_GROUPS: Record<string, ScoreFieldKey[]> = {
  creativity:  ['creativity_building',  'creativity_tumbling',  'creativity_overall'],
  showmanship: ['showmanship_building', 'showmanship_tumbling', 'showmanship_overall'],
};
export const AVG_GROUP_MAX = 2.0;
