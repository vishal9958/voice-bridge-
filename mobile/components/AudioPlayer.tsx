import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  uri: string;
  onDelete?: () => void;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function AudioPlayer({ uri, onDelete }: Props) {
  const colors = useColors();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
      soundRef.current = sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setDuration(status.durationMillis ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [uri]);

  useEffect(() => {
    load();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      soundRef.current?.unloadAsync();
    };
  }, [load]);

  async function togglePlay() {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.positionMillis === status.durationMillis) {
        await soundRef.current.setPositionAsync(0);
        setPosition(0);
      }
      await soundRef.current.playAsync();
      setIsPlaying(true);
      intervalRef.current = setInterval(async () => {
        if (!soundRef.current) return;
        const s = await soundRef.current.getStatusAsync();
        if (s.isLoaded) {
          setPosition(s.positionMillis ?? 0);
          if (!s.isPlaying) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      }, 300);
    }
  }

  async function seekTo(ratio: number) {
    if (!soundRef.current || !duration) return;
    const ms = Math.floor(ratio * duration);
    await soundRef.current.setPositionAsync(ms);
    setPosition(ms);
  }

  const progress = duration > 0 ? position / duration : 0;
  const s = styles(colors);

  return (
    <View style={s.container}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <TouchableOpacity style={s.playBtn} onPress={togglePlay}>
            <Feather name={isPlaying ? 'pause' : 'play'} size={20} color={colors.primaryForeground} />
          </TouchableOpacity>

          <View style={s.middle}>
            <TouchableOpacity
              style={s.progressTrack}
              onPress={(e) => {
                const { locationX, target } = e.nativeEvent;
                // approximate width from layout
                e.currentTarget.measure((_x, _y, width) => seekTo(locationX / width));
              }}
            >
              <View style={[s.progressFill, { flex: progress }]} />
              <View style={[s.progressEmpty, { flex: 1 - progress }]} />
            </TouchableOpacity>
            <Text style={s.time}>{formatTime(position)} / {formatTime(duration)}</Text>
          </View>

          {onDelete && (
            <TouchableOpacity style={s.deleteBtn} onPress={onDelete}>
              <Feather name="trash-2" size={18} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 12,
      padding: 12,
      gap: 10,
    },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    middle: { flex: 1 },
    progressTrack: {
      flexDirection: 'row',
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressFill: { backgroundColor: colors.primary, minWidth: 4 },
    progressEmpty: { backgroundColor: colors.border },
    time: { fontSize: 11, color: colors.mutedForeground },
    deleteBtn: { padding: 6 },
  });
}
