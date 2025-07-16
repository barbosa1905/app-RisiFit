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
  ActivityIndicator,
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

import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, collectionGroup, Timestamp, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core'];

export default function CriarTreinosScreen() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalClientesVisible, setModalClientesVisible] = useState(false);
  // listaExerciciosEstado agora guarda objetos completos de exercícios da biblioteca
  const [listaExerciciosEstado, setListaExerciciosEstado] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [filtroExercicios, setFiltroExercicios] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [categoria, setCategoria] = useState('');
  // exercicios agora guarda objetos com nome, tipo, valor E os detalhes da biblioteca (como animationUrl)
  const [exercicios, setExercicios] = useState([]);

  const [novoExercicioNome, setNovoExercicioNome] = useState('');

  const [treinos, setTreinos] = useState([]);

  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);

  // Função para buscar exercícios completos do Firestore (não apenas nomes)
  const fetchExercisesFromFirestore = useCallback(() => {
    setLoadingExercises(true);
    const exercisesColRef = collection(db, 'exercises');
    const q = query(exercisesColRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Mapeia para objetos completos, incluindo id e todos os dados
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
    const unsubscribeExercises = fetchExercisesFromFirestore();
    carregarClientesETreinos();

    return () => {
      unsubscribeExercises();
    };
  }, [fetchExercisesFromFirestore, carregarClientesETreinos]);

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
              color: '#4f46e5',
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

  const markedDatesForCalendar = markedDates();

  const adicionarExercicio = () => {
    // Adiciona um objeto de exercício com campos iniciais, incluindo os da biblioteca
    setExercicios((prev) => [...prev, {
      id: '', // ID do exercício da biblioteca
      name: '', // Nome do exercício
      description: '', // Descrição da biblioteca
      category: '', // Categoria da biblioteca
      targetMuscles: [], // Músculos da biblioteca
      equipment: [], // Equipamento da biblioteca
      animationUrl: '', // URL da animação da biblioteca
      imageUrl: '', // URL da imagem da biblioteca
      tipo: 'reps', // Tipo de medida para o treino (reps/tempo)
      valor: '', // Valor da medida (número de reps ou segundos)
    }]);
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
      exercicios.some((e) => !e.name.trim() || !e.valor.trim()) // Verifica 'name' agora
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
      // Prepara os exercícios para serem guardados, removendo o 'id' local se não for necessário
      // e garantindo que a estrutura é a que queremos guardar
      const exerciciosParaGuardar = exercicios.map(ex => {
        const { id, ...rest } = ex; // Remove o 'id' que é apenas para uso local na app
        return rest;
      });

      await criarTreinoParaCliente({
        userId: clienteSelecionado.id,
        nome: nome.trim(),
        descricao: descricao.trim(),
        data: Timestamp.fromDate(dataHora),
        categoria,
        criadoEm: Timestamp.now(),
        exercicios: exerciciosParaGuardar, // Usa a lista de exercícios formatada
      });

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
        tipo: categoria,
        observacoes: descricao.trim(),
        urgente: false,
        dataAgendada: dataSelecionada,
        hora: horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipoAgendamento: 'treinoCompleto',
      };

      const updatedTreinosInAgenda = [...currentTreinosInAgenda, novoTreinoAgendaSumario];

      await setDoc(agendaDocRef, {
        treinos: updatedTreinosInAgenda,
      }, { merge: true });

      Alert.alert('Sucesso', '✅ Treino criado e agendado com sucesso!');

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
  };

  const abrirModalSelecionarExercicio = (index) => {
    setExercicioSelecionadoIndex(index);
    setModalListaExerciciosVisible(true);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

  // Esta função agora recebe o OBJETO COMPLETO do exercício da biblioteca
  const selecionarExercicioDaLista = (exercicioDaBiblioteca) => {
    if (exercicioSelecionadoIndex === null) return;

    // Cria uma cópia dos exercícios atuais
    const novosExerciciosNoTreino = [...exercicios];

    // Atualiza o exercício no treino com os detalhes da biblioteca
    novosExerciciosNoTreino[exercicioSelecionadoIndex] = {
      ...exercicioDaBiblioteca, // Copia todos os campos da biblioteca (id, name, description, animationUrl, imageUrl, etc.)
      tipo: novosExerciciosNoTreino[exercicioSelecionadoIndex].tipo || 'reps', // Mantém o tipo se já definido, senão padrão
      valor: novosExerciciosNoTreino[exercicioSelecionadoIndex].valor || '', // Mantém o valor se já definido, senão vazio
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
    // Verifica se o exercício já existe na lista carregada do Firestore
    if (listaExerciciosEstado.some(ex => ex.name.toLowerCase() === nomeNovo.toLowerCase())) { // Usa ex.name
      Alert.alert('Exercício existente', 'Este exercício já está na lista.');
      return;
    }

    try {
      // Adiciona o novo exercício à coleção 'exercises' no Firestore
      const newExerciseRef = await addDoc(collection(db, 'exercises'), {
        name: nomeNovo,
        description: 'Exercício adicionado pelo admin.',
        category: 'Força',
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
      });

      Alert.alert('Sucesso', `Exercício "${nomeNovo}" adicionado à biblioteca!`);

      // Cria um objeto de exercício completo para adicionar ao treino atual
      const novoExercicioObjeto = {
        id: newExerciseRef.id, // O ID gerado pelo Firestore
        name: nomeNovo,
        description: 'Exercício adicionado pelo admin.',
        category: 'Força',
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
        tipo: 'reps', // Padrão
        valor: '', // Vazio
      };

      selecionarExercicioDaLista(novoExercicioObjeto); // Seleciona o novo exercício completo
      setNovoExercicioNome('');
    } catch (error) {
      console.error("Erro ao adicionar novo exercício ao Firestore:", error);
      Alert.alert('Erro', 'Não foi possível adicionar o novo exercício à biblioteca.');
    }
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
            ...markedDatesForCalendar,
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
                  <Text style={exercicio.name ? styles.selectedText : styles.placeholderText}>
                    {exercicio.name || 'Selecionar exercício'}
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

              {loadingExercises ? (
                <ActivityIndicator size="small" color="#d0a956" style={{ marginTop: 20 }} />
              ) : (
                <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
                  {listaExerciciosEstado
                    .filter((exercicio) => // Filtra por exercicio.name agora
                      exercicio.name.toLowerCase().includes(filtroExercicios.toLowerCase())
                    )
                    .map((exercicio, idx) => (
                      <TouchableOpacity
                        key={exercicio.id} // Usa o ID do Firestore como key
                        style={styles.itemLista}
                        onPress={() => selecionarExercicioDaLista(exercicio)} // Passa o objeto completo
                      >
                        <Text style={styles.itemListaText}>{exercicio.name}</Text>
                      </TouchableOpacity>
                    ))}
                  {listaExerciciosEstado.filter((exercicio) =>
                    exercicio.name.toLowerCase().includes(filtroExercicios.toLowerCase())
                  ).length === 0 && (
                    <Text style={styles.noItemsText}>Nenhum exercício encontrado. Tente adicionar um novo.</Text>
                  )}
                </ScrollView>
              )}

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
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'red',
  },
  adicionarExercicioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  botaoCriar: {
    backgroundColor: '#d0a956',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textoBotaoCriar: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  botaoVoltar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  textoBotaoVoltar: {
    marginLeft: 5,
    color: '#000',
    fontWeight: '500',
  },
  // Estilos para o Modal
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    color: '#666',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: '#d0a956',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 15,
    alignItems: 'center',
  },
  pickerConfirmButton: {
    backgroundColor: '#d0a956',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginTop: 15,
  },
  pickerConfirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
