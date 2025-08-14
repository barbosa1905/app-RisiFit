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
import { doc, updateDoc, collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Nova Paleta de Cores Profissional
const Colors = {
  primary: '#2A3B47',
  primaryLight: '#3A506B',
  secondary: '#FFB800',
  accent: '#007BFF',
  background: '#F0F2F5',
  surface: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textLight: '#999999',
  onPrimary: '#FFFFFF',
  onSecondary: '#333333',
  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  border: '#E0E0E0',
  lightGray: '#F7F7F7',
  mediumGray: '#AAAAAA',
  darkGray: '#555555',
  black: '#000000',
};

// Global Styles para consistência de sombras
const GlobalStyles = {
  shadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  }
};

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Flexibilidade', 'Core', 'Outro'];

const seriesTypes = {
  reps_and_load: { label: 'Repetições e Carga', fields: ['reps', 'peso', 'descanso'] },
  reps_load_time: { label: 'Repetições, Carga e Tempo', fields: ['reps', 'peso', 'tempo', 'descanso'] },
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
  tempo: 'Tempo (segundos)',
  inclinacao: 'Inclinação',
  distancia: 'Distância (km)',
  ritmo: 'Ritmo (min/km)',
  descanso: 'Descanso (segundos)',
  notas: 'Notas',
  cadencia: 'Cadência',
};

const seriesTypeLabels = Object.entries(seriesTypes).map(([key, value]) => ({
  type: key,
  label: value.label
}));

// Função auxiliar para gerar IDs únicos (usada para exercícios manuais)
const gerarIDUnico = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

// Componente para campos de entrada de detalhes do treino
const InlineWorkoutDetailsInput = React.memo(({ placeholder, value, onChangeText, multiline = false, keyboardType = 'default', style, icon, editable = true, label }) => {
  return (
    <View style={localStyles.inputContainer}>
      {label && <Text style={localStyles.inputLabelText}>{label}</Text>}
      <View style={[localStyles.inputFieldWrapper, !editable && localStyles.inputDisabledContainer]}>
        {icon && <Feather name={icon} size={20} color={!editable ? Colors.mediumGray : Colors.darkGray} style={localStyles.inputIconLeft} />}
        <TextInput
          style={[localStyles.input, multiline && localStyles.multilineInput, style, !editable && localStyles.inputDisabledText]}
          placeholder={placeholder}
          placeholderTextColor={!editable ? Colors.mediumGray : Colors.textLight}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType}
          enablesReturnKeyAutomatically={true}
          editable={editable}
        />
      </View>
    </View>
  );
});

