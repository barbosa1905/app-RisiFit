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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      let marcacoes = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        const temDados =
          (data.notas && data.notas.length > 0) ||
          (data.treinos && data.treinos.length > 0) ||
          (data.avaliacoes && data.avaliacoes.length > 0);

        if (temDados) {
          const hasUrgente =
  Array.isArray(data.notas) && data.notas.filter(Boolean).some(n => n.urgente)
 ||
  (data.treinos && data.treinos.some(t => t && t.urgente)) ||
  (data.avaliacoes && data.avaliacoes.some(a => a && a.urgente));


          marcacoes[docSnap.id] = {
            marked: true,
            dotColor: hasUrgente ? '#d9534f' : '#d0a956',
            activeOpacity: 0,
            selectedColor: hasUrgente ? '#d9534f' : '#d0a956',
          };
        }
      });

      setDatasMarcadas(marcacoes);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubscribeClientes = onSnapshot(collection(db, 'users'), (snapshot) => {
      const listaClientes = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(cliente => cliente.role === 'user');

      setClientes(listaClientes);
    });

    return () => unsubscribeClientes();
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

    const docRef = doc(db, 'agenda', day.dateString);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      setDadosData({
  notas: (data.notas || []).filter(Boolean),
  treinos: (data.treinos || []).filter(Boolean),
  avaliacoes: (data.avaliacoes || []).filter(Boolean),
});

    } else {
      setDadosData({ notas: [], treinos: [], avaliacoes: [] });
    }
    setLoading(false);
  };

  const deletarItem = async (tipo, id) => {
    const novaLista = dadosData[tipo].filter((item) => item.id !== id);
    const docRef = doc(db, 'agenda', selectedDate);

    await updateDoc(docRef, {
      [tipo]: novaLista,
    });

    setDadosData(prev => ({
      ...prev,
      [tipo]: novaLista,
    }));
  };

  const salvarDados = async () => {
    if (!formType) return;

    let novoDado = null;

    if (formType === 'nota') {
      if (!nota.trim()) return Alert.alert('Erro', 'Digite uma nota.');
      novoDado = { id: Date.now().toString(), texto: nota, urgente };
      setDadosData((prev) => ({
  ...prev,
  notas: [...(prev.notas || []).filter(Boolean), novoDado],
}));

      setNota('');
    } else if (formType === 'treino') {
      if (!clienteSelecionado)
        return Alert.alert('Erro', 'Selecione um cliente.');
      if (!tipoTreinoSelecionado)
        return Alert.alert('Erro', 'Selecione o tipo de treino.');
      if (!horaTreino)
        return Alert.alert('Erro', 'Selecione a hora do treino.');

      const horaFormatada = horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

 novoDado = {
  id: Date.now().toString(),
  clienteId: clienteSelecionado,
  clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente',
  tipo: tipoTreinoSelecionado,
  observacoes: observacoesTreino.trim(),
  urgente,
  dataAgendada: selectedDate,
  hora: horaTreino ? horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
};


      setDadosData((prev) => ({ ...prev, treinos: [...prev.treinos, novoDado] }));

      setClienteSelecionado(null);
      setTipoTreinoSelecionado(null);
      setObservacoesTreino('');
      setHoraTreino(null);
    } else if (formType === 'avaliacao') {
      if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
      if (!avaliacao.trim()) return Alert.alert('Erro', 'Digite uma avaliação.');

      novoDado = {
  id: Date.now().toString(),
  clienteId: clienteSelecionado,
  clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente',
  texto: avaliacao,
  observacoes: observacoesTreino.trim(),
  urgente,
  hora: horaAvaliacao ? horaAvaliacao.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
};


      setDadosData((prev) => ({ ...prev, avaliacoes: [...prev.avaliacoes, novoDado] }));

      setClienteSelecionado(null);
      setAvaliacao('');
      setObservacoesTreino('');
    }

    const docRef = doc(db, 'agenda', selectedDate);
    try {
      await setDoc(
        docRef,
        {
          notas: formType === 'nota' ? [...dadosData.notas, novoDado] : dadosData.notas,
          treinos: formType === 'treino' ? [...dadosData.treinos, novoDado] : dadosData.treinos,
          avaliacoes: formType === 'avaliacao' ? [...dadosData.avaliacoes, novoDado] : dadosData.avaliacoes,
        },
        { merge: true }
      );
      Alert.alert('Sucesso', 'Dados salvos!');
      setFormType(null);
      setModalVisible(false);
      setUrgente(false);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar dados');
      console.log(error);
    }
  };

  const renderDataList = (tipo) => {
 const lista = (dadosData[tipo] || []).filter(Boolean);

  if (!lista || lista.length === 0) return <Text style={{ padding: 10 }}>Nenhum {tipo} agendado.</Text>;

  return lista.map((item) => (
    
    <View
      key={item.id}
      style={[
        styles.itemContainer,
        item.urgente ? { borderLeftColor: '#d9534f', borderLeftWidth: 4 } : {},
        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
      ]}
    >
      <View style={{ flex: 1 }}>
        {tipo === 'treinos' ? (
          <>
            <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Cliente:</Text> {item.clienteNome}</Text>
            <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Treino:</Text> {item.tipo}</Text>
            <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Hora:</Text> {item.hora}</Text>
            {item.observacoes ? (
              <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Obs:</Text> {item.observacoes}</Text>
            ) : null}
          </>
        ) : tipo === 'notas' ? (
          <Text style={styles.itemText}>{item.texto}</Text>
        ) : tipo === 'avaliacoes' ? (
          <>
            <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Cliente:</Text> {item.clienteNome}</Text>
            <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Avaliação:</Text> {item.texto}</Text>
            {item.hora && (
              <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Hora:</Text> {item.hora}</Text>
            )}
            {item.observacoes ? (
              <Text style={styles.itemText}><Text style={{ fontWeight: 'bold' }}>Observações:</Text> {item.observacoes}</Text>
            ) : null}
            <Text style={[styles.itemText, { color: item.urgente ? '#d9534f' : '#000' }]}>
              <Text style={{ fontWeight: 'bold' }}>Urgente:</Text> {item.urgente ? 'Sim' : 'Não'}
            </Text>
          </>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Confirmar',
            'Deseja excluir esse item?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Excluir', style: 'destructive', onPress: () => deletarItem(tipo, item.id) },
            ],
            { cancelable: true }
          );
        }}
        style={{ paddingHorizontal: 10 }}
      >
        <MaterialIcons name="delete" size={24} color="#d9534f" />
      </TouchableOpacity>
    </View>
  ));
};


  const abrirModalTipo = () => {
    setFormType(null);
    setModalVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...datasMarcadas,
          ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#d0a956' } } : {}),
        }}
        theme={{
          todayTextColor: '#d0a956',
          arrowColor: '#d0a956',
          selectedDayBackgroundColor: '#d0a956',
        }}
      />

      {loading && (
        <ActivityIndicator size="large" color="#d0a956" style={{ marginTop: 10 }} />
      )}
{selectedDate && !loading && (
  <ScrollView style={{ flex: 1, padding: 10 }}>
 {dadosData.notas.length > 0 && (
  <>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 }}>
      <MaterialIcons 
        name="note" 
        size={24} 
        color="#d0a956" 
        style={{ marginRight: 8, marginTop: 4 }} // ícone um pouco mais pra baixo
      />
      <Text style={[styles.sectionTitle, { lineHeight: 24 }]}>Notas</Text>
    </View>
    {renderDataList('notas')}
  </>
)}

