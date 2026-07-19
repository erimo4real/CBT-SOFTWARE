import axios from 'axios';
import { authStorage } from '@/lib/authStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
}

api.interceptors.request.use(
  (config) => {
    const tokens = authStorage.getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'] || 60;
      return Promise.reject({
        ...error,
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        isRateLimited: true,
      });
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const tokens = authStorage.getTokens();

      if (tokens?.refresh) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: tokens.refresh,
          });

          const newTokens = {
            access: response.data.access,
            refresh: response.data.refresh || tokens.refresh,
          };
          authStorage.setTokens(newTokens);
          processQueue(null, newTokens.access);
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          authStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        authStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
