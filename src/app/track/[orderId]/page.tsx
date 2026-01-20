'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { OrderWithProgress } from '@/types';
import { VerticalTimeline, HorizontalTimeline } from '@/components/customer/Timeline';
import { NotificationOptIn } from '@/components/customer/NotificationOptIn';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  ArrowLeft,
  Truck,
  ExternalLink,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';

export default function TrackOrderPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOptIn, setShowOptIn] = useState(false);

  useEffect(() => {
    // Try to get order from sessionStorage first
    const cachedOrder = sessionStorage.getItem('orderData');
    if (cachedOrder) {
      const parsed = JSON.parse(cachedOrder);
      if (parsed.id === params.orderId) {
        setOrder(parsed);
        setLoading(false);
        // Show opt-in if not already opted in
        if (!parsed.notification_preferences?.sms_enabled && !parsed.notification_preferences?.email_enabled) {
          setShowOptIn(true);
        }
        return;
      }
    }

    // If not in sessionStorage, redirect to lookup
    router.push('/');
  }, [params.orderId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <span className="font-bold text-lg">Order Tracker</span>
            </div>
          </div>
        </header>
        <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find your order. Please try looking it up again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Lookup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get tracking URL based on carrier
  const getTrackingUrl = () => {
    if (!order.carrier || !order.tracking_number) return null;

    const trackingUrls: Record<string, string> = {
      fedex: `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`,
      ups: `https://www.ups.com/track?tracknum=${order.tracking_number}`,
      usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`,
      dhl: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${order.tracking_number}`,
    };

    return trackingUrls[order.carrier] || null;
  };

  const trackingUrl = getTrackingUrl();
  const currentStage = order.progress.find((p) => p.status === 'in_progress');
  const lastCompletedStage = [...order.progress]
    .reverse()
    .find((p) => p.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Package className="h-6 w-6" />
              <span className="font-bold text-lg">Order Tracker</span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                New Lookup
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-2xl">
        {/* Order header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
            {order.is_delayed && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Delayed
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{order.items_description}</p>
          {order.quantity > 1 && (
            <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
          )}
        </div>

        {/* Current status card */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            {currentStage ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-medium">{currentStage.stage?.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {currentStage.stage?.description}
                  </p>
                </div>
              </div>
            ) : lastCompletedStage ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium">{lastCompletedStage.stage?.display_name}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Processing your order...</p>
            )}
          </CardContent>
        </Card>

        {/* Tracking info (if shipped) */}
        {order.tracking_number && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-muted-foreground">Carrier:</span>{' '}
                  <span className="font-medium uppercase">{order.carrier}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Tracking Number:</span>{' '}
                  <span className="font-mono">{order.tracking_number}</span>
                </p>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Track on carrier website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline - vertical on mobile, horizontal on larger screens */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Order Timeline</CardTitle>
            <CardDescription>
              Track your order through each stage of production
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: Vertical timeline */}
            <div className="md:hidden">
              <VerticalTimeline
                progress={order.progress}
                photos={order.photos}
                lastUpdated={order.updated_at}
              />
            </div>
            {/* Desktop: Horizontal timeline */}
            <div className="hidden md:block">
              <HorizontalTimeline
                progress={order.progress}
                lastUpdated={order.updated_at}
              />
              {/* Show vertical timeline below for details on desktop */}
              <Separator className="my-6" />
              <VerticalTimeline
                progress={order.progress}
                photos={order.photos}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact/Message section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Have a question about your order? Send us a message and we&apos;ll get back to you.
            </p>
            <Button variant="outline" className="w-full">
              <MessageCircle className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Notification opt-in modal */}
      {showOptIn && (
        <NotificationOptIn
          orderId={order.id}
          onClose={() => setShowOptIn(false)}
          onOptIn={(prefs) => {
            setOrder({
              ...order,
              notification_preferences: prefs,
            });
            setShowOptIn(false);
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Questions about your order? We're here to help.</p>
        </div>
      </footer>
    </div>
  );
}
