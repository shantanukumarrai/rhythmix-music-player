/**
 * Rhythmix API Client
 * Axios instance with automatic token refresh and error handling
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // needed for refreshToken cookie
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// ── API methods ──────────────────────────────────────────────

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
};

export const songsAPI = {
  getAll: (params) => api.get('/songs', { params }),
  search: (q) => api.get('/songs/search', { params: { q } }),
  upload: (formData, onProgress) =>
    api.post('/songs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    }),
  getStreamUrl: (id) => `${BASE_URL}/songs/${id}/stream`,
  like: (id) => api.post(`/songs/${id}/like`),
  delete: (id) => api.delete(`/songs/${id}`),
};

export const playlistsAPI = {
  getAll: () => api.get('/playlists'),
  create: (data) => api.post('/playlists', data),
  getById: (id) => api.get(`/playlists/${id}`),
  update: (id, data) => api.patch(`/playlists/${id}`, data),
  addSong: (playlistId, songId) => api.post(`/playlists/${playlistId}/songs`, { songId }),
  removeSong: (playlistId, songId) => api.delete(`/playlists/${playlistId}/songs/${songId}`),
  delete: (id) => api.delete(`/playlists/${id}`),
};

export const lyricsAPI = {
  get: (songId) => api.get(`/lyrics/${songId}`),
  getAtTime: (songId, t) => api.get(`/lyrics/${songId}/at`, { params: { t } }),
  upload: (songId, formData) =>
    api.post(`/lyrics/${songId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadJSON: (songId, data) => api.post(`/lyrics/${songId}`, data),
  delete: (songId) => api.delete(`/lyrics/${songId}`),
};

export const usersAPI = {
  getLiked: (userId) => api.get(`/users/${userId}/liked`),
  getRecentlyPlayed: (userId) => api.get(`/users/${userId}/recently-played`),
};

export default api;
