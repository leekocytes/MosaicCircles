import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';

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
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </AuthProvider>
  );
}