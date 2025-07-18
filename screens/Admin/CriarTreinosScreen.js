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
} from 'react-native';
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

import { db } from '../../services/firebaseConfig';
import { collection, query, onSnapshot, Timestamp, doc, setDoc, getDoc, addDoc, getDocs, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core', 'Outro'];

// Paleta de Cores Refinada
const Colors = {
  primaryGold: '#D4AF37', // Ouro clássico, agora mais como um acento forte
  darkBrown: '#3E2723',   // Marrom bem escuro para texto principal e elementos fortes
  lightBrown: '#795548',  // Marrom mais suave para elementos secundários ou botões de destaque
  creamBackground: '#FDF7E4', // Fundo creme claro e relaxante
  white: '#FFFFFF',
  lightGray: '#ECEFF1',   // Cinza muito claro para fundos de itens/headers
  mediumGray: '#B0BEC5',  // Cinza médio para placeholders e textos secundários
  darkGray: '#424242',    // Cinza escuro para labels
  accentBlue: '#2196F3',  // Azul vibrante para links/adição
  successGreen: '#4CAF50', // Verde para sucesso
  errorRed: '#F44366',    // Vermelho para erros/alertas (ligeiramente mais vibrante)
  inputBorder: '#D1D1D1', // Borda mais neutra para inputs
  darkGold: '#C0A020', // Um ouro ligeiramente mais escuro para estados ativos
};

// --- Função renderTimePicker movida para fora do componente ---
const renderTimePicker = ({ showPicker, value, onChange, onConfirm }) => {
  if (Platform.OS === 'ios') {
    return (
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={onConfirm}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <DateTimePicker
              value={value || new Date()}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={onChange}
              style={{ width: '100%' }}
            />
            <TouchableOpacity
              style={styles.pickerConfirmButton}
              onPress={onConfirm}
            >
              <Text style={styles.pickerConfirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  } else {
    return (
      showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={onChange}
        />
      )
    );
  }
};
// --- Fim da função renderTimePicker movida ---


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
  const [isChoosingWorkoutType, setIsChoosingWorkoutType] = useState(true);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [showGoBackButton, setShowGoBackButton] = useState(false);

  // --- Funções de Carregamento de Dados ---

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
    const q = query(exercisesColRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
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

  // --- Funções de Manipulação de UI e Dados ---

  const resetFormStates = () => {
    setNome('');
    setDescricao('');
    setHoraSelecionada(null);
    setCategoria('');
    setClienteSelecionado(null);
    setExercicios([]);
    setNovoExercicioNome('');
    setFiltroExercicios('');
    setSelectedWorkoutTemplate(null);
    setIsChoosingWorkoutType(true);
    setSaveAsTemplate(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setShowExerciseEditor(false);
    setShowGoBackButton(false); // Reset back button visibility
  };

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
          dots: [{ key: 'treino', color: Colors.primaryGold }],
          treinoCount: 1,
          customStyles: {
            container: {
              backgroundColor: Colors.creamBackground,
              borderRadius: 10,
            },
            text: {
              color: Colors.darkBrown,
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

  const markedDatesForCalendar = markedDates; // Use useMemo'd value

  const adicionarExercicio = () => {
    setExercicios((prev) => [...prev, {
      id: '', // ID do exercício da biblioteca (se selecionado)
      name: '', // Nome do exercício
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      animationUrl: '',
      imageUrl: '',
      tipo: 'reps', // <<< NOVO: Tipo de medida padrão
      valor: '', // Valor da medida (número de reps ou segundos)
      sets: '', // Número de séries
      rest: '', // Tempo de descanso
      notes: '', // Notas adicionais
      customExerciseId: Date.now().toString() + Math.random(), // ID único para o FlatList e remoção local
      isExpanded: true, // Novo: expande por padrão ao adicionar
    }]);
  };

  const atualizarExercicio = (index, campo, valor) => {
    const novos = [...exercicios];
    novos[index][campo] = valor;
    setExercicios(novos);
  };

  const toggleExpandExercicio = (index) => {
    const novos = [...exercicios];
    novos[index].isExpanded = !novos[index].isExpanded;
    setExercicios(novos);
  };

  const removerExercicio = (index) => {
    Alert.alert(
      'Remover Exercício',
      'Tem certeza que deseja remover este exercício?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: () => {
            const novos = [...exercicios];
            novos.splice(index, 1);
            setExercicios(novos);
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setHoraSelecionada(null);
    setCategoria('');
    setClienteSelecionado(null);
    setExercicios([]);
    setNovoExercicioNome('');
    setFiltroExercicios('');
    setSelectedWorkoutTemplate(null);
    setIsChoosingWorkoutType(true);
    setSaveAsTemplate(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setShowExerciseEditor(false);
    setShowGoBackButton(false); // Ensure button is hidden when form is cleared
  };

  // Função para comparar se dois arrays de exercícios são idênticos (ignorando IDs temporários)
  const areExercisesIdentical = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;

    // Criar cópias ordenadas e sem IDs temporários para comparação
    const normalizeAndSort = (arr) => {
      return arr.map(({ id, customExerciseId, templateExerciseId, isExpanded, ...rest }) => ({ // Remove IDs temporários e isExpanded
        ...rest,
        // Garante que 'valor' e 'repsOrDuration' são tratados de forma consistente
        repsOrDuration: rest.repsOrDuration || rest.valor,
        valor: rest.valor || rest.repsOrDuration,
        type: rest.type || rest.tipo, // Garante que o 'tipo' é consistente
        tipo: rest.tipo || rest.type,
      }))
        .sort((a, b) => (a.exerciseName || a.name || '').localeCompare(b.exerciseName || b.name || '')); // Ordena pelo nome do exercício
    };

    const normalizedArr1 = normalizeAndSort(arr1);
    const normalizedArr2 = normalizeAndSort(arr2);

    return JSON.stringify(normalizedArr1) === JSON.stringify(normalizedArr2);
  };

  const handleCriarTreino = async () => {
    if (!clienteSelecionado || !dataSelecionada || !horaSelecionada) {
      Alert.alert('Campos Obrigatórios', 'Por favor, selecione um cliente, uma data e uma hora.');
      return;
    }

    if (!nome.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, dê um nome para este agendamento de treino.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Campos Obrigatórios', 'Por favor, adicione uma descrição para este agendamento de treino.');
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

    // Validação para campos de exercício (agora condicionais)
    for (const ex of exercicios) {
      if (!ex.name.trim()) {
        Alert.alert('Campo Obrigatório', `O nome do exercício é obrigatório para todos os exercícios.`);
        return;
      }

      if (ex.tipo === 'reps' || ex.tipo === 'tempo') {
        if (!ex.sets.toString().trim()) {
          Alert.alert('Campos Obrigatórios', `O número de séries é obrigatório para o exercício "${ex.name}".`);
          return;
        }
        if (!ex.valor.trim()) { // 'valor' é reps ou duração
          Alert.alert('Campos Obrigatórios', `As repetições ou duração são obrigatórias para o exercício "${ex.name}".`);
          return;
        }
        // Se desejar que o descanso seja obrigatório quando reps/sets existem, descomente:
        /*
        if (!ex.rest.trim()) {
            Alert.alert('Campos Obrigatórios', `O tempo de descanso é obrigatório para o exercício "${ex.name}".`);
            return;
        }
        */
      }
      // Se ex.tipo for 'sem_medida', então sets, valor, rest NÃO são obrigatórios
    }

    let treinoDataToSave = {};
    let tipoAgendamento = '';
    let exercisesToSave = [];

    // Mapeia os exercícios do estado 'exercicios' para o formato de salvamento no Firestore
    const mappedExercises = exercicios.map(ex => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      sets: ex.tipo !== 'sem_medida' && ex.sets ? parseInt(ex.sets) : null, // Guarda null se não aplicável
      repsOrDuration: ex.tipo !== 'sem_medida' && ex.valor ? ex.valor : null, // Guarda null se não aplicável
      rest: ex.rest || null, // O descanso é sempre opcional no Firestore
      notes: ex.notes || '',
      type: ex.tipo, // Salva o tipo de medida
    }));

    // Verifica se o treino atual é idêntico a um modelo selecionado
    const isExactTemplate = selectedWorkoutTemplate && areExercisesIdentical(exercicios, selectedWorkoutTemplate.exercises);

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
      // Criar o documento de treino na coleção 'treinos' (apenas se for um treino personalizado/modificado)
      // Ou se for um modelo que foi alterado e salvo como novo treino completo
      await criarTreinoParaCliente({
        userId: clienteSelecionado.id,
        ...treinoDataToSave,
        data: Timestamp.fromDate(dataHora),
        criadoEm: Timestamp.now(),
      });

      // Atualizar o documento da agenda para o dia selecionado
      const agendaDocRef = doc(db, 'agenda', dataSelecionada);
      const agendaDocSnap = await getDoc(agendaDocRef);
      let currentTreinosInAgenda = [];

      if (agendaDocSnap.exists()) {
        currentTreinosInAgenda = (agendaDocSnap.data().treinos || []).filter(Boolean);
      }

      const novoTreinoAgendaSumario = {
        id: Date.now().toString(),
        clienteId: clienteSelecionado.id,
        clienteNome: clienteSelecionado.name || clienteSelecionado.nome || 'Cliente Desconhecido',
        tipo: treinoDataToSave.categoria,
        observacoes: treinoDataToSave.descricao,
        urgente: false,
        dataAgendada: dataSelecionada,
        hora: horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipoAgendamento: tipoAgendamento,
        // Adicionar detalhes específicos do tipo de agendamento para exibição na agenda
        ...(tipoAgendamento === 'modeloTreino' ? {
          templateId: treinoDataToSave.templateId,
          templateName: treinoDataToSave.templateName,
          templateDescription: treinoDataToSave.templateDescription,
          templateExercises: exercisesToSave,
        } : {
          customExercises: exercisesToSave,
        }),
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
  };

  const onChangeHora = (event, selectedTime) => {
    setMostrarPickerHora(Platform.OS === 'ios');
    if (selectedTime) {
      setHoraSelecionada(selectedTime);
    } else if (Platform.OS === 'android') {
      setMostrarPickerHora(false);
    }
  };

  const selecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setModalClientesVisible(false);
    setIsChoosingWorkoutType(true); // Always go back to choosing type after selecting client
    setShowExerciseEditor(false); // Hide editor until type is chosen
    setShowGoBackButton(false); // Hide "Go Back" button when client is selected or re-selected
  };

  const abrirModalSelecionarExercicio = (index) => {
    setExercicioSelecionadoIndex(index);
    setModalListaExerciciosVisible(true);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

  const selecionarExercicioDaLista = (exercicioDaBiblioteca) => {
    if (exercicioSelecionadoIndex === null) return;

    const novosExerciciosNoTreino = [...exercicios];
    novosExerciciosNoTreino[exercicioSelecionadoIndex] = {
      ...exercicioDaBiblioteca, // Copia todos os campos da biblioteca
      // Manter ou definir valores padrão para campos específicos do treino
      // Se o exercício da biblioteca tiver um 'type' predefinido, usá-lo, senão 'reps'
      tipo: exercicioDaBiblioteca.type || novosExerciciosNoTreino[exercicioSelecionadoIndex].tipo || 'reps',
      sets: novosExerciciosNoTreino[exercicioSelecionadoIndex].sets || '',
      valor: novosExerciciosNoTreino[exercicioSelecionadoIndex].valor || '',
      rest: novosExerciciosNoTreino[exercicioSelecionadoIndex].rest || '',
      notes: novosExerciciosNoTreino[exercicioSelecionadoIndex].notes || '',
      customExerciseId: novosExerciciosNoTreino[exercicioSelecionadoIndex].customExerciseId || Date.now().toString() + Math.random(),
      id: exercicioDaBiblioteca.id || '', // Garante que o ID do Firestore é usado
      isExpanded: true, // Quando seleciona da biblioteca, expande para edição
    };

    setExercicios(novosExerciciosNoTreino);
    setModalListaExerciciosVisible(false);
    setExercicioSelecionadoIndex(null);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

  const adicionarNovoExercicioESelecionar = async () => {
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
        description: '', // Pode ser preenchido posteriormente na biblioteca de exercícios
        category: 'Outro', // Categoria padrão
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
        type: 'reps', // Define o tipo padrão ao adicionar um novo
      });

      Alert.alert('Sucesso', `Exercício "${nomeNovo}" adicionado à biblioteca!`);

      const novoExercicioObjeto = {
        id: newExerciseRef.id,
        name: nomeNovo,
        description: '',
        category: 'Outro',
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
        tipo: 'reps', // Usa 'tipo' para o estado local
        valor: '',
        sets: '',
        rest: '',
        notes: '',
        customExerciseId: Date.now().toString() + Math.random(),
        isExpanded: true,
      };

      // Adiciona o novo exercício à lista de exercícios em cache para que ele apareça na próxima busca
      setListaExerciciosEstado(prev => [...prev, novoExercicioObjeto]);

      selecionarExercicioDaLista(novoExercicioObjeto);
      setNovoExercicioNome('');
    } catch (error) {
      console.error("Erro ao adicionar novo exercício ao Firestore:", error);
      Alert.alert('Erro', 'Não foi possível adicionar o novo exercício à biblioteca.');
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedWorkoutTemplate(template);
    setNome(template.name || '');
    setDescricao(template.description || '');
    setCategoria(template.category || 'Treino Personalizado');

    setExercicios(template.exercises.map(ex => ({
      ...ex,
      name: ex.exerciseName || ex.name, // Garante que o nome do exercício é populado
      valor: ex.repsOrDuration || ex.valor,
      tipo: ex.type || ex.tipo || 'reps', // Garante que o tipo é carregado (padrão 'reps' se não existir)
      customExerciseId: ex.customExerciseId || Date.now().toString() + Math.random(),
      id: ex.exerciseId || ex.id, // Garante que o ID do Firestore é usado
      isExpanded: false, // Por padrão, exercícios de modelo vêm colapsados
    })));

    setIsTemplateSelectionModalVisible(false);
    setIsChoosingWorkoutType(false);
    setShowExerciseEditor(true); // Show the editor when a template is selected
    setShowGoBackButton(true); // Show back button after template selection
  };

  const handleGoBack = () => {
    setIsChoosingWorkoutType(true); // Go back to the workout type selection screen
    setShowExerciseEditor(false); // Hide the exercise editor
    setExercicios([]); // Clear exercises if going back from editor
    setSelectedWorkoutTemplate(null); // Clear selected template
    setNome(''); // Clear workout name/description/category
    setDescricao('');
    setCategoria('');
    setSaveAsTemplate(false);
    setNewTemplateName('');
    setNewTemplateDescription('');
    setShowGoBackButton(false); // Hide the "Go Back" button
  };


  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  // --- ListHeaderComponent for FlatList ---
  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.title}>Criar Novo Treino</Text>

      {/* Seção de Seleção de Cliente */}
      <View style={styles.sectionContainer}>
        <Text style={styles.label}>Cliente para Agendar Treino:</Text>
        <TouchableOpacity
          style={styles.selectInput}
          onPress={() => setModalClientesVisible(true)}
        >
          <Text style={clienteSelecionado ? styles.selectedText : styles.placeholderText}>
            {clienteSelecionado ? obterNomeCliente(clienteSelecionado) : 'Selecione um cliente'}
          </Text>
          <Feather name="chevron-right" size={20} color={Colors.darkGray} />
        </TouchableOpacity>
      </View>

      {/* Seção de Seleção de Data e Hora */}
      <View style={styles.sectionContainer}>
        <Text style={styles.label}>Data e Hora do Treino:</Text>
        <Calendar
          onDayPress={(day) => {
            setDataSelecionada(day.dateString);
            // Optionally reset other form states when date changes if desired
          }}
          markedDates={{
            ...markedDatesForCalendar,
            ...(dataSelecionada
              ? {
                [dataSelecionada]: {
                  selected: true,
                  selectedColor: Colors.primaryGold,
                  ...(markedDatesForCalendar[dataSelecionada]?.customStyles || {}),
                },
              }
              : {}),
          }}
          theme={{
            selectedDayBackgroundColor: Colors.primaryGold,
            todayTextColor: Colors.primaryGold,
            arrowColor: Colors.primaryGold,
            textDayFontWeight: '600',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 18,
            backgroundColor: Colors.creamBackground,
            calendarBackground: Colors.white,
            dotColor: Colors.primaryGold,
            selectedDotColor: Colors.white,
            'stylesheet.calendar.header': {
              week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-around',
                borderBottomWidth: 1,
                borderBottomColor: Colors.lightGray,
                paddingBottom: 10,
              },
            },
          }}
          style={styles.calendarStyle}
        />

        <TouchableOpacity style={styles.timeInput} onPress={() => setMostrarPickerHora(true)}>
          <Text style={styles.timeInputText}>
            {horaSelecionada ? horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selecionar Hora'}
          </Text>
          <Feather name="clock" size={20} color={Colors.darkGray} />
        </TouchableOpacity>
        {renderTimePicker({
          showPicker: mostrarPickerHora,
          value: horaSelecionada,
          onChange: onChangeHora,
          onConfirm: () => setMostrarPickerHora(false),
        })}
      </View>

      {/* Seção de Detalhes do Treino (Nome, Descrição, Categoria) */}
      {clienteSelecionado && dataSelecionada && horaSelecionada && isChoosingWorkoutType && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Detalhes do Treino</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do Agendamento (ex: Treino de Força - Pernas)"
            placeholderTextColor={Colors.mediumGray}
            value={nome}
            onChangeText={setNome}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Descrição do Treino (ex: Foco em membros inferiores e core)"
            placeholderTextColor={Colors.mediumGray}
            value={descricao}
            onChangeText={setDescricao}
            multiline
          />
          <Text style={styles.label}>Categoria:</Text>
          <View style={styles.categoryContainer}>
            {categorias.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  categoria === cat && styles.categoryButtonSelected,
                ]}
                onPress={() => setCategoria(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    categoria === cat && styles.categoryButtonTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Opções de Criação: Novo ou de Modelo */}
          <View style={styles.workoutTypeSelection}>
            <TouchableOpacity
              style={styles.workoutTypeButton}
              onPress={() => {
                setIsChoosingWorkoutType(false);
                setShowExerciseEditor(true);
                setSelectedWorkoutTemplate(null);
                setExercicios([]); // Limpa exercícios se for criar novo
                setSaveAsTemplate(false);
                setNewTemplateName('');
                setNewTemplateDescription('');
                setShowGoBackButton(true); // Show back button after choosing "Criar do Zero"
              }}
            >
              <Text style={styles.workoutTypeButtonText}>Criar Treino do Zero</Text>
              <Feather name="edit" size={20} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.workoutTypeButton, { backgroundColor: Colors.lightBrown }]}
              onPress={() => setIsTemplateSelectionModalVisible(true)}
            >
              <Text style={styles.workoutTypeButtonText}>Usar Modelo Existente</Text>
              <Feather name="copy" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Seção de Edição de Exercícios */}
      {clienteSelecionado && dataSelecionada && horaSelecionada && !isChoosingWorkoutType && showExerciseEditor && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Exercícios do Treino</Text>
          {exercicios.length === 0 && (
            <Text style={styles.noExercisesText}>Nenhum exercício adicionado ainda.</Text>
          )}
        </View>
      )}
    </View>
  );

  // --- ListFooterComponent for FlatList (contains "Add Exercise" button and final actions) ---
  const renderFooter = () => {
    if (!clienteSelecionado || !dataSelecionada || !horaSelecionada || isChoosingWorkoutType || !showExerciseEditor) {
      return null; // Don't show footer until relevant sections are visible
    }

    return (
      <View style={styles.footerContent}>
        {showGoBackButton && (
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={handleGoBack}
          >
            <Feather name="arrow-left" size={20} color={Colors.darkBrown} />
            <Text style={styles.goBackButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={adicionarExercicio}
        >
          <Feather name="plus-circle" size={22} color={Colors.white} />
          <Text style={styles.addExerciseButtonText}>Adicionar Exercício</Text>
        </TouchableOpacity>

        {/* Toggle para Salvar como Modelo */}
        <View style={styles.templateSaveToggle}>
          <Text style={styles.templateSaveToggleText}>Salvar como novo modelo?</Text>
          <Switch
            trackColor={{ false: Colors.mediumGray, true: Colors.primaryGold }}
            thumbColor={saveAsTemplate ? Colors.white : Colors.white}
            onValueChange={setSaveAsTemplate}
            value={saveAsTemplate}
          />
        </View>

        {saveAsTemplate && (
          <View style={styles.templateInputs}>
            <TextInput
              style={styles.input}
              placeholder="Nome do Novo Modelo"
              placeholderTextColor={Colors.mediumGray}
              value={newTemplateName}
              onChangeText={setNewTemplateName}
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Descrição do Novo Modelo (opcional)"
              placeholderTextColor={Colors.mediumGray}
              value={newTemplateDescription}
              onChangeText={setNewTemplateDescription}
              multiline
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.createWorkoutButton}
          onPress={handleCriarTreino}
        >
          <Text style={styles.createWorkoutButtonText}>Agendar Treino</Text>
          <Feather name="check-circle" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>
    );
  };


  // --- Renderização do componente ---
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.creamBackground} />
        <View style={styles.header}>
          <Image
            source={require('../../assets/logo.jpeg')} // Ajuste o caminho da sua imagem
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{adminInitial}</Text>
            </View>
            <Text style={styles.userNameText}>Olá, {adminDisplayName}</Text>
          </View>
        </View>

        {/* FlatList as the primary container */}
        <FlatList
          data={clienteSelecionado && dataSelecionada && horaSelecionada && !isChoosingWorkoutType && showExerciseEditor ? exercicios : []}
          keyExtractor={(item) => item.customExerciseId}
          renderItem={({ item, index }) => (
            <View style={styles.exercicioItemContainer}>
              <TouchableOpacity style={styles.exercicioHeader} onPress={() => toggleExpandExercicio(index)}>
                <Text style={styles.exercicioItemTitle}>
                  {index + 1}. {item.name || 'Novo Exercício'}
                </Text>
                <Feather
                  name={item.isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={Colors.darkBrown}
                />
              </TouchableOpacity>

              {item.isExpanded && (
                <View style={styles.exercicioDetails}>
                  <TouchableOpacity
                    style={styles.selectExerciseButton}
                    onPress={() => abrirModalSelecionarExercicio(index)}
                  >
                    <Text style={styles.selectExerciseButtonText}>
                      {item.name ? `Mudar: ${item.name}` : 'Selecionar Exercício da Biblioteca'}
                    </Text>
                    <Feather name="search" size={18} color={Colors.white} />
                  </TouchableOpacity>

                  {/* Tipo de Medida */}
                  <Text style={styles.labelCampoExercicio}>Tipo de Medida:</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[styles.radioButton, item.tipo === 'reps' && styles.radioButtonSelected]}
                      onPress={() => atualizarExercicio(index, 'tipo', 'reps')}
                    >
                      <Text style={[styles.radioText, item.tipo === 'reps' && styles.radioTextSelected]}>Repetições</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioButton, item.tipo === 'tempo' && styles.radioButtonSelected]}
                      onPress={() => atualizarExercicio(index, 'tipo', 'tempo')}
                    >
                      <Text style={[styles.radioText, item.tipo === 'tempo' && styles.radioTextSelected]}>Tempo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioButton, item.tipo === 'sem_medida' && styles.radioButtonSelected]}
                      onPress={() => atualizarExercicio(index, 'tipo', 'sem_medida')}
                    >
                      <Text style={[styles.radioText, item.tipo === 'sem_medida' && styles.radioTextSelected]}>Sem Medida</Text>
                    </TouchableOpacity>
                  </View>

                  {item.tipo !== 'sem_medida' && (
                    <>
                      <Text style={styles.labelCampoExercicio}>Séries:</Text>
                      <TextInput
                        style={styles.inputExercicio}
                        keyboardType="numeric"
                        value={item.sets.toString()}
                        onChangeText={(text) => atualizarExercicio(index, 'sets', text)}
                        placeholder="Nº de Séries"
                        placeholderTextColor={Colors.mediumGray}
                      />

                      <Text style={styles.labelCampoExercicio}>{item.tipo === 'reps' ? 'Repetições:' : 'Duração (segundos):'}</Text>
                      <TextInput
                        style={styles.inputExercicio}
                        keyboardType="numeric"
                        value={item.valor.toString()}
                        onChangeText={(text) => atualizarExercicio(index, 'valor', text)}
                        placeholder={item.tipo === 'reps' ? 'Nº de Repetições' : 'Segundos'}
                        placeholderTextColor={Colors.mediumGray}
                      />
                    </>
                  )}

                  <Text style={styles.labelCampoExercicio}>Descanso (segundos):</Text>
                  <TextInput
                    style={styles.inputExercicio}
                    keyboardType="numeric"
                    value={item.rest.toString()}
                    onChangeText={(text) => atualizarExercicio(index, 'rest', text)}
                    placeholder="Segundos de Descanso (opcional)"
                    placeholderTextColor={Colors.mediumGray}
                  />

                  <Text style={styles.labelCampoExercicio}>Notas para o Cliente:</Text>
                  <TextInput
                    style={[styles.inputExercicio, styles.multilineInputExercicio]}
                    value={item.notes}
                    onChangeText={(text) => atualizarExercicio(index, 'notes', text)}
                    placeholder="Notas específicas para este exercício (opcional)"
                    placeholderTextColor={Colors.mediumGray}
                    multiline
                  />

                  <TouchableOpacity
                    onPress={() => removerExercicio(index)}
                    style={styles.removerExercicioButton}
                  >
                    <MaterialIcons name="delete" size={24} color={Colors.errorRed} />
                    <Text style={styles.removerExercicioText}>Remover Exercício</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.flatListContentContainer}
        />


        {/* Modais (unchanged, as they are separate components) */}

        {/* Modal de Seleção de Cliente */}
        <Modal
          visible={modalClientesVisible}
          animationType="slide"
          onRequestClose={() => setModalClientesVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <TouchableOpacity onPress={() => setModalClientesVisible(false)}>
                <Feather name="x" size={24} color={Colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor={Colors.mediumGray}
              onChangeText={(text) => {
                const filtered = clientes.filter(c =>
                  obterNomeCliente(c).toLowerCase().includes(text.toLowerCase())
                );
                setClientes(filtered); // This will filter the displayed list
                if (!text) carregarClientesETreinos(); // Reload full list if search cleared
              }}
            />
            {loadingExercises ? ( // Reuse loading state for clients initially
              <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.loadingIndicator} />
            ) : (
              <FlatList
                data={clientes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalListItem}
                    onPress={() => selecionarCliente(item)}
                  >
                    <Text style={styles.modalListItemText}>{obterNomeCliente(item)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.emptyListText}>Nenhum cliente encontrado.</Text>}
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Modal de Seleção de Exercícios da Biblioteca */}
        <Modal
          visible={modalListaExerciciosVisible}
          animationType="slide"
          onRequestClose={() => setModalListaExerciciosVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Exercício</Text>
              <TouchableOpacity onPress={() => setModalListaExerciciosVisible(false)}>
                <Feather name="x" size={24} color={Colors.darkBrown} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar ou adicionar novo exercício..."
              placeholderTextColor={Colors.mediumGray}
              value={filtroExercicios}
              onChangeText={setFiltroExercicios}
            />

            {loadingExercises ? (
              <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.loadingIndicator} />
            ) : (
              <FlatList
                data={listaExerciciosEstado.filter(ex =>
                  ex.name.toLowerCase().includes(filtroExercicios.toLowerCase())
                )}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalListItem}
                    onPress={() => selecionarExercicioDaLista(item)}
                  >
                    <Text style={styles.modalListItemText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyExerciseList}>
                    <Text style={styles.emptyListText}>
                      Nenhum exercício encontrado.
                    </Text>
                    {filtroExercicios.trim() !== '' && (
                      <TouchableOpacity
                        style={styles.addNewExerciseButton}
                        onPress={() => {
                          setNovoExercicioNome(filtroExercicios);
                          adicionarNovoExercicioESelecionar();
                        }}
                      >
                        <Feather name="plus" size={18} color={Colors.white} />
                        <Text style={styles.addNewExerciseButtonText}>
                          Adicionar "{filtroExercicios}" à biblioteca
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                }
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Modal de Seleção de Modelos de Treino */}
        <Modal
          visible={isTemplateSelectionModalVisible}
          animationType="slide"
          onRequestClose={() => setIsTemplateSelectionModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Modelo de Treino</Text>
              <TouchableOpacity onPress={() => setIsTemplateSelectionModalVisible(false)}>
                <Feather name="x" size={24} color={Colors.darkBrown} />
              </TouchableOpacity>
            </View>
            {workoutTemplates.length === 0 ? (
              <Text style={styles.emptyListText}>Nenhum modelo de treino disponível.</Text>
            ) : (
              <FlatList
                data={workoutTemplates}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalListItem}
                    onPress={() => handleSelectTemplate(item)}
                  >
                    <Text style={styles.modalListItemTitle}>{item.name}</Text>
                    <Text style={styles.modalListItemDescription}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
  },
  flatListContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerContent: {
    // Styles for the content within ListHeaderComponent
  },
  footerContent: {
    // Styles for the content within ListFooterComponent
    marginTop: 20, // Add some top margin to separate from the last exercise
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: Colors.white,
    borderBottomWidth: 0, // Removed border, using shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  headerLogo: {
    width: 130,
    height: 45,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.darkBrown,
  },
  title: {
    fontSize: 28, // Slightly larger title
    fontWeight: 'bold',
    color: Colors.darkBrown,
    textAlign: 'center',
    marginVertical: 25, // More vertical margin
  },
  sectionContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20, // Increased padding for more breathing room
    marginBottom: 25, // More space between sections
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Slightly more pronounced shadow
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4, // Increase elevation for Android
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkGray,
    marginBottom: 10, // More space below labels
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10, // Slightly more rounded corners
    padding: 14, // Increase input padding
    fontSize: 16,
    color: Colors.darkBrown,
    backgroundColor: Colors.white, // Changed from lightGray to white
    marginBottom: 18, // More space below inputs
    shadowColor: '#000', // Add subtle shadow to inputs
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  multilineInput: {
    minHeight: 100, // Slightly taller multiline input
    textAlignVertical: 'top',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    backgroundColor: Colors.white,
    marginBottom: 18,
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedText: {
    fontSize: 16,
    color: Colors.darkBrown,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.mediumGray,
  },
  calendarStyle: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20, // More space below calendar
    borderWidth: 1,
    borderColor: Colors.lightGray,
    padding: 5,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    backgroundColor: Colors.white,
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  timeInputText: {
    fontSize: 16,
    color: Colors.darkBrown,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  pickerConfirmButton: {
    backgroundColor: Colors.primaryGold,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    marginTop: 20,
  },
  pickerConfirmButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    justifyContent: 'center',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    margin: 5,
    backgroundColor: Colors.lightGray,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.primaryGold,
    borderColor: Colors.primaryGold,
  },
  categoryButtonText: {
    color: Colors.darkGray,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: Colors.white,
  },
  workoutTypeSelection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 20, // More padding
  },
  workoutTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.darkBrown,
    borderRadius: 12, // Match other elements
    paddingVertical: 18, // More vertical padding
    marginBottom: 12, // More space
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  workoutTypeButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  noExercisesText: {
    textAlign: 'center',
    color: Colors.mediumGray,
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  exercicioItemContainer: {
    backgroundColor: Colors.white, // Main container is white
    borderRadius: 12,
    marginBottom: 15, // More space between items
    overflow: 'hidden',
    borderWidth: 0, // Removed border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18, // More padding for header
    backgroundColor: Colors.lightGray, // Slight background for header
    // Removed borderBottomWidth as container handles shadow
  },
  exercicioItemTitle: {
    fontSize: 18, // Slightly larger title
    fontWeight: 'bold',
    color: Colors.darkBrown,
    flex: 1,
  },
  exercicioDetails: {
    padding: 18, // More padding for details
    backgroundColor: Colors.creamBackground,
  },
  labelCampoExercicio: {
    fontSize: 15, // Slightly larger font for labels
    fontWeight: '600',
    color: Colors.darkGray,
    marginTop: 12, // More margin
    marginBottom: 6,
  },
  inputExercicio: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 12, // More padding
    fontSize: 15,
    color: Colors.darkBrown,
    backgroundColor: Colors.white,
    marginBottom: 12, // More margin
  },
  multilineInputExercicio: {
    minHeight: 70, // Slightly taller
    textAlignVertical: 'top',
  },
  selectExerciseButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightBrown, // Changed to lightBrown
    borderRadius: 10,
    paddingVertical: 14, // More padding
    marginBottom: 20, // More margin
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  selectExerciseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18, // More margin
  },
  radioButton: {
    paddingVertical: 10, // More padding
    paddingHorizontal: 18, // More padding
    borderRadius: 25, // More rounded
    borderWidth: 1,
    borderColor: Colors.primaryGold,
    backgroundColor: Colors.white,
  },
  radioButtonSelected: {
    backgroundColor: Colors.primaryGold,
  },
  radioText: {
    color: Colors.primaryGold,
    fontWeight: '600',
  },
  radioTextSelected: {
    color: Colors.white,
  },
  removerExercicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.errorRed + '20', // Light red background
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 20, // More margin
  },
  removerExercicioText: {
    color: Colors.errorRed,
    fontSize: 16, // Slightly larger
    fontWeight: '600',
    marginLeft: 8,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryGold,
    borderRadius: 12,
    paddingVertical: 18,
    marginTop: 25, // More top margin
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  addExerciseButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  templateSaveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.inputBorder, // Changed border color
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  templateSaveToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkBrown,
  },
  templateInputs: {
    padding: 15, // More padding
    backgroundColor: Colors.lightGray,
    borderRadius: 10, // Match other elements
    marginBottom: 20, // More margin
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  createWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successGreen,
    borderRadius: 12,
    paddingVertical: 20, // Even more padding for primary action
    marginTop: 25,
    marginBottom: 40, // More bottom margin
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 }, // Stronger shadow
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  createWorkoutButtonText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
  },
  goBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 2,
  },
  goBackButtonText: {
    color: Colors.darkBrown,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },

  // Modals Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18, // More padding
    backgroundColor: Colors.white,
    borderBottomWidth: 0, // Removed border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 22, // Larger title
    fontWeight: 'bold',
    color: Colors.darkBrown,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 20, // Consistent horizontal margin
    marginVertical: 20, // Consistent vertical margin
    fontSize: 16,
    color: Colors.darkBrown,
    backgroundColor: Colors.white,
    shadowColor: '#000', // Add subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  modalListItem: {
    padding: 16, // Slightly more padding
    backgroundColor: Colors.white,
    marginHorizontal: 20, // Consistent horizontal margin
    marginBottom: 10, // More space between items
    borderRadius: 10, // Match other rounded elements
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Slightly more depth
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modalListItemText: {
    fontSize: 16,
    color: Colors.darkBrown,
  },
  modalListItemTitle: {
    fontSize: 17, // Slightly larger
    fontWeight: '600',
    color: Colors.darkBrown,
  },
  modalListItemDescription: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 4,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    color: Colors.mediumGray,
    fontSize: 16,
  },
  emptyExerciseList: {
    alignItems: 'center',
    marginTop: 20,
  },
  addNewExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentBlue,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  addNewExerciseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingIndicator: {
    marginTop: 50,
    color: Colors.primaryGold, // Consistent color
  },
});