import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  SafeAreaView, // Adicionado
  StatusBar,    // Adicionado
  Image,        // Adicionado
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { db } from '../../services/firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAuth } from 'firebase/auth'; // Adicionado

// Paleta de Cores Refinada (copiada para consistência)
const Colors = {
    primaryGold: '#D4AF37', // Ouro mais clássico
    darkBrown: '#3E2723',   // Marrom bem escuro, quase preto
    lightBrown: '#795548',  // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro
    mediumGray: '#B0BEC5',  // Cinza médio para textos secundários
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',  // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336',    // Vermelho para erros/alertas
    unreadBadge: '#EF5350', // Vermelho mais vibrante para badge de não lidas
};

export default function GestaoAlunosScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formType, setFormType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [horaAvaliacao, setHoraAvaliacao] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [nota, setNota] = useState('');
  const [avaliacao, setAvaliacao] = useState('');
  const [dadosData, setDadosData] = useState({ notas: [], treinos: [], avaliacoes: [] });
  const [datasMarcadas, setDatasMarcadas] = useState({});
  const [horaTreino, setHoraTreino] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [tipoTreinoSelecionado, setTipoTreinoSelecionado] = useState(null);
  const [observacoesTreino, setObservacoesTreino] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null); // Novo estado para info do admin

  const tiposDeTreino = ['Cardio', 'Musculação', 'Funcional', 'Alongamento', 'Crossfit'];

  // Função para carregar informações do administrador logado
  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          setAdminInfo(docSnap.data());
        } else {
          console.warn('Usuário logado não é um administrador ou dados não encontrados.');
          setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' }); // Fallback
        }
      }, (error) => {
        console.error("Erro ao buscar informações do admin:", error);
        setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' }); // Fallback em caso de erro
      });
      return unsubscribe;
    } else {
      setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante' }); // Fallback se não houver usuário logado
      return () => {}; // Retorna uma função vazia para o cleanup
    }
  }, []);

  // Listener para marcar datas no calendário
  useEffect(() => {
    console.log('--- Configurando onSnapshot para coleção agenda ---');
    const unsub = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      let marcacoes = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        console.log(`[onSnapshot] Processando documento agenda para data ${docSnap.id}:`, data);

        const dots = [];
        let hasUrgente = false;

        // Processar Notas
        if (Array.isArray(data.notas) && data.notas.filter(Boolean).length > 0) {
          dots.push({ key: 'nota', color: '#FFA500' }); // Laranja para notas
          if (data.notas.filter(Boolean).some(n => n.urgente)) {
            hasUrgente = true;
          }
        }

        // Processar Treinos
        if (Array.isArray(data.treinos) && data.treinos.filter(Boolean).length > 0) {
          data.treinos.filter(Boolean).forEach(treino => {
            if (treino.tipoAgendamento === 'treinoCompleto') {
              // Ponto maior e mais vibrante para Treino Completo
              dots.push({ key: `treinoCompleto-${treino.id}`, color: '#007bff', selectedDotColor: '#0056b3' }); // Azul mais intenso
            } else {
              dots.push({ key: `anotacaoTreino-${treino.id}`, color: '#d0a956' }); // Dourado para anotações de treino
            }
            if (treino.urgente) {
              hasUrgente = true;
            }
          });
        }

        // Processar Avaliações
        if (Array.isArray(data.avaliacoes) && data.avaliacoes.filter(Boolean).length > 0) {
          dots.push({ key: 'avaliacao', color: '#800080' }); // Roxo para avaliações
          if (data.avaliacoes.filter(Boolean).some(a => a.urgente)) {
            hasUrgente = true;
          }
        }

        // Adicionar ponto de urgente se houver qualquer item urgente
        if (hasUrgente) {
          const existingUrgentDotIndex = dots.findIndex(dot => dot.key === 'urgente');
          if (existingUrgentDotIndex !== -1) {
              dots.splice(existingUrgentDotIndex, 1);
          }
          dots.unshift({ key: 'urgente', color: '#d9534f' }); // Vermelho para urgente
        }

        // Se houver qualquer tipo de agendamento, marque a data
        if (dots.length > 0) {
          marcacoes[docSnap.id] = {
            marked: true,
            dots: dots,
            activeOpacity: 0,
            selectedColor: hasUrgente ? '#d9534f' : '#d0a956',
          };
          console.log(`[onSnapshot] Data ${docSnap.id} marcada. Dots:`, dots);
        } else {
          if (marcacoes[docSnap.id]) {
            delete marcacoes[docSnap.id];
          }
          console.log(`[onSnapshot] Data ${docSnap.id} não tem dados, removendo marcação.`);
        }
      });
      setDatasMarcadas(marcacoes);
      console.log('[onSnapshot] Datas marcadas atualizadas:', marcacoes);
    });
    return () => {
      console.log('--- Desmontando onSnapshot para coleção agenda ---');
      unsub();
    };
  }, []);

  // Listener para carregar clientes
  useEffect(() => {
    console.log('--- Configurando onSnapshot para coleção users (clientes) ---');
    const unsubscribeClientes = onSnapshot(collection(db, 'users'), (snapshot) => {
      const listaClientes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(cliente => cliente.role === 'user');
      setClientes(listaClientes);
      console.log('[onSnapshot] Clientes carregados:', listaClientes.length);
    });
    return () => {
      console.log('--- Desmontando onSnapshot para coleção users ---');
      unsubscribeClientes();
    };
  }, []);

  // useEffect para buscar informações do admin
  useEffect(() => {
    const unsubscribeAdmin = fetchAdminInfo();
    return () => unsubscribeAdmin();
  }, [fetchAdminInfo]);

  const onDayPress = async (day) => {
    setSelectedDate(day.dateString);
    setFormType(null);
    setLoading(true);
    setClienteSelecionado(null);
    setTipoTreinoSelecionado(null);
    setObservacoesTreino('');
    setUrgente(false);
    setHoraTreino(null);
    setAvaliacao('');
    setHoraAvaliacao(null);
    setShowTimePicker(false);

    const docRef = doc(db, 'agenda', day.dateString);
    console.log(`[onDayPress] Tentando buscar dados para a data: ${day.dateString}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log(`[onDayPress] Dados recuperados do Firestore para ${day.dateString}:`, data);
      setDadosData({
        notas: (data.notas || []).filter(Boolean),
        treinos: (data.treinos || []).filter(Boolean),
        avaliacoes: (data.avaliacoes || []).filter(Boolean),
      });
    } else {
      console.log(`[onDayPress] Nenhum documento encontrado para a data selecionada: ${day.dateString}`);
      setDadosData({ notas: [], treinos: [], avaliacoes: [] });
    }
    setLoading(false);
  };

  const deletarItem = async (tipo, id) => {
    const docRef = doc(db, 'agenda', selectedDate);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      Alert.alert('Erro', 'Documento não encontrado para exclusão.');
      return;
    }

    const currentData = docSnap.data();
    const listaAtualizada = (currentData[tipo] || []).filter(item => item && item.id !== id);

    try {
      await updateDoc(docRef, {
        [tipo]: listaAtualizada,
      });

      setDadosData(prev => ({
        ...prev,
        [tipo]: listaAtualizada,
      }));

      Alert.alert('Sucesso', 'Item excluído com sucesso!');
      console.log(`[deletarItem] Item ${id} do tipo ${tipo} excluído para data ${selectedDate}.`);

    } catch (error) {
      Alert.alert('Erro', 'Falha ao excluir item.');
      console.error('[deletarItem] Erro ao excluir item:', error);
    }
  };

  const salvarDados = async () => {
    if (!formType || !selectedDate) return;

    let novoDado = null;
    let tipoLista = '';

    if (formType === 'nota') {
      if (!nota.trim()) return Alert.alert('Erro', 'Digite uma nota.');
      novoDado = { id: Date.now().toString(), texto: nota.trim(), urgente };
      tipoLista = 'notas';
      setNota('');
    } else if (formType === 'treino') { // Este é o "treino anotação"
      if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
      if (!tipoTreinoSelecionado) return Alert.alert('Erro', 'Selecione o tipo de treino.');
      if (!horaTreino) return Alert.alert('Erro', 'Selecione a hora do treino.');

      novoDado = {
        id: Date.now().toString(),
        clienteId: clienteSelecionado,
        clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente Desconhecido',
        tipo: tipoTreinoSelecionado,
        observacoes: observacoesTreino.trim(),
        urgente,
        dataAgendada: selectedDate,
        hora: horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipoAgendamento: 'anotacaoTreino', // Identificador para anotações de treino
      };
      tipoLista = 'treinos';
      setClienteSelecionado(null);
      setTipoTreinoSelecionado(null);
      setObservacoesTreino('');
      setHoraTreino(null);
    } else if (formType === 'avaliacao') {
      if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
      if (!avaliacao.trim()) return Alert.alert('Erro', 'Digite uma avaliação.');
      if (!horaAvaliacao) return Alert.alert('Erro', 'Selecione a hora da avaliação.');

      novoDado = {
        id: Date.now().toString(),
        clienteId: clienteSelecionado,
        clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente Desconhecido',
        texto: avaliacao.trim(),
        observacoes: observacoesTreino.trim(),
        urgente,
        hora: horaAvaliacao.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      tipoLista = 'avaliacoes';
      setClienteSelecionado(null);
      setAvaliacao('');
      setObservacoesTreino('');
      setHoraAvaliacao(null);
    }

    if (!novoDado) {
      Alert.alert('Erro', 'Dados inválidos para salvar.');
      return;
    }

    const docRef = doc(db, 'agenda', selectedDate);
    try {
      const docSnap = await getDoc(docRef);
      let currentItems = [];
      if (docSnap.exists()) {
        currentItems = (docSnap.data()[tipoLista] || []).filter(Boolean);
      }
      const updatedItems = [...currentItems, novoDado];

      const dataToSave = {
        [tipoLista]: updatedItems,
      };

      console.log(`[salvarDados] Tentando salvar para ${docRef.path}:`, dataToSave);
      await setDoc(docRef, dataToSave, { merge: true });

      setDadosData(prev => ({
        ...prev,
        [tipoLista]: updatedItems,
      }));

      Alert.alert('Sucesso', 'Dados salvos!');
      setFormType(null);
      setModalVisible(false);
      setUrgente(false);
      setShowTimePicker(false);

    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar dados');
      console.error('[salvarDados] Erro ao salvar dados:', error);
    }
  };

  const renderDataList = (tipo) => {
    const lista = (dadosData[tipo] || []).filter(Boolean);

    if (!lista || lista.length === 0) return <Text style={styles.noDataItemText}>Nenhum {tipo.slice(0, -1)} agendado para esta data.</Text>;

    return lista.map((item) => (
      <View
        key={item.id}
        style={[
          styles.itemContainer,
          item.urgente ? styles.urgentItem : {},
          item.tipoAgendamento === 'treinoCompleto' ? styles.treinoCompletoItem : {},
          styles.itemRow,
        ]}
      >
        <View style={styles.itemContent}>
          {tipo === 'treinos' ? (
            <>
              <Text style={[styles.itemText, item.tipoAgendamento === 'treinoCompleto' ? styles.treinoCompletoTitle : styles.itemLabel]}>
                {item.tipoAgendamento === 'treinoCompleto' ? 'Treino Completo' : 'Anotação de Treino'}
              </Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Tipo:</Text> {item.tipo}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Hora:</Text> {item.hora}</Text>
              {item.observacoes ? (
                <Text style={styles.itemText}><Text style={styles.itemLabel}>Obs:</Text> {item.observacoes}</Text>
              ) : null}
            </>
          ) : tipo === 'notas' ? (
            <Text style={styles.itemText}>{item.texto}</Text>
          ) : tipo === 'avaliacoes' ? (
            <>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}</Text>
              <Text style={styles.itemText}><Text style={styles.itemLabel}>Avaliação:</Text> {item.texto}</Text>
              {item.hora && (
                <Text style={styles.itemText}><Text style={styles.itemLabel}>Hora:</Text> {item.hora}</Text>
              )}
              {item.observacoes ? (
                <Text style={styles.itemText}><Text style={styles.itemLabel}>Observações:</Text> {item.observacoes}</Text>
              ) : null}
              <Text style={[styles.itemText, item.urgente ? styles.urgentText : {}]}>
                <Text style={styles.itemLabel}>Urgente:</Text> {item.urgente ? 'Sim' : 'Não'}
              </Text>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Confirmar Exclusão',
              'Tem certeza que deseja excluir este item?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => deletarItem(tipo, item.id) },
              ],
              { cancelable: true }
            );
          }}
          style={styles.deleteButton}
        >
          <MaterialIcons name="delete" size={24} color="#d9534f" />
        </TouchableOpacity>
      </View>
    ));
  };


  const abrirModalTipo = () => {
    if (!selectedDate) {
      Alert.alert('Atenção', 'Por favor, selecione uma data no calendário primeiro.');
      return;
    }
    setFormType(null);
    setModalVisible(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      if (formType === 'treino') {
        setHoraTreino(selectedTime);
      } else if (formType === 'avaliacao') {
        setHoraAvaliacao(selectedTime);
      }
    }
  };

  const TimePicker = ({ value, onChange, label }) => (
    <View>
      <TouchableOpacity
        style={styles.timePickerButton}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.timePickerButtonText}>
          {value
            ? `${label}: ${value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `Selecionar ${label.toLowerCase()}`}
        </Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChange}
        />
      )}
    </View>
  );

  // Lógica para obter o nome mais adequado do admin
  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Fixa Superior (Header - Otimizada) */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.jpeg')} // Verifique se o caminho do logo está correto
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

      {/* Calendário e Conteúdo */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markedDates={{
              ...datasMarcadas,
              ...(selectedDate ? {
                [selectedDate]: {
                  selected: true,
                  selectedColor: datasMarcadas[selectedDate]?.selectedColor || Colors.primaryGold, // Usar Colors.primaryGold
                  dots: datasMarcadas[selectedDate]?.dots || [],
                }
              } : {}),
            }}
            theme={{
              todayTextColor: Colors.primaryGold,
              arrowColor: Colors.primaryGold,
              selectedDayBackgroundColor: Colors.primaryGold,
              dotColor: Colors.primaryGold,
              textDisabledColor: Colors.lightGray,
              monthTextColor: Colors.darkBrown,
              indicatorColor: Colors.primaryGold,
              dayTextColor: Colors.darkGray,
              textSectionTitleColor: Colors.mediumGray,
              selectedDayTextColor: Colors.white,
              'stylesheet.calendar.header': {
                week: {
                  marginTop: 5,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              dotStyle: {
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  marginHorizontal: 1,
              },
            }}
            style={styles.calendarStyle}
          />
        </View>

        {loading && (
          <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.activityIndicator} />
        )}

        {selectedDate && !loading ? (
          <View style={styles.detailsContainer}>
            {dadosData.notas.length === 0 && dadosData.treinos.length === 0 && dadosData.avaliacoes.length === 0 ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="info-outline" size={50} color={Colors.primaryGold} />
                <Text style={styles.noDataText}>Nenhum agendamento para esta data.</Text>
                <Text style={styles.noDataSubText}>Clique no botão "+" para adicionar uma nota, treino ou avaliação.</Text>
              </View>
            ) : (
              <>
                {dadosData.notas.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="note" size={24} color={Colors.primaryGold} style={styles.sectionIcon} />
                      <Text style={styles.sectionTitle}>Notas</Text>
                    </View>
                    {renderDataList('notas')}
                  </>
                )}

                {dadosData.treinos.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="fitness-center" size={24} color={Colors.primaryGold} style={styles.sectionIcon} />
                      <Text style={styles.sectionTitle}>Treinos</Text>
                    </View>
                    {renderDataList('treinos')}
                  </>
                )}

                {dadosData.avaliacoes.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="assignment" size={24} color={Colors.primaryGold} style={styles.sectionIcon} />
                      <Text style={styles.sectionTitle}>Avaliações</Text>
                    </View>
                    {renderDataList('avaliacoes')}
                  </>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.noDateSelectedContainer}>
            <MaterialIcons name="event" size={60} color={Colors.primaryGold} />
            <Text style={styles.noDateSelectedText}>Selecione uma data para ver os agendamentos</Text>
          </View>
        )}
      </ScrollView>


      <TouchableOpacity
        style={styles.fab}
        onPress={abrirModalTipo}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setFormType(null);
          setShowTimePicker(false);
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {!formType ? (
              <>
                <Text style={styles.modalTitle}>Adicionar Novo Item</Text>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setFormType('nota')}
                >
                  <Text style={styles.modalOptionText}>Nota</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setFormType('treino')}
                >
                  <Text style={styles.modalOptionText}>Treino</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setFormType('avaliacao')}
                >
                  <Text style={styles.modalOptionText}>Avaliação</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setFormType(null);
                  }}
                  style={[styles.button, styles.buttonCancel]}
                >
                  <Text style={styles.buttonCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ScrollView>
                <Text style={styles.modalTitle}>
                  {formType === 'nota' && 'Nova Nota'}
                  {formType === 'treino' && 'Novo Treino'}
                  {formType === 'avaliacao' && 'Nova Avaliação'}
                </Text>

                {formType === 'nota' && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Digite a nota"
                      value={nota}
                      onChangeText={setNota}
                      multiline
                    />
                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>Marcar como Urgente</Text>
                      <Switch
                        value={urgente}
                        onValueChange={setUrgente}
                        trackColor={{ false: Colors.mediumGray, true: Colors.errorRed }} // Usar cores da paleta
                        thumbColor={Colors.white}
                      />
                    </View>
                  </>
                )}

                {(formType === 'treino' || formType === 'avaliacao') && (
                  <>
                    <Text style={styles.label}>Cliente:</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={clienteSelecionado}
                        onValueChange={(val) => setClienteSelecionado(val)}
                        mode="dropdown"
                        style={styles.picker}
                        itemStyle={{ color: Colors.darkGray }} // Estilo para os itens do Picker
                      >
                        <Picker.Item label="Selecione um cliente" value={null} />
                        {clientes.map((cliente) => (
                          <Picker.Item
                            key={cliente.id}
                            label={cliente.name}
                            value={cliente.id}
                          />
                        ))}
                      </Picker>
                    </View>

                    {formType === 'treino' && (
                      <>
                        <Text style={styles.label}>Tipo de Treino:</Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={tipoTreinoSelecionado}
                            onValueChange={(val) => setTipoTreinoSelecionado(val)}
                            mode="dropdown"
                            style={styles.picker}
                            itemStyle={{ color: Colors.darkGray }}
                          >
                            <Picker.Item label="Selecione o tipo" value={null} />
                            {tiposDeTreino.map((tipo) => (
                              <Picker.Item key={tipo} label={tipo} value={tipo} />
                            ))}
                          </Picker>
                        </View>

                        <TimePicker
                          value={horaTreino}
                          onChange={(event, selectedTime) => handleTimeChange(event, selectedTime)}
                          label="Hora do Treino"
                        />

                        <TextInput
                          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                          placeholder="Observações (opcional)"
                          value={observacoesTreino}
                          onChangeText={setObservacoesTreino}
                          multiline
                        />
                      </>
                    )}

                    {formType === 'avaliacao' && (
                      <>
                        <TimePicker
                          value={horaAvaliacao}
                          onChange={(event, selectedTime) => handleTimeChange(event, selectedTime)}
                          label="Hora da Avaliação"
                        />

                        <TextInput
                          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                          placeholder="Digite a avaliação"
                          value={avaliacao}
                          onChangeText={setAvaliacao}
                          multiline
                        />

                        <TextInput
                          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                          placeholder="Observações (opcional)"
                          value={observacoesTreino}
                          onChangeText={setObservacoesTreino}
                          multiline
                        />
                      </>
                    )}

                    <View style={styles.switchRow}>
                      <Text style={styles.switchText}>Marcar como Urgente</Text>
                      <Switch
                        value={urgente}
                        onValueChange={setUrgente}
                        trackColor={{ false: Colors.mediumGray, true: Colors.errorRed }}
                        thumbColor={Colors.white}
                      />
                    </View>
                  </>
                )}

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={() => {
                      setFormType(null);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={styles.buttonCancelText}>Voltar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonSave]}
                    onPress={salvarDados}
                  >
                    <Text style={styles.buttonSaveText}>Salvar</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground, // Usando a cor de fundo da paleta
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: { // Estilos do header copiados e ajustados para compactação
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8, // Reduzido
    backgroundColor: Colors.primaryGold,
    borderBottomWidth: 0,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 2 : 0, // Reduzido
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  headerLogo: { // Estilos do logo copiados e ajustados
    width: 40, // Reduzido
    height: 40, // Reduzido
    borderRadius: 8,
  },
  userInfo: { // Estilos do userInfo copiados
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { // Estilos do avatar copiados e ajustados
    width: 38, // Reduzido
    height: 38, // Reduzido
    borderRadius: 19, // Ajustado
    backgroundColor: Colors.darkBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  avatarText: { // Estilos do avatarText copiados e ajustados
    color: Colors.white,
    fontSize: 18, // Reduzido
    fontWeight: '600',
  },
  userNameText: { // Estilos do userNameText copiados e ajustados
    fontSize: 16, // Reduzido
    fontWeight: '600',
    color: Colors.white,
  },
  scrollContent: { // Novo estilo para o ScrollView principal (conteúdo abaixo do header)
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: 15, // Espaço entre o header e o calendário
    paddingBottom: 80, // Espaço para o FAB
  },
  // Removido headerTitle antigo, pois o novo header o substitui

  calendarContainer: {
    backgroundColor: Colors.white, // Usando a cor da paleta
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
    shadowColor: Colors.darkBrown, // Usando a cor da paleta
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  calendarStyle: {
    height: 330,
    borderRadius: 10,
  },
  activityIndicator: {
    marginTop: 20,
  },
  detailsContainer: { // Novo container para os detalhes da data selecionada
    flex: 1,
    paddingTop: 10,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 20,
    backgroundColor: Colors.white, // Usando a cor da paleta
    borderRadius: 10,
    elevation: 2,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noDataText: {
    fontSize: 18,
    color: Colors.darkGray, // Usando a cor da paleta
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 14,
    color: Colors.mediumGray, // Usando a cor da paleta
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noDataItemText: {
    padding: 10,
    textAlign: 'center',
    color: Colors.mediumGray, // Usando a cor da paleta
    fontStyle: 'italic',
  },
  noDateSelectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDateSelectedText: {
    fontSize: 18,
    color: Colors.darkGray, // Usando a cor da paleta
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray, // Usando a cor da paleta
    paddingBottom: 5,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: Colors.darkBrown, // Usando a cor da paleta
  },
  itemContainer: {
    backgroundColor: Colors.white, // Usando a cor da paleta
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemText: {
    fontSize: 16,
    marginBottom: 5,
    color: Colors.darkGray, // Usando a cor da paleta
  },
  itemLabel: {
    fontWeight: 'bold',
    color: Colors.darkBrown, // Usando a cor da paleta
  },
  urgentItem: {
    borderLeftColor: Colors.errorRed, // Usando a cor da paleta
    borderLeftWidth: 5,
  },
  urgentText: {
    color: Colors.errorRed, // Usando a cor da paleta
    fontWeight: 'bold',
  },
  treinoCompletoItem: {
    backgroundColor: '#e6f7ff',
    borderLeftColor: Colors.accentBlue, // Usando a cor da paleta
    borderLeftWidth: 5,
    shadowColor: Colors.accentBlue,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  treinoCompletoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.accentBlue, // Usando a cor da paleta
    marginBottom: 8,
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    backgroundColor: Colors.primaryGold, // Usando a cor da paleta
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabText: {
    fontSize: 35,
    color: Colors.white, // Usando a cor da paleta
    lineHeight: 35,
    fontWeight: '600',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.creamBackground, // Usando a cor da paleta
    borderRadius: 15,
    padding: 25,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 25,
    color: Colors.darkBrown, // Usando a cor da paleta
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.lightGray, // Usando a cor da paleta
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 18,
    color: Colors.darkGray, // Usando a cor da paleta
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    color: Colors.darkBrown, // Usando a cor da paleta
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder, // Usando a cor da paleta
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: Colors.darkGray, // Usando a cor da paleta
    backgroundColor: Colors.white, // Usando a cor da paleta
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.inputBorder, // Usando a cor da paleta
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: Colors.white, // Usando a cor da paleta
  },
  picker: {
    height: 50,
    width: '100%',
  },
  timePickerButton: { // Estilo para o botão do TimePicker
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  timePickerButtonText: { // Estilo para o texto do botão do TimePicker
    color: Colors.darkGray,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 15,
    paddingHorizontal: 5,
  },
  switchText: {
    fontSize: 16,
    color: Colors.darkBrown, // Usando a cor da paleta
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonCancel: {
    backgroundColor: Colors.lightGray, // Usando a cor da paleta
  },
  buttonSave: {
    backgroundColor: Colors.accentBlue, // Usando a cor da paleta
  },
  buttonCancelText: {
    color: Colors.darkGray, // Usando a cor da paleta
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSaveText: {
    color: Colors.white, // Usando a cor da paleta
    fontSize: 16,
    fontWeight: 'bold',
  },
});
