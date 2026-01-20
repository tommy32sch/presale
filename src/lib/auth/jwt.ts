import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-change-in-production'
);

const COOKIE_NAME = 'admin_token';
const TOKEN_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  sub: string; // admin user id
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Create a JWT token for an admin user
 */
export async function createToken(user: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Set the auth cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Get the auth cookie
 */
export async function getAuthCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Clear the auth cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Get the current authenticated admin user from cookie
 */
export async function getAuthenticatedAdmin(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;

  return verifyToken(token);
}
