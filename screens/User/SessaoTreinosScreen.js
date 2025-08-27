// screens/User/SessaoTreinosScreen.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ColorsImport from '../../constants/Colors';

const Palette = {
  primary: ColorsImport?.primary ?? '#2A3B47',
  primaryLight: ColorsImport?.primaryLight ?? '#3A506B',
  secondary: ColorsImport?.secondary ?? '#FFB800',
  secondaryDark: ColorsImport?.secondaryDark ?? '#1A1A1A',
  secondaryLight: ColorsImport?.secondaryLight ?? '#FFD166',
  background: ColorsImport?.background ?? '#F0F2F5',
  surface: ColorsImport?.surface ?? ColorsImport?.cardBackground ?? '#FFFFFF',
  textPrimary: ColorsImport?.textPrimary ?? '#333333',
  textSecondary: ColorsImport?.textSecondary ?? '#666666',
  divider: ColorsImport?.divider ?? '#E6E8EB',
  success: ColorsImport?.success ?? '#4CAF50',
  error: ColorsImport?.error ?? ColorsImport?.danger ?? '#F44336',
  accent: ColorsImport?.accent ?? ColorsImport?.secondary ?? '#FFB800',
  cardBackground: ColorsImport?.cardBackground ?? '#FFFFFF',
};

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

function normalizeExercises(treino) {
  const fromTemplates = Array.isArray(treino?.templateExercises) ? treino.templateExercises : [];
  const fromCustom = Array.isArray(treino?.customExercises) ? treino.customExercises : [];
  const fromLegacy = Array.isArray(treino?.exercicios) ? treino.exercicios : [];

  const merged = [...fromTemplates, ...fromCustom, ...fromLegacy];

  return merged.map((ex, idx) => {
    // sets: suporta `sets` novo e `setDetails` legado
    const sets = Array.isArray(ex?.sets)
      ? ex.sets
      : Array.isArray(ex?.setDetails)
      ? ex.setDetails.map(s => ({ ...s, type: s?.type || s?.seriesType })) // normaliza seriesType
      : [];

    return {
      key: String(idx),
      id: ex?.exerciseId ?? null,
      name: ex?.exerciseName || ex?.nome || ex?.name || 'Exercício',
      imageUrl: ex?.imageUrl || '',
      animationUrl: ex?.animationUrl || '',
      description: ex?.description || ex?.descricao_breve || '',
      category: ex?.category || ex?.categoria || '',
      sets,
      notes: ex?.notes || '',
    };
  });
}

export default function SessaoTreinosScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { treino } = route.params || {};

  const exercicios = useMemo(() => normalizeExercises(treino || {}), [treino]);
  const totalExercicios = exercicios.length;

  const dataObj = useMemo(() => {
    // aceita Date, string ISO, Timestamp Firestore (com .toDate)
    const raw =
      treino?.data?.toDate?.() ??
      (treino?.data ? new Date(treino.data) : undefined) ??
      (treino?.dataAgendada ? new Date(treino.dataAgendada) : undefined);
    return raw instanceof Date && !isNaN(raw) ? raw : null;
  }, [treino]);

  const startWorkout = () => {
    navigation.navigate('ExecucaoTreino', { treino }); // ajusta o nome da rota se necessário
  };

  const renderItem = ({ item, index }) => (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.exerciseTitle}>{index + 1}. {item.name}</Text>
          {!!item.category && <Text style={styles.exerciseCategory}>{item.category}</Text>}
        </View>
        {item.animationUrl ? (
          <MaterialCommunityIcons name="play-circle-outline" size={28} color={Palette.primary} />
        ) : null}
      </View>

      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.exerciseImage} resizeMode="cover" />
      ) : null}

      {!!item.description && <Text style={styles.exerciseDescription}>{item.description}</Text>}

      {Array.isArray(item.sets) && item.sets.length > 0 && (
        <View style={styles.seriesBlock}>
          <Text style={styles.seriesTitle}>Séries</Text>
          {item.sets.map((s, i) => (
            <View key={i} style={styles.setRow}>
              <View style={styles.setIndex}>
                <Text style={styles.setIndexText}>{i + 1}</Text>
              </View>
              <Text style={styles.setText} numberOfLines={2}>{formatSeries(s)}</Text>
            </View>
          ))}
        </View>
      )}

      {!!item.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Notas</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Palette.primary, Palette.primaryLight]}
        style={styles.header}
      >
        <StatusBar barStyle="light-content" />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {treino?.nome || treino?.name || 'Sessão de Treino'}
        </Text>
      </LinearGradient>

      <View style={styles.metaCard}>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="barbell-outline" size={16} color={Palette.secondaryDark} />
            <Text style={styles.metaChipText}>
              {treino?.categoria || treino?.category || '—'}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={16} color={Palette.secondaryDark} />
            <Text style={styles.metaChipText}>
              {dataObj ? dataObj.toLocaleDateString() : 'Sem data'}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={16} color={Palette.secondaryDark} />
            <Text style={styles.metaChipText}>{totalExercicios} exerc.</Text>
          </View>
        </View>
        {!!(treino?.descricao || treino?.description) && (
          <Text style={styles.workoutDescription}>
            {treino?.descricao || treino?.description}
          </Text>
        )}
      </View>

      <FlatList
        data={exercicios}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="information-circle-outline" size={28} color={Palette.textSecondary} />
            <Text style={styles.emptyText}>Sem exercícios nesta sessão.</Text>
          </View>
        }
      />

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.startBtn} onPress={startWorkout}>
          <Ionicons name="play" size={22} color={Palette.secondaryDark} />
          <Text style={styles.startBtnText}>Começar treino</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.background },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 6, marginRight: 8 },
  headerTitle: {
    color: Palette.surface,
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },

  metaCard: {
    backgroundColor: Palette.surface,
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.divider,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF7E0', borderColor: Palette.secondary, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  metaChipText: { color: Palette.secondaryDark, fontWeight: '600' },
  workoutDescription: { color: Palette.textSecondary, lineHeight: 20 },

  exerciseCard: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.divider,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseTitle: { color: Palette.primary, fontSize: 16, fontWeight: '700' },
  exerciseCategory: { color: Palette.textSecondary, marginTop: 4 },
  exerciseImage: {
    marginTop: 10, width: '100%', height: 170, borderRadius: 12, backgroundColor: Palette.background,
  },
  exerciseDescription: { marginTop: 8, color: Palette.textSecondary },

  seriesBlock: { marginTop: 10, borderTopWidth: 1, borderTopColor: Palette.divider, paddingTop: 10 },
  seriesTitle: { color: Palette.primary, fontWeight: '700', marginBottom: 6 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  setIndex: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Palette.secondary,
  },
  setIndexText: { color: Palette.secondaryDark, fontWeight: '700' },
  setText: { flex: 1, color: Palette.textPrimary },

  notesBox: {
    marginTop: 8, backgroundColor: '#FFF7E0', borderColor: Palette.secondary, borderWidth: 1,
    borderRadius: 10, padding: 10,
  },
  notesLabel: { color: Palette.secondaryDark, fontWeight: '700', marginBottom: 4 },
  notesText: { color: Palette.textPrimary },

  emptyBox: { alignItems: 'center', padding: 24 },
  emptyText: { marginTop: 6, color: Palette.textSecondary },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: -2 } },
      android: { elevation: 8 },
    }),
  },
  startBtn: {
    backgroundColor: Palette.accent, paddingVertical: 14, borderRadius: 12,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  startBtnText: { color: Palette.secondaryDark, fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
