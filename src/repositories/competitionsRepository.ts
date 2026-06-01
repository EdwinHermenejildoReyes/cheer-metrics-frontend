import api from '@/services/api';
import type {
  Competition,
  Division,
  DivisionRankings,
  Gym,
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

  getCompetition = (id: number) =>
    api.get<Competition>(`/competitions/${id}/`);

  createCompetition = (data: Partial<Competition>) =>
    api.post<Competition>('/competitions/', data);

  updateCompetition = (id: number, data: Partial<Competition>) =>
    api.patch<Competition>(`/competitions/${id}/`, data);

  // Divisions
  listDivisions = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Division>>('/divisions/', { params });

  getDivision = (id: number) =>
    api.get<Division>(`/divisions/${id}/`);

  getDivisionRankings = (id: number) =>
    api.get<DivisionRankings>(`/divisions/${id}/rankings/`);

  createDivision = (data: Partial<Division>) =>
    api.post<Division>('/divisions/', data);

  updateDivision = (id: number, data: Partial<Division>) =>
    api.patch<Division>(`/divisions/${id}/`, data);

  // Gyms
  listGyms = (params?: Record<string, string>) =>
    api.get<PaginatedResponse<Gym>>('/gyms/', { params });

  createGym = (data: Partial<Gym>) =>
    api.post<Gym>('/gyms/', data);

  updateGym = (id: number, data: Partial<Gym>) =>
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

  updateRegistration = (id: number, data: Partial<Registration>) =>
    api.patch<Registration>(`/registrations/${id}/`, data);

  deleteRegistration = (id: number) =>
    api.delete(`/registrations/${id}/`);

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
}

export default new CompetitionsRepository();
