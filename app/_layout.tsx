import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    window.frameworkReady?.();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}