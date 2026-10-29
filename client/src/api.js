import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('gm_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
// If the token is expired or invalid, clear it and send the user to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/login') && localStorage.getItem('gm_token')) {
      localStorage.removeItem('gm_token');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  }
);
export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong';
export default api;