{dadosData.treinos.length > 0 && (
  <>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 }}>
      <MaterialIcons 
        name="fitness-center" 
        size={24} 
        color="#d0a956" 
        style={{ marginRight: 8, marginTop: 4 }} 
      />
      <Text style={[styles.sectionTitle, { lineHeight: 24 }]}>Treinos</Text>
    </View>
    {renderDataList('treinos')}
  </>
)}

{dadosData.avaliacoes.length > 0 && (
  <>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 5 }}>
      <MaterialIcons 
        name="assignment" 
        size={24} 
        color="#d0a956" 
        style={{ marginRight: 8, marginTop: 4 }} 
      />
      <Text style={[styles.sectionTitle, { lineHeight: 24 }]}>Avaliações</Text>
    </View>
    {renderDataList('avaliacoes')}
  </>
)}

  </ScrollView>
)}


      {/* Botão + no canto superior direito */}
      <TouchableOpacity
        style={styles.fab}
        onPress={abrirModalTipo}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal para escolher tipo */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {!formType ? (
              <>
                <Text style={styles.modalTitle}>Adicionar</Text>

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
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalOption, { backgroundColor: '#ccc' }]}
                >
                  <Text style={[styles.modalOptionText, { color: '#333' }]}>Cancelar</Text>
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
                      <Text>Urgente</Text>
                      <Switch value={urgente} onValueChange={setUrgente} />
                    </View>
                  </>
                )}

                {(formType === 'treino' || formType === 'avaliacao') && (
                  <>
                    <Text style={{ marginBottom: 5 }}>Cliente:</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={clienteSelecionado}
                        onValueChange={(val) => setClienteSelecionado(val)}
                        mode="dropdown"
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
                        <Text style={{ marginBottom: 5, marginTop: 10 }}>
                          Tipo de Treino:
                        </Text>
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={tipoTreinoSelecionado}
                            onValueChange={(val) => setTipoTreinoSelecionado(val)}
                            mode="dropdown"
                          >
                            <Picker.Item label="Selecione o tipo" value={null} />
                            {tiposDeTreino.map((tipo) => (
                              <Picker.Item key={tipo} label={tipo} value={tipo} />
                            ))}
                          </Picker>
                        </View>

                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => setShowTimePicker(true)}
                        >
                          <Text>
                            {horaTreino
                              ? `Hora: ${horaTreino.toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : 'Selecionar hora do treino'}
                          </Text>
                        </TouchableOpacity>

                        {showTimePicker && (
                          <DateTimePicker
                            value={horaTreino || new Date()}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                              setShowTimePicker(false);
                              if (selectedTime) setHoraTreino(selectedTime);
                            }}
                          />
                        )}

                        <TextInput
                          style={[styles.input, { height: 60 }]}
                          placeholder="Observações (opcional)"
                          value={observacoesTreino}
                          onChangeText={setObservacoesTreino}
                          multiline
                        />
                      </>
                    )}

                 {formType === 'avaliacao' && (
  <>
    <TouchableOpacity
      style={styles.timePickerButton}
      onPress={() => setShowTimePicker(true)}
    >
      <Text>
        {horaAvaliacao
          ? `Hora: ${horaAvaliacao.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Selecionar hora'}
      </Text>
    </TouchableOpacity>

    {showTimePicker && (
      <DateTimePicker
        value={horaAvaliacao || new Date()}
        mode="time"
        is24Hour={true}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(event, selectedTime) => {
          setShowTimePicker(false);
          if (selectedTime) setHoraAvaliacao(selectedTime);
        }}
      />
    )}

    <TextInput
      style={[styles.input, { height: 60 }]}
      placeholder="Digite a avaliação"
      value={avaliacao}
      onChangeText={setAvaliacao}
      multiline
    />

    <TextInput
      style={[styles.input, { height: 60 }]}
      placeholder="Observações (opcional)"
      value={observacoesTreino}
      onChangeText={setObservacoesTreino}
      multiline
    />
  </>
)}



                    <View style={styles.switchRow}>
                      <Text>Urgente</Text>
                      <Switch value={urgente} onValueChange={setUrgente} />
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#ccc' }]}
                    onPress={() => setFormType(null)}
                  >
                    <Text style={{ color: '#333' }}>Voltar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#d0a956' }]}
                    onPress={salvarDados}
                  >
                    <Text style={{ color: '#fff' }}>Salvar</Text>
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
  sectionTitle: {
    fontWeight: '700',
    fontSize: 20,
    marginTop: 20,
    marginBottom: 8,
    color: '#3e3e3e',
  },
  container: {
  flex: 1,
  backgroundColor: '#d0a956', // cor de fundo desejada
  // Ou use uma imagem de fundo com ImageBackground se quiser algo mais estiloso
},
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemText: {
    fontSize: 15,
    marginBottom: 4,
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 25,
    backgroundColor: '#d0a956',
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '700',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#444',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 14,
  },
  modalOptionText: {
    fontSize: 17,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 18,
    color: '#222',
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 10,
    marginBottom: 18,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonSave: {
    backgroundColor: '#d0a956',
  },
  buttonCancel: {
    backgroundColor: '#ccc',
  },
  timePickerButton: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 18,
  },
  iconWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
    marginTop: 2, // ícone levemente mais para baixo para alinhar com texto
  },
});
