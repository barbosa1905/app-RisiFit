import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
  Modal,
  Animated,
  Easing,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import Colors from '../../constants/Colors';
import * as i18n from '../../i18n';

const STORAGE_KEY = 'risifit:user_settings';
const LANG_KEY = 'risifit:lang';

export default function SettingsUser() {
  const navigation = useNavigation();
  const user = auth.currentUser;

  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [units, setUnits] = useState('metric');   // 'metric' | 'imperial'
  const [theme, setTheme] = useState('system');   // 'system' | 'light' | 'dark'
  const [language, setLanguage] = useState(i18n.getLocale?.() || 'pt-PT');

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // guarda os valores inicializados para detetar alterações
  const initialJSON = useRef('');
  const currentJSON = useMemo(
    () => JSON.stringify({ notifications, reminders, units, theme, language }),
    [notifications, reminders, units, theme, language]
  );
  const isDirty = initialJSON.current && initialJSON.current !== currentJSON;

  // Animação do modal
  const fade = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.9)).current;

  const playSuccessAnim = useCallback(() => {
    setShowSuccess(true);
    fade.setValue(0); pop.setValue(0.9);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 7 }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
          setShowSuccess(false);
        });
      }, 1050);
    });
  }, [fade, pop]);

  // Carregar definições
  const load = useCallback(async () => {
    try {
      const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const local = JSON.parse(localRaw);
        if (typeof local.notifications === 'boolean') setNotifications(local.notifications);
        if (typeof local.reminders === 'boolean') setReminders(local.reminders);
        if (local.units) setUnits(local.units);
        if (local.theme) setTheme(local.theme);
        if (local.language) setLanguage(local.language);
      } else {
        const lang = await AsyncStorage.getItem(LANG_KEY);
        if (lang) setLanguage(lang);
      }

      if (user?.uid) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const pref = snap.data()?.preferences || {};
          if (typeof pref.notifications === 'boolean') setNotifications(pref.notifications);
          if (typeof pref.reminders === 'boolean') setReminders(pref.reminders);
          if (pref.units) setUnits(pref.units);
          if (pref.theme) setTheme(pref.theme);
          if (pref.language) setLanguage(pref.language);
        }
      }
    } catch (e) {
      console.warn('Falha ao carregar definições', e);
    } finally {
      // fixar baseline depois de um ciclo p/ garantir state final
      setTimeout(() => { initialJSON.current = JSON.stringify({
        notifications, reminders, units, theme, language,
      }); }, 50);
    }
  }, [user?.uid, notifications, reminders, units, theme, language]);

  useEffect(() => { load(); }, [load]);

  // Guardar
  const save = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // idioma imediato
      if (typeof i18n.setLocale === 'function') i18n.setLocale(language);
      await AsyncStorage.setItem(LANG_KEY, language);

      const payload = { notifications, reminders, units, theme, language };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (user?.uid) {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const data = { preferences: payload };
        if (snap.exists()) await updateDoc(ref, data); else await setDoc(ref, data, { merge: true });
      }

      initialJSON.current = JSON.stringify(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playSuccessAnim();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const Pill = ({ label, icon, active, onPress, compact }) => (
    <TouchableOpacity onPress={onPress} style={[
      styles.pill,
      active && styles.pillActive,
      compact && { paddingVertical: 10, paddingHorizontal: 12 }
    ]}>
      {icon}
      <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      {/* Header */}
      <View style={styles.headerWrap}>
        <LinearGradient
          colors={[Colors.primary, '#21313C']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerRowTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Text style={styles.brandRisi}>RISI</Text>
            <Text style={styles.brandFit}>FIT</Text>
          </View>
          <View style={styles.circleBtn} />
        </View>
        <View style={styles.headerBottom}>
          <View style={styles.badgePreview}>
            <View style={styles.badgeItem}>
              <Ionicons name="notifications-outline" size={16} color="#fff" />
              <Text style={styles.badgeText}>{notifications ? 'Notificações ON' : 'Notificações OFF'}</Text>
            </View>
            <View style={styles.badgeItem}>
              <MaterialCommunityIcons name="ruler" size={16} color="#fff" />
              <Text style={styles.badgeText}>{units === 'metric' ? 'Métrico (kg/km)' : 'Imperial (lb/mi)'}</Text>
            </View>
            <View style={styles.badgeItem}>
              <Ionicons name="globe-outline" size={16} color="#fff" />
              <Text style={styles.badgeText}>{language === 'en' ? 'English' : 'Português'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Cartão de Toggles */}
        <Card title="Notificações & Lembretes" subtitle="Controla alertas e lembretes da app.">
          <RowSwitch
            icon={<Ionicons name="notifications-outline" size={20} color={Colors.primary} />}
            label="Notificações"
            value={notifications}
            onValueChange={setNotifications}
          />
          <Divider />
          <RowSwitch
            icon={<Ionicons name="alarm-outline" size={20} color={Colors.primary} />}
            label="Lembretes de treino"
            value={reminders}
            onValueChange={setReminders}
          />
        </Card>

        {/* Unidades */}
        <Card title="Unidades" subtitle="Escolhe como preferes ver peso e distância.">
          <View style={styles.pillRow}>
            <Pill
              label="Métrico (kg/km)"
              active={units === 'metric'}
              onPress={() => setUnits('metric')}
              icon={<MaterialCommunityIcons name="weight-kilogram" size={18} color={units === 'metric' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
            />
            <Pill
              label="Imperial (lb/mi)"
              active={units === 'imperial'}
              onPress={() => setUnits('imperial')}
              icon={<MaterialCommunityIcons name="weight-pound" size={18} color={units === 'imperial' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
            />
          </View>
        </Card>

        {/* Tema */}
        <Card title="Tema" subtitle="Adapta o visual ao teu gosto.">
          <View style={styles.pillRow}>
            <Pill
              label="Sistema"
              active={theme === 'system'}
              onPress={() => setTheme('system')}
              icon={<Ionicons name="phone-portrait-outline" size={18} color={theme === 'system' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
              compact
            />
            <Pill
              label="Claro"
              active={theme === 'light'}
              onPress={() => setTheme('light')}
              icon={<Ionicons name="sunny-outline" size={18} color={theme === 'light' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
              compact
            />
            <Pill
              label="Escuro"
              active={theme === 'dark'}
              onPress={() => setTheme('dark')}
              icon={<Ionicons name="moon-outline" size={18} color={theme === 'dark' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
              compact
            />
          </View>
        </Card>

        {/* Idioma */}
        <Card title="Idioma" subtitle="Muda rapidamente entre Português e Inglês.">
          <View style={styles.pillRow}>
            <Pill
              label="Português (PT)"
              active={language === 'pt-PT'}
              onPress={() => setLanguage('pt-PT')}
              icon={<Ionicons name="flag-outline" size={18} color={language === 'pt-PT' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
            />
            <Pill
              label="English"
              active={language === 'en'}
              onPress={() => setLanguage('en')}
              icon={<Ionicons name="flag-outline" size={18} color={language === 'en' ? Colors.onSecondary : Colors.textSecondary} style={{ marginRight: 8 }} />}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Save bar fixa */}
      <View style={[styles.saveBar, { opacity: isDirty ? 1 : 0.75 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.saveHintTitle}>{isDirty ? 'Alterações por guardar' : 'Definições atualizadas'}</Text>
          <Text style={styles.saveHint}>{isDirty ? 'Toca em Guardar para aplicar' : 'Tudo sincronizado'}</Text>
        </View>
        <TouchableOpacity
          disabled={!isDirty || loading}
          onPress={save}
          style={[styles.saveBtn, (!isDirty || loading) && { opacity: 0.6 }]}
        >
          <LinearGradient
            colors={[Colors.secondary, '#F5C84D']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="checkmark" size={18} color={Colors.onSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.saveBtnText}>{loading ? 'A guardar…' : 'Guardar'}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de sucesso */}
      <Modal visible={showSuccess} transparent animationType="none" onRequestClose={() => setShowSuccess(false)}>
        <Animated.View style={[styles.successBackdrop, { opacity: fade }]}>
          <Animated.View style={[styles.successCard, { transform: [{ scale: pop }] }]}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={22} color={Colors.onSecondary} />
            </View>
            <Text style={styles.successTitle}>Sucesso</Text>
            <Text style={styles.successMsg}>Definições guardadas.</Text>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Sub-componentes ---------- */

function Card({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  );
}

function RowSwitch({ icon, label, value, onValueChange }) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.lightGray, true: Colors.secondary }}
        thumbColor={value ? Colors.onPrimary : '#fff'}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  headerWrap: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
    elevation: 6,
  },
  headerRowTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  circleBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandRisi: { color: '#fff', fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  brandFit: { color: Colors.secondary, fontWeight: '800', fontSize: 18, letterSpacing: 1 },
  headerBottom: { marginTop: 14 },
  badgePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  badgeText: { color: '#fff', marginLeft: 6, fontSize: 12, fontWeight: '600' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: { marginLeft: 10, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: 8 },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    borderWidth: 1, borderColor: Colors.divider,
  },
  pillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  pillText: { color: Colors.textPrimary, fontWeight: '700' },
  pillTextActive: { color: Colors.onSecondary },

  /* Save bar */
  saveBar: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.divider,
    flexDirection: 'row', alignItems: 'center',
    elevation: 6,
  },
  saveHintTitle: { color: Colors.textPrimary, fontWeight: '800', fontSize: 13 },
  saveHint: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 12, overflow: 'hidden',
  },
  saveBtnText: { color: Colors.onSecondary, fontWeight: '800' },

  /* Success modal */
  successBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  successCard: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.divider,
  },
  successIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  successMsg: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
});
