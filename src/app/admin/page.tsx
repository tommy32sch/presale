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
  ChevronRight,
  ArrowRight,
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
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
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

  const hasDelays = today?.hasDelayedOrders;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Today's Status */}
      <Card className="rounded-xl">
        <CardHeader className="pb-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {hasDelays ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success" />
            )}
            Today&apos;s Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm font-medium">
            {hasDelays
              ? `${today.delayedCount} order${today.delayedCount !== 1 ? 's' : ''} behind schedule`
              : 'All production on schedule'}
          </p>
          <p className="text-xs text-muted-foreground">
            {stats?.activeOrders ?? 0} orders in production
            {!hasDelays && ' \u00B7 Everything is on track'}
          </p>
        </CardContent>
      </Card>

      {/* Production Health */}
      <Card className="rounded-xl">
        <CardHeader className="pb-1">
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
        <CardContent className="space-y-1">
          <p className="text-sm font-medium">
            {health?.healthStatus === 'healthy' || !health?.totalActive
              ? 'No delays detected'
              : health.healthStatus === 'warning'
                ? `${health.atRisk + health.behind} order${(health.atRisk + health.behind) !== 1 ? 's' : ''} need attention`
                : `${health.behind} order${health.behind !== 1 ? 's' : ''} behind schedule`}
          </p>
          <p className="text-xs text-muted-foreground">
            {health?.healthStatus === 'healthy' || !health?.totalActive
              ? 'All orders on schedule'
              : `${health.onTrack} on track \u00B7 ${health.atRisk} at risk \u00B7 ${health.behind} behind`}
          </p>
        </CardContent>
      </Card>

      {/* Total Orders section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground px-1">Total Orders</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/admin/orders" className="block">
            <Card className="rounded-xl border-l-4 border-l-primary transition-all hover:shadow-md cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalOrders ?? 0}</div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">All orders in the system</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
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
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">Currently in production</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Orders by Stage */}
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Orders by Stage</CardTitle>
          {dominantStage && dominantStage.count > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{dominantStage.percentage}%</span>{' '}
              {dominantStage.displayName}
              {' \u00B7 '}
              {stats?.activeOrders ?? 0}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {stats?.stageDistribution && stats.stageDistribution.length > 0 ? (
            <>
              {/* Segmented bar */}
              <TooltipProvider>
                <div className="flex h-4 w-full rounded-full overflow-hidden">
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
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {stats.stageDistribution.map((seg) => (
                  <div key={seg.stageId} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${seg.color}`} />
                    <span className="text-xs text-muted-foreground">{seg.displayName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">
                      {seg.count}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <p className="text-xs text-muted-foreground pt-1 border-t">
                Alerts: {(stats?.delayedOrders ?? 0) > 0 ? `${stats.delayedOrders} delayed` : 'None'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active orders yet</p>
          )}
        </CardContent>
      </Card>

      {/* Bottom summary */}
      <Link href="/admin/orders?status=delayed" className="block">
        <Card className="rounded-xl transition-all hover:shadow-md cursor-pointer">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {hasDelays
                  ? `${today.delayedCount} delayed order${today.delayedCount !== 1 ? 's' : ''}`
                  : 'No delays detected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {hasDelays ? 'Requires attention' : 'All orders are on track'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              View details
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
