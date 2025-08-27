// screens/Admin/EditarTreinoScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Image,
  Switch,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

/** ----------------------------------------------------------------
 *  CONFIG
 * ---------------------------------------------------------------- */
const categorias = ['Cardio', 'Força', 'Mobilidade', 'Flexibilidade', 'Core', 'Outro'];

const seriesTypes = {
  reps_and_load: { label: 'Repetições e Carga', fields: ['reps', 'peso', 'descanso'] },
  reps_load_time: { label: 'Reps, Carga e Tempo', fields: ['reps', 'peso', 'tempo', 'descanso'] },
  reps_and_time: { label: 'Repetições e Tempo', fields: ['reps', 'tempo', 'descanso'] },
  time_and_incline: { label: 'Tempo e Inclinação', fields: ['tempo', 'inclinacao', 'descanso'] },
  running: { label: 'Corrida', fields: ['distancia', 'tempo', 'ritmo', 'descanso'] },
  notes: { label: 'Observações', fields: ['notas'] },
  cadence: { label: 'Cadência', fields: ['cadencia', 'descanso'] },
  split_series: { label: 'Série Split', fields: ['reps', 'peso', 'descanso'] },
};

const seriesFieldLabels = {
  reps: 'Repetições',
  peso: 'Carga (kg)',
  tempo: 'Tempo (seg)',
  inclinacao: 'Inclinação',
  distancia: 'Distância (km)',
  ritmo: 'Ritmo (min/km)',
  descanso: 'Descanso (seg)',
  notas: 'Notas',
  cadencia: 'Cadência',
};

const seriesTypeLabels = Object.entries(seriesTypes).map(([type, v]) => ({ type, label: v.label }));

const GlobalStyles = {
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};

/** ----------------------------------------------------------------
 *  HELPERS
 * ---------------------------------------------------------------- */
const gerarID = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const toNum = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const isPositive = (v) => {
  const n = toNum(v);
  return n !== null && n > 0;
};

/** Deduz tipo de série pelos campos presentes */
const inferSetType = (o = {}) => {
  const has = (k) => String(o[k] ?? '').trim() !== '';
  if (has('reps') && has('peso') && has('tempo')) return 'reps_load_time';
  if (has('reps') && has('peso')) return 'reps_and_load';
  if (has('reps') && has('tempo')) return 'reps_and_time';
  if (has('tempo') && has('inclinacao')) return 'time_and_incline';
  if (has('distancia') && has('tempo')) return 'running';
  if (has('cadencia')) return 'cadence';
  if (has('notas')) return 'notes';
  if (has('reps')) return 'reps_and_load';
  if (has('tempo')) return 'reps_and_time';
  return 'reps_and_load';
};

/** Normaliza um array/obj de sets para o formato único */
const normalizeSets = (setsLike) => {
  if (Array.isArray(setsLike)) {
    return setsLike.map((s) => {
      const t = s?.type || inferSetType(s);
      const schema = seriesTypes[t]?.fields || [];
      const out = { id: s?.id || gerarID(), type: t };
      schema.forEach((f) => (out[f] = String(s?.[f] ?? '').trim()));
      return out;
    });
  }
  if (setsLike && typeof setsLike === 'object') {
    const t = inferSetType(setsLike);
    const schema = seriesTypes[t]?.fields || [];
    const out = { id: gerarID(), type: t };
    schema.forEach((f) => (out[f] = String(setsLike?.[f] ?? '').trim()));
    return [out];
  }
  return [
    { id: gerarID(), type: 'reps_and_load', reps: '', peso: '', descanso: '' },
  ];
};

