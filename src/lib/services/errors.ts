/**
 * Typed service errors — decoupled from HTTP.
 * API routes map these to appropriate HTTP responses.
 */
export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusHint: number = 400,
    public readonly extra?: Record<string, unknown>
  ) {
    super(code);
    this.name = "ServiceError";
  }
}

// Convenience factories
export const unauthorized = (code = "UNAUTHORIZED") => new ServiceError(code, 401);
export const forbidden = (code = "FORBIDDEN") => new ServiceError(code, 403);
export const notFound = (code = "NOT_FOUND") => new ServiceError(code, 404);
export const conflict = (code: string) => new ServiceError(code, 409);
export const rateLimited = () => new ServiceError("RATE_LIMITED", 429);
export const badRequest = (code: string, extra?: Record<string, unknown>) =>
  new ServiceError(code, 400, extra);
export const internal = (code = "INTERNAL_ERROR") => new ServiceError(code, 500);
