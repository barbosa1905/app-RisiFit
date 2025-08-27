// components/RisiFitBackground.js
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated, Easing, AccessibilityInfo, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Paletas (ajusta para a tua marca)
const PALETTES = {
  brand: {
    dark: ['#0F1A21', '#0B141A'],
    light: ['#EAF0F6', '#E5EDF4'],
    accentPrimary: '#FFB800',
    accentSoft: 'rgba(255,184,0,0.28)',
  },
  ocean: {
    dark: ['#0B1720', '#081018'],
    light: ['#E6F2FF', '#EDF6FF'],
    accentPrimary: '#38BDF8',
    accentSoft: 'rgba(56,189,248,0.25)',
  },
  sunset: {
    dark: ['#141018', '#1A1420'],
    light: ['#FFF1EB', '#FDE6E5'],
    accentPrimary: '#FF7A59',
    accentSoft: 'rgba(255,122,89,0.25)',
  },
};

export default function RisiFitBackground({
  variant = 'auroraPro',        // 'auroraPro' | 'mesh' | 'gradient'
  palette = 'brand',            // 'brand' | 'ocean' | 'sunset'
  intensity = 1,
  animated = true,
  children,
  style,
}) {
  const scheme = useColorScheme?.() || 'dark';
  const colors = PALETTES[palette] || PALETTES.brand;
  const baseColors = scheme === 'dark' ? colors.dark : colors.light;
  const accent = colors.accentPrimary;
  const accentSoft = colors.accentSoft;

  // Animações
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;
  const bandA = useRef(new Animated.Value(0)).current;
  const bandB = useRef(new Animated.Value(0)).current;
  const reduce = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(v => (reduce.current = !!v));
  }, []);

  useEffect(() => {
    if (!animated || reduce.current) return;
    const loop = (val, d1, d2) =>
      Animated.loop(Animated.sequence([
        Animated.timing(val, { toValue: 1, duration: d1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(val, { toValue: 0, duration: d2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    const l1 = loop(blobA, 5200, 4800);
    const l2 = loop(blobB, 4300, 5200);
    const l3 = loop(bandA, 7000, 6500);
    const l4 = loop(bandB, 8200, 7600);
    l1.start(); l2.start(); l3.start(); l4.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); l4.stop(); };
  }, [animated, blobA, blobB, bandA, bandB]);

  // Layers ----------
  const Base = (
    <LinearGradient colors={baseColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
  );

  const Mesh = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            left: -60, top: -36,
            backgroundColor: scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.04)',
            transform: [
              { translateX: blobA.interpolate({ inputRange: [0, 1], outputRange: [-10, 16] }) },
              { translateY: blobA.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] }) },
              { scale: 1.04 },
            ],
            opacity: 0.9 * intensity,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            right: -68, bottom: -42,
            backgroundColor: accentSoft,
            transform: [
              { translateX: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
              { translateY: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            ],
            opacity: 0.9 * intensity,
          },
        ]}
      />
      <View pointerEvents="none" style={[styles.glowSmall, { right: 40, top: 60, backgroundColor: 'rgba(255,255,255,0.06)', opacity: 0.6 * intensity }]} />
    </>
  );

  const Aurora = variant === 'auroraPro' && (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.band,
          {
            top: '58%',
            transform: [{ rotate: '-8deg' }, { translateX: bandA.interpolate({ inputRange: [0, 1], outputRange: [-12, 16] }) }],
            opacity: 0.85 * intensity,
          },
        ]}
      >
        <LinearGradient colors={['transparent', accent, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.band,
          {
            top: '72%',
            transform: [{ rotate: '-4deg' }, { translateX: bandB.interpolate({ inputRange: [0, 1], outputRange: [16, -16] }) }],
            opacity: 0.55 * intensity,
          },
        ]}
      >
        <LinearGradient colors={['transparent', accentSoft, 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </>
  );

  const Vignette = (
    <LinearGradient
      pointerEvents="none"
      colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0.00)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)']}
      locations={[0, 0.28, 0.66, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );

  const layers = (<>{Base}{variant !== 'gradient' && Mesh}{Aurora}{Vignette}</>);

  // 👉 Modo 1: OVERLAY GLOBAL (sem children) — ocupa o ecrã TODO e não empurra nada
  if (!children) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
        {layers}
      </View>
    );
  }

  // 👉 Modo 2: WRAPPER POR ECRÃ (com children)
  return (
    <View style={[styles.wrapper, style]} pointerEvents="box-none">
      {layers}
      {children}
    </View>
  );
}

export function ScreenBackground(props) {
  return <RisiFitBackground {...props} />;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, position: 'relative' },
  glow: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 240,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } }, android: { elevation: 0 } }),
  },
  glowSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 120 },
  band: { position: 'absolute', height: 140, width: '170%', left: '-35%' },
});
