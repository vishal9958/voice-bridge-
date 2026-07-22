import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URLS = [
  'https://recordingapi.evaakya.com',
  'http://172.20.65.219:5000',
  'http://localhost:5000',
  'http://10.0.2.2:5000',
];

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  // Attempt connection using fallback URLs
  for (const url of SOCKET_URLS) {
    try {
      console.log(`[Socket Client] Trying to connect to: ${url}`);
      const s = io(url, {
        transports: ['websocket'],
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

      console.log(`[Socket Client] Connected successfully to: ${url}`);
      socket = s;
      
      // Auto-register user if they are logged in
      const currentId = await AsyncStorage.getItem('vb_current_user');
      if (currentId) {
        socket.emit('register-user', currentId);
      }

      // Keep registration active on reconnects
      socket.on('connect', () => {
        AsyncStorage.getItem('vb_current_user').then((userId) => {
          if (userId && socket) {
            socket.emit('register-user', userId);
          }
        });
      });

      return socket;
    } catch (err: any) {
      console.log(`[Socket Client] Failed to connect to ${url}:`, err.message);
    }
  }

  throw new Error('All socket connection attempts failed.');
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
