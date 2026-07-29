export type SheetType =
  | 'building' | 'tumbling' | 'rangos' | 'overall' | 'partner_stunt' | 'deducciones'
  | 'building_difficulty' | 'building_execution'
  | 'tumbling_difficulty' | 'tumbling_execution'
  | 'deductions_only' | 'safety_rules'
  | 'building_combined' | 'tumbling_combined' | 'deductions_combined';

export const SHEET_TYPE_LABELS: Record<SheetType, string> = {
  building:             'Building',
  tumbling:             'Tumbling',
  rangos:               'Rangos (Dificultad)',
  overall:              'Overall (General)',
  partner_stunt:        'Partner Stunt',
  deducciones:          'Deducciones',
  building_difficulty:  'Building (Dificultad)',
  building_execution:   'Building (Elevaciones)',
  tumbling_difficulty:  'Tumbling (Dificultad)',
  tumbling_execution:   'Tumbling (Ejecución)',
  deductions_only:      'Deducciones (Caídas/Tiempo)',
  safety_rules:         'Reglas y Seguridad',
  building_combined:    'Elevaciones (Dif. + Ejec.)',
  tumbling_combined:    'Gimnasia (Dif. + Ejec.)',
  deductions_combined:  'Reglas y Deducciones',
};

export const SHEET_TYPE_GROUPS: { label: string; types: SheetType[] }[] = [
  { label: 'Building',      types: ['building', 'building_difficulty', 'building_execution'] },
  { label: 'Tumbling',      types: ['tumbling', 'tumbling_difficulty', 'tumbling_execution'] },
  { label: 'Overall',       types: ['overall'] },
  { label: 'Partner Stunt', types: ['partner_stunt'] },
  { label: 'Rangos',        types: ['rangos'] },
  { label: 'Deducciones',   types: ['deducciones', 'deductions_only', 'safety_rules'] },
];

export interface JudgeAssignment {
  id: number;
  user: number;
  user_name: string;
  competition: number;
  competition_public_id: string;
  competition_name: string;
  competition_date: string;
  competition_end_datetime: string | null;
  competition_is_active: boolean;
  sheet_type: SheetType;
  access_from: string | null;
  access_until: string | null;
  is_access_active: boolean;
}

export type SheetMode = 'grupal' | 'individual';
export type ServiceType = 'full' | 'registration_only' | 'judging_only';
export type ScoringFamily =
  | 'united'
  | 'iasf_567'
  | 'icu'
  | 'partner_stunt'
  | 'future_flyer'
  | 'best_cheer';

export const SCORING_FAMILY_LABELS: Record<ScoringFamily, string> = {
  united:        'United',
  iasf_567:      'IASF (N5, N6, N7)',
  icu:           'ICU',
  partner_stunt: 'Partner / Group Stunts',
  future_flyer:  'Future Flyer',
  best_cheer:    'Best Cheerleader',
};

export const SCORING_FAMILY_REGULATION: Record<ScoringFamily, string> = {
  united:        'IASF',
  iasf_567:      'IASF',
  icu:           'ICU',
  partner_stunt: 'IASF',
  future_flyer:  'IASF',
  best_cheer:    'IASF',
};

export const GRUPAL_SHEET_TYPES: SheetType[] = [
  'building', 'tumbling', 'overall', 'rangos', 'deducciones',
];
export const INDIVIDUAL_SHEET_TYPES: SheetType[] = [
  'partner_stunt',
  'building_difficulty', 'building_execution',
  'tumbling_difficulty', 'tumbling_execution',
  'overall',
  'deductions_only', 'safety_rules',
  'rangos',
];

export type Regulation = 'IASF' | 'ICU' | 'AMBAS';
export type AgeGroup = 'tiny' | 'mini' | 'youth' | 'junior' | 'senior' | 'open';
export type SkillLevel =
  | 'L1' | 'L2' | 'L3' | 'L4' | 'L4_2' | 'L5' | 'L6' | 'L7'
  | 'novice' | 'novice_plus' | 'prep' | 'escolar'
  | 'escolar_l3' | 'escolar_l4' | 'escolar_l5' | 'escolar_l6' | 'escolar_l7'
  | 'elite' | 'icc' | 'iasf_cat' | 'star'
  | 'group_stunt' | 'future_flyer' | 'best_cheerleader' | 'paracheer' | 'cheer_parents';
export type DivisionCategory = 'all_girl' | 'coed' | 'all_male' | 'non_tumbling' | 'mixed';
export type RegistrationStatus = 'pending' | 'confirmed' | 'withdrawn';

