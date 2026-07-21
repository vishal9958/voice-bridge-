import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Room {
  roomId: string;
  hostId: string;
  participantId: string;
  participantName: string;
  imageIndex: number;
  createdAt: string;
  status: 'active' | 'ended';
  duration?: number;
}

export interface Recording {
  recordingId: string;
  roomId: string;
  hostId: string;
  participantId: string;
  audioUri: string;
  duration: number;
  createdAt: string;
  uploaded: boolean;
}

interface AppContextType {
  rooms: Room[];
  recordings: Recording[];
  createRoom: (hostId: string, participantId: string, participantName: string) => Promise<Room>;
  updateRoom: (roomId: string, updates: Partial<Room>) => Promise<void>;
  saveRecording: (rec: Omit<Recording, 'recordingId' | 'createdAt'>) => Promise<Recording>;
  updateRecording: (id: string, updates: Partial<Recording>) => Promise<void>;
  getRoomRecording: (roomId: string) => Recording | undefined;
}

const AppContext = createContext<AppContextType | null>(null);
const ROOMS_KEY = 'vb_rooms';
const RECS_KEY = 'vb_recordings';
const TOTAL_IMAGES = 10;

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    (async () => {
      const [r, rec] = await Promise.all([
        AsyncStorage.getItem(ROOMS_KEY),
        AsyncStorage.getItem(RECS_KEY),
      ]);
      if (r) setRooms(JSON.parse(r));
      if (rec) setRecordings(JSON.parse(rec));
    })();
  }, []);

  async function createRoom(hostId: string, participantId: string, participantName: string): Promise<Room> {
    const room: Room = {
      roomId: 'BR-' + makeId().toUpperCase().slice(0, 8),
      hostId,
      participantId,
      participantName,
      imageIndex: Math.floor(Math.random() * TOTAL_IMAGES),
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const updated = [...rooms, room];
    await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(updated));
    setRooms(updated);
    return room;
  }

  async function updateRoom(roomId: string, updates: Partial<Room>) {
    const updated = rooms.map((r) => (r.roomId === roomId ? { ...r, ...updates } : r));
    await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(updated));
    setRooms(updated);
  }

  async function saveRecording(rec: Omit<Recording, 'recordingId' | 'createdAt'>): Promise<Recording> {
    const full: Recording = { ...rec, recordingId: makeId(), createdAt: new Date().toISOString() };
    const updated = [...recordings, full];
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(updated));
    setRecordings(updated);
    return full;
  }

  async function updateRecording(id: string, updates: Partial<Recording>) {
    const updated = recordings.map((r) => (r.recordingId === id ? { ...r, ...updates } : r));
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(updated));
    setRecordings(updated);
  }

  function getRoomRecording(roomId: string): Recording | undefined {
    return recordings.find((r) => r.roomId === roomId);
  }

  return (
    <AppContext.Provider
      value={{ rooms, recordings, createRoom, updateRoom, saveRecording, updateRecording, getRoomRecording }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
