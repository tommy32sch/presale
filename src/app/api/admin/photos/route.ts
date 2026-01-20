import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const unassigned = searchParams.get('unassigned') === 'true';
    const stageId = searchParams.get('stage_id');

    const supabase = db();

    let query = supabase
      .from('photos')
      .select(`
        *,
        stage:stages(display_name),
        order_photos(order_id)
      `)
      .order('uploaded_at', { ascending: false });

    if (stageId) {
      query = query.eq('stage_id', parseInt(stageId));
    }

    const { data: photos, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    // Filter unassigned if requested
    let filteredPhotos = photos || [];
    if (unassigned) {
      filteredPhotos = filteredPhotos.filter(
        (p) => !p.order_photos || p.order_photos.length === 0
      );
    }

    return NextResponse.json({
      success: true,
      photos: filteredPhotos,
    });
  } catch (error) {
    console.error('Photos fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { cloudinary_public_id, cloudinary_url, caption, stage_id } = body;

    if (!cloudinary_public_id || !cloudinary_url) {
      return NextResponse.json(
        { success: false, error: 'Cloudinary ID and URL are required' },
        { status: 400 }
      );
    }

    const supabase = db();

    const { data: photo, error } = await supabase
      .from('photos')
      .insert({
        cloudinary_public_id,
        cloudinary_url,
        caption: caption || null,
        stage_id: stage_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to save photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      photo,
    });
  } catch (error) {
    console.error('Photo save error:', error);
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID required' },
        { status: 400 }
      );
    }

    const supabase = db();

    // Delete photo (will cascade delete order_photos)
    const { error } = await supabase.from('photos').delete().eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Photo delete error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
