import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  // Read-only metrics & prompt metadata are safe without auth
  '/api/metrics/kpi',
  '/api/analytics/prompts',
];

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitBucket>();

function getLimitForPath(pathname: string): number {
  if (pathname.startsWith('/api/chat/')) {
    return Number(process.env.RATE_LIMIT_CHAT ?? 60);
  }
  if (pathname.startsWith('/api/ingest/')) {
    return Number(process.env.RATE_LIMIT_INGEST ?? 20);
  }
  if (pathname.startsWith('/api/sage/')) {
    return Number(process.env.RATE_LIMIT_SAGE ?? 30);
  }
  if (pathname.startsWith('/api/tig/')) {
    return 60;
  }
  return 120;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow unauthenticated access for read-only or low-risk endpoints
  if (
    pathname.startsWith('/api/metrics/') ||
    pathname.startsWith('/api/analytics/') ||
    pathname.startsWith('/api/chat/')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          details: null,
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1',
        },
      },
      { status: 401 },
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const limit = getLimitForPath(pathname);
    const key = `${token}:${pathname}`;
    const now = Date.now();
    const windowMs = 60_000;

    const bucket = rateLimitStore.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    } else if (bucket.count >= limit) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            details: null,
          },
          meta: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            version: '1',
          },
        },
        { status: 429 },
      );
    } else {
      bucket.count += 1;
    }

    return NextResponse.next();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication failed',
          details: null,
        },
        meta: {
          requestId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          version: '1',
        },
      },
      { status: 500 },
    );
  }
}

export const config = {
  matcher: ['/api/:path*'],
};

