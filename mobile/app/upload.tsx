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
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import AudioPlayer from '@/components/AudioPlayer';

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordingId, roomId, duration } = useLocalSearchParams<{
    recordingId: string;
    roomId: string;
    duration: string;
  }>();
  const { getRoomRecording, updateRecording } = useApp();

  const recording = getRoomRecording(roomId ?? '');
  const durationSec = parseInt(duration ?? '0', 10);

  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(recording?.uploaded ?? false);
  const [deleted, setDeleted] = useState(false);

  async function handleUpload() {
    if (!recording || uploaded) return;
    setIsUploading(true);
    // Simulate upload delay (Firebase Storage would go here)
    await new Promise((res) => setTimeout(res, 2000));
    await updateRecording(recording.recordingId, { uploaded: true });
    setUploaded(true);
    setIsUploading(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDelete() {
    setDeleted(true);
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.headerIcon}>
          <Feather name="upload-cloud" size={22} color="#fff" />
        </View>
        <View>
          <Text style={s.headerTitle}>Upload Recording</Text>
          <Text style={s.headerSub}>Room: {roomId}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Success state */}
        {uploaded && (
          <View style={s.successBanner}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={s.successText}>Recording uploaded successfully!</Text>
          </View>
        )}

        {/* Recording details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Recording Details</Text>
          <View style={s.detailRow}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={s.detailLabel}>Duration</Text>
            <Text style={s.detailValue}>{formatTime(durationSec)}</Text>
          </View>
          <View style={s.detailRow}>
            <Feather name="hash" size={14} color={colors.mutedForeground} />
            <Text style={s.detailLabel}>Room ID</Text>
            <Text style={s.detailValue} numberOfLines={1}>{roomId}</Text>
          </View>
          <View style={s.detailRow}>
            <Feather name="calendar" size={14} color={colors.mutedForeground} />
            <Text style={s.detailLabel}>Recorded</Text>
            <Text style={s.detailValue}>{recording ? new Date(recording.createdAt).toLocaleString() : '—'}</Text>
          </View>
          <View style={s.detailRow}>
            <Feather name="cloud" size={14} color={colors.mutedForeground} />
            <Text style={s.detailLabel}>Status</Text>
            <View style={[s.statusBadge, { backgroundColor: uploaded ? colors.muted : '#FFF3E0' }]}>
              <Text style={[s.statusText, { color: uploaded ? colors.success : colors.warning }]}>
                {uploaded ? 'Uploaded' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        {/* Audio player */}
        {recording?.audioUri && !deleted ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Playback</Text>
            <AudioPlayer
              uri={recording.audioUri}
              onDelete={!uploaded ? handleDelete : undefined}
            />
            {deleted && <Text style={s.deletedNote}>Recording deleted</Text>}
          </View>
        ) : deleted ? (
          <View style={s.card}>
            <View style={s.deletedState}>
              <Feather name="trash-2" size={24} color={colors.border} />
              <Text style={s.deletedStateText}>Recording deleted</Text>
            </View>
          </View>
        ) : (
          <View style={s.card}>
            <View style={s.noAudio}>
              <Feather name="alert-circle" size={24} color={colors.border} />
              <Text style={s.noAudioText}>No audio file available</Text>
            </View>
          </View>
        )}

        {/* Metadata note */}
        <View style={s.metaNote}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={s.metaNoteText}>
            Uploading saves the recording and metadata (host ID, participant ID, room ID, duration, image ID) to the dataset server.
          </Text>
        </View>

        {/* Action buttons */}
        {!uploaded && !deleted && (
          <TouchableOpacity
            style={[s.uploadBtn, isUploading && s.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.uploadBtnText}>Uploading…</Text>
              </>
            ) : (
              <>
                <Feather name="upload-cloud" size={20} color="#fff" />
                <Text style={s.uploadBtnText}>Upload Recording</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/home')}>
          <Text style={s.homeBtnText}>{uploaded ? 'Back to Home' : 'Skip — Return Home'}</Text>
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    content: { padding: 20, gap: 14 },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.muted,
      borderRadius: colors.radius,
      padding: 14,
    },
    successText: { fontSize: 14, fontWeight: '600', color: colors.success },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    detailLabel: { fontSize: 14, color: colors.mutedForeground, flex: 1, marginLeft: 4 },
    detailValue: { fontSize: 14, color: colors.text, fontWeight: '500', maxWidth: 180 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '700' },
    deletedNote: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 8 },
    deletedState: { alignItems: 'center', padding: 20, gap: 8 },
    deletedStateText: { fontSize: 14, color: colors.mutedForeground },
    noAudio: { alignItems: 'center', padding: 20, gap: 8 },
    noAudioText: { fontSize: 14, color: colors.mutedForeground },
    metaNote: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: 10,
      padding: 12,
      alignItems: 'flex-start',
    },
    metaNoteText: { flex: 1, fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
    uploadBtn: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 4,
    },
    uploadBtnDisabled: { opacity: 0.7 },
    uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    homeBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: 'center',
    },
    homeBtnText: { fontSize: 15, color: colors.mutedForeground, fontWeight: '600' },
  });
}
