import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_SOCKET_URL = 'https://voice-bridge-106w.onrender.com';

let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;

export async function getSocket(): Promise<Socket> {
  // If socket exists and is connected OR connecting, return it
  if (socket) {
    if (socket.connected) {
      return socket;
    }
    // If socket exists but disconnected, try connecting it rather than destroying it
    if (!socket.connected && !connectingPromise) {
      socket.connect();
    }
  }

  // If currently creating a new socket connection, wait for it
  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = _createSocket();
  try {
    const s = await connectingPromise;
    return s;
  } finally {
    connectingPromise = null;
  }
}

async function _createSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  console.log(`[Socket Client] Initializing connection to: ${LIVE_SOCKET_URL}`);
  const s = io(LIVE_SOCKET_URL, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
  s.connect();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve(); // Resolve anyway so caller has socket reference
    }, 15000);

    s.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    s.once('connect_error', (err) => {
      clearTimeout(timeout);
      console.warn('[Socket Client] Initial connect warning:', err.message);
      resolve(); // Resolve so reconnection loop can handle it
    });
  });

  console.log(`[Socket Client] Socket instance ready: ${s.id || 'connecting'}`);
  socket = s;

  // Function to register user aliases
  const registerWithServer = async () => {
    try {
      const currentId = await AsyncStorage.getItem('vb_current_user');
      const userProfileStr = await AsyncStorage.getItem('vb_user_profile');
      let profile: any = null;
      if (userProfileStr) {
        try { profile = JSON.parse(userProfileStr); } catch (_) {}
      }
      if (s && s.connected && (currentId || profile)) {
        const aliases = {
          currentId: currentId || profile?.userId,
          mobile: profile?.mobile,
          speakerID: profile?.userId || profile?.speakerID,
        };
        s.emit('register-user', aliases);
        console.log('[Socket Client] Registered user aliases with server:', aliases);
      }
    } catch (_) {}
  };

  // Register immediately if connected
  if (s.connected) {
    await registerWithServer();
  }

  // Always re-register whenever socket connects or reconnects
  s.on('connect', () => {
    console.log(`[Socket Client] Connected/Reconnected as socket ID: ${s.id}`);
    registerWithServer();
  });

  return s;
}

export function disconnectSocket() {
  connectingPromise = null;
  if (socket) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
  }
}
