import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/services/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface User {
  userId: string;
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  state: string;
  district: string;
  pincode: string;
  qualification: string;
  recordingLanguages: string[];
  knownLanguages: string[];
  consentLanguage: string;
  mobile: string;
  coordinator: string;
  createdAt: string;
  voiceVerified: boolean;
  voiceAudioUri?: string;
}

export type RegisterData = Omit<User, 'userId' | 'createdAt' | 'voiceVerified'>;

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (mobile: string, code: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  searchUsers: (query: string) => User[];
}

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = 'vb_users';
const CURRENT_USER_KEY = 'vb_current_user';
const SEEDED_KEY = 'vb_seeded_v1';
const ACCESS_CODE = '123456';

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

// No dummy speakers - only real registered speakers from MongoDB / Firestore will be listed
const DUMMY_SPEAKERS: User[] = [];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Listen to real-time users from Firestore to discover newly registered speakers across all devices!
    const unsub = onSnapshot(collection(db, 'users'), (snapshot: any) => {
      const remoteUsers = snapshot.docs.map((d: any) => d.data() as User);
      setUsers((prev) => {
        const map = new Map<string, User>();
        // Only keep real registered users (filter out any legacy SPK-00 dummy users)
        prev.filter((u: User) => !u.userId.startsWith('SPK-00')).forEach((u: User) => map.set(u.userId, u));
        remoteUsers.filter((u: User) => !u.userId.startsWith('SPK-00')).forEach((u: User) => map.set(u.userId, u));
        return Array.from(map.values());
      });
    });

    return () => unsub();
  }, []);

  async function loadData() {
    try {
      const [usersRaw, currentId] = await Promise.all([
        AsyncStorage.getItem(USERS_KEY),
        AsyncStorage.getItem(CURRENT_USER_KEY),
      ]);

      let allUsers: User[] = usersRaw ? JSON.parse(usersRaw) : [];
      // Clean up any old dummy speakers saved in AsyncStorage
      allUsers = allUsers.filter((u: User) => !u.userId.startsWith('SPK-00'));
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(allUsers));

      setUsers(allUsers);

      if (currentId) {
        const found = allUsers.find((u) => u.userId === currentId);
        if (found) setCurrentUser(found);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function login(mobile: string, code: string) {
    if (code !== ACCESS_CODE) {
      return { success: false, error: 'Invalid access code. Use 123456.' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('http://192.168.100.183:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        },
        signal: controller.signal,
        body: JSON.stringify({
          mobile: mobile.trim(),
          accesscode: code.trim(),
          appVersionNumber: 23,
        }),
      });
      clearTimeout(timeoutId);

      const resData = await response.json();
      if (response.ok && resData.success) {
        const apiUser = resData.user || {};
        const formattedUser: User = {
          userId: apiUser.speakerID || apiUser._id || makeId(),
          fullName: apiUser.name || apiUser.fullName || 'Speaker',
          age: apiUser.age || 25,
          gender: apiUser.gender || 'Male',
          state: apiUser.state || '',
          district: apiUser.district || '',
          pincode: apiUser.pincode || '',
          qualification: apiUser.qualification || '',
          recordingLanguages: apiUser.recordingLanguages || ['Hindi'],
          knownLanguages: apiUser.knownLanguages || ['Hindi'],
          consentLanguage: apiUser.consentLanguage || 'Hindi',
          mobile: apiUser.mobile || mobile.trim(),
          coordinator: apiUser.coordinatorName || apiUser.coordinator || '',
          createdAt: apiUser.createdAt || new Date().toISOString(),
          voiceVerified: apiUser.voiceVerified || false,
        };

        await AsyncStorage.setItem(CURRENT_USER_KEY, formattedUser.userId);
        setCurrentUser(formattedUser);
        await setDoc(doc(db, 'users', formattedUser.userId), formattedUser, { merge: true }).catch(() => {});
        return { success: true };
      }
    } catch (err: any) {
      console.log('Backend API login timeout/fallback...', err?.message);
    }

    // 2. Fallback to local storage if offline / mock user
    const user = users.find((u) => u.mobile === mobile.trim());
    if (!user) {
      return { success: false, error: 'Mobile number not registered.' };
    }

    await AsyncStorage.setItem(CURRENT_USER_KEY, user.userId);
    setCurrentUser(user);
    await setDoc(doc(db, 'users', user.userId), user, { merge: true }).catch(() => {});
    return { success: true };
  }

  async function register(data: RegisterData) {
    const exists = users.find((u) => u.mobile === data.mobile.trim());
    if (exists) {
      return { success: false, error: 'Mobile number already registered.' };
    }

    let createdId = makeId();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('http://192.168.100.183:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        },
        signal: controller.signal,
        body: JSON.stringify({
          name: data.fullName,
          fullName: data.fullName,
          mobile: data.mobile.trim(),
          accesscode: '123456',
          appVersionNumber: 23,
          role: 'Vendor',
          age: data.age,
          gender: data.gender,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          qualification: data.qualification,
          recordingLanguages: data.recordingLanguages,
          knownLanguages: data.knownLanguages,
          consentLanguage: data.consentLanguage,
          coordinator: data.coordinator,
          latitude: 18,
          longitude: 73,
        }),
      });
      clearTimeout(timeoutId);

      const resData = await response.json();
      if (resData.user?.speakerID || resData.user?._id) {
        createdId = resData.user.speakerID || resData.user._id;
      }
    } catch (err: any) {
      console.log('Backend API register fallback...', err?.message);
    }

    const newUser: User = {
      ...data,
      mobile: data.mobile.trim(),
      userId: createdId,
      createdAt: new Date().toISOString(),
      voiceVerified: false,
    };

    // Save locally and sync to Firestore so all devices discover this new speaker immediately!
    const updated = [...users, newUser];
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
    setUsers(updated);
    await setDoc(doc(db, 'users', newUser.userId), newUser).catch(() => {});

    return { success: true };
  }

  async function logout() {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setCurrentUser(null);
  }

  async function updateUser(userId: string, updates: Partial<User>) {
    const updated = users.map((u) => (u.userId === userId ? { ...u, ...updates } : u));
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
    setUsers(updated);
    if (currentUser?.userId === userId) {
      const refreshed = updated.find((u) => u.userId === userId) ?? null;
      setCurrentUser(refreshed);
    }
    await setDoc(doc(db, 'users', userId), updates, { merge: true }).catch(() => {});
  }

  function searchUsers(query: string): User[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return users.filter((u: User) => u.userId !== currentUser?.userId);
    }
    return users.filter(
      (u: User) =>
        u.fullName.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        u.userId.toLowerCase().includes(q),
    );
  }

  return (
    <AuthContext.Provider
      value={{ currentUser, users, isLoading, login, register, logout, updateUser, searchUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
