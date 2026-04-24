import type { Response } from "express";

export function formatError(message: string, details: unknown = null) {
  return {
    error: message,
    ...(details ? { details } : {}),
  };
}

export function handleError(
  res: Response,
  status = 500,
  message = "Server error",
  details: unknown = null
) {
  return res.status(status).json(formatError(message, details));
}

export function logAndHandleError(
  res: Response,
  error: unknown,
  context = "Unexpected error"
) {
  console.error(`${context}:`, error);
  return handleError(res, 500, "Internal server error");
}
