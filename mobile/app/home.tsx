import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth, User } from '@/context/AuthContext';
import { getSocket } from '@/services/socket';

function avatarInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function ProfileCard({ user, colors }: { user: User; colors: ReturnType<typeof useColors> }) {
  const s = styles(colors);
  return (
    <View style={s.profileCard}>
      <View style={s.profileAvatar}>
        <Text style={s.profileAvatarText}>{avatarInitials(user.fullName)}</Text>
      </View>
      <View style={s.profileInfo}>
        <Text style={s.profileName}>{user.fullName}</Text>
        <Text style={s.profileSub}>{user.mobile} · {user.state}</Text>
        <View style={s.profileBadges}>
          {user.voiceVerified && (
            <View style={[s.badge, { borderColor: colors.primary }]}>
              <Feather name="check-circle" size={11} color={colors.primary} />
              <Text style={[s.badgeText, { color: colors.primary }]}>Voice Verified</Text>
            </View>
          )}
          {user.recordingLanguages.slice(0, 2).map((lang) => (
            <View key={lang} style={s.badge}>
              <Text style={s.badgeText}>{lang}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SpeakerCard({ user, onSelect, colors }: { user: User; onSelect: (u: User) => void; colors: ReturnType<typeof useColors> }) {
  const s = styles(colors);
  return (
    <TouchableOpacity style={s.speakerCard} onPress={() => onSelect(user)} activeOpacity={0.7}>
      <View style={s.speakerAvatar}>
        <Text style={s.speakerAvatarText}>{avatarInitials(user.fullName)}</Text>
      </View>
      <View style={s.speakerInfo}>
        <Text style={s.speakerName}>{user.fullName}</Text>
        <Text style={s.speakerSub}>{user.district}, {user.state}</Text>
        <Text style={s.speakerId}>ID: {user.userId}  ·  {user.recordingLanguages.slice(0,2).join(', ')}</Text>
      </View>
      {user.voiceVerified && (
        <Feather name="check-circle" size={16} color={colors.primary} style={{ marginRight: 2 }} />
      )}
      <Feather name="chevron-right" size={18} color={colors.border} />
    </TouchableOpacity>
  );
}



export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentUser, users, searchUsers, fetchSpeakerFromBackend, logout } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const results = searchUsers(searchQuery);
  const s = styles(colors);

  const handlePerformSearch = useCallback(() => {
    const q = searchInput.trim();
    setSearchQuery(q);
    if (q.length >= 6) {
      fetchSpeakerFromBackend(q);
    }
  }, [searchInput, fetchSpeakerFromBackend]);

  useEffect(() => {
    if (!currentUser) return;

    let isSubscribed = true;

    getSocket()
      .then((socket) => {
        if (!isSubscribed) return;

        socket.on('incoming-call', (payload: any) => {
          console.log('[Socket] Incoming call received:', payload);
          setIncomingCall({
            id: payload.roomId,
            hostId: payload.hostId,
            offer: payload.offer,
            imageIndex: payload.imageIndex,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        });

        socket.on('call-ended', (payload: any) => {
          if (payload.roomId === incomingCall?.id) {
            setIncomingCall(null);
          }
        });
      })
      .catch((err) => console.log('Socket incoming call setup error:', err));

    return () => {
      isSubscribed = false;
      getSocket()
        .then((socket) => {
          socket.off('incoming-call');
          socket.off('call-ended');
        })
        .catch(() => {});
    };
  }, [currentUser, incomingCall]);

  if (!currentUser) return null;

  const hostUser = incomingCall ? users.find(u => u.userId === incomingCall.hostId) : null;
  const hostName = hostUser ? hostUser.fullName : 'Another Speaker';

  function handleSelectSpeaker(speaker: User) {
    router.push({ pathname: '/bridge', params: { speakerId: speaker.userId, speakerName: speaker.fullName } });
  }

  async function handleLogout() {
    await logout();
    router.replace('/auth');
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {incomingCall && (
        <View style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: 20,
        }}>
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 24,
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
            gap: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8,
          }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: colors.accent,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Feather name="phone-call" size={28} color={colors.primary} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Incoming Bridge Call</Text>
              <Text style={{ fontSize: 14, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' }}>
                {hostName} is inviting you to a conversation.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', width: '100%', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.destructive,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (incomingCall) {
                    try {
                      const socket = await getSocket();
                      socket.emit('end-call', { roomId: incomingCall.id, targetId: incomingCall.hostId });
                    } catch (e) {}
                    setIncomingCall(null);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => {
                  if (incomingCall) {
                    router.push({
                      pathname: '/call',
                      params: {
                        roomId: incomingCall.id,
                        imageIndex: String(incomingCall.imageIndex ?? 0),
                        participantName: hostName,
                        isHost: 'false',
                        hostId: incomingCall.hostId,
                        offer: JSON.stringify(incomingCall.offer),
                      },
                    });
                    setIncomingCall(null);
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Join Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      {/* Classic white header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Hello, {currentUser.fullName.split(' ')[0]} 👋</Text>
          <Text style={s.headerSub}>Find a speaker to start a bridge call</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(u) => u.userId}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View>
            <ProfileCard user={currentUser} colors={colors} />

            <Text style={s.sectionLabel}>Search Speaker</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={[s.searchRow, { flex: 1 }]}>
                <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Name, mobile, or speaker ID…"
                  placeholderTextColor={colors.mutedForeground}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={handlePerformSearch}
                  autoCapitalize="none"
                />
                {searchInput ? (
                  <TouchableOpacity onPress={() => { setSearchInput(''); setSearchQuery(''); }}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                onPress={handlePerformSearch}
              >
                <Feather name="search" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Search</Text>
              </TouchableOpacity>
            </View>
            {results.length > 0 && (
              <Text style={s.resultCount}>{results.length} speaker{results.length !== 1 ? 's' : ''} available</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <SpeakerCard user={item} onSelect={handleSelectSpeaker} colors={colors} />
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="users" size={36} color={colors.border} />
            <Text style={s.emptyTitle}>No speakers found</Text>
            <Text style={s.emptyDesc}>Try a different name, mobile, or ID</Text>
          </View>
        }
      />
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      backgroundColor: colors.card,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    headerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 1 },
    logoutBtn: { padding: 8 },

    profileCard: {
      backgroundColor: colors.card,
      margin: 16,
      marginBottom: 12,
      borderRadius: colors.radius,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: { color: '#fff', fontWeight: '700', fontSize: 19 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
    profileSub: { fontSize: 13, color: colors.mutedForeground, marginBottom: 6 },
    profileBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '500' },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.text },
    resultCount: { fontSize: 12, color: colors.mutedForeground, marginHorizontal: 16, marginBottom: 6 },

    speakerCard: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: colors.radius,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    speakerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    speakerAvatarText: { color: colors.primary, fontWeight: '700', fontSize: 16 },
    speakerInfo: { flex: 1 },
    speakerName: { fontSize: 15, fontWeight: '600', color: colors.text },
    speakerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 1 },
    speakerId: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },

    emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.mutedForeground },
    emptyDesc: { fontSize: 14, color: colors.border, textAlign: 'center' },
  });
}
