// screens/User/ExecucaoTreinoScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  TextInput,
  Vibration,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import ColorsImport from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUserIdLoggedIn } from '../../services/authService';
import { salvarTreinoConcluido } from '../../services/userService';

const { width } = Dimensions.get('window');

// Paleta “tolerante” (usa defaults se faltarem no teu Colors.js)
const Palette = {
  primary: ColorsImport?.primary ?? '#2A3B47',
  primaryLight: ColorsImport?.primaryLight ?? '#3A506B',
  primaryDark: ColorsImport?.primaryDark ?? '#1F2A33',
  secondary: ColorsImport?.secondary ?? '#FFB800',
  background: ColorsImport?.background ?? '#F0F2F5',
  surface: ColorsImport?.surface ?? ColorsImport?.cardBackground ?? '#FFFFFF',
  card: ColorsImport?.cardBackground ?? '#FFFFFF',
  textPrimary: ColorsImport?.textPrimary ?? '#333333',
  textSecondary: ColorsImport?.textSecondary ?? '#666666',
  divider: ColorsImport?.divider ?? '#E6E8EB',
  success: ColorsImport?.success ?? '#4CAF50',
  danger: ColorsImport?.danger ?? '#F44336',
  info: ColorsImport?.info ?? '#2196F3',
  onPrimary: ColorsImport?.onPrimary ?? '#FFFFFF',
  onSecondary: ColorsImport?.onSecondary ?? '#1A1A1A',
};

// Mapas de séries compatíveis
const SERIES_TYPES = {
  reps_and_load: ['reps', 'peso', 'descanso'],
  reps_load_time: ['reps', 'peso', 'tempo', 'descanso'],
  reps_and_time: ['reps', 'tempo', 'descanso'],
  time_and_incline: ['tempo', 'inclinacao', 'descanso'],
  running: ['distancia', 'tempo', 'ritmo', 'descanso'],
  notes: ['notas'],
  cadence: ['cadencia', 'descanso'],
  split_series: ['reps', 'peso', 'descanso'],
};

const FIELD_LABELS = {
  reps: 'Reps',
  peso: 'Carga (kg)',
  tempo: 'Tempo',
  inclinacao: 'Inclinação',
  distancia: 'Distância',
  ritmo: 'Ritmo',
  descanso: 'Descanso',
  notas: 'Notas',
  cadencia: 'Cadência',
};

/** Normaliza qualquer formato de exercícios vindo do treino */
function normalizeExercises(treino) {
  const fromTemplates = Array.isArray(treino?.templateExercises) ? treino.templateExercises : [];
  const fromCustom = Array.isArray(treino?.customExercises) ? treino.customExercises : [];
  const fromLegacy = Array.isArray(treino?.exercicios) ? treino.exercicios : [];

  const merged = [...fromTemplates, ...fromCustom, ...fromLegacy];

  const normalizeSets = (ex) => {
    if (Array.isArray(ex?.sets)) return ex.sets;
    if (Array.isArray(ex?.setDetails)) {
      return ex.setDetails.map(s => ({ ...s, type: s?.type || s?.seriesType }));
    }
    return [];
  };

  return merged.map((ex, idx) => ({
    key: String(idx),
    id: ex?.exerciseId ?? null,
    name: ex?.exerciseName || ex?.nome || ex?.name || 'Exercício',
    description: ex?.description || ex?.descricao_breve || '',
    category: ex?.category || ex?.categoria || '',
    imageUrl: ex?.imageUrl || '',
    animationUrl: ex?.animationUrl || '',
    notes: ex?.notes || '',
    sets: normalizeSets(ex),
    // Estes enriquecimentos são opcionais, caso existam nas tuas docs de exercises:
    targetMuscles: ex?.targetMuscles || [],
    equipment: ex?.equipment || [],
  }));
}

/** Carrega detalhes de exercícios (nome/descrição/imagem) da coleção exercises quando houver exerciseId */
async function hydrateFromDB(exercises) {
  const withIds = exercises.filter(e => e.id);
  if (!withIds.length) return exercises;

  const docs = await Promise.all(
    withIds.map(e => getDoc(doc(db, 'exercises', e.id)))
  );

  const map = new Map(docs.filter(d => d.exists()).map(d => [d.id, d.data()]));
  return exercises.map(e => {
    if (!e.id) return e;
    const dbData = map.get(e.id) || {};
    return {
      ...e,
      name: e.name || dbData?.nome_pt || 'Exercício',
      description: e.description || dbData?.descricao_breve || '',
      imageUrl: e.imageUrl || dbData?.imageUrl || '',
      animationUrl: e.animationUrl || dbData?.animationUrl || '',
      category: e.category || dbData?.category || '',
      targetMuscles: e.targetMuscles?.length ? e.targetMuscles : (dbData?.musculos_alvo ? dbData.musculos_alvo.map(m => m.name || m.id).filter(Boolean) : []),
      equipment: e.equipment?.length ? e.equipment : (dbData?.equipment || []),
    };
  });
}

