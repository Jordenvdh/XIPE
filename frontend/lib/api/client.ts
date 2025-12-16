/**
 * API client setup with Axios
 * 
 * Purpose:
 * - Centralized HTTP client configuration
 * - Handles API requests to the FastAPI backend
 * - Provides error handling and logging
 * 
 * Security considerations:
 * - OWASP #7 - XSS: All API responses are JSON (no HTML injection risk)
 * - OWASP #3 - Sensitive Data Exposure: Error details logged only in development
 * - Timeout prevents hanging requests
 */
import axios from 'axios';

/**
 * Base API URL configuration
 * 
 * Purpose:
 * - Determines the backend API endpoint
 * - Supports both development and production environments
 * 
 * Configuration:
 * - Use NEXT_PUBLIC_API_URL when provided (should include protocol/host)
 * - In production, use relative origin ('') and rely on /api/* paths (Vercel rewrites)
 * - In development, default to localhost backend on port 8000
 */
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

/**
 * Axios client instance
 * 
 * Configuration:
 * - baseURL: API endpoint (configured above)
 * - headers: Content-Type set to JSON for all requests
 * - timeout: 30 seconds - prevents hanging requests during calculations
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for calculations
});

/**
 * Request interceptor for logging (development only)
 * 
 * Purpose:
 * - Logs all API requests in development mode
 * - Helps with debugging and development
 * - Disabled in production for performance
 * 
 * Security:
 * - OWASP #3 - Sensitive Data Exposure: Only logs in development
 * - Does not log request body (may contain sensitive data)
 */
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use(
    (config) => {
      // Log request method and URL (not body, to avoid logging sensitive data)
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  /**
   * Response interceptor for logging and error handling
   * 
   * Purpose:
   * - Logs successful responses in development
   * - Provides user-friendly error messages
   * - Handles network errors gracefully
   * 
   * Security:
   * - OWASP #3 - Sensitive Data Exposure: Error details only in development
   * - OWASP #7 - XSS: Error messages are text, not HTML
   */
  apiClient.interceptors.response.use(
    (response) => {
      // Log successful responses
      console.log(`[API Response] ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      // Handle network errors (backend not running)
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.error('[API Response Error] Backend server is not running. Please start the backend server on port 8000.');
      } else {
        // Extract error details from response
        // OWASP #3 - Sensitive Data Exposure: Only log in development
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

