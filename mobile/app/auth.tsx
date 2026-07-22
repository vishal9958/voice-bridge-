import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import SearchableDropdown from '@/components/SearchableDropdown';
import SearchableMultiSelect from '@/components/SearchableMultiSelect';
import AudioPlayer from '@/components/AudioPlayer';
import { STATE_NAMES, getDistricts, getPincodes } from '@/data/india';
import { LANGUAGES, COORDINATORS, QUALIFICATIONS } from '@/data/languages';

type Mode = 'login' | 'register' | 'verify';
type RecordState = 'idle' | 'recording' | 'paused' | 'stopped';

const SAMPLE_IMAGES = [
  require('@/assets/images/sample_01.jpg'),
  require('@/assets/images/sample_02.jpg'),
  require('@/assets/images/sample_03.jpg'),
  require('@/assets/images/sample_04.jpg'),
  require('@/assets/images/sample_05.jpg'),
  require('@/assets/images/sample_06.jpg'),
  require('@/assets/images/sample_07.jpg'),
  require('@/assets/images/sample_08.jpg'),
  require('@/assets/images/sample_09.jpg'),
  require('@/assets/images/sample_10.jpg'),
];

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
function TabBar({ mode, onChange, colors }: { mode: Mode; onChange: (m: Mode) => void; colors: ReturnType<typeof useColors> }) {
  const tabs: { key: Mode; label: string }[] = [
    { key: 'login', label: 'Login' },
    { key: 'register', label: 'Register' },
    { key: 'verify', label: 'Verify Voice' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.muted, borderRadius: 10, padding: 4, margin: 16, marginBottom: 0 }}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: mode === t.key ? colors.card : 'transparent',
            shadowColor: mode === t.key ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 2,
            elevation: mode === t.key ? 2 : 0,
          }}
          onPress={() => onChange(t.key)}
        >
          <Text style={{ fontSize: 13, fontWeight: mode === t.key ? '700' : '500', color: mode === t.key ? colors.primary : colors.mutedForeground }}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Labeled Input ────────────────────────────────────────────────────────────
function LabeledInput({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: colors.card,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 13,
          fontSize: 15,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        placeholderTextColor={colors.mutedForeground}
        {...props}
      />
    </View>
  );
}

