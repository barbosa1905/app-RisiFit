// screens/Admin/ManagePTClassesScreen.js
// Este ecrã é o painel de controlo semanal para Personal Trainers,
// permitindo visualizar as suas aulas, ver inscritos, editar e cancelar.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isPast,
  isToday,
} from 'date-fns';
import { pt } from 'date-fns/locale';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primary: '#D4AC54', // Dourado/Mostarda
  primaryDark: '#A88433', // Dourado mais escuro
  secondary: '#69511A', // Castanho escuro para títulos e texto principal
  textMuted: '#767676', // Cinzento médio para placeholders e texto secundário
  background: '#F0F2F5', // Fundo geral da tela (mais suave)
  cardBackground: '#FFFFFF', // Fundo de cards e inputs
  border: '#E0E0E0', // Cor da borda para inputs e cards
  shadow: 'rgba(0,0,0,0.1)', // Sombra mais proeminente
  danger: '#D32F2F', // Cor para erros/ações destrutivas
  success: '#4CAF50', // Cor para sucesso
  textLight: '#FFFFFF', // Cor de texto claro (para botões)
  info: '#2196F3', // Azul para informações ou estados neutros
  lightPrimary: '#F8F1E4', // Um dourado mais claro para fundos sutis
  lightDanger: '#FFEBEE', // Um vermelho mais claro para fundos de alerta
  lightSuccess: '#E8F5E9', // Um verde mais claro para fundos de sucesso
};

// Rótulos dos dias da semana para exibição (ajustado para começar na Segunda-feira)
const daysOfWeekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Definição das constantes para cálculo de layout
const CONTAINER_HORIZONTAL_PADDING_VALUE = 8; // Valor para o padding horizontal do container
const COLUMN_MARGIN_HORIZONTAL_VALUE = 1; // Valor para a margem horizontal de cada coluna

// Cálculo da largura de cada coluna do dia (usando os valores literais)
const dayColumnWidth = (screenWidth - (2 * CONTAINER_HORIZONTAL_PADDING_VALUE) - (2 * COLUMN_MARGIN_HORIZONTAL_VALUE * 7)) / 7;

