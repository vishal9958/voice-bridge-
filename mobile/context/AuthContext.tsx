import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';


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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'vb_users';
const CURRENT_USER_KEY = 'vb_current_user';

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function getBackendUrls(): string[] {
  const urls: string[] = [
    'https://recordingapi.evaakya.com/api',
  ];
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      urls.push(`http://${ip}:5000/api`);
    }
  }
  urls.push('http://localhost:5000/api');
  urls.push('http://192.168.100.183:5000/api');
  urls.push('http://172.20.65.219:5000/api');
  urls.push('http://10.0.2.2:5000/api');
  return Array.from(new Set(urls));
}

let globalJwtToken: string | null = null;

async function tryBackendFetch(endpoint: string, options: any = {}) {
  const token = globalJwtToken || (await AsyncStorage.getItem('vb_jwt_token').catch(() => null));
  if (token && !globalJwtToken) {
    globalJwtToken = token;
  }

  const backendUrls = getBackendUrls();
  for (const baseUrl of backendUrls) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': 'cd6631d9-484b-4805-9cb1-34c7b6cd8209',
        ...(options.headers || {}),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      console.log(`[API Fetch] Connecting to: ${baseUrl}${endpoint} (Bearer Token: ${token ? 'PRESENT' : 'MISSING'})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
      const [currentId, profileRaw] = await Promise.all([
        AsyncStorage.getItem(CURRENT_USER_KEY),
        AsyncStorage.getItem('vb_user_profile'),
      ]);

      if (profileRaw) {
        setCurrentUser(JSON.parse(profileRaw));
      }

      if (currentId) {
        // Fetch registered speakers list directly from MongoDB Atlas backend
        const fetchSpeakers = async () => {
          let res = await tryBackendFetch('/searchspeaker', { method: 'GET' });
          if (!res || !res.ok) {
            res = await tryBackendFetch('/user/searchspeaker', { method: 'GET' });
          }

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
        };
        fetchSpeakers().catch((err) => console.log('[loadData Speakers Fetch Error]:', err?.message));
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

      // Save JWT token in memory and AsyncStorage
      if (resData.token) {
        globalJwtToken = resData.token;
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
    
    // Background query MongoDB if query is typed (trying /searchspeaker then /user/searchspeaker)
    if (q.length >= 6) {
      const searchFn = async () => {
        let res = await tryBackendFetch(`/searchspeaker?speakerID=${query.trim()}`);
        if (!res || !res.ok) {
          res = await tryBackendFetch(`/user/searchspeaker?speakerID=${query.trim()}`);
        }
        if (res && res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            const list = Array.isArray(resData.data) ? resData.data : [resData.data];
            const fetchedSpeakers: User[] = list.map((apiUser: any) => ({
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

            setUsers((prev) => {
              const map = new Map<string, User>();
              prev.forEach((u) => map.set(u.userId, u));
              fetchedSpeakers.forEach((u) => map.set(u.userId, u));
              const newUsers = Array.from(map.values());
              AsyncStorage.setItem(USERS_KEY, JSON.stringify(newUsers)).catch(() => {});
              return newUsers;
            });
          }
        }
      };
      searchFn().catch(() => {});
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
