import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { buscarTodosTreinosDoUser } from '../../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  isPast,
} from 'date-fns';
import { pt } from 'date-fns/locale';

// Array de rótulos dos dias da semana (Segunda a Domingo)
const daysOfWeekLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Novas cores
const COLORS = {
  primary: '#d4ac54',      // color1
  lightPrimary: '#e0c892',   // color2
  darkPrimary: '#69511a',    // color3
  neutralGray: '#767676',    // color4
  lightGray: '#bdbdbd',      // color5
  white: '#fff',             // Branco puro
  black: '#000',             // Preto para sombras e alguns textos
  background: '#f0f2f5',     // Fundo geral da tela
  cardBackground: '#fff',    // Fundo dos cards (seções)
  borderLight: '#f0f0f0',    // Borda clara para divisores
  textLightGray: '#6b7280',  // Texto cinza claro para loading
  textDarkGray: '#4b5563',   // Texto cinza escuro para saudação
  toggleBackground: '#e0e0e0', // Fundo para botões de alternância
  toggleText: '#333',       // Texto para botões de alternância
  // Cores semânticas mantidas ou mapeadas para as mais próximas
  completedGreen: '#4CAF50', // Verde para concluído (mantido)
  missedRed: '#FF5252',      // Vermelho para perdido (mantido)
  todayBlue: '#2196F3',      // Azul para hoje pendente (mantido)
  scheduledOrange: '#FFC107', // Amarelo/Laranja para futuro agendado (mantido)
  lightRedBackground: '#FFEBEE', // Fundo vermelho claro para missed (mantido)
};

// Definição das cores para os diferentes status (usando a nova paleta)
const STATUS_COLORS = {
  completed: COLORS.completedGreen,
  missed: COLORS.missedRed,
  todayPending: COLORS.todayBlue,
  scheduledFuture: COLORS.scheduledOrange,
  noTraining: COLORS.lightGray,
  defaultBorder: COLORS.lightGray,
  defaultText: COLORS.neutralGray,
};

// Altura da barra fixa do cabeçalho de perfil
const FIXED_HEADER_HEIGHT = 135; // Altura ajustada para acomodar a frase motivacional

