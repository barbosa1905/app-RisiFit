// screens/User/UserHomeScreen.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';

import { useUser } from '../../contexts/UserContext';
import { db } from '../../services/firebaseConfig';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { buscarTodosTreinosDoUser } from '../../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isPast,
} from 'date-fns';
import { pt } from 'date-fns/locale';

import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

// i18n
import { t } from '../../i18n';

// --- Fallbacks/aliases para chaves que possam não existir no Colors ---
const C = {
  ...Colors,
  white: Colors.white || '#FFFFFF',
  neutralGray: Colors.neutralGray || Colors.textSecondary || '#6B7280',
  borderLight: Colors.borderLight || Colors.divider || '#E6E8EB',
  primaryLight: Colors.primaryLight || '#3A506B',
};

const STATUS_COLORS = {
  completed: Colors.success,
  missed: Colors.danger,
  todayPending: Colors.info,
  scheduledFuture: Colors.secondary,
  noTraining: Colors.lightGray,
  defaultBorder: Colors.lightGray,
  defaultText: C.neutralGray,
};

const daysOfWeekLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const MOTIVATIONAL_PHRASES = [
  t('home.motivation.1'),
  t('home.motivation.2'),
  t('home.motivation.3'),
  t('home.motivation.4'),
  t('home.motivation.5'),
  t('home.motivation.6'),
  t('home.motivation.7'),
  t('home.motivation.8'),
  t('home.motivation.9'),
  t('home.motivation.10'),
];

