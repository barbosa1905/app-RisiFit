import React, { useState, useEffect } from 'react';


import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Animated,
  Easing,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DateTimePicker from '@react-native-community/datetimepicker';

const opcoesDeTreino = ['Cardio', 'Força', 'Mobilidade', 'Core'];
const tipoCores = {
  Cardio: '#f97316',
  Força: '#22c55e',
  Mobilidade: '#3b82f6',
  Core: '#a855f7',
};
const tipoIcones = {
  Cardio: 'running',
  Força: 'dumbbell',
  Mobilidade: 'spa',
  Core: 'heartbeat',
};

const frasesMotivacionais = [
  'Nunca desista dos seus sonhos!',
  'O esforço de hoje é a vitória de amanhã.',
  'Cada passo conta na jornada do sucesso.',
  'Você é mais forte do que imagina.',
  'Desafie seus limites e cresça.',
  'A persistência é o caminho para a excelência.',
  'Faça do seu treino o seu melhor momento.',
  'Transforme esforço em resultados!',
  'Coragem é a chave para o progresso.',
  'Mantenha o foco e a disciplina.',
  'Sucesso é a soma de pequenos esforços.',
  'Treine duro, sonhe alto!',
  'O único limite é você mesmo.',
  'Mais um dia, mais uma vitória.',
  'Sua força interior é seu maior poder.',
];

