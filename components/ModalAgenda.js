// components/ModalAgenda.js
import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';

const GRADIENT_GOLD = Colors.gradientGold || ['#FFB800', '#D19A24'];
const SECONDARY_SOFT = Colors.secondarySoft || 'rgba(255, 184, 0, 0.12)';

export default function ModalAgenda({
  visible,
  onClose,
  onChoose,      // (tipo) => void
  date,          // 'YYYY-MM-DD' | Date
}) {
  const d = useMemo(() => {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const maybe = new Date(date);
    return Number.isNaN(maybe.getTime()) ? null : maybe;
  }, [date]);

  const isPast = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const sel = new Date(d || new Date()); sel.setHours(0,0,0,0);
    return sel < today;
  }, [d]);

  const dateLabel = d
    ? d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Adicionar novo item</Text>

          <View style={styles.dateRow}>
            <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{dateLabel}</Text>
            {isPast && (
              <View style={styles.badge}>
                <MaterialIcons name="lock" size={14} color={Colors.secondary} />
                <Text style={styles.badgeText}>Só leitura (data passada)</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Tile label="Nota" icon="note" disabled={isPast} onPress={() => onChoose?.('nota')} />
            <Tile label="Treino" icon="fitness-center" disabled={isPast} onPress={() => onChoose?.('treino')} />
            <Tile label="Avaliação" icon="assignment" disabled={isPast} onPress={() => onChoose?.('avaliacao')} />
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Tile({ label, icon, disabled, onPress }) {
  return (
    <TouchableOpacity style={{ flex: 1 }} activeOpacity={disabled ? 1 : 0.92} onPress={disabled ? undefined : onPress}>
      <LinearGradient
        colors={disabled ? [Colors.cardBackground, Colors.cardBackground] : GRADIENT_GOLD}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.tileBorder}
      >
        <View style={[styles.tileInner, disabled && styles.tileInnerDisabled]}>
          <View style={styles.iconCircle}>
            <MaterialIcons name={icon} size={20} color={disabled ? Colors.textSecondary : Colors.primary} />
          </View>
          <Text style={[styles.tileLabel, disabled && { color: Colors.textSecondary }]}>{label}</Text>
          {disabled && (
            <View style={styles.lockMini}>
              <MaterialIcons name="lock" size={13} color={Colors.secondary} />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  box: {
    width: '90%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    ...Colors.cardElevation,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  dateText: { color: Colors.textSecondary, flex: 1 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: SECONDARY_SOFT, borderColor: Colors.secondary, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  badgeText: { color: Colors.primary, fontWeight: '800', fontSize: 11 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  tileBorder: { borderRadius: 16, padding: 2 },
  tileInner: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    ...Colors.cardElevation,
  },
  tileInnerDisabled: { backgroundColor: Colors.surface },
  iconCircle: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: { fontWeight: '800', color: Colors.primary },
  lockMini: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: SECONDARY_SOFT,
    borderWidth: 1, borderColor: Colors.secondary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
  },

  closeBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.primary, fontWeight: '800' },
});