export default function UserHomeScreen() {
  const navigation = useNavigation();
  const { user, loading: userContextLoading, userDetails } = useUser();

  // Identidade do utilizador
  const [userName, setUserName] = useState('—');
  const [firstName, setFirstName] = useState('—');
  const [userInitial, setUserInitial] = useState('U');
  const [userPlan, setUserPlan] = useState('—');

  // Saudação + motivacional
  const [greeting, setGreeting] = useState('');
  const [currentMotivationalPhrase, setCurrentMotivationalPhrase] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Treinos & calendário
  const [allTreinos, setAllTreinos] = useState([]);
  const [treinosConcluidosStatus, setTreinosConcluidosStatus] = useState({});
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [markedDatesForCalendar, setMarkedDatesForCalendar] = useState({});

  // Loading geral
  const [loadingScreen, setLoadingScreen] = useState(true);

  const colorLegend = useMemo(
    () => [
      { color: STATUS_COLORS.completed, description: t('home.legend.completed') },
      { color: STATUS_COLORS.missed, description: t('home.legend.missed') },
      { color: STATUS_COLORS.todayPending, description: t('home.legend.todayPending') },
      { color: STATUS_COLORS.scheduledFuture, description: t('home.legend.future') },
      { color: STATUS_COLORS.defaultBorder, description: t('home.legend.noTraining') },
    ],
    []
  );

  // Saudação
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 12
        ? t('greeting.morning')
        : hour < 18
        ? t('greeting.afternoon')
        : t('greeting.evening')
    );
  }, []);

  // Frases motivacionais com fade
  useEffect(() => {
    let idx = 0;
    setCurrentMotivationalPhrase(MOTIVATIONAL_PHRASES[idx]);

    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        idx = (idx + 1) % MOTIVATIONAL_PHRASES.length;
        setCurrentMotivationalPhrase(MOTIVATIONAL_PHRASES[idx]);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 6500);

    return () => clearInterval(timer);
  }, [fadeAnim]);

  // Carrega localmente o mapa de dias concluídos
  const carregarTreinosConcluidos = useCallback(async (userId) => {
    try {
      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      setTreinosConcluidosStatus(dados ? JSON.parse(dados) : {});
    } catch (e) {
      console.error('Home (user): erro a ler concluídos AsyncStorage', e);
    }
  }, []);

  // Dados do user + treinos
  useEffect(() => {
    const loadAll = async () => {
      try {
        if (!userContextLoading && user?.uid) {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const d = snap.data() || {};
            const full = d.name || d.nome || t('common.user');
            setUserName(full);
            setFirstName(full.split(' ')[0]);
            setUserInitial((full[0] || 'U').toUpperCase());
            setUserPlan(d.plan || d.plano || t('home.plan.undefined'));
          } else {
            setUserName(t('common.user'));
            setFirstName(t('common.hello'));
            setUserInitial('U');
            setUserPlan('—');
          }

          const treinos = await buscarTodosTreinosDoUser(user.uid);
          setAllTreinos(treinos);
          await carregarTreinosConcluidos(user.uid);
        }
      } catch (e) {
        console.error('Home (user): erro a carregar dados', e);
      } finally {
        setLoadingScreen(false);
      }
    };
    loadAll();
  }, [user, userContextLoading, carregarTreinosConcluidos]);

  // Frequência semanal (Mon-Sun)
  const weeklyFrequencyData = useMemo(() => {
    const start = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map((date, index) => {
      const dateString = format(date, 'yyyy-MM-dd');
      const hasTraining = allTreinos.some((t) => {
        const d = t.data instanceof Timestamp ? t.data.toDate() : parseISO(t.data);
        return format(d, 'yyyy-MM-dd') === dateString;
      });
      const isCompleted = !!treinosConcluidosStatus[dateString];

      let status;
      if (isToday(date)) status = hasTraining ? (isCompleted ? 'completed' : 'todayPending') : 'noTraining';
      else if (isPast(date)) status = hasTraining ? (isCompleted ? 'completed' : 'missed') : 'noTraining';
      else status = hasTraining ? 'scheduledFuture' : 'noTraining';

      return { day: daysOfWeekLabels[index], date: dateString, status };
    });
  }, [currentWeekDate, allTreinos, treinosConcluidosStatus]);

  // Marcações do calendário
  useEffect(() => {
    const marked = {};
    const todayString = format(new Date(), 'yyyy-MM-dd');
    marked[todayString] = {
      selected: true,
      selectedColor: Colors.primary,
      selectedTextColor: C.white,
    };

    allTreinos.forEach((treino) => {
      const d = treino.data instanceof Timestamp ? treino.data.toDate() : parseISO(treino.data);
      const key = format(d, 'yyyy-MM-dd');
      const isCompleted = !!treinosConcluidosStatus[key];
      const isFutureDate = !isPast(d) && !isToday(d);
      const isTodayDate = isToday(d);
      const hasTrainingForDate = allTreinos.some((t) => {
        const td = t.data instanceof Timestamp ? t.data.toDate() : parseISO(t.data);
        return format(td, 'yyyy-MM-dd') === key;
      });

      marked[key] = marked[key] || {};

      if (isCompleted) {
        marked[key] = {
          ...marked[key],
          marked: true,
          customStyles: {
            container: { backgroundColor: STATUS_COLORS.completed, borderRadius: 8 },
            text: { color: C.white },
          },
        };
      } else if (isFutureDate) {
        marked[key] = {
          ...marked[key],
          marked: true,
          customStyles: {
            container: { borderWidth: 1, borderColor: STATUS_COLORS.scheduledFuture, borderRadius: 8 },
            text: { color: STATUS_COLORS.scheduledFuture },
          },
        };
      } else if (isTodayDate && hasTrainingForDate) {
        marked[key] = {
          ...marked[key],
          marked: true,
          customStyles: {
            container: { borderWidth: 2, borderColor: STATUS_COLORS.todayPending, borderRadius: 8 },
            text: { color: STATUS_COLORS.todayPending, fontWeight: '700' },
          },
        };
      } else if (isPast(d) && hasTrainingForDate) {
        marked[key] = {
          ...marked[key],
          marked: true,
          customStyles: {
            container: { backgroundColor: STATUS_COLORS.missed, borderRadius: 8 },
            text: { color: C.white },
          },
        };
      }
    });

    setMarkedDatesForCalendar(marked);
  }, [allTreinos, treinosConcluidosStatus]);

  // Navegação semana
  const goToPreviousWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentWeekDate((d) => subWeeks(d, 1));
  };
  const goToNextWeek = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentWeekDate((d) => addWeeks(d, 1));
  };

  // Loading
  if (loadingScreen || userContextLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t('home.preparing')}</Text>
      </View>
    );
    }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header consistente da app */}
      <View style={styles.appHeader}>
        <Text style={styles.headerTitle}>{t('home.title')}</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Perfil');
          }}
        >
          <Ionicons name="person-circle-outline" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        {/* HERO CARD */}
        <LinearGradient colors={[Colors.primary, C.primaryLight]} style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Perfil');
              }}
              activeOpacity={0.8}
            >
              {userDetails?.avatar ? (
                <Image source={{ uri: userDetails.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarTxt}>{userInitial}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.greeting}>
              {greeting}, {firstName}!
            </Text>
            <Text style={styles.planTxt}>{userPlan}</Text>
            <Animated.Text style={[styles.motivTxt, { opacity: fadeAnim }]} numberOfLines={2}>
              {currentMotivationalPhrase}
            </Animated.Text>
            <View style={styles.heroCtas}>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: Colors.secondary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsCalendarModalVisible(true);
                }}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.onSecondary} />
                <Text style={[styles.ctaTxt, { color: Colors.onSecondary }]}>{t('home.cta.calendar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: '#ffffff24', borderWidth: 1, borderColor: '#ffffff55' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate('Histórico');
                }}
              >
                <Ionicons name="time-outline" size={16} color={C.white} />
                <Text style={[styles.ctaTxt, { color: C.white }]}>{t('home.cta.history')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* FREQUÊNCIA SEMANAL */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('home.freqTitle')}</Text>
            <View style={styles.weekNav}>
              <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekBtn}>
                <Icon name="chevron-left" size={16} color={C.neutralGray} />
              </TouchableOpacity>
              <Text style={styles.weekRange}>
                {format(startOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })} –{' '}
                {format(endOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })}
              </Text>
              <TouchableOpacity onPress={goToNextWeek} style={styles.weekBtn}>
                <Icon name="chevron-right" size={16} color={C.neutralGray} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.weekRow}>
            {weeklyFrequencyData.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.dayWrap}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsCalendarModalVisible(true);
                }}
              >
                <View style={[styles.dayBadge, getDayBadgeStyle(item.status)]}>
                  {renderDayIcon(item.status)}
                </View>
                <Text style={styles.dayLabel}>{item.day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.legend}>
            {colorLegend.map((it, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: it.color }]} />
                <Text style={styles.legendTxt}>{it.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* GRELHA DE AÇÕES */}
        <View style={styles.grid}>
          <QuickAction
            icon="dumbbell"
            label={t('home.actions.trainings')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Treinos');
            }}
          />
          <QuickAction
            icon="chart-line"
            label={t('home.actions.progress')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Progresso');
            }}
          />
          <QuickAction
            icon="history"
            label={t('home.actions.history')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Histórico');
            }}
          />
          <QuickAction
            icon="comments"
            label={t('home.actions.chat')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Chat Online');
            }}
          />
          <QuickAction
            icon="question-circle"
            label={t('home.actions.questionnaires')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('ListarQuestionariosUser');
            }}
          />
          <QuickAction
            iconComponent={<Ionicons name="people-outline" size={18} color={Colors.primary} />}
            label={t('home.actions.groupClasses')}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('ListGroupClasses');
            }}
          />
        </View>

        {/* MODAL CALENDÁRIO */}
        <Modal
          transparent
          animationType="fade"
          visible={isCalendarModalVisible}
          onRequestClose={() => setIsCalendarModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t('home.calendar.title')}</Text>
              <Calendar
                markingType="custom"
                markedDates={markedDatesForCalendar}
                onDayPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                theme={{
                  selectedDayBackgroundColor: Colors.primary,
                  todayTextColor: Colors.primary,
                  arrowColor: Colors.primary,
                  monthTextColor: Colors.textPrimary,
                  textSectionTitleColor: C.neutralGray,
                  textDayFontWeight: '600',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '700',
                }}
                style={styles.calendar}
              />
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setIsCalendarModalVisible(false)}
              >
                <Text style={styles.modalCloseTxt}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Helpers UI ---------- */

