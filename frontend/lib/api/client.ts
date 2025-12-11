/**
 * API client setup with Axios
 */
import axios from 'axios';

/**
 * Base API URL:
 * - Use NEXT_PUBLIC_API_URL when provided
 * - In production fall back to relative `/api` to avoid triggering local network prompts
 * - Only use localhost during local development
 */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '/api');

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for calculations
});

// Request interceptor for logging (development only)
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use(
    (config) => {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging
  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[API Response] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.error('[API Response Error] Backend server is not running. Please start the backend server on port 8000.');
      } else {
        const errorData = error.response?.data;
        const errorDetail = errorData?.detail || errorData?.message || errorData || error.message;
        console.error('[API Response Error]', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          detail: errorDetail,
          fullError: errorData
        });
      }
      return Promise.reject(error);
    }
  );
}

export default apiClient;

