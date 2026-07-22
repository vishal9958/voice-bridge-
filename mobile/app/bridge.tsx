import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export default function BridgeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { speakerId, speakerName } = useLocalSearchParams<{ speakerId: string; speakerName: string }>();
  const { currentUser } = useAuth();
  const { createRoom } = useApp();
  const [isCreating, setIsCreating] = useState(false);

  if (!currentUser) return null;

  async function handleCreateBridge() {
    if (!currentUser || !speakerId) return;
    setIsCreating(true);
    try {
      const room = await createRoom(currentUser.userId, speakerId, speakerName ?? 'Speaker');
      router.replace({
        pathname: '/call',
        params: {
          roomId: room.roomId,
          imageIndex: String(room.imageIndex),
          participantName: room.participantName,
          isHost: 'true',
          participantId: room.participantId,
        },
      });
    } catch {
      setIsCreating(false);
    }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bridge Call</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.infoCard}>
          <Feather name="info" size={18} color={colors.primary} />
          <Text style={s.infoText}>
            A bridge call connects two speakers. Both participants will discuss a randomly selected image. The conversation will be recorded for AI dataset collection.
          </Text>
        </View>

        {/* Host */}
        <Text style={s.sectionLabel}>Host (You)</Text>
        <View style={s.participantCard}>
          <View style={[s.avatar, { backgroundColor: colors.primary }]}>
            <Text style={s.avatarText}>{currentUser.fullName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={s.participantInfo}>
            <Text style={s.participantName}>{currentUser.fullName}</Text>
            <Text style={s.participantSub}>{currentUser.mobile} · {currentUser.state}</Text>
            <Text style={s.participantLangs}>{currentUser.recordingLanguages.join(', ')}</Text>
          </View>
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>HOST</Text>
          </View>
        </View>

        {/* Participant */}
        <Text style={s.sectionLabel}>Participant</Text>
        <View style={s.participantCard}>
          <View style={[s.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={s.avatarText}>{(speakerName ?? 'SP').slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={s.participantInfo}>
            <Text style={s.participantName}>{speakerName}</Text>
            <Text style={s.participantSub}>Speaker ID: {speakerId}</Text>
          </View>
          <Feather name="user" size={20} color={colors.mutedForeground} />
        </View>

        {/* Call requirements */}
        <Text style={s.sectionLabel}>Call Requirements</Text>
        <View style={s.requirementsCard}>
          {[
            { icon: 'clock' as const, text: 'Duration: 2 – 15 minutes' },
            { icon: 'image' as const, text: 'Random image shown to both speakers' },
            { icon: 'mic' as const, text: 'Full conversation recorded (host device)' },
            { icon: 'headphones' as const, text: 'Headset required' },
          ].map((item, i) => (
            <View key={i} style={s.reqRow}>
              <Feather name={item.icon} size={16} color={colors.primary} />
              <Text style={s.reqText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.createBtn, isCreating && s.createBtnDisabled]}
          onPress={handleCreateBridge}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="phone-call" size={20} color="#fff" />
              <Text style={s.createBtnText}>Create Bridge</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    content: { padding: 20, gap: 12 },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 14,
      gap: 10,
      alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 4,
    },
    participantCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
    participantInfo: { flex: 1 },
    participantName: { fontSize: 15, fontWeight: '700', color: colors.text },
    participantSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    participantLangs: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '500' },
    roleBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    requirementsCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      gap: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    reqText: { fontSize: 14, color: colors.text },
    createBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    createBtnDisabled: { opacity: 0.7 },
    createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
}
