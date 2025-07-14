import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Alert,
  KeyboardAvoidingView,
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

// IMPORTANTE: Adicionar 'Timestamp' e 'doc', 'setDoc', 'getDoc' para interagir com a coleção 'agenda'
import { db } from '../../services/firebaseConfig'; 
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, collectionGroup, Timestamp, doc, setDoc, getDoc } from 'firebase/firestore'; 

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core'];

const listaExercicios = [
  'Abdução de pernas na máquina (sentado ou em pé)', 'Abdominais crunch', 'Abdominais crunch invertido', 'Abdominais com bola suíça',
  'Abdominais na máquina', 'Abdominais na polia alta (joelhos no chão)', 'Ab wheel (roda abdominal)', 'Agachamento búlgaro',
  'Agachamento com barra', 'Agachamento com halteres', 'Agachamento com kettlebell (goblet squat)', 'Agachamento frontal',
  'Agachamento hack (máquina)', 'Agachamento no Smith', 'Agachamento sumô com halteres ou barra', 'Avanço com halteres',
  'Avanço no Smith', 'Barra fixa (pull-up)', 'Barra fixa com pegada supinada (chin-up)', 'Barra guiada (Smith machine)',
  'Battle ropes (cordas ondulatórias)', 'Bicicleta ergométrica', 'Bíceps alternado com halteres', 'Bíceps com barra reta ou W',
  'Bíceps concentrado', 'Bíceps na máquina Scott', 'Bíceps na polia baixa', 'Bíceps rosca martelo', 'Bíceps rosca direta',
  'Box jump (salto à caixa)', 'Burpees', 'Cadeira abdutora', 'Cadeira adutora', 'Cadeira extensora',
  'Cadeira flexora (deitado ou sentado)', 'Caminhada inclinada na passadeira', 'Caminhada na esteira', 'Clean com barra ou halteres',
  'Climber (escalador)', 'Corrida ao ar livre', 'Corrida na passadeira', 'Corda naval', 'Corda para pular',
  'Crucifixo com halteres (reto ou inclinado)', 'Crucifixo invertido (posterior de ombro)', 'Crucifixo na máquina peck deck',
  'Cross over na polia', 'Cross trainer (elíptica)', 'Crunch oblíquo', 'Deadlift (levantamento terra tradicional)',
  'Deadlift romeno (stiff)', 'Deadlift sumô', 'Desenvolvimento com barra', 'Desenvolvimento com halteres (ombros)',
  'Desenvolvimento na máquina', 'Dumbbell press (ombros ou peito)', 'Dumbbell snatch (arranco com halteres)', 'Dumbbell swing',
  'Elevação de panturrilhas em pé', 'Elevação de panturrilhas sentado', 'Elevação de pernas (no solo ou paralelas)',
  'Elevação de pernas suspenso', 'Elevação frontal com halteres', 'Elevação lateral com halteres', 'Escalador (mountain climber)',
  'Escalador vertical (máquina)', 'Escapulamento na polia (scapula pull)', 'Face pull na polia (ombros e costas)',
  'Farmer’s walk (caminhada com halteres ou kettlebells)', 'Flexão de braços com joelhos no chão', 'Flexão de braços inclinada',
  'Flexão de braços tradicional', 'Flexora deitada (máquina)', 'Flexora sentada', 'Fly peitoral com cabos',
  'Fly peitoral com halteres', 'Front squat (agachamento frontal)', 'Gêmeos na leg press', 'Gêmeos na máquina em pé',
  'Gêmeos na máquina sentado', 'Glúteo na máquina', 'Glúteo na polia', 'Glute bridge (elevação de quadril)',
  'Glute bridge com barra (hip thrust)', 'Goblet squat', 'Good morning (com barra ou halteres)', 'Hack squat (máquina)',
  'Hammer curl (rosca martelo)', 'High knees (corrida no lugar com joelhos altos)', 'Hip thrust com barra',
  'Hiperextensão lombar (banco 45º ou solo)', 'Hollow hold (abdominal isométrico)',
  'Incline bench press (supino inclinado com barra ou halteres)', 'Incline curl (rosca bíceps em banco inclinado)',
  'Isometria abdominal', 'Isometria de prancha', 'Jump lunge (avanço com salto)', 'Jump squat', 'Jumping jacks',
  'Landmine press (barra presa de um lado)', 'Lateral raise (elevação lateral)', 'Leg curl sentado', 'Leg press 45º',
  'Leg press horizontal', 'L-sit (paralela ou chão)', 'Lunge com barra', 'Lunge frontal', 'Lunge lateral', 'Lunge reverso',
  'Máquina adutora/abdutora', 'Máquina de bíceps/tríceps', 'Máquina de glúteo', 'Máquina de remada baixa',
  'Máquina de remada unilateral', 'Mountain climbers', 'Natação (cardio funcional)',
  'Neutral grip pull-up (barra fixa com pegada neutra)', 'Nórdicos (nordic hamstring curl – posterior de coxa)',
  'Panturrilha na leg press', 'Paralelas (dips)', 'Passada com halteres', 'Pêndulo (swings com kettlebell)', 'Peck deck',
  'Planche hold (avançado)', 'Pliometria (caixa, saltos)', 'Prancha abdominal', 'Prancha lateral',
  'Pull-over com halteres', 'Pull-up (barra fixa)', 'Pulley frente (puxada na polia)',
  'Push press (com barra ou halteres)', 'Quadríceps na extensora', 'Quadrupede diagonal (abdominal funcional)',
  'Remada alta na polia', 'Remada baixa na polia', 'Remada cavalinho (T-bar row)', 'Remada com halteres unilateral',
  'Remada curvada com barra', 'Remada no TRX', 'Remo na máquina', 'Rosca 21', 'Rosca concentrada', 'Rosca direta',
  'Rosca martelo', 'Shoulder press com halteres ou barra', 'Shoulder shrug (encolhimento de ombros)',
  'Smith machine (exercícios guiados)', 'Sprints (corrida curta e rápida)', 'Squat jump', 'Step-up com halteres',
  'Stiff com barra', 'Stiff com halteres', 'Supino declinado', 'Supino inclinado com barra',
  'Supino inclinado com halteres', 'Supino na máquina', 'Supino reto com barra', 'Supino reto com halteres',
  'Swing com kettlebell', 'T-Bar row (remada cavalinho)', 'TRX push-up', 'TRX row (remada no TRX)', 'TRX Y-fly',
  'Treino intervalado HIIT', 'Tríceps mergulho em banco (bench dips)', 'Tríceps na máquina',
  'Tríceps na polia (barra ou corda)', 'Tríceps testa com barra ou halteres',
  'Underhand row (remada com pegada supinada)', 'Upright row (remada alta)', 'V-sit abdominal',
  'Voador inverso (posterior de ombro)', 'Voador peitoral', 'Walking lunge (passada andando)',
  'Wall ball (bola contra parede)', 'Wall sit (isometria de pernas)', 'Weight plate front raise (com anilha)',
  'Windshield wipers (abdominais oblíquos avançados)',
];

