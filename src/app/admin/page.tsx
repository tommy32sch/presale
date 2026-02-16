'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Key,
  Clock,
  CheckCircle,
  ShoppingBag,
  Activity,
  Settings,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DashboardStats, ActivityEvent } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
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

    fetch('/api/admin/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActivities(data.activities);
        }
      })
      .catch(console.error)
      .finally(() => setActivitiesLoading(false));

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

  const handleSaveManualToken = async () => {
    if (!manualToken.trim()) {
      toast.error('Please enter an access token');
      return;
    }
    setSavingToken(true);
    try {
      const res = await fetch('/api/admin/shopify/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: manualToken.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Shopify connected successfully!');
        setShopifyConnected(true);
        setShowManualToken(false);
        setManualToken('');
      } else {
        toast.error(data.error || 'Failed to save token');
      }
    } catch {
      toast.error('Failed to save token');
    } finally {
      setSavingToken(false);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const health = stats?.productionHealth;
  const today = stats?.todayStatus;

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

      {/* Row 1: Today's Status + Production Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Status */}
        <Card className={`border-l-4 ${today?.hasDelayedOrders ? 'border-l-destructive' : 'border-l-status-success'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {today?.hasDelayedOrders ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <CheckCircle className="h-4 w-4 text-status-success" />
              )}
              Today&apos;s Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-lg font-semibold ${today?.hasDelayedOrders ? 'text-destructive' : 'text-status-success'}`}>
              {today?.message || 'All orders on schedule'}
            </p>
            {today?.hasDelayedOrders && (
              <Link href="/admin/orders?status=delayed">
                <p className="text-xs text-muted-foreground mt-1 hover:underline flex items-center gap-1">
                  View delayed orders <ArrowRight className="h-3 w-3" />
                </p>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Production Health */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Production Health
              </CardTitle>
              {health && (
                <Badge
                  variant={
                    health.healthStatus === 'healthy' ? 'success' :
                    health.healthStatus === 'warning' ? 'warning' : 'destructive'
                  }
                >
                  {health.healthStatus === 'healthy' ? 'Healthy' :
                   health.healthStatus === 'warning' ? 'Warning' : 'Critical'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {health && health.totalActive > 0 ? (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-bold text-status-success">{health.onTrack}</p>
                  <p className="text-xs text-muted-foreground">On Track</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-status-warning">{health.atRisk}</p>
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-destructive">{health.behind}</p>
                  <p className="text-xs text-muted-foreground">Behind</p>
                </div>
                <div className="ml-auto">
                  <Link href="/admin/settings">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <Settings className="h-3 w-3 mr-1" />
                      {health.targetDays}d target
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active orders with payment received yet.{' '}
                <Link href="/admin/settings" className="underline">Configure target</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/orders" className="block">
          <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalOrders ?? 0}</div>
              <p className="text-xs text-muted-foreground">All orders in the system</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/orders?status=active" className="block">
          <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer border-l-4 border-l-status-info">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-status-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.activeOrders ?? 0}</div>
              <p className="text-xs text-muted-foreground">Currently in production</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/orders?status=delayed" className="block">
          <Card className={`transition-all hover:shadow-md cursor-pointer border-l-4 border-l-destructive ${stats?.delayedOrders ? 'border-destructive hover:border-destructive/80' : 'hover:border-primary/20'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Delayed Orders</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats?.delayedOrders ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stats?.delayedOrders ? 'text-destructive' : ''}`}>
                {stats?.delayedOrders ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Row 3: Orders by Stage segmented bar */}
      {stats?.stageDistribution && stats.stageDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Orders by Stage</CardTitle>
            <CardDescription>Distribution of {stats.activeOrders} active orders across production stages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Segmented bar */}
            <TooltipProvider>
              <div className="flex h-6 w-full rounded-full overflow-hidden">
                {stats.stageDistribution.map((seg) => (
                  <Tooltip key={seg.stageId}>
                    <TooltipTrigger asChild>
                      <div
                        className={`${seg.color} transition-all hover:opacity-80 cursor-default`}
                        style={{ width: `${seg.percentage}%`, minWidth: seg.percentage > 0 ? '4px' : '0' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{seg.displayName}</p>
                      <p className="text-xs">{seg.count} order{seg.count !== 1 ? 's' : ''} ({seg.percentage}%)</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-2">
              {stats.stageDistribution.map((seg) => (
                <div key={seg.stageId} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-sm ${seg.color} shrink-0`} />
                  <span className="text-xs text-muted-foreground truncate">{seg.displayName}</span>
                  <span className="text-xs font-medium ml-auto">{seg.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 4: Quick Actions + Recent Activity + Shopify */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
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
                {(stats?.pendingNotifications ?? 0) > 0 && (
                  <Badge variant="warning" className="ml-2">{stats?.pendingNotifications}</Badge>
                )}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/messages">
              <Button variant="outline" className="w-full justify-between">
                Messages
                {(stats?.unreadMessages ?? 0) > 0 && (
                  <Badge variant="default" className="ml-2">{stats?.unreadMessages}</Badge>
                )}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-1">
                {activities.slice(0, 6).map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/admin/orders/${activity.orderId}`}
                    className="block"
                  >
                    <div className="flex items-start gap-2 p-1.5 -mx-1.5 rounded-md transition-colors hover:bg-muted cursor-pointer">
                      <div className="mt-0.5">
                        {activity.type === 'order_created' && (
                          <ShoppingBag className="h-3.5 w-3.5 text-status-pending" />
                        )}
                        {activity.type === 'stage_started' && (
                          <Clock className="h-3.5 w-3.5 text-status-info" />
                        )}
                        {activity.type === 'stage_completed' && (
                          <CheckCircle className="h-3.5 w-3.5 text-status-success" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          {activity.type === 'order_created' && (
                            <>
                              <span className="font-medium">{activity.orderNumber}</span>
                              {' '}created
                            </>
                          )}
                          {activity.type === 'stage_started' && (
                            <>
                              <span className="font-medium">{activity.orderNumber}</span>
                              {' '}started{' '}
                              <span className="font-medium">{activity.stageName}</span>
                            </>
                          )}
                          {activity.type === 'stage_completed' && (
                            <>
                              <span className="font-medium">{activity.orderNumber}</span>
                              {' '}completed{' '}
                              <span className="font-medium">{activity.stageName}</span>
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp))} ago
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Shopify Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Shopify
            </CardTitle>
            <CardDescription>Sync orders from your store</CardDescription>
          </CardHeader>
          <CardContent>
            {shopifyLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : shopifyConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-status-success">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button onClick={handleShopifySync} disabled={syncing} className="w-full" size="sm">
                  {syncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Orders
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect to import orders automatically.
                </p>
                {showManualToken ? (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="shpat_xxxxx..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveManualToken} disabled={savingToken} size="sm" className="flex-1">
                        {savingToken ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowManualToken(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button onClick={handleShopifyConnect} className="w-full" size="sm">
                      <Store className="mr-2 h-4 w-4" />
                      Connect Shopify
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowManualToken(true)} className="w-full">
                      <Key className="mr-2 h-4 w-4" />
                      Enter Token
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
