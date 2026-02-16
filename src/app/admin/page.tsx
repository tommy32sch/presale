'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { DashboardStats } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const health = stats?.productionHealth;
  const today = stats?.todayStatus;

  // Find the dominant stage (most orders)
  const dominantStage = stats?.stageDistribution?.reduce(
    (max, seg) => (seg.count > max.count ? seg : max),
    { displayName: '', count: 0, percentage: 0 } as { displayName: string; count: number; percentage: number }
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Today's Status */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {today?.hasDelayedOrders ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success" />
            )}
            Today&apos;s Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${today?.hasDelayedOrders ? 'bg-destructive' : 'bg-status-success'}`} />
            <span className="text-sm text-muted-foreground">
              {today?.hasDelayedOrders
                ? `${today.delayedCount} order${today.delayedCount !== 1 ? 's' : ''} behind schedule`
                : 'All orders on schedule'}
              {' '}&middot;{' '}
              {today?.hasDelayedOrders ? 'Attention needed' : 'Everything is on track'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Production Health */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {health?.healthStatus === 'healthy' || !health ? (
              <CheckCircle className="h-5 w-5 text-status-success" />
            ) : health.healthStatus === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-status-warning" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            Production Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health && health.totalActive > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {health.healthStatus === 'healthy'
                  ? 'No delays detected'
                  : health.healthStatus === 'warning'
                    ? `${health.behind} order${health.behind !== 1 ? 's' : ''} behind, ${health.atRisk} at risk`
                    : `${health.behind} order${health.behind !== 1 ? 's' : ''} behind schedule`}
              </p>
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-status-success" />
                  <span className="text-muted-foreground">On Track</span>
                  <span className="font-semibold">{health.onTrack}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-status-warning" />
                  <span className="text-muted-foreground">At Risk</span>
                  <span className="font-semibold">{health.atRisk}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Behind</span>
                  <span className="font-semibold">{health.behind}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No delays detected</p>
          )}
        </CardContent>
      </Card>

      {/* Total Orders + Active Orders */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/orders" className="block">
          <Card className="rounded-xl border-l-4 border-l-primary transition-all hover:shadow-md cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalOrders ?? 0}</div>
              <p className="text-xs text-muted-foreground">All orders in the system</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/orders?status=active" className="block">
          <Card className="rounded-xl border-l-4 border-l-status-info transition-all hover:shadow-md cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.activeOrders ?? 0}</div>
              <p className="text-xs text-muted-foreground">Currently in production</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Delayed Orders */}
      <Link href="/admin/orders?status=delayed" className="block">
        <Card className={`rounded-xl border-l-4 transition-all hover:shadow-md cursor-pointer ${stats?.delayedOrders ? 'border-l-status-warning' : 'border-l-status-warning/40'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Delayed Orders</CardTitle>
            <AlertTriangle className={`h-5 w-5 ${stats?.delayedOrders ? 'text-status-warning' : 'text-muted-foreground/40'}`} />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats?.delayedOrders
                ? `${stats.delayedOrders} order${stats.delayedOrders !== 1 ? 's' : ''} require attention`
                : 'No attention needed'}
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Orders by Stage */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Orders by Stage</CardTitle>
          {dominantStage && dominantStage.count > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{dominantStage.percentage}%</span>{' '}
              {dominantStage.displayName}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.stageDistribution && stats.stageDistribution.length > 0 ? (
            <>
              {/* Segmented bar */}
              <TooltipProvider>
                <div className="flex h-5 w-full rounded-full overflow-hidden">
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
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {stats.stageDistribution.map((seg) => (
                  <div key={seg.stageId} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
                    <span className="text-xs text-muted-foreground">{seg.displayName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
                      {seg.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active orders yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
