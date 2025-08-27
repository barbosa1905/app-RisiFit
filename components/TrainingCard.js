// components/TrainingCard.js
import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';

const CARD_SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
});

const defaultFormat = (secs) => {
  if (typeof secs !== 'number' || isNaN(secs) || secs < 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const out = [];
  if (h) out.push(`${h}h`);
  if (m || (!h && s)) out.push(`${String(m).padStart(2, '0')}m`);
  if (s || (!h && !m)) out.push(`${String(s).padStart(2, '0')}s`);
  return out.join(' ');
};

const RatingStars = memo(({ value = 0 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons key={i} name={i <= value ? 'star' : 'star-outline'} size={16} color={Colors.secondary} style={{ marginRight: 2 }} />
    );
  }
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
});

function TrainingCard({
  type = 'upcoming',        // 'upcoming' | 'completed'
  training = {},
  formatarDuracao = defaultFormat,
  onPress,
  testID,
}) {
  const title = training.nome || training.name || training.nomeTreino || 'Treino';
  const category = training.categoria || training.category || null;
  const clientName = training.clientName || training.cliente || 'Cliente';

  const whenDate = useMemo(() => {
    const d = type === 'completed'
      ? (training.dataConclusao instanceof Date ? training.dataConclusao : (training.dataConclusao?.toDate?.() ?? null))
      : (training.data instanceof Date ? training.data : (training.data?.toDate?.() ?? null));
    return d || null;
  }, [training, type]);

  const whenLabel = useMemo(() => {
    const d = whenDate;
    if (!d) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} • ${hh}:${min}`;
  }, [whenDate]);

  const durationTxt = useMemo(() => {
    const raw = training.duracao ?? training.duration ?? training.totalSeconds ?? null;
    if (raw == null) return null;
    if (typeof raw === 'number' && raw > 3600) return formatarDuracao(raw);
    if (typeof raw === 'number' && raw <= 3600 && raw > 120) return `${raw} min`;
    return `${raw}`;
  }, [training, formatarDuracao]);

  const leftIcon = type === 'completed' ? 'checkmark-done-circle' : 'barbell-outline';
  const leftColor = type === 'completed' ? Colors.success : Colors.secondary;

  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.card, CARD_SHADOW]}
      android_ripple={{ color: '#00000012' }}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${title}. ${clientName}. ${whenLabel}`}
      testID={testID}
    >
      <View style={[styles.leftBadge, { backgroundColor: `${leftColor}1A` }]}>
        <Ionicons name={leftIcon} size={22} color={leftColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
          <Text numberOfLines={1} style={styles.metaTxt}>{clientName}</Text>
        </View>

        {category ? (
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.textSecondary} />
            <Text numberOfLines={1} style={styles.metaTxt}>{category}</Text>
          </View>
        ) : null}

        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Ionicons name={type === 'completed' ? 'time-outline' : 'calendar-outline'} size={14} color={Colors.textSecondary} />
          <Text style={styles.metaTxt}>{whenLabel}</Text>
        </View>

        {type === 'completed' && (
          <View style={[styles.bottomRow, { marginTop: 8 }]}>
            <RatingStars value={training.avaliacao ?? 0} />
            {durationTxt ? (
              <View style={styles.durationPill}>
                <Ionicons name="timer-outline" size={14} color={Colors.onSecondary} />
                <Text style={styles.durationTxt}>{durationTxt}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default memo(TrainingCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    padding: 14,
    flexDirection: 'row',
  },
  leftBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  title: { color: Colors.textPrimary, fontSize: 16, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, columnGap: 6 },
  metaTxt: { color: Colors.textSecondary, fontSize: 13, flexShrink: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10, flexWrap: 'wrap' },
  durationPill: {
    marginLeft: 'auto',
    backgroundColor: Colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  durationTxt: { color: Colors.onSecondary, fontWeight: '900', fontSize: 12 },
});