// Deduction codes matching the Level Up / Adventure Brands United system
export type DeductionType =
  | 'x' | 'ca' | 'csa' | 'ec' | 'cc' | 'csc'
  | 'tiempo' | 'tiempo_grave'
  | 'pi' | 'eap' | 'rg' | 'gfn' | 'bfn' | 'seg'
  | 'ad' | 'div';

export type ScoringSystem =
  | 'tiny_novice' | 'mini_novice' | 'novice_plus' | 'prep' | 'escolar' | 'escolar_ab'
  | 'elite_l1' | 'elite_l2_7' | 'elite_nt' | 'partner_stunt' | 'iasf_l6_7'
  | 'iasf_world_l6_7'
  | 'intl_l1' | 'intl_l2_7' | 'intl_nt';

// Keys of all sub-score fields on ScoreSheet
export type ScoreFieldKey =
  | 'stunts_difficulty' | 'stunts_execution' | 'stunts_drivers'
  | 'pyramids_difficulty' | 'pyramids_execution' | 'pyramids_drivers'
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
  public_id: string;
  organization: number | null;
  organization_detail: Organization | null;
  name: string;
  date: string;
  end_datetime: string | null;
  venue: string;
  city: string;
  scoring_family: ScoringFamily | null;
  regulation: Regulation;
  sheet_mode: SheetMode;
  service_type: ServiceType;
  notes: string;
  is_enable: boolean;
  is_active: boolean;
  team_fee: string;
  multi_team_discount: string;
  require_payment: boolean;
}

export interface Division {
  id: number;
  public_id: string;
  competition: number;
  competition_name: string;
  competition_sheet_mode: 'grupal' | 'individual';
  competition_service_type: ServiceType;
  name: string;
  age_group: AgeGroup;
  skill_level: SkillLevel;
  category: DivisionCategory;
  is_non_tumbling: boolean;
  scoring_system: ScoringSystem | '';
  suggested_scoring_system: ScoringSystem;
  athlete_fee: string;
  min_athletes: number | null;
  max_athletes: number | null;
  is_enable: boolean;
}

