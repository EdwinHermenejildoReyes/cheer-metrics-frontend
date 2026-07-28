import api from '@/services/api';

interface LoginBody {
  email: string;
  password: string;
}

interface SignUpBody {
  email: string;
  password: string;
  re_password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  organization?: number | null;
}

interface RegisterWithInvitationBody {
  token: string;
  first_name: string;
  last_name: string;
  phone?: string;
  password: string;
  re_password: string;
}

export interface InvitationPayload {
  email: string;
  role: string;
  organization?: number | null;
}

export interface Invitation {
  id: number;
  email: string;
  role: string;
  organization: number | null;
  token: string;
  accepted: boolean;
  expires_at: string;
  is_valid: boolean;
  created_at: string;
}

export interface InvitationValidation {
  email: string;
  role: string;
  organization: number | null;
}

interface ResetPasswordConfirmBody {
  uid: string;
  token: string;
  new_password: string;
  re_new_password: string;
}

export interface SimpleUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_approved: boolean;
  is_staff: boolean;
}

class AuthRepository {
  login = (body: LoginBody) => api.post('/auth/login/', body);

  logout = () => api.post('/auth/logout/');

  signUp = (body: SignUpBody) => api.post('/auth/users/', body);

  me = () => api.get('/auth/users/me/');

  listUsers = () => api.get<SimpleUser[]>('/users/');

  approveUser = (userId: number) => api.post(`/users/${userId}/approve/`);

  updateMe = (data: FormData | { first_name?: string; last_name?: string }) =>
    api.patch('/auth/users/me/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });

  setPassword = (body: { current_password: string; new_password: string }) =>
    api.post('/auth/users/set_password/', body);

  resetPassword = (email: string) =>
    api.post('/auth/users/reset_password/', { email });

  resetPasswordConfirm = (body: ResetPasswordConfirmBody) =>
    api.post('/auth/users/reset_password_confirm/', body);

  validateInvitation = (token: string) =>
    api.get<InvitationValidation>(`/invitations/validate/?token=${token}`);

  registerWithInvitation = (body: RegisterWithInvitationBody) =>
    api.post('/auth/register/', body);

  listInvitations = () => api.get<{ results: Invitation[] }>('/invitations/');

  createInvitation = (body: InvitationPayload) =>
    api.post<Invitation>('/invitations/', body);

  deleteInvitation = (id: number) => api.delete(`/invitations/${id}/`);
}

export default new AuthRepository();
