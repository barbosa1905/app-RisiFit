// screens/User/ExecucaoTreinoScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
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
import YoutubePlayer from 'react-native-youtube-iframe';
import ColorsImport from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUserIdLoggedIn } from '../../services/authService';
import { salvarTreinoConcluido } from '../../services/userService';

const { width, height } = Dimensions.get('window');

// Paleta com fallback
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

// Mapas de séries
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

// Extrai ID de YouTube
const toYouTubeId = (url = '') => {
  const rxs = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const rx of rxs) {
    const m = String(url).match(rx);
    if (m?.[1]) return m[1];
  }
  return '';
};

// Player inline (YouTube / MP4 / GIF)
const InlineMediaPlayer = ({ url, width, height }) => {
  if (!url) return null;
  const ytId = toYouTubeId(url);

  if (ytId) {
    return (
      <YoutubePlayer
        height={height}
        width={width}
        play={false} // mude para true se quiser autoplay
        videoId={ytId}
        initialPlayerParams={{
          controls: true,
          modestbranding: true,
          rel: false,
          fs: 1,
          playsinline: true,
          iv_load_policy: 3,
        }}
        webViewStyle={{ opacity: 0.9999 }}
      />
    );
  }

  // MP4 / GIF
  return (
    <WebView
      style={{ width, height, backgroundColor: '#000' }}
      javaScriptEnabled
      domStorageEnabled
      allowsFullscreenVideo
      originWhitelist={['*']}
      source={{
        html: `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
              <style>
                html,body{ margin:0; background:#000; }
                .box{ width:100%; height:100vh; max-height:${height}px; display:flex; align-items:center; justify-content:center; }
                img,video{ max-width:100%; max-height:100%; object-fit:contain; }
                video{ width:100%; height:100%; }
              </style>
            </head>
            <body>
              <div class="box">
                ${url.endsWith('.gif')
                  ? `<img src="${url}" />`
                  : `<video src="${url}" controls playsinline></video>`
                }
              </div>
            </body>
          </html>`
      }}
    />
  );
};

/** Normaliza array de exercícios de várias estruturas */
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

  return merged.map((ex, idx) => (ctxHydrate(ex, idx, normalizeSets)));
}

const ctxHydrate = (ex, idx, normalizeSets) => ({
  key: String(idx),
  id: ex?.exerciseId ?? null,
  name: ex?.exerciseName || ex?.nome || ex?.name || 'Exercício',
  description: ex?.description || ex?.descricao_breve || '',
  category: ex?.category || ex?.categoria || '',
  imageUrl: ex?.imageUrl || '',
  animationUrl: ex?.animationUrl || '',
  notes: ex?.notes || '',
  sets: normalizeSets(ex),
  targetMuscles: ex?.targetMuscles || [],
  equipment: ex?.equipment || [],
});