export default function EditarTreinoScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { clienteId, treino, reloadTreinos, clientename } = route.params;

  const [nome, setNome] = useState(treino.name || treino.nome || '');
  const [categoria, setCategoria] = useState(treino.category || treino.categoria || '');
  const [descricao, setDescricao] = useState(treino.description || treino.descricao || '');
  const [data, setData] = useState(
    treino.data
      ? (treino.data.toDate ? treino.data.toDate() : new Date(treino.data))
      : new Date()
  );
  const [horaSelecionada, setHoraSelecionada] = useState(
    treino.data
      ? (treino.data.toDate ? treino.data.toDate() : new Date(treino.data))
      : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  const [exercicios, setExercicios] = useState([]);
  const [isLibraryModalVisible, setIsLibraryModalVisible] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLibrary, setFilteredLibrary] = useState([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSeriesTypeModalVisible, setIsSeriesTypeModalVisible] = useState(false);
  const [currentExerciseIndexForSet, setCurrentExerciseIndexForSet] = useState(null);

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  useEffect(() => {
    const loadedExercises = [];

    if (treino.templateExercises && Array.isArray(treino.templateExercises)) {
      treino.templateExercises.forEach(ex => {
        loadedExercises.push({
          id: ex.exerciseId,
          exerciseName: ex.exerciseName || '',
          imageUrl: ex.imageUrl || '',
          animationUrl: ex.animationUrl || '',
          description: ex.description || '',
          category: ex.category || '',
          targetMuscles: ex.targetMuscles || [],
          equipment: ex.equipment || [],
          sets: ex.sets || [],
          notes: ex.notes || '',
          isExpanded: false,
        });
      });
    }

    if (treino.customExercises && Array.isArray(treino.customExercises)) {
      treino.customExercises.forEach(ex => {
        loadedExercises.push({
          id: null,
          customExerciseId: gerarIDUnico(),
          exerciseName: ex.exerciseName || '',
          sets: ex.sets || [],
          notes: ex.notes || '',
          imageUrl: '', animationUrl: '', description: '', category: '', targetMuscles: [], equipment: [],
          isExpanded: false,
        });
      });
    }
    setExercicios(loadedExercises);
  }, [treino]);

  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = exerciseLibrary.filter(ex =>
      (ex.name && ex.name.toLowerCase().includes(lowerCaseQuery)) ||
      (ex.category && ex.category.toLowerCase().includes(lowerCaseQuery)) ||
      (ex.targetMuscles && ex.targetMuscles.some(muscle => muscle.toLowerCase().includes(lowerCaseQuery))) ||
      (ex.equipment && ex.equipment.some(eq => eq.toLowerCase().includes(lowerCaseQuery)))
    );
    setFilteredLibrary(filtered);
  }, [searchQuery, exerciseLibrary]);

  const fetchExerciseLibrary = useCallback(async () => {
    setLoadingLibrary(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'exercises'));
      const exercises = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nome_pt,
          description: data.descricao_breve || '',
          category: data.category || '',
          targetMuscles: data.musculos_alvo ? data.musculos_alvo.map(m => m.name || m.id).filter(Boolean) : [],
          equipment: data.equipment || [],
          animationUrl: data.animationUrl || '',
          imageUrl: data.imageUrl || '',
          sets: [],
          notes: '',
        };
      });
      setExerciseLibrary(exercises);
      setFilteredLibrary(exercises);
    } catch (error) {
      console.error("Erro ao carregar biblioteca de exercícios:", error);
      Alert.alert("Erro", "Não foi possível carregar a biblioteca de exercícios.");
    } finally {
      setLoadingLibrary(false);
    }
  }, []);

  const onChangeDate = useCallback((event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setData(selectedDate);
      setHoraSelecionada(selectedDate);
    }
  }, []);

  const onChangeTime = useCallback((event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setHoraSelecionada(selectedTime);
      setData(prevData => {
        const newDate = new Date(prevData);
        newDate.setHours(selectedTime.getHours());
        newDate.setMinutes(selectedTime.getMinutes());
        return newDate;
      });
    }
  }, []);

  const adicionarExercicioManual = useCallback(() => {
    setExercicios(prev => [...prev, {
      id: null,
      customExerciseId: gerarIDUnico(),
      exerciseName: '',
      sets: [{ id: gerarIDUnico(), type: 'reps_and_load', reps: '', peso: '', descanso: '' }],
      notes: '',
      imageUrl: '', animationUrl: '', description: '', category: '', targetMuscles: [], equipment: [],
      isExpanded: true,
    }]);
  }, []);

  const adicionarExercicioDaBiblioteca = useCallback((selectedExercise) => {
    setExercicios(prev => [...prev, {
      id: selectedExercise.id,
      exerciseName: selectedExercise.name,
      imageUrl: selectedExercise.imageUrl || '',
      animationUrl: selectedExercise.animationUrl || '',
      description: selectedExercise.description || '',
      category: selectedExercise.category || '',
      targetMuscles: selectedExercise.targetMuscles || [],
      equipment: selectedExercise.equipment || [],
      sets: [{ id: gerarIDUnico(), type: 'reps_and_load', reps: '', peso: '', descanso: '' }],
      notes: '',
      isExpanded: true,
    }]);
    setIsLibraryModalVisible(false);
    setSearchQuery('');
  }, []);

  const atualizarExercicio = useCallback((index, campo, valor) => {
    setExercicios(prev => {
      const novos = [...prev];
      novos[index] = { ...novos[index], [campo]: valor };
      return novos;
    });
  }, []);

  const atualizarSet = useCallback((exIndex, setIndex, campo, valor) => {
    setExercicios(prev => {
      const novos = [...prev];
      const exercicio = { ...novos[exIndex] };
      const sets = [...exercicio.sets];
      sets[setIndex] = { ...sets[setIndex], [campo]: valor };
      exercicio.sets = sets;
      novos[exIndex] = exercicio;
      return novos;
    });
  }, []);

  const adicionarSet = useCallback((exIndex, setType = 'reps_and_load') => {
    setExercicios(prev => {
      const novos = [...prev];
      const exercicio = { ...novos[exIndex] };
      const novoSet = {
        id: gerarIDUnico(),
        type: setType,
        ...seriesTypes[setType].fields.reduce((acc, field) => ({ ...acc, [field]: '' }), {})
      };
      exercicio.sets = [...exercicio.sets, novoSet];
      novos[exIndex] = exercicio;
      return novos;
    });
  }, []);

  const removerSet = useCallback((exIndex, setIndex) => {
    setExercicios(prev => {
      const novos = [...prev];
      const exercicio = { ...novos[exIndex] };
      exercicio.sets = exercicio.sets.filter((_, idx) => idx !== setIndex);
      novos[exIndex] = exercicio;
      return novos;
    });
  }, []);


  const toggleExpandExercicio = useCallback((index) => {
    setExercicios(prev => {
      const novos = [...prev];
      novos[index].isExpanded = !novos[index].isExpanded;
      return novos;
    });
  }, []);

  const removerExercicio = useCallback((index) => {
    Alert.alert(
      'Remover Exercício',
      'Tem certeza que deseja remover este exercício?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: () => {
            setExercicios(prev => {
              const novos = [...prev];
              novos.splice(index, 1);
              return novos;
            });
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  }, []);

  const salvarTreino = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do treino não pode estar vazio.');
      return;
    }
    if (!categoria.trim()) {
      Alert.alert('Erro', 'A categoria do treino não pode estar vazia.');
      return;
    }
   
    if (exercicios.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos um exercício ao treino.');
      return;
    }

    for (const [i, ex] of exercicios.entries()) {
      if (!ex.exerciseName.trim()) {
        Alert.alert('Erro', `O nome do exercício ${i + 1} está vazio.`);
        return;
      }
      if (ex.sets.length === 0) {
        Alert.alert('Erro', `O exercício "${ex.exerciseName}" não tem séries. Por favor, adicione pelo menos uma.`);
        return;
      }
      for (const [setIndex, set] of ex.sets.entries()) {
        const fields = seriesTypes[set.type]?.fields || [];
        for (const field of fields) {
          if (field !== 'notas' && String(set[field]).trim() === '') {
            Alert.alert('Erro', `O campo '${seriesFieldLabels[field] || field}' da série ${setIndex + 1} do exercício "${ex.exerciseName}" está vazio.`);
            return;
          }
          if (field !== 'notas' && !isNaN(set[field]) && Number(set[field]) < 0) {
            Alert.alert('Erro', `O valor para '${seriesFieldLabels[field] || field}' na série ${setIndex + 1} do exercício "${ex.exerciseName}" é inválido.`);
            return;
          }
        }
      }
    }

    setIsLoading(true);
    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treino.id);

      const exercisesToSave = exercicios.map(ex => ({
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

      const updateData = {
        name: nome.trim(),
        category: categoria.trim(),
        description: descricao.trim(),
        data: Timestamp.fromDate(data),
        templateExercises: exercisesToSave.filter(ex => ex.exerciseId !== null),
        customExercises: exercisesToSave.filter(ex => ex.exerciseId === null),
        ...(treino.templateId && (exercisesToSave.length !== (treino.templateExercises?.length || 0) || exercisesToSave.some(ex => ex.exerciseId === null)))
          ? { templateId: null, templateName: null, templateDescription: null }
          : {}
      };

      await updateDoc(treinoRef, updateData);

      if (saveAsTemplate) {
        if (!newTemplateName.trim()) {
          Alert.alert('Erro', 'Por favor, dê um nome ao novo modelo de treino.');
          setIsLoading(false);
          return;
        }
        try {
          await addDoc(collection(db, 'workoutTemplates'), {
            name: newTemplateName.trim(),
            description: newTemplateDescription.trim() || '',
            exercises: exercisesToSave,
            createdAt: new Date(),
          });
          Alert.alert('Sucesso', 'Novo modelo de treino criado!');
        } catch (templateError) {
          console.error("Erro ao salvar novo modelo de treino:", templateError);
          Alert.alert('Erro', `Falha ao salvar o novo modelo de treino: ${templateError.message}`);
        }
      }

      Alert.alert('Sucesso', '✅ Treino atualizado com sucesso!');
      if (reloadTreinos) {
        reloadTreinos();
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar treino.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimePicker = ({ showPicker, value, onChange, onConfirm }) => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={onConfirm}
        >
          <TouchableWithoutFeedback onPress={onConfirm}>
            <View style={localStyles.pickerModalOverlay}>
              <View style={localStyles.pickerModalContent}>
                <DateTimePicker
                  value={value || new Date()}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={onChange}
                  style={localStyles.dateTimePicker}
                />
                <TouchableOpacity
                  style={localStyles.pickerConfirmButton}
                  onPress={onConfirm}
                >
                  <Text style={localStyles.pickerConfirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      );
    } else {
      if (showPicker) {
        return (
          <DateTimePicker
            value={value || new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onChange}
          />
        );
      }
      return null;
    }
  };

  const renderSeriesInputs = (exercicio, exIndex) => {
    return (
      <View style={localStyles.seriesContainer}>
        {exercicio.sets.map((set, setIndex) => (
          <View key={set.id} style={localStyles.setCard}>
            <View style={localStyles.setCardHeader}>
              <Text style={localStyles.setCardTitle}>
                {seriesTypes[set.type]?.label || 'Série Personalizada'} {setIndex + 1}
              </Text>
              <View style={localStyles.setActions}>
                <TouchableOpacity onPress={() => removerSet(exIndex, setIndex)}>
                  <Feather name="trash-2" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={localStyles.setDetails}>
              {seriesTypes[set.type]?.fields.map(field => (
                <View key={field} style={localStyles.setFieldInputContainer}>
                  <Text style={localStyles.setFieldLabel}>{seriesFieldLabels[field] || field}:</Text>
                  <TextInput
                    style={localStyles.setFieldInput}
                    value={String(set[field])}
                    onChangeText={(text) => atualizarSet(exIndex, setIndex, field, text)}
                    keyboardType={
                      field === 'reps' || field === 'peso' || field === 'tempo' || field === 'descanso' ? 'numeric' : 'default'
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity style={localStyles.adicionarSetButton} onPress={() => { setCurrentExerciseIndexForSet(exIndex); setIsSeriesTypeModalVisible(true); }}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.secondary} />
          <Text style={localStyles.adicionarSetButtonText}>Adicionar Série</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={localStyles.safeArea}>
      <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={localStyles.headerContainer}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <TouchableOpacity onPress={() => navigation.goBack()} style={localStyles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.onPrimary} />
        </TouchableOpacity>
        <Text style={localStyles.headerTitle}>{nome || 'Editar Treino'}</Text>
      </LinearGradient>

      <ScrollView style={localStyles.scrollViewContent} keyboardShouldPersistTaps="handled">
        {isLoading && (
          <View style={localStyles.overlayLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={localStyles.overlayLoadingText}>A salvar treino...</Text>
          </View>
        )}
        <Text style={localStyles.sectionTitle}>Detalhes do Treino</Text>
        <InlineWorkoutDetailsInput placeholder="Nome do Treino (ex: Treino de Pernas e Glúteos)" value={nome} onChangeText={setNome} icon="tag" />
        <InlineWorkoutDetailsInput placeholder="Descrição (opcional, ex: Foco em força e hipertrofia)" value={descricao} onChangeText={setDescricao} multiline icon="align-left" />
        <Text style={localStyles.inputLabel}>Categoria:</Text>
        <TouchableOpacity style={[localStyles.categorySplitButton, GlobalStyles.shadow]} onPress={() => setIsCategoryModalVisible(true)} >
          <Text style={localStyles.categorySplitButtonText}>{categoria || "Selecionar Categoria"}</Text>
          <Feather name="chevron-down" size={20} color={Colors.darkGray} />
        </TouchableOpacity>
        <Text style={localStyles.inputLabel}>Data do Treino:</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={localStyles.timeInput}>
          <Text style={{ color: data ? Colors.textPrimary : Colors.textLight, fontSize: 16 }}>
            {data.toLocaleDateString()}
          </Text>
          <Feather name="calendar" size={20} color={Colors.darkGray} style={localStyles.inputIconRight} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={data} mode="date" display="default" onChange={onChangeDate} minimumDate={new Date()} />
        )}
        <Text style={localStyles.inputLabel}>Hora do Treino:</Text>
        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={localStyles.timeInput}>
          <Text style={{ color: horaSelecionada ? Colors.textPrimary : Colors.textLight, fontSize: 16 }}>
            {horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Feather name="clock" size={20} color={Colors.darkGray} style={localStyles.inputIconRight} />
        </TouchableOpacity>
        {renderTimePicker({ showPicker: showTimePicker, value: horaSelecionada, onChange: onChangeTime, onConfirm: () => setShowTimePicker(false), })}

        <Text style={[localStyles.sectionTitle, { marginTop: 20 }]}>Exercícios</Text>
        {exercicios.map((exercicio, index) => (
          <View key={exercicio.id || exercicio.customExerciseId} style={[localStyles.exercicioCard, GlobalStyles.shadow]}>
            <TouchableOpacity onPress={() => toggleExpandExercicio(index)} style={localStyles.exercicioHeader}>
              <Text style={localStyles.exercicioCardTitle}>
                {exercicio.exerciseName || 'Exercício Sem Nome'}
              </Text>
              <Feather name={exercicio.isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.darkGray} />
            </TouchableOpacity>
            {exercicio.isExpanded && (
              <>
                <InlineWorkoutDetailsInput label="Nome" placeholder="Nome do exercício" value={exercicio.exerciseName} onChangeText={(text) => atualizarExercicio(index, 'exerciseName', text)} icon="tag" editable={exercicio.id === null} />
                {exercicio.id !== null && (
                  <>
                    {exercicio.imageUrl ? (
                      <Image source={{ uri: exercicio.imageUrl }} style={localStyles.exercicioImage} resizeMode="contain" />
                    ) : null}
                    {exercicio.description ? (
                      <Text style={localStyles.exercicioDetailText}><Text style={{fontWeight: 'bold'}}>Descrição:</Text> {exercicio.description}</Text>
                    ) : null}
                    {exercicio.category ? (
                      <Text style={localStyles.exercicioDetailText}><Text style={{fontWeight: 'bold'}}>Categoria:</Text> {exercicio.category}</Text>
                    ) : null}
                    {exercicio.targetMuscles && exercicio.targetMuscles.length > 0 ? (
                      <Text style={localStyles.exercicioDetailText}><Text style={{fontWeight: 'bold'}}>Músculos:</Text> {exercicio.targetMuscles.join(', ')}</Text>
                    ) : null}
                    {exercicio.equipment && exercicio.equipment.length > 0 ? (
                      <Text style={localStyles.exercicioDetailText}><Text style={{fontWeight: 'bold'}}>Equipamento:</Text> {exercicio.equipment.join(', ')}</Text>
                    ) : null}
                  </>
                )}
                {/* RENDERIZAÇÃO CORRIGIDA DAS SÉRIES */}
                {renderSeriesInputs(exercicio, index)}
              </>
            )}
            <TouchableOpacity onPress={() => removerExercicio(index)} style={localStyles.removeButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.onPrimary} />
              <Text style={localStyles.removeButtonText}>Remover Exercício</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={[localStyles.addButton, { backgroundColor: Colors.accent }]} onPress={adicionarExercicioManual}>
          <Feather name="plus-circle" size={24} color={Colors.onPrimary} />
          <Text style={localStyles.addButtonText}>Adicionar Exercício Manual</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[localStyles.addButton, { backgroundColor: Colors.secondary, marginTop: 10 }]} onPress={() => { fetchExerciseLibrary(); setIsLibraryModalVisible(true); }}>
          <Feather name="book-open" size={24} color={Colors.onSecondary} />
          <Text style={localStyles.addButtonText}>Adicionar da Biblioteca</Text>
        </TouchableOpacity>

        <View style={localStyles.saveTemplateContainer}>
          <Text style={localStyles.saveTemplateText}>Guardar como Modelo</Text>
          <Switch
            onValueChange={setSaveAsTemplate}
            value={saveAsTemplate}
            trackColor={{ false: Colors.mediumGray, true: Colors.success }}
            thumbColor={Colors.onPrimary}
          />
        </View>

        {saveAsTemplate && (
          <View style={localStyles.saveTemplateInputs}>
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

      <TouchableOpacity style={localStyles.saveButton} onPress={salvarTreino}>
        <Ionicons name="save-outline" size={24} color={Colors.onPrimary} />
        <Text style={localStyles.saveButtonText}>Guardar Treino</Text>
      </TouchableOpacity>

      {/* Modal da Biblioteca */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isLibraryModalVisible}
        onRequestClose={() => setIsLibraryModalVisible(false)}
      >
        <SafeAreaView style={localStyles.modalContainer}>
          <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={localStyles.modalHeader}>
            <TouchableOpacity onPress={() => {setIsLibraryModalVisible(false); setSearchQuery('')}} style={localStyles.modalBackButton}>
              <Ionicons name="close" size={28} color={Colors.onPrimary} />
            </TouchableOpacity>
            <Text style={localStyles.modalTitle}>Biblioteca de Exercícios</Text>
          </LinearGradient>
          <View style={localStyles.searchBarContainer}>
            <Feather name="search" size={20} color={Colors.darkGray} style={localStyles.searchIcon} />
            <TextInput
              style={localStyles.searchBar}
              placeholder="Pesquisar exercícios..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {loadingLibrary ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={filteredLibrary}
              keyExtractor={item => item.id}
              ListHeaderComponent={() => (
                <Text style={localStyles.resultsCountText}>
                  {filteredLibrary.length} {filteredLibrary.length === 1 ? 'exercício encontrado' : 'exercícios encontrados'}
                </Text>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[localStyles.libraryCard, GlobalStyles.shadow]}
                  onPress={() => adicionarExercicioDaBiblioteca(item)}
                >
                  <View style={localStyles.libraryCardIcon}>
                    <Ionicons name="barbell-outline" size={28} color={Colors.primary} />
                  </View>
                  <View style={localStyles.libraryCardContent}>
                    <Text style={localStyles.libraryItemText}>{item.name}</Text>
                    {item.targetMuscles.length > 0 && (
                      <Text style={localStyles.libraryItemSubText}>
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

      {/* Modal de Categoria */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCategoryModalVisible}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsCategoryModalVisible(false)}>
          <View style={localStyles.pickerModalOverlay}>
            <View style={localStyles.categoryModalContent}>
              <Text style={localStyles.modalPickerTitle}>Selecione a Categoria</Text>
              <FlatList
                data={categorias}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={localStyles.categoryItem}
                    onPress={() => {
                      setCategoria(item);
                      setIsCategoryModalVisible(false);
                    }}
                  >
                    <Text style={localStyles.categoryItemText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de Tipo de Série */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSeriesTypeModalVisible}
        onRequestClose={() => setIsSeriesTypeModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSeriesTypeModalVisible(false)}>
          <View style={localStyles.pickerModalOverlay}>
            <View style={localStyles.categoryModalContent}>
              <Text style={localStyles.modalPickerTitle}>Selecione o Tipo de Série</Text>
              <FlatList
                data={seriesTypeLabels}
                keyExtractor={item => item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={localStyles.categoryItem}
                    onPress={() => {
                      if (currentExerciseIndexForSet !== null) {
                        adicionarSet(currentExerciseIndexForSet, item.type);
                        setCurrentExerciseIndexForSet(null); // Resetar o índice
                      }
                      setIsSeriesTypeModalVisible(false);
                    }}
                  >
                    <Text style={localStyles.categoryItemText}>{item.label}</Text>
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

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  backButton: {
    position: 'absolute',
    left: 20,
    bottom: 15,
    zIndex: 1,
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimary,
    textAlign: 'center',
    flex: 1,
  },
  scrollViewContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
  },
  overlayLoading: {
    position: 'absolute',
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayLoadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabelText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
    marginLeft: 5,
  },
  inputFieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputDisabledContainer: {
    backgroundColor: Colors.lightGray,
  },
  input: {
    flex: 1,
    height: 50,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputDisabledText: {
    color: Colors.textLight,
  },
  inputIconLeft: {
    marginRight: 10,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingVertical: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
    marginLeft: 5,
  },
  categorySplitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categorySplitButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIconRight: {
    marginLeft: 10,
  },
  exercicioCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 10,
  },
  exercicioCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    flex: 1,
  },
  exercicioImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginVertical: 10,
  },
  exercicioDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  seriesContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
  },
  setCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  setCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  setActions: {
    flexDirection: 'row',
  },
  setDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  setFieldInputContainer: {
    width: '48%',
    marginBottom: 10,
  },
  setFieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  setFieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: Colors.background,
    color: Colors.textPrimary
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
  adicionarSetButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 15,
    backgroundColor: Colors.error,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeButtonText: {
    color: Colors.onPrimary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    elevation: 2,
    marginBottom: 10,
  },
  addButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saveTemplateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  saveTemplateText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  saveTemplateInputs: {
    marginTop: 10,
    padding: 15,
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
  },
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
  saveButtonText: {
    color: Colors.onPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalBackButton: {
    position: 'absolute',
    left: 20,
    bottom: 15,
    zIndex: 1,
    padding: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    margin: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    height: 50,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  libraryCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  libraryCardContent: {
    flex: 1,
  },
  libraryItemText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  libraryItemSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  resultsCountText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  categoryModalContent: {
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    maxHeight: '60%',
  },
  modalPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});