const renderDayIcon = (status) => {
  switch (status) {
    case 'completed':
      return <Icon name="check" size={12} color={C.white} />;
    case 'missed':
      return <Icon name="times" size={12} color={C.white} />;
    case 'todayPending':
      return <Icon name="exclamation" size={12} color={STATUS_COLORS.todayPending} />;
    case 'scheduledFuture':
      return <Icon name="calendar-alt" size={12} color={STATUS_COLORS.scheduledFuture} />;
    default:
      return null;
  }
};

const getDayBadgeStyle = (status) => {
  const base = {
    borderWidth: 1.5,
    borderColor: STATUS_COLORS.defaultBorder,
    backgroundColor: 'transparent',
  };
  if (status === 'completed') return { backgroundColor: STATUS_COLORS.completed, borderColor: STATUS_COLORS.completed };
  if (status === 'missed') return { backgroundColor: STATUS_COLORS.missed, borderColor: STATUS_COLORS.missed };
  if (status === 'todayPending') return { backgroundColor: 'transparent', borderColor: STATUS_COLORS.todayPending, borderWidth: 2.5 };
  if (status === 'scheduledFuture') return { backgroundColor: 'transparent', borderColor: STATUS_COLORS.scheduledFuture };
  return base;
};

const QuickAction = ({ icon, iconComponent, label, onPress }) => (
  <TouchableOpacity style={styles.qaCard} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.qaIconWrap}>
      {iconComponent ? iconComponent : <Icon name={icon} size={18} color={Colors.primary} />}
    </View>
    <Text style={styles.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

/* ---------- Styles ---------- */

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  appHeader: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Layout.padding,
    paddingTop: Platform.OS === 'android' ? 10 : 6,
    paddingBottom: 12,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW,
  },
  headerTitle: { color: C.white, fontWeight: '800', fontSize: 18 },
  headerIconBtn: {
    backgroundColor: '#ffffff22',
    padding: 8,
    borderRadius: 10,
  },

  scrollArea: {
    padding: Layout.padding,
    paddingBottom: Layout.spacing.xlarge,
  },

  heroCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.large,
    ...SHADOW,
  },
  heroLeft: { marginRight: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: Colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTxt: { color: Colors.primary, fontSize: 26, fontWeight: '900' },
  heroRight: { flex: 1 },
  greeting: { color: C.white, fontWeight: '900', fontSize: 18 },
  planTxt: { color: '#ffffffd0', fontSize: 12, marginTop: 2 },
  motivTxt: { color: '#ffffffb8', fontSize: 12, fontStyle: 'italic', marginTop: 8 },
  heroCtas: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ctaTxt: { fontWeight: '800', fontSize: 12 },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: Layout.spacing.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    ...SHADOW,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: Colors.textPrimary, fontWeight: '900', fontSize: 16 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekBtn: { padding: 6, borderRadius: 8 },
  weekRange: { color: Colors.textPrimary, fontWeight: '700' },

  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dayWrap: { alignItems: 'center', width: `${100 / 7 - 1}%` },
  dayBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { marginTop: 6, color: C.neutralGray, fontSize: 12, fontWeight: '600' },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 4, borderWidth: 1, borderColor: C.borderLight },
  legendTxt: { color: C.neutralGray, fontSize: 12 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  qaCard: {
    width: '48%',
    backgroundColor: Colors.surface || '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.borderLight,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOW,
  },
  qaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: C.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qaLabel: { color: Colors.textPrimary, fontWeight: '700' },

  // Modal calendário
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    ...SHADOW,
  },
  modalTitle: { color: Colors.primary, fontWeight: '900', fontSize: 16, marginBottom: 10 },
  calendar: { borderRadius: 10, borderWidth: 1, borderColor: C.borderLight, marginBottom: 12 },
  modalClose: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalCloseTxt: { color: C.white, fontWeight: '800' },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 8, fontSize: 14, color: Colors.textSecondary },
});
