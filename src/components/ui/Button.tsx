import React from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '@/utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, { container: string; text: string; ripple: string }> = {
  primary: { container: 'bg-primary', text: 'text-primary-foreground', ripple: 'rgba(255,255,255,0.16)' },
  secondary: { container: 'bg-muted', text: 'text-foreground', ripple: 'rgba(0,0,0,0.08)' },
  destructive: { container: 'bg-destructive', text: 'text-destructive-foreground', ripple: 'rgba(255,255,255,0.16)' },
  ghost: { container: 'bg-transparent', text: 'text-foreground', ripple: 'rgba(0,0,0,0.06)' },
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  default: 'h-12 px-5',
  sm: 'h-9 px-3.5',
  lg: 'h-14 px-6',
  icon: 'h-11 w-11 px-0',
};

const TEXT_SIZE_STYLES: Record<ButtonSize, string> = {
  default: 'text-base',
  sm: 'text-sm',
  lg: 'text-lg',
  icon: 'text-base',
};

/** Minimum comfortable touch target — see 04-ui-ux.md §10 (accessibility). */
export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: styles.ripple }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-md active:opacity-90',
        styles.container,
        SIZE_STYLES[size],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? undefined : '#fff'} />
      ) : typeof children === 'string' ? (
        <Text className={cn('font-medium', styles.text, TEXT_SIZE_STYLES[size])}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
