import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
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