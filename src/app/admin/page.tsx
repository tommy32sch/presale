'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
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
  XCircle,
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
        <Skeleton className="h-[88px] w-full rounded-2xl" />
        <Skeleton className="h-[88px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[120px] rounded-2xl" />
          <Skeleton className="h-[120px] rounded-2xl" />
        </div>
        <Skeleton className="h-[160px] w-full rounded-2xl" />
        <Skeleton className="h-[64px] w-full rounded-2xl" />
      </div>
    );
  }

  const health = stats?.productionHealth;
  const today = stats?.todayStatus;
  const hasDelays = today?.hasDelayedOrders;

  // Find the dominant stage (most orders)
  const dominantStage = stats?.stageDistribution?.reduce(
    (max, seg) => (seg.count > max.count ? seg : max),
    { displayName: '', count: 0, percentage: 0 } as { displayName: string; count: number; percentage: number }
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Today's Status */}
      <Card className={`rounded-2xl border-0 ${hasDelays ? 'bg-destructive/8 dark:bg-destructive/10' : 'bg-status-success-muted'}`}>
        <CardContent className="py-5 flex items-center gap-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            hasDelays
              ? 'bg-destructive/15 dark:bg-destructive/20'
              : 'bg-status-success/15 dark:bg-status-success/20'
          }`}>
            {hasDelays ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">Today&apos;s Status</p>
            <p className="text-sm font-medium mt-0.5">
              {hasDelays
                ? `${today.delayedCount} order${today.delayedCount !== 1 ? 's' : ''} behind schedule`
                : 'All production on schedule'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stats?.activeOrders ?? 0} orders in production
              {!hasDelays && ' \u00B7 Everything is on track'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Production Health */}
      <Card className={`rounded-2xl border-0 ${
        health?.healthStatus === 'critical'
          ? 'bg-destructive/8 dark:bg-destructive/10'
          : health?.healthStatus === 'warning'
            ? 'bg-status-warning-muted'
            : 'bg-status-success-muted'
      }`}>
        <CardContent className="py-5 flex items-center gap-4">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
            health?.healthStatus === 'critical'
              ? 'bg-destructive/15 dark:bg-destructive/20'
              : health?.healthStatus === 'warning'
                ? 'bg-status-warning/15 dark:bg-status-warning/20'
                : 'bg-status-success/15 dark:bg-status-success/20'
          }`}>
            {health?.healthStatus === 'critical' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : health?.healthStatus === 'warning' ? (
              <AlertTriangle className="h-5 w-5 text-status-warning" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Production Health</p>
            <p className="text-sm font-medium mt-0.5">
              {health?.healthStatus === 'healthy' || !health?.totalActive
                ? 'No delays detected'
                : health.healthStatus === 'warning'
                  ? `${health.atRisk + health.behind} order${(health.atRisk + health.behind) !== 1 ? 's' : ''} need attention`
                  : `${health.behind} order${health.behind !== 1 ? 's' : ''} behind schedule`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {health?.healthStatus === 'healthy' || !health?.totalActive
                ? 'All orders on schedule'
                : `${health.onTrack} on track \u00B7 ${health.atRisk} at risk \u00B7 ${health.behind} behind`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Orders + Active Orders */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Orders</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/orders" className="block group">
            <Card className="rounded-2xl border border-border/60 transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer group-hover:premium-glow overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl" />
              <CardContent className="py-5 pl-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Total Orders</span>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 dark:bg-primary/15 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">{stats?.totalOrders ?? 0}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-muted-foreground">All orders</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders?status=active" className="block group">
            <Card className="rounded-2xl border border-border/60 transition-all hover:shadow-lg hover:border-status-info/30 cursor-pointer overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-status-info rounded-l-2xl" />
              <CardContent className="py-5 pl-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">Active Orders</span>
                  <div className="h-8 w-8 rounded-lg bg-status-info/10 dark:bg-status-info/15 flex items-center justify-center">
                    <Package className="h-4 w-4 text-status-info" />
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight">{stats?.activeOrders ?? 0}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-muted-foreground">In production</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-status-info transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Orders by Stage */}
      <Card className="rounded-2xl">
        <CardContent className="py-5 space-y-4">
          <div>
            <p className="text-sm font-semibold">Orders by Stage</p>
            {dominantStage && dominantStage.count > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-semibold text-foreground">{dominantStage.percentage}%</span>{' '}
                {dominantStage.displayName}
                {' \u00B7 '}
                <span className="font-medium">{stats?.activeOrders ?? 0}</span> active
              </p>
            )}
          </div>

          {stats?.stageDistribution && stats.stageDistribution.length > 0 ? (
            <>
              {/* Segmented bar */}
              <TooltipProvider>
                <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted/50">
                  {stats.stageDistribution.map((seg, i) => (
                    <Tooltip key={seg.stageId}>
                      <TooltipTrigger asChild>
                        <div
                          className={`${seg.color} transition-all hover:brightness-110 cursor-default ${
                            i === 0 ? 'rounded-l-full' : ''
                          } ${i === stats.stageDistribution.length - 1 ? 'rounded-r-full' : ''}`}
                          style={{ width: `${seg.percentage}%`, minWidth: seg.percentage > 0 ? '6px' : '0' }}
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
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {stats.stageDistribution.map((seg) => (
                  <div key={seg.stageId} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${seg.color}`} />
                    <span className="text-[11px] text-muted-foreground">{seg.displayName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
                      {seg.count}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                Alerts: {(stats?.delayedOrders ?? 0) > 0
                  ? <span className="text-status-warning font-medium">{stats.delayedOrders} delayed</span>
                  : <span className="text-status-success font-medium">None</span>}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No active orders yet</p>
          )}
        </CardContent>
      </Card>

      {/* Bottom summary */}
      <Link href="/admin/orders?status=delayed" className="block group">
        <Card className="rounded-2xl border border-border/60 transition-all hover:shadow-md cursor-pointer">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                hasDelays
                  ? 'bg-status-warning/15 dark:bg-status-warning/20'
                  : 'bg-status-success/10 dark:bg-status-success/15'
              }`}>
                {hasDelays ? (
                  <AlertTriangle className="h-4 w-4 text-status-warning" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-status-success" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {hasDelays
                    ? `${today.delayedCount} delayed order${today.delayedCount !== 1 ? 's' : ''}`
                    : 'No delays detected'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {hasDelays ? 'Requires attention' : 'All orders are on track'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
              View details
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
