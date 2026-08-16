import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProviders } from '@/store/AppProviders';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="send" options={{ presentation: 'modal', headerShown: true, title: 'Send' }} />
            <Stack.Screen name="receive" options={{ presentation: 'modal', headerShown: true, title: 'Receiving' }} />
            <Stack.Screen
              name="incoming/[transferId]"
              options={{ presentation: 'formSheet', headerShown: false }}
            />
            <Stack.Screen
              name="transfer/[transferId]"
              options={{ headerShown: true, title: 'Transfer' }}
            />
            <Stack.Screen name="device/[deviceId]" options={{ headerShown: true, title: 'Device' }} />
          </Stack>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
