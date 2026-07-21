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
  values: string[];
  onChange: (values: string[]) => void;
}

export default function SearchableMultiSelect({ label, placeholder = 'Select…', options, values, onChange }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(opt: string) {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  const s = styles(colors);

  return (
    <View style={s.wrapper}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TouchableOpacity style={s.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {values.length === 0 ? (
            <Text style={s.placeholder}>{placeholder}</Text>
          ) : values.length <= 3 ? (
            values.map((v) => (
              <View key={v} style={s.chip}>
                <Text style={s.chipText}>{v}</Text>
              </View>
            ))
          ) : (
            <Text style={s.triggerText} numberOfLines={1}>
              {values.slice(0, 2).join(', ')} +{values.length - 2} more
            </Text>
          )}
        </View>
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={close} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              {label ? <Text style={s.sheetTitle}>{label}</Text> : null}
              <TouchableOpacity onPress={close} style={s.doneBtn}>
                <Text style={s.doneText}>Done ({values.length})</Text>
              </TouchableOpacity>
            </View>
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
              renderItem={({ item }) => {
                const selected = values.includes(item);
                return (
                  <TouchableOpacity style={s.option} onPress={() => toggle(item)}>
                    <Text style={[s.optionText, selected && s.selectedText]}>{item}</Text>
                    <View style={[s.checkbox, selected && s.checkboxSelected]}>
                      {selected && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={s.empty}>No results</Text>}
              style={{ maxHeight: 320 }}
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
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 46,
    },
    triggerText: { fontSize: 15, color: colors.text, flex: 1 },
    placeholder: { fontSize: 15, color: colors.mutedForeground },
    chip: { backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    chipText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    doneBtn: { paddingHorizontal: 4, paddingVertical: 4 },
    doneText: { fontSize: 15, fontWeight: '600', color: colors.primary },
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
    optionText: { fontSize: 15, color: colors.text },
    selectedText: { color: colors.primary, fontWeight: '600' },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    empty: { textAlign: 'center', color: colors.mutedForeground, paddingVertical: 24, fontSize: 14 },
  });
}
