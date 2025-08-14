import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
    Platform, ActivityIndicator, Modal, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5'; // Ícones FontAwesome5
import * as Haptics from 'expo-haptics'; // Importado para feedback tátil

import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc, Timestamp } from 'firebase/firestore'; // Importar Timestamp
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
import { pt } from 'date-fns/locale'; // Localização para português
import { Ionicons } from '@expo/vector-icons'; // Ícones Ionicons (usados no novo botão)

// Array de rótulos dos dias da semana (Segunda a Domingo)
const daysOfWeekLabels = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

// Importa as cores e o layout das constantes globais
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

// Definição das cores para os diferentes status usando a paleta Colors
const STATUS_COLORS = {
    completed: Colors.success, // Mapeado para Colors.success
    missed: Colors.error,      // Mapeado para Colors.error
    todayPending: Colors.info, // Mapeado para Colors.info
    scheduledFuture: Colors.warning, // Mapeado para Colors.warning
    noTraining: Colors.lightGray,
    defaultBorder: Colors.lightGray,
    defaultText: Colors.neutralGray,
};

// Altura da barra fixa do cabeçalho de perfil
const FIXED_HEADER_HEIGHT = 135; // Altura ajustada para acomodar a frase motivacional

// Frases motivacionais aleatórias com emojis
const MOTIVATIONAL_PHRASES = [
    "Acredite em si mesmo e tudo será possível. ✨",
    "O único treino ruim é aquele que não aconteceu. 🏋️‍♀️",
    "A dor que sentes hoje é a força que terás amanhã. 💪",
    "Supere-se a cada dia. O limite é você! �",
    "Conquiste seus objetivos, um treino de cada vez. 🎯",
    "Mantenha o foco, a força e a fé. 🙏",
    "Seja mais forte que a sua melhor desculpa. 🔥",
    "Transforme o suor em sucesso. 🏆",
    "Sua saúde é seu maior bem. Cuide dela! ❤️",
    "Não pare até se orgulhar. ✅",
];

