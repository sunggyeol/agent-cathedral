import { NextResponse } from "next/server";

/**
 * Standard API response helpers for consistent JSON responses.
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response with data.
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const error: ApiErrorResponse["error"] = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return NextResponse.json(
    { success: false as const, error },
    { status }
  );
}

// Common error responses

export function badRequest(message: string, details?: unknown) {
  return errorResponse("BAD_REQUEST", message, 400, details);
}

export function notFound(message: string = "Resource not found") {
  return errorResponse("NOT_FOUND", message, 404);
}

export function rateLimited(resetIn: number) {
  return errorResponse(
    "RATE_LIMITED",
    `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    429,
    { resetIn }
  );
}

export function serverError(message: string = "Internal server error") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

export function validationError(issues: unknown) {
  return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, issues);
}
