import axios from 'axios';
import { getToken } from '../utils/storage';
import config from '../config';

type SessionExpiredHandler = () => void;

let sessionExpiredHandler: SessionExpiredHandler | null = null;

export const setSessionExpiredHandler = (handler: SessionExpiredHandler | null) => {
  sessionExpiredHandler = handler;
};

const notifySessionExpired = () => {
  sessionExpiredHandler?.();
};

const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/send-otp', '/auth/verify-otp'];

const isPublicAuthRequest = (url?: string) =>
  Boolean(url && publicAuthPaths.some(path => url.includes(path)));

const instance = axios.create({
  baseURL: config.base_url.BASE_URL,
});

instance.interceptors.request.use(async config => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (!isPublicAuthRequest(config.url)) {
    notifySessionExpired();
    return Promise.reject({
      message: 'Session expired. Please login again.',
      status: 401,
    });
  }
  return config;
});

instance.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      notifySessionExpired();
    }

    return Promise.reject({
      message:
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        'Something went wrong',
      status: error?.response?.status,
      raw: error,
    });
  },
);

export default instance;
