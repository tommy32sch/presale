'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { OrderWithProgress, Stage, StageStatus } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Truck,
  AlertTriangle,
  Bell,
  Loader2,
  CheckCircle,
  Clock,
  Circle,
} from 'lucide-react';

const carriers = [
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'usps', label: 'USPS' },
  { value: 'dhl', label: 'DHL' },
];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithProgress | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch order
        const orderRes = await fetch(`/api/admin/orders/${params.orderId}`);
        const orderData = await orderRes.json();
        if (orderData.success) {
          setOrder(orderData.order);
          setCarrier(orderData.order.carrier || '');
          setTrackingNumber(orderData.order.tracking_number || '');
          setIsDelayed(orderData.order.is_delayed);
        }

        // Fetch stages
        const stagesRes = await fetch('/api/admin/stages');
        const stagesData = await stagesRes.json();
        if (stagesData.success) {
          setStages(stagesData.stages);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.orderId]);

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: carrier || null,
          tracking_number: trackingNumber || null,
          is_delayed: isDelayed,
        }),
      });

      if (res.ok) {
        toast.success('Order updated');
      } else {
        toast.error('Failed to update order');
      }
    } catch {
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProgress = async (
    stageId: number,
    status: StageStatus,
    queueNotification: boolean = false
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${params.orderId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_id: stageId,
          status,
          queue_notification: queueNotification,
        }),
      });

      if (res.ok) {
        toast.success('Progress updated');
        // Refresh order data
        const orderRes = await fetch(`/api/admin/orders/${params.orderId}`);
        const orderData = await orderRes.json();
        if (orderData.success) {
          setOrder(orderData.order);
        }
      } else {
        toast.error('Failed to update progress');
      }
    } catch {
      toast.error('Failed to update progress');
    }
  };

  const getProgressForStage = (stageId: number) => {
    return order?.progress?.find((p) => p.stage_id === stageId);
  };

  const getStatusIcon = (status: StageStatus | undefined) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/admin/orders">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
              {order.is_delayed && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Delayed
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(order.created_at), 'PPP')}
            </p>
          </div>
        </div>
        <Button onClick={handleSaveOrder} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{order.customer_name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{order.customer_email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">{order.customer_phone}</p>
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Items</Label>
              <p className="font-medium">{order.items_description}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-medium">{order.quantity}</p>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
            <Separator />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="delayed"
                checked={isDelayed}
                onCheckedChange={(checked) => setIsDelayed(checked === true)}
              />
              <Label htmlFor="delayed" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Mark as Delayed
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Stages */}
      <Card>
        <CardHeader>
          <CardTitle>Production Progress</CardTitle>
          <CardDescription>
            Update the order status through each stage. Notifications will be queued for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage) => {
              const progress = getProgressForStage(stage.id);
              const currentStatus = progress?.status || 'not_started';

              return (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(currentStatus)}
                    <div>
                      <p className="font-medium">{stage.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {stage.description}
                      </p>
                      {progress?.completed_at && (
                        <p className="text-xs text-green-600">
                          Completed: {format(new Date(progress.completed_at), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={currentStatus}
                      onValueChange={(value) =>
                        handleUpdateProgress(stage.id, value as StageStatus, false)
                      }
                      disabled={currentStatus === 'completed'}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {currentStatus !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateProgress(
                            stage.id,
                            currentStatus === 'not_started' ? 'in_progress' : 'completed',
                            true
                          )
                        }
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Update & Notify
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