/** Normaliza qualquer exercício para o formato canónico */
const normalizeExercise = (raw) => {
  const name = raw?.exerciseName || raw?.nome || raw?.name || 'Exercício';

  // 1) Já tem sets array
  if (Array.isArray(raw?.sets)) {
    return {
      id: raw?.exerciseId ?? raw?.id ?? (raw?.isCustom ? null : raw?.id ?? null),
      customExerciseId: raw?.customExerciseId ?? (raw?.exerciseId ? null : gerarID()),
      exerciseName: name,
      sets: normalizeSets(raw.sets),
      notes: String(raw?.notes ?? raw?.notas ?? '').trim(),
      imageUrl: raw?.imageUrl || '',
      animationUrl: raw?.animationUrl || '',
      description: raw?.description || '',
      category: raw?.category || '',
      targetMuscles: Array.isArray(raw?.targetMuscles) ? raw.targetMuscles : [],
      equipment: Array.isArray(raw?.equipment) ? raw.equipment : [],
      isExpanded: false,
    };
  }

  // 2) Formato com series: []
  if (Array.isArray(raw?.series)) {
    return {
      id: null,
      customExerciseId: gerarID(),
      exerciseName: name,
      sets: normalizeSets(raw.series),
      notes: String(raw?.notes ?? raw?.notas ?? '').trim(),
      imageUrl: '',
      animationUrl: '',
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      isExpanded: true,
    };
  }

  // 3) Formato muito antigo: { nome, series: "3", tipo: "reps|tempo", valor: "12|60" }
  if ((raw?.nome || raw?.exerciseName || raw?.name) && (raw?.series || raw?.valor || raw?.tipo)) {
    const seriesCount = Math.max(1, parseInt(toNum(raw.series) ?? 1, 10) || 1);
    const isTempo = (raw.tipo || '').toString().toLowerCase() === 'tempo';
    const valor = String(raw?.valor ?? '').trim();

    const sets = Array.from({ length: seriesCount }).map(() =>
      isTempo
        ? { id: gerarID(), type: 'reps_and_time', reps: '', tempo: valor || '', descanso: '' }
        : { id: gerarID(), type: 'reps_and_load', reps: valor || '', peso: '', descanso: '' }
    );

    return {
      id: null,
      customExerciseId: gerarID(),
      exerciseName: name,
      sets,
      notes: String(raw?.notes ?? raw?.notas ?? '').trim(),
      imageUrl: '',
      animationUrl: '',
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      isExpanded: true,
    };
  }

  // 4) Campos soltos => cria 1 set
  const hasAny =
    ['reps', 'peso', 'tempo', 'inclinacao', 'distancia', 'ritmo', 'descanso', 'notas', 'cadencia']
      .some((k) => String(raw?.[k] ?? '').trim() !== '');

  if (hasAny) {
    return {
      id: raw?.exerciseId ?? raw?.id ?? null,
      customExerciseId: raw?.exerciseId ? null : gerarID(),
      exerciseName: name,
      sets: normalizeSets(raw),
      notes: String(raw?.notes ?? raw?.notas ?? '').trim(),
      imageUrl: raw?.imageUrl || '',
      animationUrl: raw?.animationUrl || '',
      description: raw?.description || '',
      category: raw?.category || '',
      targetMuscles: Array.isArray(raw?.targetMuscles) ? raw.targetMuscles : [],
      equipment: Array.isArray(raw?.equipment) ? raw.equipment : [],
      isExpanded: true,
    };
  }

  // fallback vazio
  return {
    id: raw?.exerciseId ?? raw?.id ?? null,
    customExerciseId: raw?.exerciseId ? null : gerarID(),
    exerciseName: name,
    sets: normalizeSets([]),
    notes: '',
    imageUrl: '',
    animationUrl: '',
    description: '',
    category: '',
    targetMuscles: [],
    equipment: [],
    isExpanded: true,
  };
};

/** Extrai/normaliza exercícios de qualquer estrutura de treino */
const normalizeExercisesFromTreino = (t = {}) => {
  const out = [];
  const knownArrays = ['templateExercises', 'customExercises', 'exercicios', 'exercises', 'itens', 'items'];

  const pushArray = (arr) => {
    arr.forEach((raw) => out.push(normalizeExercise(raw)));
  };

  knownArrays.forEach((k) => {
    if (Array.isArray(t[k])) pushArray(t[k]);
  });

  // Procura arrays “prováveis” sem nome padrão
  Object.keys(t || {}).forEach((k) => {
    const v = t[k];
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && !knownArrays.includes(k)) {
      const looksLikeExercise = v.some(
        (o) =>
          o?.sets ||
          o?.series ||
          o?.nome ||
          o?.exerciseName ||
          o?.name ||
          o?.reps ||
          o?.peso ||
          o?.tempo
      );
      if (looksLikeExercise) pushArray(v);
    }
  });

  console.log('[DEBUG] Treino bruto recebido =>', t || {});
  console.log('[DEBUG] Exercícios normalizados =>', out);

  return out;
};

/** Input reutilizável */
const InlineWorkoutDetailsInput = React.memo(
  ({ placeholder, value, onChangeText, multiline = false, keyboardType = 'default', style, icon, editable = true, label }) => (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabelText}>{label}</Text>}
      <View style={[styles.inputFieldWrapper, !editable && styles.inputDisabledContainer]}>
        {icon && <Feather name={icon} size={20} color={!editable ? Colors.mediumGray : Colors.darkGray} style={styles.inputIconLeft} />}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, style, !editable && styles.inputDisabledText]}
          placeholder={placeholder}
          placeholderTextColor={!editable ? Colors.mediumGray : Colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
        />
      </View>
    </View>
  )
);

/** ----------------------------------------------------------------
 *  COMPONENTE
 * ---------------------------------------------------------------- */
