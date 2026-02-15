'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Carrier } from '@/types';
import { format } from 'date-fns';
import {
  Truck,
  Package,
  CheckCircle,
  MapPin,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface ShippingTrackerProps {
  carrier: Carrier;
  trackingNumber: string;
}

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

const carrierInfo: Record<Carrier, { name: string; trackingUrl: (num: string) => string }> = {
  fedex: {
    name: 'FedEx',
    trackingUrl: (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
  },
  ups: {
    name: 'UPS',
    trackingUrl: (num) => `https://www.ups.com/track?tracknum=${num}`,
  },
  usps: {
    name: 'USPS',
    trackingUrl: (num) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`,
  },
  dhl: {
    name: 'DHL',
    trackingUrl: (num) => `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${num}`,
  },
};

export function ShippingTracker({ carrier, trackingNumber }: ShippingTrackerProps) {
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carrierDetails = carrierInfo[carrier];

  const fetchTracking = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/shipping/track?carrier=${carrier}&tracking_number=${trackingNumber}`);
      const data = await res.json();

      if (data.success) {
        setTracking(data.tracking);
      } else {
        setError(data.error || 'Unable to fetch tracking info');
      }
    } catch {
      setError('Unable to fetch tracking info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [carrier, trackingNumber]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-status-success" />;
      case 'out_for_delivery':
        return <Truck className="h-5 w-5 text-status-info animate-pulse" />;
      case 'in_transit':
        return <Package className="h-5 w-5 text-status-warning" />;
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-status-success">Delivered</Badge>;
      case 'out_for_delivery':
        return <Badge className="bg-status-info">Out for Delivery</Badge>;
      case 'in_transit':
        return <Badge variant="secondary">In Transit</Badge>;
      case 'exception':
        return <Badge variant="destructive">Exception</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <CardTitle className="text-lg">Shipping Tracking</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTracking}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          {carrierDetails.name} - {trackingNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">{error}</p>
            <a
              href={carrierDetails.trackingUrl(trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                Track on {carrierDetails.name}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        ) : tracking ? (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-4">
              {getStatusIcon(tracking.status)}
              <div>
                {getStatusBadge(tracking.status)}
                {tracking.estimatedDelivery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Estimated: {format(new Date(tracking.estimatedDelivery), 'PPP')}
                  </p>
                )}
              </div>
            </div>

            {/* Events timeline */}
            {tracking.events.length > 0 && (
              <div className="relative pl-6 space-y-4 mt-4">
                {tracking.events.slice(0, 5).map((event, index) => (
                  <div key={index} className="relative">
                    {index < tracking.events.length - 1 && (
                      <div className="absolute left-[-18px] top-6 w-0.5 h-full bg-muted-foreground/30" />
                    )}
                    <div
                      className={`absolute left-[-22px] top-1 w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-primary' : 'bg-muted-foreground/50'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{event.description}</p>
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), 'PPp')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Link to carrier */}
            <a
              href={carrierDetails.trackingUrl(trackingNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              View full tracking on {carrierDetails.name}
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        ) : (
          <p className="text-muted-foreground">No tracking information available</p>
        )}
      </CardContent>
    </Card>
  );
}
