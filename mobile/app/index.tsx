import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PERMISSIONS_KEY = 'vb_permissions_granted';

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const permsGranted = await AsyncStorage.getItem(PERMISSIONS_KEY);
        const currentUser = await AsyncStorage.getItem('vb_current_user');
        if (!permsGranted) {
          router.replace('/permissions');
        } else if (!currentUser) {
          router.replace('/auth');
        } else {
          router.replace('/home');
        }
      } catch {
        router.replace('/permissions');
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.logoWrapper}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.title}>VoiceBridge</Text>
      <Text style={styles.subtitle}>Connecting Voices for AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  logo: { width: 72, height: 72 },
  title: { fontSize: 32, fontWeight: '800', color: '#1C1C1E', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#8E8E93', letterSpacing: 0.3 },
});
