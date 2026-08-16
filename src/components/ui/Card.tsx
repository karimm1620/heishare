import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

export function Card({ className, ...props }: ViewProps) {
  return <View className={cn('rounded-lg border border-border bg-card p-4', className)} {...props} />;
}