export default function CriarTreinosScreen() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalClientesVisible, setModalClientesVisible] = useState(false);
  const [listaExerciciosEstado, setListaExerciciosEstado] = useState(listaExercicios);
  const [filtroExercicios, setFiltroExercicios] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [exercicios, setExercicios] = useState([]);

  const [novoExercicioNome, setNovoExercicioNome] = useState('');

  const [treinos, setTreinos] = useState([]); // Este estado é para os treinos detalhados

  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);

  const carregarClientesETreinos = useCallback(async () => {
    try {
      const listaClientes = await buscarClientes();
      setClientes(listaClientes);

      // Não precisamos de buscar todos os treinos detalhados aqui para o calendário do admin.
      // A marcação no calendário será feita pela coleção 'agenda'.
      // No entanto, se 'treinos' aqui se refere a algo que você usa no CriarTreinosScreen, mantenha.
      const listaTreinos = await buscarTodosTreinosComNomes(); // Isso busca os treinos detalhados
      setTreinos(listaTreinos);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Tente novamente mais tarde.');
    }
  }, []);

  useEffect(() => {
    carregarClientesETreinos();
  }, [carregarClientesETreinos]);

  // A lógica de marcar datas no calendário do CriarTreinosScreen.js
  // pode ser baseada nos treinos detalhados que já existem.
  const markedDates = useCallback(() => {
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
          dots: [{ key: 'treino', color: '#4f46e5' }],
          treinoCount: 1,
          customStyles: {
            container: {
              backgroundColor: '#fff8e1',
              borderRadius: 10,
            },
            text: {
              color: '#4f46e5', // Cor do texto para datas marcadas
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

  const markedDatesForCalendar = markedDates(); // Renomeado para evitar conflito

  const adicionarExercicio = () => {
    setExercicios((prev) => [...prev, { nome: '', tipo: 'reps', valor: '' }]);
  };

  const atualizarExercicio = (index, campo, valor) => {
    const novos = [...exercicios];
    novos[index][campo] = valor;
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
  };

  const handleCriarTreino = async () => {
    if (
      !clienteSelecionado ||
      !nome.trim() ||
      !descricao.trim() ||
      !dataSelecionada ||
      !horaSelecionada ||
      !categoria ||
      exercicios.length === 0 ||
      exercicios.some((e) => !e.nome.trim() || !e.valor.trim())
    ) {
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos e adicione pelo menos um exercício com nome e valor.');
      return;
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
      // 1. Salvar o treino detalhado na sua coleção de treinos (ex: 'treinos' ou 'treinosClientes')
      await criarTreinoParaCliente({
        userId: clienteSelecionado.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        data: Timestamp.fromDate(dataHora), // Guarda como Timestamp nativo do Firestore
        categoria,
        criadoEm: Timestamp.now(), // Guarda a data de criação como Timestamp
        exercicios,
      });

      // 2. Criar/Atualizar uma entrada sumária na coleção 'agenda' para marcar no calendário do admin
      const agendaDocRef = doc(db, 'agenda', dataSelecionada); // Documento para a data YYYY-MM-DD
      const agendaDocSnap = await getDoc(agendaDocRef);
      let currentTreinosInAgenda = [];

      if (agendaDocSnap.exists()) {
          // Filtra itens nulos/undefined e garante que 'treinos' é um array
          currentTreinosInAgenda = (agendaDocSnap.data().treinos || []).filter(Boolean);
      }

      const novoTreinoAgendaSumario = {
          id: Date.now().toString(), // ID único para este item na agenda
          clienteId: clienteSelecionado.id,
          clienteNome: clienteSelecionado.name || clienteSelecionado.nome || 'Cliente Desconhecido', // Fallback para nome
          tipo: categoria, // A categoria do treino detalhado vira o tipo na agenda
          observacoes: descricao.trim(), // A descrição do treino detalhado vira observações na agenda
          urgente: false, // Por padrão, treinos detalhados não são marcados como urgentes aqui
          dataAgendada: dataSelecionada, // Data no formato YYYY-MM-DD
          hora: horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // ====================================================================
          // ADIÇÃO CRÍTICA: Campo para distinguir o tipo de agendamento na agenda
          // ====================================================================
          tipoAgendamento: 'treinoCompleto', 
      };

      const updatedTreinosInAgenda = [...currentTreinosInAgenda, novoTreinoAgendaSumario];

      await setDoc(agendaDocRef, {
          treinos: updatedTreinosInAgenda,
      }, { merge: true }); // Usar merge para não apagar notas ou avaliações existentes

      Alert.alert('Sucesso', '✅ Treino criado e agendado com sucesso!');

      // Atualiza a lista de treinos detalhados para o calendário local (se necessário)
      const listaTreinosAtualizada = await buscarTodosTreinosComNomes();
      setTreinos(listaTreinosAtualizada);

      limparFormulario();
      setDataSelecionada(''); // Limpa a data selecionada no calendário de criação
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
  };

  const abrirModalSelecionarExercicio = (index) => {
    setExercicioSelecionadoIndex(index);
    setModalListaExerciciosVisible(true);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

  const selecionarExercicioDaLista = (nomeExercicio) => {
    if (exercicioSelecionadoIndex === null) return;
    atualizarExercicio(exercicioSelecionadoIndex, 'nome', nomeExercicio);
    setModalListaExerciciosVisible(false);
    setExercicioSelecionadoIndex(null);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

  const adicionarNovoExercicioESelecionar = () => {
    const nomeNovo = novoExercicioNome.trim();
    if (!nomeNovo) {
      Alert.alert('Nome inválido', 'Por favor, digite um nome válido para o exercício.');
      return;
    }
    if (listaExerciciosEstado.some(ex => ex.toLowerCase() === nomeNovo.toLowerCase())) {
      Alert.alert('Exercício existente', 'Este exercício já está na lista.');
      return;
    }

    const updatedList = [...listaExerciciosEstado, nomeNovo];
    setListaExerciciosEstado(updatedList);
    selecionarExercicioDaLista(nomeNovo);
    setNovoExercicioNome('');
  };

  const renderTimePicker = () => {
    if (Platform.OS === 'ios') {
      return (
        <Modal
          visible={mostrarPickerHora}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMostrarPickerHora(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <DateTimePicker
                value={horaSelecionada || new Date()}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={onChangeHora}
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                style={styles.pickerConfirmButton}
                onPress={() => setMostrarPickerHora(false)}
              >
                <Text style={styles.pickerConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    } else {
      return (
        mostrarPickerHora && (
          <DateTimePicker
            value={horaSelecionada || new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onChangeHora}
          />
        )
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Criar Treino</Text>

        <Text style={styles.label}>Selecionar Data:</Text>
        <Calendar
          onDayPress={(day) => {
            setDataSelecionada(day.dateString);
          }}
          markedDates={{
            ...markedDatesForCalendar, // Usar o nome renomeado
            ...(dataSelecionada
              ? {
                  [dataSelecionada]: {
                    selected: true,
                    selectedColor: '#d0a956',
                    ...(markedDatesForCalendar[dataSelecionada]?.customStyles || {}),
                  },
                }
              : {}),
          }}
          theme={{
            selectedDayBackgroundColor: '#d0a956',
            todayTextColor: '#4f46e5',
            arrowColor: '#4f46e5',
            textDayFontWeight: '600',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 13,
            dotColor: '#4f46e5',
          }}
          style={styles.calendar}
        />

        {dataSelecionada !== '' && (
          <>
            <TouchableOpacity
              onPress={() => {
                setDataSelecionada('');
                limparFormulario();
              }}
              style={styles.botaoVoltar}
            >
              <Feather name="arrow-left" size={18} color="#000" />
              <Text style={styles.textoBotaoVoltar}>Voltar ao calendário</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Cliente:</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setModalClientesVisible(true)}
            >
              <Text style={clienteSelecionado ? styles.selectedText : styles.placeholderText}>
                {clienteSelecionado
                  ? obterNomeCliente(clienteSelecionado)
                  : 'Selecionar cliente'}
              </Text>
              <Feather name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Modal
              visible={modalClientesVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setModalClientesVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                  <Text style={styles.modalTitle}>Selecionar Cliente</Text>
                  <ScrollView>
                    {clientes.length > 0 ? (
                      clientes.map((cliente, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.itemLista}
                          onPress={() => selecionarCliente(cliente)}
                        >
                          <Text style={styles.itemListaText}>{obterNomeCliente(cliente)}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.noItemsText}>Nenhum cliente encontrado.</Text>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setModalClientesVisible(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Fechar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <Text style={styles.label}>Nome do Treino:</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome do treino"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Descrição:</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descrição do treino"
              placeholderTextColor="#999"
              multiline
            />

            <Text style={styles.label}>Hora:</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setMostrarPickerHora(true)}
            >
              <Text style={horaSelecionada ? styles.selectedText : styles.placeholderText}>
                {horaSelecionada
                  ? horaSelecionada.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Selecionar hora'}
              </Text>
              <Feather name="clock" size={20} color="#666" />
            </TouchableOpacity>
            {renderTimePicker()}

            <Text style={styles.label}>Categoria:</Text>
            <View style={styles.categoriasContainer}>
              {categorias.map((cat) => {
                const selecionada = categoria === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoriaButton,
                      selecionada && styles.categoriaButtonSelected,
                    ]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text
                      style={[
                        styles.categoriaButtonText,
                        selecionada && styles.categoriaButtonTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 15 }]}>Exercícios:</Text>
            {exercicios.map((exercicio, idx) => (
              <View key={idx} style={styles.exercicioContainer}>
                <Text style={styles.label}>Nome do exercício:</Text>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => abrirModalSelecionarExercicio(idx)}
                >
                  <Text style={exercicio.nome ? styles.selectedText : styles.placeholderText}>
                    {exercicio.nome || 'Selecionar exercício'}
                  </Text>
                  <Feather name="list" size={20} color="#666" />
                </TouchableOpacity>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={[
                      styles.tipoButton,
                      exercicio.tipo === 'reps' && styles.tipoButtonSelected,
                    ]}
                    onPress={() => atualizarExercicio(idx, 'tipo', 'reps')}
                  >
                    <Text
                      style={[
                        styles.tipoButtonText,
                        exercicio.tipo === 'reps' && styles.tipoButtonTextSelected,
                      ]}
                    >
                      Repetições
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tipoButton,
                      exercicio.tipo === 'tempo' && styles.tipoButtonSelected,
                    ]}
                    onPress={() => atualizarExercicio(idx, 'tipo', 'tempo')}
                  >
                    <Text
                      style={[
                        styles.tipoButtonText,
                        exercicio.tipo === 'tempo' && styles.tipoButtonTextSelected,
                      ]}
                    >
                      Tempo (s)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>
                  {exercicio.tipo === 'reps' ? 'Quantidade de repetições:' : 'Tempo em segundos:'}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={exercicio.valor}
                  onChangeText={(text) => atualizarExercicio(idx, 'valor', text)}
                  placeholder={exercicio.tipo === 'reps' ? 'Ex: 10' : 'Ex: 30'}
                  placeholderTextColor="#999"
                />

                <TouchableOpacity
                  style={styles.removerExercicioButton}
                  onPress={() => removerExercicio(idx)}
                >
                  <Feather name="trash-2" size={18} color="red" />
                  <Text style={{ color: 'red', marginLeft: 5 }}>Remover exercício</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.adicionarExercicioButton}
              onPress={adicionarExercicio}
            >
              <Feather name="plus-circle" size={20} color="#d0a956" />
              <Text style={{ color: '#d0a956', fontWeight: '600', marginLeft: 5 }}>
                Adicionar exercício
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoCriar} onPress={handleCriarTreino}>
              <Text style={styles.textoBotaoCriar}>Criar Treino</Text>
            </TouchableOpacity>
          </>
        )}

        <Modal
          visible={modalListaExerciciosVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalListaExerciciosVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>Selecionar Exercício</Text>

              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Buscar exercício"
                placeholderTextColor="#999"
                value={filtroExercicios}
                onChangeText={setFiltroExercicios}
              />

              <TextInput
                style={[styles.input, { marginBottom: 10 }]}
                placeholder="Adicionar novo exercício (se não encontrar)"
                placeholderTextColor="#999"
                value={novoExercicioNome}
                onChangeText={setNovoExercicioNome}
              />

              <TouchableOpacity
                style={styles.adicionarExercicioButtonModal}
                onPress={adicionarNovoExercicioESelecionar}
              >
                <Feather name="plus" size={18} color="#d0a956" />
                <Text style={{ color: '#d0a956', fontWeight: '600', marginLeft: 5 }}>
                  Adicionar e selecionar
                </Text>
              </TouchableOpacity>

              <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
                {listaExerciciosEstado
                  .filter((exercicio) =>
                    exercicio.toLowerCase().includes(filtroExercicios.toLowerCase())
                  )
                  .map((exercicio, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.itemLista}
                      onPress={() => selecionarExercicioDaLista(exercicio)}
                    >
                      <Text style={styles.itemListaText}>{exercicio}</Text>
                    </TouchableOpacity>
                  ))}
                {listaExerciciosEstado.filter((exercicio) =>
                  exercicio.toLowerCase().includes(filtroExercicios.toLowerCase())
                ).length === 0 && (
                  <Text style={styles.noItemsText}>Nenhum exercício encontrado. Tente adicionar um novo.</Text>
                )}
              </ScrollView>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalListaExerciciosVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff8e1',
    flexGrow: 1,
  },
  adicionarExercicioButtonModal: {
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    color: '#d0a956',
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
    color: '#000',
  },
  calendar: {
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 5,
    padding: 10,
    marginTop: 6,
    backgroundColor: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 5,
    padding: 10,
    marginTop: 6,
    backgroundColor: 'white',
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  placeholderText: {
    color: '#999',
  },
  selectedText: {
    color: '#333',
  },
  categoriasContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  categoriaButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0a956',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  categoriaButtonSelected: {
    backgroundColor: '#d0a956',
  },
  categoriaButtonText: {
    color: '#d0a956',
    fontWeight: '600',
  },
  categoriaButtonTextSelected: {
    color: 'white',
  },
  exercicioContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#fdfcf7',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#d0a956',
    marginHorizontal: 5,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  tipoButtonSelected: {
    backgroundColor: '#d0a956',
  },
  tipoButtonText: {
    color: '#d0a956',
    fontWeight: '500',
  },
  tipoButtonTextSelected: {
    color: 'white',
  },
  removerExercicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'red',
  },
  adicionarExercicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0a956',
    marginTop: 10,
  },
  botaoCriar: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  textoBotaoCriar: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  textoBotaoVoltar: {
    color: '#000',
    marginLeft: 5,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#d0a956',
  },
  itemLista: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemListaText: {
    fontSize: 16,
    color: '#333',
  },
  noItemsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#999',
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingTop: 10,
    alignItems: 'center',
  },
  pickerConfirmButton: {
    backgroundColor: '#d0a956',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    marginBottom: 10,
  },
  pickerConfirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
