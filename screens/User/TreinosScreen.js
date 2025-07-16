import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  buscarTodosTreinosDoUser,
  buscarAvaliacoesAgendaDoUser,
} from '../../services/userService';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  isToday,
  isPast,
  isFuture,
} from 'date-fns';
import { getUserIdLoggedIn } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../ThemeContext'; // Certifique-se que este import é válido ou remova se não for usado
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

// Novas cores
const COLORS = {
  primary: '#d4ac54',      // color1
  lightPrimary: '#e0c892',   // color2
  darkPrimary: '#69511a',    // color3
  neutralGray: '#767676',    // color4
  lightGray: '#bdbdbd',      // color5
  white: '#fff',
  black: '#000',             // Preto para sombras e alguns textos
  background: '#f9fafb',     // Fundo geral
  cardBackground: '#ffffff', // Fundo dos cards
  // Cores semânticas mantidas ou mapeadas para as mais próximas
  completedGreen: '#4CAF50', // Verde para concluído (mantido)
  missedRed: '#FF5252',      // Vermelho para perdido (mantido)
  checkIconGreen: '#10b981', // Verde para o ícone de check (mantido)
};

// Definição das cores para os diferentes status (usando a nova paleta)
const STATUS_COLORS = {
  completed: COLORS.completedGreen,
  missed: COLORS.missedRed,
  todayPending: COLORS.darkPrimary, // Texto e borda para hoje pendente
  scheduledFuture: COLORS.lightPrimary, // Fundo para futuro agendado
  noTraining: COLORS.lightGray,
  defaultBorder: COLORS.lightGray,
  defaultText: COLORS.neutralGray,
  selectedDay: COLORS.primary, // Dia selecionado (fundo)
  selectedDayText: COLORS.darkPrimary, // Dia selecionado (texto)
  evaluation: COLORS.lightPrimary, // Fundo para avaliação
  evaluationText: COLORS.darkPrimary, // Texto para avaliação
};

// Frases motivacionais com emojis
const frasesMotivacionais = [
  '🏋️‍♂️ Cada treino te aproxima do teu objetivo!',
  '🔥 Não pares até te orgulhares!',
  '💪 A consistência supera a motivação.',
  '⏱️ É só 1 hora do teu dia. Dá o teu máximo!',
  '🧠 Corpo são, mente sã.',
  '🚀 Hoje é um bom dia para evoluir!',
  '🙌 Tu consegues mais do que imaginas.',
  '🥇 O esforço de hoje é o resultado de amanhã.',
];

const AnimatedCheckIcon = () => {
  const fadeCheck = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeCheck, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.Text style={{ opacity: fadeCheck, marginLeft: 6 }}>
      <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.checkIconGreen} />
    </Animated.Text>
  );
};

// Altura da barra fixa do cabeçalho (AJUSTADA PARA A FRASE)
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 120 : 110;

