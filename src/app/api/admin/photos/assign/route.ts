import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  const clientIP = getClientIP(request.headers);
  const rateLimit = await checkConfiguredRateLimit(`admin-photos-assign:${clientIP}`, 'admin-photos-assign', 60, '1 m');
  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { photo_ids, order_ids, stage_id } = body;

    if (!photo_ids?.length || !order_ids?.length) {
      return NextResponse.json(
        { success: false, error: 'Photo IDs and Order IDs are required' },
        { status: 400 }
      );
    }

    if (!stage_id) {
      return NextResponse.json(
        { success: false, error: 'Stage ID is required' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Update photos with stage_id
    const { error: updateError } = await supabase
      .from('photos')
      .update({ stage_id })
      .in('id', photo_ids);

    if (updateError) {
      console.error('Photo stage update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update photo stage' },
        { status: 500 }
      );
    }

    // Create junction records for each photo-order pair
    const records = [];
    for (const photoId of photo_ids) {
      for (const orderId of order_ids) {
        records.push({
          photo_id: photoId,
          order_id: orderId,
        });
      }
    }

    // Upsert to handle duplicates
    const { error } = await supabase
      .from('order_photos')
      .upsert(records, { onConflict: 'order_id,photo_id' });

    if (error) {
      console.error('Photo assignment error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to assign photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assigned: records.length,
    });
  } catch (error) {
    console.error('Photo assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photo_id');
    const orderId = searchParams.get('order_id');

    if (!photoId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Photo ID and Order ID are required' },
        { status: 400 }
      );
    }

    const supabase = db();

    const { error } = await supabase
      .from('order_photos')
      .delete()
      .eq('photo_id', photoId)
      .eq('order_id', orderId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to unassign photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo unassign error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
