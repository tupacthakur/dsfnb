import { ZodError } from 'zod';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

interface Meta {
  requestId: string;
  timestamp: string;
  version: string;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: Meta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown | null;
  };
  meta: Meta;
}

function buildMeta(requestId?: string): Meta {
  return {
    requestId: requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
    version: '1',
  };
}

export function ok<T>(data: T, requestId?: string) {
  const body: SuccessEnvelope<T> = {
    success: true,
    data,
    meta: buildMeta(requestId),
  };
  return NextResponse.json(body, { status: 200 });
}

export function created<T>(data: T, requestId?: string) {
  const body: SuccessEnvelope<T> = {
    success: true,
    data,
    meta: buildMeta(requestId),
  };
  return NextResponse.json(body, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
) {
  const normalizedCode = code.toUpperCase();
  const formattedDetails =
    details instanceof ZodError ? details.flatten() : details ?? null;

  const body: ErrorEnvelope = {
    success: false,
    error: {
      code: normalizedCode,
      message,
      details: formattedDetails,
    },
    meta: buildMeta(requestId),
  };

  return NextResponse.json(body, { status });
}

export function validationError(error: ZodError, requestId?: string) {
  return errorResponse(
    422,
    'VALIDATION_ERROR',
    'Request validation failed',
    error,
    requestId,
  );
}