export default function TreinosScreen() {
  const [treinos, setTreinos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [avaliacoesDoDia, setAvaliacoesDoDia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [treinosConcluidos, setTreinosConcluidos] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current; // Para a lista de treinos do dia
  const navigation = useNavigation();
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  const fadeAnimPhrase = useRef(new Animated.Value(0)).current; // NOVO: Para a animação da frase
  // const { colors, toggleTheme, theme } = useContext(ThemeContext); // Removido se ThemeContext não for usado

  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  const [treinosTotalSemana, setTreinosTotalSemana] = useState(0);
  const [treinosConcluidosSemana, setTreinosConcluidosSemana] = useState(0);

  // carregarTreinosConcluidos agora lida com o objeto de duração
  const carregarTreinosConcluidos = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return;

      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      let loadedRawData = dados ? JSON.parse(dados) : {};

      const processedConcluidos = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const dateString in loadedRawData) {
        const treinoDate = parseISO(dateString);
        if (!isNaN(treinoDate.getTime()) && (isPast(treinoDate) || isToday(treinoDate))) {
          // Se for um booleano (formato antigo), converte para objeto com duração 0
          if (typeof loadedRawData[dateString] === 'boolean') {
            processedConcluidos[dateString] = { completed: loadedRawData[dateString], duration: 0 };
          } else if (typeof loadedRawData[dateString] === 'object' && loadedRawData[dateString] !== null) {
            // Se já for um objeto, garante que 'completed' e 'duration' existem
            processedConcluidos[dateString] = {
              completed: loadedRawData[dateString].completed || false,
              duration: loadedRawData[dateString].duration || 0,
            };
          }
        } else {
          console.log(`🗑️ Removendo treino concluído futuro/inválido do AsyncStorage (TreinosScreen): ${dateString}`);
        }
      }

      setTreinosConcluidos(processedConcluidos);
      console.log('✅ Treinos concluídos carregados e FILTRADOS do AsyncStorage (TreinosScreen):', processedConcluidos);
    } catch (error) {
      console.error('Erro ao carregar treinos concluídos do AsyncStorage (TreinosScreen):', error);
      Alert.alert('Erro', 'Falha ao carregar histórico de treinos concluídos.');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      async function reloadAllData() {
        setLoading(true);
        let userId = null;
        try {
          userId = await getUserIdLoggedIn();
          if (!userId) {
            Alert.alert('Erro', 'Usuário não autenticado');
            setLoading(false);
            return;
          }

          console.log('--- Início do Recarregamento de Dados do Utilizador (useFocusEffect) ---');
          console.log('UserID logado (TreinosScreen - useFocusEffect):', userId);

          const userDocRef = doc(db, 'users', userId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(userData.name || 'Utilizador');
            setUserInitial(userData.name ? userData.name.charAt(0).toUpperCase() : 'U');
          } else {
            setUserName('Utilizador');
            setUserInitial('U');
          }

          const [treinosCarregados, avaliacoesCarregadas] = await Promise.all([
            buscarTodosTreinosDoUser(userId),
            buscarAvaliacoesAgendaDoUser(userId)
          ]);

          // Lógica de Deduplicação AQUI (garante que IDs de documentos são únicos)
          const uniqueTreinosMap = new Map();
          treinosCarregados.forEach(treino => {
            if (treino.id) {
              uniqueTreinosMap.set(treino.id, treino);
            }
          });
          const finalTreinos = Array.from(uniqueTreinosMap.values());
          console.log(`Dados de Treinos Carregados: ${treinosCarregados.length}, Após Deduplicação: ${finalTreinos.length}`);


          const uniqueAvaliacoesMap = new Map();
          avaliacoesCarregadas.forEach(avaliacao => {
            if (avaliacao.id) {
              uniqueAvaliacoesMap.set(avaliacao.id, avaliacao);
            }
          });
          const finalAvaliacoes = Array.from(uniqueAvaliacoesMap.values());
          console.log(`Dados de Avaliações Carregadas: ${avaliacoesCarregadas.length}, Após Deduplicação: ${finalAvaliacoes.length}`);
          // Fim da Lógica de Deduplicação

          setTreinos(finalTreinos);
          setAvaliacoes(finalAvaliacoes);
          await carregarTreinosConcluidos();

          console.log('✅ Todos os dados recarregados com sucesso.');
          console.log('Dados de Treinos FINAIS (para TreinosScreen):', finalTreinos.map(t => ({ id: t.id, data: t.data, nome: t.nome })));
          console.log('Dados de Avaliações FINAIS (para TreinosScreen):', finalAvaliacoes.map(a => ({ id: a.id, data: a.data })));
          
        } catch (error) {
          console.error('❌ ERRO NO RECARREGAMENTO DE DADOS (useFocusEffect):', error);
          Alert.alert('Erro', `Não foi possível recarregar os dados: ${error.message || 'Erro desconhecido.'}`);
        } finally {
          setLoading(false);
          console.log('--- Fim do Recarregamento de Dados do Utilizador ---');
        }
      }
      reloadAllData();
    }, [])
  );

  // Efeito para rotacionar as frases motivacionais com animação
  useEffect(() => {
    let phraseIndex = 0;

    const animatePhraseChange = () => {
      Animated.timing(fadeAnimPhrase, {
        toValue: 0, // Fade out
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Após o fade out, atualiza a frase e faz fade in
        phraseIndex = (phraseIndex + 1) % frasesMotivacionais.length;
        setFraseMotivacional(frasesMotivacionais[phraseIndex]);
        Animated.timing(fadeAnimPhrase, {
          toValue: 1, // Fade in
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    };

    // Define a frase inicial
    setFraseMotivacional(frasesMotivacionais[phraseIndex]);
    Animated.timing(fadeAnimPhrase, { toValue: 1, duration: 500, useNativeDriver: true }).start(); // Fade in initial phrase

    const intervalId = setInterval(animatePhraseChange, 7000); // Muda a cada 7 segundos (incluindo tempo de animação)

    return () => clearInterval(intervalId); // Limpa o intervalo ao desmontar o componente
  }, []); // Dependência vazia para rodar apenas uma vez na montagem

  useEffect(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

    const weeklyTreinos = treinos.filter(treino => {
      if (typeof treino.data === 'string' && treino.data.includes('T')) {
        const treinoDate = parseISO(treino.data);
        return isWithinInterval(treinoDate, { start: startOfCurrentWeek, end: endOfCurrentWeek });
      }
      return false;
    });

    let weeklyConcluidoCount = 0;
    weeklyTreinos.forEach(treino => {
      const dataStr = treino.data.split('T')[0];
      // Verifica se o objeto de conclusão existe e se está marcado como concluído
      if (treinosConcluidos[dataStr] && treinosConcluidos[dataStr].completed) {
        weeklyConcluidoCount++;
      }
    });

    setTreinosTotalSemana(weeklyTreinos.length);
    setTreinosConcluidosSemana(weeklyConcluidoCount);
  }, [treinos, treinosConcluidos]);


  useEffect(() => {
    const marcacoes = {};
    const todayFormatted = format(new Date(), 'yyyy-MM-dd');

    console.log('\n--- Gerando Marcações para o Calendário (TreinosScreen) ---');
    console.log('Treinos a serem processados:', treinos.map(t => ({ id: t.id, data: t.data, nome: t.nome })));
    console.log('Avaliações a serem processadas:', avaliacoes.map(a => ({ id: a.id, data: a.data })));
    console.log('Status de Treinos Concluidos (para marcação):', treinosConcluidos);
    console.log('Data de Hoje Formatada para Comparação:', todayFormatted);


    treinos.forEach((treino) => {
      if (typeof treino.data === 'string' && treino.data.includes('T')) {
        const dataStr = treino.data.split('T')[0];
        const treinoDate = parseISO(treino.data);

        if (isNaN(treinoDate.getTime())) {
            console.warn(`⚠️ Data de treino inválida para parseISO: ${treino.data} (ID: ${treino.id})`);
            return;
        }

        const treinoDateLocalStartOfDay = new Date(treinoDate.getFullYear(), treinoDate.getMonth(), treinoDate.getDate());
        const todayLocalStartOfDay = new Date();
        todayLocalStartOfDay.setHours(0, 0, 0, 0);

        // Acessa o objeto de conclusão para verificar o status
        const completionDetails = treinosConcluidos[dataStr];
        const isConcluido = completionDetails ? completionDetails.completed : false;

        const isTodayDate = format(treinoDateLocalStartOfDay, 'yyyy-MM-dd') === format(todayLocalStartOfDay, 'yyyy-MM-dd');
        const isPastDate = treinoDateLocalStartOfDay < todayLocalStartOfDay;
        const isFutureDate = treinoDateLocalStartOfDay > todayLocalStartOfDay;

        console.log(`[Marcação Treino] Data: ${dataStr}, Nome: ${treino.nome}, Concluido: ${isConcluido}, Hoje (str): ${isTodayDate}, Passado (date-fns): ${isPastDate}, Futuro (date-fns): ${isFutureDate}`);
        console.log(`     -> Status Calculado para ${dataStr}: Hoje: ${isTodayDate}, Passado: ${isPastDate}, Futuro: ${isFutureDate}`);


        const defaultDayStyle = {
            container: {
                backgroundColor: 'transparent',
                borderRadius: 8,
                borderColor: STATUS_COLORS.defaultBorder,
                borderWidth: 1,
            },
            text: {
                color: STATUS_COLORS.defaultText,
                fontWeight: 'bold',
            },
        };

        if (!marcacoes[dataStr]) {
            marcacoes[dataStr] = {
                dots: [],
                marked: true,
                customStyles: defaultDayStyle,
            };
        } else {
            marcacoes[dataStr] = {
                ...marcacoes[dataStr],
                dots: marcacoes[dataStr]?.dots || [],
                marked: true,
                customStyles: {
                    container: { ...marcacoes[dataStr].customStyles?.container, ...defaultDayStyle.container },
                    text: { ...marcacoes[dataStr].customStyles?.text, ...defaultDayStyle.text },
                },
            };
        }


        if (isConcluido) {
          marcacoes[dataStr].customStyles.container.backgroundColor = STATUS_COLORS.completed;
          marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.completed;
          marcacoes[dataStr].customStyles.text.color = COLORS.white;
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'concluido')) {
            marcacoes[dataStr].dots.push({ key: 'concluido', color: STATUS_COLORS.completed });
          }
          console.log(`     -> Treino ${dataStr}: Concluido (Verde)`);
        } else if (isTodayDate) {
          marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.todayPending;
          marcacoes[dataStr].customStyles.container.borderWidth = 2;
          marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.todayPending;
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'today')) {
            marcacoes[dataStr].dots.push({ key: 'today', color: STATUS_COLORS.todayPending });
          }
          console.log(`     -> Treino ${dataStr}: Hoje Pendente (Borda ${STATUS_COLORS.todayPending} / Texto ${STATUS_COLORS.todayPending})`);
        } else if (isFutureDate) {
          marcacoes[dataStr].customStyles.container.backgroundColor = STATUS_COLORS.scheduledFuture; // Fundo lightPrimary sólido
          marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.scheduledFuture;
          marcacoes[dataStr].customStyles.container.borderWidth = 1;
          marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.evaluationText; // Texto darkPrimary para contraste
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'scheduled')) {
            marcacoes[dataStr].dots.push({ key: 'scheduled', color: STATUS_COLORS.evaluationText });
          }
          console.log(`     -> Treino ${dataStr}: Futuro Agendado (Fundo ${STATUS_COLORS.scheduledFuture} / Borda ${STATUS_COLORS.scheduledFuture} / Texto ${STATUS_COLORS.evaluationText})`);
        } else if (isPastDate) {
            marcacoes[dataStr].customStyles.container.backgroundColor = '#FFEBEE'; // Mantido um vermelho claro para fundo
            marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.missed;
            marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.missed;
            marcacoes[dataStr].customStyles.container.borderWidth = 1;
            if (!marcacoes[dataStr].dots.some(dot => dot.key === 'missed')) {
                marcacoes[dataStr].dots.push({ key: 'missed', color: STATUS_COLORS.missed });
            }
            console.log(`     -> Treino ${dataStr}: Perdido (Fundo Vermelho Claro/Texto Vermelho)`);
        }
      } else {
        console.warn(`⚠️ Treino com formato de data inválido ou ausente: ${treino.data} (ID: ${treino.id})`);
      }
    });

    avaliacoes.forEach((avaliacao) => {
      if (avaliacao.data && typeof avaliacao.data === 'string') {
        const dataStr = avaliacao.data;
        
        const avaliacaoDate = parseISO(avaliacao.data);
        if (isNaN(avaliacaoDate.getTime())) {
            console.warn(`⚠️ Data de avaliação inválida para parseISO: ${avaliacao.data} (ID: ${avaliacao.id})`);
            return;
        }

        console.log(`[Marcação Avaliação] Data: ${dataStr}, ID: ${avaliacao.id}`);

        marcacoes[dataStr] = {
          ...marcacoes[dataStr],
          dots: marcacoes[dataStr]?.dots || [],
          marked: true,
          customStyles: {
            container: {
              backgroundColor: STATUS_COLORS.evaluation,
              borderRadius: 8,
              borderColor: STATUS_COLORS.evaluationText,
              borderWidth: 1,
              ...marcacoes[dataStr]?.customStyles?.container
            },
            text: {
              color: STATUS_COLORS.evaluationText,
              fontWeight: 'bold',
              ...marcacoes[dataStr]?.customStyles?.text
            },
          },
        };
        if (!marcacoes[dataStr].dots.some(dot => dot.key === 'avaliacao')) {
          marcacoes[dataStr].dots.push({ key: 'avaliacao', color: STATUS_COLORS.evaluationText });
        }
        console.log(`     -> Avaliação ${dataStr}: Marcada (Fundo ${STATUS_COLORS.evaluation} / Texto ${STATUS_COLORS.evaluationText})`);
      } else {
        console.warn(`⚠️ Avaliação com formato de data inválido ou ausente: ${avaliacao.data} (ID: ${avaliacao.id})`);
      }
    });

    if (selectedDate) {
      console.log(`[Marcação Calendário] Dia Selecionado: ${selectedDate}`);
      marcacoes[selectedDate] = {
        ...marcacoes[selectedDate],
        customStyles: {
          container: {
            backgroundColor: STATUS_COLORS.selectedDay,
            borderRadius: 8,
            borderColor: STATUS_COLORS.selectedDayText,
            borderWidth: 2,
            ...marcacoes[selectedDate]?.customStyles?.container
          },
          text: {
            color: STATUS_COLORS.selectedDayText,
            fontWeight: 'bold',
            ...marcacoes[selectedDate]?.customStyles?.text
          },
        },
      };
    }

    setMarkedDates(marcacoes);
    console.log('--- Fim da Geração de Marcações ---');
    console.log('Objeto markedDates final:', JSON.stringify(marcacoes, null, 2));
  }, [treinos, treinosConcluidos, avaliacoes, selectedDate]);

  useEffect(() => {
    if (selectedDate) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [selectedDate]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);

    const treinosDia = treinos.filter(
      (t) => typeof t.data === 'string' && t.data.startsWith(day.dateString)
    );

    const avaliacoesDia = avaliacoes.filter(
      (a) => typeof a.data === 'string' && a.data === day.dateString
    );

    setTreinosDoDia(treinosDia);
    setAvaliacoesDoDia(avaliacoesDia);

    console.log(`Dia selecionado: ${day.dateString}`);
    console.log(`Treinos para ${day.dateString}:`, treinosDia.map(t => ({ id: t.id, nome: t.nome, data: t.data })));
    console.log(`Avaliações para ${day.dateString}:`, avaliacoesDia.map(a => ({ id: a.id, data: a.data })));
  };

  const limparSelecao = () => {
    setSelectedDate('');
    setTreinosDoDia([]);
    setAvaliacoesDoDia([]);
  };

  const getIconByCategoria = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'força':
        return (
          <MaterialCommunityIcons name="weight-lifter" size={24} color={COLORS.primary} />
        );
      case 'cardio':
        return <MaterialCommunityIcons name="heart-pulse" size={24} color={COLORS.primary} />;
      case 'flexibilidade':
        return <MaterialCommunityIcons name="yoga" size={24} color={COLORS.primary} />;
      case 'hiit':
        return <MaterialCommunityIcons name="flash" size={24} color={COLORS.primary} />;
      default:
        return <MaterialCommunityIcons name="run" size={24} color={COLORS.primary} />;
    }
  };

  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds === 0) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0)
      .join(':');
  };

  return (
    <View style={styles.fullScreenContainer}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerContentRow}> 
          <View style={styles.headerUserInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{userInitial}</Text>
            </View>
            <Text style={styles.headerUserName}>{userName}</Text>
          </View>
          <Text style={styles.headerAppName}>RisiFit</Text>
        </View>
        <Animated.Text style={[styles.motivationalPhraseTextFixed, { opacity: fadeAnimPhrase }]}>
          {fraseMotivacional}
        </Animated.Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>

        <View style={styles.progressBarContainer}>
          <Text style={styles.progressText}>
            Treinos concluídos esta semana: {treinosConcluidosSemana} / {treinosTotalSemana}
          </Text>

          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    treinosTotalSemana > 0
                      ? `${((treinosConcluidosSemana / treinosTotalSemana) * 100).toFixed(0)}%`
                      : '0%',
                },
              ]}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <Calendar
              onDayPress={onDayPress}
              markedDates={markedDates}
              markingType={'custom'}
              theme={{
                selectedDayBackgroundColor: STATUS_COLORS.selectedDay,
                todayTextColor: STATUS_COLORS.todayPending,
                arrowColor: STATUS_COLORS.defaultText,
                textSectionTitleColor: STATUS_COLORS.defaultText,
                monthTextColor: STATUS_COLORS.defaultText,
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: 'bold',
              }}
              style={styles.calendar}
            />

            {selectedDate ? (
              <>
                <TouchableOpacity style={styles.btnLimpar} onPress={limparSelecao}>
                  <Text style={styles.btnLimparText}>Limpar seleção</Text>
                </TouchableOpacity>

                <Animated.View style={{ opacity: fadeAnim }}>
                  <Text style={styles.subTitle}>
                    Registos em {format(parseISO(selectedDate), 'dd/MM/yyyy')}:
                  </Text>

                  {treinosDoDia.length === 0 && avaliacoesDoDia.length === 0 && (
                    <Text style={styles.noTreinos}>Nenhum registo para este dia.</Text>
                  )}

                  {treinosDoDia.map((treino) => {
                    const completionDetails = treinosConcluidos[treino.data.split('T')[0]];
                    const isConcluido = completionDetails ? completionDetails.completed : false;
                    const duracaoTreino = completionDetails ? completionDetails.duration : null;

                    const treinoDateTime = parseISO(treino.data);
                    const now = new Date();
                    const isFutureTrainingSession = treinoDateTime > now; 

                    return (
                      <View key={treino.id} style={[styles.treinoBox, isConcluido && styles.treinoConcluidoBox]}>
                        <View style={styles.treinoHeader}>
                          {getIconByCategoria(treino.categoria)}
                          <Text style={[styles.treinoNome, isConcluido && styles.treinoNomeConcluido]}>
                            {treino.nome}
                            {isConcluido && (
                              <Text>
                                {' '}
                                <AnimatedCheckIcon />
                              </Text>
                            )}
                            {!isConcluido && isFutureTrainingSession && (
                              <MaterialCommunityIcons name="calendar-clock" size={18} color={STATUS_COLORS.scheduledFuture} style={{ marginLeft: 5 }} />
                            )}
                          </Text>
                        </View>
                        <Text style={styles.treinoCategoria}>
                          Categoria: {treino.categoria}
                        </Text>
                        
                        {!isFutureTrainingSession && (
                          <>
                            <Text style={styles.treinoDescricao}>{treino.descricao}</Text>
                            {treino.exercicios?.length > 0 && (
                              <>
                                <Text style={styles.exerciciosTitle}>Exercícios:</Text>
                                {treino.exercicios.map((ex, idx) => (
                                  <Text key={idx} style={styles.exercicioItem}>
                                    • {ex.nome} — {ex.tipo === 'reps' ? 'Repetições' : 'Tempo'}: {ex.valor}
                                  </Text>
                                ))}
                              </>
                            )}
                          </>
                        )}

                        <Text style={styles.treinoHora}>
                          Hora:{' '}
                          {new Date(treino.data).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>

                        {isConcluido && (duracaoTreino !== null && duracaoTreino !== 0) && (
                          <Text style={styles.treinoDuracao}>
                            Duração: {formatDuration(duracaoTreino)}
                          </Text>
                        )}

                        {!isConcluido && !isFutureTrainingSession && (
                          <TouchableOpacity
                            style={styles.btnIniciar}
                            onPress={() => navigation.navigate('ExecucaoTreinoScreen', { treino })}
                          >
                            <Text style={styles.btnIniciarText}>Iniciar Treino</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {avaliacoesDoDia.map((avaliacao) => (
                    <View
                      key={avaliacao.id}
                      style={[styles.treinoBox, { borderColor: STATUS_COLORS.evaluationText }]}
                    >
                      <Text style={[styles.treinoNome, { color: STATUS_COLORS.evaluationText }]}>
                        📋 Avaliação Física
                      </Text>
                      <Text style={styles.treinoDescricao}>
                        {avaliacao.texto || avaliacao.observacoes || 'Sem detalhes.'}
                      </Text>
                      <Text style={styles.treinoHora}>
                        Hora: {avaliacao.hora || 'Não informada'}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              </>
            ) : (
              <Text style={styles.selecioneData}>
                Selecione uma data no calendário para ver os registos.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    backgroundColor: COLORS.primary, // color1
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10,
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: COLORS.primary, // color1
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  motivationalPhraseTextFixed: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)', // Mantido branco semi-transparente para contraste
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.background,
    paddingTop: FIXED_HEADER_HEIGHT + 15,
  },
  scrollView: {
    flex: 1,
  },
  calendar: {
    borderRadius: 8,
    elevation: 3,
    marginBottom: 25,
    backgroundColor: COLORS.white,
  },
  progressBarContainer: {
    marginHorizontal: 0,
    marginBottom: 20,
    marginTop: 10,
  },
  progressText: {
    fontWeight: '700',
    marginBottom: 8,
    color: COLORS.darkPrimary, // color3
    fontSize: 16,
  },
  progressBarBackground: {
    height: 20,
    backgroundColor: COLORS.lightGray, // color5
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary, // color1
    borderRadius: 12,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: COLORS.darkPrimary, // color3
  },
  noTreinos: {
    fontStyle: 'italic',
    color: COLORS.neutralGray, // color4
    textAlign: 'center',
    marginTop: 10,
  },
  selecioneData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: COLORS.neutralGray, // color4
    marginTop: 20,
  },
  btnLimpar: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary, // color1
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 15,
  },
  btnLimparText: {
    color: COLORS.primary, // color1
    fontWeight: 'bold',
  },
  treinoBox: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderColor: COLORS.primary, // Cor padrão da borda do treino (pode ser ajustado)
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treinoConcluidoBox: {
    borderColor: STATUS_COLORS.completed, // Borda verde para concluído
  },
  treinoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  treinoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkPrimary, // color3
    marginLeft: 8,
    flexShrink: 1,
  },
  treinoNomeConcluido: {
    color: STATUS_COLORS.completed, // Texto verde para concluído
  },
  treinoCategoria: {
    fontSize: 14,
    color: COLORS.neutralGray, // color4
    marginBottom: 5,
  },
  treinoDescricao: {
    fontSize: 14,
    color: COLORS.neutralGray, // color4
    marginBottom: 5,
  },
  exerciciosTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.darkPrimary, // color3
    marginTop: 5,
    marginBottom: 3,
  },
  exercicioItem: {
    fontSize: 13,
    color: COLORS.neutralGray, // color4
    marginLeft: 10,
    marginBottom: 2,
  },
  treinoHora: {
    fontSize: 13,
    color: COLORS.neutralGray, // color4
    marginTop: 5,
  },
  treinoDuracao: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.neutralGray, // color4
    marginTop: 3,
  },
  btnIniciar: {
    backgroundColor: COLORS.primary, // color1
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  btnIniciarText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});
