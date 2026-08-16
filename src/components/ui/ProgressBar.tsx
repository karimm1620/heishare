import React from 'react';
import { View } from 'react-native';

import { cn } from '@/utils/cn';

interface ProgressBarProps {
  /** 0..1. Callers (TransfersProvider) already coalesce native progress
   *  events, so this component itself does no additional throttling —
   *  see 06-performance-and-size.md §4 and 04-ui-ux.md §7. */
  progress: number;
  tone?: 'primary' | 'success' | 'destructive';
  className?: string;
}

const TONE_STYLES = {
  primary: 'bg-primary',
  success: 'bg-success',
  destructive: 'bg-destructive',
} as const;

function ProgressBarBase({ progress, tone = 'primary', className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View className={cn('h-full rounded-full', TONE_STYLES[tone])} style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}

export const ProgressBar = React.memo(ProgressBarBase);
