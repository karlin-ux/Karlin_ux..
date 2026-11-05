import axios from 'axios';

// API base URL from environment variable, with safe development default.
// In production behind a reverse proxy, use a relative path ('/api').
// If VITE_API_BASE_URL is set, use it; otherwise default to '/api'.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export async function ensureCsrf() {
  await api.get('/auth/csrf/');
}

export function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : null;
}

api.interceptors.request.use((config) => {
  const csrf = getCookie('csrftoken');
  if (csrf && config.method && !['get','head','options'].includes(config.method.toLowerCase())) {
    config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

// Response interceptor: handle 401 (expired/invalid session) by clearing auth state.
// The AuthContext will detect the null user on next refresh.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      // Session expired or invalid — clear any cached CSRF token
      // The AuthContext refresh() will update user state accordingly.
    }
    return Promise.reject(error);
  }
);