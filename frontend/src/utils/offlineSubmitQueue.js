import axios from 'axios';

const OFFLINE_QUEUE_KEY = 'suvidha_offline_submit_queue_v1';
const OFFLINE_HISTORY_KEY = 'suvidha_offline_submit_history_v1';
const OFFLINE_SYNC_LOCK_KEY = 'suvidha_offline_sync_lock_v1';
const LOCK_TTL_MS = 45 * 1000;
const MAX_HISTORY = 100;

const APPLICATION_PATH = /\/applications\/submit$/i;
const COMPLAINT_PATH = /\/complaints\/submit$/i;

const EXCLUDED_PATHS = [
  '/payments/',
  '/create-order',
  '/verify-payment',
  '/verify-order',
  '/otp/',
  '/auth/',
  '/login',
  '/register',
  '/refresh',
];

const safeJsonParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

const nowIso = () => new Date().toISOString();

const makeId = () => `off-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const makeIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const toAbsolutePath = (url = '') => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url;
};

const normalizeHeaders = (headers = {}) => {
  const out = {};
  Object.keys(headers || {}).forEach((key) => {
    const value = headers[key];
    if (value !== undefined && value !== null && typeof value !== 'function') {
      out[key] = value;
    }
  });
  return out;
};

const parseRequestData = (data) => {
  if (data == null) return data;
  if (typeof data === 'string') {
    const parsed = safeJsonParse(data, null);
    return parsed !== null ? parsed : data;
  }
  return data;
};

export const isQueueEligibleRequest = (config = {}) => {
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'post') return false;

  const path = toAbsolutePath(config.url || '');
  if (!path) return false;

  const hasExcludedSegment = EXCLUDED_PATHS.some((segment) => path.toLowerCase().includes(segment));
  if (hasExcludedSegment) return false;

  return APPLICATION_PATH.test(path) || COMPLAINT_PATH.test(path);
};

const getReferenceType = (path) => {
  if (COMPLAINT_PATH.test(path)) return 'complaint';
  return 'application';
};

const makeReferenceNumber = (type) => {
  const base = Date.now();
  if (type === 'complaint') return `OFF-CMP-${base}`;
  return `OFF-APP-${base}`;
};

const readQueue = () => safeJsonParse(localStorage.getItem(OFFLINE_QUEUE_KEY), []);

const writeQueue = (items) => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, safeJsonStringify(items));
};

const readHistory = () => safeJsonParse(localStorage.getItem(OFFLINE_HISTORY_KEY), []);

const writeHistory = (items) => {
  localStorage.setItem(OFFLINE_HISTORY_KEY, safeJsonStringify(items.slice(0, MAX_HISTORY)));
};

const addHistoryEntry = (entry) => {
  const history = readHistory();
  history.unshift(entry);
  writeHistory(history);
};

const hasActiveLock = () => {
  const lock = safeJsonParse(localStorage.getItem(OFFLINE_SYNC_LOCK_KEY), null);
  if (!lock?.ts) return false;
  return Date.now() - lock.ts < LOCK_TTL_MS;
};

const acquireLock = () => {
  if (hasActiveLock()) return false;
  localStorage.setItem(OFFLINE_SYNC_LOCK_KEY, safeJsonStringify({ ts: Date.now() }));
  return true;
};

const releaseLock = () => {
  localStorage.removeItem(OFFLINE_SYNC_LOCK_KEY);
};

export const queueSubmission = (axiosConfig = {}) => {
  const path = toAbsolutePath(axiosConfig.url || '');
  const referenceType = getReferenceType(path);
  const idempotencyKey =
    axiosConfig.headers?.['x-idempotency-key'] ||
    axiosConfig.headers?.['X-Idempotency-Key'] ||
    makeIdempotencyKey();

  const queueEntry = {
    id: makeId(),
    method: (axiosConfig.method || 'post').toLowerCase(),
    url: axiosConfig.url,
    path,
    data: parseRequestData(axiosConfig.data),
    headers: normalizeHeaders(axiosConfig.headers),
    createdAt: nowIso(),
    retries: 0,
    idempotencyKey,
    referenceType,
    referenceNumber: makeReferenceNumber(referenceType),
  };

  const queue = readQueue();
  queue.push(queueEntry);
  writeQueue(queue);

  return queueEntry;
};

export const buildOfflineQueuedResponse = (axiosConfig, queueEntry) => {
  const isComplaint = queueEntry.referenceType === 'complaint';
  const commonData = {
    offline_queued: true,
    queued_at: queueEntry.createdAt,
    reference_number: queueEntry.referenceNumber,
    data: {
      reference_number: queueEntry.referenceNumber,
    },
  };

  if (isComplaint) {
    commonData.complaint_number = queueEntry.referenceNumber;
    commonData.data.complaint_number = queueEntry.referenceNumber;
  } else {
    commonData.application_number = queueEntry.referenceNumber;
    commonData.data.application_number = queueEntry.referenceNumber;
  }

  return {
    status: 202,
    statusText: 'Accepted (offline queued)',
    data: commonData,
    headers: {},
    config: axiosConfig,
    request: null,
  };
};

export const syncOfflineQueue = async ({ baseURL, getToken }) => {
  if (!navigator.onLine) return { attempted: 0, synced: 0, remaining: readQueue().length };
  if (!acquireLock()) return { attempted: 0, synced: 0, remaining: readQueue().length };

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const queue = readQueue();
  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    try {
      const token = getToken ? getToken() : null;
      const headers = {
        ...item.headers,
        'x-idempotency-key': item.idempotencyKey,
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      await client.request({
        method: item.method,
        url: item.url,
        data: item.data,
        headers,
      });

      addHistoryEntry({
        id: item.id,
        syncedAt: nowIso(),
        createdAt: item.createdAt,
        referenceType: item.referenceType,
        referenceNumber: item.referenceNumber,
        path: item.path,
        status: 'synced',
      });

      synced += 1;
    } catch (error) {
      remaining.push({
        ...item,
        retries: (item.retries || 0) + 1,
        lastError: error?.response?.data?.message || error?.message || 'sync_failed',
        lastTriedAt: nowIso(),
      });
    }
  }

  writeQueue(remaining);
  releaseLock();

  return {
    attempted: queue.length,
    synced,
    remaining: remaining.length,
  };
};

export const getOfflineQueueStats = () => {
  const queue = readQueue();
  return {
    count: queue.length,
    applications: queue.filter((x) => x.referenceType === 'application').length,
    complaints: queue.filter((x) => x.referenceType === 'complaint').length,
  };
};
