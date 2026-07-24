import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_SOCKET_URL = 'https://voice-bridge-106w.onrender.com';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  try {
    console.log(`[Socket Client] Connecting directly to live server: ${LIVE_SOCKET_URL}`);
    const s = io(LIVE_SOCKET_URL, {
      transports: ['polling', 'websocket'],
      timeout: 5000,
      autoConnect: false,
    });
    s.connect();

    // Simple promise wrapper to check connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        s.disconnect();
        reject(new Error('Timeout'));
      }, 5000);

      s.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      s.on('connect_error', (err) => {
        clearTimeout(timeout);
        s.disconnect();
        reject(err);
      });
    });

    console.log(`[Socket Client] Connected successfully to: ${LIVE_SOCKET_URL}`);
    socket = s;
      
    // Auto-register user if they are logged in with all aliases
    const registerWithServer = async () => {
      try {
        const currentId = await AsyncStorage.getItem('vb_current_user');
        const userProfileStr = await AsyncStorage.getItem('vb_user_profile');
        let profile: any = null;
        if (userProfileStr) {
          try { profile = JSON.parse(userProfileStr); } catch (e) {}
        }
        if (socket && (currentId || profile)) {
          socket.emit('register-user', {
            userId: currentId,
            speakerID: profile?.userId || profile?.speakerID,
            mobile: profile?.mobile,
          });
          console.log('[Socket Client] Registered user aliases with server:', { currentId, speakerID: profile?.userId, mobile: profile?.mobile });
        }
      } catch (err) {}
    };

    await registerWithServer();

    // Keep registration active on reconnects
    socket.on('connect', () => {
      registerWithServer();
    });

      return socket;
  } catch (err: any) {
    console.log(`[Socket Client] Failed to connect to ${LIVE_SOCKET_URL}:`, err.message);
    throw err;
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
