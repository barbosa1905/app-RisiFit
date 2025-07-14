import React, { useState, useEffect } from 'react';
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

  const tiposDeTreino = ['Cardio', 'Musculação', 'Funcional', 'Alongamento', 'Crossfit'];

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
          // Estilo condicional para Treino Completo
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

  return (
    <View style={styles.container}>
      {/* Título "Agenda" */}
      <Text style={styles.headerTitle}>Agenda</Text>

      <View style={styles.calendarContainer}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={{
            ...datasMarcadas,
            ...(selectedDate ? { 
              [selectedDate]: { 
                selected: true, 
                selectedColor: datasMarcadas[selectedDate]?.selectedColor || '#d0a956', 
                dots: datasMarcadas[selectedDate]?.dots || [], 
              } 
            } : {}),
          }}
          theme={{
            todayTextColor: '#d0a956',
            arrowColor: '#d0a956',
            selectedDayBackgroundColor: '#d0a956',
            dotColor: '#d0a956', 
            textDisabledColor: '#d9e1e8',
            monthTextColor: '#2d4150',
            indicatorColor: '#d0a956',
            dayTextColor: '#2d4150',
            textSectionTitleColor: '#b6c1cd',
            selectedDayTextColor: '#ffffff',
            'stylesheet.calendar.header': {
              week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-around',
              },
            },
            // Customização para os dots (pontos)
            dotStyle: {
                width: 6, // Tamanho padrão
                height: 6,
                borderRadius: 3,
                marginHorizontal: 1,
            },
            // Customização para o dot do treino completo
            // NOTE: Isso se aplica a TODOS os dots. Para tamanhos diferentes,
            // precisaríamos de uma implementação mais complexa de customização de dots
            // ou usar um componente customizado para o dia.
            // Por enquanto, o dotColor no 'dots' array já diferencia.
          }}
          style={styles.calendarStyle}
        />
      </View>


      {loading && (
        <ActivityIndicator size="large" color="#d0a956" style={styles.activityIndicator} />
      )}

      {selectedDate && !loading ? (
        <ScrollView style={styles.detailsScrollView}>
          {dadosData.notas.length === 0 && dadosData.treinos.length === 0 && dadosData.avaliacoes.length === 0 ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="info-outline" size={50} color="#d0a956" />
              <Text style={styles.noDataText}>Nenhum agendamento para esta data.</Text>
              <Text style={styles.noDataSubText}>Clique no botão "+" para adicionar uma nota, treino ou avaliação.</Text>
            </View>
          ) : (
            <>
              {dadosData.notas.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="note" size={24} color="#d0a956" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Notas</Text>
                  </View>
                  {renderDataList('notas')}
                </>
              )}

              {dadosData.treinos.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="fitness-center" size={24} color="#d0a956" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Treinos</Text>
                  </View>
                  {renderDataList('treinos')}
                </>
              )}

              {dadosData.avaliacoes.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <MaterialIcons name="assignment" size={24} color="#d0a956" style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Avaliações</Text>
                  </View>
                  {renderDataList('avaliacoes')}
                </>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={styles.noDateSelectedContainer}>
          <MaterialIcons name="event" size={60} color="#d0a956" />
          <Text style={styles.noDateSelectedText}>Selecione uma data para ver os agendamentos</Text>
        </View>
      )}


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
                        trackColor={{ false: '#767577', true: '#d0a956' }}
                        thumbColor={urgente ? '#f4f3f4' : '#f4f3f4'}
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
                        trackColor={{ false: '#767577', true: '#d9534f' }} 
                        thumbColor={urgente ? '#f4f3f4' : '#f4f3f4'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8', 
    paddingTop: Platform.OS === 'android' ? 25 : 50, 
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
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
  detailsScrollView: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noDataText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noDataItemText: { 
    padding: 10,
    textAlign: 'center',
    color: '#888',
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
    color: '#666',
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
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: '#3e3e3e',
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
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
    color: '#333',
  },
  itemLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  urgentItem: {
    borderLeftColor: '#d9534f',
    borderLeftWidth: 5,
  },
  urgentText: {
    color: '#d9534f',
    fontWeight: 'bold',
  },
  // Novo estilo para Treino Completo na lista de detalhes
  treinoCompletoItem: {
    backgroundColor: '#e6f7ff', // Um azul claro de fundo
    borderLeftColor: '#007bff', // Borda esquerda azul mais intensa
    borderLeftWidth: 5,
    shadowColor: '#007bff', // Sombra azul
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  treinoCompletoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0056b3', // Título em azul escuro
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
    backgroundColor: '#d0a956',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabText: {
    fontSize: 35,
    color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#e9e9e9',
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 18,
    color: '#555',
    fontWeight: '500',
  },
  label: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    color: '#222',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
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
    color: '#444',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  buttonSave: {
    backgroundColor: '#d0a956',
  },
  buttonSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonCancel: {
    backgroundColor: '#ccc',
  },
  buttonCancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  timePickerButtonText: {
    fontSize: 16,
    color: '#444',
  },
});
