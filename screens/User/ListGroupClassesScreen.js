// screens/User/ListGroupClassesScreen.js
// Este ecrã permite que clientes e membros do ginásio visualizem e se inscrevam em aulas de grupo,
// agora com uma vista de calendário semanal horizontal e detalhes por dia selecionado.

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
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { useUser } from '../../contexts/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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

const { width: screenWidth } = Dimensions.get('window'); // Obter largura da tela

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
};

// Rótulos dos dias da semana para exibição (ajustado para começar na Segunda-feira)
const daysOfWeekLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Largura de cada coluna de dia na vista horizontal (aproximadamente 1/4 da tela)
const DAY_COLUMN_WIDTH = screenWidth / 4; 

export default function ListGroupClassesScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const [classes, setClasses] = useState([]); // Todas as aulas futuras
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date()); // Data para a semana atual exibida
  const [selectedDay, setSelectedDay] = useState(new Date()); // O dia selecionado na vista semanal
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Função para formatar a hora para exibição (apenas hora, data no cabeçalho do dia)
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

  // Função para buscar as aulas de grupo
  const fetchGroupClasses = useCallback(() => {
    if (!auth.currentUser?.uid) {
      setLoading(false);
      setClasses([]);
      return () => {
        console.log("Nenhum utilizador logado. Nenhum listener Firestore ativo para aulas de grupo.");
      };
    }

    setLoading(true);
    const q = query(
      collection(db, 'groupClasses'),
      where('dateTime', '>=', Timestamp.now()), // Apenas aulas futuras
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateTime: doc.data().dateTime instanceof Timestamp ? doc.data().dateTime : Timestamp.fromDate(new Date(doc.data().dateTime.seconds * 1000)),
      }));
      setClasses(fetchedClasses);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Erro ao carregar aulas de grupo:', error);
      if (error.code === 'permission-denied') {
        console.log("Permissão negada para aulas de grupo. Isso é esperado após o logout.");
        setClasses([]);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar as aulas de grupo.');
      }
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, [auth.currentUser?.uid]);

  useEffect(() => {
    const unsubscribe = fetchGroupClasses();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchGroupClasses]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroupClasses();
  }, [fetchGroupClasses]);

  // Funções para navegar entre as semanas
  const goToPreviousWeek = () => {
    setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  };

  // Função para obter os dados de cada dia da semana (para a barra horizontal)
  const getDaysInCurrentWeek = useCallback(() => {
    const startOfCurrentWeek = startOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Segunda-feira
    const endOfCurrentWeek = endOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Domingo

    return eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek }).map(day => {
      const dayClassesCount = classes.filter(cls => isSameDay(cls.dateTime.toDate(), day)).length;
      
      const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1; // Ajusta para Segunda=0, Domingo=6

      return {
        date: day,
        dayLabel: daysOfWeekLabels[dayIndex],
        hasClasses: dayClassesCount > 0,
      };
    });
  }, [currentWeekDate, classes]);

  const daysInWeek = getDaysInCurrentWeek();

  // Aulas do dia selecionado
  const classesForSelectedDay = classes
    .filter(cls => isSameDay(cls.dateTime.toDate(), selectedDay))
    .sort((a, b) => a.dateTime.toDate() - b.dateTime.toDate());

  // Handler para inscrição/cancelamento de inscrição
  const handleToggleEnrollment = useCallback(async (classId, isEnrolled, currentParticipants, capacity) => {
    if (!auth.currentUser?.uid) {
      Alert.alert('Erro', 'Por favor, faça login para se inscrever nas aulas.');
      return;
    }

    // Atualiza o estado local para mostrar o loading no botão
    setClasses(prevClasses => prevClasses.map(cls =>
      cls.id === classId ? { ...cls, isUpdating: true } : cls
    ));

    const classRef = doc(db, 'groupClasses', classId);
    const userId = auth.currentUser.uid;

    try {
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) {
        Alert.alert('Erro', 'Aula não encontrada.');
        return;
      }
      const classData = classSnap.data();
      const latestParticipants = classData.participants || [];
      const latestCurrentParticipants = classData.currentParticipants || 0;

      if (isEnrolled) {
        if (!latestParticipants.includes(userId)) {
            Alert.alert('Erro', 'Você não está inscrito nesta aula.');
            return;
        }
        await updateDoc(classRef, {
          participants: arrayRemove(userId),
          currentParticipants: latestCurrentParticipants - 1,
        });
        Alert.alert('Sucesso', 'Inscrição cancelada com sucesso!');
      } else {
        if (latestCurrentParticipants >= classData.capacity) {
          Alert.alert('Aula Cheia', 'Esta aula já atingiu a sua capacidade máxima.');
          return;
        }
        if (latestParticipants.includes(userId)) {
          Alert.alert('Já Inscrito', 'Você já está inscrito nesta aula.');
          return;
        }

        await updateDoc(classRef, {
          participants: arrayUnion(userId),
          currentParticipants: latestCurrentParticipants + 1,
        });
        Alert.alert('Sucesso', 'Inscrição realizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerir inscrição:', error);
      Alert.alert('Erro', 'Não foi possível gerir a sua inscrição. Tente novamente.');
    } finally {
      // Garante que o estado de loading do botão é removido, independentemente do sucesso/erro
      setClasses(prevClasses => prevClasses.map(cls =>
        cls.id === classId ? { ...cls, isUpdating: false } : cls
      ));
    }
  }, [auth.currentUser?.uid]);

  // Componente para renderizar cada item de aula (card)
  const renderClassCard = ({ item }) => {
    const isEnrolled = item.participants && item.participants.includes(auth.currentUser?.uid);
    const isFull = item.currentParticipants >= item.capacity;
    const isPastClass = item.dateTime.toDate() < new Date();
    const availableSlots = item.capacity - item.currentParticipants;

    return (
      <View style={styles.classCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classPT}>PT: {item.ptName}</Text>
        </View>

        <View style={styles.classDetailRow}>
          <Ionicons name="time-outline" size={18} color={colors.secondary} style={styles.detailIcon} />
          <Text style={styles.classDateTime}>{formatTimeOnly(item.dateTime)}</Text>
        </View>
        
        {item.description ? (
          <View style={styles.classDetailRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} style={styles.detailIcon} />
            <Text style={styles.classDescription}>{item.description}</Text>
          </View>
        ) : null}

        <View style={styles.classDetailRow}>
          <Ionicons name="people-outline" size={18} color={colors.secondary} style={styles.detailIcon} />
          <Text style={styles.classCapacity}>
            Vagas: {item.currentParticipants}/{item.capacity}
            {availableSlots > 0 && ` (${availableSlots} disponíveis)`}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {isPastClass ? (
            <Text style={styles.pastClassText}>Aula Passada</Text>
          ) : isFull && !isEnrolled ? (
            <Text style={styles.fullText}>LOTADO!</Text>
          ) : isEnrolled ? (
            <Text style={styles.enrolledStatusText}>Você está inscrito!</Text>
          ) : (
            <Text style={styles.availableStatusText}>Vagas disponíveis</Text>
          )}
        </View>

        {!isPastClass && (
          <TouchableOpacity
            style={[
              styles.enrollButton,
              isEnrolled ? styles.enrolledButton : {},
              isFull && !isEnrolled ? styles.disabledButton : {},
            ]}
            onPress={() => handleToggleEnrollment(item.id, isEnrolled, item.currentParticipants, item.capacity)}
            disabled={isFull && !isEnrolled || item.isUpdating || !auth.currentUser?.uid}
          >
            {item.isUpdating ? (
              <ActivityIndicator color={colors.textLight} />
            ) : (
              <Text style={styles.enrollButtonText}>
                {isEnrolled ? 'Cancelar Inscrição' : 'Inscrever-me'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>A carregar aulas de grupo...</Text>
      </View>
    );
  }

  const hasAnyClassesOverall = classes.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aulas de Grupo</Text>
        <View style={{ width: 28 }} />
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
      >
        {daysInWeek.map((dayData, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayBarItem,
              isSameDay(dayData.date, selectedDay) && styles.selectedDayBarItem, // Realça o dia selecionado
              isToday(dayData.date) && styles.todayBarItem, // Realça o dia de hoje
            ]}
            onPress={() => setSelectedDay(dayData.date)}
          >
            <Text style={[
              styles.dayBarLabel,
              isSameDay(dayData.date, selectedDay) && styles.selectedDayBarLabel,
              isToday(dayData.date) && styles.todayBarLabel,
            ]}>
              {dayData.dayLabel}
            </Text>
            <Text style={[
              styles.dayBarDate,
              isSameDay(dayData.date, selectedDay) && styles.selectedDayBarDate,
              isToday(dayData.date) && styles.todayBarDate,
            ]}>
              {format(dayData.date, 'dd/MM')}
            </Text>
            {dayData.hasClasses && (
              <View style={[
                styles.hasClassesDot,
                isSameDay(dayData.date, selectedDay) && styles.selectedHasClassesDot,
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
          <Text style={styles.emptyText}>Nenhuma aula de grupo agendada no momento.</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.selectedDayClassesContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
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
                Sem aulas agendadas para {format(selectedDay, 'dd/MM', { locale: pt })}.
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
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: colors.textLight,
    fontSize: 16,
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
  // --- Estilos para a barra de dias da semana (horizontal) ---
  daysBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    paddingVertical: 10,
    paddingHorizontal: 5, // Pequeno padding para as bordas
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  dayBarItem: {
    width: DAY_COLUMN_WIDTH, // Largura definida para cada dia
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginHorizontal: 2, // Espaçamento entre os dias
    backgroundColor: colors.background, // Fundo padrão dos dias
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedDayBarItem: {
    backgroundColor: colors.primary, // Fundo para o dia selecionado
    borderColor: colors.primary,
  },
  todayBarItem: {
    borderColor: colors.info, // Borda para o dia de hoje
    borderWidth: 2,
  },
  dayBarLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  selectedDayBarLabel: {
    color: colors.textLight, // Texto branco para o dia selecionado
  },
  todayBarLabel: {
    color: colors.info, // Texto azul para o dia de hoje
  },
  dayBarDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  selectedDayBarDate: {
    color: colors.textLight, // Texto branco para o dia selecionado
  },
  todayBarDate: {
    color: colors.info, // Texto azul para o dia de hoje
  },
  hasClassesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success, // Ponto verde para dias com aulas
    marginTop: 4,
  },
  selectedHasClassesDot: {
    backgroundColor: colors.textLight, // Ponto branco no dia selecionado
  },
  todayHasClassesDot: {
    backgroundColor: colors.info, // Ponto azul no dia de hoje
  },
  // --- Estilos para a lista de aulas do dia selecionado ---
  selectedDayClassesContainer: {
    flexGrow: 1,
    paddingHorizontal: 15, // Padding maior para os cartões de aula
    paddingVertical: 15,
  },
  classItemWrapper: {
    marginBottom: 15, // Espaçamento entre os cartões de aula
  },
  noClassesForSelectedDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  noClassesForSelectedDayText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  // --- Estilos de Card de Aula (reajustados para mais espaço) ---
  classCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
  fullText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.danger,
    backgroundColor: '#FFEBEE',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
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
  enrolledStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  availableStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.info,
    backgroundColor: '#E3F2FD',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  enrollButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  enrolledButton: {
    backgroundColor: colors.success,
  },
  disabledButton: {
    backgroundColor: colors.textMuted,
    opacity: 0.7,
  },
  enrollButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
