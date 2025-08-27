// screens/Admin/GestaoAlunosScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
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
import { getAuth } from 'firebase/auth';

import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

// Fallbacks (caso alguém remova do Colors)
const GRADIENT_GOLD = Colors.gradientGold || ['#FFB800', '#D19A24'];
const SECONDARY_SOFT = Colors.secondarySoft || 'rgba(255, 184, 0, 0.12)';

const ERROR_RED = '#E53935';

const Layout = {
  padding: 20,
  spacing: { xsmall: 4, small: 8, medium: 16, large: 24, xlarge: 32 },
  borderRadius: { small: 6, medium: 12, large: 20, pill: 999 },
  fontSizes: { xsmall: 12, small: 14, medium: 16, large: 18, xlarge: 20, title: 24 },
  cardElevation: Platform.select({
    ios: {
      shadowColor: 'rgba(0,0,0,0.15)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  }),
};

// util: YYYY-MM-DD -> Date 00:00
const parseYMD = (s) => {
  if (!s || typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

export default function GestaoAlunosScreen() {
  const auth = getAuth();

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
  const [adminInfo, setAdminInfo] = useState(null);

  const tiposDeTreino = ['Cardio', 'Musculação', 'Funcional', 'Alongamento', 'Crossfit'];

  const isPastSelected = useMemo(() => {
    const sel = parseYMD(selectedDate);
    if (!sel) return false;
    return sel < startOfToday();
  }, [selectedDate]);

  /* -------- Admin info -------- */
  const fetchAdminInfo = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAdminInfo({ nome: 'Visitante' });
      return () => {};
    }
    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) setAdminInfo(snap.data());
        else setAdminInfo({ nome: 'Admin' });
      },
      () => setAdminInfo({ nome: 'Admin' })
    );
    return unsub;
  }, [auth]);

  useEffect(() => {
    const unsubscribe = fetchAdminInfo();
    return () => unsubscribe && unsubscribe();
  }, [fetchAdminInfo]);

  /* -------- Marcação de dias -------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'agenda'), (snapshot) => {
      const marcacoes = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};

        const dots = [];
        let hasUrgente = false;

        const notas = Array.isArray(data.notas) ? data.notas.filter(Boolean) : [];
        const treinos = Array.isArray(data.treinos) ? data.treinos.filter(Boolean) : [];
        const avaliacoes = Array.isArray(data.avaliacoes) ? data.avaliacoes.filter(Boolean) : [];

        if (notas.length > 0) {
          dots.push({ key: 'nota', color: Colors.secondary || Colors.primary });
          if (notas.some((n) => n.urgente)) hasUrgente = true;
        }
        if (treinos.length > 0) {
          treinos.forEach((t) => {
            if (t?.tipoAgendamento === 'treinoCompleto') {
              dots.push({ key: `treinoCompleto-${t.id}`, color: Colors.primary });
            } else {
              dots.push({ key: `anotacaoTreino-${t.id}`, color: Colors.textSecondary });
            }
            if (t?.urgente) hasUrgente = true;
          });
        }
        if (avaliacoes.length > 0) {
          dots.push({ key: 'avaliacao', color: Colors.textPrimary });
          if (avaliacoes.some((a) => a.urgente)) hasUrgente = true;
        }

        if (hasUrgente) dots.unshift({ key: 'urgente', color: ERROR_RED });

        if (dots.length > 0) {
          marcacoes[docSnap.id] = {
            marked: true,
            dots,
            activeOpacity: 0,
            selectedColor: hasUrgente ? ERROR_RED : (Colors.secondary || Colors.primary),
          };
        }
      });
      setDatasMarcadas(marcacoes);
    });
    return () => unsub();
  }, []);

  /* -------- Dados da data selecionada -------- */
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    const ref = doc(db, 'agenda', selectedDate);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() || {};
          setDadosData({
            notas: (d.notas || []).filter(Boolean),
            treinos: (d.treinos || []).filter(Boolean),
            avaliacoes: (d.avaliacoes || []).filter(Boolean),
          });
        } else {
          setDadosData({ notas: [], treinos: [], avaliacoes: [] });
        }
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao ouvir data:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedDate]);

  /* -------- Carregar clientes -------- */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.role === 'user')
        .map((c) => ({
          id: c.id,
          label: c.name || c.nome || c.email || 'Cliente',
          value: c.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt'));
      setClientes(list);
    });
    return () => unsub();
  }, []);

  /* -------- Eventos de UI -------- */
  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setFormType(null);
    setClienteSelecionado(null);
    setTipoTreinoSelecionado(null);
    setObservacoesTreino('');
    setUrgente(false);
    setHoraTreino(null);
    setAvaliacao('');
    setNota('');
    setHoraAvaliacao(null);
    setShowTimePicker(false);
  };

  const deletarItem = async (tipo, id) => {
    if (!selectedDate) return;
    const ref = doc(db, 'agenda', selectedDate);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      Alert.alert('Erro', 'Documento não encontrado.');
      return;
    }
    const data = snap.data() || {};
    const lista = (data[tipo] || []).filter((it) => it && it.id !== id);
    try {
      await updateDoc(ref, { [tipo]: lista });
      setDadosData((prev) => ({ ...prev, [tipo]: lista }));
      Alert.alert('Sucesso', 'Item excluído.');
    } catch (e) {
      console.error('[deletarItem]', e);
      Alert.alert('Erro', 'Falha ao excluir.');
    }
  };

  const salvarDados = async () => {
    if (!formType || !selectedDate) return;

    // >>> BLOQUEIO GERAL: nada pode ser criado em datas passadas
    if (isPastSelected) {
      Alert.alert('Data passada', 'Não é possível adicionar itens em dias anteriores.');
      return;
    }

    let novoDado = null;
    let tipoLista = '';

    if (formType === 'nota') {
      if (!nota.trim()) return Alert.alert('Erro', 'Digite uma nota.');
      novoDado = { id: Date.now().toString(), texto: nota.trim(), urgente };
      tipoLista = 'notas';
      setNota('');
    }

    if (formType === 'treino') {
      if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
      if (!tipoTreinoSelecionado) return Alert.alert('Erro', 'Selecione o tipo de treino.');
      if (!horaTreino) return Alert.alert('Erro', 'Selecione a hora do treino.');
      novoDado = {
        id: Date.now().toString(),
        clienteId: clienteSelecionado,
        clienteNome:
          clientes.find((c) => c.value === clienteSelecionado)?.label || 'Cliente',
        tipo: tipoTreinoSelecionado,
        observacoes: observacoesTreino.trim(),
        urgente,
        dataAgendada: selectedDate,
        hora: horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tipoAgendamento: 'anotacaoTreino',
      };
      tipoLista = 'treinos';
      setClienteSelecionado(null);
      setTipoTreinoSelecionado(null);
      setObservacoesTreino('');
      setHoraTreino(null);
    }

    if (formType === 'avaliacao') {
      if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
      if (!avaliacao.trim()) return Alert.alert('Erro', 'Digite a avaliação.');
      if (!horaAvaliacao) return Alert.alert('Erro', 'Selecione a hora da avaliação.');
      novoDado = {
        id: Date.now().toString(),
        clienteId: clienteSelecionado,
        clienteNome:
          clientes.find((c) => c.value === clienteSelecionado)?.label || 'Cliente',
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

    const ref = doc(db, 'agenda', selectedDate);
    try {
      const snap = await getDoc(ref);
      const current = snap.exists()
        ? (snap.data()?.[tipoLista] || []).filter(Boolean)
        : [];
      const updated = [...current, novoDado];

      await setDoc(ref, { [tipoLista]: updated }, { merge: true });
      setDadosData((prev) => ({ ...prev, [tipoLista]: updated }));

      Alert.alert('Sucesso', 'Dados salvos!');
      setFormType(null);
      setModalVisible(false);
      setUrgente(false);
      setShowTimePicker(false);
    } catch (e) {
      console.error('[salvarDados]', e);
      Alert.alert('Erro', 'Falha ao salvar.');
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (!selectedTime) return;
    if (formType === 'treino') setHoraTreino(selectedTime);
    if (formType === 'avaliacao') setHoraAvaliacao(selectedTime);
  };

  const TimePicker = ({ value, onChange, label }) => (
    <View style={styles.timePickerContainer}>
      <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowTimePicker(true)}>
        <Text style={styles.timePickerButtonText}>
          {value
            ? `${label}: ${value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : `Selecionar ${label.toLowerCase()}`}
        </Text>
        <MaterialIcons name="access-time" size={20} color={Colors.textPrimary} />
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChange}
        />
      )}
    </View>
  );

  const abrirModalTipo = () => {
    if (!selectedDate) {
      Alert.alert('Atenção', 'Seleciona primeiro uma data no calendário.');
      return;
    }
    setFormType(null);
    setModalVisible(true);
  };

  const renderDataList = (tipo) => {
    const lista = (dadosData[tipo] || []).filter(Boolean);
    if (lista.length === 0) {
      return (
        <Text style={styles.noDataItemText}>
          Nenhum {tipo.slice(0, -1)} agendado para esta data.
        </Text>
      );
    }

    // (se quiseres bloquear apagar em passado para todos os tipos, diz que ajusto)
    const allowDeleteEvenInPast = tipo !== 'notas' || !isPastSelected;

    return lista.map((item) => (
      <View
        key={item.id}
        style={[
          styles.itemContainer,
          item.urgente && styles.urgentItem,
          item.tipoAgendamento === 'treinoCompleto' && styles.treinoCompletoItem,
          Layout.cardElevation,
        ]}
      >
        <View style={styles.itemContent}>
          {tipo === 'treinos' ? (
            <>
              <Text
                style={[
                  styles.itemTitle,
                  item.tipoAgendamento === 'treinoCompleto' && styles.treinoCompletoTitle,
                ]}
              >
                {item.tipoAgendamento === 'treinoCompleto'
                  ? 'Treino Completo'
                  : 'Anotação de Treino'}
              </Text>
              <Text style={styles.itemDetail}>
                <Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}
              </Text>
              <Text style={styles.itemDetail}>
                <Text style={styles.itemLabel}>Tipo:</Text> {item.tipo}
              </Text>
              <Text style={styles.itemDetail}>
                <Text style={styles.itemLabel}>Hora:</Text> {item.hora}
              </Text>
              {!!item.observacoes && (
                <Text style={styles.itemDetail}>
                  <Text style={styles.itemLabel}>Obs:</Text> {item.observacoes}
                </Text>
              )}
              {item.urgente && (
                <Text style={[styles.itemDetail, styles.urgentText]}>
                  <Text style={styles.itemLabel}>Urgente:</Text> Sim
                </Text>
              )}
            </>
          ) : tipo === 'notas' ? (
            <>
              <Text style={styles.itemTitle}>Nota</Text>
              <Text style={styles.itemText}>{item.texto}</Text>
              {item.urgente && (
                <Text style={[styles.itemDetail, styles.urgentText]}>
                  <Text style={styles.itemLabel}>Urgente:</Text> Sim
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.itemTitle}>Avaliação</Text>
              <Text style={styles.itemDetail}>
                <Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}
              </Text>
              <Text style={styles.itemDetail}>
                <Text style={styles.itemLabel}>Avaliação:</Text> {item.texto}
              </Text>
              {!!item.hora && (
                <Text style={styles.itemDetail}>
                  <Text style={styles.itemLabel}>Hora:</Text> {item.hora}
                </Text>
              )}
              {!!item.observacoes && (
                <Text style={styles.itemDetail}>
                  <Text style={styles.itemLabel}>Observações:</Text> {item.observacoes}
                </Text>
              )}
              {item.urgente && (
                <Text style={[styles.itemDetail, styles.urgentText]}>
                  <Text style={styles.itemLabel}>Urgente:</Text> Sim
                </Text>
              )}
            </>
          )}
        </View>

        {allowDeleteEvenInPast && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Confirmar exclusão',
                'Tem a certeza que deseja excluir?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deletarItem(tipo, item.id) },
                ],
                { cancelable: true }
              )
            }
            style={styles.deleteButton}
          >
            <MaterialIcons name="delete" size={24} color={ERROR_RED} />
          </TouchableOpacity>
        )}
      </View>
    ));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppHeader title="Agenda" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={onDayPress}
            markingType="multi-dot"
            markedDates={{
              ...datasMarcadas,
              ...(selectedDate
                ? {
                    [selectedDate]: {
                      selected: true,
                      selectedColor:
                        datasMarcadas[selectedDate]?.selectedColor || Colors.secondary || Colors.primary,
                      dots: datasMarcadas[selectedDate]?.dots || [],
                      selectedTextColor: Colors.onPrimary || '#FFF',
                    },
                  }
                : {}),
            }}
            theme={{
              backgroundColor: Colors.cardBackground,
              calendarBackground: Colors.cardBackground,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: Colors.onPrimary || '#FFF',
              todayTextColor: Colors.secondary || Colors.primary,
              dayTextColor: Colors.textPrimary,
              textDisabledColor: Colors.textSecondary,
              dotColor: Colors.primary,
              selectedDotColor: Colors.onPrimary || '#FFF',
              arrowColor: Colors.textPrimary,
              monthTextColor: Colors.textPrimary,
              textSectionTitleColor: Colors.textSecondary,
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
              textDayFontSize: Layout.fontSizes.medium,
              textMonthFontSize: Layout.fontSizes.large,
              textDayHeaderFontSize: Layout.fontSizes.small,
            }}
            style={styles.calendarStyle}
          />
        </View>

        {selectedDate && isPastSelected && (
          <View style={styles.infoBanner}>
            <MaterialIcons name="lock" size={18} color={Colors.secondary} />
            <Text style={styles.infoBannerText}>
              Esta é uma data passada: não é possível **adicionar** novos itens.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.activityIndicator} />
        ) : selectedDate ? (
          <View style={styles.detailsContainer}>
            {dadosData.notas.length === 0 &&
            dadosData.treinos.length === 0 &&
            dadosData.avaliacoes.length === 0 ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="info-outline" size={80} color={Colors.textSecondary} />
                <Text style={styles.noDataText}>Nenhum agendamento para esta data.</Text>
                <Text style={styles.noDataSubText}>
                  Toca no botão “+” para adicionar uma nota, treino ou avaliação.
                </Text>
              </View>
            ) : (
              <>
                {dadosData.notas.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="note" size={24} color={Colors.textPrimary} style={styles.sectionIcon} />
                      <Text style={styles.sectionTitle}>Notas</Text>
                    </View>
                    {renderDataList('notas')}
                  </>
                )}

                {dadosData.treinos.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons
                        name="fitness-center"
                        size={24}
                        color={Colors.textPrimary}
                        style={styles.sectionIcon}
                      />
                      <Text style={styles.sectionTitle}>Treinos</Text>
                    </View>
                    {renderDataList('treinos')}
                  </>
                )}

                {dadosData.avaliacoes.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="assignment" size={24} color={Colors.textPrimary} style={styles.sectionIcon} />
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
            <MaterialIcons name="event" size={80} color={Colors.textSecondary} />
            <Text style={styles.noDateSelectedText}>Seleciona uma data para ver os agendamentos</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={abrirModalTipo}>
        <MaterialIcons name="add" size={30} color={Colors.onPrimary || '#FFF'} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setFormType(null);
          setShowTimePicker(false);
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {!formType ? (
              <AddItemSheet
                disabled={isPastSelected}
                selectedDate={selectedDate}
                onChoose={(tipo) => setFormType(tipo)}
                onClose={() => {
                  setModalVisible(false);
                  setFormType(null);
                }}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.modalFormScroll}>
                <Text style={styles.modalTitle}>
                  {formType === 'nota'
                    ? 'Adicionar Nota'
                    : formType === 'treino'
                    ? 'Agendar Treino'
                    : 'Agendar Avaliação'}
                </Text>

                {(formType === 'treino' || formType === 'avaliacao') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Cliente</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={clienteSelecionado}
                        onValueChange={(v) => setClienteSelecionado(v)}
                        style={styles.pickerStyle}
                        itemStyle={styles.pickerItemStyle}
                      >
                        <Picker.Item label="Selecione um cliente" value={null} />
                        {clientes.map((c) => (
                          <Picker.Item key={c.value} label={c.label} value={c.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                )}

                {formType === 'treino' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Tipo de Treino</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={tipoTreinoSelecionado}
                          onValueChange={(v) => setTipoTreinoSelecionado(v)}
                          style={styles.pickerStyle}
                          itemStyle={styles.pickerItemStyle}
                        >
                          <Picker.Item label="Selecione o tipo de treino" value={null} />
                          {tiposDeTreino.map((tipo) => (
                            <Picker.Item key={tipo} label={tipo} value={tipo} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    <TimePicker
                      value={horaTreino}
                      onChange={handleTimeChange}
                      label="Hora do Treino"
                    />

                    <TextInput
                      style={styles.textInput}
                      placeholder="Observações do treino (opcional)"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      value={observacoesTreino}
                      onChangeText={setObservacoesTreino}
                    />
                  </>
                )}

                {formType === 'nota' && (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Escreve a nota"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    value={nota}
                    onChangeText={setNota}
                  />
                )}

                {formType === 'avaliacao' && (
                  <>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Descrição da avaliação"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      value={avaliacao}
                      onChangeText={setAvaliacao}
                    />
                    <TimePicker
                      value={horaAvaliacao}
                      onChange={handleTimeChange}
                      label="Hora da Avaliação"
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Observações (opcional)"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                      value={observacoesTreino}
                      onChangeText={setObservacoesTreino}
                    />
                  </>
                )}

                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Marcar como urgente?</Text>
                  <Switch
                    trackColor={{ false: Colors.divider, true: ERROR_RED }}
                    thumbColor={urgente ? Colors.onPrimary || '#FFF' : '#FFF'}
                    ios_backgroundColor={Colors.divider}
                    value={urgente}
                    onValueChange={setUrgente}
                  />
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={salvarDados}>
                    <Text style={styles.buttonText}>Guardar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonCancel]}
                    onPress={() => {
                      setModalVisible(false);
                      setFormType(null);
                      setUrgente(false);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={styles.buttonCancelText}>Cancelar</Text>
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

/** --- Sheet de ações com gradiente dourado --- */
function AddItemSheet({ disabled, onChoose, onClose, selectedDate }) {
  const dateLabel = selectedDate
    ? new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('pt-PT', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
      })
    : '';

  return (
    <View>
      <Text style={addStyles.title}>Adicionar novo item</Text>

      <View style={addStyles.dateRow}>
        <MaterialIcon name="calendar-today" size={16} color={Colors.textSecondary} />
        <Text style={addStyles.dateText}>{dateLabel}</Text>
        {disabled && (
          <View style={addStyles.badge}>
            <MaterialIcon name="lock" size={14} color={Colors.secondary} />
            <Text style={addStyles.badgeText}>Só leitura (data passada)</Text>
          </View>
        )}
      </View>

      <View style={addStyles.actionsRow}>
        <ActionTile
          label="Nota"
          icon="note"
          disabled={disabled}
          onPress={() => onChoose?.('nota')}
        />
        <ActionTile
          label="Treino"
          icon="fitness-center"
          disabled={disabled}
          onPress={() => onChoose?.('treino')}
        />
        <ActionTile
          label="Avaliação"
          icon="assignment"
          disabled={disabled}
          onPress={() => onChoose?.('avaliacao')}
        />
      </View>

      <TouchableOpacity onPress={onClose} style={addStyles.closeBtn} activeOpacity={0.85}>
        <Text style={addStyles.closeText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );
}

function ActionTile({ label, icon, onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.92}
      onPress={disabled ? undefined : onPress}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={disabled ? [Colors.cardBackground, Colors.cardBackground] : GRADIENT_GOLD}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={addStyles.tileBorder}
      >
        <View style={[addStyles.tileInner, disabled && addStyles.tileInnerDisabled]}>
          <View style={addStyles.iconCircle}>
            <MaterialIcon
              name={icon}
              size={20}
              color={disabled ? Colors.textSecondary : Colors.primary}
            />
          </View>
          <Text style={[addStyles.tileLabel, disabled && { color: Colors.textSecondary }]}>
            {label}
          </Text>

          {disabled && (
            <View style={addStyles.lockMini}>
              <MaterialIcon name="lock" size={13} color={Colors.secondary} />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// alias para reaproveitar o import
const MaterialIcon = MaterialIcons;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ''},
  scrollContent: { paddingBottom: Layout.padding + 70 },

  calendarContainer: {
    backgroundColor: Colors.cardBackground,
    margin: Layout.padding,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.cardElevation,
    overflow: 'hidden',
  },
  calendarStyle: { borderRadius: Layout.borderRadius.medium, paddingBottom: Layout.spacing.small },
  activityIndicator: { marginTop: Layout.spacing.xlarge },

  infoBanner: {
    marginHorizontal: Layout.padding,
    marginTop: -8,
    marginBottom: Layout.spacing.small,
    padding: 10,
    borderRadius: 10,
    backgroundColor: SECONDARY_SOFT,
    borderWidth: 1,
    borderColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBannerText: { color: Colors.primary, fontWeight: '700', flex: 1 },

  detailsContainer: { padding: Layout.padding },

  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.xlarge * 2,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.medium,
    ...Layout.cardElevation,
  },
  noDataText: { fontSize: Layout.fontSizes.large, color: Colors.textPrimary, marginTop: Layout.spacing.medium, textAlign: 'center' },
  noDataSubText: { fontSize: Layout.fontSizes.small, color: Colors.textSecondary, marginTop: Layout.spacing.xsmall, textAlign: 'center', paddingHorizontal: Layout.spacing.large },

  noDateSelectedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Layout.spacing.xlarge * 2,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.medium,
    margin: Layout.padding,
    ...Layout.cardElevation,
  },
  noDateSelectedText: { fontSize: Layout.fontSizes.large, color: Colors.textPrimary, marginTop: Layout.spacing.medium, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.medium, marginTop: Layout.spacing.large },
  sectionIcon: { marginRight: Layout.spacing.small },
  sectionTitle: { fontSize: Layout.fontSizes.xlarge, fontWeight: 'bold', color: Colors.textPrimary },

  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.medium,
    marginBottom: Layout.spacing.medium,
    borderLeftWidth: 5,
    borderLeftColor: Colors.secondary || Colors.primary,
  },
  treinoCompletoItem: { borderLeftColor: Colors.primary },
  itemContent: { flex: 1, marginRight: Layout.spacing.small },
  itemTitle: { fontSize: Layout.fontSizes.large, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Layout.spacing.xsmall },
  treinoCompletoTitle: { color: Colors.primary },
  itemDetail: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary, marginBottom: Layout.spacing.xsmall / 2 },
  itemLabel: { fontWeight: 'bold', color: Colors.textSecondary },
  itemText: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary },
  urgentItem: { borderLeftColor: ERROR_RED },
  urgentText: { color: ERROR_RED, fontWeight: 'bold' },
  deleteButton: { padding: Layout.spacing.xsmall },

  fab: {
    position: 'absolute',
    bottom: Layout.padding,
    right: Layout.padding,
    backgroundColor: Colors.primary,
    width: 60,
    height: 60,
    borderRadius: Layout.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.cardElevation,
  },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.large,
    padding: Layout.padding,
    width: '90%',
    maxHeight: '80%',
    ...Layout.cardElevation,
  },
  modalTitle: { fontSize: Layout.fontSizes.xlarge, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: Layout.spacing.large, textAlign: 'center' },

  modalFormScroll: { paddingBottom: Layout.spacing.large },
  inputGroup: { marginBottom: Layout.spacing.medium },
  inputLabel: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary, marginBottom: Layout.spacing.xsmall, fontWeight: 'bold' },

  textInput: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.small,
    padding: Layout.spacing.medium,
    fontSize: Layout.fontSizes.medium,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: Layout.spacing.medium,
    minHeight: 50,
    textAlignVertical: 'top',
  },

  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: Layout.borderRadius.small,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    marginBottom: Layout.spacing.medium,
  },
  pickerStyle: { height: 50, width: '100%', color: Colors.textPrimary },
  pickerItemStyle: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary },

  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.small,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: Layout.spacing.medium,
    paddingHorizontal: Layout.spacing.medium,
    minHeight: 50,
  },
  timePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, paddingVertical: Layout.spacing.small },
  timePickerButtonText: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary },

  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.large,
    paddingHorizontal: Layout.spacing.small,
    paddingVertical: Layout.spacing.xsmall,
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.small,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  switchLabel: { fontSize: Layout.fontSizes.medium, color: Colors.textPrimary, fontWeight: 'bold' },

  buttonGroup: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Layout.spacing.medium },
  button: {
    paddingVertical: Layout.spacing.medium,
    paddingHorizontal: Layout.spacing.large,
    borderRadius: Layout.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: Layout.spacing.xsmall,
    ...Colors.cardElevation,
  },
  buttonSave: { backgroundColor: Colors.primary },
  buttonCancel: { backgroundColor: Colors.textSecondary },
  buttonText: { color: Colors.onPrimary, fontSize: Layout.fontSizes.large, fontWeight: 'bold' },
  buttonCancelText: { color: Colors.onPrimary, fontSize: Layout.fontSizes.large, fontWeight: 'bold' },

  noDataItemText: { color: Colors.textSecondary, fontSize: Layout.fontSizes.medium, marginBottom: Layout.spacing.medium },
});

const addStyles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  dateText: { color: Colors.textSecondary, flex: 1, marginLeft: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SECONDARY_SOFT,
    borderColor: Colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: Colors.primary, fontWeight: '800', fontSize: 11 },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  tileBorder: {
    borderRadius: 16,
    padding: 2,
  },
  tileInner: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    ...Colors.cardElevation,
  },
  tileInnerDisabled: {
    backgroundColor: Colors.surface,
  },
  iconCircle: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
  tileLabel: {
    fontWeight: '800',
    color: Colors.primary,
  },
  lockMini: {
    position: 'absolute',
    top: 8, right: 8,
    backgroundColor: SECONDARY_SOFT,
    borderWidth: 1, borderColor: Colors.secondary,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 999,
  },
  closeBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: Colors.primary, fontWeight: '800' },
});
