import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { getSocket } from './socket';

const ICE_SERVERS_CONFIG = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Metered TURN relay — required for mobile-to-mobile across networks
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:80?transport=tcp',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// ICE timeout — if not connected in 20s, fail
const ICE_CONNECT_TIMEOUT_MS = 20000;

export class WebRTCService {
  private peerConnection: any = null;
  private localStream: MediaStream | null = null;
  private isClosed = false;
  private iceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {}

  /**
   * Initializes local audio stream.
   */
  async initLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      return this.localStream;
    }
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    this.localStream = stream;
    return stream;
  }

  /**
   * Creates RTCPeerConnection and binds listeners.
   */
  createPeerConnection(
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): any {
    if (this.peerConnection) {
      this.closePeerConnection();
    }
    this.isClosed = false;

    const pc: any = new RTCPeerConnection(ICE_SERVERS_CONFIG);
    this.peerConnection = pc;

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] connectionState:', state);
      onConnectionStateChange(state);
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[WebRTC] iceConnectionState:', state);
      onConnectionStateChange(state);

      if (state === 'connected' || state === 'completed') {
        // Connected — clear timeout
        if (this.iceTimeoutId) {
          clearTimeout(this.iceTimeoutId);
          this.iceTimeoutId = null;
        }
      }
    };

    // Listen for remote tracks
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Remote track received via ontrack');
        onRemoteStream(event.streams[0]);
      }
    };

    // Older react-native-webrtc fallback
    pc.onaddstream = (event: any) => {
      if (event.stream) {
        console.log('[WebRTC] Remote stream received via onaddstream');
        onRemoteStream(event.stream);
      }
    };

    return pc;
  }

  private startIceTimeout(onFail: () => void) {
    if (this.iceTimeoutId) clearTimeout(this.iceTimeoutId);
    this.iceTimeoutId = setTimeout(() => {
      console.log('[WebRTC] ICE connection timeout — failing call');
      onFail();
    }, ICE_CONNECT_TIMEOUT_MS);
  }

  /**
   * Host: creates offer and starts the call.
   */
  async createRoom(
    roomId: string,
    hostId: string,
    participantId: string,
    imageIndex: number,
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    const socket = await getSocket();

    // Remove any stale listeners from previous calls
    socket.off('call-accepted');
    socket.off('ice-candidate');
    socket.off('call-ended');

    // 1. Create peer connection
    const pc = this.createPeerConnection(onConnectionStateChange, onRemoteStream);

    // 2. Add local audio tracks
    const localStream = await this.initLocalStream();
    if (typeof pc.addTrack === 'function') {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      pc.addStream(localStream);
    }

    const pendingCandidates: RTCIceCandidate[] = [];

    // 3. ICE candidate gathering — send to participant
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('[WebRTC Host] Sending ICE candidate to participant');
        socket.emit('send-ice-candidate', {
          targetId: participantId,
          candidate: event.candidate.toJSON(),
          roomId,
        });
      } else {
        console.log('[WebRTC Host] ICE gathering complete');
      }
    };

    // 4. Create and set local offer
    const offerDescription = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(offerDescription);

    // 5. Send offer to participant via socket
    socket.emit('make-call', {
      hostId,
      participantId,
      roomId,
      imageIndex,
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
    });

    // Start ICE timeout — if no connection in 20s, notify caller
    this.startIceTimeout(() => {
      if (!this.isClosed) {
        onConnectionStateChange('failed');
      }
    });

    // 6. Listen for answer from participant
    socket.on('call-accepted', async (payload: any) => {
      if (payload.roomId !== roomId || pc.remoteDescription) return;
      try {
        const answerDesc = new RTCSessionDescription(payload.answer);
        await pc.setRemoteDescription(answerDesc);
        console.log('[WebRTC Host] Remote description (answer) set successfully');

        // Process any candidates that arrived before the answer
        while (pendingCandidates.length > 0) {
          const cand = pendingCandidates.shift();
          await pc.addIceCandidate(cand).catch((err: any) =>
            console.warn('[WebRTC Host] Error adding queued candidate:', err)
          );
        }
      } catch (err: any) {
        console.error('[WebRTC Host] Error setting remote description:', err);
      }
    });

    // 7. Listen for participant ICE candidates
    socket.on('ice-candidate', (payload: any) => {
      if (payload.roomId !== roomId || !payload.candidate) return;
      const candidate = new RTCIceCandidate(payload.candidate);
      if (pc.remoteDescription) {
        pc.addIceCandidate(candidate).catch((err: any) =>
          console.warn('[WebRTC Host] Error adding candidate:', err)
        );
      } else {
        console.log('[WebRTC Host] Queuing candidate — no remote desc yet');
        pendingCandidates.push(candidate);
      }
    });

    // 8. Listen for call end from peer
    socket.on('call-ended', (payload: any) => {
      if (payload.roomId === roomId) {
        console.log('[WebRTC Host] call-ended received from peer');
        this.closePeerConnection();
        onConnectionStateChange('disconnected');
      }
    });
  }

  /**
   * Participant: joins the call by processing the host offer.
   */
  async joinRoom(
    roomId: string,
    hostId: string,
    offer: any,
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    const socket = await getSocket();

    // Remove any stale listeners from previous calls
    socket.off('ice-candidate');
    socket.off('call-ended');

    // 1. Create peer connection
    const pc = this.createPeerConnection(onConnectionStateChange, onRemoteStream);

    // 2. Add local audio tracks
    const localStream = await this.initLocalStream();
    if (typeof pc.addTrack === 'function') {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      pc.addStream(localStream);
    }

    const pendingCandidates: RTCIceCandidate[] = [];

    // 3. ICE candidate gathering — send to host
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        console.log('[WebRTC Callee] Sending ICE candidate to host');
        socket.emit('send-ice-candidate', {
          targetId: hostId,
          candidate: event.candidate.toJSON(),
          roomId,
        });
      } else {
        console.log('[WebRTC Callee] ICE gathering complete');
      }
    };

    // 4. Listen for host ICE candidates
    socket.on('ice-candidate', (payload: any) => {
      if (payload.roomId !== roomId || !payload.candidate) return;
      const candidate = new RTCIceCandidate(payload.candidate);
      if (pc.remoteDescription) {
        pc.addIceCandidate(candidate).catch((err: any) =>
          console.warn('[WebRTC Callee] Error adding candidate:', err)
        );
      } else {
        console.log('[WebRTC Callee] Queuing candidate — no remote desc yet');
        pendingCandidates.push(candidate);
      }
    });

    // 5. Listen for call end from host
    socket.on('call-ended', (payload: any) => {
      if (payload.roomId === roomId) {
        console.log('[WebRTC Callee] call-ended received from host');
        this.closePeerConnection();
        onConnectionStateChange('disconnected');
      }
    });

    // 6. Set remote description from host offer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[WebRTC Callee] Remote description (offer) set successfully');

    // Process any candidates queued before remote desc was set
    while (pendingCandidates.length > 0) {
      const cand = pendingCandidates.shift();
      await pc.addIceCandidate(cand).catch((err: any) =>
        console.warn('[WebRTC Callee] Error adding queued candidate:', err)
      );
    }

    // 7. Create and set local answer
    const answerDescription = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await pc.setLocalDescription(answerDescription);

    // 8. Send answer to host
    socket.emit('accept-call', {
      roomId,
      hostId,
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
    });

    // Start ICE timeout
    this.startIceTimeout(() => {
      if (!this.isClosed) {
        onConnectionStateChange('failed');
      }
    });
  }

  private closePeerConnection() {
    if (this.iceTimeoutId) {
      clearTimeout(this.iceTimeoutId);
      this.iceTimeoutId = null;
    }
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch (_) {}
      this.peerConnection = null;
    }
  }

  /**
   * Cleans up everything and optionally notifies the peer.
   */
  async closeConnection(roomId: string, targetId?: string): Promise<void> {
    if (this.isClosed) return; // prevent double-close
    this.isClosed = true;

    try {
      const socket = await getSocket();
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      if (targetId && targetId.trim()) {
        socket.emit('end-call', { roomId, targetId });
      }
    } catch (_) {}

    // Stop microphone
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      this.localStream = null;
    }

    this.closePeerConnection();
  }
}
