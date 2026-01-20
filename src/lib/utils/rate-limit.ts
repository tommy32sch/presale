import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a rate limiter that allows 5 requests per minute per IP
// Falls back to no rate limiting if Upstash is not configured
let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Check if properly configured (not placeholder values)
  if (!url || !token || !url.startsWith('https://') || url.includes('your_')) {
    return null;
  }

  const redis = new Redis({
    url,
    token,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
    analytics: true,
    prefix: 'presale-tracker',
  });

  return ratelimit;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for an identifier (usually IP address)
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  if (!limiter) {
    // Rate limiting disabled - allow all requests
    return {
      success: true,
      limit: 5,
      remaining: 5,
      reset: Date.now() + 60000,
    };
  }

  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check various headers that might contain the real IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelForwarded = headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim();
  }

  // Fallback
  return 'unknown';
}
