import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_SOCKET_URL = 'https://voice-bridge-106w.onrender.com';

let socket: Socket | null = null;
// Singleton promise — prevents multiple concurrent socket creation
let connectingPromise: Promise<Socket> | null = null;

export async function getSocket(): Promise<Socket> {
  // If already connected, return immediately
  if (socket && socket.connected) {
    return socket;
  }

  // If already in process of connecting, wait for that
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
  // Disconnect any stale socket
  if (socket) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
  }

  console.log(`[Socket Client] Connecting directly to live server: ${LIVE_SOCKET_URL}`);
  const s = io(LIVE_SOCKET_URL, {
    transports: ['websocket', 'polling'],
    timeout: 30000, // 30s — Render cold start
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 3,
  });
  s.connect();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      s.disconnect();
      reject(new Error('Socket connection timeout'));
    }, 30000);

    s.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    s.once('connect_error', (err) => {
      clearTimeout(timeout);
      s.disconnect();
      reject(err);
    });
  });

  console.log(`[Socket Client] Connected successfully to: ${LIVE_SOCKET_URL}`);
  socket = s;

  // Register user aliases with server
  const registerWithServer = async () => {
    try {
      const currentId = await AsyncStorage.getItem('vb_current_user');
      const userProfileStr = await AsyncStorage.getItem('vb_user_profile');
      let profile: any = null;
      if (userProfileStr) {
        try { profile = JSON.parse(userProfileStr); } catch (_) {}
      }
      if (socket && (currentId || profile)) {
        const aliases = {
          currentId: currentId || profile?.userId,
          mobile: profile?.mobile,
          speakerID: profile?.userId || profile?.speakerID,
        };
        socket.emit('register-user', aliases);
        console.log('[Socket Client] Registered user aliases with server:', aliases);
      }
    } catch (_) {}
  };

  await registerWithServer();

  // Re-register on reconnect
  s.on('connect', () => {
    registerWithServer();
  });

  return socket;
}

export function disconnectSocket() {
  connectingPromise = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