export default function HomeScreen({ navigation }) {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(null);
  const [treinos, setTreinos] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [nomeTreino, setNomeTreino] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState(opcoesDeTreino[0]);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  const [mostrarMensagemSucesso, setMostrarMensagemSucesso] = useState(false);

  // Estados para hora do treino e controle do picker
  const [horaTreino, setHoraTreino] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const carregarTreinos = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'treinos', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTreinos(docSnap.data() || {});
        }
      } catch (err) {
        console.error('Erro ao carregar treinos:', err);
      }
    };
    carregarTreinos();
  }, [user]);

  useEffect(() => {
    // Escolhe frase motivacional aleatória ao carregar a tela
    const index = Math.floor(Math.random() * frasesMotivacionais.length);
    setFraseMotivacional(frasesMotivacionais[index]);
  }, []);

  const startFade = () => {
  setMostrarMensagemSucesso(true);
  fadeAnim.setValue(1);
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 1500,
    easing: Easing.ease,
    useNativeDriver: true,
  }).start(() => {
    setMostrarMensagemSucesso(false); // esconde ao final da animação
  });
};
  // Função para abrir o modal garantindo fadeAnim em 1
  const abrirModal = () => {
    fadeAnim.setValue(1);
    setModalVisible(true);
  };

  const guardarTreino = async () => {
    if (!nomeTreino.trim()) {
      Alert.alert('Nome obrigatório', 'Por favor, digite o nome do treino.');
      return;
    }

    const novoTreino = {
      nome: nomeTreino.trim(),
      tipo: tipoSelecionado,
      hora: horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const atualizados = {
      ...treinos,
      [selectedDate]: [...(treinos[selectedDate] || []), novoTreino],
    };

    setTreinos(atualizados);
    setModalVisible(false);
    setNomeTreino('');
    setHoraTreino(new Date()); // reset hora para o padrão
    startFade();

    try {
      await setDoc(doc(db, 'treinos', user.uid), atualizados);
    } catch (err) {
      console.error('Erro ao guardar treino:', err);
    }
  };

  const removerTreino = (index) => {
    Alert.alert(
      'Remover treino',
      'Tem certeza que deseja remover este treino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const lista = [...(treinos[selectedDate] || [])];
            lista.splice(index, 1);
            const atualizados = { ...treinos, [selectedDate]: lista };
            setTreinos(atualizados);
            startFade();
            try {
              await setDoc(doc(db, 'treinos', user.uid), atualizados);
            } catch (err) {
              console.error('Erro ao remover treino:', err);
            }
          },
        },
      ]
    );
  };

  const limparTreinosDoDia = () => {
    Alert.alert(
      'Limpar treinos',
      'Deseja remover todos os treinos deste dia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            const atualizados = { ...treinos };
            delete atualizados[selectedDate];
            setTreinos(atualizados);
            startFade();
            try {
              await setDoc(doc(db, 'treinos', user.uid), atualizados);
            } catch (err) {
              console.error('Erro ao limpar treinos:', err);
            }
          },
        },
      ]
    );
  };

  const treinosDia = treinos[selectedDate] || [];

  const marcarDatas = Object.keys(treinos).reduce((acc, data) => {
    acc[data] = {
      marked: true,
      dotColor: '#34D399',
      selected: data === selectedDate,
      selectedColor: '#3478f6',
    };
    return acc;
  }, {});

  const logout = () => {
    Alert.alert('Sair', 'Deseja mesmo sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => navigation.replace('Login') },
    ]);
  };

  // Funções para controle do TimePicker
  const abrirTimePicker = () => {
    setShowTimePicker(true);
  };

  const onChangeTime = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setHoraTreino(selectedDate);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Utilizador não identificado 😕</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.logoutText}>Voltar ao Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Bem-vindo, {user.displayName || user.email.split('@')[0]} 👋
      </Text>

      {fraseMotivacional !== '' && (
        <Text style={styles.fraseMotivacional}>{fraseMotivacional}</Text>
      )}

      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={marcarDatas}
        style={styles.calendar}
        theme={{
          selectedDayBackgroundColor: '#3478f6',
          todayTextColor: '#2563eb',
          arrowColor: '#3478f6',
          monthTextColor: '#2563eb',
          textSectionTitleColor: '#94a3b8',
          textDayFontWeight: '600',
          textMonthFontWeight: '700',
        }}
      />

      {selectedDate && (
        <>
          <View style={styles.headerTreinos}>
            <Text style={styles.dateLabel}>
              Treinos para {selectedDate} ({treinosDia.length})
            </Text>
            {treinosDia.length > 0 && (
              <TouchableOpacity
                style={styles.limparBtn}
                onPress={limparTreinosDoDia}
              >
                <Icon name="trash" size={18} color="#ef4444" />
                <Text style={styles.limparText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={treinosDia}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => (
              <Pressable
                onLongPress={() => removerTreino(index)}
                style={({ pressed }) => [
                  styles.treinoItem,
                  { borderLeftColor: tipoCores[item.tipo] },
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={styles.iconNome}>
                  <View
                    style={[
                      styles.iconBg,
                      { backgroundColor: tipoCores[item.tipo] + '33' },
                    ]}
                  >
                    <Icon
                      name={tipoIcones[item.tipo] || 'question'}
                      size={20}
                      color={tipoCores[item.tipo]}
                    />
                  </View>
                  <View>
                    <Text style={styles.nomeTreino}>{item.nome}</Text>
                    <Text style={styles.tipoTreino}>{item.tipo}</Text>
                  </View>
                </View>
                <Text style={styles.horaTreinoItem}>{item.hora}</Text>
              </Pressable>
            )}
            style={{ marginBottom: 16 }}
          />

          <TouchableOpacity style={styles.botaoAdicionar} onPress={abrirModal}>
            <Text style={styles.textoBotaoAdicionar}>+ Adicionar treino</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modal para adicionar treino */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar treino</Text>

            <TextInput
              placeholder="Nome do treino"
              style={styles.input}
              value={nomeTreino}
              onChangeText={setNomeTreino}
            />

            <Text style={styles.label}>Tipo de treino:</Text>
            <View style={styles.opcoesContainer}>
              {opcoesDeTreino.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.opcao,
                    {
                      backgroundColor:
                        tipoSelecionado === tipo ? tipoCores[tipo] : '#f3f4f6',
                    },
                  ]}
                  onPress={() => setTipoSelecionado(tipo)}
                >
                  <Icon
                    name={tipoIcones[tipo]}
                    size={20}
                    color={tipoSelecionado === tipo ? '#fff' : tipoCores[tipo]}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={{
                      color: tipoSelecionado === tipo ? '#fff' : '#111',
                      fontWeight: '600',
                    }}
                  >
                    {tipo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Hora do treino:</Text>
            <TouchableOpacity
              onPress={abrirTimePicker}
              style={styles.timePickerButton}
            >
              <Text style={styles.timePickerText}>
                {horaTreino.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={horaTreino}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onChangeTime}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={guardarTreino}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                  Guardar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
{mostrarMensagemSucesso && (
  <Animated.View
    pointerEvents="none"
    style={[styles.fraseFade, { opacity: fadeAnim }]}
  >
    <Text style={styles.fraseFadeText}>✔️ Treino guardado com sucesso!</Text>
  </Animated.View>
)}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  welcome: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  fraseMotivacional: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#6b7280',
    marginBottom: 12,
  },
  calendar: {
    marginBottom: 16,
  },
  headerTreinos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  limparBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  limparText: {
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  treinoItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    marginVertical: 6,
    borderRadius: 8,
    borderLeftWidth: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconNome: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  nomeTreino: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  tipoTreino: {
    fontSize: 12,
    color: '#6b7280',
  },
  horaTreinoItem: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  botaoAdicionar: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  textoBotaoAdicionar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#111',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
  },
  opcoesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',         // permite quebrar linha
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 4,       // padding menor vertical
    paddingHorizontal: 8,     // padding menor horizontal
    marginRight: 8,
    marginBottom: 8,
  },
  timePickerButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  timePickerText: {
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  fraseFade: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fraseFadeText: {
    backgroundColor: '#22c55e',
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});
