import { NextRequest, NextResponse } from 'next/server';
import { Carrier } from '@/types';
import { checkConfiguredRateLimit, getClientIP } from '@/lib/utils/rate-limit';

interface TrackingEvent {
  date: string;
  description: string;
  location?: string;
  status: 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
}

interface TrackingInfo {
  status: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

// This is a mock implementation - replace with actual carrier APIs or Ship24
// Ship24 API: https://www.ship24.com/api
async function getTrackingInfo(
  carrier: Carrier,
  trackingNumber: string
): Promise<TrackingInfo | null> {
  const ship24ApiKey = process.env.SHIP24_API_KEY;

  // If Ship24 is configured, use it
  if (ship24ApiKey) {
    try {
      const response = await fetch('https://api.ship24.com/public/v1/trackers/track', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ship24ApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackingNumber,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Transform Ship24 response to our format
        if (data.trackings && data.trackings.length > 0) {
          const tracking = data.trackings[0];
          return {
            status: mapShip24Status(tracking.shipment?.statusMilestone),
            estimatedDelivery: tracking.shipment?.estimatedDeliveryDate,
            events: (tracking.events || []).map((event: { datetime: string; status: string; location: { city: string; country: string } }) => ({
              date: event.datetime,
              description: event.status,
              location: event.location ? `${event.location.city}, ${event.location.country}` : undefined,
              status: 'in_transit',
            })),
          };
        }
      }
    } catch (error) {
      console.error('Ship24 API error:', error);
    }
  }

  // Fallback: Return mock data for demo purposes
  // In production, integrate with carrier-specific APIs
  return getMockTrackingData(carrier, trackingNumber);
}

function mapShip24Status(status: string | undefined): string {
  switch (status) {
    case 'delivered':
      return 'delivered';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'in_transit':
    case 'pending':
      return 'in_transit';
    case 'exception':
    case 'failed':
      return 'exception';
    default:
      return 'in_transit';
  }
}

function getMockTrackingData(carrier: Carrier, trackingNumber: string): TrackingInfo {
  // Generate mock events based on tracking number hash
  const hash = trackingNumber.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const daysAgo = hash % 7;

  const now = new Date();
  const events: TrackingEvent[] = [];

  // Generate some mock events
  for (let i = daysAgo; i >= 0; i--) {
    const eventDate = new Date(now);
    eventDate.setDate(eventDate.getDate() - i);

    if (i === daysAgo) {
      events.push({
        date: eventDate.toISOString(),
        description: 'Package picked up',
        location: 'Origin Facility',
        status: 'in_transit',
      });
    } else if (i === Math.floor(daysAgo / 2)) {
      events.push({
        date: eventDate.toISOString(),
        description: 'In transit to destination',
        location: 'Distribution Center',
        status: 'in_transit',
      });
    } else if (i === 1) {
      events.push({
        date: eventDate.toISOString(),
        description: 'Arrived at local facility',
        location: 'Local Post Office',
        status: 'in_transit',
      });
    } else if (i === 0) {
      events.push({
        date: eventDate.toISOString(),
        description: 'Out for delivery',
        location: 'On Delivery Vehicle',
        status: 'out_for_delivery',
      });
    }
  }

  // Estimate delivery
  const estimatedDelivery = new Date(now);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 1);

  return {
    status: daysAgo === 0 ? 'out_for_delivery' : 'in_transit',
    estimatedDelivery: estimatedDelivery.toISOString(),
    events: events.reverse(), // Most recent first
  };
}

export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request.headers);
    const rateLimit = await checkConfiguredRateLimit(`shipping-track:${clientIP}`, 'shipping-track', 30, '1 m');
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait and try again.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const carrier = searchParams.get('carrier') as Carrier;
    const trackingNumber = searchParams.get('tracking_number');

    if (!carrier || !trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Carrier and tracking number are required' },
        { status: 400 }
      );
    }

    const validCarriers: Carrier[] = ['fedex', 'ups', 'usps', 'dhl'];
    if (!validCarriers.includes(carrier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid carrier' },
        { status: 400 }
      );
    }

    const tracking = await getTrackingInfo(carrier, trackingNumber);

    if (!tracking) {
      return NextResponse.json(
        { success: false, error: 'Unable to fetch tracking information' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tracking,
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
