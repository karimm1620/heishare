import React from 'react';
import { Text, View } from 'react-native';

import { cn } from '@/utils/cn';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'bg-muted',
  primary: 'bg-accent',
  success: 'bg-success/15',
  warning: 'bg-warning/15',
  destructive: 'bg-destructive/15',
};

const TONE_TEXT_STYLES: Record<BadgeTone, string> = {
  neutral: 'text-muted-foreground',
  primary: 'text-accent-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <View className={cn('flex-row items-center rounded-full px-2.5 py-1', TONE_STYLES[tone])}>
      <Text className={cn('text-xs font-medium', TONE_TEXT_STYLES[tone])}>{children}</Text>
    </View>
  );
}
