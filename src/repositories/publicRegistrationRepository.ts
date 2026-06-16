import api from '@/services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WizardDivision {
  id: number;
  name: string;
  age_group: string;
  skill_level: string;
  category: string;
  scoring_system: string;
  athlete_fee: string;
  min_athletes: number;
  max_athletes: number;
}

export interface WizardCompetition {
  id: number;
  name: string;
  date: string;
  venue: string;
  city: string;
  token: string;
  divisions: WizardDivision[];
}

export interface WizardGym {
  id: number;
  name: string;
  city: string;
  country: string;
}

export interface WizardStaff {
  full_name: string;
  role: 'head_coach' | 'assistant' | 'trainer';
  phone?: string;
  email?: string;
}

export interface WizardTeamResult {
  registration_id: number;
  team_id: number;
  team_name: string;
  gym_name: string;
  division_name: string;
  age_group: string;
  division_id: number;
}

export interface WizardAthleteSearch {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  document_id: string | null;
  gym: number;
}

export interface WizardAthleteCreate {
  token: string;
  team_id: number;
  registration_id: number;
  role: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  document_id: string;
  gym: number;
}

// ── Repository ────────────────────────────────────────────────────────────────

const publicRegistrationRepository = {
  validateToken(token: string): Promise<WizardCompetition> {
    return api.get(`wizard/validate/?token=${token}`).then((r) => r.data);
  },

  searchGyms(token: string, q: string): Promise<WizardGym[]> {
    return api.get(`wizard/gyms/?token=${token}&q=${encodeURIComponent(q)}`).then((r) => r.data);
  },

  createGym(token: string, payload: { name: string; city: string; country: string }): Promise<WizardGym> {
    return api.post(`wizard/gyms/?token=${token}`, payload).then((r) => r.data);
  },

  createTeam(payload: {
    token: string;
    gym_id: number;
    division_id: number;
    team_name: string;
    staff: WizardStaff[];
  }): Promise<WizardTeamResult> {
    return api.post('wizard/team/', payload).then((r) => r.data);
  },

  searchAthlete(token: string, ci: string): Promise<WizardAthleteSearch[]> {
    return api.get(`wizard/athletes/?token=${token}&ci=${encodeURIComponent(ci)}`).then((r) => r.data);
  },

  saveAthlete(payload: WizardAthleteCreate): Promise<WizardAthleteSearch> {
    return api.post('wizard/athletes/', payload).then((r) => r.data);
  },

  listTokens(competitionId: number) {
    return api.get(`registration-tokens/?competition=${competitionId}`).then((r) => r.data);
  },

  createToken(payload: { competition: number; expires_at: string; max_uses?: number | null; notes?: string }) {
    return api.post('registration-tokens/', payload).then((r) => r.data);
  },

  deleteToken(id: number) {
    return api.delete(`registration-tokens/${id}/`).then((r) => r.data);
  },
};

export default publicRegistrationRepository;
