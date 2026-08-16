import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { cn } from '@/utils/cn';

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  label: string; // accessibilityLabel — icon-only buttons must always have one
  className?: string;
}

export function IconButton({ icon, size = 20, color = '#3f3f46', label, className, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true, radius: 20 }}
      hitSlop={8}
      className={cn('h-11 w-11 items-center justify-center rounded-full active:opacity-70', className)}
      {...props}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}
