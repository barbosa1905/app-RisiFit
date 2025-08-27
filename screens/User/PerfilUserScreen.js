// screens/User/PerfilUserScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');
const AVATAR = 110;

/** Navegação robusta: tenta no navigator atual; se não existir a rota, sobe 3 níveis */
function navigateSmart(navigation, name, params) {
  let cursor = navigation;
  for (let i = 0; i < 4 && cursor; i += 1) {
    const state = cursor.getState?.();
    const names = state?.routeNames ?? [];
    if (Array.isArray(names) && names.includes(name)) {
      cursor.navigate(name, params);
      return true;
    }
    cursor = cursor.getParent?.();
  }
  try {
    navigation.navigate(name, params);
    return true;
  } catch {
    // nada
  }
  Alert.alert('Navegação', `Não foi possível abrir "${name}".`);
  return false;
}

export default function PerfilUserScreen() {
  const navigation = useNavigation();

  // Auth & dados
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stats simples
  const [stats, setStats] = useState({ completed: 0, totalMinutes: 0, streak: 0 });

  // Tabs
  const [tab, setTab] = useState('overview'); // 'overview' | 'account' | 'goals'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u || null));
    return unsub;
  }, []);

  const fetchUser = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const ref = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setStats({
          completed: Number(data?.stats?.completed || 0),
          totalMinutes: Number(data?.stats?.totalMinutes || 0),
          streak: Number(data?.stats?.streak || 0),
        });
      } else {
        Alert.alert('Aviso', 'Não encontrámos o teu perfil.');
      }
    } catch (e) {
      console.error('Erro a carregar perfil:', e);
      Alert.alert('Erro', 'Não foi possível carregar os teus dados.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useFocusEffect(useCallback(() => { fetchUser(); }, [fetchUser]));

  const displayName = userData?.nome || userData?.name || 'Utilizador';
  const initial = useMemo(
    () => (displayName ? displayName.trim().charAt(0).toUpperCase() : 'U'),
    [displayName]
  );

  const handleLogout = () => {
    Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível terminar a sessão.');
          }
        },
      },
    ]);
  };

  // Atalhos — SEMPRE via navigateSmart
  const goEditarPerfil  = () => navigateSmart(navigation, 'EditarDadosPessoais');
  const goMudarPassword = () => navigateSmart(navigation, 'ChangePasswordScreen');
  const goQuestionarios = () => navigateSmart(navigation, 'ListarQuestionariosUser'); // <- nome do App.js
  const goHistorico     = () => navigateSmart(navigation, 'Historico');
  const goTreinos       = () => navigateSmart(navigation, 'TreinosScreen');
  const goChat          = () => navigateSmart(navigation, 'CreateChatUser'); // <- ecrã de Chat
  const goSettings      = () => navigateSmart(navigation, 'SettingsUser');
  const goMetas         = () => navigateSmart(navigation, 'MetasUserScreen');       // <- ecrã de Metas

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.centerText}>A preparar o teu painel…</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.center}>
        <Text style={[styles.centerText, { color: Colors.danger }]}>
          Não foi possível carregar o perfil.
        </Text>
        <TouchableOpacity onPress={fetchUser} style={styles.retryBtn}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const goals = userData?.goals || {};

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* -------- BARRA SUPERIOR -------- */}
      <View style={styles.topBarWrap}>
        <LinearGradient
          colors={[Colors.primary, '#22313B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topBarRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.onPrimary} />
          </TouchableOpacity>

          <View style={styles.brandCenter} pointerEvents="none">
            <Text style={styles.brandRisi}>RISI</Text>
            <Text style={styles.brandFit}> FIT</Text>
          </View>

          <View style={styles.rightIcons}>
            <TouchableOpacity onPress={goChat} style={styles.iconBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.onPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goSettings} style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* -------- CONTEÚDO -------- */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        style={{ backgroundColor: Colors.background }}
      >
        {/* Espaço extra entre a barra e a saudação */}
        <View style={{ height: 12 }} />

        {/* Saudação + Avatar */}
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.tagline}>Foco. Consistência. Resultados.</Text>
          </View>

          <View style={styles.avatarRing}>
            {userData?.avatar ? (
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.initialAvatar}>
                <Text style={styles.initialText}>{initial}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="checkmark-circle" label="Concluídos" value={String(stats.completed)} color="#34C759" />
          <StatCard icon="time-outline" label="Tempo" value={formatMinutes(stats.totalMinutes)} color="#5AC8FA" />
          <StatCard icon="flame-outline" label="Streak" value={`${stats.streak}d`} color="#FF3B30" />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TabButton label="Visão Geral" active={tab === 'overview'} onPress={() => setTab('overview')} />
          <TabButton label="Conta" active={tab === 'account'} onPress={() => setTab('account')} />
          <TabButton label="Metas" active={tab === 'goals'} onPress={() => setTab('goals')} />
        </View>

        {/* Conteúdo das tabs */}
        {tab === 'overview' && (
          <>
            <Text style={styles.sectionTitle}>Ações rápidas</Text>
            <View style={styles.grid}>
              <Tile icon="person-circle-outline" text="Editar perfil" onPress={goEditarPerfil} />
              <Tile icon="key-outline" text="Palavra-passe" onPress={goMudarPassword} />
              <Tile icon="clipboard-outline" text="Questionários" onPress={goQuestionarios} />
              <Tile icon="barbell-outline" text="Histórico" onPress={goHistorico} />
              <Tile icon="chatbubbles-outline" text="Chat Online" onPress={goChat} />
              <Tile icon="trophy-outline" text="Metas" onPress={goMetas} />
            </View>

            <LinearGradient colors={['#FFF3CC', '#FFFFFF']} style={styles.cta}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Próximo desafio à vista</Text>
                <Text style={styles.ctaSubtitle}>Vê os treinos planeados e mantém o ritmo.</Text>
              </View>
              <TouchableOpacity onPress={goTreinos} style={styles.ctaBtn}>
                <Text style={styles.ctaBtnText}>Abrir Treinos</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.onPrimary} />
              </TouchableOpacity>
            </LinearGradient>
          </>
        )}

        {tab === 'account' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dados de Conta</Text>
            <InfoRow icon="mail-outline" label="Email" value={currentUser?.email || '—'} />
            <InfoRow icon="call-outline" label="Telefone" value={userData?.telefoneCompleto || '—'} />
            <InfoRow icon="calendar-outline" label="Nascimento" value={userData?.dataNascimento || '—'} />
            <InfoRow icon="location-outline" label="Morada" value={userData?.endereco || userData?.morada || '—'} />

            <TouchableOpacity onPress={goEditarPerfil} style={styles.fullBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.fullBtnText}>Editar dados</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goMudarPassword} style={[styles.fullBtn, { marginTop: 10, backgroundColor: Colors.secondary }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.onSecondary} />
              <Text style={[styles.fullBtnText, { color: Colors.onSecondary }]}>Alterar palavra-passe</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'goals' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>As tuas metas</Text>
            <Text style={styles.cardHint}>Define e acompanha objetivos pessoais.</Text>
            <View style={styles.goalsRow}>
              <GoalChip icon="walk-outline" label="Passos/dia" value={goals.stepsPerDay ? `${goals.stepsPerDay}` : '—'} />
              <GoalChip icon="time-outline" label="Min/semana" value={goals.weeklyMinutes ? `${goals.weeklyMinutes}` : '—'} />
              <GoalChip icon="fitness-outline" label="Peso alvo" value={goals.weightTarget ? `${goals.weightTarget}kg` : '—'} />
            </View>
            <TouchableOpacity onPress={goMetas} style={styles.fullBtn}>
              <Ionicons name="create-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.fullBtnText}>Editar metas</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logout} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Auxiliares UI ---------- */
function formatMinutes(total) {
  const m = Math.max(0, Number(total) || 0);
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  return h ? `${h}h${mm}` : `${mm}min`;
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: '#F4F6F8' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Tile({ icon, text, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.tileText} numberOfLines={2}>{text}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={Colors.primary} style={{ marginRight: 10 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function GoalChip({ icon, label, value }) {
  return (
    <View style={styles.goalChip}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.goalChipText}>{label}</Text>
      <Text style={styles.goalChipValue}>{value}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  /* Barra superior */
  topBarWrap: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 6 : 10,
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  brandCenter: { flexDirection: 'row', alignItems: 'center' },
  brandRisi: { color: Colors.onPrimary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  brandFit: { color: Colors.secondary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  rightIcons: { flexDirection: 'row', gap: 8 },

  /* Hero */
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  greeting: { color: Colors.textSecondary, fontSize: 12 },
  name: { color: Colors.textPrimary, fontSize: 22, fontWeight: '900', marginTop: 2, maxWidth: width * 0.6 },
  tagline: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  avatarRing: {
    width: AVATAR + 10, height: AVATAR + 10, borderRadius: (AVATAR + 10) / 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF1CC',
    borderWidth: 2, borderColor: Colors.secondary,
  },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  initialAvatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  initialText: { color: Colors.onPrimary, fontSize: 54, fontWeight: '900' },
  onlineDot: {
    position: 'absolute', right: 8, bottom: 8,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#34C759', borderWidth: 2, borderColor: '#fff',
  },

  /* Stats */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1, borderColor: Colors.divider,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: { color: Colors.textSecondary, fontSize: 11 },
  statValue: { color: Colors.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 2 },

  /* Tabs */
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 14,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFF5D9' },
  tabText: { color: Colors.textSecondary, fontWeight: '700' },
  tabTextActive: { color: Colors.onSecondary },

  sectionTitle: { color: Colors.textPrimary, fontWeight: '900', marginBottom: 10, fontSize: 16 },

  /* Grid de ações */
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: (width - 16 * 2 - 12) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tileIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center',
  },
  tileText: { flex: 1, color: Colors.textPrimary, fontWeight: '800' },

  /* Cards / CTAs */
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  cardHint: { color: Colors.textSecondary, marginBottom: 10 },

  goalsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  goalChip: {
    flex: 1,
    backgroundColor: '#F6F8FB',
    borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: Colors.divider,
  },
  goalChipText: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  goalChipValue: { color: Colors.textPrimary, fontWeight: '800', marginTop: 4 },

  cta: {
    marginTop: 4,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE4A3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ctaTitle: { color: Colors.textPrimary, fontWeight: '900', fontSize: 16 },
  ctaSubtitle: { color: Colors.textSecondary, marginTop: 2 },
  ctaBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaBtnText: { color: Colors.onSecondary, fontWeight: '900', marginRight: 6 },

  /* Info rows */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: { color: Colors.textSecondary, width: 110 },
  infoValue: { color: Colors.textPrimary, fontWeight: '800', flex: 1, textAlign: 'right' },

  /* Botões principais */
  fullBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  fullBtnText: { color: Colors.onPrimary, fontWeight: '800' },

  /* Logout */
  logout: {
    marginTop: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: { color: Colors.onPrimary, fontWeight: '900', marginLeft: 8 },

  /* Loading / erro */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  centerText: { marginTop: 8, color: Colors.textSecondary },
  retryBtn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: Colors.onPrimary, fontWeight: '800' },
});
