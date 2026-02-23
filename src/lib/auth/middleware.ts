import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, refreshTokenIfNeeded, setAuthCookie } from './jwt';

/**
 * Middleware helper to protect admin API routes
 * Returns the admin payload if authenticated, or an error response
 */
export async function requireAdmin(request: NextRequest) {
  // Get token from cookie
  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return {
      authenticated: false as const,
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return {
      authenticated: false as const,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      ),
    };
  }

  // Sliding window: refresh token if older than 12 hours
  try {
    const newToken = await refreshTokenIfNeeded(payload);
    if (newToken) {
      await setAuthCookie(newToken);
    }
  } catch {
    // Non-critical — continue with existing token
  }

  return {
    authenticated: true as const,
    admin: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    },
  };
}

/**
 * Helper to wrap an admin-only API handler
 */
export function withAdminAuth<T extends { params?: Promise<Record<string, string>> }>(
  handler: (
    request: NextRequest,
    context: T,
    admin: { id: string; email: string; name: string }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    const auth = await requireAdmin(request);

    if (!auth.authenticated) {
      return auth.response;
    }

    return handler(request, context, auth.admin);
  };
}
