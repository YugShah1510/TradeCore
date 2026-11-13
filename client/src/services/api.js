/**
 * Central API Client Configuration
 * 
 * Cookie-Based Authentication with Automatic Token Rotation:
 * - Credentials (httpOnly cookies) enabled on all requests
 * - Zero access tokens or refresh tokens stored in localStorage
 * - Automatic silent access token rotation on 401 response via /api/auth/refresh-token
 * - Unified error message extraction
 */

import axios from 'axios';

// Ensure any deprecated tokens or user objects in localStorage are removed
try {
  localStorage.removeItem('tradecore_access_token');
  localStorage.removeItem('tradecore_refresh_token');
  localStorage.removeItem('tradecore_token');
  localStorage.removeItem('tradecore_user');
} catch (e) {
  // Ignore in non-browser environments
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial: Transmits httpOnly access and refresh token cookies
  timeout: 10000,
});

// Queue mechanism for handling concurrent requests during active access token rotation
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response interceptor: Extract clean response data and handle automated token rotation
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized with automatic silent access token rotation
    if (
      error.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      // Do not attempt refresh on auth endpoints (login, register, or refresh-token itself)
      if (
        originalRequest.url.includes('/auth/refresh-token') ||
        originalRequest.url.includes('/auth/login') ||
        originalRequest.url.includes('/auth/register')
      ) {
        if (
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register' &&
          window.location.pathname !== '/'
        ) {
          window.location.href = '/login';
        }
        const msg = error.response?.data?.message || 'Session expired. Please log in.';
        return Promise.reject(new Error(msg));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint with credentials - server rotates access token in cookie
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        if (res.data && res.data.success) {
          processQueue(null);
          // Retry original request with newly rotated cookie
          return api(originalRequest);
        }
      } catch (refreshErr) {
        processQueue(refreshErr);

        if (
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/register' &&
          window.location.pathname !== '/'
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Session has expired. Please sign in again.'));
      } finally {
        isRefreshing = false;
      }
    }

    let errorMessage = 'Network error or server unavailable.';
    if (error.response) {
      errorMessage = error.response.data?.message || `Error ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'Could not connect to TradeCore server. Please verify backend is running.';
    } else {
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// --- API Service Methods ---

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refreshToken: () => api.post('/auth/refresh-token', {}),
  logout: () => api.post('/auth/logout', {}),
  getMe: () => api.get('/auth/me'),
};

export const stocksApi = {
  getAll: (params) => api.get('/stocks', { params }),
  getBySymbol: (symbol) => api.get(`/stocks/${symbol}`),
  getHistory: (symbol, range) => api.get(`/stocks/${symbol}/history`, { params: { range } }),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
};

export const ordersApi = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

export const orderBookApi = {
  getBySymbol: (symbol) => api.get(`/order-book/${symbol}`),
};

export const portfolioApi = {
  getSummary: () => api.get('/portfolio'),
  getHoldings: () => api.get('/portfolio/holdings'),
};

export const tradesApi = {
  getAll: (params) => api.get('/trades', { params }),
};

export const analyticsApi = {
  getSummary: () => api.get('/analytics/summary'),
};

export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  updatePassword: (data) => api.patch('/users/me/password', data),
};

export default api;
