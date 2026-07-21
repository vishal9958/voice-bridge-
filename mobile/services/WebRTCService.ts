import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { db } from './firebase';
import {
  doc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';

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
  private unsubscribes: (() => void)[] = [];

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
   * Host actions to create a new room and upload SDP offer.
   */
  async createRoom(
    roomId: string,
    hostId: string,
    participantId: string,
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
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
        addDoc(
          collection(db, 'rooms', roomId, 'callerCandidates'),
          event.candidate.toJSON()
        ).catch((err) => console.error('Error adding caller candidate:', err));
      }
    };

    // 4. Create offer and set local description
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    // 5. Upload offer to Firestore
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, {
      hostId,
      participantId,
      status: 'connecting',
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
      createdAt: new Date().toISOString(),
    });

    // 6. Listen for remote answer
    const unsubAnswer = onSnapshot(roomRef, (snapshot: any) => {
      const data = snapshot.data();
      if (data && data.answer && !pc.remoteDescription) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription).catch((err: any) =>
          console.error('Error setting remote description from answer:', err)
        );
      }
    });
    this.unsubscribes.push(unsubAnswer);

    // 7. Listen for callee (participant) ICE candidates
    const calleeCandidatesCol = collection(db, 'rooms', roomId, 'calleeCandidates');
    const unsubCalleeCandidates = onSnapshot(calleeCandidatesCol, (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const candidate = new RTCIceCandidate(data as any);
          pc.addIceCandidate(candidate).catch((err: any) =>
            console.error('Error adding callee candidate:', err)
          );
        }
      });
    });
    this.unsubscribes.push(unsubCalleeCandidates);
  }

  /**
   * Participant actions to join an existing room and upload SDP answer.
   */
  async joinRoom(
    roomId: string,
    onConnectionStateChange: (state: string) => void,
    onRemoteStream: (stream: MediaStream) => void
  ): Promise<void> {
    // 1. Fetch Room Offer
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnapshot = await getDoc(roomRef);
    if (!roomSnapshot.exists()) {
      throw new Error('Calling room does not exist.');
    }
    const roomData = roomSnapshot.data();
    const offer = roomData.offer;
    if (!offer) {
      throw new Error('Room offers are not initialized.');
    }

    // 2. Create Peer Connection
    const pc = this.createPeerConnection(onConnectionStateChange, onRemoteStream);

    // 3. Add local tracks
    const localStream = await this.initLocalStream();
    if (typeof pc.addTrack === 'function') {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      pc.addStream(localStream);
    }

    // 4. ICE Candidate gathering for Participant
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        addDoc(
          collection(db, 'rooms', roomId, 'calleeCandidates'),
          event.candidate.toJSON()
        ).catch((err) => console.error('Error adding callee candidate:', err));
      }
    };

    // 5. Set remote description from Host Offer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // 6. Create answer and set local description
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    // 7. Upload answer and update room status
    await updateDoc(roomRef, {
      status: 'connected',
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      },
    });

    // 8. Listen for host (caller) ICE candidates
    const callerCandidatesCol = collection(db, 'rooms', roomId, 'callerCandidates');
    const unsubCallerCandidates = onSnapshot(callerCandidatesCol, (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const candidate = new RTCIceCandidate(data as any);
          pc.addIceCandidate(candidate).catch((err: any) =>
            console.error('Error adding caller candidate:', err)
          );
        }
      });
    });
    this.unsubscribes.push(unsubCallerCandidates);
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
   * Cleans up all tracks, connections, listeners and marks room as ended in Firestore.
   */
  async closeConnection(roomId: string): Promise<void> {
    // 1. Unsubscribe Firestore Listeners
    this.unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (err) {
        console.error('Error unsubscribing listener:', err);
      }
    });
    this.unsubscribes = [];

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

    // 4. Update Firestore Room Status
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status: 'ended',
        endedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Room might not exist or already be deleted/ended
    }
  }
}
