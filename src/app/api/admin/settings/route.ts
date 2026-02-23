import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-settings:${clientIP}`, 'admin-settings', 60, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const supabase = db();
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      // Table may not exist yet — return defaults
      return NextResponse.json({
        success: true,
        settings: {
          id: 'default',
          production_target_days: 30,
          notify_on_stage_change: true,
          notify_on_delay: true,
        },
      });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { production_target_days, notify_on_stage_change, notify_on_delay } = body;

    if (production_target_days !== undefined) {
      if (typeof production_target_days !== 'number' || production_target_days < 1 || production_target_days > 365) {
        return NextResponse.json(
          { success: false, error: 'Target days must be between 1 and 365' },
          { status: 400 }
        );
      }
    }

    const supabase = db();
    const updates: Record<string, unknown> = {};
    if (production_target_days !== undefined) updates.production_target_days = production_target_days;
    if (notify_on_stage_change !== undefined) updates.notify_on_stage_change = notify_on_stage_change;
    if (notify_on_delay !== undefined) updates.notify_on_delay = notify_on_delay;

    const { error } = await supabase
      .from('app_settings')
      .update(updates)
      .eq('id', 'default');

    if (error) {
      console.error('Settings update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