// ─── Radio Group ──────────────────────────────────────────────────────────────
function RadioGroup({ label, options, value, onChange, colors }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: value === opt ? colors.primary : colors.border,
              backgroundColor: value === opt ? colors.accent : colors.card,
            }}
          >
            <View style={{
              width: 16, height: 16, borderRadius: 8,
              borderWidth: 2,
              borderColor: value === opt ? colors.primary : colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {value === opt && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
            </View>
            <Text style={{ fontSize: 14, fontWeight: value === opt ? '600' : '400', color: value === opt ? colors.primary : colors.text }}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Login Section ────────────────────────────────────────────────────────────
function LoginSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const router = useRouter();
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!mobile.trim() || mobile.trim().length !== 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!code.trim()) {
      Alert.alert('Access Code Required', 'Please enter your access code.');
      return;
    }
    setLoading(true);
    const result = await login(mobile.trim(), code.trim());
    setLoading(false);
    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/home');
    } else {
      Alert.alert('Login Failed', result.error ?? 'Unknown error');
    }
  }

  return (
    <View style={{ padding: 20, paddingTop: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Welcome Back</Text>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 24, lineHeight: 20 }}>
        Sign in with your mobile number and access code.
      </Text>
      <LabeledInput
        label="Mobile Number"
        placeholder="10-digit mobile number"
        value={mobile}
        onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
        keyboardType="number-pad"
        maxLength={10}
      />
      <LabeledInput
        label="Access Code"
        placeholder="Enter access code"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        secureTextEntry
      />
      <TouchableOpacity
        style={{ backgroundColor: loading ? colors.border : colors.primary, borderRadius: colors.radius, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>
      <View style={{ backgroundColor: colors.muted, borderRadius: 10, padding: 12, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border }}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
          Default access code: <Text style={{ fontWeight: '700', color: colors.text }}>123456</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Register Section ─────────────────────────────────────────────────────────
function RegisterSection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [qualification, setQualification] = useState('');
  const [recordingLanguages, setRecordingLanguages] = useState<string[]>([]);
  const [knownLanguages, setKnownLanguages] = useState<string[]>([]);
  const [mobile, setMobile] = useState('');
  const [coordinator, setCoordinator] = useState('');
  const [consentLanguage, setConsentLanguage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const districts = state ? getDistricts(state) : [];
  const pincodes = state && district ? getPincodes(state, district) : [];

  function handleStateChange(s: string) { setState(s); setDistrict(''); setPincode(''); }
  function handleDistrictChange(d: string) { setDistrict(d); setPincode(''); }

  async function handleRegister() {
    if (!fullName.trim()) return Alert.alert('Required', 'Full name is required.');
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18) return Alert.alert('Age Required', 'You must be 18 or older.');
    if (!gender) return Alert.alert('Required', 'Please select your gender.');
    if (!state) return Alert.alert('Required', 'Please select your state.');
    if (!district) return Alert.alert('Required', 'Please select your district.');
    if (!pincode) return Alert.alert('Required', 'Please select your pincode.');
    if (!qualification) return Alert.alert('Required', 'Please select your qualification.');
    if (recordingLanguages.length === 0) return Alert.alert('Required', 'Select at least one recording language.');
    if (knownLanguages.length === 0) return Alert.alert('Required', 'Select at least one known language.');
    if (mobile.length !== 10) return Alert.alert('Invalid Mobile', 'Enter a valid 10-digit mobile number.');
    if (!coordinator) return Alert.alert('Required', 'Please select a coordinator.');
    if (!consentLanguage) return Alert.alert('Required', 'Please select a consent language.');
    if (!acceptedTerms) return Alert.alert('Terms Required', 'Please accept the terms and conditions.');

    setLoading(true);
    const result = await register({
      fullName: fullName.trim(),
      age: ageNum,
      gender: gender as 'Male' | 'Female' | 'Other',
      state, district, pincode, qualification,
      recordingLanguages, knownLanguages,
      mobile: mobile.trim(), coordinator, consentLanguage,
    });
    setLoading(false);

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Registration Successful!',
        `Your Access Code for Login is: ${result.accesscode || '123456'}\n\nPlease note down this access code to login anytime.`,
        [{ text: 'OK', onPress: () => router.replace('/home') }]
      );
    } else {
      Alert.alert('Registration Failed', result.error ?? 'Unknown error');
    }
  }

  if (success) {
    return (
      <View style={{ padding: 20, paddingTop: 24 }}>
        <View style={{ backgroundColor: colors.muted, borderRadius: colors.radius, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border }}>
          <Feather name="check-circle" size={48} color={colors.primary} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>Registered!</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
            Your account has been created. Switch to the Login tab to sign in, or go to Verify Voice to record your voice sample.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, paddingTop: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Create Account</Text>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 24, lineHeight: 20 }}>Fill in all fields to register as a speaker.</Text>

      <LabeledInput label="Full Name" placeholder="Your full name" value={fullName} onChangeText={setFullName} />
      <LabeledInput label="Age" placeholder="Your age (18+)" value={age} onChangeText={(t) => setAge(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={3} />
      <RadioGroup label="Gender" options={['Male', 'Female', 'Other']} value={gender} onChange={setGender} colors={colors} />

      <SearchableDropdown label="State" placeholder="Select state" options={STATE_NAMES} value={state} onChange={handleStateChange} />
      <SearchableDropdown label="District" placeholder={state ? 'Select district' : 'Select state first'} options={districts} value={district} onChange={handleDistrictChange} disabled={!state} />
      <SearchableDropdown label="Pincode" placeholder={district ? 'Select pincode' : 'Select district first'} options={pincodes} value={pincode} onChange={setPincode} disabled={!district} />

      <RadioGroup label="Educational Qualification" options={QUALIFICATIONS} value={qualification} onChange={setQualification} colors={colors} />

      <SearchableMultiSelect label="Recording Languages" placeholder="Select languages" options={LANGUAGES} values={recordingLanguages} onChange={setRecordingLanguages} />
      <SearchableMultiSelect label="Known Languages" placeholder="Select languages" options={LANGUAGES} values={knownLanguages} onChange={setKnownLanguages} />

      <LabeledInput label="Mobile Number" placeholder="10-digit mobile number" value={mobile} onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))} keyboardType="number-pad" maxLength={10} />

      <SearchableDropdown label="Coordinator" placeholder="Select coordinator" options={COORDINATORS} value={coordinator} onChange={setCoordinator} />
      <SearchableDropdown label="Consent Form Language" placeholder="Select language" options={LANGUAGES} value={consentLanguage} onChange={setConsentLanguage} />

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 }} onPress={() => setAcceptedTerms((v) => !v)}>
        <View style={{
          width: 22, height: 22, borderRadius: 6, borderWidth: 2,
          borderColor: acceptedTerms ? colors.primary : colors.border,
          backgroundColor: acceptedTerms ? colors.primary : 'transparent',
          alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>
          {acceptedTerms && <Feather name="check" size={13} color="#fff" />}
        </View>
        <Text style={{ flex: 1, fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>
          I agree to the terms and conditions, and consent to my voice being recorded for AI dataset collection purposes.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ backgroundColor: loading ? colors.border : colors.primary, borderRadius: colors.radius, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{loading ? 'Registering…' : 'Register'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Verify Voice Section ─────────────────────────────────────────────────────
function VerifySection({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { login, updateUser, currentUser } = useAuth();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<string | null>(currentUser?.userId ?? null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Pick a random image once on mount
  const [randomImg] = useState(() => Math.floor(Math.random() * 10));
  const [recState, setRecState] = useState<RecordState>('idle');
  const [timer, setTimer] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [verified, setVerified] = useState(currentUser?.voiceVerified ?? false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync when currentUser loads asynchronously (auth context may not be ready at mount)
  useEffect(() => {
    if (currentUser) {
      if (!verifiedUser) setVerifiedUser(currentUser.userId);
      setVerified(currentUser.voiceVerified);
    }
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  async function handleVerifyLogin() {
    if (mobile.length !== 10) return Alert.alert('Invalid Mobile', 'Enter 10-digit mobile number.');
    if (!code.trim()) return Alert.alert('Required', 'Enter your access code.');
    setLoginLoading(true);
    const result = await login(mobile.trim(), code.trim());
    setLoginLoading(false);
    if (result.success) {
      setVerifiedUser(mobile.trim());
    } else {
      Alert.alert('Login Failed', result.error ?? 'Unknown error');
    }
  }

  async function startRec() {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      if (recState === 'paused' && recordingRef.current) {
        await recordingRef.current.startAsync();
      } else {
        const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        recordingRef.current = recording;
      }
      setRecState('recording');
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert('Error', 'Could not start recording. Check microphone permission.');
    }
  }

  async function pauseRec() {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    await recordingRef.current.pauseAsync();
    setRecState('paused');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function stopRec() {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setAudioUri(uri ?? null);
      recordingRef.current = null;
    } catch {
      setAudioUri(null);
    }
    setRecState('stopped');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function deleteRec() {
    setAudioUri(null);
    setRecState('idle');
    setTimer(0);
  }

  async function handleVerifyVoice() {
    if (!audioUri) return Alert.alert('No Recording', 'Please record your voice first.');
    if (timer < 5) return Alert.alert('Too Short', 'Record for at least 5 seconds.');
    setUploadLoading(true);
    await new Promise((res) => setTimeout(res, 1500));
    if (currentUser) {
      await updateUser(currentUser.userId, { voiceVerified: true, voiceAudioUri: audioUri });
    }
    setVerified(true);
    setUploadLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // Timer color based on state
  const timerBg =
    recState === 'recording' ? colors.primary :
    recState === 'paused' ? '#8E8E93' :
    recState === 'stopped' ? colors.destructive :
    colors.muted;
  const timerColor = recState === 'idle' ? colors.mutedForeground : '#ffffff';

  if (verified) {
    return (
      <View style={{ padding: 20, paddingTop: 24 }}>
        <View style={{ backgroundColor: colors.muted, borderRadius: colors.radius, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border }}>
          <Feather name="check-circle" size={48} color={colors.primary} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>Voice Verified!</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 }}>
            Your voice sample has been saved. You can now participate in bridge calls.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ padding: 20, paddingTop: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Verify Your Voice</Text>
      <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 16, lineHeight: 20 }}>
        Look at the image below and record yourself describing it in your language.
      </Text>

      {/* Random image — always visible */}
      <Image
        source={SAMPLE_IMAGES[randomImg]}
        style={{ width: '100%', height: 190, borderRadius: 12, marginBottom: 8, backgroundColor: colors.muted }}
        resizeMode="cover"
      />
      <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center', marginBottom: 20 }}>
        Describe this image in your own language
      </Text>

      {/* ── NOT LOGGED IN: show login form ── */}
      {!verifiedUser && (
        <View style={{ backgroundColor: colors.muted, borderRadius: colors.radius, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 }}>Sign in to record</Text>
          <LabeledInput
            label="Mobile Number"
            placeholder="10-digit mobile number"
            value={mobile}
            onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
          />
          <LabeledInput
            label="Access Code"
            placeholder="Enter access code"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
            secureTextEntry
          />
          <TouchableOpacity
            style={{ backgroundColor: loginLoading ? colors.border : colors.primary, borderRadius: colors.radius, paddingVertical: 14, alignItems: 'center' }}
            onPress={handleVerifyLogin}
            disabled={loginLoading}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{loginLoading ? 'Signing in…' : 'Sign In & Record'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── LOGGED IN: show recording controls ── */}
      {verifiedUser && (
        <>
          {/* Timer */}
          <View style={{
            alignSelf: 'center',
            backgroundColor: timerBg,
            borderRadius: 14,
            paddingHorizontal: 28,
            paddingVertical: 16,
            marginBottom: 20,
            minWidth: 140,
            alignItems: 'center',
            borderWidth: recState === 'idle' ? 1 : 0,
            borderColor: colors.border,
          }}>
            <Text style={{
              fontSize: 40,
              fontWeight: '800',
              color: timerColor,
              fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            }}>
              {formatTimer(timer)}
            </Text>
            <Text style={{ fontSize: 11, color: timerColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : colors.mutedForeground, marginTop: 2 }}>
              {recState === 'idle' ? 'Tap mic to start' : recState === 'recording' ? 'Recording…' : recState === 'paused' ? 'Paused' : 'Stopped'}
            </Text>
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            {/* Start / Resume */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: recState === 'recording' || recState === 'stopped' ? colors.border : colors.primary,
                  alignItems: 'center', justifyContent: 'center',
                }}
                onPress={startRec}
                disabled={recState === 'recording' || recState === 'stopped'}
              >
                <Feather name="mic" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{recState === 'paused' ? 'Resume' : 'Record'}</Text>
            </View>

            {/* Pause */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: recState !== 'recording' ? colors.border : '#8E8E93',
                  alignItems: 'center', justifyContent: 'center',
                }}
                onPress={pauseRec}
                disabled={recState !== 'recording'}
              >
                <Feather name="pause" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Pause</Text>
            </View>

            {/* Stop */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={{
                  width: 60, height: 60, borderRadius: 30,
                  backgroundColor: recState === 'idle' || recState === 'stopped' ? colors.border : colors.destructive,
                  alignItems: 'center', justifyContent: 'center',
                }}
                onPress={stopRec}
                disabled={recState === 'idle' || recState === 'stopped'}
              >
                <Feather name="square" size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: colors.mutedForeground }}>Stop</Text>
            </View>
          </View>

          {/* Playback */}
          {audioUri && recState === 'stopped' && (
            <View style={{ marginBottom: 12 }}>
              <AudioPlayer uri={audioUri} onDelete={deleteRec} />
            </View>
          )}

          {/* Verify button */}
          {recState === 'stopped' && audioUri && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={handleVerifyVoice}
              disabled={uploadLoading}
            >
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                {uploadLoading ? 'Saving…' : 'Verify Voice'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

// ─── Main Auth Screen ─────────────────────────────────────────────────────────
export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Classic white header */}
      <View style={{
        backgroundColor: colors.card,
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>VoiceBridge</Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
          Voice Dataset Collection Platform
        </Text>
      </View>

      <TabBar mode={mode} onChange={setMode} colors={colors} />

      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {mode === 'login' && <LoginSection colors={colors} />}
        {mode === 'register' && <RegisterSection colors={colors} />}
        {mode === 'verify' && <VerifySection colors={colors} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
