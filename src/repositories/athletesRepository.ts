import api from '@/services/api';
import type { Athlete, TeamMembership } from '@/types/athletes';
import type { PaginatedResponse as PR } from '@/types/competitions';

class AthletesRepository {
  listAthletes = (params?: Record<string, string>) =>
    api.get<PR<Athlete>>('/athletes/', { params });

  getAthlete = (id: number) =>
    api.get<Athlete>(`/athletes/${id}/`);

  createAthlete = (data: FormData | Partial<Athlete>) =>
    api.post<Athlete>('/athletes/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });

  updateAthlete = (id: number, data: FormData | Partial<Athlete>) =>
    api.patch<Athlete>(`/athletes/${id}/`, data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });

  listMemberships = (params?: Record<string, string>) =>
    api.get<PR<TeamMembership>>('/memberships/', { params });

  createMembership = (data: Partial<TeamMembership>) =>
    api.post<TeamMembership>('/memberships/', data);

  deleteMembership = (id: number) =>
    api.delete(`/memberships/${id}/`);
}

export default new AthletesRepository();
