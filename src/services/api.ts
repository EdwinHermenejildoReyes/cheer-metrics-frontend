import axios from 'axios';
import { toast } from 'sonner';
import applyTokenRefreshInterceptor from './interceptor';
import getEnvVars from '@/utils/getEnvVars';

const { mainApiUrl } = getEnvVars();

const api = axios.create({
  baseURL: mainApiUrl ?? '',
  headers: { 'content-type': 'application/json' },
  timeout: 15000,
  withCredentials: true, // sends httpOnly JWT cookies on every request
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'API Error —',
        'URL:', error.config?.url,
        'Status:', error.response?.status,
      );
    }
    if (error.response?.status >= 500) {
      toast.error('Error del servidor. Intente nuevamente.');
    } else if (!error.response) {
      toast.error('Sin conexión. Verifique su red.');
    }
    return Promise.reject(error);
  }
);

applyTokenRefreshInterceptor(api);

export default api;
