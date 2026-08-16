import { Host, Switch as ComposeSwitch } from '@expo/ui/jetpack-compose';
import React from 'react';
import { Platform, Switch as RNSwitch } from 'react-native';

interface PlatformSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}

/**
 * Android gets the real Material 3 Switch via @expo/ui/jetpack-compose,
 * matching 04-ui-ux.md §9 ("use @expo/ui only where the native control
 * provides a real platform benefit... every component must be inside the
 * required Host"). Every other platform falls back to React Native's
 * built-in Switch rather than forcing Compose everywhere.
 */
export function PlatformSwitch({ value, onValueChange, label }: PlatformSwitchProps) {
  if (Platform.OS === 'android') {
    return (
      <Host style={{ width: 52, height: 32 }} matchContents>
        {/* @expo/ui's Compose Switch has no accessibilityLabel prop —
            `label` here is cosmetic documentation, not applied to the view. */}
        <ComposeSwitch value={value} onCheckedChange={onValueChange} />
      </Host>
    );
  }
  return (
    <RNSwitch value={value} onValueChange={onValueChange} accessibilityLabel={label} trackColor={{ true: '#2563eb' }} />
  );
}