// Frases motivacionais aleatórias com emojis
const MOTIVATIONAL_PHRASES = [
  "Acredite em si mesmo e tudo será possível. ✨",
  "O único treino ruim é aquele que não aconteceu. 🏋️‍♀️",
  "A dor que sentes hoje é a força que terás amanhã. 💪",
  "Supere-se a cada dia. O limite é você! ",
  "Conquiste seus objetivos, um treino de cada vez. 🎯",
  "Mantenha o foco, a força e a fé. 🙏",
  "Seja mais forte que a sua melhor desculpa. 🔥",
  "Transforme o suor em sucesso. 🏆",
  "Sua saúde é seu maior bem. Cuide dela! ❤️",
  "Não pare até se orgulhar. ✅",
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, loading: userContextLoading } = useUser();

  const [userName, setUserName] = useState('Carregando...');
  const [firstName, setFirstName] = useState('Olá');
  const [userInitial, setUserInitial] = useState('...');
  const [userPlan, setUserPlan] = useState('Carregando...');
  const [greeting, setGreeting] = useState('');
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [currentMotivationalPhrase, setCurrentMotivationalPhrase] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current; // Inicia visível para a primeira frase

  // Estados para a frequência de treinos e o calendário
  const [allTreinos, setAllTreinos] = useState([]);
  const [treinosConcluidosStatus, setTreinosConcluidosStatus] = useState({});
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [markedDatesForCalendar, setMarkedDatesForCalendar] = useState({});

  // Dados para a legenda de cores (mantido como no seu ficheiro)
  const colorLegend = [
    { color: STATUS_COLORS.completed, description: 'Treino Concluído' },
    { color: STATUS_COLORS.missed, description: 'Treino Perdido' },
    { color: STATUS_COLORS.todayPending, description: 'Treino Hoje (Pendente)' },
    { color: STATUS_COLORS.scheduledFuture, description: 'Treino Futuro Agendado' },
    { color: STATUS_COLORS.defaultBorder, description: 'Sem Treino / Futuro Sem Agendamento' },
  ];

  // Função para carregar treinos concluídos do AsyncStorage
  const carregarTreinosConcluidos = useCallback(async (userId) => {
    try {
      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      const concluidoData = dados ? JSON.parse(dados) : {};
      setTreinosConcluidosStatus(concluidoData);
      console.log('✅ Treinos concluídos carregados do AsyncStorage na HomeScreen.');
      console.log('Status de treinos concluídos:', concluidoData); // Log para depuração
    } catch (error) {
      console.error('Erro ao carregar treinos concluídos do AsyncStorage na HomeScreen:', error);
    }
  }, []);

  // Efeito para determinar a saudação
  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        return 'Bom dia';
      } else if (hour >= 12 && hour < 18) {
        return 'Boa tarde';
      } else {
        return 'Boa noite';
      }
    };
    setGreeting(getGreeting());
  }, []);

  // Efeito para carregar os dados do utilizador e todos os treinos do Firebase
  useEffect(() => {
    const loadAllUserData = async () => {
      if (!userContextLoading && user && user.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const fullName = userData.name || userData.nome || 'Utilizador';
            setUserName(fullName);
            setFirstName(fullName.split(' ')[0]);
            setUserInitial(fullName.charAt(0).toUpperCase());
            setUserPlan(userData.plan || 'Plano não definido');
          } else {
            setUserName('Utilizador');
            setFirstName('Olá');
            setUserInitial('U');
            setUserPlan('Não definido');
          }

          const treinos = await buscarTodosTreinosDoUser(user.uid);
          setAllTreinos(treinos);
          await carregarTreinosConcluidos(user.uid);

        } catch (error) {
          console.error("HomeScreen: Erro ao buscar dados do utilizador ou treinos:", error);
          setUserName('Erro ao carregar nome');
          setFirstName('Olá');
          setUserInitial('E');
          setUserPlan('Erro');
        }
      } else if (!userContextLoading && (!user || !user.uid)) {
        setUserName('Utilizador');
        setFirstName('Olá');
        setUserInitial('U');
        setUserPlan('Não logado');
      }
      setLoadingScreen(false);
    };

    loadAllUserData();
  }, [user, userContextLoading, carregarTreinosConcluidos]);

  // Efeito para rotacionar as frases motivacionais com animação
  useEffect(() => {
    let phraseIndex = 0;

    const animatePhraseChange = () => {
      Animated.timing(fadeAnim, {
        toValue: 0, // Fade out
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Após o fade out, atualiza a frase e faz fade in
        phraseIndex = (phraseIndex + 1) % MOTIVATIONAL_PHRASES.length;
        setCurrentMotivationalPhrase(MOTIVATIONAL_PHRASES[phraseIndex]);
        Animated.timing(fadeAnim, {
          toValue: 1, // Fade in
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };

    // Define a frase inicial
    setCurrentMotivationalPhrase(MOTIVATIONAL_PHRASES[phraseIndex]);

    const intervalId = setInterval(animatePhraseChange, 7000); // Muda a cada 7 segundos (incluindo tempo de animação)

    return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar o componente
  }, []); // Dependência vazia para rodar apenas uma vez na montagem


  // Função para gerar os dados da frequência de treinos para a semana atual
  const getWeeklyTrainingFrequency = useCallback(() => {
    const startOfCurrentWeek = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

    const currentWeekDays = eachDayOfInterval(
      { start: startOfCurrentWeek, end: endOfCurrentWeek }
    );

    return currentWeekDays.map((date, index) => {
      const dateString = format(date, 'yyyy-MM-dd');
      const hasTraining = allTreinos.some(t => format(parseISO(t.data), 'yyyy-MM-dd') === dateString);
      const isCompleted = !!treinosConcluidosStatus[dateString];

      let status; // Declaração da variável 'status' aqui
      
      if (!isPast(date) && !isToday(date)) { // Se o dia é futuro
        if (hasTraining) {
          status = 'scheduledFuture'; // Treino agendado para o futuro
        } else {
          status = 'noTraining'; // Sem treino agendamento no futuro
        }
      } else if (hasTraining) { // Se o dia é passado ou hoje E tem treino
        if (isCompleted) {
          status = 'completed'; // Treino agendado e concluído (passado ou hoje)
        } else if (isPast(date) && !isToday(date)) {
          status = 'missed'; // Treino agendado no passado e não concluído
        } else if (isToday(date)) {
          status = 'todayPending'; // Treino agendado para hoje e pendente
        }
      } else {
        status = 'noTraining';
      }
      return {
        day: daysOfWeekLabels[index],
        date: dateString,
        status: status,
      };
    });
  }, [currentWeekDate, allTreinos, treinosConcluidosStatus]);

  const weeklyFrequencyData = getWeeklyTrainingFrequency();

  // Efeito para gerar as marcações para o calendário completo (AGORA INCLUI TREINOS FUTUROS)
  useEffect(() => {
    const generateMarkedDates = () => {
      const marked = {};
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      allTreinos.forEach(treino => {
        const dateString = format(parseISO(treino.data), 'yyyy-MM-dd');
        const isCompleted = !!treinosConcluidosStatus[dateString];
        const isFutureDate = !isPast(parseISO(treino.data)) && !isToday(parseISO(treino.data));
        const isTodayDate = isToday(parseISO(dateString));
        const isPastDate = isPast(parseISO(treino.data)) && !isTodayDate; // Explicitamente passado e não hoje

        console.log(`[Calendar Mark] Date: ${dateString}, isCompleted: ${isCompleted}, isFutureDate: ${isFutureDate}, isTodayDate: ${isTodayDate}, isPastDate: ${isPastDate}`);


        // Estilo base para dias com treino
        marked[dateString] = {
          ...marked[dateString],
          dots: marked[dateString]?.dots || [],
          marked: true,
          customStyles: {
            container: {
              backgroundColor: 'transparent', // Começa transparente
              borderRadius: 8,
            },
            text: {
              color: STATUS_COLORS.defaultText, // Texto padrão
              fontWeight: 'bold',
            },
          },
        };

        // Lógica de marcação baseada no status
        if (isCompleted) {
          marked[dateString].customStyles.container.backgroundColor = STATUS_COLORS.completed;
          marked[dateString].customStyles.text.color = COLORS.white; // Texto branco para contraste
          if (!marked[dateString].dots.some(dot => dot.key === 'concluido')) {
            marked[dateString].dots.push({ key: 'concluido', color: STATUS_COLORS.completed });
          }
          console.log(`     -> Status: Concluído (Verde)`);
        } else if (isFutureDate) {
          marked[dateString].customStyles.container.borderColor = STATUS_COLORS.scheduledFuture;
          marked[dateString].customStyles.container.borderWidth = 1;
          marked[dateString].customStyles.text.color = STATUS_COLORS.scheduledFuture;
          if (!marked[dateString].dots.some(dot => dot.key === 'scheduled')) {
            marked[dateString].dots.push({ key: 'scheduled', color: STATUS_COLORS.scheduledFuture });
          }
          console.log(`     -> Status: Futuro Agendado (Borda ${STATUS_COLORS.scheduledFuture})`);
        } else if (isTodayDate) {
          marked[dateString].customStyles.container.borderColor = STATUS_COLORS.todayPending;
          marked[dateString].customStyles.container.borderWidth = 2;
          marked[dateString].customStyles.text.color = STATUS_COLORS.todayPending;
          if (!marked[dateString].dots.some(dot => dot.key === 'today')) {
            marked[dateString].dots.push({ key: 'today', color: STATUS_COLORS.todayPending });
          }
          console.log(`     -> Status: Hoje Pendente (Borda ${STATUS_COLORS.todayPending})`);
        } else if (isPastDate) { // Treino passado e não concluído (missed)
            marked[dateString].customStyles.container.backgroundColor = COLORS.lightRedBackground; // Fundo vermelho claro
            marked[dateString].customStyles.text.color = STATUS_COLORS.missed; // Texto vermelho
            if (!marked[dateString].dots.some(dot => dot.key === 'missed')) {
                marked[dateString].dots.push({ key: 'missed', color: STATUS_COLORS.missed });
            }
            console.log(`     -> Status: Perdido (Fundo Vermelho Claro/Texto Vermelho)`);
        } else {
            console.log(`     -> Status: Sem Treino / Não Especificado (Padrão)`);
        }
      });
      setMarkedDatesForCalendar(marked);
    };

    generateMarkedDates();
  }, [allTreinos, treinosConcluidosStatus]);

  // Funções para navegar entre as semanas
  const goToPreviousWeek = () => {
    setCurrentWeekDate(subWeeks(currentWeekDate, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekDate(addWeeks(currentWeekDate, 1));
  };

  // Função para renderizar o elemento de status do dia (o círculo ou o ícone)
  const renderDayStatusElement = (itemStatus) => {
    let content = null;
    let wrapperStyles = [styles.dayIconWrapperBase];

    switch (itemStatus) {
      case 'completed':
        wrapperStyles.push(styles.dayIconWrapperCompleted);
        break;
      case 'missed':
        content = <Icon name="times" size={16} color={STATUS_COLORS.missed} />;
        break;
      case 'absent': // Se você tiver um status para ausente (ex: '!')
        content = <Icon name="exclamation" size={16} color={STATUS_COLORS.missed} />; // Usando cor de missed
        break;
      case 'todayPending':
        wrapperStyles.push(styles.dayIconWrapperTodayPending);
        break;
      case 'scheduledFuture': // Ícone para treinos futuros agendados
        content = <Icon name="calendar-alt" size={16} color={STATUS_COLORS.scheduledFuture} />;
        wrapperStyles.push(styles.dayIconWrapperScheduledFuture);
        break;
      case 'pendingFuture': // Treino agendado para o futuro, mas sem ícone (círculo vazio)
      case 'noTraining': // Não há treino agendado para este dia
      default:
        wrapperStyles.push(styles.dayIconWrapperEmpty);
        break;
    }

    return (
      <View style={wrapperStyles}>
        {content}
      </View>
    );
  };

  if (loadingScreen || userContextLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando dados do perfil...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barra Fixa do Cabeçalho de Perfil */}
      <View style={styles.fixedProfileHeader}>
        <View style={styles.avatarCircleFixed}> 
          <Text style={styles.avatarTextFixed}>{userInitial}</Text> 
        </View>
        <View style={styles.userInfoFixed}> 
          <Text style={styles.userNameTextFixed}>{userName}</Text> 
          <Text style={styles.userPlanTextFixed}>{userPlan}</Text> 
          {/* Usar Animated.Text para a frase motivacional */}
          <Animated.Text style={[styles.motivationalPhraseText, { opacity: fadeAnim }]}>
            {currentMotivationalPhrase}
          </Animated.Text>
        </View>
      </View>

      {/* Conteúdo da ScrollView com padding para a barra fixa */}
      <ScrollView contentContainerStyle={styles.scrollContentWithHeader}>
        {/* Saudação Dinâmica */}
        <Text style={styles.greetingText}>{greeting}, {firstName}!</Text>

        {/* Botões de Alternância */}
        <View style={styles.toggleButtons}>
          <TouchableOpacity style={[styles.toggleButton, styles.activeButton]}>
            <Text style={styles.toggleButtonText}>Início</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggleButton}>
            <Text style={styles.toggleButtonText}>Opções</Text>
          </TouchableOpacity>
        </View>

        {/* Frequência de Treinos */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Frequência de Treinos</Text>
          <View style={styles.weekNavigation}>
            <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
              <Icon name="chevron-left" size={20} color={COLORS.toggleText} />
            </TouchableOpacity>
            <Text style={styles.weekRangeText}>
              {format(startOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })} -{' '}
              {format(endOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })}
            </Text>
            <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavButton}>
              <Icon name="chevron-right" size={20} color={COLORS.toggleText} />
            </TouchableOpacity>
          </View>
          <View style={styles.trainingFrequencyContainer}>
            {weeklyFrequencyData.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dayItem}
                onPress={() => setIsCalendarModalVisible(true)}
              >
                {renderDayStatusElement(item.status)}
                <Text style={styles.dayLabel}>{item.day}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Legenda de Cores */}
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Legenda:</Text>
            {colorLegend.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Lista de Opções */}
        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate('Treinos')}>
            <Icon name="dumbbell" size={24} color={COLORS.primary} />
            <Text style={styles.optionText}>Treinos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate('Histórico')}> 
            <Icon name="history" size={24} color={COLORS.primary} /> 
            <Text style={styles.optionText}>Histórico de Treinos</Text> 
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate('CriarAvaliacao')}>
            <Icon name="clipboard-list" size={24} color={COLORS.primary} />
            <Text style={styles.optionText}>Avaliações</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate('Progresso')}>
            <Icon name="chart-line" size={24} color={COLORS.primary} />
            <Text style={styles.optionText}>Progresso do aluno</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={() => navigation.navigate('Chat Online')}>
            <Icon name="comments" size={24} color={COLORS.primary} /> 
            <Text style={styles.optionText}>Chat Online</Text> 
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionItem, styles.optionItemLast]}
            onPress={() => navigation.navigate('ListarQuestionariosUser')} 
          >
            <Icon name="question-circle" size={24} color={COLORS.primary} /> 
            <Text style={styles.optionText}>Responder Questionário</Text>
          </TouchableOpacity>
        </View>

        {/* Modal do Calendário Completo */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={isCalendarModalVisible}
          onRequestClose={() => setIsCalendarModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Calendário de Treinos</Text>
              <Calendar
                markingType={'custom'}
                markedDates={markedDatesForCalendar}
                onDayPress={(day) => {
                  console.log('Dia selecionado no calendário:', day.dateString);
                }}
                theme={{
                  selectedDayBackgroundColor: COLORS.primary,
                  todayTextColor: COLORS.primary,
                  arrowColor: COLORS.primary,
                  monthTextColor: COLORS.black,
                  textSectionTitleColor: COLORS.neutralGray,
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: 'bold',
                }}
                style={styles.fullCalendar}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsCalendarModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLightGray,
  },
  fixedProfileHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    backgroundColor: COLORS.primary, // color1
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
  },
  scrollContentWithHeader: {
    paddingTop: FIXED_HEADER_HEIGHT + 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  avatarCircleFixed: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarTextFixed: {
    color: COLORS.primary, // color1
    fontSize: 30,
    fontWeight: 'bold',
  },
  userInfoFixed: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameTextFixed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userPlanTextFixed: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)', // Mantido branco semi-transparente
    marginTop: 2,
  },
  motivationalPhraseText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)', // Mantido branco semi-transparente
    fontStyle: 'italic',
    marginTop: 5,
  },
  greetingText: {
    fontSize: 18,
    color: COLORS.textDarkGray,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  toggleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.toggleBackground,
    borderRadius: 10,
    marginBottom: 20,
    padding: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.toggleText,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.toggleText, // Usado toggleText para um tom escuro
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  weekNavButton: {
    padding: 10,
  },
  weekRangeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.toggleText, // Usado toggleText para um tom escuro
  },
  trainingFrequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayItem: {
    alignItems: 'center',
    padding: 5,
  },
  dayIconWrapperBase: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: STATUS_COLORS.defaultBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    overflow: 'hidden',
  },
  dayIconWrapperEmpty: {
    backgroundColor: 'transparent',
  },
  dayIconWrapperCompleted: {
    backgroundColor: STATUS_COLORS.completed,
    borderColor: STATUS_COLORS.completed,
  },
  dayIconWrapperTodayPending: {
    backgroundColor: 'transparent',
    borderColor: STATUS_COLORS.todayPending,
    borderWidth: 2,
  },
  dayIconWrapperScheduledFuture: {
    backgroundColor: 'transparent',
    borderColor: STATUS_COLORS.scheduledFuture,
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: 14,
    color: STATUS_COLORS.defaultText,
  },
  optionsList: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 15,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    paddingVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  optionItemLast: {
    borderBottomWidth: 0, // Remove a borda do último item
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
    color: COLORS.toggleText, // Usado toggleText para um tom escuro
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    width: '95%',
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary, // color1
  },
  fullCalendar: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.toggleBackground, // Usado toggleBackground para uma borda clara
  },
  modalCloseButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary, // color1
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  legendContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: COLORS.background, // Usado background para um fundo leve
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight, // Usado borderLight para uma borda clara
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.toggleText, // Usado toggleText para um tom escuro
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendColorBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray, // Usado lightGray para uma borda clara
  },
  legendText: {
    fontSize: 14,
    color: COLORS.neutralGray, // color4
  },
});
