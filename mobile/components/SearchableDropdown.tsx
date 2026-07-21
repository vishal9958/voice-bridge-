import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  label?: string;
  placeholder?: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function SearchableDropdown({ label, placeholder = 'Select…', options, value, onChange, disabled }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function select(opt: string) {
    onChange(opt);
    setOpen(false);
    setQuery('');
  }

  const s = styles(colors);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[s.trigger, disabled && s.disabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[s.triggerText, !value && s.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => { setOpen(false); setQuery(''); }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => { setOpen(false); setQuery(''); }} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            {label ? <Text style={s.sheetTitle}>{label}</Text> : null}
            <View style={s.searchBox}>
              <Feather name="search" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                style={s.searchInput}
                placeholder="Search…"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoFocus
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ) : null}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.option, item === value && s.selectedOption]}
                  onPress={() => select(item)}
                >
                  <Text style={[s.optionText, item === value && s.selectedOptionText]}>{item}</Text>
                  {item === value && <Feather name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.empty}>No results</Text>}
              style={{ maxHeight: 340 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    wrapper: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disabled: { opacity: 0.45 },
    triggerText: { fontSize: 15, color: colors.text, flex: 1, marginRight: 8 },
    placeholder: { color: colors.mutedForeground },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: colors.text },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 13,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    selectedOption: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8 },
    optionText: { fontSize: 15, color: colors.text },
    selectedOptionText: { color: colors.primary, fontWeight: '600' },
    empty: { textAlign: 'center', color: colors.mutedForeground, paddingVertical: 24, fontSize: 14 },
  });
}