export default function EditarTreinoScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const {
    clienteId,
    treino: treinoParam,
    treinoId: treinoIdParam,
    reloadTreinos,
  } = route.params || {};

  const [treinoDoc, setTreinoDoc] = useState(treinoParam || null);
  const [isLoading, setIsLoading] = useState(false);

  const [nome, setNome] = useState(treinoParam?.name || treinoParam?.nome || '');
  const [categoria, setCategoria] = useState(treinoParam?.category || treinoParam?.categoria || '');
  const [descricao, setDescricao] = useState(treinoParam?.description || treinoParam?.descricao || '');
  const [data, setData] = useState(
    treinoParam?.data ? (treinoParam.data.toDate ? treinoParam.data.toDate() : new Date(treinoParam.data)) : new Date()
  );
  const [horaSelecionada, setHoraSelecionada] = useState(
    treinoParam?.data ? (treinoParam.data.toDate ? treinoParam.data.toDate() : new Date(treinoParam.data)) : new Date()
  );

  const [exercicios, setExercicios] = useState([]);

  const [isLibraryModalVisible, setIsLibraryModalVisible] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLibrary, setFilteredLibrary] = useState([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSeriesTypeModalVisible, setIsSeriesTypeModalVisible] = useState(false);
  const [currentExerciseIndexForSet, setCurrentExerciseIndexForSet] = useState(null);

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  /** Carregar do Firestore se houver treinoId; senão usar params */
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        if (clienteId && treinoIdParam) {
          setIsLoading(true);
          const ref = doc(db, 'users', clienteId, 'treinos', treinoIdParam);
          const snap = await getDoc(ref);
          setIsLoading(false);

          if (!mounted) return;

          if (snap.exists()) {
            const t = { id: snap.id, ...snap.data() };
            console.log('[DEBUG] Treino carregado do Firestore =>', t);
            setTreinoDoc(t);

            setNome(t?.name || t?.nome || '');
            setCategoria(t?.category || t?.categoria || '');
            setDescricao(t?.description || t?.descricao || '');
            const dt = t?.data ? (t.data.toDate ? t.data.toDate() : new Date(t.data)) : new Date();
            setData(dt);
            setHoraSelecionada(dt);

            const normalized = normalizeExercisesFromTreino(t);
            setExercicios(normalized);
            return;
          } else {
            Alert.alert('Erro', 'Treino não encontrado.');
            navigation.goBack();
            return;
          }
        }

        // Sem treinoId, mas veio treino nos params?
        if (treinoParam && Object.keys(treinoParam).length) {
          console.log('[DEBUG] Treino recebido por params =>', treinoParam);
          setTreinoDoc(treinoParam);

          const normalized = normalizeExercisesFromTreino(treinoParam);
          setExercicios(normalized);

          setNome((v) => v || treinoParam.name || treinoParam.nome || '');
          setCategoria((v) => v || treinoParam.category || treinoParam.categoria || '');
          setDescricao((v) => v || treinoParam.description || treinoParam.descricao || '');
          const dt = treinoParam?.data ? (treinoParam.data.toDate ? treinoParam.data.toDate() : new Date(treinoParam.data)) : null;
          if (dt) {
            setData(dt);
            setHoraSelecionada(dt);
          }
          return;
        }

        console.log('[DEBUG] Sem treinoId e sem treino nos params.');
        Alert.alert('Dados em falta', 'Não foi possível identificar o treino para edição.');
        navigation.goBack();
      } catch (e) {
        console.log('[DEBUG] Erro a carregar treino:', e);
        Alert.alert('Erro', 'Falha ao carregar treino.');
        navigation.goBack();
      }
    };

    boot();
    return () => { mounted = false; };
  }, [clienteId, treinoIdParam, treinoParam, navigation]);

  /** Filtro da biblioteca */
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return setFilteredLibrary(exerciseLibrary);
    setFilteredLibrary(
      exerciseLibrary.filter(
        (ex) =>
          (ex.name && ex.name.toLowerCase().includes(q)) ||
          (ex.category && ex.category.toLowerCase().includes(q)) ||
          (Array.isArray(ex.targetMuscles) &&
            ex.targetMuscles.some((m) => (m || '').toLowerCase().includes(q))) ||
          (Array.isArray(ex.equipment) &&
            ex.equipment.some((e) => (e || '').toLowerCase().includes(q)))
      )
    );
  }, [searchQuery, exerciseLibrary]);

  const fetchExerciseLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const snap = await getDocs(collection(db, 'exercises'));
      const exercises = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.nome_pt || data.nome || data.name || 'Exercício',
          description: data.descricao_breve || data.description || '',
          category: data.category || '',
          targetMuscles: Array.isArray(data.musculos_alvo)
            ? data.musculos_alvo.map((m) => m?.name || m?.id).filter(Boolean)
            : [],
          equipment: Array.isArray(data.equipment) ? data.equipment : [],
          animationUrl: data.animationUrl || '',
          imageUrl: data.imageUrl || '',
          sets: [],
          notes: '',
        };
      });
      setExerciseLibrary(exercises);
      setFilteredLibrary(exercises);
    } catch (e) {
      console.error('Erro ao carregar biblioteca:', e);
      Alert.alert('Erro', 'Não foi possível carregar a biblioteca de exercícios.');
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  /** Date/Time */
  const onChangeDate = useCallback((_e, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setData(selectedDate);
      setHoraSelecionada(selectedDate);
    }
  }, []);

  const onChangeTime = useCallback((_e, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setHoraSelecionada(selectedTime);
      setData((prev) => {
        const d = new Date(prev);
        d.setHours(selectedTime.getHours());
        d.setMinutes(selectedTime.getMinutes());
        return d;
      });
    }
  }, []);

  /** Exercícios CRUD */
  const adicionarExercicioManual = useCallback(() => {
    setExercicios((prev) => [
      ...prev,
      {
        id: null,
        customExerciseId: gerarID(),
        exerciseName: '',
        sets: [{ id: gerarID(), type: 'reps_and_load', reps: '', peso: '', descanso: '' }],
        notes: '',
        imageUrl: '',
        animationUrl: '',
        description: '',
        category: '',
        targetMuscles: [],
        equipment: [],
        isExpanded: true,
      },
    ]);
  }, []);

  const adicionarExercicioDaBiblioteca = useCallback((sel) => {
    setExercicios((prev) => [
      ...prev,
      {
        id: sel.id,
        exerciseName: sel.name,
        imageUrl: sel.imageUrl || '',
        animationUrl: sel.animationUrl || '',
        description: sel.description || '',
        category: sel.category || '',
        targetMuscles: sel.targetMuscles || [],
        equipment: sel.equipment || [],
        sets: [{ id: gerarID(), type: 'reps_and_load', reps: '', peso: '', descanso: '' }],
        notes: '',
        isExpanded: true,
      },
    ]);
    setIsLibraryModalVisible(false);
    setSearchQuery('');
  }, []);

  const atualizarExercicio = useCallback((index, campo, valor) => {
    setExercicios((prev) => {
      const arr = [...prev];
      arr[index] = { ...arr[index], [campo]: valor };
      return arr;
    });
  }, []);

  const atualizarSet = useCallback((exIndex, setIndex, campo, valor) => {
    setExercicios((prev) => {
      const arr = [...prev];
      const ex = { ...arr[exIndex] };
      const sets = Array.isArray(ex.sets) ? [...ex.sets] : [];
      sets[setIndex] = { ...sets[setIndex], [campo]: valor };
      ex.sets = sets;
      arr[exIndex] = ex;
      return arr;
    });
  }, []);

  const adicionarSet = useCallback((exIndex, setType = 'reps_and_load') => {
    const schema = seriesTypes[setType]?.fields || [];
    setExercicios((prev) => {
      const arr = [...prev];
      const ex = { ...arr[exIndex] };
      const novo = {
        id: gerarID(),
        type: setType,
        ...schema.reduce((acc, f) => ({ ...acc, [f]: '' }), {}),
      };
      ex.sets = [...(Array.isArray(ex.sets) ? ex.sets : []), novo];
      arr[exIndex] = ex;
      return arr;
    });
  }, []);

  const removerSet = useCallback((exIndex, setIndex) => {
    setExercicios((prev) => {
      const arr = [...prev];
      const ex = { ...arr[exIndex] };
      ex.sets = (ex.sets || []).filter((_, i) => i !== setIndex);
      arr[exIndex] = ex;
      return arr;
    });
  }, []);

  const toggleExpandExercicio = useCallback((index) => {
    setExercicios((prev) => {
      const arr = [...prev];
      arr[index].isExpanded = !arr[index].isExpanded;
      return arr;
    });
  }, []);

  const removerExercicio = useCallback((index) => {
    Alert.alert('Remover Exercício', 'Tem certeza que deseja remover este exercício?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          setExercicios((prev) => {
            const arr = [...prev];
            arr.splice(index, 1);
            return arr;
          }),
      },
    ]);
  }, []);

  /** Guardar */
  const salvarTreino = async () => {
    if (!String(nome).trim()) return Alert.alert('Erro', 'O nome do treino não pode estar vazio.');
    if (!String(categoria).trim()) return Alert.alert('Erro', 'A categoria do treino não pode estar vazia.');
    if (!Array.isArray(exercicios) || exercicios.length === 0)
      return Alert.alert('Erro', 'Adiciona pelo menos um exercício.');

    for (let i = 0; i < exercicios.length; i++) {
      const ex = exercicios[i] || {};
      if (!String(ex.exerciseName || '').trim())
        return Alert.alert('Erro', `O nome do exercício ${i + 1} está vazio.`);
      if (!Array.isArray(ex.sets) || ex.sets.length === 0)
        return Alert.alert('Erro', `O exercício "${ex.exerciseName}" não tem séries.`);
      for (let s = 0; s < ex.sets.length; s++) {
        const set = ex.sets[s] || {};
        const fields = seriesTypes[set.type]?.fields || [];
        for (const field of fields) {
          if (field === 'notas') continue;
          const v = String(set[field] ?? '').trim();
          if (!v || (!isPositive(v) && ['reps', 'peso', 'tempo', 'descanso', 'inclinacao', 'distancia', 'cadencia'].includes(field))) {
            return Alert.alert('Erro', `Valor inválido para "${seriesFieldLabels[field] || field}" na série ${s + 1} do exercício "${ex.exerciseName}".`);
          }
        }
      }
    }

    try {
      setIsLoading(true);
      const treinoId = treinoDoc?.id || treinoIdParam || treinoParam?.id;
      if (!clienteId || !treinoId) {
        setIsLoading(false);
        return Alert.alert('Erro', 'IDs em falta para atualizar o treino.');
      }
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treinoId);

      const exercisesToSave = exercicios.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        notes: ex.notes || '',
        imageUrl: ex.imageUrl || '',
        animationUrl: ex.animationUrl || '',
        description: ex.description || '',
        category: ex.category || '',
        targetMuscles: ex.targetMuscles || [],
        equipment: ex.equipment || [],
      }));

      const changedTemplateContents =
        (treinoDoc?.templateExercises?.length || 0) !== exercisesToSave.length ||
        exercisesToSave.some((e) => e.exerciseId === null);

      const updateData = {
        name: String(nome).trim(),
        category: String(categoria).trim(),
        description: String(descricao).trim(),
        data: Timestamp.fromDate(data),
        templateExercises: exercisesToSave.filter((e) => e.exerciseId !== null),
        customExercises: exercisesToSave.filter((e) => e.exerciseId === null),
        ...(treinoDoc?.templateId && changedTemplateContents
          ? { templateId: null, templateName: null, templateDescription: null }
          : {}),
      };

      await updateDoc(treinoRef, updateData);

      if (saveAsTemplate) {
        if (!newTemplateName.trim()) {
          setIsLoading(false);
          return Alert.alert('Erro', 'Dá um nome ao novo modelo de treino.');
        }
        await addDoc(collection(db, 'workoutTemplates'), {
          name: newTemplateName.trim(),
          description: newTemplateDescription.trim() || '',
          exercises: exercisesToSave,
          createdAt: Timestamp.now(),
        });
        Alert.alert('Sucesso', 'Novo modelo de treino criado!');
      }

      Alert.alert('Sucesso', '✅ Treino atualizado com sucesso!');
      if (typeof reloadTreinos === 'function') {
        try { reloadTreinos(); } catch {}
      }
      navigation.goBack();
    } catch (e) {
      console.error('Falha ao salvar treino:', e);
      Alert.alert('Erro', 'Falha ao salvar treino.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Time picker cross-platform */
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const renderTimePicker = ({ showPicker, value, onChange, onConfirm }) => {
    if (Platform.OS === 'ios') {
      return showPicker ? (
        <Modal transparent animationType="fade" onRequestClose={onConfirm}>
          <TouchableWithoutFeedback onPress={onConfirm}>
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContent}>
                <DateTimePicker
                  value={value || new Date()}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={onChange}
                  style={styles.dateTimePicker}
                />
                <TouchableOpacity style={styles.pickerConfirmButton} onPress={onConfirm}>
                  <Text style={styles.pickerConfirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      ) : null;
    }
    return showPicker ? (
      <DateTimePicker value={value || new Date()} mode="time" is24Hour display="default" onChange={onChange} />
    ) : null;
  };

  /** UI: séries */
  const renderSeriesInputs = (exercicio, exIndex) => {
    const sets = Array.isArray(exercicio.sets) ? exercicio.sets : [];
    return (
      <View style={styles.seriesContainer}>
        {sets.map((set, setIndex) => {
          const conf = seriesTypes[set.type] || { fields: [] };
          return (
            <View key={set.id || `${exIndex}-${setIndex}`} style={styles.setCard}>
              <View style={styles.setCardHeader}>
                <Text style={styles.setCardTitle}>{(conf.label || 'Série')} {setIndex + 1}</Text>
                <View style={styles.setActions}>
                  <TouchableOpacity onPress={() => removerSet(exIndex, setIndex)}>
                    <Feather name="trash-2" size={22} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.setDetails}>
                {conf.fields.map((field) => (
                  <View key={field} style={styles.setFieldInputContainer}>
                    <Text style={styles.setFieldLabel}>{seriesFieldLabels[field] || field}:</Text>
                    <TextInput
                      style={styles.setFieldInput}
                      value={String(set[field] ?? '')}
                      onChangeText={(t) => atualizarSet(exIndex, setIndex, field, t)}
                      keyboardType={
                        ['reps', 'peso', 'tempo', 'descanso', 'inclinacao', 'distancia', 'cadencia'].includes(field)
                          ? 'numeric'
                          : 'default'
                      }
                    />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <TouchableOpacity
          style={styles.adicionarSetButton}
          onPress={() => {
            setCurrentExerciseIndexForSet(exIndex);
            setIsSeriesTypeModalVisible(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.secondary} />
          <Text style={styles.adicionarSetButtonText}>Adicionar Série</Text>
        </TouchableOpacity>
      </View>
    );
  };

  /** RENDER */
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.headerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{nome || 'Editar Treino'}</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollViewContent} keyboardShouldPersistTaps="handled">
        {isLoading && (
          <View style={styles.overlayLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.overlayLoadingText}>A salvar treino...</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Detalhes do Treino</Text>

        <InlineWorkoutDetailsInput
          placeholder="Nome do Treino (ex.: Treino de Pernas e Glúteos)"
          value={nome}
          onChangeText={setNome}
          icon="tag"
        />
        <InlineWorkoutDetailsInput
          placeholder="Descrição (opcional, ex.: Foco em força e hipertrofia)"
          value={descricao}
          onChangeText={setDescricao}
          multiline
          icon="align-left"
        />

        <Text style={styles.inputLabel}>Categoria:</Text>
        <TouchableOpacity style={[styles.categorySplitButton, GlobalStyles.shadow]} onPress={() => setIsCategoryModalVisible(true)}>
          <Text style={styles.categorySplitButtonText}>{categoria || 'Selecionar Categoria'}</Text>
          <Feather name="chevron-down" size={20} color={Colors.darkGray} />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Data do Treino:</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.timeInput}>
          <Text style={{ color: Colors.textPrimary, fontSize: 16 }}>{data.toLocaleDateString()}</Text>
          <Feather name="calendar" size={20} color={Colors.darkGray} style={styles.inputIconRight} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={data} mode="date" display="default" onChange={onChangeDate} minimumDate={new Date()} />
        )}

        <Text style={styles.inputLabel}>Hora do Treino:</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeInput}>
          <Text style={{ color: Colors.textPrimary, fontSize: 16 }}>
            {horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Feather name="clock" size={20} color={Colors.darkGray} style={styles.inputIconRight} />
        </TouchableOpacity>
        {renderTimePicker({ showPicker: showTimePicker, value: horaSelecionada, onChange: onChangeTime, onConfirm: () => setShowTimePicker(false) })}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Exercícios</Text>

        {exercicios.length === 0 ? (
          <View style={[styles.exercicioCard, { alignItems: 'center' }]}>
            <Text style={{ color: Colors.textSecondary, marginBottom: 10 }}>
              Não foram encontrados exercícios neste treino (a normalização já tentou todos os formatos).
            </Text>
            <Text style={{ color: Colors.textSecondary }}>
              Vê os logs do Metro: <Text style={{ fontWeight: 'bold' }}>[DEBUG] Exercícios normalizados</Text>.
            </Text>
          </View>
        ) : null}

        {exercicios.map((exercicio, index) => (
          <View key={exercicio.id || exercicio.customExerciseId || index} style={[styles.exercicioCard, GlobalStyles.cardShadow]}>
            <TouchableOpacity onPress={() => toggleExpandExercicio(index)} style={styles.exercicioHeader}>
              <Text style={styles.exercicioCardTitle}>{exercicio.exerciseName || 'Exercício Sem Nome'}</Text>
              <Feather name={exercicio.isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.darkGray} />
            </TouchableOpacity>

            {exercicio.isExpanded && (
              <>
                <InlineWorkoutDetailsInput
                  label="Nome"
                  placeholder="Nome do exercício"
                  value={exercicio.exerciseName}
                  onChangeText={(t) => atualizarExercicio(index, 'exerciseName', t)}
                  icon="tag"
                  editable={exercicio.id === null}
                />

                {exercicio.id !== null && (
                  <>
                    {!!exercicio.imageUrl && (
                      <Image source={{ uri: exercicio.imageUrl }} style={styles.exercicioImage} resizeMode="contain" />
                    )}
                    {!!exercicio.description && (
                      <Text style={styles.exercicioDetailText}>
                        <Text style={{ fontWeight: 'bold' }}>Descrição:</Text> {exercicio.description}
                      </Text>
                    )}
                    {!!exercicio.category && (
                      <Text style={styles.exercicioDetailText}>
                        <Text style={{ fontWeight: 'bold' }}>Categoria:</Text> {exercicio.category}
                      </Text>
                    )}
                    {Array.isArray(exercicio.targetMuscles) && exercicio.targetMuscles.length > 0 && (
                      <Text style={styles.exercicioDetailText}>
                        <Text style={{ fontWeight: 'bold' }}>Músculos:</Text> {exercicio.targetMuscles.join(', ')}
                      </Text>
                    )}
                    {Array.isArray(exercicio.equipment) && exercicio.equipment.length > 0 && (
                      <Text style={styles.exercicioDetailText}>
                        <Text style={{ fontWeight: 'bold' }}>Equipamento:</Text> {exercicio.equipment.join(', ')}
                      </Text>
                    )}
                  </>
                )}

                {renderSeriesInputs(exercicio, index)}
              </>
            )}

            <TouchableOpacity onPress={() => removerExercicio(index)} style={styles.removeButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.onPrimary} />
              <Text style={styles.removeButtonText}>Remover Exercício</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#007BFF' }]} onPress={adicionarExercicioManual}>
          <Feather name="plus-circle" size={24} color={Colors.onPrimary} />
          <Text style={styles.addButtonText}>Adicionar Exercício Manual</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: Colors.secondary, marginTop: 10 }]}
          onPress={() => {
            fetchExerciseLibrary();
            setIsLibraryModalVisible(true);
          }}
        >
          <Feather name="book-open" size={24} color={Colors.onSecondary} />
          <Text style={styles.addButtonText}>Adicionar da Biblioteca</Text>
        </TouchableOpacity>

        {/* Guardar como template */}
        <View style={styles.saveTemplateContainer}>
          <Text style={styles.saveTemplateText}>Guardar como Modelo</Text>
          <Switch
            onValueChange={setSaveAsTemplate}
            value={saveAsTemplate}
            trackColor={{ false: Colors.mediumGray, true: Colors.success }}
            thumbColor={Colors.onPrimary}
          />
        </View>
        {saveAsTemplate && (
          <View style={styles.saveTemplateInputs}>
            <InlineWorkoutDetailsInput
              placeholder="Nome do Novo Modelo"
              value={newTemplateName}
              onChangeText={setNewTemplateName}
              icon="bookmark"
            />
            <InlineWorkoutDetailsInput
              placeholder="Descrição do Modelo (opcional)"
              value={newTemplateDescription}
              onChangeText={setNewTemplateDescription}
              multiline
              icon="align-left"
            />
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={salvarTreino}>
        <Ionicons name="save-outline" size={24} color={Colors.onPrimary} />
        <Text style={styles.saveButtonText}>Guardar Treino</Text>
      </TouchableOpacity>

      {/* Modal Biblioteca */}
      <Modal animationType="slide" transparent={false} visible={isLibraryModalVisible} onRequestClose={() => setIsLibraryModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient colors={[Colors.primary, Colors.primary]} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setIsLibraryModalVisible(false); setSearchQuery(''); }} style={styles.modalBackButton}>
              <Ionicons name="close" size={28} color={Colors.onPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Biblioteca de Exercícios</Text>
          </LinearGradient>
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={20} color={Colors.darkGray} style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Pesquisar exercícios..."
              placeholderTextColor={Colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {loadingLibrary ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredLibrary}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={() => (
                <Text style={styles.resultsCountText}>
                  {filteredLibrary.length} {filteredLibrary.length === 1 ? 'exercício encontrado' : 'exercícios encontrados'}
                </Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.libraryCard, GlobalStyles.shadow]} onPress={() => adicionarExercicioDaBiblioteca(item)}>
                  <View style={styles.libraryCardIcon}>
                    <Ionicons name="barbell-outline" size={28} color={Colors.primary} />
                  </View>
                  <View style={styles.libraryCardContent}>
                    <Text style={styles.libraryItemText}>{item.name}</Text>
                    {Array.isArray(item.targetMuscles) && item.targetMuscles.length > 0 && (
                      <Text style={styles.libraryItemSubText}>
                        <Text style={{ fontWeight: 'bold' }}>Músculos-alvo:</Text> {item.targetMuscles.join(', ')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Modal Categoria */}
      <Modal animationType="slide" transparent visible={isCategoryModalVisible} onRequestClose={() => setIsCategoryModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsCategoryModalVisible(false)}>
          <View style={styles.pickerModalOverlay}>
            <View style={styles.categoryModalContent}>
              <Text style={styles.modalPickerTitle}>Selecione a Categoria</Text>
              <FlatList
                data={categorias}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => {
                      setCategoria(item);
                      setIsCategoryModalVisible(false);
                    }}
                  >
                    <Text style={styles.categoryItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Tipo de Série */}
      <Modal animationType="slide" transparent visible={isSeriesTypeModalVisible} onRequestClose={() => setIsSeriesTypeModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setIsSeriesTypeModalVisible(false)}>
          <View style={styles.pickerModalOverlay}>
            <View style={styles.categoryModalContent}>
              <Text style={styles.modalPickerTitle}>Selecione o Tipo de Série</Text>
              <FlatList
                data={seriesTypeLabels}
                keyExtractor={(item) => item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => {
                      if (currentExerciseIndexForSet !== null) {
                        adicionarSet(currentExerciseIndexForSet, item.type);
                        setCurrentExerciseIndexForSet(null);
                      }
                      setIsSeriesTypeModalVisible(false);
                    }}
                  >
                    <Text style={styles.categoryItemText}>{item.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

/** ----------------------------------------------------------------
 *  STYLES
 * ---------------------------------------------------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  backButton: { position: 'absolute', left: 20, bottom: 15, zIndex: 1, padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.onPrimary, textAlign: 'center', flex: 1 },
  scrollViewContent: { flex: 1, padding: 20, paddingBottom: 100 },
  overlayLoading: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLoadingText: { marginTop: 10, color: Colors.primary, fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.primary, marginBottom: 15 },
  inputContainer: { marginBottom: 15 },
  inputLabelText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 5, marginLeft: 5 },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  inputDisabledContainer: { backgroundColor: Colors.lightGray },
  input: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: 16 },
  inputDisabledText: { color: Colors.textLight },
  inputIconLeft: { marginRight: 10 },
  multilineInput: { height: 100, textAlignVertical: 'top', paddingVertical: 15 },
  inputLabel: { fontSize: 14, color: Colors.textSecondary, marginBottom: 5, marginLeft: 5 },
  categorySplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  categorySplitButtonText: { fontSize: 16, color: Colors.textPrimary },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  inputIconRight: { marginLeft: 10 },
  exercicioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  exercicioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.divider, marginBottom: 10 },
  exercicioCardTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, flex: 1 },
  exercicioImage: { width: '100%', height: 150, borderRadius: 10, marginVertical: 10 },
  exercicioDetailText: { fontSize: 14, color: Colors.textSecondary, marginBottom: 5 },
  seriesContainer: { marginTop: 15, padding: 10, backgroundColor: Colors.lightGray, borderRadius: 10 },
  setCard: { backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: Colors.secondary },
  setCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  setCardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  setActions: { flexDirection: 'row' },
  setDetails: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  setFieldInputContainer: { width: '48%', marginBottom: 10 },
  setFieldLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 3 },
  setFieldInput: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  adicionarSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.secondary,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  adicionarSetButtonText: { color: Colors.secondary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 15,
    backgroundColor: Colors.danger,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: { color: Colors.onPrimary, fontWeight: 'bold', marginLeft: 5 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, elevation: 2, marginBottom: 10 },
  addButtonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  saveTemplateContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingVertical: 10 },
  saveTemplateText: { fontSize: 16, color: Colors.textPrimary },
  saveTemplateInputs: { marginTop: 10, padding: 15, backgroundColor: Colors.lightGray, borderRadius: 10 },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.success,
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
    ...GlobalStyles.shadow,
  },
  saveButtonText: { color: Colors.onPrimary, fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  modalBackButton: { position: 'absolute', left: 20, bottom: 15, zIndex: 1, padding: 5 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.onPrimary, textAlign: 'center' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    margin: 15,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchIcon: { marginRight: 10 },
  searchBar: { flex: 1, height: 50, color: Colors.textPrimary, fontSize: 16 },
  libraryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 15, marginHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: Colors.divider },
  libraryCardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.lightGray, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  libraryCardContent: { flex: 1 },
  libraryItemText: { fontSize: 16, fontWeight: 'bold', color: Colors.textPrimary },
  libraryItemSubText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  resultsCountText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 10 },
  pickerModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  categoryModalContent: { width: '80%', backgroundColor: Colors.surface, borderRadius: 15, padding: 20, maxHeight: '60%' },
  modalPickerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, marginBottom: 15, textAlign: 'center' },
  categoryItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  categoryItemText: { fontSize: 16, color: Colors.textPrimary },
  dateTimePicker: { backgroundColor: Colors.surface },
  pickerConfirmButton: { marginTop: 10, backgroundColor: Colors.secondary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  pickerConfirmButtonText: { color: Colors.onSecondary, fontWeight: '800' },
});
