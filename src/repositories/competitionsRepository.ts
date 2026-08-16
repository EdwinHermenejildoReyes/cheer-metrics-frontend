import api from '@/services/api';
import type { AthleteInvoiceLine, FanPackage, FanPackageLine, GymInvoice, IcuAggregate, IcuJudgeScore, IcuSheetType, JudgePanel } from '@/types/competitions';

export interface PublicResultDeduction {
  type: string;
  count: number;
  total: string;
  routine_time: string;
  hit_zero: boolean;
  notes: string;
}

export interface PublicRankingEntry {
  registration_id: number;
  team_name: string;
  gym_name: string;
  performance_order: number | null;
  has_score: boolean;
  final_score: string | null;
  percentage: string | null;
  total_deductions: string | null;
  rank: number | null;
}

export interface PublicDivisionRanking {
  division_id: number;
  division_name: string;
  competition_name: string;
  competition_date: string;
  organization: { name: string; logo: string | null; primary_color: string; text_on_primary: string } | null;
  entries: PublicRankingEntry[];
}

export interface PublicResult {
  registration_id: number;
  division_id: number;
  division_public_id: string;
  performance_order: number | null;
  team_name: string;
  gym_name: string;
  division_name: string;
  competition_name: string;
  competition_date: string;
  age_group: string;
  skill_level: string;
  category: string;
  scoring_system: string | null;
  organization: { name: string; logo: string | null; primary_color: string; text_on_primary: string } | null;
  has_score: boolean;
  // Aggregated totals
  building_total?: string;
  tumbling_total?: string;
  overall_total?: string;
  partner_stunt_total?: string;
  avg_creativity?: string;
  avg_showmanship?: string;
  raw_score?: string;
  max_raw?: string;
  total_deductions?: string;
  final_score?: string;
  scaled_score?: string;
  percentage?: string;
  deductions?: PublicResultDeduction[];
  score_updated_at?: string;
  // Sheet A — Elevaciones
  stunts_difficulty?: string | null;
  stunts_execution?: string | null;
  stunts_drivers?: string | null;
  pyramids_difficulty?: string | null;
  pyramids_execution?: string | null;
  pyramids_drivers?: string | null;
  tosses_difficulty?: string | null;
  tosses_execution?: string | null;
  // Sheet B — Gimnasia
  standing_difficulty?: string | null;
  standing_execution?: string | null;
  standing_drivers?: string | null;
  running_difficulty?: string | null;
  running_execution?: string | null;
  running_drivers?: string | null;
  jumps_difficulty?: string | null;
  jumps_execution?: string | null;
  // Sheet C — General
  formations_score?: string | null;
  dance_difficulty?: string | null;
  dance_execution?: string | null;
  // Cross-sheet per judge
  creativity_building?: string | null;
  creativity_tumbling?: string | null;
  creativity_overall?: string | null;
  showmanship_building?: string | null;
  showmanship_tumbling?: string | null;
  showmanship_overall?: string | null;
  // Partner Stunt
  pg_technique?: string | null;
  pg_difficulty?: string | null;
  pg_form_appearance?: string | null;
  pg_transitions?: string | null;
  pg_expressiveness?: string | null;
  // Comentarios del juez (JSON serializado con claves por sección)
  notes?: string | null;
}

export interface RestConflict {
  athlete_id: number;
  athlete_name: string;
  team_a: string;
  division_a: string;
  order_a: number;
  team_b: string;
  division_b: string;
  order_b: number;
  gap: number;
  missing: number;
}

export interface ImportRowError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ImportInscripcionResult {
  gym_name: string;
  sent_date: string;
  athletes_created: number;
  athletes_updated: number;
  memberships_created: number;
  registrations_created: number;
  divisions_created: number;
  photos_matched: number;
  rows_ok: number;
  rows_skipped: number;
  aborted: boolean;
  abort_reason: string;
  errors: ImportRowError[];
}

import type {
  Competition,
  Division,
  DivisionRankings,
  GrandChampionData,
  Gym,
  HeroImage,
  JudgeAssignment,
  Organization,
  Team,
  Registration,
  ScoreSheet,
  Deduction,
  PaginatedResponse,
} from '@/types/competitions';

class CompetitionsRepository {
  // Organizations
  listOrganizations = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Organization>>('/organizations/', { params });

  getOrganization = (id: number) =>
    api.get<Organization>(`/organizations/${id}/`);

