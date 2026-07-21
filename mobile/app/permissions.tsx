import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const PERMISSIONS_KEY = 'vb_permissions_granted';

type PermStatus = 'pending' | 'granted' | 'denied';

interface PermItem {
  key: 'location' | 'microphone' | 'headset';
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  status: PermStatus;
}

export default function PermissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [location, setLocation] = useState<PermStatus>('pending');
  const [microphone, setMicrophone] = useState<PermStatus>('pending');
  const [headset, setHeadset] = useState<PermStatus>('pending');
  const [isProceeding, setIsProceeding] = useState(false);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocation(status === 'granted' ? 'granted' : 'denied');
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Location access is required to continue.');
    }
  }

  async function requestMicrophone() {
    const { status } = await Audio.requestPermissionsAsync();
    setMicrophone(status === 'granted' ? 'granted' : 'denied');
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Microphone access is required for voice recording.');
    }
  }

  function confirmHeadset() {
    setHeadset('granted');
  }

  const allGranted = location === 'granted' && microphone === 'granted' && headset === 'granted';

  async function proceed() {
    if (!allGranted) return;
    setIsProceeding(true);
    await AsyncStorage.setItem(PERMISSIONS_KEY, 'true');
    router.replace('/auth');
  }

  const items: PermItem[] = [
    {
      key: 'location',
      icon: 'map-pin',
      title: 'Location Access',
      description: 'Required for speaker registration and verification.',
      status: location,
    },
    {
      key: 'microphone',
      icon: 'mic',
      title: 'Microphone Access',
      description: 'Required for voice recording and bridge calls.',
      status: microphone,
    },
    {
      key: 'headset',
      icon: 'headphones',
      title: 'Headset Connected',
      description: 'Connect wired or Bluetooth earphones before continuing.',
      status: headset,
    },
  ];

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>App Permissions</Text>
        <Text style={s.headerSub}>Grant the following to use VoiceBridge</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {items.map((item) => (
          <View key={item.key} style={s.card}>
            <View style={[s.iconWrap, { backgroundColor: item.status === 'granted' ? colors.muted : '#FFF3E0' }]}>
              <Feather
                name={item.icon}
                size={24}
                color={item.status === 'granted' ? colors.primary : colors.warning}
              />
            </View>
            <View style={s.cardText}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDesc}>{item.description}</Text>
            </View>
            <View style={s.cardAction}>
              {item.status === 'granted' ? (
                <View style={s.grantedBadge}>
                  <Feather name="check" size={14} color={colors.primary} />
                </View>
              ) : item.status === 'denied' ? (
                <TouchableOpacity
                  style={s.retryBtn}
                  onPress={item.key === 'location' ? requestLocation : item.key === 'microphone' ? requestMicrophone : confirmHeadset}
                >
                  <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.allowBtn}
                  onPress={item.key === 'location' ? requestLocation : item.key === 'microphone' ? requestMicrophone : confirmHeadset}
                >
                  <Text style={s.allowText}>{item.key === 'headset' ? 'Connected' : 'Allow'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {headset === 'pending' && (
          <View style={s.headsetNote}>
            <Feather name="info" size={14} color={colors.warning} />
            <Text style={s.headsetNoteText}>
              Please connect wired or Bluetooth earphones before continuing. Tap "Connected" above once they're connected.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.proceedBtn, !allGranted && s.proceedBtnDisabled]}
          onPress={proceed}
          disabled={!allGranted || isProceeding}
        >
          <Text style={s.proceedText}>Continue to VoiceBridge</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 28,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
    headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
    content: { padding: 20, gap: 12 },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    iconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
    cardDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    cardAction: { alignItems: 'center' },
    grantedBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    allowBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    allowText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    retryBtn: {
      backgroundColor: '#FFF3E0',
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    retryText: { color: colors.warning, fontSize: 13, fontWeight: '600' },
    headsetNote: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: '#FFF8E1',
      borderRadius: 10,
      padding: 12,
      alignItems: 'flex-start',
    },
    headsetNoteText: { flex: 1, fontSize: 13, color: colors.warning, lineHeight: 18 },
    proceedBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    proceedBtnDisabled: { backgroundColor: colors.border },
    proceedText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
