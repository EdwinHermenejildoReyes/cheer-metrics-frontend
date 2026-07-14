import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';
import getEnvVars from '@/utils/getEnvVars';
import { store, persistor } from '@/core/store';
import { clearAuth } from '@/store/auth/slices';

const { mainApiUrl } = getEnvVars();

const shouldIntercept = (error: AxiosError): boolean => {
  if (error.response?.status !== 401) return false;
  const url = error.config?.url ?? '';
  // Never intercept auth or public endpoints to avoid infinite loops / race conditions
  return !(
    url.includes('/auth/login/') ||
    url.includes('/auth/token/refresh/') ||
    url.includes('/auth/logout/') ||
    url.includes('/auth/users/me/') ||
    url.includes('/settings/branding/') ||
    /\/auth\/users\/?$/.test(url)
  );
};

export default (axiosClient: AxiosInstance): void => {
  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  const processQueue = (error: Error | null): void => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)));
    failedQueue = [];
  };

  axiosClient.interceptors.response.use(undefined, async (error: AxiosError) => {
    if (!shouldIntercept(error)) return Promise.reject(error);

    const config = error.config as typeof error.config & { _retry?: boolean; _queued?: boolean };
    if (config?._retry || config?._queued) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => axiosClient.request(Object.assign({}, config, { _queued: true })));
    }

    config!._retry = true;
    isRefreshing = true;

    try {
      // POST to refresh — browser sends the httpOnly refresh cookie automatically.
      // Django sets a new access cookie in the response.
      await axios.post(`${mainApiUrl}auth/token/refresh/`, {}, { withCredentials: true });
      processQueue(null);
      return axiosClient.request(config!);
    } catch (refreshError) {
      processQueue(refreshError as Error);
      store.dispatch(clearAuth());
      toast('Su sesión ha expirado, por favor inicie sesión nuevamente.');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        persistor.flush().finally(() => {
          window.location.href = '/login';
        });
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  });
};
