// screens/Admin/PerfilAdminScreen.js
// Admin profile with modular sections and robust UX helpers
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, SafeAreaView,
  RefreshControl, Linking, Platform, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

import { db, auth } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import PressableScale from '../../components/PressableScale';

const AVATAR = 112;

/**
 * Copy arbitrary text to the system clipboard with graceful error handling.
 * @param {string} text
 */
const copyToClipboard = async (text) => {
  try {
    const mod = await import('@react-native-clipboard/clipboard');
    const Clipboard = mod?.default || mod;
    Clipboard?.setString?.(String(text || ''));
    Alert.alert('Copiado', 'Texto copiado para o clipboard.');
  } catch {
    Alert.alert('Erro', 'Não foi possível copiar o texto.');
  }
};

/**
 * Safely attempt to open a URL. Fails silently with an alert.
 * @param {string} url
 */
const openURLSafe = async (url) => {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  } catch {
    Alert.alert('Erro', 'Não foi possível abrir o link.');
  }
};

/**
 * Row component for displaying labelled information with optional interactions.
 */
const Row = React.memo(function Row({ icon, label, value, onPress, onLongPress, isLast }) {
  return (
    <Pressable
      android_ripple={{ color: `${Colors.secondary}12` }}
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
    >
      <Ionicons name={icon} size={22} color={Colors.textSecondary} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>{value || '—'}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} /> : null}
    </Pressable>
  );
});

