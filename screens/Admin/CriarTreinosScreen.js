import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
  Image,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  buscarClientes,
  criarTreinoParaCliente,
  buscarTodosTreinosComNomes,
} from '../../services/adminService';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obterNomeCliente } from '../../utils/clienteUtils';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../../services/firebaseConfig';
import {
  collection,
  query,
  onSnapshot,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Nova Paleta de Cores Profissional
const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  background: '#F0F2F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  success: '#4CAF50',
  danger: '#F44336',
  info: '#2196F3',
  placeholder: '#999999',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Flexibilidade', 'Core', 'Outro'];

const seriesTypes = {
  reps_and_load: {
    label: 'Repetições e carga',
    fields: ['reps', 'peso', 'descanso'],
    icons: ['repeat', 'dumbbell', 'pause-circle'],
  },
  reps_load_time: {
    label: 'Repetições, carga e tempo',
    fields: ['reps', 'peso', 'tempo', 'descanso'],
    icons: ['repeat', 'dumbbell', 'clock', 'pause-circle'],
  },
  reps_and_time: {
    label: 'Repetições e tempo',
    fields: ['reps', 'tempo', 'descanso'],
    icons: ['repeat', 'clock', 'pause-circle'],
  },
  time_and_incline: {
    label: 'Tempo e inclinação',
    fields: ['tempo', 'inclinacao', 'descanso'],
    icons: ['clock', 'trending-up', 'pause-circle'],
  },
  running: {
    label: 'Corrida',
    fields: ['distancia', 'tempo', 'ritmo', 'descanso'],
    icons: ['map', 'clock', 'activity', 'pause-circle'],
  },
  notes: {
    label: 'Observações',
    fields: ['notas'],
    icons: ['edit-3'],
  },
  cadence: {
    label: 'Cadência',
    fields: ['cadencia', 'descanso'],
    icons: ['music', 'pause-circle'],
  },
  split_series: {
    label: 'Série Split',
    fields: ['reps', 'peso', 'descanso'],
    icons: ['repeat', 'dumbbell', 'pause-circle'],
  },
};

const gerarIDUnico = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

const AppHeader = ({ title, showBackButton = false, onBackPress = () => {}, adminInfo }) => {
  return (
    <View style={localStyles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <SafeAreaView style={{ backgroundColor: Colors.primary }}>
        <View style={localStyles.header}>
          {showBackButton && (
            <TouchableOpacity onPress={onBackPress} style={localStyles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.cardBackground} />
            </TouchableOpacity>
          )}
          <Text style={localStyles.headerTitle}>{title}</Text>
          <View style={localStyles.headerRight}>
            {adminInfo?.photoURL ? (
              <Image source={{ uri: adminInfo.photoURL }} style={localStyles.avatar} />
            ) : (
              <View style={localStyles.avatarPlaceholder}>
                <Text style={localStyles.avatarText}>{adminInfo?.nome?.charAt(0) || 'A'}</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const InlineWorkoutDetailsInput = React.memo(({ placeholder, value, onChangeText, multiline = false, keyboardType = 'default', style, icon }) => {
  const IconComponent = icon === 'dumbbell' ? FontAwesome5 : Feather;
  return (
    <View style={localStyles.inputContainer}>
      <IconComponent name={icon} size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
      <TextInput
        style={[localStyles.input, multiline && localStyles.multilineInput, style]}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        enablesReturnKeyAutomatically={true}
      />
    </View>
  );
});

const renderTimePicker = ({ showPicker, value, onChange, onConfirm, minDateTime }) => {
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
                minimumDate={minDateTime || undefined}
              />
              <TouchableOpacity style={localStyles.pickerConfirmButton} onPress={onConfirm}>
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
          minimumDate={minDateTime || undefined}
        />
      );
    }
    return null;
  }
};

const MemoizedListHeader = React.memo(({
  currentStep,
  setCurrentStep,
  handleGoBack,
  clienteSelecionado,
  setModalClientesVisible,
  obterNomeCliente,
  dataSelecionada,
  setDataSelecionada,
  markedDatesForCalendar,
  mostrarPickerHora,
  setMostrarPickerHora,
  horaSelecionada,
  onChangeHora,
  isCreatingFromScratch,
  setIsCreatingFromScratch,
  setSelectedWorkoutTemplate,
  setIsTemplateSelectionModalVisible,
  nome,
  setNome,
  descricao,
  setDescricao,
  categoria,
  setCategoria,
  saveAsTemplate,
  setSaveAsTemplate,
  newTemplateName,
  setNewTemplateName,
  newTemplateDescription,
  setNewTemplateDescription,
  adicionarExercicio,
  selectedWorkoutTemplate = null,
  isCategoryModalVisible,
  setIsCategoryModalVisible,
  minDate,
  minDateTime,
  handleGoToStep5,
}) => {
  return (
    <View style={localStyles.listHeaderContainer}>
      {currentStep === 1 && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>1. Selecione o Cliente</Text>
          <View style={localStyles.clientSelectionContainer}>
            <Text style={localStyles.selectedClientText}>
              {clienteSelecionado ? obterNomeCliente(clienteSelecionado) : 'Nenhum cliente selecionado'}
            </Text>
            <TouchableOpacity style={localStyles.selectClientButton} onPress={() => setModalClientesVisible(true)}>
              <Text style={localStyles.selectClientButtonText}>Selecionar Cliente</Text>
            </TouchableOpacity>
          </View>
          {clienteSelecionado && (
            <TouchableOpacity
              style={localStyles.nextStepButton}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={localStyles.nextStepButtonText}>Próximo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {currentStep === 2 && clienteSelecionado && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>2. Agendamento</Text>
          <Text style={localStyles.selectedClientText}>Cliente: {obterNomeCliente(clienteSelecionado)}</Text>
          <Calendar
            onDayPress={(day) => setDataSelecionada(day.dateString)}
            minDate={minDate}
            markedDates={{
              ...markedDatesForCalendar,
              [dataSelecionada]: {
                selected: true,
                disableTouchEvent: true,
                selectedDotColor: Colors.cardBackground,
                selectedColor: Colors.primary,
              },
            }}
            theme={{
              calendarBackground: Colors.cardBackground,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: Colors.cardBackground,
              todayTextColor: Colors.secondary,
              dayTextColor: Colors.textPrimary,
              textDisabledColor: Colors.placeholder,
              arrowColor: Colors.textPrimary,
              monthTextColor: Colors.textPrimary,
              textMonthFontWeight: 'bold',
              'stylesheet.calendar.header': {
                week: {
                  marginTop: 5,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: Colors.background,
                  borderRadius: 8,
                  paddingVertical: 5,
                }
              }
            }}
            style={localStyles.calendar}
          />
          <TouchableOpacity
            onPress={() => setMostrarPickerHora(true)}
            style={localStyles.timeInput}
          >
            <Feather name="clock" size={20} color={Colors.placeholder} />
            <Text style={{ color: horaSelecionada ? Colors.textPrimary : Colors.placeholder, fontSize: 16 }}>
              {horaSelecionada ? horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selecionar Hora'}
            </Text>
          </TouchableOpacity>
          {renderTimePicker({
            showPicker: mostrarPickerHora,
            value: horaSelecionada,
            onChange: onChangeHora,
            onConfirm: () => setMostrarPickerHora(false),
            minDateTime: minDateTime,
          })}
          {dataSelecionada && horaSelecionada && (
            <TouchableOpacity
              style={localStyles.nextStepButton}
              onPress={() => setCurrentStep(3)}
            >
              <Text style={localStyles.nextStepButtonText}>Próximo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {currentStep === 3 && clienteSelecionado && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>3. Tipo de Treino</Text>
          <TouchableOpacity
            style={localStyles.optionButton}
            onPress={() => { setIsCreatingFromScratch(true); setSelectedWorkoutTemplate(null); setCurrentStep(4); }}
          >
            <Feather name="plus-circle" size={28} color={Colors.primary} style={localStyles.workoutTypeIcon} />
            <Text style={localStyles.optionButtonText}>Criar um Treino do Zero</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.optionButton}
            onPress={() => setIsTemplateSelectionModalVisible(true)}
          >
            <MaterialIcons name="layers" size={30} color={Colors.primary} style={localStyles.workoutTypeIcon} />
            <Text style={localStyles.optionButtonText}>Usar Modelo Existente</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentStep === 4 && clienteSelecionado && dataSelecionada && horaSelecionada && (isCreatingFromScratch || selectedWorkoutTemplate) && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>4. Detalhes do Treino</Text>
          <View style={localStyles.inputContainer}>
            <Feather name="tag" size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
            <TextInput
              style={localStyles.input}
              placeholder="Nome do Treino (ex: Treino de Pernas e Glúteos)"
              placeholderTextColor={Colors.placeholder}
              value={nome}
              onChangeText={setNome}
              enablesReturnKeyAutomatically={true}
            />
          </View>

          <View style={localStyles.inputContainer}>
            <Feather name="align-left" size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
            <TextInput
              style={[localStyles.input, localStyles.multilineInput]}
              placeholder="Descrição (opcional, ex: Foco em força e hipertrofia)"
              placeholderTextColor={Colors.placeholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline={true}
              enablesReturnKeyAutomatically={true}
            />
          </View>

          <Text style={localStyles.inputLabel}>Categoria:</Text>
          <TouchableOpacity onPress={() => setIsCategoryModalVisible(true)} style={localStyles.pickerButton}>
            <Text style={localStyles.pickerButtonText}>
              {categoria || 'Selecionar Categoria'}
            </Text>
            <Ionicons name="caret-down" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          {nome.trim() && categoria.trim() && (
            <TouchableOpacity
              style={localStyles.nextStepButton}
              onPress={handleGoToStep5}
            >
              <Text style={localStyles.nextStepButtonText}>Próximo</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {currentStep === 5 && clienteSelecionado && (isCreatingFromScratch || selectedWorkoutTemplate) && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>5. Exercícios do Treino</Text>
          <TouchableOpacity style={localStyles.addExerciseButton} onPress={adicionarExercicio}>
            <Feather name="plus-circle" size={20} color={Colors.cardBackground} style={localStyles.buttonIconLeft} />
            <Text style={localStyles.addExerciseButtonText}>Adicionar Exercício</Text>
          </TouchableOpacity>

          {isCreatingFromScratch && !selectedWorkoutTemplate && (
            <View style={localStyles.saveAsTemplateContainer}>
              <Text style={localStyles.saveAsTemplateText}>Salvar como Modelo?</Text>
              <Switch
                trackColor={{ false: Colors.placeholder, true: Colors.secondary }}
                thumbColor={saveAsTemplate ? Colors.primary : Colors.cardBackground}
                ios_backgroundColor={Colors.placeholder}
                onValueChange={setSaveAsTemplate}
                value={saveAsTemplate}
              />
            </View>
          )}

          {saveAsTemplate && isCreatingFromScratch && (
            <>
              <InlineWorkoutDetailsInput
                placeholder="Nome do Novo Modelo"
                value={newTemplateName}
                onChangeText={setNewTemplateName}
                icon="save"
              />
              <InlineWorkoutDetailsInput
                placeholder="Descrição do Novo Modelo (opcional)"
                value={newTemplateDescription}
                onChangeText={setNewTemplateDescription}
                multiline
                icon="file-text"
              />
            </>
          )}
        </View>
      )}
    </View>
  );
});

export default function CriarTreinosScreen() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalClientesVisible, setModalClientesVisible] = useState(false);
  const [listaExerciciosEstado, setListaExerciciosEstado] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [filtroExercicios, setFiltroExercicios] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [exercicios, setExercicios] = useState([]);
  const [novoExercicioNome, setNovoExercicioNome] = useState('');
  const [treinos, setTreinos] = useState([]);
  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [isTemplateSelectionModalVisible, setIsTemplateSelectionModalVisible] = useState(false);
  const [selectedWorkoutTemplate, setSelectedWorkoutTemplate] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingFromScratch, setIsCreatingFromScratch] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [isSeriesTypeModalVisible, setIsSeriesTypeModalVisible] = useState(false);
  const [currentExerciseIndexForSeries, setCurrentExerciseIndexForSeries] = useState(null);
  const [selectedSeriesType, setSelectedSeriesType] = useState('reps_and_load');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          setAdminInfo(docSnap.data());
        } else {
          setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
        }
      }, (error) => {
        console.error("Erro ao buscar informações do admin:", error);
        setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
      });
      return unsubscribe;
    } else {
      setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante' });
      return () => { };
    }
  }, []);

  const fetchExercisesFromFirestore = useCallback(() => {
    setLoadingExercises(true);
    const exercisesColRef = collection(db, 'exercises');
    const q = query(exercisesColRef, orderBy('nome_pt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExercises = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const targetMuscles = data.musculos_alvo ? data.musculos_alvo.map(m => typeof m === 'string' ? m : (m.name || '')).filter(Boolean) : [];
        const equipment = data.equipamento ? (Array.isArray(data.equipamento) ? data.equipamento : [data.equipamento]) : [];

        return {
          id: doc.id,
          name: data.nome_pt,
          description: data.descricao_breve || '',
          category: data.category || '',
          targetMuscles: targetMuscles,
          equipment: equipment,
          animationUrl: data.animationUrl || '',
          imageUrl: data.imageUrl || '',
          originalData: data
        };
      });
      setListaExerciciosEstado(fetchedExercises);
      setLoadingExercises(false);
    }, (err) => {
      console.error("Erro ao buscar exercícios da biblioteca:", err);
      Alert.alert("Erro", "Não foi possível carregar a lista de exercícios da biblioteca.");
      setLoadingExercises(false);
    });

    return unsubscribe;
  }, []);

  const fetchWorkoutTemplates = useCallback(() => {
    const q = query(collection(db, 'workoutTemplates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWorkoutTemplates(templates);
    }, (error) => {
      console.error('Erro ao carregar modelos de treino:', error);
      Alert.alert('Erro', 'Não foi possível carregar os modelos de treino.');
    });
    return unsubscribe;
  }, []);

  const carregarClientesETreinos = useCallback(async () => {
    try {
      const listaClientes = await buscarClientes();
      setClientes(listaClientes);

      const listaTreinos = await buscarTodosTreinosComNomes();
      setTreinos(listaTreinos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Tente novamente mais tarde.');
    }
  }, []);

  useEffect(() => {
    const unsubscribeAdmin = fetchAdminInfo();
    const unsubscribeExercises = fetchExercisesFromFirestore();
    const unsubscribeTemplates = fetchWorkoutTemplates();
    carregarClientesETreinos();

    return () => {
      unsubscribeAdmin();
      unsubscribeExercises();
      unsubscribeTemplates();
    };
  }, [fetchAdminInfo, fetchExercisesFromFirestore, fetchWorkoutTemplates, carregarClientesETreinos]);

  const resetFormStates = useCallback(() => {
    setNome('');
    setDescricao('');
    setHoraSelecionada(null);
    setCategoria('');
    setClienteSelecionado(null);
    setExercicios([]);
    setNovoExercicioNome('');
    setFiltroExercicios('');
    setSelectedWorkoutTemplate(null);
    setIsCreatingFromScratch(false);
    setSaveAsTemplate(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setCurrentStep(1);
  }, []);

  const markedDates = useMemo(() => {
    const marcacoes = {};
    treinos.forEach((treino) => {
      let dataTreino;
      if (treino.data && typeof treino.data.toDate === 'function') {
        dataTreino = treino.data.toDate();
      } else if (typeof treino.data === 'string' && treino.data.includes('T')) {
        dataTreino = new Date(treino.data);
      } else {
        return;
      }

      const dataString = dataTreino.toISOString().split('T')[0];

      if (!marcacoes[dataString]) {
        marcacoes[dataString] = {
          marked: true,
          dots: [{ key: 'treino', color: Colors.secondary }],
          treinoCount: 1,
          customStyles: {
            container: {
              backgroundColor: Colors.background,
              borderRadius: 10,
            },
            text: {
              color: Colors.textPrimary,
              fontWeight: '700',
            },
          },
        };
      } else {
        marcacoes[dataString].treinoCount += 1;
      }
    });
    return marcacoes;
  }, [treinos]);

  const markedDatesForCalendar = markedDates;

  const adicionarExercicio = useCallback(() => {
    setExercicios((prev) => [...prev, {
      id: '',
      name: '',
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      animationUrl: '',
      imageUrl: '',
      notes: '',
      customExerciseId: gerarIDUnico(),
      isExpanded: true,
      setDetails: [],
    }]);
  }, []);

  const abrirModalSeriesType = useCallback((exercicioIndex) => {
    setCurrentExerciseIndexForSeries(exercicioIndex);
    setIsSeriesTypeModalVisible(true);
  }, []);

  const adicionarNovaSerie = useCallback((exercicioIndex, seriesType) => {
    const newSet = {
      id: gerarIDUnico(),
      seriesType: seriesType,
      reps: '',
      tempo: '',
      peso: '',
      inclinacao: '',
      distancia: '',
      ritmo: '',
      descanso: '',
      notas: '',
      cadencia: '',
    };
    setExercicios(prev => {
      const novosExercicios = [...prev];
      novosExercicios[exercicioIndex].setDetails.push(newSet);
      return novosExercicios;
    });
  }, []);

  const removerSet = useCallback((exercicioIndex, setIndex) => {
    Alert.alert(
      'Remover Série',
      'Tem certeza que deseja remover esta série?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: () => {
            setExercicios(prev => {
              const novosExercicios = [...prev];
              novosExercicios[exercicioIndex].setDetails.splice(setIndex, 1);
              return novosExercicios;
            });
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  }, []);

  const atualizarExercicio = useCallback((exercicioIndex, campo, valor) => {
    setExercicios(prev => {
      const novos = [...prev];
      const exercicioAtual = { ...novos[exercicioIndex] };
      exercicioAtual[campo] = valor;
      novos[exercicioIndex] = exercicioAtual;
      return novos;
    });
  }, []);

  const atualizarSet = useCallback((exercicioIndex, setIndex, campo, valor) => {
    setExercicios(prev => {
      const novos = [...prev];
      const novoSetDetails = [...novos[exercicioIndex].setDetails];
      const setAtual = { ...novoSetDetails[setIndex] };
      setAtual[campo] = valor;
      novoSetDetails[setIndex] = setAtual;
      novos[exercicioIndex] = {
        ...novos[exercicioIndex],
        setDetails: novoSetDetails,
      };
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

  const limparFormulario = useCallback(() => {
    setNome('');
    setDescricao('');
    setHoraSelecionada(null);
    setCategoria('');
    setClienteSelecionado(null);
    setExercicios([]);
    setNovoExercicioNome('');
    setFiltroExercicios('');
    setSelectedWorkoutTemplate(null);
    setIsCreatingFromScratch(false);
    setSaveAsTemplate(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setCurrentStep(1);
  }, []);

  const areExercisesIdentical = useCallback((arr1, arr2) => {
    if ((arr1 || []).length !== (arr2 || []).length) return false;

    const normalizeAndSort = (arr) => {
      return (arr || []).map(({ id, customExerciseId, templateExerciseId, isExpanded, ...rest }) => {
        const normalizedSets = rest.setDetails ? rest.setDetails.map(s => ({
          seriesType: s.seriesType || '',
          reps: s.reps || '',
          tempo: s.tempo || '',
          peso: s.peso || '',
          inclinacao: s.inclinacao || '',
          distancia: s.distancia || '',
          ritmo: s.ritmo || '',
          descanso: s.descanso || '',
          notas: s.notas || ''
        })).sort((a, b) => (a.reps || '').localeCompare(b.reps || '')) : [];

        return {
          ...rest,
          setDetails: normalizedSets,
        };
      })
        .sort((a, b) => (a.exerciseName || a.name || '').localeCompare(b.exerciseName || b.name || ''));
    };

    const normalizedArr1 = normalizeAndSort(arr1);
    const normalizedArr2 = normalizeAndSort(arr2);
    return JSON.stringify(normalizedArr1) === JSON.stringify(normalizedArr2);
  }, []);

  const handleCriarTreino = useCallback(async () => {
    if (!clienteSelecionado || !dataSelecionada || !horaSelecionada) {
      Alert.alert('Campos Obrigatórios', 'Por favor, selecione um cliente, uma data e uma hora.');
      return;
    }
    if (!nome.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, dê um nome para este agendamento de treino.');
      return;
    }
    if (!categoria.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, selecione uma categoria para este treino.');
      return;
    }
    if (exercicios.length === 0) {
      Alert.alert('Campos Obrigatórios', 'Por favor, adicione pelo menos um exercício ao treino.');
      return;
    }
    for (const ex of exercicios) {
      if (!ex.name.trim()) {
        Alert.alert('Campo Obrigatório', `O nome do exercício é obrigatório para todos os exercícios.`);
        return;
      }
      if (ex.setDetails.length === 0) {
        Alert.alert('Campo Obrigatório', `O exercício "${ex.name}" deve ter pelo menos uma série.`);
        return;
      }
    }

    let treinoDataToSave = {};
    let tipoAgendamento = '';
    let exercisesToSave = [];

    const mappedExercises = exercicios.map(ex => ({
      exerciseId: ex.id || null,
      exerciseName: ex.name,
      sets: ex.setDetails.map(set => ({
        type: set.seriesType || 'custom',
        reps: set.reps || '',
        tempo: set.tempo || '',
        peso: set.peso || '',
        inclinacao: set.inclinacao || '',
        distancia: set.distancia || '',
        ritmo: set.ritmo || '',
        descanso: set.descanso || '',
        notas: set.notas || '',
        cadencia: set.cadencia || '',
      })),
      notes: ex.notes || '',
      description: ex.description || '',
      category: ex.category || '',
      targetMuscles: ex.targetMuscles || [],
      equipment: ex.equipment || [],
      animationUrl: ex.animationUrl || '',
      imageUrl: ex.imageUrl || '',
    }));

    const templateExercises = selectedWorkoutTemplate?.exercises || [];
    const isExactTemplate = selectedWorkoutTemplate && areExercisesIdentical(exercicios, templateExercises);

    if (isExactTemplate) {
      treinoDataToSave = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria: categoria,
        templateId: selectedWorkoutTemplate.id,
        templateName: selectedWorkoutTemplate.name,
        templateDescription: selectedWorkoutTemplate.description,
        templateExercises: mappedExercises,
      };
      tipoAgendamento = 'modeloTreino';
      exercisesToSave = mappedExercises;
    } else {
      treinoDataToSave = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria: categoria,
        customExercises: mappedExercises,
      };
      tipoAgendamento = 'treinoCompleto';
      exercisesToSave = mappedExercises;

      if (saveAsTemplate) {
        if (!newTemplateName.trim()) {
          Alert.alert('Erro', 'Por favor, dê um nome ao novo modelo de treino.');
          return;
        }
        try {
          await addDoc(collection(db, 'workoutTemplates'), {
            name: newTemplateName.trim(),
            description: newTemplateDescription.trim(),
            exercises: mappedExercises,
            createdAt: new Date(),
            createdBy: adminInfo?.uid || 'unknown',
          });
          Alert.alert('Sucesso', 'Novo modelo de treino criado!');
        } catch (templateError) {
          console.error("Erro ao salvar novo modelo de treino:", templateError);
          Alert.alert('Erro', `Falha ao salvar o novo modelo de treino: ${templateError.message}`);
        }
      }
    }

    const [year, month, day] = dataSelecionada.split('-').map(Number);
    const dataHora = new Date(
      year,
      month - 1,
      day,
      horaSelecionada.getHours(),
      horaSelecionada.getMinutes()
    );

    try {
      await criarTreinoParaCliente({
        userId: clienteSelecionado.id,
        ...treinoDataToSave,
        data: Timestamp.fromDate(dataHora),
        criadoEm: Timestamp.now(),
        criadoPor: adminInfo?.nome || adminInfo?.name || 'Admin',
        status: 'agendado',
      });

      const agendaDocRef = doc(db, 'agenda', dataSelecionada);
      const agendaDocSnap = await getDoc(agendaDocRef);
      let currentTreinosInAgenda = [];

      if (agendaDocSnap.exists()) {
        currentTreinosInAgenda = (agendaDocSnap.data().treinos || []).filter(Boolean);
      }

      const novoTreinoAgendaSumario = {
        id: gerarIDUnico(),
        clienteId: clienteSelecionado.id,
        clienteNome: clienteSelecionado.name || clienteSelecionado.nome || 'Cliente Desconhecido',
        nomeTreino: treinoDataToSave.nome,
        categoria: treinoDataToSave.categoria,
        descricao: treinoDataToSave.descricao,
        dataAgendada: dataSelecionada,
        hora: horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipoAgendamento: tipoAgendamento,
        ...(tipoAgendamento === 'modeloTreino' ? { templateId: treinoDataToSave.templateId, templateName: treinoDataToSave.templateName, templateDescription: treinoDataToSave.templateDescription, templateExercises: exercisesToSave, } : { customExercises: exercisesToSave, }),
      };
      const updatedTreinosInAgenda = [...currentTreinosInAgenda, novoTreinoAgendaSumario];
      await setDoc(agendaDocRef, {
        treinos: updatedTreinosInAgenda,
      }, { merge: true });

      Alert.alert('Sucesso', '✅ Treino agendado com sucesso!');
      const listaTreinosAtualizada = await buscarTodosTreinosComNomes();
      setTreinos(listaTreinosAtualizada);
      limparFormulario();
      setDataSelecionada('');
    } catch (error) {
      console.error('Erro ao criar treino ou agendar:', error);
      Alert.alert('Erro', 'Falha ao criar e agendar treino. Tente novamente mais tarde.');
    }
  }, [clienteSelecionado, dataSelecionada, horaSelecionada, nome, descricao, categoria, exercicios, saveAsTemplate, newTemplateName, newTemplateDescription, selectedWorkoutTemplate, adminInfo, areExercisesIdentical, limparFormulario, setTreinos, today]);

  const onChangeHora = useCallback((event, selectedTime) => {
    setMostrarPickerHora(Platform.OS === 'ios');
    if (selectedTime) {
      const isToday = dataSelecionada === today;
      const now = new Date();
      if (isToday && selectedTime < now) {
        Alert.alert('Hora Inválida', 'Não pode agendar treinos para uma hora passada.');
        setHoraSelecionada(null);
      } else {
        setHoraSelecionada(selectedTime);
      }
    } else if (Platform.OS === 'android') {
      setMostrarPickerHora(false);
    }
  }, [dataSelecionada, today]);

  const selecionarCliente = useCallback((cliente) => {
    setClienteSelecionado(cliente);
    setModalClientesVisible(false);
    setCurrentStep(2);
  }, []);

  const abrirModalSelecionarExercicio = useCallback((index) => {
    setExercicioSelecionadoIndex(index);
    setModalListaExerciciosVisible(true);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  }, []);

  const selecionarExercicioDaLista = useCallback((exercicioDaBiblioteca) => {
    if (exercicioSelecionadoIndex === null) return;
    setExercicios(prev => {
      const novosExerciciosNoTreino = [...prev];
      novosExerciciosNoTreino[exercicioSelecionadoIndex] = {
        ...exercicioDaBiblioteca,
        name: exercicioDaBiblioteca.name,
        description: exercicioDaBiblioteca.description,
        targetMuscles: exercicioDaBiblioteca.targetMuscles,
        equipment: exercicioDaBiblioteca.equipment,
        setDetails: [],
        notes: '',
        customExerciseId: novosExerciciosNoTreino[exercicioSelecionadoIndex]?.customExerciseId || gerarIDUnico(),
        id: exercicioDaBiblioteca.id || '',
        isExpanded: true,
      };
      return novosExerciciosNoTreino;
    });
    setModalListaExerciciosVisible(false);
    setExercicioSelecionadoIndex(null);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  }, [exercicioSelecionadoIndex]);

  const adicionarNovoExercicioESelecionar = useCallback(async () => {
    const nomeNovo = novoExercicioNome.trim();
    if (!nomeNovo) {
      Alert.alert('Nome inválido', 'Por favor, digite um nome válido para o exercício.');
      return;
    }
    if (listaExerciciosEstado.some(ex => ex.name.toLowerCase() === nomeNovo.toLowerCase())) {
      Alert.alert('Exercício existente', 'Este exercício já está na lista.');
      return;
    }
    try {
      const newExerciseRef = await addDoc(collection(db, 'exercises'), {
        name: nomeNovo,
        description: '',
        category: 'Outro',
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
        createdAt: Timestamp.now(),
        createdBy: adminInfo?.uid || 'unknown',
      });
      Alert.alert('Sucesso', `Exercício "${nomeNovo}" adicionado à biblioteca.`);
      selecionarExercicioDaLista({ id: newExerciseRef.id, name: nomeNovo, description: '', category: 'Outro', targetMuscles: [], equipment: [], animationUrl: '', imageUrl: '', });
      setNovoExercicioNome('');
    } catch (error) {
      console.error("Erro ao adicionar novo exercício:", error);
      Alert.alert('Erro', `Não foi possível adicionar o novo exercício: ${error.message}`);
    }
  }, [novoExercicioNome, listaExerciciosEstado, adminInfo, selecionarExercicioDaLista]);

  const handleGoBack = useCallback(() => {
    if (currentStep === 5) {
      setExercicios([]);
    }
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleTemplateSelect = useCallback((template) => {
    setSelectedWorkoutTemplate(template);
    setIsCreatingFromScratch(false);
    setNome(template.name || '');
    setDescricao(template.description || '');
    setCategoria(template.category || '');
    setIsTemplateSelectionModalVisible(false);
    setCurrentStep(4);
  }, []);

  const handleGoToStep5 = useCallback(() => {
    if (selectedWorkoutTemplate) {
      const exercisesFromTemplate = (selectedWorkoutTemplate.exercises || []).map(ex => ({
        ...ex,
        customExerciseId: gerarIDUnico(),
        isExpanded: true,
        id: ex.exerciseId || ex.id || '',
        name: ex.exerciseName || ex.name || '',
        setDetails: (ex.sets || []).map(s => ({
          id: gerarIDUnico(),
          seriesType: s.type || 'reps_and_load',
          reps: s.reps || '',
          tempo: s.tempo || '',
          peso: s.peso || '',
          inclinacao: s.inclinacao || '',
          distancia: s.distancia || '',
          ritmo: s.ritmo || '',
          descanso: s.descanso || '',
          notas: s.notas || '',
          cadencia: s.cadencia || '',
        })),
      }));
      setExercicios(exercisesFromTemplate);
    } else {
      setExercicios([]);
    }
    setCurrentStep(5);
  }, [selectedWorkoutTemplate]);

  const filteredExercises = useMemo(() => {
    return listaExerciciosEstado.filter(exercise => exercise.name.toLowerCase().includes(filtroExercicios.toLowerCase()));
  }, [listaExerciciosEstado, filtroExercicios]);

  const minDateTime = useMemo(() => {
    if (dataSelecionada === today) {
      return new Date();
    }
    return undefined;
  }, [dataSelecionada, today]);

  const renderInputField = (set, setIndex, index, field, icon) => {
    const value = set[field] || '';
    const placeholderText = field.charAt(0).toUpperCase() + field.slice(1);
    const keyboardType = ['reps', 'peso', 'inclinacao', 'distancia', 'cadencia'].includes(field) ? 'numeric' : 'default';

    const IconComponent = icon === 'dumbbell' ? FontAwesome5 : Feather;
    const iconName = icon;

    return (
      <View key={field} style={localStyles.setDetailField}>
        <IconComponent name={iconName} size={16} color={Colors.placeholder} />
        <TextInput
          style={localStyles.setDetailInput}
          placeholder={placeholderText}
          placeholderTextColor={Colors.placeholder}
          value={value.toString()}
          onChangeText={(newValue) => atualizarSet(index, setIndex, field, newValue)}
          keyboardType={keyboardType}
        />
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={localStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={localStyles.safeArea}>
          <AppHeader
            title="Criar e Agendar Treino"
            showBackButton={currentStep > 1}
            onBackPress={handleGoBack}
            adminInfo={adminInfo}
          />
          {loadingExercises && (
            <View style={localStyles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={localStyles.loadingText}>A carregar dados...</Text>
            </View>
          )}
          <FlatList
            data={exercicios}
            renderItem={({ item, index }) => (
              <View style={localStyles.exercicioCard}>
                <TouchableOpacity onPress={() => toggleExpandExercicio(index)} style={localStyles.exercicioHeader}>
                  <Feather name={item.isExpanded ? "chevron-up" : "chevron-down"} size={24} color={Colors.primary} />
                  <Text style={localStyles.exercicioNome}>{item.name || 'Novo Exercício'}</Text>
                  <TouchableOpacity onPress={() => removerExercicio(index)}>
                    <Feather name="x-circle" size={24} color={Colors.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
                {item.isExpanded && (
                  <View style={localStyles.exercicioDetails}>
                    <TouchableOpacity onPress={() => abrirModalSelecionarExercicio(index)} style={localStyles.selectExerciseButton}>
                      <Text style={localStyles.selectExerciseButtonText}>
                        {item.name || 'Selecionar Exercício da Biblioteca'}
                      </Text>
                      <Feather name="search" size={20} color={Colors.cardBackground} />
                    </TouchableOpacity>
                    
                    {item.description && (
                      <View style={localStyles.detailRow}>
                        <Feather name="info" size={16} color={Colors.textSecondary} />
                        <Text style={localStyles.detailText}>{item.description}</Text>
                      </View>
                    )}
                    {item.targetMuscles && item.targetMuscles.length > 0 && (
                      <View style={localStyles.detailRow}>
                        <FontAwesome5 name="dumbbell" size={16} color={Colors.textSecondary} />
                        <Text style={localStyles.detailText}>
                          Músculos-alvo: {item.targetMuscles.join(', ')}
                        </Text>
                      </View>
                    )}
                    {item.equipment && item.equipment.length > 0 && (
                      <View style={localStyles.detailRow}>
                        <Feather name="tool" size={16} color={Colors.textSecondary} />
                        <Text style={localStyles.detailText}>
                          Equipamento: {item.equipment.join(', ')}
                        </Text>
                      </View>
                    )}
          
                    <InlineWorkoutDetailsInput
                      placeholder="Observações do Exercício (opcional)"
                      value={item.notes}
                      onChangeText={(text) => atualizarExercicio(index, 'notes', text)}
                      multiline
                      icon="message-square"
                      style={localStyles.inlineNotesInput}
                    />
          
                    <View style={localStyles.seriesContainer}>
                      {(item.setDetails || []).map((set, setIndex) => {
                        const currentSeriesType = set?.seriesType || 'reps_and_load';
                        const fieldsToRender = seriesTypes[currentSeriesType]?.fields || [];
                        const iconsToRender = seriesTypes[currentSeriesType]?.icons || [];
          
                        return (
                          <View key={set?.id || setIndex} style={localStyles.setCard}>
                            <View style={localStyles.setCardHeader}>
                              <Text style={localStyles.setCardTitle}>Série {setIndex + 1}</Text>
                              <TouchableOpacity onPress={() => removerSet(index, setIndex)}>
                                <Feather name="minus-circle" size={20} color={Colors.danger} />
                              </TouchableOpacity>
                            </View>
                            <View style={localStyles.pickerContainerSet}>
                              <Picker
                                selectedValue={currentSeriesType}
                                onValueChange={(itemValue) => atualizarSet(index, setIndex, 'seriesType', itemValue)}
                                style={localStyles.pickerSet}
                                dropdownIconColor={Colors.textPrimary}
                              >
                                {Object.keys(seriesTypes).map(type => (
                                  <Picker.Item key={type} label={seriesTypes[type].label} value={type} />
                                ))}
                              </Picker>
                            </View>
                            <View style={localStyles.setDetailsGrid}>
                              {fieldsToRender.map((field, fieldIndex) =>
                                renderInputField(set, setIndex, index, field, iconsToRender[fieldIndex])
                              )}
                            </View>
                          </View>
                        );
                      })}
                      <TouchableOpacity style={localStyles.addSetButton} onPress={() => adicionarNovaSerie(index, selectedSeriesType)}>
                        <Feather name="plus-circle" size={16} color={Colors.cardBackground} />
                        <Text style={localStyles.addSetButtonText}>Adicionar Série</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
            keyExtractor={(item) => item.customExerciseId || item.id}
            contentContainerStyle={localStyles.flatListContent}
            ListHeaderComponent={
              <MemoizedListHeader
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                handleGoBack={handleGoBack}
                clienteSelecionado={clienteSelecionado}
                setModalClientesVisible={setModalClientesVisible}
                obterNomeCliente={obterNomeCliente}
                dataSelecionada={dataSelecionada}
                setDataSelecionada={setDataSelecionada}
                markedDatesForCalendar={markedDatesForCalendar}
                mostrarPickerHora={mostrarPickerHora}
                setMostrarPickerHora={setMostrarPickerHora}
                horaSelecionada={horaSelecionada}
                onChangeHora={onChangeHora}
                isCreatingFromScratch={isCreatingFromScratch}
                setIsCreatingFromScratch={setIsCreatingFromScratch}
                setSelectedWorkoutTemplate={setSelectedWorkoutTemplate}
                setIsTemplateSelectionModalVisible={setIsTemplateSelectionModalVisible}
                nome={nome}
                setNome={setNome}
                descricao={descricao}
                setDescricao={setDescricao}
                categoria={categoria}
                setCategoria={setCategoria}
                saveAsTemplate={saveAsTemplate}
                setSaveAsTemplate={setSaveAsTemplate}
                newTemplateName={newTemplateName}
                setNewTemplateName={setNewTemplateName}
                newTemplateDescription={newTemplateDescription}
                setNewTemplateDescription={setNewTemplateDescription}
                adicionarExercicio={adicionarExercicio}
                selectedWorkoutTemplate={selectedWorkoutTemplate}
                isCategoryModalVisible={isCategoryModalVisible}
                setIsCategoryModalVisible={setIsCategoryModalVisible}
                minDate={today}
                minDateTime={minDateTime}
                handleGoToStep5={handleGoToStep5}
              />
            }
            keyboardShouldPersistTaps="handled"
          />

          {currentStep === 5 && exercicios.length > 0 && clienteSelecionado && (isCreatingFromScratch || selectedWorkoutTemplate) && (
            <View style={localStyles.bottomBar}>
              <TouchableOpacity style={localStyles.criarTreinoButton} onPress={handleCriarTreino}>
                <Text style={localStyles.criarTreinoButtonText}>Criar e Agendar Treino</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Modal para selecionar cliente */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalClientesVisible}
            onRequestClose={() => setModalClientesVisible(false)}
          >
            <View style={localStyles.centeredView}>
              <View style={localStyles.modalView}>
                <Text style={localStyles.modalTitle}>Selecionar Cliente</Text>
                <FlatList
                  data={clientes}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={localStyles.modalItem}
                      onPress={() => selecionarCliente(item)}
                    >
                      <Text style={localStyles.modalItemText}>{obterNomeCliente(item)}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={localStyles.noItemsText}>Nenhum cliente encontrado.</Text>
                  )}
                />
                <TouchableOpacity
                  style={localStyles.modalCloseButton}
                  onPress={() => setModalClientesVisible(false)}
                >
                  <Text style={localStyles.modalCloseButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Modal para biblioteca de exercícios */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalListaExerciciosVisible}
            onRequestClose={() => setModalListaExerciciosVisible(false)}
          >
            <View style={localStyles.centeredView}>
              <View style={localStyles.modalView}>
                <View style={localStyles.modalHeader}>
                  <Text style={localStyles.modalTitle}>Biblioteca de Exercícios</Text>
                  <TouchableOpacity onPress={() => setModalListaExerciciosVisible(false)}>
                    <Feather name="x" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={localStyles.searchBar}
                  placeholder="Pesquisar exercício..."
                  placeholderTextColor={Colors.placeholder}
                  value={filtroExercicios}
                  onChangeText={setFiltroExercicios}
                />
                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                  <TextInput
                    style={[localStyles.searchBar, { flex: 1, marginRight: 10 }]}
                    placeholder="Nome de novo exercício"
                    placeholderTextColor={Colors.placeholder}
                    value={novoExercicioNome}
                    onChangeText={setNovoExercicioNome}
                  />
                  <TouchableOpacity style={localStyles.addCustomExerciseButton} onPress={adicionarNovoExercicioESelecionar}>
                    <Feather name="plus" size={20} color={Colors.cardBackground} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={filteredExercises}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={localStyles.exercicioBibliotecaCard}
                      onPress={() => selecionarExercicioDaLista(item)}
                    >
                      <View style={localStyles.exercicioBibliotecaInfo}>
                        <Text style={localStyles.exercicioBibliotecaNome}>{item.name}</Text>
                        <View style={localStyles.exercicioBibliotecaCategoriaContainer}>
                          <Feather name="hash" size={14} color={Colors.textSecondary} />
                          <Text style={localStyles.exercicioBibliotecaCategoria}>{item.category}</Text>
                        </View>
                        {item.description && (
                          <Text style={localStyles.exercicioBibliotecaDescricao}>{item.description}</Text>
                        )}
                        {item.targetMuscles && item.targetMuscles.length > 0 && (
                          <View style={localStyles.exercicioBibliotecaDetailRow}>
                            <FontAwesome5 name="dumbbell" size={14} color={Colors.textSecondary} />
                            <Text style={localStyles.exercicioBibliotecaDetailText}>
                              {item.targetMuscles.join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={localStyles.noItemsText}>Nenhum exercício encontrado.</Text>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Modal para selecionar modelos de treino */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isTemplateSelectionModalVisible}
            onRequestClose={() => setIsTemplateSelectionModalVisible(false)}
          >
            <View style={localStyles.centeredView}>
              <View style={localStyles.modalView}>
                <View style={localStyles.modalHeader}>
                  <Text style={localStyles.modalTitle}>Modelos de Treino</Text>
                  <TouchableOpacity onPress={() => setIsTemplateSelectionModalVisible(false)}>
                    <Feather name="x" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={workoutTemplates}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={localStyles.modalItem}
                      onPress={() => handleTemplateSelect(item)}
                    >
                      <Text style={localStyles.modalItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <Text style={localStyles.noItemsText}>Nenhum modelo de treino encontrado.</Text>
                  )}
                />
              </View>
            </View>
          </Modal>

          {/* Modal para selecionar categoria */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={isCategoryModalVisible}
            onRequestClose={() => setIsCategoryModalVisible(false)}
          >
            <View style={localStyles.centeredView}>
              <View style={localStyles.modalView}>
                <View style={localStyles.modalHeader}>
                  <Text style={localStyles.modalTitle}>Selecionar Categoria</Text>
                  <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                    <Feather name="x" size={24} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                {categorias.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={localStyles.modalItem}
                    onPress={() => {
                      setCategoria(cat);
                      setIsCategoryModalVisible(false);
                    }}
                  >
                    <Text style={localStyles.modalItemText}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>

        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
      flex: 1,
      backgroundColor: Colors.background,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
  headerContainer: {
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.cardBackground,
  },
  headerRight: {
    position: 'absolute',
    right: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 242, 245, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  flatListContent: {
    padding: 15,
    paddingBottom: 100,
  },
  listHeaderContainer: {
    marginBottom: 20,
  },
  listFooterContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  clientSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
  },
  selectedClientText: {
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  selectClientButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  selectClientButtonText: {
    color: Colors.cardBackground,
    fontWeight: 'bold',
    fontSize: 14,
  },
  nextStepButton: {
    backgroundColor: Colors.secondary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  nextStepButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  calendar: {
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  dateTimePicker: {
    backgroundColor: Colors.cardBackground,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  pickerConfirmButton: {
    marginTop: 15,
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  pickerConfirmButtonText: {
    color: Colors.cardBackground,
    fontWeight: 'bold',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionButtonText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  workoutTypeIcon: {
    width: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  inputIconLeft: {
    marginRight: 10,
    marginTop: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    padding: 0,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inlineNotesInput: {
    minHeight: 50, // Altura padrão reduzida
    textAlignVertical: 'top',
    paddingTop: 10,
    paddingBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  addExerciseButtonText: {
    color: Colors.cardBackground,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  buttonIconLeft: {
    marginRight: 10,
  },
  saveAsTemplateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  saveAsTemplateText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  criarTreinoButton: {
    backgroundColor: Colors.secondary,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  criarTreinoButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  exercicioCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exercicioNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
    marginLeft: 10,
  },
  exercicioDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  seriesContainer: {
    marginTop: 10,
  },
  setCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  setCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  setCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pickerContainerSet: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.placeholder,
    marginBottom: 10,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerSet: {
    color: Colors.textPrimary,
  },
  setDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  setDetailField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.placeholder,
    width: '48%',
    marginBottom: 8,
  },
  setDetailInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 5,
    paddingVertical: 0,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  addSetButtonText: {
    color: Colors.cardBackground,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: Colors.cardBackground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noItemsText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 20,
  },
  searchBar: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.placeholder,
  },
  addCustomExerciseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectExerciseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectExerciseButtonText: {
    color: Colors.cardBackground,
    fontWeight: 'bold',
    fontSize: 16,
  },
  exercicioBibliotecaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  exercicioBibliotecaInfo: {
    flex: 1,
    marginRight: 10,
  },
  exercicioBibliotecaNome: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  exercicioBibliotecaCategoriaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  exercicioBibliotecaCategoria: {
    marginLeft: 5,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  exercicioBibliotecaDescricao: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  exercicioBibliotecaDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  exercicioBibliotecaDetailText: {
    marginLeft: 5,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});