export default function HomeScreen() {
    const navigation = useNavigation();
    const { user, loading: userContextLoading, userDetails } = useUser();

    // Estados para dados do utilizador
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

    // Dados para a legenda de cores
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
        } catch (error) {
            console.error('Erro ao carregar treinos concluídos do AsyncStorage na HomeScreen:', error);
        }
    }, []);

    // Efeito para determinar a saudação (Bom dia, Boa tarde, Boa noite)
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

    // Efeito para rotacionar as frases motivacionais com animação de fade
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
    }, [fadeAnim]); // Dependência para garantir que a animação é recriada se fadeAnim mudar (embora seja uma ref, é bom ser explícito)


    // Função para gerar os dados da frequência de treinos para a semana atual
    const getWeeklyTrainingFrequency = useCallback(() => {
        const startOfCurrentWeek = startOfWeek(currentWeekDate, { weekStartsOn: 1 }); // Semana começa na Segunda-feira
        const endOfCurrentWeek = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

        const currentWeekDays = eachDayOfInterval(
            { start: startOfCurrentWeek, end: endOfCurrentWeek }
        );

        return currentWeekDays.map((date, index) => {
            const dateString = format(date, 'yyyy-MM-dd');
            // Verifica se há algum treino agendado para esta data
            const hasTraining = allTreinos.some(t => {
                // Converte Timestamp ou string ISO para Date para comparação
                const treinoDate = t.data instanceof Timestamp ? t.data.toDate() : parseISO(t.data);
                return format(treinoDate, 'yyyy-MM-dd') === dateString;
            });
            const isCompleted = !!treinosConcluidosStatus[dateString];

            let status;
            if (isToday(date)) {
                status = hasTraining ? (isCompleted ? 'completed' : 'todayPending') : 'noTraining';
            } else if (isPast(date)) {
                status = hasTraining ? (isCompleted ? 'completed' : 'missed') : 'noTraining';
            } else { // Futuro
                status = hasTraining ? 'scheduledFuture' : 'noTraining';
            }

            return {
                day: daysOfWeekLabels[index],
                date: dateString,
                status: status,
            };
        });
    }, [currentWeekDate, allTreinos, treinosConcluidosStatus]);

    const weeklyFrequencyData = getWeeklyTrainingFrequency();

    // Efeito para gerar as marcações para o calendário completo
    useEffect(() => {
        const generateMarkedDates = () => {
            const marked = {};
            // Marca o dia atual no calendário
            const todayString = format(new Date(), 'yyyy-MM-dd');
            marked[todayString] = {
                selected: true,
                dotColor: Colors.primary, // Usando Colors.primary
                selectedDotColor: Colors.white,
                selectedColor: Colors.primary, // Usando Colors.primary
                customStyles: {
                    container: {
                        borderRadius: Layout.borderRadius.medium,
                    },
                    text: {
                        color: Colors.white,
                        fontWeight: 'bold',
                    },
                },
            };

            allTreinos.forEach(treino => {
                // Converte Timestamp ou string ISO para Date para comparação
                const treinoDate = treino.data instanceof Timestamp ? treino.data.toDate() : parseISO(treino.data);
                const dateString = format(treinoDate, 'yyyy-MM-dd');
                const isCompleted = !!treinosConcluidosStatus[dateString];
                const isFutureDate = !isPast(treinoDate) && !isToday(treinoDate);
                const isTodayDate = isToday(treinoDate);
                const isPastDate = isPast(treinoDate) && !isTodayDate;

                // Calcular hasTrainingForDate dentro deste escopo
                const hasTrainingForDate = allTreinos.some(t => {
                    const tDate = t.data instanceof Timestamp ? t.data.toDate() : parseISO(t.data);
                    return format(tDate, 'yyyy-MM-dd') === dateString;
                });

                // Inicializa o estilo para a data se ainda não existir
                marked[dateString] = {
                    ...marked[dateString], // Mantém as propriedades existentes (ex: `selected` para hoje)
                    dots: marked[dateString]?.dots || [],
                    marked: true,
                    customStyles: {
                        container: {
                            backgroundColor: 'transparent',
                            borderRadius: Layout.borderRadius.medium,
                            ...marked[dateString]?.customStyles?.container, // Mescla com estilos existentes
                        },
                        text: {
                            color: STATUS_COLORS.defaultText,
                            fontWeight: 'bold',
                            ...marked[dateString]?.customStyles?.text, // Mescla com estilos existentes
                        },
                    },
                };

                // Aplica estilos baseados no status do treino
                if (isCompleted) {
                    marked[dateString].customStyles.container.backgroundColor = STATUS_COLORS.completed;
                    marked[dateString].customStyles.text.color = Colors.white;
                    if (!marked[dateString].dots.some(dot => dot.key === 'concluido')) {
                        marked[dateString].dots.push({ key: 'concluido', color: STATUS_COLORS.completed });
                    }
                } else if (isFutureDate) {
                    marked[dateString].customStyles.container.borderColor = STATUS_COLORS.scheduledFuture;
                    marked[dateString].customStyles.container.borderWidth = 1;
                    marked[dateString].customStyles.text.color = STATUS_COLORS.scheduledFuture;
                    if (!marked[dateString].dots.some(dot => dot.key === 'scheduled')) {
                        marked[dateString].dots.push({ key: 'scheduled', color: STATUS_COLORS.scheduledFuture });
                    }
                } else if (isTodayDate && hasTrainingForDate && !isCompleted) { // Treino hoje e pendente
                    marked[dateString].customStyles.container.borderColor = STATUS_COLORS.todayPending;
                    marked[dateString].customStyles.container.borderWidth = 2;
                    marked[dateString].customStyles.text.color = STATUS_COLORS.todayPending;
                    if (!marked[dateString].dots.some(dot => dot.key === 'today')) {
                        marked[dateString].dots.push({ key: 'today', color: STATUS_COLORS.todayPending });
                    }
                } else if (isPastDate && hasTrainingForDate && !isCompleted) { // Treino passado e não concluído (missed)
                    // Usando Colors.error para o fundo e texto, pois lightRedBackground não está na nova paleta
                    marked[dateString].customStyles.container.backgroundColor = Colors.error;
                    marked[dateString].customStyles.text.color = Colors.white; // Texto branco para contraste no fundo vermelho
                    if (!marked[dateString].dots.some(dot => dot.key === 'missed')) {
                        marked[dateString].dots.push({ key: 'missed', color: STATUS_COLORS.missed });
                    }
                }
            });
            setMarkedDatesForCalendar(marked);
        };

        generateMarkedDates();
    }, [allTreinos, treinosConcluidosStatus]); // Depende de todos os treinos e do status de conclusão

    // Funções para navegar entre as semanas na frequência de treinos
    const goToPreviousWeek = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentWeekDate(subWeeks(currentWeekDate, 1));
    };

    const goToNextWeek = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentWeekDate(addWeeks(currentWeekDate, 1));
    };

    // Função para renderizar o elemento de status do dia (o círculo ou o ícone)
    const renderDayStatusElement = (itemStatus) => {
        let content = null;
        let wrapperStyles = [styles.dayIconWrapperBase];

        switch (itemStatus) {
            case 'completed':
                wrapperStyles.push(styles.dayIconWrapperCompleted);
                content = <Icon name="check" size={Layout.fontSizes.small} color={Colors.white} />;
                break;
            case 'missed':
                content = <Icon name="times" size={Layout.fontSizes.small} color={STATUS_COLORS.missed} />;
                wrapperStyles.push(styles.dayIconWrapperMissed); // Novo estilo para missed
                break;
            case 'todayPending':
                wrapperStyles.push(styles.dayIconWrapperTodayPending);
                content = <Icon name="exclamation" size={Layout.fontSizes.small} color={STATUS_COLORS.todayPending} />; // Ícone de exclamação para pendente
                break;
            case 'scheduledFuture':
                content = <Icon name="calendar-alt" size={Layout.fontSizes.small} color={STATUS_COLORS.scheduledFuture} />;
                wrapperStyles.push(styles.dayIconWrapperScheduledFuture);
                break;
            case 'noTraining':
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

    // Renderização condicional para tela de carregamento
    if (loadingScreen || userContextLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} /> {/* Usando Colors.primary */}
                <Text style={styles.loadingText}>Carregando dados do perfil...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Barra Fixa do Cabeçalho de Perfil */}
            <View style={styles.fixedProfileHeader}>
                <TouchableOpacity
                    style={styles.avatarContainerFixed}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate('Perfil'); // Navega para a tela de Perfil do Utilizador
                    }}
                >
                    {/* Renderiza a imagem do avatar se userDetails.avatar existir, senão as iniciais */}
                    {userDetails?.avatar ? (
                        <Image source={{ uri: userDetails.avatar }} style={styles.avatarFixed} />
                    ) : (
                        <View style={styles.avatarFixed}>
                            <Text style={styles.avatarTextFixed}>{userInitial}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <View style={styles.userInfoFixed}>
                    <Text style={styles.userNameTextFixed}>{userName}</Text>
                    <Text style={styles.userPlanTextFixed}>{userPlan}</Text>
                    {/* Frase motivacional animada */}
                    <Animated.Text style={[styles.motivationalPhraseText, { opacity: fadeAnim }]}>
                        {currentMotivationalPhrase}
                    </Animated.Text>
                </View>
            </View>

            {/* Conteúdo da ScrollView com padding para a barra fixa */}
            <ScrollView contentContainerStyle={styles.scrollContentWithHeader}>
                {/* Saudação Dinâmica */}
                <Text style={styles.greetingText}>{greeting}, {firstName}!</Text>

                {/* Botões de Alternância (Ex: Início, Opções) */}
                <View style={styles.toggleButtons}>
                    <TouchableOpacity style={[styles.toggleButton, styles.activeButton]}>
                        <Text style={styles.toggleButtonText}>Início</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toggleButton}>
                        <Text style={styles.toggleButtonText}>Opções</Text>
                    </TouchableOpacity>
                </View>

                {/* Frequência de Treinos Semanal */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Frequência de Treinos</Text>
                    <View style={styles.weekNavigation}>
                        <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
                            <Icon name="chevron-left" size={Layout.fontSizes.large} color={Colors.neutralGray} />
                        </TouchableOpacity>
                        <Text style={styles.weekRangeText}>
                            {format(startOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })} -{' '}
                            {format(endOfWeek(currentWeekDate, { weekStartsOn: 1 }), 'dd MMM', { locale: pt })}
                        </Text>
                        <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavButton}>
                            <Icon name="chevron-right" size={Layout.fontSizes.large} color={Colors.neutralGray} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trainingFrequencyContainer}>
                        {weeklyFrequencyData.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.dayItem}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsCalendarModalVisible(true);
                                }}
                            >
                                {renderDayStatusElement(item.status)}
                                <Text style={styles.dayLabel}>{item.day}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Legenda de Cores para a Frequência de Treinos */}
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

                {/* Lista de Opções de Navegação */}
                <View style={styles.optionsList}>
                    <TouchableOpacity style={styles.optionItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Treinos'); }}>
                        <Icon name="dumbbell" size={Layout.fontSizes.large} color={Colors.primary} /> {/* Usando Colors.primary */}
                        <Text style={styles.optionText}>Treinos</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Histórico'); }}>
                        <Icon name="history" size={Layout.fontSizes.large} color={Colors.primary} /> {/* Usando Colors.primary */}
                        <Text style={styles.optionText}>Histórico de Treinos</Text>
                    </TouchableOpacity>

                    

                    <TouchableOpacity style={styles.optionItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Progresso'); }}>
                        <Icon name="chart-line" size={Layout.fontSizes.large} color={Colors.primary} /> {/* Usando Colors.primary */}
                        <Text style={styles.optionText}>Progresso do aluno</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.optionItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Chat Online'); }}>
                        <Icon name="comments" size={Layout.fontSizes.large} color={Colors.primary} /> {/* Usando Colors.primary */}
                        <Text style={styles.optionText}>Chat Online</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ListarQuestionariosUser'); }}
                    >
                        <Icon name="question-circle" size={Layout.fontSizes.large} color={Colors.primary} /> 
                        <Text style={styles.optionText}>Responder Questionário</Text>
                    </TouchableOpacity>

                    {/* NOVO BOTÃO: Aulas de Grupo */}
                    <TouchableOpacity
                        style={[styles.optionItem, styles.optionItemLast]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('ListGroupClasses'); }}
                    >
                        <Ionicons name="people-outline" size={Layout.fontSizes.large} color={Colors.primary} /> 
                        <Text style={styles.optionText}>Aulas de Grupo</Text>
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
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    console.log('Dia selecionado no calendário:', day.dateString);
                                    // Aqui você pode adicionar lógica para exibir detalhes do treino do dia
                                }}
                                theme={{
                                    selectedDayBackgroundColor: Colors.primary, // Usando Colors.primary
                                    todayTextColor: Colors.primary, // Usando Colors.primary
                                    arrowColor: Colors.primary, // Usando Colors.primary
                                    monthTextColor: Colors.textPrimary,
                                    textSectionTitleColor: Colors.neutralGray,
                                    textDayFontWeight: '500',
                                    textMonthFontWeight: 'bold',
                                    textDayHeaderFontWeight: 'bold',
                                    // Estilos para os pontos (dots)
                                    dotStyle: {
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        marginHorizontal: 1,
                                    }
                                }}
                                style={styles.fullCalendar}
                            />
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setIsCalendarModalVisible(false);
                                }}
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
        backgroundColor: Colors.background, // Usando Colors.background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background, // Usando Colors.background
    },
    loadingText: {
        marginTop: Layout.spacing.small,
        fontSize: Layout.fontSizes.medium,
        color: Colors.textSecondary,
    },
    fixedProfileHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: FIXED_HEADER_HEIGHT,
        backgroundColor: Colors.primary, // Usando Colors.primary
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Layout.padding,
        paddingTop: Platform.OS === 'android' ? Layout.spacing.large : 0, // Ajuste para Android
        borderBottomLeftRadius: Layout.borderRadius.large,
        borderBottomRightRadius: Layout.borderRadius.large,
        // Layout.cardElevation já usa Colors.black
        ...Layout.cardElevation,
        zIndex: 10,
    },
    scrollContentWithHeader: {
        paddingTop: FIXED_HEADER_HEIGHT + Layout.spacing.medium, // Ajusta o padding para a barra fixa
        paddingHorizontal: Layout.padding,
        paddingBottom: Layout.spacing.xlarge,
    },
    avatarContainerFixed: {
        marginRight: Layout.spacing.medium,
    },
    avatarFixed: {
        width: 60,
        height: 60,
        borderRadius: Layout.borderRadius.pill,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.info, // Usando Colors.info
        overflow: 'hidden', // Garante que a imagem seja cortada no borderRadius
    },
    avatarTextFixed: {
        color: Colors.primary, // Usando Colors.primary
        fontSize: Layout.fontSizes.xlarge,
        fontWeight: 'bold',
    },
    userInfoFixed: {
        flex: 1,
        justifyContent: 'center',
    },
    userNameTextFixed: {
        fontSize: Layout.fontSizes.xlarge,
        fontWeight: 'bold',
        color: Colors.white,
    },
    userPlanTextFixed: {
        fontSize: Layout.fontSizes.small,
        color: 'rgba(255,255,255,0.8)',
        marginTop: Layout.spacing.xsmall,
    },
    motivationalPhraseText: {
        fontSize: Layout.fontSizes.xsmall,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
        marginTop: Layout.spacing.xsmall,
    },
    greetingText: {
        fontSize: Layout.fontSizes.large,
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Layout.spacing.large,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    toggleButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: Colors.lightGray, // Usando Colors.lightGray (antigo toggleBackground)
        borderRadius: Layout.borderRadius.medium,
        marginBottom: Layout.spacing.large,
        padding: Layout.spacing.xsmall,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: Layout.spacing.small,
        borderRadius: Layout.borderRadius.small,
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: Colors.white,
        ...Layout.cardElevation, // Usando a elevação padrão
    },
    toggleButtonText: {
        fontSize: Layout.fontSizes.medium,
        fontWeight: 'bold',
        color: Colors.textPrimary, // Usando Colors.textPrimary (antigo toggleText)
    },
    sectionCard: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.borderRadius.large,
        padding: Layout.padding,
        marginBottom: Layout.spacing.large,
        ...Layout.cardElevation, // Usando a elevação padrão
    },
    sectionTitle: {
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
        marginBottom: Layout.spacing.medium,
        color: Colors.textPrimary,
    },
    weekNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.medium,
    },
    weekNavButton: {
        padding: Layout.spacing.xsmall,
    },
    weekRangeText: {
        fontSize: Layout.fontSizes.medium,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    trainingFrequencyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    dayItem: {
        alignItems: 'center',
        padding: Layout.spacing.xsmall,
    },
    dayIconWrapperBase: {
        width: 30,
        height: 30,
        borderRadius: Layout.borderRadius.pill, // Círculo perfeito
        borderWidth: 1.5, // Borda um pouco mais grossa
        borderColor: STATUS_COLORS.defaultBorder,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Layout.spacing.xsmall,
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
        borderWidth: 2.5, // Borda mais grossa para "Hoje"
    },
    dayIconWrapperScheduledFuture: {
        backgroundColor: 'transparent',
        borderColor: STATUS_COLORS.scheduledFuture,
        borderWidth: 1.5,
    },
    dayIconWrapperMissed: {
        backgroundColor: Colors.error, // Usando Colors.error para o fundo
        borderColor: STATUS_COLORS.missed,
    },
    dayLabel: {
        fontSize: Layout.fontSizes.small,
        color: Colors.neutralGray,
    },
    optionsList: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.borderRadius.large,
        ...Layout.cardElevation, // Usando a elevação padrão
        paddingVertical: Layout.spacing.small,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Layout.spacing.medium,
        paddingHorizontal: Layout.padding,
        borderBottomWidth: StyleSheet.hairlineWidth, // Linha fina para separador
        borderBottomColor: Colors.borderLight,
    },
    optionItemLast: {
        borderBottomWidth: 0,
    },
    optionText: {
        fontSize: Layout.fontSizes.medium,
        marginLeft: Layout.spacing.medium,
        color: Colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fundo mais escuro para o modal
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: Layout.borderRadius.large,
        padding: Layout.padding,
        width: '90%', // Ligeiramente menor para mais margem
        maxHeight: '85%', // Mais altura para o calendário
        alignItems: 'center',
        ...Layout.cardElevation, // Sombra padrão para o modal
    },
    modalTitle: {
        fontSize: Layout.fontSizes.title,
        fontWeight: 'bold',
        marginBottom: Layout.spacing.medium,
        color: Colors.primary, // Usando Colors.primary
    },
    fullCalendar: {
        width: '100%',
        marginBottom: Layout.spacing.medium,
        borderRadius: Layout.borderRadius.medium,
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    modalCloseButton: {
        marginTop: Layout.spacing.medium,
        backgroundColor: Colors.primary, // Usando Colors.primary
        paddingVertical: Layout.spacing.small,
        paddingHorizontal: Layout.spacing.large,
        borderRadius: Layout.borderRadius.medium,
    },
    modalCloseButtonText: {
        color: Colors.white,
        fontSize: Layout.fontSizes.medium,
        fontWeight: 'bold',
    },
    legendContainer: {
        marginTop: Layout.spacing.large,
        padding: Layout.spacing.medium,
        backgroundColor: Colors.background, // Usando Colors.background
        borderRadius: Layout.borderRadius.medium,
        borderWidth: 1,
        borderColor: Colors.borderLight,
    },
    legendTitle: {
        fontSize: Layout.fontSizes.medium,
        fontWeight: 'bold',
        marginBottom: Layout.spacing.small,
        color: Colors.textPrimary,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.xsmall,
    },
    legendColorBox: {
        width: 20,
        height: 20,
        borderRadius: Layout.borderRadius.small, // Quadrado com cantos arredondados
        marginRight: Layout.spacing.small,
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    legendText: {
        fontSize: Layout.fontSizes.small,
        color: Colors.neutralGray,
    },
});
