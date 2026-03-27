import axios from 'axios';
import {
  isQueueEligibleRequest,
  queueSubmission,
  buildOfflineQueuedResponse,
  syncOfflineQueue,
} from './offlineSubmitQueue';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let offlineSyncInitialized = false;

const ensureOfflineSync = () => {
  if (offlineSyncInitialized || typeof window === 'undefined') return;
  offlineSyncInitialized = true;

  const runSync = async () => {
    try {
      await syncOfflineQueue({
        baseURL: api.defaults.baseURL,
        getToken: () => localStorage.getItem('token'),
      });
    } catch {
      // Sync errors are intentionally swallowed; queue remains for next retry.
    }
  };

  window.addEventListener('online', runSync);
  runSync();
};

ensureOfflineSync();

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isQueueEligibleRequest(config) && !config.headers['x-idempotency-key']) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        config.headers['x-idempotency-key'] = crypto.randomUUID();
      } else {
        config.headers['x-idempotency-key'] = `idem-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    const originalConfig = error?.config;
    const isNetworkFailure = !error?.response;

    if (isNetworkFailure && originalConfig && isQueueEligibleRequest(originalConfig)) {
      const queuedEntry = queueSubmission(originalConfig);
      return Promise.resolve(buildOfflineQueuedResponse(originalConfig, queuedEntry));
    }

    return Promise.reject(error);
  }
);

export default api;
