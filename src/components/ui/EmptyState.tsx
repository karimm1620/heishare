import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-8 py-12">
      <View className="mb-2 h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Ionicons name={icon} size={26} color="#a1a1aa" />
      </View>
      <Text className="text-center text-base font-medium text-foreground">{title}</Text>
      {description ? (
        <Text className="text-center text-sm text-muted-foreground">{description}</Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