/** Card-like section with optional title */
const Section = React.memo(function Section({ title, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
});

/**
 * Admin profile screen showing personal info and quick actions.
 */
export default function PerfilAdminScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser;
  const uid = user?.uid || null;

  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) { setAdmin(null); setLoading(false); return; }
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, 'users', uid));
      setAdmin(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const name = useMemo(() => admin?.name || admin?.nome || user?.displayName || 'Sem nome', [admin, user]);
  const firstLetter = (name || '').charAt(0).toUpperCase() || 'P';
  const email = user?.email || admin?.email || '';
  const phone = admin?.telefone || admin?.telefoneCompleto || '';
  const morada = admin?.morada || '';
  const birth = admin?.dataNascimento || '';

  const handleLogout = useCallback(() => {
    Alert.alert('Terminar sessão', 'Tem a certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
          } catch {
            Alert.alert('Erro', 'Não foi possível terminar a sessão.');
          }
        },
      },
    ]);
  }, [navigation]);

  const goEditarPassword = useCallback(() => navigation.navigate('EditarPerfilAdmin'), [navigation]);
  const goEditarDados = useCallback(
    () => navigation.navigate('EditarDadosPessoais', { adminData: admin }),
    [navigation, admin],
  );
  const goCadastroCliente = useCallback(
    () => navigation.navigate('CadastroCliente', { adminId: uid }),
    [navigation, uid],
  );
  const goCriarAvaliacao = useCallback(
    () => navigation.navigate('CriarAvaliacao', { adminId: uid }),
    [navigation, uid],
  );
  const goQuestionarios = useCallback(() => navigation.navigate('ListarQuestionarios'), [navigation]);

  const openTel = useCallback(() => {
    if (phone) openURLSafe(`tel:${phone}`);
  }, [phone]);
  const openMail = useCallback(() => {
    if (email) openURLSafe(`mailto:${email}`);
  }, [email]);
  const openMaps = useCallback(() => {
    if (!morada) return;
    const q = encodeURIComponent(morada);
    const url = Platform.select({ ios: `http://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}` });
    if (url) openURLSafe(url);
  }, [morada]);

  const personalRows = useMemo(
    () => [
      { icon: 'person-outline', label: 'Nome completo', value: name, onPress: goEditarDados, onLongPress: () => copyToClipboard(name) },
      { icon: 'mail-outline', label: 'Email', value: email, onPress: openMail, onLongPress: () => copyToClipboard(email) },
      { icon: 'call-outline', label: 'Telefone', value: phone, onPress: openTel, onLongPress: () => copyToClipboard(phone) },
      {
        icon: 'location-outline',
        label: 'Morada',
        value: morada,
        onPress: morada ? openMaps : undefined,
        onLongPress: () => copyToClipboard(morada),
      },
      { icon: 'calendar-outline', label: 'Data de nascimento', value: birth, onLongPress: () => copyToClipboard(birth) },
      { icon: 'id-card-outline', label: 'ID da conta', value: uid, onLongPress: () => copyToClipboard(uid) },
    ],
    [name, goEditarDados, email, openMail, phone, openTel, morada, openMaps, birth, uid],
  );

  const quickActions = useMemo(
    () => [
      { icon: 'person-add-outline', text: 'Cadastrar novo cliente', onPress: goCadastroCliente },
      { icon: 'create-outline', text: 'Criar nova avaliação', onPress: goCriarAvaliacao },
      { icon: 'list-outline', text: 'Gerir questionários', onPress: goQuestionarios },
    ],
    [goCadastroCliente, goCriarAvaliacao, goQuestionarios],
  );

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Meu Perfil" showBackButton />
        <View style={styles.centerBody}><Text style={styles.errorText}>Inicie sessão para ver o seu perfil.</Text></View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Meu Perfil" />
        <View style={styles.centerBody}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar dados…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!admin) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Meu Perfil" />
        <View style={styles.centerBody}>
          <Text style={styles.errorText}>Dados do Personal Trainer não encontrados.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={load} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
            <Text style={styles.primaryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Meu Perfil" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <LinearGradient colors={[Colors.primary, '#1f2a33']} style={StyleSheet.absoluteFill} />
          <View style={styles.headerInner}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{firstLetter}</Text></View>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.role}>Personal Trainer</Text>
          </View>
        </View>

        <Section title="Dados Pessoais">
          {personalRows.map((item, i) => (
            <Row key={item.label} {...item} isLast={i === personalRows.length - 1} />
          ))}

          <TouchableOpacity style={styles.fullBtn} onPress={goEditarPassword} activeOpacity={0.85}>
            <Ionicons name="key-outline" size={20} color={Colors.onPrimary} />
            <Text style={styles.fullBtnText}>Alterar palavra-passe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.fullBtn, styles.secondaryBtn]} onPress={goEditarDados} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
            <Text style={[styles.fullBtnText, { color: Colors.primary }]}>Editar dados pessoais</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Ações Rápidas">
          <View style={styles.actionGrid}>
            {quickActions.map((action) => (
              <PressableScale
                key={action.text}
                onPress={action.onPress}
                style={styles.actionTile}
                accessibilityLabel={action.text}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name={action.icon} size={24} color={Colors.onPrimary} />
                </View>
                <Text style={styles.actionText}>{action.text}</Text>
              </PressableScale>
            ))}
          </View>
        </Section>

        <TouchableOpacity style={[styles.fullBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.fullBtnText}>Terminar sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' }, // transparent to reveal app background

  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28 },

  headerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    ...Colors.cardElevation,
  },
  headerInner: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.onPrimary,
  },
  avatarText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 44 },
  name: { marginTop: 14, fontSize: 24, fontWeight: '800', color: Colors.onPrimary },
  role: {
    marginTop: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    backgroundColor: Colors.secondarySoft,
    color: Colors.secondary,
    fontWeight: '700',
  },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    ...Colors.cardElevation,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  rowLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  rowValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },

  fullBtn: {
    marginTop: 12, height: 48, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  fullBtnText: { color: Colors.onPrimary, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.primary },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionTile: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    ...Colors.cardElevation,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { textAlign: 'center', color: Colors.textPrimary, fontWeight: '700' },

  loadingText: { marginTop: 10, color: Colors.textSecondary },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: 12 },

  primaryBtn: {
    marginTop: 12, height: 46, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryBtnText: { color: Colors.onPrimary, fontWeight: '800' },

  logoutBtn: { backgroundColor: '#E53935', borderWidth: 1, borderColor: '#C62828' },
});