export interface Gym {
  id: number;
  public_id: string;
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

export interface UnpaidAthlete {
  athlete_id: number;
  athlete_name: string;
  payment_status: 'partial' | 'pending';
  balance_due: string;
}

export interface Registration {
  id: number;
  public_id: string;
  division: number;
  division_name: string;
  competition_name: string;
  team: number;
  team_name: string;
  gym_name: string;
  status: RegistrationStatus;
  performance_order: number | null;
  athlete_count:      number | null;
  male_athlete_count: number | null;
  panel: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_enable: boolean;
  competition_require_payment: boolean;
  unpaid_athletes: UnpaidAthlete[];
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
  description: string;
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
  pyramids_drivers:     string | null;
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

export interface RankingEntry {
  rank: number | null;
  registration_id: number;
  team_name: string;
  gym_name: string;
  performance_order: number | null;
  status: RegistrationStatus;
  has_score: boolean;
  score_sheet_id: number | null;
  raw_score: string | null;
  scaled_score: string | null;
  total_deductions: string | null;
  final_score: string | null;
  percentage: string | null;
}

export interface DivisionRankings {
  division_id: number;
  division_name: string;
  competition_id: number;
  competition_name: string;
  entries: RankingEntry[];
}

export interface GrandChampionEntry {
  registration_id: number;
  team_name: string;
  gym_name: string;
  division_name: string;
  raw_score: string;
  scaled_score: string;
  total_deductions: string;
  final_score: string;
  percentage: string;
  rank: number;
}

export interface GrandChampionData {
  competition_id: number;
  competition_name: string;
  entries: GrandChampionEntry[];
}

export interface HeroImage {
  id: number;
  image: string;
  order: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Display labels ─────────────────────────────────────────────────────────────

export const REGULATION_LABELS: Record<Regulation, string> = {
  IASF: 'IASF', ICU: 'ICU', AMBAS: 'AMBAS',
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
  L1: 'Level 1', L2: 'Level 2', L3: 'Level 3', L4: 'Level 4', L4_2: 'Level 4.2',
  L5: 'Level 5', L6: 'Level 6', L7: 'Level 7',
  novice: 'All Star Novice', novice_plus: 'Novice Plus',
  escolar_l3: 'Escolar N3', escolar_l4: 'Escolar N4', escolar_l5: 'Escolar N5',
  escolar_l6: 'Escolar N6', escolar_l7: 'Escolar N7',
  prep: 'Prep', escolar: 'Escolar', elite: 'Elite',
  icc: 'ICC', iasf_cat: 'IASF', star: 'Star',
  group_stunt: 'Group Stunt / Partner Stunt',
  future_flyer: 'Future Flyer',
  best_cheerleader: 'Best Cheerleader',
  paracheer: 'Paracheer',
  cheer_parents: 'Padres Showoff',
};

export const CATEGORY_LABELS: Record<DivisionCategory, string> = {
  all_girl: 'All Girl', coed: 'Coed', all_male: 'All Male', non_tumbling: 'Non-Tumbling',
  mixed: 'Mixto',
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: 'Pendiente', confirmed: 'Confirmada', withdrawn: 'Retirada',
};

// Deduction labels — format: "CODE  Description"
export const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  x:           'Salida de superficie',
  ca:          'Caída de atleta',
  csa:         'Caída seria de atleta',
  ec:          'Error de construcción',
  cc:          'Caída de construcción',
  csc:         'Caída seria de construcción',
  tiempo:      'Exceso de tiempo (por segundo)',
  tiempo_grave:'Exceso de tiempo grave (≥10 seg)',
  pi:          'Política de imagen',
  eap:         'Estándares atléticos de presentación',
  rg:          'Reglas generales',
  gfn:         'Gimnasia fuera del nivel',
  bfn:         'Acrobacia fuera del nivel',
  seg:         'Infracción de seguridad',
  ad:          'Actitud antideportiva',
  div:         'Infracción de división',
};

export const DEDUCTION_CODES: Record<DeductionType, string> = {
  x: 'X', ca: 'CA', csa: 'CSA', ec: 'EC', cc: 'CC', csc: 'CSC',
  tiempo: 'TIEMPO', tiempo_grave: 'TIEMPO+',
  pi: 'PI', eap: 'EAP', rg: 'RG', gfn: 'GFN', bfn: 'BFN', seg: 'SEG',
  ad: 'AD', div: 'DIV',
};

export const DEDUCTION_AMOUNTS: Record<DeductionType, string> = {
  x:           '0.05',
  ca:          '0.15',
  csa:         '0.25',
  ec:          '0.25',
  cc:          '0.75',
  csc:         '1.25',
  tiempo:      '0.05',
  tiempo_grave:'1.25',
  pi:          '0.01',
  eap:         '0.25',
  rg:          '0.05',
  gfn:         '0.05',
  bfn:         '0.10',
  seg:         '0.50',
  ad:          '3.00',
  div:         '5.00',
};

export const DEDUCTION_RULE_REFERENCE: Partial<Record<DeductionType, string>> = {
  pi:  'Guía para la Parte Superior del Uniforme IASF',
  eap: 'Estándares Atléticos de Presentación IASF',
  rg:  'Reglas Generales IASF',
  gfn: 'Gimnasia Fuera de Nivel IASF',
  bfn: 'Habilidad de Construcción Fuera de Nivel IASF',
  seg: 'Reglas para Todos los Niveles / Habilidades Restringidas',
  ad:  'Actitud Antideportiva',
  div: 'Infracción de División',
};

export const SCORING_SYSTEM_LABELS: Record<ScoringSystem, string> = {
  tiny_novice:     'Tiny & All Star Novice',
  mini_novice:     'Mini Novice',
  novice_plus:     'Novice Plus',
  prep:            'Prep',
  escolar:         'Escolar',
  escolar_ab:      'Escolar (Adventure Brands)',
  elite_l1:        'Elite Nivel 1',
  elite_l2_7:      'Elite Nivel 2–7',
  elite_nt:        'Elite Non-Tumbling',
  partner_stunt:   'Partner Stunt',
  iasf_l6_7:       'IASF Nivel 6–7',
  iasf_world_l6_7: 'IASF World L6-L7',
  intl_l1:         'Internacional Nivel 1',
  intl_l2_7:       'Internacional Nivel 2–7',
  intl_nt:         'Internacional Non-Tumbling',
};

// Active score fields per scoring system (mirrors backend SCORING_SYSTEM_CONFIG)
const _BUILDING_BASE: ScoreFieldKey[] = [
  'stunts_difficulty', 'stunts_execution', 'stunts_drivers',
  'pyramids_difficulty', 'pyramids_execution',
];
const _BUILDING_BASE_AB: ScoreFieldKey[] = [
  'stunts_difficulty', 'stunts_execution', 'stunts_drivers',
  'pyramids_difficulty', 'pyramids_execution', 'pyramids_drivers',
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
  tiny_novice:   ['jumps_execution', ..._OVERALL, ..._CROSS],
  mini_novice:   ['stunts_execution', 'pyramids_execution', 'jumps_execution', ..._OVERALL, ..._CROSS],
  novice_plus:   ['stunts_execution', 'pyramids_execution', 'standing_execution', 'running_execution', 'jumps_execution', ..._OVERALL, ..._CROSS],
  prep:          [..._BUILDING_BASE, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  escolar:       [..._BUILDING_BASE, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  escolar_ab:    [
    ..._BUILDING_BASE_AB,
    'standing_difficulty', 'standing_execution', 'standing_drivers',
    ..._JUMPS, ..._OVERALL,
    'showmanship_building', 'showmanship_tumbling', 'showmanship_overall',
  ],
  elite_l1:      [..._BUILDING_BASE, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  elite_l2_7:    [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  elite_nt:      [..._BUILDING_BASE, ..._TOSSES, ..._JUMPS, ..._OVERALL, ..._CROSS],
  partner_stunt:   _PARTNER,
  iasf_l6_7:       [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  intl_l1:         [..._BUILDING_BASE, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  intl_l2_7:       [..._BUILDING_BASE, ..._TOSSES, ..._TUMBLING_FULL, ..._JUMPS, ..._OVERALL, ..._CROSS],
  intl_nt:         [..._BUILDING_BASE, ..._TOSSES, ..._JUMPS, ..._OVERALL, ..._CROSS],
  iasf_world_l6_7: [
    'stunts_difficulty', 'stunts_execution',
    'pyramids_difficulty', 'pyramids_execution',
    'tosses_difficulty', 'tosses_execution',
    'standing_difficulty', 'standing_execution',
    'running_difficulty',
    'jumps_difficulty', 'jumps_execution',
    'formations_score',
    'dance_difficulty', 'dance_execution',
    'creativity_overall',
    'showmanship_overall',
  ],
};

// Max value per field (used for live totals in the modal)
export const FIELD_MAXIMA: Record<ScoreFieldKey, number> = {
  stunts_difficulty:    6,
  stunts_execution:     4,
  stunts_drivers:       0.5,
  pyramids_difficulty:  5.5,
  pyramids_execution:   4,
  pyramids_drivers:     0.3,
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
  dance_difficulty:     1,
  dance_execution:      1,
  // per-judge max = 2.0; effective contribution = average → max 2.0
  creativity_building:  2,
  creativity_tumbling:  2,
  creativity_overall:   2,
  showmanship_building: 2,
  showmanship_tumbling: 2,
  showmanship_overall:  2,
  pg_technique:         30,
  pg_difficulty:        25,
  pg_form_appearance:   20,
  pg_transitions:       15,
  pg_expressiveness:    10,
};

// Fields whose contribution to raw_score is averaged across the group, not summed
export const AVG_FIELD_GROUPS: Record<string, ScoreFieldKey[]> = {
  creativity:  ['creativity_building',  'creativity_tumbling',  'creativity_overall'],
  showmanship: ['showmanship_building', 'showmanship_tumbling', 'showmanship_overall'],
};
export const AVG_GROUP_MAX = 2.0;

// ── Billing ───────────────────────────────────────────────────────────────────

export type PaymentStatus = 'paid' | 'partial' | 'pending';

export interface FanPackage {
  id: number;
  competition: number;
  name: string;
  price: string;
  description: string;
  is_enable: boolean;
}

export interface AthleteInvoiceLine {
  id: number;
  invoice: number;
  athlete: number;
  athlete_name: string;
  gross_fee: string;
  discount: string;
  net_fee: string;
  amount_paid: string;
  paid_at: string | null;
  payment_status: PaymentStatus;
  balance_due: string;
}

export interface TeamInvoiceLine {
  id: number;
  invoice: number;
  registration: number;
  team_name: string;
  division_name: string;
  team_fee_snapshot: string;
}

export interface FanPackageLine {
  id: number;
  invoice: number;
  fan_package: number;
  package_name: string;
  athlete: number | null;
  athlete_name: string;
  quantity: number;
  unit_price_snapshot: string;
  subtotal: string;
}

export interface GymInvoice {
  id: number;
  competition: number;
  competition_public_id: string;
  competition_name: string;
  gym: number;
  gym_name: string;
  paid: boolean;
  paid_at: string | null;
  athlete_subtotal: string;
  discount_subtotal: string;
  team_subtotal: string;
  fan_subtotal: string;
  total: string;
  amount_paid: string;
  balance_due: string;
  athlete_lines: AthleteInvoiceLine[];
  team_lines: TeamInvoiceLine[];
  fan_lines: FanPackageLine[];
}
