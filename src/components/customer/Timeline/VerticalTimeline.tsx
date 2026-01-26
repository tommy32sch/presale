'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { OrderProgressWithStage, Photo, StageStatus } from '@/types';
import {
  CreditCard,
  Send,
  Package,
  Hammer,
  CheckCircle,
  Truck,
  Home,
  Clock,
  ChevronDown,
  ChevronUp,
  ImageIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VerticalTimelineProps {
  progress: OrderProgressWithStage[];
  photos?: Photo[];
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

function getStatusColor(status: StageStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500 border-green-500';
    case 'in_progress':
      return 'bg-blue-500 border-blue-500 animate-pulse';
    default:
      return 'bg-muted border-muted-foreground/30';
  }
}

function getStatusBadge(status: StageStatus) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500">Completed</Badge>;
    case 'in_progress':
      return <Badge variant="default" className="bg-blue-500">In Progress</Badge>;
    default:
      return <Badge variant="secondary">Upcoming</Badge>;
  }
}

export function VerticalTimeline({ progress, photos = [], lastUpdated }: VerticalTimelineProps) {
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());

  const toggleExpanded = (stageId: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const completedCount = progress.filter((p) => p.status === 'completed').length;

  // Group photos by stage
  const photosByStage = photos.reduce<Record<number, Photo[]>>((acc, photo) => {
    if (photo.stage_id) {
      if (!acc[photo.stage_id]) {
        acc[photo.stage_id] = [];
      }
      acc[photo.stage_id].push(photo);
    }
    return acc;
  }, {});

  return (
    <div className="relative">
      {/* Progress summary */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Order Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount} of {progress.length} stages complete
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / progress.length) * 100}%` }}
          />
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {formatDistanceToNow(new Date(lastUpdated))} ago
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {progress.map((item, index) => {
          const Icon = getStageIcon(item.stage?.icon_name || null);
          const isExpanded = expandedStages.has(item.stage_id);
          const isCompleted = item.status === 'completed';
          const isInProgress = item.status === 'in_progress';
          const isLast = index === progress.length - 1;
          const stagePhotos = photosByStage[item.stage_id] || [];

          return (
            <div key={item.id} className="relative pb-8 last:pb-0">
              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-5 top-10 w-0.5 h-full -ml-px',
                    isCompleted ? 'bg-green-500' : 'bg-muted-foreground/30'
                  )}
                />
              )}

              {/* Stage content */}
              <div
                className={cn(
                  'relative flex gap-4 cursor-pointer transition-all',
                  isInProgress && 'bg-blue-500/10 -mx-4 px-4 py-3 rounded-lg'
                )}
                onClick={() => toggleExpanded(item.stage_id)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0',
                    getStatusColor(item.status)
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isCompleted || isInProgress ? 'text-white' : 'text-muted-foreground'
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        'font-semibold',
                        isCompleted && 'text-green-600 dark:text-green-400',
                        isInProgress && 'text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {item.stage?.display_name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {stagePhotos.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <ImageIcon className="w-3 h-3 mr-1" />
                          {stagePhotos.length}
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(item.status)}
                  </div>

                  {/* Date started / completed / projected */}
                  <div className="mt-2 text-xs space-y-0.5">
                    {item.started_at && (
                      <p className="text-muted-foreground">
                        Started: {format(new Date(item.started_at), 'MMM d, yyyy')}
                      </p>
                    )}
                    {item.completed_at && (
                      <p className="text-muted-foreground">
                        Completed: {format(new Date(item.completed_at), 'MMM d, yyyy')}
                      </p>
                    )}
                    {isInProgress && item.estimated_end_date && (
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Projected completion: {format(new Date(item.estimated_end_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-muted-foreground">{item.stage?.description}</p>

                      {/* Date estimates */}
                      {(item.estimated_start_date || item.estimated_end_date) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {item.estimated_start_date && item.estimated_end_date ? (
                            <span>
                              Est. {format(new Date(item.estimated_start_date), 'MMM d')} -{' '}
                              {format(new Date(item.estimated_end_date), 'MMM d')}
                            </span>
                          ) : item.estimated_end_date ? (
                            <span>Est. completion: {format(new Date(item.estimated_end_date), 'MMM d')}</span>
                          ) : null}
                        </div>
                      )}

                      {/* Photos */}
                      {stagePhotos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Photos from this stage:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {stagePhotos.map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square rounded-lg overflow-hidden bg-muted"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  src={photo.cloudinary_url}
                                  alt={photo.caption || 'Production photo'}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin notes (if any) */}
                      {item.admin_notes && (
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-1">Note:</p>
                          <p className="text-muted-foreground">{item.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
