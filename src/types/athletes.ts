export type Gender = 'F' | 'M' | 'O';
export type MembershipRole = 'flyer' | 'base' | 'backspot' | 'spotter' | 'tumbler';

export interface TeamMembership {
  id: number;
  athlete: number;
  athlete_name: string;
  team: number;
  team_name: string;
  gym_name: string;
  role: MembershipRole;
  role_display: string;
  is_enable: boolean;
}

export interface Athlete {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  birth_date: string;
  gender: Gender;
  gender_display: string;
  document_id: string;
  gym: number;
  gym_name: string;
  photo: string | null;
  age: number;
  eligible_age_groups: string[];
  memberships: TeamMembership[];
  is_enable: boolean;
}

export const GENDER_LABELS: Record<Gender, string> = {
  F: 'Femenino',
  M: 'Masculino',
  O: 'Otro',
};

export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  flyer:    'Flyer',
  base:     'Base',
  backspot: 'Backspot',
  spotter:  'Spotter',
  tumbler:  'Tumbler',
};

export const AGE_GROUP_LABELS_SHORT: Record<string, string> = {
  tiny:   'Tiny (4–6)',
  mini:   'Mini (5–9)',
  youth:  'Youth (8–12)',
  junior: 'Junior (9–16)',
  senior: 'Senior (12–19)',
  open:   'Open (12+)',
};