/** Formata uma série para texto “bonito” */
function formatSeries(set) {
  const type = set?.type || set?.seriesType;
  const fields = SERIES_TYPES[type] || [];
  const parts = [];
  for (const f of fields) {
    const v = set?.[f];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      parts.push(`${FIELD_LABELS[f] || f}: ${String(v)}`);
    }
  }
  return parts.join(' • ');
}

export default function ExecucaoTreinoScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const treino = route?.params?.treino || {};

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Checklist de séries concluidas por exercício (boolean[])
  const [checklist, setChecklist] = useState([]); // Array< Array<boolean> >
  const [exerciseDone, setExerciseDone] = useState([]); // Array<boolean>

  // Timer
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  // Animação de topo (barra fina de progresso)
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Modal de vídeo/GIF
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');

  // Modal de feedback final
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [observation, setObservation] = useState('');

  // Carregar/normalizar sessão
  useEffect(() => {
    (async () => {
      try {
        const base = normalizeExercises(treino);
        const hydrated = await hydrateFromDB(base);
        setExercises(hydrated);

        // construir checklists
        const ck = hydrated.map(ex => (Array.isArray(ex.sets) && ex.sets.length)
          ? ex.sets.map(() => false)
          : [] // sem sets
        );
        setChecklist(ck);
        setExerciseDone(hydrated.map(() => false));
      } catch (e) {
        console.error('Erro ao carregar detalhes do treino:', e);
        Alert.alert('Erro', 'Não foi possível carregar os exercícios do treino.');
      } finally {
        setLoading(false);
      }
    })();
  }, [treino]);

  // Timer loop
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  // Progresso animado (barra top) = % de exercícios concluídos
  useEffect(() => {
    const percent = exercises.length
      ? exerciseDone.filter(Boolean).length / exercises.length
      : 0;
    Animated.timing(progressAnim, {
      toValue: percent,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [exerciseDone, exercises.length, progressAnim]);

  const dataObj = useMemo(() => {
    const raw =
      treino?.data?.toDate?.() ??
      (treino?.data ? new Date(treino.data) : undefined) ??
      (treino?.dataAgendada ? new Date(treino.dataAgendada) : undefined);
    return raw instanceof Date && !isNaN(raw) ? raw : null;
  }, [treino]);

  const goPrev = () => {
    const idx = Math.max(currentIndex - 1, 0);
    setCurrentIndex(idx);
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  };
  const goNext = () => {
    const idx = Math.min(currentIndex + 1, Math.max(exercises.length - 1, 0));
    setCurrentIndex(idx);
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const listRef = useRef(null);
  const onMomentumEnd = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== currentIndex) setCurrentIndex(i);
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
  };

  const toggleSet = (exIdx, setIdx) => {
    setChecklist(prev => {
      const next = prev.map(arr => [...arr]);
      if (!next[exIdx]?.length) return prev;
      next[exIdx][setIdx] = !next[exIdx][setIdx];
      return next;
    });
    Vibration?.vibrate?.(15);
  };

  // Sempre que o checklist muda, ver se o exercício está concluído
  useEffect(() => {
    setExerciseDone(prev => {
      if (!checklist.length) return prev;
      const next = exercises.map((ex, i) => {
        const ck = checklist[i];
        if (!ck?.length) {
          // Sem sets: considera concluído quando o utilizador marcar manualmente (botão)
          return prev[i] || false;
        }
        const all = ck.every(Boolean);
        return all;
      });
      return next;
    });
  }, [checklist, exercises]);

  const markExerciseDoneManually = (idx) => {
    setExerciseDone(prev => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    Vibration?.vibrate?.(20);
  };

  const openMedia = (url) => {
    setMediaUrl(url);
    setMediaOpen(true);
  };

  const closeMedia = () => {
    setMediaOpen(false);
    setMediaUrl('');
  };

  const finishWorkout = () => {
    setRunning(false);
    const doneCount = exerciseDone.filter(Boolean).length;
    const total = exercises.length;
    Alert.alert(
      'Concluir treino',
      `Concluir "${String(treino?.nome || treino?.name || 'Treino')}"?\nProgresso: ${doneCount}/${total} exercícios concluídos.\nDuração: ${formatTime(seconds)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Concluir', onPress: () => setFeedbackOpen(true) }
      ]
    );
  };

  const sendFeedbackAndSave = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) {
        Alert.alert('Erro', 'Utilizador não autenticado.');
        return;
      }

      // Persistência local de concluído (como já tinhas)
      if (treino?.id) {
        const key = `treinosConcluidos_${userId}`;
        const json = await AsyncStorage.getItem(key);
        const map = json ? JSON.parse(json) : {};
        map[treino.id] = { completed: true, duration: seconds };
        await AsyncStorage.setItem(key, JSON.stringify(map));
      }

      // Firestore (service existente)
      await salvarTreinoConcluido(userId, treino, seconds, rating, observation);

      Alert.alert('Sucesso', 'Treino concluído e feedback registado!');
      setFeedbackOpen(false);
      navigation.goBack();
    } catch (e) {
      console.error('Erro ao salvar treino concluído:', e);
      Alert.alert('Erro', 'Não foi possível registar o treino/feedback.');
    }
  };

  // UI helpers
  const totalSets = useMemo(() => {
    return exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  }, [exercises]);
  const doneSets = useMemo(() => {
    if (!checklist.length) return 0;
    return checklist.reduce((acc, arr) => acc + (arr?.filter(Boolean).length || 0), 0);
  }, [checklist]);
  const overallPercent = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

  // header progress width
  const headerProgressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderExercise = ({ item, index }) => {
    const sets = Array.isArray(item.sets) ? item.sets : [];
    const ckRow = checklist[index] || [];

    return (
      <View style={styles.slide}>
        <View style={styles.slideHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {index + 1}. {item.name}
            </Text>
            {!!item.category && <Text style={styles.exerciseCategory}>{item.category}</Text>}
          </View>

          {item.animationUrl ? (
            <TouchableOpacity onPress={() => openMedia(item.animationUrl)} style={styles.mediaBtn}>
              <Ionicons name="play-circle-outline" size={28} color={Palette.onPrimary} />
              <Text style={styles.mediaBtnText}>Ver animação</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.exerciseImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="dumbbell" size={38} color={Palette.primary} />
          </View>
        )}

        {!!item.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        )}

        {/* Séries */}
        {sets.length > 0 ? (
          <View style={styles.setsCard}>
            <View style={styles.setsHeader}>
              <Text style={styles.setsTitle}>Séries</Text>
              <Text style={styles.setsCounter}>
                {ckRow.filter(Boolean).length}/{sets.length}
              </Text>
            </View>

            {sets.map((s, i) => {
              const isChecked = !!ckRow[i];
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.setRow, isChecked && styles.setRowChecked]}
                  onPress={() => toggleSet(index, i)}
                >
                  <View style={[styles.checkCircle, isChecked && styles.checkCircleOn]}>
                    {isChecked ? <Ionicons name="checkmark" size={14} color={Palette.onPrimary} /> : null}
                  </View>
                  <Text style={[styles.setText, isChecked && styles.setTextChecked]} numberOfLines={2}>
                    {formatSeries(s) || 'Série'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.noSetsBox}>
            <Text style={styles.noSetsText}>Este exercício não tem séries definidas.</Text>
            {!exerciseDone[index] && (
              <TouchableOpacity style={styles.manualDoneBtn} onPress={() => markExerciseDoneManually(index)}>
                <Ionicons name="checkmark-circle" size={20} color={Palette.onSecondary} />
                <Text style={styles.manualDoneText}>Marcar exercício concluído</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Estado do exercício */}
        <View style={styles.exerciseFooter}>
          <View style={styles.footerLeft}>
            {exerciseDone[index] ? (
              <View style={styles.doneChip}>
                <Ionicons name="checkmark-circle" size={16} color={Palette.onSecondary} />
                <Text style={styles.doneChipText}>Concluído</Text>
              </View>
            ) : (
              <View style={styles.progressChip}>
                <Ionicons name="time-outline" size={16} color={Palette.onSecondary} />
                <Text style={styles.progressChipText}>Em progresso</Text>
              </View>
            )}
          </View>
          <View style={styles.footerRight}>
            <TouchableOpacity style={[styles.navBtn, { opacity: index === 0 ? 0.5 : 1 }]} disabled={index === 0} onPress={goPrev}>
              <Ionicons name="chevron-back" size={22} color={Palette.onSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, { opacity: index === exercises.length - 1 ? 0.5 : 1 }]}
              disabled={index === exercises.length - 1}
              onPress={goNext}
            >
              <Ionicons name="chevron-forward" size={22} color={Palette.onSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Palette.primary} />
        <Text style={{ marginTop: 10, color: Palette.textSecondary }}>A carregar treino…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <LinearGradient colors={[Palette.primary, Palette.primaryLight]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={Palette.onPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {treino?.nome || treino?.name || 'Sessão de Treino'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {(treino?.categoria || treino?.category || '—')} • {dataObj ? dataObj.toLocaleDateString() : 'Sem data'}
          </Text>
        </View>

        {/* Timer pill */}
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={16} color={Palette.onSecondary} />
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
        </View>
      </LinearGradient>

      {/* Thin progress (exercícios concluídos) */}
      <View style={styles.topProgressBar}>
        <Animated.View style={[styles.topProgressFill, { width: headerProgressWidth }]} />
      </View>

      {/* Barra de KPI */}
      <View style={styles.kpisRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{exercises.length}</Text>
          <Text style={styles.kpiLabel}>Exercícios</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{doneSets}/{totalSets}</Text>
          <Text style={styles.kpiLabel}>Séries</Text>
        </View>
        <View style={styles.kpiCardAccent}>
          <Text style={styles.kpiValueAccent}>{overallPercent}%</Text>
          <Text style={styles.kpiLabelAccent}>Progresso</Text>
        </View>
      </View>

      {/* Carrossel de exercícios */}
      <FlatList
        ref={listRef}
        data={exercises}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={renderExercise}
      />

      {/* Dock inferior */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          onPress={() => setRunning(prev => !prev)}
          style={[styles.dockBtn, running ? styles.dockPause : styles.dockPlay]}
        >
          <Ionicons name={running ? 'pause' : 'play'} size={22} color={Palette.onPrimary} />
          <Text style={styles.dockBtnText}>{running ? 'Pausar' : 'Iniciar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={finishWorkout} style={[styles.dockBtn, styles.dockFinish]}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Palette.onSecondary} />
          <Text style={[styles.dockBtnText, { color: Palette.onSecondary }]}>Concluir</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Animação */}
      <Modal visible={mediaOpen} transparent animationType="fade" onRequestClose={closeMedia}>
        <View style={styles.mediaModalOverlay}>
          <View style={styles.mediaModalContent}>
            {mediaUrl ? (
              <WebView
                source={{
                  html: `
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
                      <style>
                        body { margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#000; }
                        img, video { max-width:100%; max-height:100%; object-fit:contain; }
                      </style>
                    </head>
                    <body>
                      ${mediaUrl.endsWith('.gif')
                        ? `<img src="${mediaUrl}" />`
                        : `<video src="${mediaUrl}" autoplay loop controls></video>`
                      }
                    </body>
                  </html>`
                }}
                style={{ width: '100%', height: '85%' }}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
              />
            ) : (
              <Text style={{ color: Palette.onPrimary }}>Sem media disponível.</Text>
            )}
            <TouchableOpacity onPress={closeMedia} style={styles.mediaCloseBtn}>
              <Text style={styles.mediaCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Feedback */}
      <Modal visible={feedbackOpen} transparent animationType="slide" onRequestClose={() => setFeedbackOpen(false)}>
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>Avalie o Treino</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <MaterialCommunityIcons
                    name={s <= rating ? 'star' : 'star-outline'}
                    size={36}
                    color={s <= rating ? Palette.secondary : '#E8D8A0'}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.feedbackLabel}>Observações (opcional)</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Ex.: Excelente sessão, senti evolução no agachamento."
              placeholderTextColor="#B7B7B7"
              value={observation}
              onChangeText={setObservation}
              multiline
            />

            <View style={styles.feedbackActions}>
              <TouchableOpacity style={[styles.feedbackBtn, { backgroundColor: Palette.danger }]} onPress={() => setFeedbackOpen(false)}>
                <Text style={styles.feedbackBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.feedbackBtn, { backgroundColor: Palette.success }]} onPress={sendFeedbackAndSave}>
                <Text style={styles.feedbackBtnText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },

  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 6 : 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBack: { padding: 6 },
  headerTitle: { color: Palette.onPrimary, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: Palette.onPrimary, opacity: 0.85, marginTop: 2 },

  timerPill: {
    backgroundColor: '#FFF7E0',
    borderColor: Palette.secondary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: { color: Palette.onSecondary, fontWeight: '700' },

  topProgressBar: {
    height: 4,
    backgroundColor: '#F8EFC8',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  topProgressFill: {
    height: 4,
    backgroundColor: Palette.secondary,
  },

  kpisRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.divider,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 18, fontWeight: '800', color: Palette.textPrimary },
  kpiLabel: { color: Palette.textSecondary, marginTop: 2 },
  kpiCardAccent: {
    flex: 1,
    backgroundColor: '#FFF7E0',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.secondary,
    alignItems: 'center',
  },
  kpiValueAccent: { fontSize: 18, fontWeight: '800', color: Palette.onSecondary },
  kpiLabelAccent: { color: Palette.onSecondary, marginTop: 2 },

  slide: {
    width: width - 32,
    marginRight: 16,
    backgroundColor: Palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.divider,
    padding: 14,
  },
  slideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exerciseName: { fontSize: 18, fontWeight: '800', color: Palette.primary },
  exerciseCategory: { color: Palette.textSecondary, marginTop: 2 },
  mediaBtn: {
    backgroundColor: Palette.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaBtnText: { color: Palette.onSecondary, fontWeight: '800' },

  exerciseImage: { width: '100%', height: 190, borderRadius: 12, backgroundColor: Palette.background },
  imagePlaceholder: {
    width: '100%', height: 190, borderRadius: 12, backgroundColor: Palette.background,
    alignItems: 'center', justifyContent: 'center',
  },

  descriptionBox: { backgroundColor: Palette.surface, padding: 10, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: Palette.divider },
  descriptionText: { color: Palette.textSecondary },

  setsCard: { backgroundColor: Palette.surface, borderRadius: 12, padding: 10, marginTop: 12, borderWidth: 1, borderColor: Palette.divider },
  setsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  setsTitle: { fontSize: 16, fontWeight: '800', color: Palette.textPrimary },
  setsCounter: { color: Palette.textSecondary, fontWeight: '700' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginVertical: 4,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: Palette.divider,
  },
  setRowChecked: {
    backgroundColor: '#F0F9F5',
    borderColor: Palette.success,
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Palette.secondary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  checkCircleOn: { backgroundColor: Palette.secondary, borderColor: Palette.secondary },
  setText: { flex: 1, color: Palette.textPrimary },
  setTextChecked: { color: Palette.primary },

  noSetsBox: { backgroundColor: Palette.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Palette.divider, marginTop: 12 },
  noSetsText: { color: Palette.textSecondary, marginBottom: 10 },
  manualDoneBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualDoneText: { color: Palette.onSecondary, fontWeight: '800' },

  exerciseFooter: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', gap: 8 },
  doneChip: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#E9F7EF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  doneChipText: { color: Palette.onSecondary, fontWeight: '700' },
  progressChip: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FFF7E0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Palette.secondary },
  progressChipText: { color: Palette.onSecondary, fontWeight: '700' },
  footerRight: { flexDirection: 'row', gap: 8 },
  navBtn: { backgroundColor: Palette.secondary, borderRadius: 10, padding: 10 },

  bottomDock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 18 },
    }),
  },
  dockBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  dockPlay: { backgroundColor: Palette.primary },
  dockPause: { backgroundColor: '#334652' },
  dockFinish: { backgroundColor: Palette.secondary },
  dockBtnText: { color: Palette.onPrimary, fontWeight: '800', fontSize: 16 },

  /* Media Modal */
  mediaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  mediaModalContent: { backgroundColor: '#000', borderRadius: 14, width: '100%', maxWidth: 700, height: '70%', padding: 10 },
  mediaCloseBtn: { marginTop: 10, alignSelf: 'center', backgroundColor: Palette.secondary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  mediaCloseText: { color: Palette.onSecondary, fontWeight: '800' },

  /* Feedback Modal */
  feedbackOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  feedbackCard: { backgroundColor: Palette.surface, width: '100%', maxWidth: 680, borderRadius: 16, padding: 16 },
  feedbackTitle: { fontSize: 20, fontWeight: '800', color: Palette.primary, textAlign: 'center' },
  starsRow: { flexDirection: 'row', alignSelf: 'center', marginTop: 10 },
  feedbackLabel: { color: Palette.textSecondary, marginTop: 14, marginBottom: 6 },
  feedbackInput: {
    borderWidth: 1, borderColor: Palette.divider, borderRadius: 12, padding: 12,
    minHeight: 90, textAlignVertical: 'top', color: Palette.textPrimary, backgroundColor: '#FBFBFB',
  },
  feedbackActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  feedbackBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  feedbackBtnText: { color: Palette.onPrimary, fontWeight: '800' },
});
