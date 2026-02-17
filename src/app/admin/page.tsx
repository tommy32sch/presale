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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.stats);
          setLastUpdated(new Date());
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatUpdatedAgo = () => {
    if (!lastUpdated) return '';
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return 'Updated just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Updated ${hours}h ago`;
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-[88px] w-full rounded-2xl" />
        <Skeleton className="h-[88px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-[130px] rounded-2xl" />
          <Skeleton className="h-[130px] rounded-2xl" />
        </div>
        <Skeleton className="h-[180px] w-full rounded-2xl" />
        <Skeleton className="h-[68px] w-full rounded-2xl" />
      </div>
    );
  }

  const health = stats?.productionHealth;
  const today = stats?.todayStatus;
  const hasDelays = today?.hasDelayedOrders;

  const dominantStage = stats?.stageDistribution?.reduce(
    (max, seg) => (seg.count > max.count ? seg : max),
    { displayName: '', count: 0, percentage: 0 } as { displayName: string; count: number; percentage: number }
  );

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Today's Status */}
      <Card className="rounded-2xl card-elevated transition-transform duration-200">
        <CardContent className="py-5 flex items-center gap-4">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            hasDelays
              ? 'bg-destructive/15 dark:bg-destructive/25 ring-1 ring-destructive/20'
              : 'bg-status-success/15 dark:bg-status-success/25 ring-1 ring-status-success/20'
          }`}>
            {hasDelays ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-status-success" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">Today&apos;s Status</p>
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
      <Card className="rounded-2xl card-elevated transition-transform duration-200">
        <CardContent className="py-5 flex items-center gap-4">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
            health?.healthStatus === 'critical'
              ? 'bg-destructive/15 dark:bg-destructive/25 ring-1 ring-destructive/20'
              : health?.healthStatus === 'warning'
                ? 'bg-status-warning/15 dark:bg-status-warning/25 ring-1 ring-status-warning/20'
                : 'bg-status-success/15 dark:bg-status-success/25 ring-1 ring-status-success/20'
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
            <p className="text-sm font-semibold tracking-tight">Production Health</p>
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
            <Card className="rounded-2xl card-elevated transition-transform duration-200 cursor-pointer overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <CardContent className="py-2.5 pl-5 pr-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Total Orders</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tighter">{stats?.totalOrders ?? 0}</span>
                      {(stats?.newTodayTotal ?? 0) > 0 && (
                        <span className="text-[10px] font-medium text-status-success">+{stats!.newTodayTotal}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatUpdatedAgo()}</p>
                  </div>
                  <svg width="56" height="24" viewBox="0 0 56 24" fill="none" className="text-status-success shrink-0">
                    <polyline points="0,18 9,15 18,17 28,11 37,13 47,7 56,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <linearGradient id="sparkGradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <polygon points="0,18 9,15 18,17 28,11 37,13 47,7 56,3 56,24 0,24" fill="url(#sparkGradTotal)" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/orders?status=active" className="block group">
            <Card className="rounded-2xl card-elevated transition-transform duration-200 cursor-pointer overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-status-info" />
              <CardContent className="py-2.5 pl-5 pr-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Active Orders</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tighter">{stats?.activeOrders ?? 0}</span>
                      {(stats?.newTodayTotal ?? 0) > 0 && (
                        <span className="text-[10px] font-medium text-status-info">+{stats!.newTodayTotal}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 mt-0.5">{formatUpdatedAgo()}</p>
                  </div>
                  <svg width="56" height="24" viewBox="0 0 56 24" fill="none" className="text-status-info shrink-0">
                    <polyline points="0,16 9,13 18,15 28,9 37,11 47,5 56,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <linearGradient id="sparkGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                    <polygon points="0,16 9,13 18,15 28,9 37,11 47,5 56,2 56,24 0,24" fill="url(#sparkGradActive)" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Orders by Stage */}
      <Card className="rounded-2xl card-elevated transition-transform duration-200">
        <CardContent className="py-5 space-y-4">
          <div>
            <p className="text-sm font-semibold tracking-tight">Orders by Stage</p>
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
                <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-muted/50 shadow-inner">
                  {stats.stageDistribution.map((seg, i) => (
                    <Tooltip key={seg.stageId}>
                      <TooltipTrigger asChild>
                        <div
                          className={`${seg.color} transition-all hover:brightness-110 cursor-default`}
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
              <div className="flex flex-col gap-2">
                {stats.stageDistribution.map((seg) => (
                  <div key={seg.stageId} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${seg.color} shadow-sm ring-1 ring-black/5 dark:ring-white/10`} />
                    <span className="text-xs text-muted-foreground">{seg.displayName}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-bold shadow-sm ml-auto">
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
        <Card className="rounded-2xl card-elevated transition-transform duration-200 cursor-pointer">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ${
                hasDelays
                  ? 'bg-status-warning/15 dark:bg-status-warning/20 ring-1 ring-status-warning/20'
                  : 'bg-status-success/10 dark:bg-status-success/15 ring-1 ring-status-success/15'
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
