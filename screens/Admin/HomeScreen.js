// screens/Admin/HomeScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useUser } from '../../contexts/UserContext';
import { db, auth } from '../../services/firebaseConfig';
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  doc,
  getDoc,
} from 'firebase/firestore';

import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import AppHeader from '../../components/AppHeader';
import TrainingCard from '../../components/TrainingCard';

const win = Dimensions.get('window');

// Fallbacks caso Layout não defina estes valores
const GUTTER = Layout?.spacing?.medium ?? 12;
const PADDING = Layout?.padding ?? 16;
const RADIUS = Layout?.borderRadius?.medium ?? 14;
const CARD_ELEV =
  Layout?.cardElevation ??
  (Platform.OS === 'android'
    ? { elevation: 3 }
    : { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } });

// Helpers
const pad2 = (n) => String(n).padStart(2, '0');
const formatarDuracao = (totalSegundos) => {
  if (typeof totalSegundos !== 'number' || isNaN(totalSegundos) || totalSegundos < 0) return 'N/A';
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (h === 0 && s > 0)) parts.push(`${pad2(m)}m`);
  if (s > 0 || (h === 0 && m === 0)) parts.push(`${pad2(s)}s`);
  return parts.join(' ');
};
const getGreeting = (d = new Date()) =>
  d.getHours() < 12 ? 'Bom dia' : d.getHours() < 19 ? 'Boa tarde' : 'Boa noite';

// Micro UI
const MetricCard = ({ icon, value, label, color = Colors.primary, onPress }) => (
  <Pressable onPress={onPress} android_ripple={{ color: `${color}22` }} style={[styles.metricCard, styles.cardElev]}>
    <View style={[styles.metricIconWrap, { backgroundColor: `${color}15`, borderColor: `${color}33` }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </Pressable>
);

const ActionTile = ({ icon, text, onPress }) => (
  <Pressable onPress={onPress} android_ripple={{ color: `${Colors.secondary}15` }} style={[styles.tile, styles.cardElev]}>
    <View style={styles.tileIconWrap}>
      <Ionicons name={icon} size={22} color={Colors.secondary} />
    </View>
    <Text style={styles.tileText} numberOfLines={2}>
      {text}
    </Text>
  </Pressable>
);

const TimelineItem = ({ hour, title, subtitle }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineHourWrap}>
      <Text style={styles.timelineHour}>{hour}</Text>
    </View>
    <View style={styles.timelineDot} />
    <View style={styles.timelineCard}>
      <Text style={styles.timelineTitle}>{title}</Text>
      {subtitle ? <Text style={styles.timelineSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const Skeleton = ({ height = 16, width = '100%', radius = 10, style }) => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: Colors.lightGray, opacity }, style]} />;
};

