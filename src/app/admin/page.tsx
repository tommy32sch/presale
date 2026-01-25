'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Bell,
  MessageSquare,
  Upload,
  ArrowRight,
  Store,
  RefreshCw,
  Loader2,
  Check,
} from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  delayedOrders: number;
  pendingNotifications: number;
  unreadMessages: number;
  ordersByStage: { stage: string; count: number }[];
}

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Check for Shopify connection status in URL
    const shopifyStatus = searchParams.get('shopify');
    if (shopifyStatus === 'connected') {
      toast.success('Shopify connected successfully!');
    } else if (searchParams.get('error')) {
      toast.error('Failed to connect Shopify: ' + searchParams.get('error'));
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check Shopify connection
    fetch('/api/admin/shopify/sync')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setShopifyConnected(data.connected);
        }
      })
      .catch(console.error)
      .finally(() => setShopifyLoading(false));
  }, []);

  const handleShopifyConnect = () => {
    window.location.href = '/api/admin/shopify/auth';
  };

  const handleShopifySync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/shopify/sync', {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Synced ${data.imported} orders (${data.skipped} skipped)`);
        // Refresh stats
        const statsRes = await fetch('/api/admin/stats');
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your presale orders</p>
        </div>
        <Link href="/admin/orders/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Orders
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              All orders in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOrders ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently in production
            </p>
          </CardContent>
        </Card>

        <Card className={stats?.delayedOrders ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delayed Orders</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats?.delayedOrders ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.delayedOrders ? 'text-destructive' : ''}`}>
              {stats?.delayedOrders ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className={stats?.pendingNotifications ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Notifications</CardTitle>
            <Bell className={`h-4 w-4 ${stats?.pendingNotifications ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.pendingNotifications ? 'text-yellow-500' : ''}`}>
              {stats?.pendingNotifications ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orders by Stage</CardTitle>
            <CardDescription>Distribution across production stages</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.ordersByStage && stats.ordersByStage.length > 0 ? (
              <div className="space-y-2">
                {stats.ordersByStage.map((item) => (
                  <div key={item.stage} className="flex items-center justify-between">
                    <span className="text-sm">{item.stage}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/orders/upload">
              <Button variant="outline" className="w-full justify-between">
                Upload Orders CSV
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/photos">
              <Button variant="outline" className="w-full justify-between">
                Manage Photos
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/notifications">
              <Button variant="outline" className="w-full justify-between">
                Review Notifications
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </CardTitle>
            <CardDescription>Customer inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.unreadMessages ? (
              <div>
                <p className="text-2xl font-bold text-primary">{stats.unreadMessages}</p>
                <p className="text-sm text-muted-foreground">unread messages</p>
                <Link href="/admin/messages">
                  <Button variant="outline" className="mt-4 w-full">
                    View Messages
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No unread messages</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shopify Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shopify Integration
          </CardTitle>
          <CardDescription>
            Sync orders automatically from your Shopify store
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shopifyLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : shopifyConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Connected to Shopify</span>
              </div>
              <Button onClick={handleShopifySync} disabled={syncing} className="w-full">
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Orders from Shopify
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Shopify store to automatically import orders.
              </p>
              <Button onClick={handleShopifyConnect} className="w-full">
                <Store className="mr-2 h-4 w-4" />
                Connect Shopify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
