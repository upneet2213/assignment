import { NextResponse } from "next/server";

// Every API error response follows the same shape, so clients can rely on
// `error.message` always being present and human-readable, regardless of
// which endpoint or failure mode produced it.
export const apiError = (status: number, message: string, details?: unknown) =>
  NextResponse.json(
    { error: { message, ...(details !== undefined && { details }) } },
    { status },
  );

export const apiSuccess = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });
