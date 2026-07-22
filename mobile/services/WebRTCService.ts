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
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
};

export class WebRTCService {
  private peerConnection: any = null;
  private localStream: MediaStream | null = null;

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

    const pc: any = new RTCPeerConnection(ICE_SERVERS_CONFIG);
    this.peerConnection = pc;

    // Track connection state
    pc.onconnectionstatechange = () => {
      onConnectionStateChange(pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      onConnectionStateChange(pc.iceConnectionState);
    };

    // Listen for remote tracks / streams
    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        onRemoteStream(event.streams[0]);
      }
    };

    pc.onaddstream = (event: any) => {
      if (event.stream) {
        onRemoteStream(event.stream);
      }
    };

    return pc;
  }

  /**
   * Host actions to create a new room and upload SDP offer via WebSockets.
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
    
    // 1. Create Peer Connection
    const pc = this.createPeerConnection(onConnectionStateChange, onRemoteStream);

    // 2. Add local tracks to Peer Connection
    const localStream = await this.initLocalStream();
    if (typeof pc.addTrack === 'function') {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      pc.addStream(localStream);
    }

    // 3. ICE Candidate gathering for Host
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socket.emit('send-ice-candidate', {
          targetId: participantId,
          candidate: event.candidate.toJSON(),
          roomId,
        });
      }
    };

    // 4. Create offer and set local description
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // 5. Upload offer via Socket make-call
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

    // 6. Listen for remote answer
    socket.on('call-accepted', (payload: any) => {
      if (payload.roomId === roomId && payload.answer && !pc.remoteDescription) {
        const answerDescription = new RTCSessionDescription(payload.answer);
        pc.setRemoteDescription(answerDescription).catch((err: any) =>
          console.error('Error setting remote description from answer:', err)
        );
      }
    });

    // 7. Listen for callee (participant) ICE candidates
    socket.on('ice-candidate', (payload: any) => {
      if (payload.roomId === roomId && payload.candidate) {
        const candidate = new RTCIceCandidate(payload.candidate);
        pc.addIceCandidate(candidate).catch((err: any) =>
          console.error('Error adding callee candidate:', err)
        );
      }
    });

    // 8. Listen for call-ended status
    socket.on('call-ended', (payload: any) => {
      if (payload.roomId === roomId) {
        this.closePeerConnection();
        onConnectionStateChange('disconnected');
      }
    });
  }

  /**
   * Participant actions to join an existing room and upload SDP answer via WebSockets.
   */
  async joinRoom(
    roomId: string,
    hostId: string,
    offer: any,
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    const socket = await getSocket();

    // 1. Create Peer Connection
    const pc = this.createPeerConnection(onConnectionStateChange, onRemoteStream);

    // 2. Add local tracks
    const localStream = await this.initLocalStream();
    if (typeof pc.addTrack === 'function') {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      pc.addStream(localStream);
    }

    // 3. ICE Candidate gathering for Participant
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socket.emit('send-ice-candidate', {
          targetId: hostId,
          candidate: event.candidate.toJSON(),
          roomId,
        });
      }
    };

    // 4. Listen for host ICE candidates
    socket.on('ice-candidate', (payload: any) => {
      if (payload.roomId === roomId && payload.candidate) {
        const candidate = new RTCIceCandidate(payload.candidate);
        pc.addIceCandidate(candidate).catch((err: any) =>
          console.error('Error adding caller candidate:', err)
        );
      }
    });

    // 5. Listen for call-ended status
    socket.on('call-ended', (payload: any) => {
      if (payload.roomId === roomId) {
        this.closePeerConnection();
        onConnectionStateChange('disconnected');
      }
    });

    // 6. Set remote description from Host Offer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // 7. Create answer and set local description
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    // 8. Upload answer via accept-call
    socket.emit('accept-call', {
      roomId,
      hostId,
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
    });
  }

  /**
   * Closes RTCPeerConnection.
   */
  private closePeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch (err) {
        console.error('Error closing peer connection:', err);
      }
      this.peerConnection = null;
    }
  }

  /**
   * Cleans up all tracks, connections, listeners and marks room as ended in Socket Server.
   */
  async closeConnection(roomId: string, targetId?: string): Promise<void> {
    // 1. Remove socket listeners & emit end-call
    try {
      const socket = await getSocket();
      socket.off('call-accepted');
      socket.off('ice-candidate');
      socket.off('call-ended');
      if (targetId) {
        socket.emit('end-call', { roomId, targetId });
      }
    } catch (err) {
      console.log('Error ending socket connection:', err);
    }

    // 2. Stop local tracks to release mic
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.error('Error stopping local tracks:', err);
      }
      this.localStream = null;
    }

    // 3. Close connection
    this.closePeerConnection();
  }
}
