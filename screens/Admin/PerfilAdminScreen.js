// screens/Admin/PerfilAdminScreen.js
// (mantém TODAS as funcionalidades; apenas retoques visuais/UX)
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, ScrollView, SafeAreaView,
  RefreshControl, Linking, Platform, Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

import { db, auth } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

const AVATAR = 112;
const copyToClipboard = async (text) => {
  try {
    const mod = await import('@react-native-clipboard/clipboard');
    const Clipboard = mod?.default || mod;
    Clipboard?.setString?.(String(text || ''));
    Alert.alert('Copiado', 'Texto copiado para o clipboard.');
  } catch {}
};
const openURLSafe = async (url) => {
  try { (await Linking.canOpenURL(url)) && (await Linking.openURL(url)); } catch {}
};

const Row = React.memo(function Row({ icon, label, value, onPress, onLongPress }) {
  return (
    <Pressable
      android_ripple={{ color: `${Colors.secondary}12` }}
      style={styles.row}
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

  const onRefresh = useCallback(async () => { setRefreshing(true); try { await load(); } finally { setRefreshing(false); } }, [load]);

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
        text: 'Sair', style: 'destructive', onPress: async () => {
          try {
            await signOut(auth);
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
          } catch { Alert.alert('Erro', 'Não foi possível terminar a sessão.'); }
        },
      },
    ]);
  }, [navigation]);

  const goEditarPassword = useCallback(() => navigation.navigate('EditarPerfilAdmin'), [navigation]);
  const goEditarDados = useCallback(() => navigation.navigate('EditarDadosPessoais', { adminData: admin }), [navigation, admin]);
  const goCadastroCliente = useCallback(() => navigation.navigate('CadastroCliente', { adminId: uid }), [navigation, uid]);
  const goCriarAvaliacao = useCallback(() => navigation.navigate('CriarAvaliacao', { adminId: uid }), [navigation, uid]);
  const goQuestionarios = useCallback(() => navigation.navigate('ListarQuestionarios'), [navigation]);

  const openTel = useCallback(() => { if (phone) openURLSafe(`tel:${phone}`); }, [phone]);
  const openMail = useCallback(() => { if (email) openURLSafe(`mailto:${email}`); }, [email]);
  const openMaps = useCallback(() => {
    if (!morada) return;
    const q = encodeURIComponent(morada);
    const url = Platform.select({ ios: `http://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}` });
    if (url) openURLSafe(url);
  }, [morada]);

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
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{firstLetter}</Text></View>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.role}>Personal Trainer</Text>
        </View>

        {/* Dados pessoais */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados Pessoais</Text>

          <Row icon="person-outline" label="Nome completo" value={name} onPress={goEditarDados} onLongPress={() => copyToClipboard(name)} />
          <Row icon="mail-outline" label="Email" value={email} onPress={openMail} onLongPress={() => copyToClipboard(email)} />
          <Row icon="call-outline" label="Telefone" value={phone} onPress={openTel} onLongPress={() => copyToClipboard(phone)} />
          <Row icon="location-outline" label="Morada" value={morada} onPress={morada ? openMaps : undefined} onLongPress={() => copyToClipboard(morada)} />
          <Row icon="calendar-outline" label="Data de nascimento" value={birth} onLongPress={() => copyToClipboard(birth)} />
          <Row icon="id-card-outline" label="ID da conta" value={uid} onLongPress={() => copyToClipboard(uid)} />

          <TouchableOpacity style={styles.fullBtn} onPress={goEditarPassword} activeOpacity={0.85}>
            <Ionicons name="key-outline" size={20} color={Colors.onPrimary} />
            <Text style={styles.fullBtnText}>Alterar palavra-passe</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.fullBtn, styles.secondaryBtn]} onPress={goEditarDados} activeOpacity={0.85}>
            <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
            <Text style={[styles.fullBtnText, { color: Colors.primary }]}>Editar dados pessoais</Text>
          </TouchableOpacity>
        </View>

        {/* Ações rápidas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ações Rápidas</Text>

          <TouchableOpacity style={styles.actionItem} onPress={goCadastroCliente} activeOpacity={0.85}>
            <Ionicons name="person-add-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Cadastrar novo cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={goCriarAvaliacao} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Criar nova avaliação</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={goQuestionarios} activeOpacity={0.85}>
            <Ionicons name="list-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Gerir questionários</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.fullBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.fullBtnText}>Terminar sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' }, // <- transparente para ver o fundo pro

  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 28 },

  header: { alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.accent || Colors.onPrimary,
  },
  avatarText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 44 },
  name: { marginTop: 12, fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  role: {
    marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999,
    alignSelf: 'center', backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    color: Colors.textSecondary, fontWeight: '700',
  },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  rowValue: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },

  fullBtn: {
    marginTop: 12, height: 48, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  fullBtnText: { color: Colors.onPrimary, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.primary },

  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.divider },
  actionText: { marginLeft: 10, color: Colors.textPrimary, fontWeight: '700' },

  loadingText: { marginTop: 10, color: Colors.textSecondary },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: 12 },

  primaryBtn: {
    marginTop: 12, height: 46, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryBtnText: { color: Colors.onPrimary, fontWeight: '800' },

  logoutBtn: { backgroundColor: '#E53935', borderWidth: 1, borderColor: '#C62828' },
});
