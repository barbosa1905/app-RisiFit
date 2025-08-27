// screens/CreateWorkoutTemplateScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
  StatusBar,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import AppHeader from '../../components/AppHeader';
/* =================== Tema / Constantes =================== */
const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  onPrimary: '#FFFFFF',
  onSecondary: '#111827',
  background: 'transparent',
  cardBackground: 'rgba(255,255,255,0.82)',
  surface: 'rgba(255,255,255,0.55)',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  success: '#22C55E',
  danger: '#E53935',
  info: '#2563EB',
  divider: 'rgba(17,24,39,0.10)',
};
const RADIUS = 16;
const GAP = 12;

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core', 'Outro'];
const categoriasFiltroExercicios = ['Todos', ...categorias];

const seriesTypes = {
  reps_and_load: {
    label: 'Repetições e carga',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'barbell-outline',
  },
  reps_load_time: {
    label: 'Repetições, carga e tempo',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'repeat',
  },
  reps_and_time: {
    label: 'Repetições e tempo',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'time-outline',
  },
  time_and_incline: {
    label: 'Tempo e inclinação',
    fields: [
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'inclinacao', placeholder: 'Inclinação (%)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'trending-up-outline',
  },
  running: {
    label: 'Corrida',
    fields: [
      { key: 'distancia', placeholder: 'Distância (m)', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (min:s)', keyboardType: 'default' },
      { key: 'ritmo', placeholder: 'Ritmo (min/km)', keyboardType: 'default' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'walk-outline',
  },
  notes: {
    label: 'Observações',
    fields: [{ key: 'notas', placeholder: 'Observações', multiline: true }],
    icon: 'create-outline',
  },
  cadence: {
    label: 'Cadência',
    fields: [
      { key: 'cadencia', placeholder: 'Cadência (rpm)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'pulse-outline',
  },
  split_series: {
    label: 'Série Split',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'shuffle-outline',
  },
};

/* =================== Helpers =================== */
const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object') return Object.values(val);
  return [];
};

/* ---- Ícones por categoria + Chip de filtro ---- */
const CATEGORY_ICON = {
  Todos: 'grid-outline',
  Cardio: 'walk-outline',
  Força: 'barbell-outline',
  Mobilidade: 'accessibility-outline',
  Core: 'fitness-outline',
  Outro: 'sparkles-outline',
};

const CategoryChip = ({ label, selected, onPress }) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: 'rgba(0,0,0,0.05)', borderless: true }}
    style={({ pressed }) => [
      styles.chip,
      selected && styles.chipSelected,
      pressed && { opacity: 0.95 },
    ]}
    accessibilityRole="button"
    accessibilityLabel={`Filtrar por ${label}`}
  >
    <Ionicons
      name={CATEGORY_ICON[label] || 'ellipse-outline'}
      size={14}
      color={selected ? Colors.onPrimary : Colors.textSecondary}
    />
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </Pressable>
);

/* ---- Cartão da biblioteca (grid) ---- */
const LibraryCard = React.memo(({ item, onPress }) => {
  const name = item.nome_pt || item.name || 'Exercício';
  const muscle = item.category || item.muscle || item.músculo || '';
  const notes = item.descricao || item.notes || '';

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      style={({ pressed }) => [styles.libCard, pressed && { transform: [{ scale: 0.997 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`Adicionar ${name}`}
    >
      <View style={styles.libIconWrap}>
        <Ionicons name="fitness-outline" size={18} />
      </View>

      <Text style={styles.libName} numberOfLines={2}>{name}</Text>

      {!!muscle && (
        <View style={styles.muscleChip}>
          <Ionicons name="cellular-outline" size={12} />
          <Text style={styles.muscleChipTxt} numberOfLines={1}>{muscle}</Text>
        </View>
      )}

      {!!notes && <Text style={styles.libNotes} numberOfLines={2}>{notes}</Text>}

      <View style={styles.libPlusBadge}>
        <Ionicons name="add" size={16} color="#111827" />
      </View>
    </Pressable>
  );
});

/* =================== Componente =================== */
export default function CreateWorkoutTemplateScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { templateId, templateData } = route.params || {};

  // Estado
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [isExerciseSelectionModalVisible, setIsExerciseSelectionModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [currentExerciseToAdd, setCurrentExerciseToAdd] = useState(null);
  const [exerciseDetailsModalVisible, setExerciseDetailsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseCategoryFilter, setSelectedExerciseCategoryFilter] = useState('Todos');
  const [isAddSeriesModalVisible, setIsAddSeriesModalVisible] = useState(false);
  const [selectedSeriesType, setSelectedSeriesType] = useState('reps_and_load');
  const [currentSeriesFields, setCurrentSeriesFields] = useState({});
  const [currentExerciseSets, setCurrentExerciseSets] = useState([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSeriesTypeDropdownVisible, setIsSeriesTypeDropdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Grid responsivo + remount key
  const computeCols = () => {
    const w = Dimensions.get('window').width;
    if (w >= 900) return 4;
    if (w >= 600) return 3;
    return 2;
  };
  const [gridColumns, setGridColumns] = useState(computeCols());
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setGridColumns(computeCols()));
    return () => sub?.remove?.();
  }, []);
  const listLayoutKey = `lib_grid_${gridColumns}`;

  const auth = getAuth();
  const currentUser = auth.currentUser;

  /* ========== Admin info (subscrição) ========== */
  const fetchAdminInfo = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante', uid: 'guest' });
      return () => {};
    }
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setAdminInfo({ id: docSnap.id, uid: user.uid, ...docSnap.data() });
        } else {
          setAdminInfo({ uid: user.uid, name: user.email?.split('@')[0] || 'Admin', email: user.email });
        }
      },
      () => setAdminInfo({ uid: user.uid, name: user.email?.split('@')[0] || 'Admin', email: user.email })
    );
    return unsubscribe;
  }, [auth]);

  /* ========== Biblioteca de exercícios ========== */
  const fetchExerciseLibrary = useCallback(async () => {
    try {
      const exercisesColRef = collection(db, 'exercises');
      const qx = query(exercisesColRef, orderBy('nome_pt', 'asc'));
      const snapshot = await getDocs(qx);
      const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExerciseLibrary(fetched);
    } catch (err) {
      console.error('Erro ao carregar exercícios:', err);
      Alert.alert('Erro', 'Não foi possível carregar a biblioteca de exercícios.');
    }
  }, []);

  /* ========== Hidratar template ao editar ========== */
  const hydrateTemplateForEdit = useCallback((docData) => {
    if (!docData) return;

    setTemplateName(docData.name || '');
    setTemplateDescription(docData.description || '');
    setTemplateCategory(docData.category || '');

    const rawExercises = toArray(docData.exercises);

    const hydrated = rawExercises.map((ex, idx) => {
      const setsArr = toArray(ex.sets).map((s, i) => ({
        ...s,
        setId: s.setId || `set_${idx}_${i}_${Math.random().toString(36).slice(2)}`,
      }));

      return {
        exerciseId: ex.exerciseId || ex.id || '',
        exerciseName: ex.exerciseName || ex.nome_pt || 'Exercício',
        sets: setsArr,
        templateExerciseId:
          ex.templateExerciseId ||
          `tex_${idx}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
    });

    setSelectedExercises(hydrated);
  }, []);

  const fetchTemplateForEdit = useCallback(async () => {
    if (!templateId) return;
    try {
      const ref = doc(db, 'workoutTemplates', templateId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        hydrateTemplateForEdit(data);
      } else {
        Alert.alert('Aviso', 'Modelo não encontrado.');
      }
    } catch (e) {
      console.error('Erro a carregar modelo para edição:', e);
      Alert.alert('Erro', 'Não foi possível carregar o modelo para edição.');
    }
  }, [templateId, hydrateTemplateForEdit]);

  /* ========== Init ========== */
  useEffect(() => {
    let mounted = true;
    const unsubAdmin = fetchAdminInfo();

    (async () => {
      try {
        await Promise.all([
          fetchExerciseLibrary(),
          templateId ? fetchTemplateForEdit() : Promise.resolve(),
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    if (templateData) {
      hydrateTemplateForEdit(templateData);
      setLoading(false);
    }

    return () => {
      mounted = false;
      unsubAdmin && unsubAdmin();
    };
  }, [fetchAdminInfo, fetchExerciseLibrary, fetchTemplateForEdit, templateData, hydrateTemplateForEdit]);

  /* ========== Pull-to-refresh ========== */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchExerciseLibrary(), templateId ? fetchTemplateForEdit() : Promise.resolve()])
      .finally(() => setRefreshing(false));
  }, [fetchExerciseLibrary, fetchTemplateForEdit, templateId]);

  /* ========== Filtro memoizado ========== */
  const filteredExercises = useMemo(() => {
    const sq = (searchQuery || '').toLowerCase();
    return exerciseLibrary.filter((exercise) => {
      const name = (exercise.nome_pt || '').toLowerCase();
      const matchesSearch = name.includes(sq);
      const matchesCategory =
        selectedExerciseCategoryFilter === 'Todos' ||
        (exercise.category &&
          String(exercise.category).toLowerCase() ===
            selectedExerciseCategoryFilter.toLowerCase());
      return matchesSearch && matchesCategory;
    });
  }, [exerciseLibrary, searchQuery, selectedExerciseCategoryFilter]);

  /* ========== UI helpers ========== */
  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  /* ========== Ações ========== */
  const openExerciseSelectionModal = () => {
    setIsExerciseSelectionModalVisible(true);
    setSearchQuery('');
    setSelectedExerciseCategoryFilter('Todos');
  };
  const closeExerciseSelectionModal = () => setIsExerciseSelectionModalVisible(false);

  const selectExerciseFromLibrary = (exercise) => {
    setCurrentExerciseToAdd(exercise);
    setCurrentExerciseSets([]);
    setIsExerciseSelectionModalVisible(false);
    setExerciseDetailsModalVisible(true);
  };

  const openAddSeriesModal = () => {
    setSelectedSeriesType('reps_and_load');
    setCurrentSeriesFields({});
    setIsAddSeriesModalVisible(true);
    setIsSeriesTypeDropdownVisible(false);
  };

  const adicionarNovaSerie = () => {
    if (!selectedSeriesType) {
      Alert.alert('Erro', 'Seleciona um tipo de série.');
      return;
    }
    const newSet = {
      type: selectedSeriesType,
      ...currentSeriesFields,
      setId: `set_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    setCurrentExerciseSets((prev) => [...prev, newSet]);
    setIsAddSeriesModalVisible(false);
    Alert.alert('Sucesso', 'Série adicionada!');
  };

  const addExerciseDetailsToTemplate = () => {
    if (currentExerciseSets.length === 0) {
      Alert.alert('Erro', 'Adiciona pelo menos uma série.');
      return;
    }
    const newExerciseInTemplate = {
      exerciseId: currentExerciseToAdd.id,
      exerciseName: currentExerciseToAdd.nome_pt,
      sets: currentExerciseSets,
      templateExerciseId: `tex_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    setSelectedExercises((prev) => [...prev, newExerciseInTemplate]);
    setExerciseDetailsModalVisible(false);
    setCurrentExerciseToAdd(null);
    setCurrentExerciseSets([]);
    Alert.alert('Sucesso', `${currentExerciseToAdd.nome_pt} adicionado ao treino!`);
  };

  const removeExerciseFromTemplate = (templateExerciseId) => {
    Alert.alert('Remover Exercício', 'Queres remover este exercício do modelo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          setSelectedExercises((prev) =>
            prev.filter((ex) => ex.templateExerciseId !== templateExerciseId)
          ),
      },
    ]);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return Alert.alert('Erro', 'Dá um nome ao modelo.');
    if (!templateCategory.trim()) return Alert.alert('Erro', 'Seleciona uma categoria.');
    if (selectedExercises.length === 0)
      return Alert.alert('Erro', 'Adiciona pelo menos um exercício.');

    setLoading(true);
    try {
      const templateToSave = {
        name: templateName.trim(),
        nameLower: templateName.trim().toLowerCase(),
        description: templateDescription.trim(),
        category: templateCategory,
        exercises: selectedExercises.map(({ templateExerciseId, ...rest }) => ({
          ...rest,
          sets: toArray(rest.sets).map(({ setId, ...setRest }) => setRest),
        })),
        updatedAt: new Date(),
        createdBy: currentUser?.uid || adminInfo?.uid || 'unknown',
      };

      if (templateId) {
        await updateDoc(doc(db, 'workoutTemplates', templateId), templateToSave);
        Alert.alert('Sucesso', 'Modelo atualizado!');
      } else {
        await addDoc(collection(db, 'workoutTemplates'), {
          ...templateToSave,
          createdAt: new Date(),
        });
        Alert.alert('Sucesso', 'Modelo criado!');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar modelo de treino:', error);
      Alert.alert('Erro', `Não foi possível salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ========== Renders auxiliares ========== */
  const renderSeriesDetails = (series) => {
    const type = seriesTypes[series.type];
    if (!type) return null;

    // Usar linha com ícone + texto separado (evita texto solto)
    const Row = ({ children }) => (
      <View style={styles.seriesDetailRow}>
        <Ionicons name={type.icon} size={14} color={Colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={styles.seriesDetailText}>{children}</Text>
      </View>
    );

    switch (series.type) {
      case 'reps_and_load':
        return <Row>{`${series.reps} rep. com ${series.peso} kg | Descanso: ${series.descanso}s`}</Row>;
      case 'reps_load_time':
        return <Row>{`${series.reps} rep. com ${series.peso} kg em ${series.tempo}s | Descanso: ${series.descanso}s`}</Row>;
      case 'reps_and_time':
        return <Row>{`${series.reps} rep. em ${series.tempo}s | Descanso: ${series.descanso}s`}</Row>;
      case 'time_and_incline':
        return <Row>{`Tempo: ${series.tempo}s, Inclinação: ${series.inclinacao}% | Descanso: ${series.descanso}s`}</Row>;
      case 'running':
        return <Row>{`${series.distancia}m em ${series.tempo} | Ritmo: ${series.ritmo} | Descanso: ${series.descanso}s`}</Row>;
      case 'notes':
        return <Row>{`Notas: ${series.notas}`}</Row>;
      case 'cadence':
        return <Row>{`Cadência: ${series.cadencia} rpm | Descanso: ${series.descanso}s`}</Row>;
      case 'split_series':
        return <Row>{`${series.reps} rep. com ${series.peso} kg | Descanso: ${series.descanso}s`}</Row>;
      default:
        return null;
    }
  };

  const renderSelectedExercise = (item) => {
    const setsArr = toArray(item.sets);
    return (
      <View key={item.templateExerciseId} style={styles.selectedExerciseCard}>
        <View style={styles.selectedExerciseInfo}>
          <Text style={styles.selectedExerciseName}>{item.exerciseName}</Text>
          {setsArr.map((series, index) => (
            <View key={series.setId || index} style={styles.seriesContainer}>
              <Text style={styles.seriesCountText}>
                Série {index + 1}: {seriesTypes[series.type]?.label || '—'}
              </Text>
              {renderSeriesDetails(series)}
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => removeExerciseFromTemplate(item.templateExerciseId)}
          android_ripple={{ color: 'rgba(229,57,53,0.12)', borderless: true }}
          style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.9 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Remover exercício"
        >
          <Ionicons name="close-circle" size={24} color={Colors.danger} />
        </Pressable>
      </View>
    );
  };

  if (loading && !adminInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>A carregar...</Text>
      </View>
    );
  }

  /* =================== UI =================== */
  return (
    <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

    <AppHeader
      title={templateId ? 'Editar Modelo' : 'Criar Modelo'}
      subtitle=""
      showBackButton
      onBackPress={() => navigation.goBack()}
      showMenu={false}
      showBell={false}
      statusBarStyle="light-content"
    />


      {/* Conteúdo */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>
          {templateId ? 'Editar Modelo de Treino' : 'Criar Novo Modelo de Treino'}
        </Text>

        <Text style={styles.inputLabel}>Nome do Modelo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: Força Total - Iniciante"
          placeholderTextColor={Colors.textSecondary}
          value={templateName}
          onChangeText={setTemplateName}
        />

        <Text style={styles.inputLabel}>Descrição (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex.: Treino focado em ganho de massa muscular para iniciantes."
          placeholderTextColor={Colors.textSecondary}
          value={templateDescription}
          onChangeText={setTemplateDescription}
          multiline
        />

        <Text style={styles.inputLabel}>Categoria</Text>
        <Pressable
          style={({ pressed }) => [styles.categorySelectButton, pressed && { opacity: 0.98 }]}
          android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
          onPress={() => setIsCategoryModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Selecionar categoria"
        >
          <Text style={styles.categorySelectButtonText}>
            {templateCategory || 'Selecionar Categoria'}
          </Text>
          <Ionicons name="chevron-down-outline" size={20} color={Colors.primary} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Ionicons name="barbell-outline" size={20} color={Colors.primary} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Exercícios no Modelo</Text>
        </View>

        {selectedExercises.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={50} color={Colors.textSecondary} />
            <Text style={styles.noExercisesText}>Nenhum exercício adicionado ainda.</Text>
          </View>
        ) : (
          selectedExercises.map(renderSelectedExercise)
        )}

        <Pressable
          style={({ pressed }) => [styles.addExerciseButton, pressed && { transform: [{ scale: 0.997 }] }]}
          android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
          onPress={openExerciseSelectionModal}
          accessibilityRole="button"
          accessibilityLabel="Adicionar exercício"
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
          <Text style={styles.addExerciseButtonText}>Adicionar Exercício</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.saveTemplateButton, pressed && { opacity: 0.98 }]}
          onPress={handleSaveTemplate}
          disabled={loading}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          accessibilityRole="button"
          accessibilityLabel={templateId ? 'Atualizar modelo' : 'Salvar modelo'}
        >
          {loading ? (
            <ActivityIndicator color={Colors.cardBackground} />
          ) : (
            <Text style={styles.saveTemplateButtonText}>
              {templateId ? 'Atualizar Modelo de Treino' : 'Salvar Modelo de Treino'}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Modal: Biblioteca de Exercícios */}
      <Modal
        animationType="fade"
        transparent
        visible={isExerciseSelectionModalVisible}
        onRequestClose={closeExerciseSelectionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 12 }]}>
            <View style={[styles.modalHeader, { marginBottom: 12 }]}>
              <Text style={styles.modalTitle}>Biblioteca de Exercícios</Text>
              <Pressable onPress={closeExerciseSelectionModal} android_ripple={{ color: 'rgba(229,57,53,0.12)', borderless: true }}>
                <Ionicons name="close-circle" size={28} color={Colors.danger} />
              </Pressable>
            </View>

            {/* Pesquisa */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar exercício..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
            </View>

            {/* Filtros (FlatList) */}
            <View style={styles.chipsContainer}>
              <FlatList
                horizontal
                data={categoriasFiltroExercicios}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <CategoryChip
                    label={item}
                    selected={selectedExerciseCategoryFilter === item}
                    onPress={() => setSelectedExerciseCategoryFilter(item)}
                  />
                )}
                contentContainerStyle={styles.chipsRow}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            {/* GRID responsivo */}
            {filteredExercises.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="file-tray-outline" size={40} color={Colors.textSecondary} />
                <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>Nada encontrado.</Text>
              </View>
            ) : (
              <FlatList
                key={listLayoutKey}
                numColumns={gridColumns}
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <LibraryCard item={item} onPress={() => selectExerciseFromLibrary(item)} />
                )}
                columnWrapperStyle={gridColumns > 1 ? styles.libGridRow : null}
                contentContainerStyle={{ paddingTop: 6, paddingBottom: 6 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: Detalhes do Exercício */}
      <Modal
        animationType="fade"
        transparent
        visible={exerciseDetailsModalVisible}
        onRequestClose={() => {
          setExerciseDetailsModalVisible(false);
          setCurrentExerciseSets([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Exercício</Text>
              <Pressable
                onPress={() => {
                  setExerciseDetailsModalVisible(false);
                  setCurrentExerciseSets([]);
                }}
                android_ripple={{ color: 'rgba(229,57,53,0.12)', borderless: true }}
              >
                <Ionicons name="close-circle" size={28} color={Colors.danger} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={styles.exerciseNameInModal}>{currentExerciseToAdd?.nome_pt ?? 'Exercício'}</Text>

              <Text style={styles.inputLabel}>Séries adicionadas</Text>
              {currentExerciseSets.length === 0 ? (
                <Text style={styles.noExercisesModalText}>Nenhuma série ainda.</Text>
              ) : (
                currentExerciseSets.map((series, index) => (
                  <View key={series.setId} style={styles.selectedSeriesCard}>
                    <Text style={styles.selectedSeriesText}>
                      Série {index + 1}: {seriesTypes[series.type]?.label || '—'}
                    </Text>
                    {renderSeriesDetails(series)}
                  </View>
                ))
              )}

              <Pressable
                onPress={openAddSeriesModal}
                style={({ pressed }) => [styles.modalActionButton, { backgroundColor: Colors.info }, pressed && { opacity: 0.98 }]}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                accessibilityRole="button"
                accessibilityLabel="Adicionar nova série"
              >
                <Text style={[styles.modalActionButtonText, { color: '#fff' }]}>Adicionar Nova Série</Text>
              </Pressable>
            </ScrollView>

            <Pressable
              onPress={addExerciseDetailsToTemplate}
              style={({ pressed }) => [styles.modalActionButton, pressed && { opacity: 0.98 }]}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
              accessibilityRole="button"
              accessibilityLabel="Concluir e adicionar exercício"
            >
              <Text style={styles.modalActionButtonText}>Concluir e Adicionar Exercício</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Adicionar Série */}
      <Modal animationType="fade" transparent visible={isAddSeriesModalVisible} onRequestClose={() => setIsAddSeriesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Série</Text>
              <Pressable onPress={() => setIsAddSeriesModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={Colors.danger} />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={styles.inputLabel}>Tipo de Série</Text>
              <Pressable
                style={({ pressed }) => [styles.seriesTypeDropdownButton, pressed && { opacity: 0.98 }]}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                onPress={() => setIsSeriesTypeDropdownVisible((v) => !v)}
              >
                <Text style={styles.seriesTypeDropdownButtonText}>
                  {seriesTypes[selectedSeriesType]?.label || 'Selecionar Tipo de Série'}
                </Text>
                <Ionicons
                  name={isSeriesTypeDropdownVisible ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={20}
                  color={Colors.primary}
                />
              </Pressable>

              {isSeriesTypeDropdownVisible && (
                <View style={styles.seriesTypeOptionsContainer}>
                  {Object.keys(seriesTypes).map((typeKey) => {
                    const type = seriesTypes[typeKey];
                    return (
                      <Pressable
                        key={typeKey}
                        style={({ pressed }) => [styles.seriesTypeOptionButton, pressed && { opacity: 0.98 }]}
                        android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
                        onPress={() => {
                          setSelectedSeriesType(typeKey);
                          setCurrentSeriesFields({});
                          setIsSeriesTypeDropdownVisible(false);
                        }}
                      >
                        <Ionicons name={type.icon} size={20} color={Colors.primary} />
                        <Text style={styles.seriesTypeOptionButtonText}>{type.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text style={styles.inputLabel}>Detalhes da Série</Text>
              {(seriesTypes[selectedSeriesType]?.fields || []).map((field) => (
                <TextInput
                  key={field.key}
                  style={field.multiline ? [styles.input, styles.textArea] : styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType={field.keyboardType || 'default'}
                  value={String(currentSeriesFields[field.key] ?? '')}
                  onChangeText={(text) => setCurrentSeriesFields((prev) => ({ ...prev, [field.key]: text }))}
                  multiline={field.multiline}
                />
              ))}
            </ScrollView>

            <Pressable
              onPress={adicionarNovaSerie}
              style={({ pressed }) => [styles.modalActionButton, pressed && { opacity: 0.98 }]}
              android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
            >
              <Text style={styles.modalActionButtonText}>Adicionar Série</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal: Seleção de Categoria */}
      <Modal animationType="slide" transparent visible={isCategoryModalVisible} onRequestClose={() => setIsCategoryModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Categoria</Text>
              <Pressable onPress={() => setIsCategoryModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={Colors.danger} />
              </Pressable>
            </View>

            <ScrollView>
              {categorias.map((cat) => (
                <Pressable
                  key={cat}
                  style={({ pressed }) => [styles.categoryListItem, pressed && { backgroundColor: 'rgba(0,0,0,0.02)' }]}
                  android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
                  onPress={() => {
                    setTemplateCategory(cat);
                    setIsCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.categoryListItemText}>{cat}</Text>
                  {templateCategory === cat && <Ionicons name="checkmark-circle" size={22} color={Colors.success} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =================== Styles =================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 10, fontSize: 16, color: Colors.textPrimary },

  /* Header */
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.onPrimary, fontSize: 18, fontWeight: '900' },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.cardBackground,
  },
  avatarText: { color: Colors.onSecondary, fontSize: 18, fontWeight: '900' },

  /* Conteúdo */
  scrollContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },

  /* Inputs / Selects */
  inputLabel: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, marginBottom: 6, marginTop: 8, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: RADIUS,
    paddingVertical: 12, paddingHorizontal: 14, fontSize: 16, color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },

  categorySelectButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: RADIUS, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12,
  },
  categorySelectButtonText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },

  /* Secções */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionIcon: { marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary },

  /* Empty state */
  emptyCard: {
    backgroundColor: Colors.cardBackground, borderRadius: RADIUS, padding: 24,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    borderWidth: 1, borderColor: Colors.divider,
  },
  noExercisesText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },

  /* Exercício selecionado */
  selectedExerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: RADIUS, padding: 14, marginBottom: GAP,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    borderWidth: 1, borderColor: Colors.divider,
    borderLeftWidth: 5, borderLeftColor: Colors.secondary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  selectedExerciseInfo: { flex: 1, marginRight: 10 },
  selectedExerciseName: { fontSize: 16, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },

  seriesContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  seriesCountText: { fontSize: 14, fontWeight: '800', color: Colors.primary, letterSpacing: 0.2 },

  // Linha com ícone + texto (evita ícone dentro de <Text>)
  seriesDetailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  seriesDetailText: { fontSize: 14, color: Colors.textSecondary, flexShrink: 1 },

  /* Botões de ação */
  addExerciseButton: {
    backgroundColor: Colors.secondary, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: RADIUS, marginTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: Colors.divider,
  },
  addExerciseButtonText: { color: Colors.onSecondary, fontSize: 16, fontWeight: '900' },
  saveTemplateButton: {
    backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: RADIUS,
    alignItems: 'center', marginTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  saveTemplateButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  /* Modal base */
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    backgroundColor: Colors.cardBackground, borderRadius: RADIUS, padding: 16, width: '92%', maxHeight: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 10,
    borderWidth: 1, borderColor: Colors.divider,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },

  /* Pesquisa */
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 16,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },

  /* Filtros */
  chipsContainer: { marginBottom: 16 },
  chipsRow: { paddingHorizontal: 2, paddingVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  chipSelected: { backgroundColor: Colors.info, borderColor: Colors.info },
  chipText: { marginLeft: 6, color: Colors.textSecondary, fontWeight: '700', letterSpacing: 0.2 },
  chipTextSelected: { color: Colors.onPrimary, fontWeight: '900' },

  /* Biblioteca GRID */
  libGridRow: { justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 12 },
  libCard: {
    flex: 1,
    minHeight: 130,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  libIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
    marginBottom: 8,
  },
  libName: { fontWeight: '900', color: Colors.textPrimary, fontSize: 14, lineHeight: 18 },
  muscleChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
    marginTop: 8,
  },
  muscleChipTxt: { color: Colors.textSecondary, fontWeight: '700', fontSize: 12 },
  libNotes: { color: Colors.textSecondary, fontSize: 12, marginTop: 8 },
  libPlusBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: 'rgba(17,24,39,0.12)',
  },

  /* Botões e listas dos outros modais */
  modalActionButton: {
    backgroundColor: Colors.secondary, paddingVertical: 14, borderRadius: RADIUS, alignItems: 'center', marginTop: 14,
    borderWidth: 1, borderColor: Colors.divider,
  },
  modalActionButtonText: { color: Colors.onSecondary, fontSize: 16, fontWeight: '900' },

  seriesTypeDropdownButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: RADIUS, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  seriesTypeDropdownButtonText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },
  seriesTypeOptionsContainer: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: RADIUS, marginBottom: 12, paddingVertical: 4,
  },
  seriesTypeOptionButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(17,24,39,0.06)',
  },
  seriesTypeOptionButtonText: { marginLeft: 10, fontSize: 16, color: Colors.textPrimary, fontWeight: '700' },

  categoryListItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(17,24,39,0.06)',
  },
  categoryListItemText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '800' },

  noExercisesModalText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingVertical: 18 },
});
