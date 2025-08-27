// components/StatItem.js
import React, { memo, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';

const PressableScale = memo(function PressableScale({
  children, onPress, style, disabled, min = 0.98, max = 1.0, accessibilityLabel, hitSlop = { top: 8, bottom: 8, left: 8, right: 8 }
}) {
  const anim = useRef(new Animated.Value(1)).current;
  const reduce = useRef(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then(v => (reduce.current = !!v)); }, []);
  return (
    <Pressable
      onPress={async () => {
        if (disabled) return;
        const sr = await AccessibilityInfo.isScreenReaderEnabled?.();
        if (!sr) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => !reduce.current && Animated.timing(anim,{toValue:min,duration:90,useNativeDriver:true}).start()}
      onPressOut={() => !reduce.current && Animated.spring(anim,{toValue:max,useNativeDriver:true,friction:6,tension:140}).start()}
      style={style}
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitSlop}
      disabled={disabled}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>{children}</Animated.View>
    </Pressable>
  );
});

function StatItem({
  value = 0,
  label = '',
  icon = 'information-circle-outline',
  isUnread = false,
  style,
  onPress,
  color = Colors.primary,            // NOVO: personaliza a cor principal
  accent = Colors.secondary,         // NOVO: cor de acento (badge)
}) {
  const showBadge = isUnread && Number(value) > 0;
  const valStr = String(value);

  // pulse discreto no badge
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!showBadge) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 520, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [showBadge, pulse]);

  const Wrapper = onPress ? PressableScale : View;
  const accessibility = useMemo(
    () => `${label}: ${valStr}${showBadge ? ' não lidas' : ''}`,
    [label, valStr, showBadge]
  );

  return (
    <Wrapper onPress={onPress} style={[styles.card, style]} accessibilityLabel={accessibility}>
      <View style={[styles.iconWrap, { borderColor: withOpacity(color, 0.28), backgroundColor: withOpacity(color, 0.10) }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.value}>{valStr}</Text>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>

      {showBadge && (
        <Animated.View style={[styles.badge, { backgroundColor: accent, transform: [{ scale: pulse }] }]}>
          <Text style={styles.badgeText}>{valStr}</Text>
        </Animated.View>
      )}
    </Wrapper>
  );
}

export default memo(StatItem);

// utils simples
function withOpacity(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius?.medium ?? 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: Layout.spacing?.medium ?? 12,
    paddingHorizontal: Layout.spacing?.medium ?? 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, borderWidth: 1,
  },
  texts: { alignItems: 'center' },
  value: {
    fontSize: Layout.fontSizes?.xlarge ?? 22,
    color: Colors.textPrimary,
    fontWeight: '900',
    lineHeight: (Layout.fontSizes?.xlarge ?? 22) + 4,
  },
  label: {
    marginTop: 2,
    fontSize: Layout.fontSizes?.small ?? 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 6, right: 6,
    minWidth: 22, height: 22, borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '900', includeFontPadding: false, textAlignVertical: 'center' },
});
