// Shapes the API sends, shared by the dashboard and the mobile app.

/** Every error response: the standard NestJS shape. Validation errors list one message per field. */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  /** Set on business errors (see ApiErrorCode); the apps translate it. */
  code?: string;
  /** Extra numbers for the message, e.g. seconds to wait or tries left. */
  retryIn?: number;
  triesLeft?: number;
}

/** GET /v1/health */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  version: string;
  /** ISO time on the server. */
  time: string;
}