  createOrganization = (data: FormData) =>
    api.post<Organization>('/organizations/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

  updateOrganization = (id: number, data: FormData | Partial<Organization>) =>
    api.patch<Organization>(`/organizations/${id}/`, data,
      data instanceof FormData
        ? { headers: { 'Content-Type': 'multipart/form-data' } }
        : undefined,
    );

  deleteOrganization = (id: number) =>
    api.delete(`/organizations/${id}/`);

  // Competitions
  listCompetitions = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Competition>>('/competitions/', { params });

  getCompetition = (id: string) =>
    api.get<Competition>(`/competitions/${id}/`);

  createCompetition = (data: Partial<Competition>) =>
    api.post<Competition>('/competitions/', data);

  updateCompetition = (id: string, data: Partial<Competition>) =>
    api.patch<Competition>(`/competitions/${id}/`, data);

  // Divisions
  listDivisions = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Division>>('/divisions/', { params });

  getDivision = (id: string) =>
    api.get<Division>(`/divisions/${id}/`);

  getDivisionRankings = (id: string) =>
    api.get<DivisionRankings>(`/divisions/${id}/rankings/`);

  getGrandChampion = (competitionId: string) =>
    api.get<GrandChampionData>(`/competitions/${competitionId}/grand-champion/`);

  createDivision = (data: Partial<Division>) =>
    api.post<Division>('/divisions/', data);

  updateDivision = (id: string, data: Partial<Division>) =>
    api.patch<Division>(`/divisions/${id}/`, data);

  // Gyms
  listGyms = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Gym>>('/gyms/', { params });

  createGym = (data: Partial<Gym>) =>
    api.post<Gym>('/gyms/', data);

  updateGym = (id: string, data: Partial<Gym>) =>
    api.patch<Gym>(`/gyms/${id}/`, data);

  // Teams
  listTeams = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Team>>('/teams/', { params });

  createTeam = (data: Partial<Team>) =>
    api.post<Team>('/teams/', data);

  updateTeam = (id: number, data: Partial<Team>) =>
    api.patch<Team>(`/teams/${id}/`, data);

  // Registrations
  listRegistrations = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Registration>>('/registrations/', { params });

  createRegistration = (data: Partial<Registration>) =>
    api.post<Registration>('/registrations/', data);

  updateRegistration = (id: string, data: Partial<Registration>) =>
    api.patch<Registration>(`/registrations/${id}/`, data);

  deleteRegistration = (id: string) =>
    api.delete(`/registrations/${id}/`);

  moveRegistration = (id: string, direction: 'up' | 'down') =>
    api.post<Registration>(`/registrations/${id}/move/`, { direction });

  sendScoreReport = (id: string) =>
    api.post<{ detail: string }>(`/registrations/${id}/send-report/`);

  sendWhatsappReport = (id: string) =>
    api.post<{ detail: string }>(`/registrations/${id}/send-whatsapp/`);

  downloadPdfReport = (id: string) =>
    api.get(`/registrations/${id}/pdf-report/`, { responseType: 'blob' });

  // Score sheets
  listScoreSheets = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<ScoreSheet>>('/score-sheets/', { params });

  createScoreSheet = (data: Partial<ScoreSheet>) =>
    api.post<ScoreSheet>('/score-sheets/', data);

  updateScoreSheet = (id: number, data: Partial<ScoreSheet>) =>
    api.patch<ScoreSheet>(`/score-sheets/${id}/`, data);

  // Deductions
  createDeduction = (data: Partial<Deduction>) =>
    api.post<Deduction>('/deductions/', data);

  updateDeduction = (id: number, data: Partial<Deduction>) =>
    api.patch<Deduction>(`/deductions/${id}/`, data);

  deleteDeduction = (id: number) =>
    api.delete(`/deductions/${id}/`);

  // Judge assignments
  listJudgeAssignments = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<JudgeAssignment>>('/judge-assignments/', { params });

  createJudgeAssignment = (data: Partial<JudgeAssignment>) =>
    api.post<JudgeAssignment>('/judge-assignments/', data);

  deleteJudgeAssignment = (id: number) =>
    api.delete(`/judge-assignments/${id}/`);

  // Schedule conflict check
  getScheduleConflicts = (competitionId: string, minGap = 3) =>
    api.get<RestConflict[]>(`/competitions/${competitionId}/schedule-conflicts/`, {
      params: { min_gap: minGap },
    });

  // Auto-assign performance orders by category/level
  autoAssignOrders = (competitionId: string) =>
    api.post<{ assigned: number; message: string }>(`/competitions/${competitionId}/auto-assign-orders/`);

  // Public result (no auth) — for coach protest review link
  getPublicResult = (registrationId: string) =>
    api.get<PublicResult>(`/registrations/${registrationId}/public-result/`, { withCredentials: false });

  // Public division ranking (no auth)
  getPublicDivisionRankings = (divisionId: string) =>
    api.get<PublicDivisionRanking>(`/divisions/${divisionId}/public-rankings/`, { withCredentials: false });

  // Inscripción import
  importInscripcion = (competitionId: string, formData: FormData) =>
    api.post<ImportInscripcionResult>(`/competitions/${competitionId}/import-inscripcion/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

  // Judging import (team-level Excel, no athlete data)
  importJudging = (competitionId: string, formData: FormData) =>
    api.post<ImportInscripcionResult>(`/competitions/${competitionId}/import-judging/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

  // Hero images (public list, admin write)
  listHeroImages = () =>
    api.get<PaginatedResponse<HeroImage>>('/hero-images/', { params: { page_size: '50' } });

  createHeroImage = (data: FormData) =>
    api.post<HeroImage>('/hero-images/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

  updateHeroImage = (id: number, data: Partial<Pick<HeroImage, 'order'>>) =>
    api.patch<HeroImage>(`/hero-images/${id}/`, data);

  deleteHeroImage = (id: number) =>
    api.delete(`/hero-images/${id}/`);

  // ── Billing ────────────────────────────────────────────────────────────────

  listFanPackages = (competitionId: number | string) =>
    api.get<{ results: FanPackage[] }>('/fan-packages/', {
      params: typeof competitionId === 'string'
        ? { competition__public_id: competitionId }
        : { competition: competitionId },
    });

  createFanPackage = (data: Partial<FanPackage>) =>
    api.post<FanPackage>('/fan-packages/', data);

  listGymInvoices = (params: Record<string, string | number>) =>
    api.get<{ results: GymInvoice[] }>('/gym-invoices/', { params });

  getGymInvoice = (id: number) =>
    api.get<GymInvoice>(`/gym-invoices/${id}/`);

  generateGymInvoice = (competitionId: number, gymId: number) =>
    api.post<GymInvoice>('/gym-invoices/generate/', { competition: competitionId, gym: gymId });

  updateGymInvoice = (id: number, data: Partial<Pick<GymInvoice, 'paid' | 'paid_at'>>) =>
    api.patch<GymInvoice>(`/gym-invoices/${id}/`, data);

  payAthleteInvoiceLine = (id: number, amountPaid: string) =>
    api.patch<AthleteInvoiceLine>(`/athlete-invoice-lines/${id}/pay/`, { amount_paid: amountPaid });

  createFanPackageLine = (data: Partial<FanPackageLine>) =>
    api.post<FanPackageLine>('/fan-package-lines/', data);

  deleteFanPackageLine = (id: number) =>
    api.delete(`/fan-package-lines/${id}/`);

  // ── ICU judge panels ───────────────────────────────────────────────────────

  listJudgePanels = (params: Record<string, string | number>) =>
    api.get<{ results: JudgePanel[] }>('/judge-panels/', { params });

  createJudgePanel = (data: { competition: number; name: string }) =>
    api.post<JudgePanel>('/judge-panels/', data);

  updateJudgePanel = (id: number, data: Partial<JudgePanel>) =>
    api.patch<JudgePanel>(`/judge-panels/${id}/`, data);

  deleteJudgePanel = (id: number) =>
    api.delete(`/judge-panels/${id}/`);

  assignRegistrationsToPanel = (panelId: number, registrationIds: number[]) =>
    api.post<JudgePanel>(`/judge-panels/${panelId}/assign-registrations/`, { registration_ids: registrationIds });

  autoAssignPanels = (competitionId: number) =>
    api.post<JudgePanel[]>('/judge-panels/auto-assign/', { competition: competitionId });

  // ── ICU judge scores ───────────────────────────────────────────────────────

  listIcuJudgeScores = (params: Record<string, string | number>) =>
    api.get<{ results: IcuJudgeScore[] }>('/icu-judge-scores/', { params });

  getIcuJudgeScore = (id: number) =>
    api.get<IcuJudgeScore>(`/icu-judge-scores/${id}/`);

  getMyIcuJudgeScore = (registrationId: number, sheetType: IcuSheetType, judgeId: number) =>
    api.get<{ results: IcuJudgeScore[] }>('/icu-judge-scores/', {
      params: { registration: registrationId, sheet_type: sheetType, judge: judgeId },
    });

  createIcuJudgeScore = (data: Partial<IcuJudgeScore>) =>
    api.post<IcuJudgeScore>('/icu-judge-scores/', data);

  updateIcuJudgeScore = (id: number, data: Partial<IcuJudgeScore>) =>
    api.patch<IcuJudgeScore>(`/icu-judge-scores/${id}/`, data);

  getIcuAggregate = (registrationId: number, sheetType: IcuSheetType) =>
    api.get<IcuAggregate>('/icu-judge-scores/aggregate/', {
      params: { registration: registrationId, sheet_type: sheetType },
    });
}

export default new CompetitionsRepository();
