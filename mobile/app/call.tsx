import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RTCView } from 'react-native-webrtc';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { WebRTCService } from '@/services/WebRTCService';

const SAMPLE_IMAGES = [
  require('@/assets/images/sample_01.jpg'),
  require('@/assets/images/sample_02.jpg'),
  require('@/assets/images/sample_03.jpg'),
  require('@/assets/images/sample_04.jpg'),
  require('@/assets/images/sample_05.jpg'),
  require('@/assets/images/sample_06.jpg'),
  require('@/assets/images/sample_07.jpg'),
  require('@/assets/images/sample_08.jpg'),
  require('@/assets/images/sample_09.jpg'),
  require('@/assets/images/sample_10.jpg'),
];

const MIN_DURATION_S = 120;
const MAX_DURATION_S = 900;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

type CallStatus = 'connecting' | 'connected' | 'ended';

export default function CallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId, imageIndex, participantName, isHost, hostId, participantId, offer } = useLocalSearchParams<{
    roomId: string;
    imageIndex: string;
    participantName: string;
    isHost?: string;
    hostId?: string;
    participantId?: string;
    offer?: string;
  }>();
  const { updateRoom, saveRecording } = useApp();

  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callTimer, setCallTimer] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [webrtcState, setWebrtcState] = useState<string>('new');
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webrtcServiceRef = useRef<WebRTCService>(new WebRTCService());

  const imgIndex = parseInt(imageIndex ?? '0', 10);
  const image = SAMPLE_IMAGES[imgIndex % SAMPLE_IMAGES.length];
  const { currentUser } = useAuth();
  const webrtcService = webrtcServiceRef.current;

  const startRecording = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
    } catch (e) {
      console.error('Failed to start recording', e);
    }
  }, []);

  // WebRTC Call Signaling and Setup
  useEffect(() => {
    if (!roomId || !currentUser) return;
    const userId = currentUser.userId;
    const host = isHost === 'true';
    const targetId = host ? participantId : hostId;

    let isActive = true;

    async function initCall() {
      try {
        const onStateChange = (state: string) => {
          if (!isActive) return;
          console.log('WebRTC State:', state);
          setWebrtcState(state);

          if (state === 'connected' || state === 'completed') {
            setCallStatus('connected');
            startRecording();
            
            if (!timerRef.current) {
              timerRef.current = setInterval(() => {
                setCallTimer((t) => {
                  if (t >= MAX_DURATION_S) {
                    handleDisconnect();
                  }
                  return t + 1;
                });
              }, 1000);
            }
          } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
            console.log('[CallScreen] Call ended or disconnected by peer');
            if (timerRef.current) clearInterval(timerRef.current);
            setCallStatus('ended');
          }
        };

        const onRemote = (stream: any) => {
          if (!isActive) return;
          console.log('Remote stream received');
          setRemoteStream(stream);
          setCallStatus('connected');
          startRecording();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => {
              setCallTimer((t) => {
                if (t >= MAX_DURATION_S) {
                  handleDisconnect();
                }
                return t + 1;
              });
            }, 1000);
          }
        };

        if (host) {
          await webrtcService.createRoom(
            roomId,
            userId,
            participantId || '',
            imgIndex,
            onStateChange,
            onRemote
          );
        } else {
          const parsedOffer = offer ? JSON.parse(offer) : null;
          await webrtcService.joinRoom(
            roomId,
            hostId || '',
            parsedOffer,
            onStateChange,
            onRemote
          );
        }
      } catch (err) {
        console.error('Failed to start WebRTC session:', err);
        setWebrtcState('failed');
      }
    }

    initCall();

    return () => {
      isActive = false;
      webrtcService.closeConnection(roomId, targetId).catch(() => {});
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId, currentUser, isHost, hostId, participantId, offer]);

  function getDisplayStatus(state: string): string {
    switch (state) {
      case 'new':
      case 'connecting':
      case 'checking':
        return 'Connecting';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
      case 'closed':
        return 'Failed';
      default:
        return 'Connecting';
    }
  }

  async function toggleMute() {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      webrtcService.initLocalStream().then(stream => {
        stream.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }).catch(e => console.error('Error toggling track mute:', e));
      return nextMuted;
    });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function toggleSpeaker() {
    setIsSpeaker((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleDisconnect() {
    if (callStatus !== 'connected' || isProcessing) return;

    if (callTimer < MIN_DURATION_S) {
      Alert.alert(
        'Call Too Short',
        `Minimum call duration is 2 minutes. Current: ${formatTime(callTimer)}. Continue the call?`,
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'End Anyway', style: 'destructive', onPress: () => endCall() },
        ],
      );
      return;
    }
    endCall();
  }

  async function endCall() {
    if (isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus('ended');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let audioUri = '';
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        audioUri = recordingRef.current.getURI() ?? '';
        recordingRef.current = null;
      }
    } catch {
      // ignore
    }

    const duration = callTimer;
    if (roomId && currentUser) {
      const targetId = isHost === 'true' ? participantId : hostId;
      await webrtcService.closeConnection(roomId, targetId).catch(() => {});
      await updateRoom(roomId, { status: 'ended', duration });
      const saved = await saveRecording({
        roomId,
        hostId: isHost === 'true' ? currentUser.userId : (hostId || ''),
        participantId: isHost === 'true' ? (participantId || '') : currentUser.userId,
        audioUri,
        duration,
        uploaded: false,
      });
      router.replace({
        pathname: '/upload',
        params: { recordingId: saved.recordingId, roomId, duration: String(duration) },
      });
    }
  }

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
          objectFit="cover"
          zOrder={0}
        />
      )}
      {callStatus === 'connecting' && (
        <View style={s.connectingOverlay}>
          <View style={[s.connectingPulse, getDisplayStatus(webrtcState) === 'Failed' && { backgroundColor: 'rgba(211,47,47,0.2)' }]}>
            <Feather 
              name={getDisplayStatus(webrtcState) === 'Failed' ? 'x-circle' : 'phone'} 
              size={36} 
              color={getDisplayStatus(webrtcState) === 'Failed' ? colors.destructive : colors.primary} 
            />
          </View>
          <Text style={s.connectingTitle}>{getDisplayStatus(webrtcState)}</Text>
          <Text style={s.connectingSub}>
            {getDisplayStatus(webrtcState) === 'Failed'
              ? 'Could not connect. Please try again later.'
              : `Setting up bridge with ${participantName}`}
          </Text>
          <Text style={s.connectingRoom}>Room: {roomId}</Text>

          {getDisplayStatus(webrtcState) === 'Failed' && (
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: colors.destructive,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 20,
              }}
              onPress={() => router.replace('/home')}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Return Home</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {callStatus === 'connected' && (
        <>
          {/* Image to discuss */}
          <View style={s.imageSection}>
            <Text style={s.imageSectionLabel}>DISCUSS THIS IMAGE</Text>
            <Image source={image} style={s.conversationImage} resizeMode="cover" />
            <View style={s.imageOverlay}>
              <Text style={s.imageOverlayText}>Speak only about this image</Text>
            </View>
          </View>

          {/* Call info */}
          <View style={s.callInfo}>
            <View style={s.callInfoLeft}>
              <View style={[
                s.statusDot, 
                { 
                  backgroundColor: 
                    getDisplayStatus(webrtcState) === 'Connected' ? colors.success :
                    getDisplayStatus(webrtcState) === 'Disconnected' ? colors.warning :
                    colors.destructive
                }
              ]} />
              <Text style={s.callInfoText}>{getDisplayStatus(webrtcState)} · {participantName}</Text>
            </View>
            <Text style={s.timerText}>{formatTime(callTimer)}</Text>
          </View>

          {/* Duration progress */}
          <View style={s.durationBar}>
            <View
              style={[
                s.durationFill,
                {
                  width: `${Math.min((callTimer / MAX_DURATION_S) * 100, 100)}%`,
                  backgroundColor: callTimer < MIN_DURATION_S ? colors.warning : colors.success,
                },
              ]}
            />
          </View>
          {callTimer < MIN_DURATION_S && (
            <Text style={s.minDurationHint}>
              Minimum 2 min · {formatTime(MIN_DURATION_S - callTimer)} remaining
            </Text>
          )}

          {/* Controls */}
          <View style={s.controls}>
            <TouchableOpacity style={[s.controlBtn, isMuted && s.controlBtnActive]} onPress={toggleMute}>
              <Feather name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#fff' : colors.text} />
              <Text style={[s.controlLabel, isMuted && { color: '#fff' }]}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.disconnectBtn} onPress={handleDisconnect} disabled={isProcessing}>
              <Feather name="phone-off" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={[s.controlBtn, isSpeaker && s.controlBtnActive]} onPress={toggleSpeaker}>
              <Feather name="volume-2" size={24} color={isSpeaker ? '#fff' : colors.text} />
              <Text style={[s.controlLabel, isSpeaker && { color: '#fff' }]}>Speaker</Text>
            </TouchableOpacity>
          </View>

          {/* Recording indicator */}
          <View style={s.recordingIndicator}>
            <View style={s.recDot} />
            <Text style={s.recText}>Recording in progress</Text>
          </View>
        </>
      )}

      {callStatus === 'ended' && (
        <View style={s.connectingOverlay}>
          <Feather name="check-circle" size={48} color={colors.success} />
          <Text style={s.connectingTitle}>Call Ended</Text>
          <Text style={s.connectingSub}>Processing recording…</Text>
        </View>
      )}
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A1A0A' },
    connectingOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: 32,
    },
    connectingPulse: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(46,125,50,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    connectingTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
    connectingSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
    connectingRoom: { fontSize: 12, color: colors.primary, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', marginTop: 4 },

    imageSection: { flex: 1, position: 'relative', maxHeight: 340 },
    imageSectionLabel: {
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 10,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 1,
    },
    conversationImage: { width: '100%', height: '100%' },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    imageOverlayText: { color: '#fff', fontSize: 13, textAlign: 'center', fontWeight: '500' },

    callInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    callInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    callInfoText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    timerText: { fontSize: 24, fontWeight: '700', color: '#fff', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },

    durationBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20, borderRadius: 2 },
    durationFill: { height: 4, borderRadius: 2 },
    minDurationHint: { fontSize: 11, color: colors.warning, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
      paddingVertical: 24,
    },
    controlBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    controlBtnActive: { backgroundColor: colors.primary },
    controlLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
    disconnectBtn: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.destructive,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.destructive,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    recordingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingBottom: 8,
    },
    recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
    recText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  });
}
