import api from '@/services/api';
import type { PlatformSettings } from '@/types/settings';

const settingsRepository = {
  getSettings:    ()                              => api.get<PlatformSettings>('/settings/branding/'),
  updateSettings: (data: Partial<PlatformSettings>) => api.patch<PlatformSettings>('/settings/branding/', data),
};

export default settingsRepository;