/** Enriquecimento com dados da coleção exercises (prioriza nome_en) */
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
    const equipmentRaw = dbData?.equipamento ?? dbData?.equipment;
    const equipment = Array.isArray(equipmentRaw) ? equipmentRaw : (equipmentRaw ? [equipmentRaw] : []);
    const targetMuscles =
      e.targetMuscles?.length
        ? e.targetMuscles
        : (Array.isArray(dbData?.musculos_alvo)
            ? dbData.musculos_alvo.map(m => (typeof m === 'string' ? m : (m?.name || m?.id))).filter(Boolean)
            : []);

    return {
      ...e,
      name: e.name || dbData?.nome_en || dbData?.nome_pt || 'Exercício',
      description: e.description || dbData?.descricao_breve || '',
      imageUrl: e.imageUrl || dbData?.imageUrl || dbData?.imagem_url || '',
      animationUrl: e.animationUrl || dbData?.animationUrl || dbData?.animacao_url || dbData?.videoUrl || '',
      category: e.category || dbData?.category || dbData?.categoria || '',
      targetMuscles,
      equipment,
    };
  });
}

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

  // Checklist
  const [checklist, setChecklist] = useState([]);
  const [exerciseDone, setExerciseDone] = useState([]);

  // Timer
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  // Progresso header
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Feedback
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [observation, setObservation] = useState('');

  // Carregar/normalizar
  useEffect(() => {
    (async () => {
      try {
        const base = normalizeExercises(treino);
        const hydrated = await hydrateFromDB(base);
        setExercises(hydrated);

        const ck = hydrated.map(ex => (Array.isArray(ex.sets) && ex.sets.length)
          ? ex.sets.map(() => false)
          : []
        );
        setChecklist(ck);
        setExerciseDone(hydrated.map(() => false));
      } catch (e) {
        console.error('Erro ao carregar exercícios:', e);
        Alert.alert('Erro', 'Não foi possível carregar os exercícios do treino.');
      } finally {
        setLoading(false);
      }
    })();
  }, [treino]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

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

  const listRef = useRef(null);
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

  useEffect(() => {
    setExerciseDone(prev => {
      if (!checklist.length) return prev;
      const next = exercises.map((ex, i) => {
        const ck = checklist[i];
        if (!ck?.length) return prev[i] || false;
        return ck.every(Boolean);
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
      if (treino?.id) {
        const key = `treinosConcluidos_${userId}`;
        const json = await AsyncStorage.getItem(key);
        const map = json ? JSON.parse(json) : {};
        map[treino.id] = { completed: true, duration: seconds };
        await AsyncStorage.setItem(key, JSON.stringify(map));
      }
      await salvarTreinoConcluido(userId, treino, seconds, rating, observation);
      Alert.alert('Sucesso', 'Treino concluído e feedback registado!');
      setFeedbackOpen(false);
      navigation.goBack();
    } catch (e) {
      console.error('Erro ao salvar treino concluído:', e);
      Alert.alert('Erro', 'Não foi possível registar o treino/feedback.');
    }
  };

  const totalSets = useMemo(() => exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0), [exercises]);
  const doneSets = useMemo(() => checklist.reduce((acc, arr) => acc + (arr?.filter(Boolean).length || 0), 0), [checklist]);
  const overallPercent = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;

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
          {/* (Sem botão de animação — o vídeo está inline em baixo) */}
        </View>

        {/* Player inline (na caixa onde antes era a imagem/ícone de halteres) */}
        {item.animationUrl ? (
          <View style={styles.mediaInlineBox}>
            <InlineMediaPlayer url={item.animationUrl} width={'100%'} height={190} />
          </View>
        ) : item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.exerciseImage} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="dumbbell" size={38} color={Palette.primary} />
          </View>
        )}

        {!!(item.targetMuscles?.length || item.equipment?.length) && (
          <View style={styles.metaRow}>
            {!!item.targetMuscles?.length && (
              <View style={styles.metaChip}>
                <Ionicons name="fitness-outline" size={14} color={Palette.onSecondary} />
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {item.targetMuscles.join(', ')}
                </Text>
              </View>
            )}
            {!!item.equipment?.length && (
              <View style={styles.metaChip}>
                <Ionicons name="hammer-outline" size={14} color={Palette.onSecondary} />
                <Text style={styles.metaChipText} numberOfLines={1}>
                  {item.equipment.join(', ')}
                </Text>
              </View>
            )}
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
            {(treino?.categoria || treino?.category || '—')} • {(() => {
              const d =
                treino?.data?.toDate?.() ??
                (treino?.data ? new Date(treino.data) : undefined) ??
                (treino?.dataAgendada ? new Date(treino.dataAgendada) : undefined);
              return d instanceof Date && !isNaN(d) ? d.toLocaleDateString() : 'Sem data';
            })()}
          </Text>
        </View>

        {/* Timer pill */}
        <View style={styles.timerPill}>
          <Ionicons name="time-outline" size={16} color={Palette.onSecondary} />
          <Text style={styles.timerText}>{(() => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            const pad = (n) => String(n).padStart(2, '0');
            return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
          })()}</Text>
        </View>
      </LinearGradient>

      {/* Barra superior de progresso (exercícios) */}
      <View style={styles.topProgressBar}>
        <Animated.View style={[styles.topProgressFill, { width: headerProgressWidth }]} />
      </View>

      {/* KPI */}
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

      {/* Modal Feedback */}
      {feedbackOpen && (
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
      )}
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

  // Caixa do media inline (vídeo embutido)
  mediaInlineBox: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },

  exerciseImage: { width: '100%', height: 190, borderRadius: 12, backgroundColor: Palette.background, marginTop: 0 },
  imagePlaceholder: {
    width: '100%', height: 190, borderRadius: 12, backgroundColor: Palette.background,
    alignItems: 'center', justifyContent: 'center',
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF7E0', borderColor: Palette.secondary, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    maxWidth: '100%',
  },
  metaChipText: { color: Palette.onSecondary, fontWeight: '700', maxWidth: width - 120 },

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

  /* Feedback Modal style */
  feedbackOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
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