export default function ManagePTClassesScreen() {
  const navigation = useNavigation();
  const [myClasses, setMyClasses] = useState([]); // Aulas criadas por este PT
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date()); // Data para a semana atual exibida (também atua como o dia selecionado)
  const [classesForSelectedDay, setClassesForSelectedDay] = useState([]); // NOVO ESTADO: Aulas para o dia selecionado
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Função para formatar a hora para exibição (apenas hora)
  const formatTimeOnly = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para formatar o intervalo da semana para exibição
  const formatWeekRange = (date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return `${format(start, 'dd MMM', { locale: pt })} - ${format(end, 'dd MMM', { locale: pt })}`;
  };

  // Função para buscar as aulas criadas pelo PT logado
  const fetchMyClasses = useCallback(() => {
    const ptId = auth.currentUser?.uid;
    if (!ptId) {
      setLoading(false);
      setMyClasses([]);
      console.log("Nenhum Personal Trainer logado. Não é possível carregar as suas aulas.");
      return () => {};
    }

    setLoading(true);
    const q = query(
      collection(db, 'groupClasses'),
      where('ptId', '==', ptId),
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateTime: doc.data().dateTime instanceof Timestamp ? doc.data().dateTime : Timestamp.fromDate(new Date(doc.data().dateTime.seconds * 1000)),
      }));
      setMyClasses(fetchedClasses);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Erro ao carregar as minhas aulas de grupo:', error);
      Alert.alert('Erro', 'Não foi possível carregar as suas aulas de grupo.');
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = fetchMyClasses();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }, [fetchMyClasses])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyClasses();
  }, [fetchMyClasses]);

  const goToPreviousWeek = () => {
    setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  };

  const getDaysInCurrentWeek = useCallback(() => {
    const startOfCurrentWeek = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek }).map(day => {
      const dayClassesCount = myClasses.filter(cls => isSameDay(cls.dateTime.toDate(), day)).length;
      const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;

      return {
        date: day,
        dayLabel: daysOfWeekLabels[dayIndex],
        hasClasses: dayClassesCount > 0,
      };
    });
  }, [currentWeekDate, myClasses]);

  const daysInWeek = getDaysInCurrentWeek();

  // NOVO useEffect para filtrar e ordenar as aulas para o dia selecionado
  useEffect(() => {
    const filteredClasses = myClasses.filter(cls =>
      isSameDay(cls.dateTime.toDate(), currentWeekDate)
    ).sort((a, b) => a.dateTime.toDate() - b.dateTime.toDate()); // Ordena por hora

    setClassesForSelectedDay(filteredClasses);
  }, [myClasses, currentWeekDate]); // Dependências para este efeito

  const handleEditClass = (classItem) => {
    navigation.navigate('CreateGroupClass', { classData: classItem });
  };

  const handleDeleteClass = async (classId, className) => {
    Alert.alert(
      'Confirmar Cancelamento',
      `Tem certeza que deseja cancelar a aula "${className}"? Esta ação é irreversível.`,
      [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'groupClasses', classId));
              Alert.alert('Sucesso', 'Aula cancelada com sucesso!');
            } catch (error) {
              console.error('Erro ao cancelar aula:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a aula. Tente novamente.');
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const renderClassCard = ({ item }) => {
    const isPastClass = item.dateTime.toDate() < new Date();
    const availableSlots = item.capacity - item.currentParticipants;

    return (
      <View style={styles.classCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classPT}>PT: {item.ptName}</Text>
        </View>

        <View style={styles.classDetailRow}>
          <Ionicons name="time-outline" size={16} color={colors.secondary} style={styles.detailIcon} />
          <Text style={styles.classDateTime}>{formatTimeOnly(item.dateTime)}</Text>
        </View>
        
        {item.description ? (
          <View style={styles.classDetailRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={styles.detailIcon} />
            <Text style={styles.classDescription}>{item.description}</Text>
          </View>
        ) : null}

        <View style={styles.classDetailRow}>
          <Ionicons name="people-outline" size={16} color={colors.secondary} style={styles.detailIcon} />
          <Text style={styles.classCapacity}>
            Inscritos: {item.currentParticipants}/{item.capacity}
            {availableSlots > 0 && ` (${availableSlots} disponíveis)`}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {isPastClass ? (
            <Text style={styles.pastClassText}>Aula Passada</Text>
          ) : (
            <Text style={styles.activeClassText}>Ativa</Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditClass(item)}
            disabled={isPastClass}
          >
            <Ionicons name="create-outline" size={20} color={isPastClass ? colors.textMuted : colors.info} />
            <Text style={[styles.actionButtonText, isPastClass && styles.disabledActionText]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteClass(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={styles.actionButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>A carregar as suas aulas...</Text>
      </View>
    );
  }

  const hasAnyClassesOverall = myClasses.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Aulas</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateGroupClass')} style={styles.createClassButton}>
          <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekNavigation}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
          <Ionicons name="chevron-back-outline" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.weekRangeText}>{formatWeekRange(currentWeekDate)}</Text>
        <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavButton}>
          <Ionicons name="chevron-forward-outline" size={24} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      {/* Barra de Dias da Semana (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysBarContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {daysInWeek.map((dayData, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayBarItem,
              isSameDay(dayData.date, currentWeekDate) && styles.selectedDayBarItem,
              isToday(dayData.date) && styles.todayBarItem,
            ]}
            onPress={() => setCurrentWeekDate(dayData.date)} // Ao tocar, define o dia selecionado
          >
            <Text style={[
              styles.dayBarLabel,
              isSameDay(dayData.date, currentWeekDate) && styles.selectedDayBarLabel,
              isToday(dayData.date) && styles.todayBarLabel,
            ]}>
              {dayData.dayLabel}
            </Text>
            <Text style={[
              styles.dayBarDate,
              isSameDay(dayData.date, currentWeekDate) && styles.selectedDayBarDate,
              isToday(dayData.date) && styles.todayBarDate,
            ]}>
              {format(dayData.date, 'dd/MM')}
            </Text>
            {dayData.hasClasses && (
              <View style={[
                styles.hasClassesDot,
                isSameDay(dayData.date, currentWeekDate) && styles.selectedHasClassesDot,
                isToday(dayData.date) && styles.todayHasClassesDot,
              ]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de Aulas para o Dia Selecionado (Vertical Scroll) */}
      {!hasAnyClassesOverall && !loading ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="calendar-outline" size={60} color={colors.textMuted} />
          <Text style={styles.emptyText}>Você ainda não criou nenhuma aula de grupo.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateGroupClass')} style={styles.createButton}>
            <Ionicons name="add-circle-outline" size={24} color={colors.textLight} />
            <Text style={styles.createButtonText}>Criar Nova Aula</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.selectedDayClassesContainer} // Novo estilo para o contentor das aulas do dia selecionado
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Text style={styles.selectedDayTitle}>
            Aulas para {format(currentWeekDate, 'EEEE, dd MMM', { locale: pt })}
          </Text>
          {classesForSelectedDay.length > 0 ? (
            classesForSelectedDay.map(classItem => (
              <View key={classItem.id} style={styles.classItemWrapper}>
                {renderClassCard({ item: classItem })}
              </View>
            ))
          ) : (
            <View style={styles.noClassesForSelectedDay}>
              <Ionicons name="sad-outline" size={40} color={colors.textMuted} />
              <Text style={styles.noClassesForSelectedDayText}>
                Sem aulas agendadas para {format(currentWeekDate, 'dd/MM', { locale: pt })}.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  createClassButton: {
    padding: 5,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.secondary,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 10,
  },
  createButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: colors.textMuted,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  weekNavButton: {
    padding: 8,
  },
  weekRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  daysBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: CONTAINER_HORIZONTAL_PADDING_VALUE,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dayBarItem: {
    width: dayColumnWidth,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    marginHorizontal: COLUMN_MARGIN_HORIZONTAL_VALUE,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  selectedDayBarItem: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  todayBarItem: {
    borderColor: colors.info,
    borderWidth: 2,
  },
  dayBarLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  selectedDayBarLabel: {
    color: colors.textLight,
  },
  todayBarLabel: {
    color: colors.info,
  },
  dayBarDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  selectedDayBarDate: {
    color: colors.textLight,
  },
  todayBarDate: {
    color: colors.info,
  },
  hasClassesDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: 6,
  },
  selectedHasClassesDot: {
    backgroundColor: colors.textLight,
  },
  todayHasClassesDot: {
    backgroundColor: colors.info,
  },
  // --- NOVO ESTILO para o contentor das aulas do dia selecionado ---
  selectedDayClassesContainer: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  selectedDayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 20,
    textAlign: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  classItemWrapper: {
    marginBottom: 15,
  },
  noClassesForSelectedDay: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noClassesForSelectedDayText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  // --- Estilos de Card de Aula (mantidos) ---
  classCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    flexShrink: 1,
    marginRight: 10,
  },
  classPT: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  classDateTime: {
    fontSize: 15,
    color: colors.secondary,
  },
  classDescription: {
    fontSize: 14,
    color: colors.textMuted,
    flexShrink: 1,
  },
  classCapacity: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 10,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  pastClassText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
    backgroundColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  activeClassText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    backgroundColor: colors.lightSuccess,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  disabledActionText: {
    color: colors.textMuted,
  },
  deleteButton: {
    borderColor: colors.danger,
    backgroundColor: colors.lightDanger,
  },
});
