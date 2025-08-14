// screens/Admin/CreateGroupClassScreen.js
// Este ecrã permite que Personal Trainers criem novas aulas de grupo ou editem aulas existentes.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addDoc, collection, Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore'; // Adicionado updateDoc
import { db, auth } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native'; // Adicionado useRoute
import { useUser } from '../../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  primary: '#D4AC54', // Dourado/Mostarda
  primaryDark: '#A88433', // Dourado mais escuro
  secondary: '#69511A', // Castanho escuro
  textMuted: '#767676', // Cinzento médio para texto secundário
  background: '#F0F2F5', // Fundo geral da tela (mais suave)
  cardBackground: '#FFFFFF', // Fundo de cards e inputs
  border: '#E0E0E0', // Cor da borda
  shadow: 'rgba(0,0,0,0.1)', // Cor da sombra
  danger: '#D32F2F', // Cor para erros/ações destrutivas
  textLight: '#FFFFFF', // Cor de texto claro
};

export default function CreateGroupClassScreen() {
  const navigation = useNavigation();
  const route = useRoute(); // Hook para aceder aos parâmetros da rota
  const { classData } = route.params || {}; // Obtém classData se existir, senão é um objeto vazio

  const { user, userDetails: ptData, isLoadingUserDetails: userContextLoading } = useUser(); 

  // LOGS DE DIAGNÓSTICO: Mantenha estes logs para verificar o comportamento do contexto
  useEffect(() => {
    console.log("--- CreateGroupClassScreen Render ---");
    console.log("User from context:", user);
    console.log("PT Data from context (userDetails as ptData):", ptData);
    console.log("User Context Loading (isLoadingUserDetails):", userContextLoading);
    console.log("Class Data for Editing:", classData); // Log para ver os dados da aula
    console.log("-----------------------------------");
  }, [user, ptData, userContextLoading, classData]);

  // Estados para os campos do formulário
  // Inicializa com os dados da aula se estiver em modo de edição, senão com valores padrão
  const [className, setClassName] = useState(classData?.name || '');
  const [description, setDescription] = useState(classData?.description || '');
  const [date, setDate] = useState(classData?.dateTime?.toDate() || new Date());
  const [time, setTime] = useState(classData?.dateTime?.toDate() || new Date());
  const [capacity, setCapacity] = useState(classData?.capacity?.toString() || ''); // Capacidade é um número, converte para string

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false); // Estado de carregamento para o botão

  // Determina se estamos em modo de edição
  const isEditMode = !!classData?.id; 
  const screenTitle = isEditMode ? 'Editar Aula de Grupo' : 'Criar Nova Aula';
  const buttonText = isEditMode ? 'Atualizar Aula' : 'Criar Aula';

  // Formata a data para exibição
  const formatDate = (rawDate) => {
    return rawDate.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Formata a hora para exibição
  const formatTime = (rawTime) => {
    return rawTime.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  // Handler para salvar ou atualizar a aula de grupo
  const handleSaveClass = useCallback(async () => { // Renomeado para handleSaveClass
    // Validação dos campos obrigatórios
    if (!className.trim() || !capacity.trim() || !date || !time) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios (Nome da Aula, Data, Hora, Capacidade).');
      return;
    }
    // Validação da capacidade
    const parsedCapacity = parseInt(capacity);
    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      Alert.alert('Erro', 'A capacidade deve ser um número válido maior que zero.');
      return;
    }

    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser || !currentAuthUser.uid) {
      Alert.alert('Erro de Autenticação', 'Nenhum utilizador logado. Por favor, faça login novamente.');
      return;
    }

    let personalTrainerName = ptData?.name || ptData?.nome;
    if (!personalTrainerName) {
        try {
            const ptDocRef = doc(db, 'users', currentAuthUser.uid);
            const ptDocSnap = await getDoc(ptDocRef);
            if (ptDocSnap.exists()) {
                const fetchedPtData = ptDocSnap.data();
                personalTrainerName = fetchedPtData.name || fetchedPtData.nome;
            }
        } catch (fetchError) {
            console.error("Erro ao buscar nome do PT diretamente do Firestore (fallback):", fetchError);
        }
    }

    if (!personalTrainerName) {
        Alert.alert('Erro de Dados', 'Não foi possível identificar o nome do Personal Trainer. Verifique o seu perfil ou tente novamente.');
        return;
    }

    setLoading(true); // Ativa o estado de carregamento
    try {
      // Combina a data e a hora selecionadas num único objeto Date
      const classDateTime = new Date(date);
      classDateTime.setHours(time.getHours());
      classDateTime.setMinutes(time.getMinutes());
      classDateTime.setSeconds(0);
      classDateTime.setMilliseconds(0);

      const classDataToSave = {
        name: className.trim(),
        description: description.trim(),
        dateTime: Timestamp.fromDate(classDateTime), // Converte para Timestamp do Firestore
        capacity: parsedCapacity,
        ptId: currentAuthUser.uid,
        ptName: personalTrainerName,
      };

      if (isEditMode) {
        // Modo de Edição: Atualiza o documento existente
        const classRef = doc(db, 'groupClasses', classData.id);
        await updateDoc(classRef, classDataToSave);
        Alert.alert('Sucesso', 'Aula atualizada com sucesso!');
      } else {
        // Modo de Criação: Adiciona um novo documento
        const newClass = {
          ...classDataToSave,
          currentParticipants: 0, // Inicia com 0 participantes apenas em criação
          participants: [], // Array vazio para guardar os UIDs dos inscritos apenas em criação
          createdAt: Timestamp.now(), // Timestamp da criação do documento
        };
        await addDoc(collection(db, 'groupClasses'), newClass);
        Alert.alert('Sucesso', 'Aula de grupo criada com sucesso!');
      }
      
      navigation.goBack(); // Volta para a tela anterior (ex: MyGroupClassesScreen)
    } catch (error) {
      console.error('Erro ao salvar aula de grupo:', error);
      Alert.alert('Erro', `Não foi possível ${isEditMode ? 'atualizar' : 'criar'} a aula de grupo. Tente novamente.`);
    } finally {
      setLoading(false); // Desativa o estado de carregamento
    }
  }, [className, description, date, time, capacity, user, ptData, navigation, isEditMode, classData]); // Adicionado isEditMode e classData às dependências

  // Exibe um indicador de carregamento se os dados do PT ainda não estiverem disponíveis
  if (userContextLoading || !user || !ptData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>A carregar dados do Personal Trainer...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.formIntroText}>
            {isEditMode ? 'Edite os detalhes da aula existente.' : 'Preencha os detalhes para agendar uma nova aula de grupo.'}
          </Text>

          {/* Campo Nome da Aula */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Aula:</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="easel-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Yoga Matinal, HIIT Intenso"
                placeholderTextColor={colors.textMuted}
                value={className}
                onChangeText={setClassName}
                editable={!loading}
              />
            </View>
          </View>

          {/* Campo Descrição */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição (Opcional):</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="document-text-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalhes da aula, o que esperar, etc."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </View>
          </View>

          {/* Seletores de Data e Hora */}
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Text style={styles.label}>Data da Aula:</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)} disabled={loading}>
                <Ionicons name="calendar-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                <Text style={styles.datePickerButtonText}>{formatDate(date)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()} // Aulas não podem ser criadas no passado
                />
              )}
            </View>

            <View style={styles.dateTimeItem}>
              <Text style={styles.label}>Hora da Aula:</Text>
              <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowTimePicker(true)} disabled={loading}>
                <Ionicons name="time-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
                <Text style={styles.datePickerButtonText}>{formatTime(time)}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display="default"
                  onChange={onChangeTime}
                />
              )}
            </View>
          </View>

          {/* Campo Capacidade Máxima */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Capacidade Máxima de Alunos:</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons name="people-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Número de vagas"
                placeholderTextColor={colors.textMuted}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {/* Botão Criar/Atualizar Aula */}
          <TouchableOpacity style={styles.button} onPress={handleSaveClass} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <Text style={styles.buttonText}>{buttonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.secondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  formIntroText: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.secondary,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.secondary,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingVertical: 15,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateTimeItem: {
    flex: 1,
    marginRight: 10,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    justifyContent: 'flex-start',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: colors.secondary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
