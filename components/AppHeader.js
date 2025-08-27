// components/AppHeader.js — Aurora Glass Header (com PressableScale)
import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar, SafeAreaView, TextInput, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
let BlurView = ({ style, children }) => <View style={style}>{children}</View>;
try { BlurView = require('expo-blur').BlurView; } catch {}
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';
import PressableScale from './PressableScale';

export default function AppHeader({
  title = 'Painel',
  subtitle = '',
  backgroundColor,
  showBackButton = false,
  onBackPress = () => {},
  showMenu = false,
  onMenuPress = () => {},
  showBell = true,
  onBellPress = () => {},
  notificationCount = 0,
  rightContent = null,
  leftContent = null,
  statusBarStyle,
  onSearch,
  searchPlaceholder = 'Pesquisar…',
  defaultSearch = '',
}) {
  const blobA = useRef(new Animated.Value(0)).current;
  const blobB = useRef(new Animated.Value(0)).current;
  const underline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkLoop = (val, d1, d2) => Animated.loop(Animated.sequence([
      Animated.timing(val, { toValue: 1, duration: d1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(val, { toValue: 0, duration: d2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const l1 = mkLoop(blobA, 5200, 4800); const l2 = mkLoop(blobB, 4300, 5200);
    l1.start(); l2.start();
    Animated.loop(Animated.sequence([
      Animated.timing(underline, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(underline, { toValue: 0, duration: 1600, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ])).start();
    return () => { l1.stop(); l2.stop(); };
  }, [blobA, blobB, underline]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState(defaultSearch);
  const openAnim = useRef(new Animated.Value(0)).current;
  const toggleSearch = () => {
    const to = searchOpen ? 0 : 1;
    setSearchOpen(!searchOpen);
    Animated.timing(openAnim, { toValue: to, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const handleSubmit = () => onSearch?.(query);

  const GlassIconBtn = ({ icon, onPress, label, badge }) => (
    <PressableScale onPress={onPress} accessibilityLabel={label} onDark rounded={999} style={styles.iconBtnWrap}>
      <BlurView intensity={40} tint="dark" style={styles.iconBtnGlass}>
        <Ionicons name={icon} size={20} color={Colors.onSecondary} />
        {badge ? (
          <View style={styles.badge}><Text style={styles.badgeTxt}>{badge > 99 ? '99+' : badge}</Text></View>
        ) : null}
      </BlurView>
    </PressableScale>
  );

  return (
    <SafeAreaView style={{ backgroundColor: backgroundColor ?? Colors.primary }}>
      <StatusBar barStyle={statusBarStyle || 'light-content'} backgroundColor={backgroundColor ?? Colors.primary} />
      <View style={styles.container}>
        <LinearGradient colors={[Colors.primary, '#1E2F3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View pointerEvents="none" style={[styles.blob, {
          left: -40, top: -30, backgroundColor: '#FFFFFF22',
          transform: [
            { translateX: blobA.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
            { translateY: blobA.interpolate({ inputRange: [0, 1], outputRange: [-6, 10] }) },
            { scale: 1.05 },
          ],
        }]} />
        <Animated.View pointerEvents="none" style={[styles.blob, {
          right: -40, bottom: -30, backgroundColor: '#00000022',
          transform: [
            { translateX: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
            { translateY: blobB.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
          ],
        }]} />

        <View style={styles.topRow}>
          <View style={styles.left}>
            {showBackButton && <GlassIconBtn icon="arrow-back-outline" onPress={onBackPress} label="Voltar" />}
            {showMenu && !showBackButton && <GlassIconBtn icon="menu-outline" onPress={onMenuPress} label="Abrir menu" />}
            {leftContent}
          </View>

          <View style={styles.center} pointerEvents="none">
            {!!title && <Text numberOfLines={1} style={styles.title}>{title}</Text>}
            {!!subtitle && <Text numberOfLines={2} style={styles.subtitle}>{subtitle}</Text>}
            <Animated.View style={[styles.titleUnderline, {
              transform: [{ scaleX: underline.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.05] }) }],
            }]} />
          </View>

          <View style={styles.right}>
            {onSearch ? (
              <GlassIconBtn icon={searchOpen ? 'close' : 'search-outline'} onPress={toggleSearch} label={searchOpen ? 'Fechar pesquisa' : 'Pesquisar'} />
            ) : null}
            {showBell && <GlassIconBtn icon="notifications-outline" onPress={onBellPress} label="Notificações" badge={notificationCount > 0 ? notificationCount : undefined} />}
            {rightContent}
          </View>
        </View>

        {onSearch ? (
          <Animated.View
            style={[
              styles.searchWrap,
              {
                transform: [
                  { translateY: openAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
                  { scaleY: openAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
                opacity: openAnim,
              },
            ]}
            pointerEvents={searchOpen ? 'auto' : 'none'}
          >
            <BlurView intensity={50} tint="dark" style={styles.searchGlass}>
              <Ionicons name="search-outline" size={18} color={Colors.onSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSubmit}
                placeholder={searchPlaceholder}
                placeholderTextColor="rgba(255,255,255,0.8)"
                style={styles.searchInput}
                returnKeyType="search"
                accessibilityLabel="Pesquisar"
              />
              <PressableScale onPress={handleSubmit} onDark rounded={12} style={styles.searchBtn}>
                <Ionicons name="arrow-forward-circle" size={22} color={Colors.onSecondary} />
              </PressableScale>
            </BlurView>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Layout?.padding ?? 16, paddingTop: (Layout?.spacing?.small ?? 8), paddingBottom: (Layout?.spacing?.medium ?? 12), overflow: 'hidden' },
  blob: { position: 'absolute', width: 180, height: 180, borderRadius: 180 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', minWidth: 72, columnGap: 8 },
  center: { flex: 1, alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', minWidth: 72, justifyContent: 'flex-end', columnGap: 8 },
  title: { fontWeight: '900', fontSize: 20, color: Colors.onPrimary, letterSpacing: 0.2 },
  subtitle: { marginTop: 2, fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  titleUnderline: { marginTop: 6, width: 44, height: 3, borderRadius: 3, backgroundColor: Colors.secondary },
  iconBtnWrap: { borderRadius: 999, overflow: 'hidden' },
  iconBtnGlass: {
    width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.06)' : undefined,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error ?? '#EF5350', borderWidth: 1, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900', includeFontPadding: false },
  searchWrap: { marginTop: 10 },
  searchGlass: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 12,
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.08)' : undefined,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  searchInput: { flex: 1, color: Colors.onSecondary, paddingVertical: 0 },
  searchBtn: { overflow: 'hidden', borderRadius: 12 },
});
