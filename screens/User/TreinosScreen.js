import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  buscarTodosTreinosDoUser,
  buscarAvaliacoesAgendaDoUser,
} from '../../services/userService';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isToday,
  isFuture,
} from 'date-fns';
import { getUserIdLoggedIn } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';

// Marca
const BRAND = {
  primary: '#2A3B47',
  primaryLight: '#3A506B',
  secondary: '#FFB800',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  lightGray: '#E9EDF2',
  divider: '#E6E8EB',
  white: '#FFFFFF',
  black: '#000000',
  success: '#4CAF50',
  danger: '#F44336',
};

const STATUS_COLORS = {
  completed: BRAND.success,
  missed: BRAND.danger,
  todayPending: BRAND.secondary,
  scheduledFuture: '#FFE6A6',
  defaultBorder: BRAND.divider,
  defaultText: BRAND.textSecondary,
  selectedDay: BRAND.secondary,
  selectedDayText: BRAND.primary,
  evaluation: '#FFF6D6',
  evaluationText: BRAND.secondary,
};

// Frases motivacionais
const frasesMotivacionais = [
  '🏋️‍♂️ Cada treino te aproxima do teu objetivo!',
  '🔥 Não pares até te orgulhares!',
  '💪 A consistência supera a motivação.',
  '⏱️ É só 1 hora do teu dia. Dá o teu máximo!',
  '🧠 Corpo são, mente sã.',
  '🚀 Hoje é um bom dia para evoluir!',
  '🙌 Tu consegues mais do que imaginas.',
  '🥇 O esforço de hoje é o resultado de amanhã.',
];

const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 126 : 116;

