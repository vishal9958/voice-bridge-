import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; accesscode?: string }>;
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

const BACKEND_URLS = [
  'http://localhost:5000/api',
  'http://172.20.65.219:5000/api',
  'http://10.0.2.2:5000/api',
  'https://recordingapi.evaakya.com/api',
];

async function tryBackendFetch(endpoint: string, options: any = {}) {
  const token = await AsyncStorage.getItem('vb_jwt_token').catch(() => null);
  for (const baseUrl of BACKEND_URLS) {
    try {
      console.log(`[API Fetch] Connecting to: ${baseUrl}${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`[API Fetch] Status ${response.status} from ${baseUrl}${endpoint}`);
      if (response.ok || response.status === 200 || response.status === 201) {
        return response;
      }
      console.log(`[API Fetch] Unsuccessful response ${response.status} from ${baseUrl}${endpoint}, trying next fallback...`);
    } catch (err: any) {
      console.log(`[API Fetch] Failed connecting to ${baseUrl}${endpoint}:`, err?.message);
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRaw, currentId, profileRaw] = await Promise.all([
        AsyncStorage.getItem(USERS_KEY),
        AsyncStorage.getItem(CURRENT_USER_KEY),
        AsyncStorage.getItem('vb_user_profile'),
      ]);

      let allUsers: User[] = usersRaw ? JSON.parse(usersRaw) : [];
      allUsers = allUsers.filter((u: User) => !u.userId.startsWith('SPK-00'));
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(allUsers));

      setUsers(allUsers);

      if (profileRaw) {
        setCurrentUser(JSON.parse(profileRaw));
      } else if (currentId) {
        const found = allUsers.find((u) => u.userId === currentId);
        if (found) setCurrentUser(found);
      }

      if (currentId) {

        // Fetch registered speakers list from MongoDB backend in background
        tryBackendFetch('/searchspeaker', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }).then(async (res) => {
          if (res && res.ok) {
            const resData = await res.json();
            if (resData.success && Array.isArray(resData.data)) {
              console.log('[MongoDB Speakers List Loaded] Count:', resData.data.length);
              const mapped: User[] = resData.data.map((apiUser: any) => ({
                userId: apiUser.speakerID || apiUser.id || apiUser._id || makeId(),
                fullName: apiUser.name || apiUser.fullName || 'Speaker',
                age: apiUser.age || 25,
                gender: apiUser.gender || 'Male',
                state: apiUser.state || '',
                district: apiUser.district || '',
                pincode: apiUser.pincode || '',
                qualification: apiUser.qualification || '',
                recordingLanguages: apiUser.recordingLanguages || [apiUser.language || 'Hindi'],
                knownLanguages: apiUser.knownLanguages || [apiUser.knownlanguages || 'Hindi'],
                consentLanguage: apiUser.consentLanguage || apiUser.consentlanguage || 'Hindi',
                mobile: apiUser.mobile || '',
                coordinator: apiUser.coordinatorName || apiUser.coordinator || '',
                createdAt: apiUser.createdAt || apiUser.createdOn || new Date().toISOString(),
                voiceVerified: apiUser.voiceVerified !== false,
              }));
              
              setUsers(mapped);
              await AsyncStorage.setItem(USERS_KEY, JSON.stringify(mapped));
            }
          }
        }).catch((err) => {
          console.log('[loadData Speakers Fetch Error]:', err?.message);
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  async function login(mobile: string, code: string) {
    try {
      console.log('[Login Attempting on Live API]', { mobile: mobile.trim(), code: code.trim() });
      const response = await tryBackendFetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        },
        body: JSON.stringify({
          mobile: mobile.trim(),
          accesscode: code.trim(),
          appVersionNumber: 30,
        }),
      });

      if (!response) {
        return { success: false, error: 'Could not connect to backend server. Check network connection.' };
      }

      const resData = await response.json();
      console.log('[Login API Response]', resData);

      if (!response.ok || !resData.success) {
        return {
          success: false,
          error: resData.error || resData.msg || resData.message || 'Login failed',
        };
      }

      // Save JWT token in AsyncStorage
      if (resData.token) {
        await AsyncStorage.setItem('vb_jwt_token', resData.token);
      }

      const apiUser = resData.user || resData.data || {};
      const formattedUser: User = {
        userId: apiUser.speakerID || apiUser.id || apiUser._id || makeId(),
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
        createdAt: apiUser.createdAt || apiUser.createdOn || new Date().toISOString(),
        voiceVerified: apiUser.voiceVerified !== false,
      };

      await AsyncStorage.setItem(CURRENT_USER_KEY, formattedUser.userId);
      await AsyncStorage.setItem('vb_user_profile', JSON.stringify(formattedUser));
      setCurrentUser(formattedUser);
      
      // Auto-trigger reloading data to load all other speakers
      setTimeout(() => {
        loadData();
      }, 500);

      return { success: true };
    } catch (err: any) {
      console.log('Login error:', err?.message);
      return { success: false, error: err?.message || 'Login failed' };
    }
  }

  async function register(data: RegisterData) {
    try {
      console.log('[Register Sending to Live API]', data);
      const response = await tryBackendFetch('/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        },
        body: JSON.stringify({
          name: data.fullName,
          fullName: data.fullName,
          mobile: data.mobile.trim(),
          accesscode: '123456',
          appVersionNumber: 30,
          role: 'Vendor',
          age: data.age,
          gender: data.gender,
          state: data.state,
          district: data.district,
          pincode: data.pincode,
          qualification: data.qualification,
          recordingLanguages: data.recordingLanguages,
          knownLanguages: data.knownLanguages,
          knownlanguages: Array.isArray(data.knownLanguages) ? data.knownLanguages.join(',') : 'Hindi',
          consentLanguage: data.consentLanguage,
          consentlanguage: data.consentLanguage,
          coordinator: data.coordinator,
          latitude: 18,
          longitude: 73,
          phonebrand: 'Android',
          phonemodel: 'Smartphone',
          acceptTerms: 'true',
        }),
      });

      if (!response) {
        return { success: false, error: 'Could not connect to live backend server.' };
      }

      const resData = await response.json();
      console.log('[Register API Response]', resData);

      if (!response.ok || (!resData.success && !resData.data)) {
        return {
          success: false,
          error: resData.error || resData.msg || resData.message || 'Registration failed',
        };
      }

      const createdUserObj = resData.data || resData.user || {};
      const createdId = createdUserObj.speakerID || createdUserObj._id || createdUserObj.id || makeId();

      const newUser: User = {
        ...data,
        mobile: data.mobile.trim(),
        userId: createdId,
        createdAt: createdUserObj.createdOn || new Date().toISOString(),
        voiceVerified: true,
      };

      const updated = [...users, newUser];
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(CURRENT_USER_KEY, newUser.userId);
      await AsyncStorage.setItem('vb_user_profile', JSON.stringify(newUser));
      setUsers(updated);
      setCurrentUser(newUser);



      const generatedCode = createdUserObj.accesscode || '123456';

      // Perform background login to get JWT token so the user is authenticated for speaker list endpoints
      try {
        const loginResponse = await tryBackendFetch('/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
          },
          body: JSON.stringify({
            mobile: data.mobile.trim(),
            accesscode: generatedCode,
            appVersionNumber: 30,
          }),
        });

        if (loginResponse && loginResponse.ok) {
          const loginData = await loginResponse.json();
          if (loginData.success && loginData.token) {
            await AsyncStorage.setItem('vb_jwt_token', loginData.token);
          }
        }
      } catch (loginErr) {
        console.log('[Background Register Login Error]:', loginErr);
      }

      // Reload speakers list from MongoDB backend
      setTimeout(() => {
        loadData();
      }, 500);

      return { success: true, accesscode: generatedCode };
    } catch (err: any) {
      console.log('Register error:', err?.message);
      return { success: false, error: err?.message || 'Registration failed' };
    }
  }

  async function logout() {
    await AsyncStorage.multiRemove([CURRENT_USER_KEY, 'vb_jwt_token', USERS_KEY, 'vb_user_profile']).catch(() => {});
    setCurrentUser(null);
    setUsers([]);
  }

  async function updateUser(userId: string, updates: Partial<User>) {
    const updated = users.map((u) => (u.userId === userId ? { ...u, ...updates } : u));
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(updated));
    setUsers(updated);
    if (currentUser?.userId === userId) {
      const refreshed = updated.find((u) => u.userId === userId) ?? null;
      setCurrentUser(refreshed);
      if (refreshed) {
        await AsyncStorage.setItem('vb_user_profile', JSON.stringify(refreshed)).catch(() => {});
      }
    }
  }

  function searchUsers(query: string): User[] {
    const q = query.trim().toLowerCase();
    
    // Background query MongoDB if query is typed
    if (q.length >= 6) {
      tryBackendFetch(`/searchspeaker?speakerID=${query.trim()}`)
        .then(async (res) => {
          if (res && res.ok) {
            const resData = await res.json();
            if (resData.success && resData.data) {
              const apiUser = resData.data;
              const speaker: User = {
                userId: apiUser.speakerID || apiUser.id || apiUser._id || makeId(),
                fullName: apiUser.name || apiUser.fullName || 'Speaker',
                age: apiUser.age || 25,
                gender: apiUser.gender || 'Male',
                state: apiUser.state || '',
                district: apiUser.district || '',
                pincode: apiUser.pincode || '',
                qualification: apiUser.qualification || '',
                recordingLanguages: apiUser.recordingLanguages || [apiUser.language || 'Hindi'],
                knownLanguages: apiUser.knownLanguages || [apiUser.knownlanguages || 'Hindi'],
                consentLanguage: apiUser.consentLanguage || apiUser.consentlanguage || 'Hindi',
                mobile: apiUser.mobile || '',
                coordinator: apiUser.coordinatorName || apiUser.coordinator || '',
                createdAt: apiUser.createdAt || apiUser.createdOn || new Date().toISOString(),
                voiceVerified: apiUser.voiceVerified !== false,
              };

              setUsers((prev) => {
                const exists = prev.some((u) => u.userId === speaker.userId);
                if (exists) return prev;
                const newUsers = [...prev, speaker];
                AsyncStorage.setItem(USERS_KEY, JSON.stringify(newUsers)).catch(() => {});
                return newUsers;
              });
            }
          }
        })
        .catch(() => {});
    }

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