export default function HomeScreen() {
  const { user, userDetails, loadUserDetails } = useUser();
  const navigation = useNavigation();

  const [stats, setStats] = useState({ newClients: 0, trainingsToday: 0, unreadMessages: 0, pendingEvaluations: 0 });
  const [upcomingTrainings, setUpcomingTrainings] = useState([]);
  const [recentCompletedTrainings, setRecentCompletedTrainings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // >>> Corrigido: único estado de refresh <<<
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animações gerais do header/hero
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslate = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, -18], extrapolate: 'clamp' });
  const headerScale = scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0.96], extrapolate: 'clamp' });

  // >>> BLOBS do HERO (animação de fundo do card)
  const heroBlobA = useRef(new Animated.Value(0)).current;
  const heroBlobB = useRef(new Animated.Value(0)).current;

  // >>> FAIXAS AURORA (animação extra no fundo do HERO)
  const auroraA = useRef(new Animated.Value(0)).current;
  const auroraB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mkLoop = (val, d1, d2) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: d1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: d2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

    const l1 = mkLoop(heroBlobA, 5200, 4800);
    const l2 = mkLoop(heroBlobB, 4300, 5200);
    const l3 = mkLoop(auroraA, 7000, 6500);
    const l4 = mkLoop(auroraB, 8200, 7600);

    l1.start();
    l2.start();
    l3.start();
    l4.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
      l4.stop();
    };
  }, [heroBlobA, heroBlobB, auroraA, auroraB]);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      ])
    ).start();
  }, [pulse]);

  // Unsubs
  const chatMessageUnsubscribersRef = useRef({});
  const chatMainUnsubscriberRef = useRef(null);
  const otherFirestoreUnsubscribers = useRef([]);

  // Utilizador
  useEffect(() => {
    if (user && !userDetails) loadUserDetails(user.uid);
  }, [user, userDetails, loadUserDetails]);

  // Firestore
  const fetchStaticStats = useCallback(async () => {
    try {
      const evaluationsRef = collection(db, 'evaluations');
      const qPending = query(evaluationsRef, where('status', '==', 'pending'));
      const pendingSnap = await getDocs(qPending);

      const clientsRef = collection(db, 'users');
      const qClients = query(clientsRef, where('role', '==', 'user'));
      const clientsSnap = await getDocs(qClients);

      setStats((s) => ({ ...s, newClients: clientsSnap.size, pendingEvaluations: pendingSnap.size }));
    } catch (err) {
      if (__DEV__) console.error('Erro ao buscar estatísticas estáticas:', err);
    }
  }, []);

  const subscribeToTrainingsToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const treinosCG = collectionGroup(db, 'treinos');
    // FIX: 'const' em vez de 'the' e sem ']' perdido
    const qToday = query(treinosCG, where('data', '>=', today), where('data', '<', tomorrow));

    const unsubscribe = onSnapshot(
      qToday,
      (snapshot) => setStats((s) => ({ ...s, trainingsToday: snapshot.size })),
      (err) => {
        if (__DEV__) console.error('Erro treinos de hoje:', err);
        if (err.code === 'permission-denied') {
          setStats((s) => ({ ...s, trainingsToday: 0 }));
          return;
        }
        setError(`Não foi possível carregar treinos de hoje: ${err.message}`);
      }
    );
    return unsubscribe;
  }, []);

  const subscribeUpcomingTrainings = useCallback(() => {
    const treinosCG = collectionGroup(db, 'treinos');
    const qUp = query(treinosCG, where('data', '>=', new Date()), orderBy('data', 'asc'), limit(5));

    const unsubscribe = onSnapshot(
      qUp,
      async (snapshot) => {
        const arr = await Promise.all(
          snapshot.docs.map(async (treinoDoc) => {
            const data = treinoDoc.data();
            const userIdFromPath = treinoDoc.ref.parent.parent?.id;
            const currentUserId = data.userId || userIdFromPath;

            let clientName = 'Cliente Desconhecido';
            if (currentUserId && auth.currentUser) {
              try {
                const clientRef = doc(db, 'users', currentUserId);
                const clientSnap = await getDoc(clientRef);
                if (clientSnap.exists()) {
                  const c = clientSnap.data();
                  clientName = c.name || c.firstName || c.nome || 'Cliente sem nome';
                } else clientName = 'Cliente (Não encontrado)';
              } catch {
                clientName = 'Cliente (Erro)';
              }
            }

            return { id: treinoDoc.id, ...data, data: data.data ? data.data.toDate() : null, clientName };
          })
        );
        setUpcomingTrainings(arr);
      },
      (err) => {
        if (__DEV__) console.error('Erro próximos treinos:', err);
        if (err.code === 'permission-denied') {
          setUpcomingTrainings([]);
          return;
        }
        setError(`Não foi possível carregar próximos treinos: ${err.message}`);
      }
    );
    return unsubscribe;
  }, []);

  const subscribeRecentCompletedTrainings = useCallback(() => {
    const histRef = collection(db, 'historicoTreinos');
    const qComp = query(histRef, orderBy('dataConclusao', 'desc'), limit(6));

    const unsubscribe = onSnapshot(
      qComp,
      async (snapshot) => {
        const arr = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let clientName = 'Cliente Desconhecido';

            if (data.userId && auth.currentUser) {
              try {
                const cRef = doc(db, 'users', data.userId);
                const cSnap = await getDoc(cRef);
                if (cSnap.exists()) {
                  const c = cSnap.data();
                  clientName = c.name || c.firstName || c.nome || 'Cliente sem nome';
                }
              } catch {
                clientName = 'Cliente (Erro)';
              }
            }
            return {
              id: docSnap.id,
              ...data,
              raw: data,
              dataConclusao: data.dataConclusao ? data.dataConclusao.toDate() : null,
              clientName,
              avaliacao: data.avaliacao || 0,
              observacoesUser: data.observacoesUser || '',
            };
          })
        );
        setRecentCompletedTrainings(arr);
      },
      (err) => {
        if (__DEV__) console.error('Erro treinos concluídos:', err);
        if (err.code === 'permission-denied') {
          setRecentCompletedTrainings([]);
          return;
        }
        setError(`Não foi possível carregar treinos concluídos: ${err.message}`);
      }
    );
    return unsubscribe;
  }, []);

  const subscribeToUnreadMessages = useCallback(() => {
    Object.values(chatMessageUnsubscribersRef.current).forEach((unsub) => unsub?.());
    chatMessageUnsubscribersRef.current = {};
    chatMainUnsubscriberRef.current?.();
    chatMainUnsubscriberRef.current = null;

    if (!auth.currentUser) {
      setStats((s) => ({ ...s, unreadMessages: 0 }));
      setLoading(false);
      return undefined;
    }

    const adminId = auth.currentUser.uid;
    let totalUnread = 0;
    const currentUnreadCounts = {};

    const chatsRef = collection(db, 'chats');
    const qChats = query(chatsRef, where('isGroup', '==', false), where('participants', 'array-contains', adminId));

    const unsubscribeChats = onSnapshot(
      qChats,
      (chatsSnapshot) => {
        chatsSnapshot.docChanges().forEach((change) => {
          const chatId = change.doc.id;

          if (change.type === 'removed') {
            chatMessageUnsubscribersRef.current[chatId]?.();
            delete chatMessageUnsubscribersRef.current[chatId];
            if (currentUnreadCounts[chatId] !== undefined) {
              totalUnread -= currentUnreadCounts[chatId];
              delete currentUnreadCounts[chatId];
              setStats((s) => ({ ...s, unreadMessages: totalUnread }));
            }
            return;
          }

          chatMessageUnsubscribersRef.current[chatId]?.();
          const messagesRef = collection(db, 'chats', chatId, 'messages');
          const unsubMessages = onSnapshot(
            messagesRef,
            (messagesSnapshot) => {
              let unreadForThisChat = 0;
              messagesSnapshot.forEach((mDoc) => {
                const m = mDoc.data();
                if (m.senderId !== adminId && !m.lida) unreadForThisChat++;
              });
              if (currentUnreadCounts[chatId] !== unreadForThisChat) {
                totalUnread =
                  totalUnread - (currentUnreadCounts[chatId] || 0) + unreadForThisChat;
                currentUnreadCounts[chatId] = unreadForThisChat;
                setStats((s) => ({ ...s, unreadMessages: totalUnread }));
              }
            },
            (err) => {
              if (err.code === 'permission-denied') {
                if (currentUnreadCounts[chatId] !== undefined) {
                  totalUnread -= currentUnreadCounts[chatId];
                  delete currentUnreadCounts[chatId];
                  setStats((s) => ({ ...s, unreadMessages: totalUnread }));
                }
                chatMessageUnsubscribersRef.current[chatId]?.();
                delete chatMessageUnsubscribersRef.current[chatId];
                return;
              }
              setError(`Erro ao carregar mensagens não lidas: ${err.message}`);
            }
          );
          chatMessageUnsubscribersRef.current[chatId] = unsubMessages;
        });
        setLoading(false);
      },
      (err) => {
        if (err.code === 'permission-denied') {
          setStats((s) => ({ ...s, unreadMessages: 0 }));
          setLoading(false);
          return;
        }
        setError(`Erro ao carregar chats: ${err.message}`);
        setLoading(false);
      }
    );

    chatMainUnsubscriberRef.current = unsubscribeChats;
    return () => {
      chatMainUnsubscriberRef.current?.();
      chatMainUnsubscriberRef.current = null;
      Object.values(chatMessageUnsubscribersRef.current).forEach((unsub) => unsub?.());
      chatMessageUnsubscribersRef.current = {};
      setStats((s) => ({ ...s, unreadMessages: 0 }));
    };
  }, []);

  // Lifecycle no foco
  useFocusEffect(
    useCallback(() => {
      otherFirestoreUnsubscribers.current.forEach((unsub) => unsub?.());
      otherFirestoreUnsubscribers.current = [];

      if (!auth.currentUser) {
        setStats({ newClients: 0, trainingsToday: 0, unreadMessages: 0, pendingEvaluations: 0 });
        setUpcomingTrainings([]);
        setRecentCompletedTrainings([]);
        setLoading(false);
        setError(null);
        return () => {};
      }

      setLoading(true);
      setError(null);

      fetchStaticStats();
      const u1 = subscribeToTrainingsToday();
      const u2 = subscribeUpcomingTrainings();
      const u3 = subscribeRecentCompletedTrainings();
      const u4 = subscribeToUnreadMessages();

      otherFirestoreUnsubscribers.current.push(u1, u2, u3, u4);

      return () => {
        otherFirestoreUnsubscribers.current.forEach((unsub) => unsub?.());
        otherFirestoreUnsubscribers.current = [];
      };
    }, [
      fetchStaticStats,
      subscribeToTrainingsToday,
      subscribeUpcomingTrainings,
      subscribeRecentCompletedTrainings,
      subscribeToUnreadMessages,
    ])
  );

  // Dados UI
  const userDisplayName = useMemo(
    () => userDetails?.nome || userDetails?.firstName || userDetails?.name || 'Admin',
    [userDetails]
  );
  const firstName = useMemo(() => (userDisplayName || '').split(' ')[0], [userDisplayName]);
  const userInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const greeting = getGreeting();

  // Timeline: treinos de hoje
  const todaysTimeline = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const ofToday = upcomingTrainings
      .filter((t) => t?.data && t.data >= start && t.data <= end)
      .sort((a, b) => a.data - b.data)
      .map((t) => ({
        id: t.id,
        hour: `${pad2(t.data.getHours())}:${pad2(t.data.getMinutes())}`,
        title: t?.nome || t?.name || t?.nomeTreino || 'Treino agendado',
        subtitle: t.clientName || 'Cliente',
      }));
    return ofToday;
  }, [upcomingTrainings]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchStaticStats();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchStaticStats]);

  const goToCreateChat = useCallback(() => {
    navigation.navigate('CreateChat');
  }, [navigation]);

  // Loading / erro
  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>A preparar o teu painel...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <AppHeader
        title="Risi Fit"
        rightContent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            
            <TouchableOpacity onPress={() => navigation.navigate('Avaliacoes')} style={styles.headerIconBtn} accessibilityLabel="Avaliações">
              <Ionicons name="star-outline" size={22} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        }
      />

      <Animated.ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {/* HERO colapsável + animação de fundo */}
        <Animated.View style={[styles.heroWrapper, { transform: [{ translateY: headerTranslate }, { scale: headerScale }] }]}>
          <LinearGradient colors={[Colors.primary, '#23313B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, styles.cardElev]}>
            {/* BLOBS ANIMADOS */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroBlob,
                {
                  left: -40,
                  top: -30,
                  backgroundColor: '#FFFFFF22',
                  transform: [
                    { translateX: heroBlobA.interpolate({ inputRange: [0, 1], outputRange: [-10, 18] }) },
                    { translateY: heroBlobA.interpolate({ inputRange: [0, 1], outputRange: [-6, 10] }) },
                    { scale: 1.05 },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.heroBlob,
                {
                  right: -40,
                  bottom: -30,
                  backgroundColor: '#FFB80026',
                  transform: [
                    { translateX: heroBlobB.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                    { translateY: heroBlobB.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                  ],
                },
              ]}
            />

            {/* FAIXAS AURORA (duas camadas, com leve drift) */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.auroraBandWrap,
                {
                  top: '58%',
                  transform: [
                    { rotate: '-8deg' },
                    { translateX: auroraA.interpolate({ inputRange: [0, 1], outputRange: [-10, 12] }) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,184,0,0.55)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[
                styles.auroraBandWrap,
                {
                  top: '70%',
                  transform: [
                    { rotate: '-4deg' },
                    { translateX: auroraB.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }) },
                  ],
                  opacity: 0.8,
                },
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,184,0,0.28)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            {/* Conteúdo */}
            <View style={styles.heroLeft}>
              <Text style={styles.heroHello}>{greeting},</Text>
              <Text style={styles.heroName}>{firstName}</Text>

              <View style={styles.heroCtas}>
                <TouchableOpacity style={styles.ctaPrimary} onPress={() => navigation.navigate('CriarTreino')}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.onSecondary} />
                  <Text style={styles.ctaPrimaryText}>Criar Treino</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.ctaGhost} onPress={goToCreateChat}>
                  <Animated.View style={{ transform: [{ scale: stats.unreadMessages > 0 ? pulse : 1 }] }}>
                    <Ionicons name="chatbubbles-outline" size={18} color={Colors.secondary} />
                  </Animated.View>
                  <Text style={styles.ctaGhostText}>
                    Mensagens <Text style={{ fontWeight: '900' }}>{stats.unreadMessages}</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Pressable style={styles.avatarTap} onPress={() => navigation.getParent()?.navigate('PerfilAdmin')} android_ripple={{ color: `${Colors.onPrimary}10` }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* KPIs */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="people-outline" value={stats.newClients} label="Meus Clientes" color={Colors.info} onPress={() => navigation.navigate('Clientes')} />
          <MetricCard icon="barbell-outline" value={stats.trainingsToday} label="Treinos Hoje" color={Colors.secondary} onPress={() => navigation.navigate('Agenda')} />
          <MetricCard icon="chatbubbles-outline" value={stats.unreadMessages} label="Novas Mensagens" color={Colors.primary} onPress={goToCreateChat} />
          <MetricCard icon="document-text-outline" value={stats.pendingEvaluations} label="Aval. Pendentes" color={Colors.success} onPress={() => navigation.navigate('Avaliacoes')} />
        </View>

        {/* Linha do dia (Hoje) */}
        <View style={[styles.card, styles.cardElev]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Hoje</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Agenda')} style={styles.linkBtn}>
              <Text style={styles.linkBtnTxt}>Abrir Agenda</Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.info} />
            </TouchableOpacity>
          </View>

          {todaysTimeline.length > 0 ? (
            <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
              {todaysTimeline.map((t) => (
                <TimelineItem key={t.id} hour={t.hour} title={t.title} subtitle={t.subtitle} />
              ))}
            </View>
          ) : (
            <View style={{ padding: PADDING }}>
              <Skeleton height={16} width="35%" style={{ marginBottom: 10 }} />
              <Skeleton height={12} width="70%" style={{ marginBottom: 8 }} />
              <Skeleton height={12} width="55%" />
              <Text style={styles.noDataText}>Sem treinos hoje.</Text>
            </View>
          )}
        </View>

        {/* Secção com tabs: Próximos | Concluídos */}
        <View style={[styles.card, styles.cardElev]}>
          <View style={styles.tabsRow}>
            <TouchableOpacity onPress={() => setActiveTab('upcoming')} style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}>
              <Text style={[styles.tabTxt, activeTab === 'upcoming' && styles.tabTxtActive]}>Próximos treinos</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('completed')} style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}>
              <Text style={[styles.tabTxt, activeTab === 'completed' && styles.tabTxtActive]}>Últimos concluídos</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'upcoming' ? (
            upcomingTrainings.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PADDING / 2, paddingBottom: 6 }}>
                {upcomingTrainings.map((training) => (
                  <View key={training.id} style={styles.trainingSlide}>
                    <TrainingCard type="upcoming" training={training} formatarDuracao={formatarDuracao} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={{ padding: PADDING }}>
                <Skeleton height={18} style={{ width: '48%', marginBottom: 10 }} />
                <Skeleton height={120} radius={12} />
                <Text style={styles.noDataText}>Sem treinos agendados.</Text>
              </View>
            )
          ) : recentCompletedTrainings.length > 0 ? (
            <View style={{ paddingHorizontal: PADDING / 2, paddingBottom: 4 }}>
              {recentCompletedTrainings.map((training, index) => (
                <React.Fragment key={training.id}>
                  <Pressable
                    onPress={() => {
                      const go = navigation.getParent?.() || navigation;
                      const payloadTreino = {
                        id: training.id,
                        nomeTreino: training.nomeTreino || training.name || 'Treino',
                        dataConclusao: training.dataConclusao ? training.dataConclusao.toISOString() : null,
                        duracao: training.duracao ?? training.duration ?? null,
                        avaliacao: training.avaliacao ?? 0,
                        observacoesUser: training.observacoesUser ?? '',
                        clientName: training.clientName,
                        raw: training.raw || training,
                      };
                      go.navigate('DetalhesTreinoConcluidoScreen', { treino: payloadTreino });
                    }}
                    android_ripple={{ color: `${Colors.secondary}1A` }}
                  >
                    <TrainingCard type="completed" training={training} formatarDuracao={formatarDuracao} />
                  </Pressable>
                  {index < recentCompletedTrainings.length - 1 && <View style={styles.itemSeparator} />}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={{ padding: PADDING }}>
              <Skeleton height={18} style={{ width: '40%', marginBottom: 10 }} />
              <Skeleton height={70} radius={12} style={{ marginBottom: 8 }} />
              <Skeleton height={70} radius={12} />
              <Text style={styles.noDataText}>Nenhum concluído recentemente.</Text>
            </View>
          )}

          <View style={styles.tabsFooter}>
            {activeTab === 'upcoming' ? (
              <TouchableOpacity onPress={() => navigation.navigate('Agenda')} style={styles.linkBtn}>
                <Text style={styles.linkBtnTxt}>Abrir Agenda</Text>
                <Ionicons name="calendar-outline" size={16} color={Colors.info} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => navigation.navigate('CompletedTrainingsHistory')} style={styles.linkBtn}>
                <Text style={styles.linkBtnTxt}>Ver histórico completo</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.info} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Ações rápidas */}
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>
        <View style={styles.tilesGrid}>
          <ActionTile icon="add-circle-outline" text="Criar Treino" onPress={() => navigation.navigate('CriarTreino')} />
          <ActionTile icon="person-add-outline" text="Novo Cliente" onPress={() => navigation.navigate('CadastroCliente')} />
          <ActionTile icon="clipboard-outline" text="Criar Avaliação" onPress={() => navigation.navigate('CriarAvaliacao')} />
          <ActionTile icon="calendar-outline" text="Ver Agenda" onPress={() => navigation.navigate('Agenda')} />
          <ActionTile icon="people-outline" text="Gerir Clientes" onPress={() => navigation.navigate('Clientes')} />
          <ActionTile icon="library-outline" text="Modelos de Treino" onPress={() => navigation.navigate('WorkoutTemplates')} />
          <ActionTile icon="barbell-outline" text="Biblioteca de Exercícios" onPress={() => navigation.navigate('ExerciseLibrary')} />
          <ActionTile icon="checkmark-done-circle-outline" text="Histórico Treinos" onPress={() => navigation.navigate('CompletedTrainingsHistory')} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// Layout
const TILE_SIZE = (win.width - PADDING * 2 - GUTTER) / 2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, 
    backgroundColor: 'transperent' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.textSecondary },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 16 },
  errorText: { fontSize: 16, color: Colors.danger, textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  retryButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: 'bold' },

  scrollViewContent: { paddingHorizontal: PADDING, paddingBottom: PADDING * 1.5 },

  // Espaçamento extra entre header e hero:
  heroWrapper: { marginTop: 12 },

  hero: {
    borderRadius: RADIUS,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    // Recorta blobs/aurora dentro do cartão
    overflow: 'hidden',
  },

  // Blobs
  heroBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },

  // Aurora band (faixa larga, atravessa o card)
  auroraBandWrap: {
    position: 'absolute',
    height: 130,
    width: '160%',
    left: '-30%',
  },

  heroLeft: { flex: 1, paddingRight: 8 },
  heroHello: { color: Colors.onPrimary, opacity: 0.9, fontSize: 15 },
  heroName: { color: Colors.onPrimary, fontSize: 26, fontWeight: '800', marginTop: 2 },

  heroCtas: { flexDirection: 'row', marginTop: 12 },
  ctaPrimary: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  ctaPrimaryText: { color: Colors.onSecondary, fontWeight: '800', marginLeft: 8 },
  ctaGhost: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaGhostText: { color: Colors.textPrimary, fontWeight: '700', marginLeft: 8 },

  avatarTap: { paddingLeft: 8 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 4 },
    }),
  },
  avatarText: { color: Colors.onSecondary, fontSize: 20, fontWeight: '900' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  metricCard: {
    width: (win.width - PADDING * 2 - GUTTER) / 2,
    borderRadius: RADIUS,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: GUTTER,
    alignItems: 'flex-start',
  },
  metricIconWrap: { padding: 8, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  metricValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: RADIUS,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    marginBottom: 22,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary },

  // Timeline
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  timelineHourWrap: { width: 56, alignItems: 'flex-end', paddingRight: 10, paddingTop: 2 },
  timelineHour: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.secondary, marginTop: 4, marginRight: 10 },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
  },
  timelineTitle: { color: Colors.textPrimary, fontWeight: '800' },
  timelineSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },

  // Tabs treinos
  tabsRow: { flexDirection: 'row', backgroundColor: Colors.background, padding: 6, gap: 6 },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  tabBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  tabTxt: { color: Colors.textPrimary, fontWeight: '700' },
  tabTxtActive: { color: Colors.onSecondary, fontWeight: '900' },

  trainingSlide: { width: win.width * 0.8, paddingHorizontal: 6, paddingVertical: 10 },

  itemSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.lightGray, marginHorizontal: 12 },
  tabsFooter: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 4, alignItems: 'flex-end' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtnTxt: { color: Colors.info, fontWeight: '800' },

  noDataText: { fontSize: 14, color: Colors.textSecondary, paddingTop: 10, textAlign: 'center' },

  // Ações rápidas
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 10 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: {
    width: TILE_SIZE,
    backgroundColor: Colors.surface,
    borderRadius: RADIUS,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: GUTTER,
    minHeight: 92,
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
  },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.secondary}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileText: { color: Colors.textPrimary, fontWeight: '700' },

  // Reutilizável
  cardElev: { ...CARD_ELEV },

  headerIconBtn: { padding: 8, borderRadius: 16, marginLeft: 6 },
});
