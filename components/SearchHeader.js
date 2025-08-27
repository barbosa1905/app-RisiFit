// components/SearchHeader.js
import React, { useMemo, useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';

export default function SearchHeader({
  value = '',
  onChangeText,
  placeholder = 'Pesquisar…',
  onAddPress,
  debounceMs = 120,            // NOVO: controla o debounce leve
  testID,
}) {
  const inputRef = useRef(null);

  const handlers = useMemo(() => {
    let t = null;
    return {
      onText: (txt) => {
        if (!onChangeText) return;
        if (t) clearTimeout(t);
        t = setTimeout(() => onChangeText(txt), debounceMs);
      },
    };
  }, [onChangeText, debounceMs]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={value}                         // CONTROLADO
          onChangeText={handlers.onText}
          returnKeyType="search"
          accessibilityLabel="Pesquisar"
        />
        {!!value && value.length > 0 && (
          <Pressable
            onPress={() => {
              onChangeText?.('');
              inputRef.current?.clear();
            }}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpar pesquisa"
            android_ripple={{ color: '#00000014' }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {onAddPress && (
        <Pressable
          onPress={onAddPress}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Adicionar"
          android_ripple={{ color: '#00000014' }}
        >
          <Ionicons name="person-add-outline" size={20} color={Colors.onPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    columnGap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: HEIGHT,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  input: { flex: 1, color: Colors.textPrimary, paddingVertical: 0 },
  clearBtn: { padding: 2, borderRadius: 10 },
  addBtn: { width: HEIGHT, height: HEIGHT, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});
