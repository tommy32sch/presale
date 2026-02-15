'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderProgressWithStage, StageStatus } from '@/types';
import {
  CreditCard,
  Send,
  Package,
  Hammer,
  CheckCircle,
  Truck,
  Home,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HorizontalTimelineProps {
  progress: OrderProgressWithStage[];
  lastUpdated?: string;
}

const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard,
  Send,
  Package,
  Hammer,
  CheckCircle,
  Truck,
  Home,
};

function getStageIcon(iconName: string | null) {
  if (iconName && stageIcons[iconName]) {
    return stageIcons[iconName];
  }
  return CheckCircle;
}

function getStatusClasses(status: StageStatus): {
  icon: string;
  line: string;
  bg: string;
} {
  switch (status) {
    case 'completed':
      return {
        icon: 'bg-status-success border-status-success text-white',
        line: 'bg-status-success',
        bg: 'bg-status-success-muted',
      };
    case 'in_progress':
      return {
        icon: 'bg-status-info border-status-info text-white animate-pulse',
        line: 'bg-muted-foreground/30',
        bg: 'bg-status-info-muted',
      };
    default:
      return {
        icon: 'bg-muted border-muted-foreground/30 text-muted-foreground',
        line: 'bg-muted-foreground/30',
        bg: '',
      };
  }
}

export function HorizontalTimeline({ progress, lastUpdated }: HorizontalTimelineProps) {
  const completedCount = progress.filter((p) => p.status === 'completed').length;

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Order Progress</span>
            <span className="text-muted-foreground">
              {completedCount} of {progress.length} stages
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-status-success h-2 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / progress.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Horizontal timeline */}
        <div className="relative flex items-center justify-between">
          {progress.map((item, index) => {
            const Icon = getStageIcon(item.stage?.icon_name || null);
            const classes = getStatusClasses(item.status);
            const isLast = index === progress.length - 1;

            return (
              <div key={item.id} className="flex items-center flex-1 last:flex-none">
                {/* Stage node */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative flex flex-col items-center cursor-pointer',
                        classes.bg && 'px-2 py-1 rounded-lg'
                      )}
                    >
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full border-2 flex items-center justify-center',
                          classes.icon
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={cn(
                          'text-xs mt-2 text-center max-w-[80px] truncate',
                          item.status === 'completed' && 'text-status-success',
                          item.status === 'in_progress' && 'text-status-info font-medium',
                          item.status === 'not_started' && 'text-muted-foreground'
                        )}
                      >
                        {item.stage?.display_name.split(' ')[0]}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{item.stage?.display_name}</p>
                      <p className="text-muted-foreground">{item.stage?.description}</p>
                      {item.completed_at && (
                        <p className="text-xs mt-1 text-status-success">
                          Completed {formatDistanceToNow(new Date(item.completed_at))} ago
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                {/* Connecting line */}
                {!isLast && (
                  <div className={cn('flex-1 h-0.5 mx-2', classes.line)} />
                )}
              </div>
            );
          })}
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Last updated: {formatDistanceToNow(new Date(lastUpdated))} ago
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