export default function TreinosScreen() {
  const [treinos, setTreinos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [avaliacoesDoDia, setAvaliacoesDoDia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Treinos concluídos guardados localmente por ID
  const [treinosConcluidos, setTreinosConcluidos] = useState({});

  const navigation = useNavigation();

  const [fraseMotivacional, setFraseMotivacional] = useState('');
  const fadeAnimPhrase = useRef(new Animated.Value(0)).current;
  const fadeAnimContent = useRef(new Animated.Value(0)).current;

  const [userName, setUserName] = useState('Utilizador');
  const [userInitial, setUserInitial] = useState('U');

  const [treinosTotalSemana, setTreinosTotalSemana] = useState(0);
  const [treinosConcluidosSemana, setTreinosConcluidosSemana] = useState(0);

  const carregarTreinosConcluidos = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return;

      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      const raw = dados ? JSON.parse(dados) : {};

      const coerced = {};
      Object.keys(raw || {}).forEach((treinoId) => {
        const v = raw[treinoId];
        if (v && typeof v === 'object') {
          coerced[treinoId] = {
            completed: !!v.completed,
            duration: typeof v.duration === 'number' ? v.duration : 0,
          };
        }
      });

      setTreinosConcluidos(coerced);
    } catch (e) {
      console.warn('Falha a ler treinos concluídos:', e);
    }
  };

  const fetchEverything = async () => {
    setLoading(true);
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) {
        Alert.alert('Sessão expirada', 'Por favor, inicia sessão novamente.');
        return;
      }

      // Nome do utilizador
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const u = userDocSnap.data();
        const name = u.name || u.nome || 'Utilizador';
        setUserName(name);
        setUserInitial((name || 'U').charAt(0).toUpperCase());
      }

      const [tList, aList] = await Promise.all([
        buscarTodosTreinosDoUser(userId),
        buscarAvaliacoesAgendaDoUser(userId),
      ]);

      // Deduplicação por ID
      const tUnique = Array.from(
        new Map((tList || []).filter(Boolean).map((t) => [t.id, t])).values()
      );
      const aUnique = Array.from(
        new Map((aList || []).filter(Boolean).map((a) => [a.id, a])).values()
      );

      setTreinos(tUnique);
      setAvaliacoes(aUnique);

      await carregarTreinosConcluidos();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível carregar os teus dados.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchEverything();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEverything();
    setRefreshing(false);
  };

  // Frase motivacional animada
  useEffect(() => {
    let i = 0;
    const updatePhrase = () => {
      Animated.timing(fadeAnimPhrase, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        i = (i + 1) % frasesMotivacionais.length;
        setFraseMotivacional(frasesMotivacionais[i]);
        Animated.timing(fadeAnimPhrase, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    };
    setFraseMotivacional(frasesMotivacionais[i]);
    Animated.timing(fadeAnimPhrase, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const id = setInterval(updatePhrase, 7000);
    return () => clearInterval(id);
  }, []);

  // KPIs semanais
  useEffect(() => {
    const today = new Date();
    const startW = startOfWeek(today, { weekStartsOn: 1 });
    const endW = endOfWeek(today, { weekStartsOn: 1 });

    let total = 0;
    let concluidos = 0;

    (treinos || []).forEach((t) => {
      if (typeof t?.data === 'string' && t.data.includes('T')) {
        const d = parseISO(t.data);
        if (!isNaN(d) && isWithinInterval(d, { start: startW, end: endW })) {
          total += 1;
          if (treinosConcluidos[t.id]?.completed) concluidos += 1;
        }
      }
    });

    setTreinosTotalSemana(total);
    setTreinosConcluidosSemana(concluidos);
  }, [treinos, treinosConcluidos]);

  // Marcadores do calendário
  useEffect(() => {
    const marc = {};
    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');

    (treinos || []).forEach((t) => {
      if (typeof t?.data === 'string' && t.data.includes('T')) {
        const dayKey = t.data.split('T')[0];
        const d = parseISO(t.data);
        if (isNaN(d)) return;

        if (!marc[dayKey]) {
          marc[dayKey] = {
            dots: [],
            marked: true,
            customStyles: {
              container: { backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: STATUS_COLORS.defaultBorder },
              text: { color: STATUS_COLORS.defaultText, fontWeight: 'bold' },
            },
          };
        }

        const isConcluido = !!treinosConcluidos[t.id]?.completed;
        const onlyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const onlyToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const isPast = onlyDate < onlyToday;
        const isFut = onlyDate > onlyToday;
        const isHoje = dayKey === todayKey;

        if (isConcluido) {
          if (!marc[dayKey].dots.some((d) => d.key === 'done')) marc[dayKey].dots.push({ key: 'done', color: STATUS_COLORS.completed });
        } else if (isHoje) {
          if (!marc[dayKey].dots.some((d) => d.key === 'today')) marc[dayKey].dots.push({ key: 'today', color: STATUS_COLORS.todayPending });
          marc[dayKey].customStyles.container.borderColor = STATUS_COLORS.todayPending;
          marc[dayKey].customStyles.container.borderWidth = 2;
          marc[dayKey].customStyles.text.color = STATUS_COLORS.todayPending;
        } else if (isPast) {
          if (!marc[dayKey].dots.some((d) => d.key === 'miss')) marc[dayKey].dots.push({ key: 'miss', color: STATUS_COLORS.missed });
          marc[dayKey].customStyles.container.borderColor = STATUS_COLORS.missed;
          marc[dayKey].customStyles.text.color = STATUS_COLORS.missed;
        } else if (isFut) {
          if (!marc[dayKey].dots.some((d) => d.key === 'future')) marc[dayKey].dots.push({ key: 'future', color: STATUS_COLORS.selectedDay });
        }
      }
    });

    (avaliacoes || []).forEach((a) => {
      if (a?.data && typeof a.data === 'string') {
        const dayKey = a.data;
        if (!marc[dayKey]) {
          marc[dayKey] = {
            dots: [],
            marked: true,
            customStyles: {
              container: { backgroundColor: 'transparent', borderRadius: 8, borderWidth: 1, borderColor: STATUS_COLORS.defaultBorder },
              text: { color: STATUS_COLORS.defaultText, fontWeight: 'bold' },
            },
          };
        }
        if (!marc[dayKey].dots.some((d) => d.key === 'eval')) {
          marc[dayKey].dots.push({ key: 'eval', color: STATUS_COLORS.evaluationText });
        }
        marc[dayKey].customStyles.container.backgroundColor = STATUS_COLORS.evaluation;
        marc[dayKey].customStyles.container.borderColor = STATUS_COLORS.evaluationText;
        marc[dayKey].customStyles.text.color = STATUS_COLORS.evaluationText;
      }
    });

    if (selectedDate) {
      marc[selectedDate] = {
        ...(marc[selectedDate] || { dots: [], marked: true }),
        customStyles: {
          container: { backgroundColor: STATUS_COLORS.selectedDay, borderRadius: 8, borderWidth: 2, borderColor: STATUS_COLORS.selectedDayText },
          text: { color: STATUS_COLORS.selectedDayText, fontWeight: 'bold' },
        },
      };
    }

    setMarkedDates(marc);
  }, [treinos, treinosConcluidos, avaliacoes, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      Animated.timing(fadeAnimContent, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      fadeAnimContent.setValue(0);
    }
  }, [selectedDate]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const tDia = (treinos || [])
      .filter((t) => typeof t?.data === 'string' && t.data.startsWith(day.dateString))
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    const aDia = (avaliacoes || [])
      .filter((a) => typeof a?.data === 'string' && a.data === day.dateString);

    setTreinosDoDia(tDia);
    setAvaliacoesDoDia(aDia);
  };

  const limparSelecao = () => {
    setSelectedDate('');
    setTreinosDoDia([]);
    setAvaliacoesDoDia([]);
  };

  const getIconByCategoria = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'força':
        return <MaterialCommunityIcons name="weight-lifter" size={22} color={BRAND.secondary} />;
      case 'cardio':
        return <MaterialCommunityIcons name="heart-pulse" size={22} color={BRAND.secondary} />;
      case 'flexibilidade':
      case 'mobilidade':
        return <MaterialCommunityIcons name="yoga" size={22} color={BRAND.secondary} />;
      case 'core':
        return <MaterialCommunityIcons name="dumbbell" size={22} color={BRAND.secondary} />;
      case 'hiit':
        return <MaterialCommunityIcons name="flash" size={22} color={BRAND.secondary} />;
      default:
        return <MaterialCommunityIcons name="run" size={22} color={BRAND.secondary} />;
    }
  };

  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (h > 0) parts.push(String(h).padStart(2, '0'));
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(s).padStart(2, '0'));
    return parts[0] === '00' && parts.length > 1 ? parts.slice(1).join(':') : parts.join(':');
  };

  const TreinoCard = ({ treino }) => {
    const comp = treinosConcluidos[treino.id];
    const isConcluido = !!comp?.completed;
    const duracaoTreino = typeof comp?.duration === 'number' ? comp.duration : null;

    const dt = typeof treino.data === 'string' ? parseISO(treino.data) : new Date(treino.data);
    const now = new Date();
    const futuro = isFuture(dt);
    const hoje = isToday(dt);
    const atrasado = now > dt && !isConcluido && !futuro;

    return (
      <View style={[styles.treinoCard, isConcluido && styles.treinoCardDone]}>
        <View style={styles.treinoLine1}>
          <View style={styles.treinoIcon}>{getIconByCategoria(treino.categoria)}</View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.treinoTitle, isConcluido && { color: STATUS_COLORS.completed }]}>
              {treino.nome || treino.name || 'Treino'}
            </Text>
            <Text style={styles.treinoSubtitle}>{treino.categoria || '—'} • {new Date(treino.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>

          {/* Chip de estado */}
          {isConcluido ? (
            <View style={[styles.chip, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="check-circle" size={16} color={STATUS_COLORS.completed} />
              <Text style={[styles.chipText, { color: STATUS_COLORS.completed }]}>Concluído</Text>
            </View>
          ) : hoje ? (
            <View style={[styles.chip, { backgroundColor: '#FFF2CC' }]}>
              <MaterialCommunityIcons name="calendar-today" size={16} color={STATUS_COLORS.todayPending} />
              <Text style={[styles.chipText, { color: STATUS_COLORS.todayPending }]}>Hoje</Text>
            </View>
          ) : futuro ? (
            <View style={[styles.chip, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={BRAND.textSecondary} />
              <Text style={[styles.chipText, { color: BRAND.textSecondary }]}>Agendado</Text>
            </View>
          ) : atrasado ? (
            <View style={[styles.chip, { backgroundColor: '#FFE4E6' }]}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={STATUS_COLORS.missed} />
              <Text style={[styles.chipText, { color: STATUS_COLORS.missed }]}>Perdido</Text>
            </View>
          ) : null}
        </View>

        {!!treino.descricao && !futuro && (
          <Text style={styles.treinoDesc} numberOfLines={3}>
            {treino.descricao}
          </Text>
        )}

        {isConcluido && duracaoTreino !== null && duracaoTreino !== 0 && (
          <Text style={styles.treinoDuration}>Duração: {formatDuration(duracaoTreino)}</Text>
        )}

        {hoje && !isConcluido && !atrasado && (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('ExecucaoTreino', { treino })}
          >
            <Text style={styles.btnPrimaryText}>Iniciar treino</Text>
          </TouchableOpacity>
        )}

        {atrasado && (
          <View style={styles.missedBox}>
            <Text style={styles.missedText}>Treino perdido</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header fixo (gradiente brand) */}
      <LinearGradient
        colors={[BRAND.primary, BRAND.primaryLight]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.fixedHeader}
      >
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Olá,</Text>
              <Text style={styles.username}>{userName}</Text>
            </View>
          </View>
          <Text style={styles.brand}>RisiFit</Text>
        </View>

        <Animated.Text style={[styles.motivation, { opacity: fadeAnimPhrase }]}>
          {fraseMotivacional}
        </Animated.Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: FIXED_HEADER_HEIGHT + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.secondary} />}
      >
        {/* KPI semana */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiText}>
            Semana: {treinosConcluidosSemana} / {treinosTotalSemana} treinos concluídos
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    treinosTotalSemana > 0
                      ? `${((treinosConcluidosSemana / treinosTotalSemana) * 100).toFixed(0)}%`
                      : '0%',
                },
              ]}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={BRAND.secondary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <Calendar
              onDayPress={onDayPress}
              markedDates={markedDates}
              markingType={'custom'}
              theme={{
                selectedDayBackgroundColor: STATUS_COLORS.selectedDay,
                todayTextColor: STATUS_COLORS.todayPending,
                arrowColor: BRAND.textSecondary,
                textSectionTitleColor: BRAND.textSecondary,
                monthTextColor: BRAND.textPrimary,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
              }}
              style={styles.calendar}
            />

            {selectedDate ? (
              <>
                <TouchableOpacity style={styles.clearBtn} onPress={limparSelecao}>
                  <Text style={styles.clearBtnText}>Limpar seleção</Text>
                </TouchableOpacity>

                <Animated.View style={{ opacity: fadeAnimContent }}>
                  <Text style={styles.sectionTitle}>
                    Registos em {format(parseISO(selectedDate), 'dd/MM/yyyy')}
                  </Text>

                  {treinosDoDia.length === 0 && avaliacoesDoDia.length === 0 && (
                    <Text style={styles.emptyText}>Nenhum registo para este dia.</Text>
                  )}

                  {treinosDoDia.map((t) => (
                    <TreinoCard key={t.id} treino={t} />
                  ))}

                  {avaliacoesDoDia.map((a) => (
                    <View key={a.id} style={[styles.treinoCard, { borderLeftColor: BRAND.secondary }]}>
                      <Text style={[styles.treinoTitle, { color: BRAND.secondary }]}>📋 Avaliação Física</Text>
                      <Text style={styles.treinoDesc}>{a.texto || a.observacoes || 'Sem detalhes.'}</Text>
                      <Text style={styles.treinoSubtitle}>Hora: {a.hora || '—'}</Text>
                    </View>
                  ))}
                </Animated.View>
              </>
            ) : (
              <Text style={styles.helperText}>Seleciona uma data no calendário para veres os teus registos.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BRAND.background },
  fixedHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, height: FIXED_HEADER_HEIGHT,
    paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    elevation: 6, shadowColor: BRAND.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8,
    zIndex: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND.white, justifyContent: 'center', alignItems: 'center',
    marginRight: 12, borderWidth: 1, borderColor: '#466079',
  },
  avatarText: { color: BRAND.primary, fontSize: 18, fontWeight: '700' },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  username: { color: BRAND.white, fontSize: 18, fontWeight: '700', marginTop: 2 },
  brand: { color: BRAND.white, fontSize: 18, fontWeight: '700', fontStyle: 'italic' },
  motivation: { marginTop: 6, color: 'rgba(255,255,255,0.85)', fontSize: 13, fontStyle: 'italic' },

  scroll: { flex: 1 },

  kpiCard: {
    backgroundColor: BRAND.surface, borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 3, shadowColor: BRAND.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  kpiText: { fontSize: 15, fontWeight: '700', color: BRAND.primary, marginBottom: 10 },
  progressBg: { height: 10, backgroundColor: BRAND.lightGray, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: BRAND.secondary, borderRadius: 6 },

  calendar: {
    borderRadius: 12, marginBottom: 16, backgroundColor: BRAND.surface,
    elevation: 3, shadowColor: BRAND.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },

  clearBtn: {
    alignSelf: 'flex-start', backgroundColor: BRAND.lightGray, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8,
  },
  clearBtnText: { color: BRAND.textSecondary, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: BRAND.primary, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: BRAND.textSecondary, marginTop: 8 },

  helperText: { textAlign: 'center', color: BRAND.textSecondary, marginTop: 16, paddingHorizontal: 16 },

  treinoCard: {
    backgroundColor: BRAND.surface, borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 5, borderLeftColor: BRAND.secondary,
    elevation: 2, shadowColor: BRAND.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  treinoCardDone: { borderLeftColor: STATUS_COLORS.completed, backgroundColor: '#EAF6EE' },
  treinoLine1: { flexDirection: 'row', alignItems: 'center' },
  treinoIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F6F8FA', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  treinoTitle: { fontSize: 16, fontWeight: '800', color: BRAND.primary },
  treinoSubtitle: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  treinoDesc: { fontSize: 13, color: BRAND.textSecondary, marginTop: 10 },
  treinoDuration: { fontSize: 13, color: BRAND.primary, fontWeight: '700', marginTop: 8 },

  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    marginLeft: 10,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  btnPrimary: {
    marginTop: 12, backgroundColor: BRAND.primary, paddingVertical: 12, alignItems: 'center', borderRadius: 10,
  },
  btnPrimaryText: { color: BRAND.white, fontWeight: '800' },

  missedBox: {
    marginTop: 10, borderWidth: 1, borderColor: STATUS_COLORS.missed, backgroundColor: '#FFE4E6',
    alignItems: 'center', paddingVertical: 8, borderRadius: 8,
  },
  missedText: { color: STATUS_COLORS.missed, fontWeight: '800' },
});
