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
  isFuture,
} from 'date-fns';
import { getUserIdLoggedIn } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { ThemeContext } from '../ThemeContext'; // Certifique-se que este import é válido ou remova se não for usado
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

// Nova paleta de cores fornecida para este ficheiro
const COLORS = {
  primary: '#d4ac54',        // color1 (Dourado principal)
  lightPrimary: '#e0c892',   // color2 (Dourado claro)
  darkPrimary: '#69511a',    // color3 (Dourado escuro)
  neutralGray: '#767676',    // color4 (Cinza neutro)
  lightGray: '#bdbdbd',      // color5 (Cinza claro)
  white: '#fff',             // Branco puro
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
  // ALTERADO: treinosConcluidos agora usa o ID do treino como chave
  const [treinosConcluidos, setTreinosConcluidos] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  const fadeAnimPhrase = useRef(new Animated.Value(0)).current;
  // const { colors, toggleTheme, theme } = useContext(ThemeContext); // Removido se ThemeContext não for usado

  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  const [treinosTotalSemana, setTreinosTotalSemana] = useState(0);
  const [treinosConcluidosSemana, setTreinosConcluidosSemana] = useState(0);

  // carregarTreinosConcluidos agora lida com o objeto de duração e ID do treino
  const carregarTreinosConcluidos = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return;

      // ALTERADO: A chave no AsyncStorage é genérica para todos os treinos do user
      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      // Os dados carregados devem ser um objeto onde as chaves são os IDs dos treinos
      let loadedRawData = dados ? JSON.parse(dados) : {};

      const processedConcluidos = {};
      // Itera sobre os dados carregados, que agora devem ter IDs de treino como chaves
      for (const treinoId in loadedRawData) {
        const completionDetails = loadedRawData[treinoId];

        // Validação básica para garantir que é um objeto de conclusão válido
        if (typeof completionDetails === 'object' && completionDetails !== null && 'completed' in completionDetails) {
          processedConcluidos[treinoId] = {
            completed: completionDetails.completed || false,
            duration: completionDetails.duration || 0,
          };
        } else {
          console.warn(`🗑️ Dados de conclusão inválidos ou incompletos para treino ID ${treinoId} no AsyncStorage.`);
        }
      }

      setTreinosConcluidos(processedConcluidos);
      console.log('✅ Treinos concluídos carregados do AsyncStorage (TreinosScreen):', processedConcluidos);
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
          // Chama carregarTreinosConcluidos após carregar os treinos para ter os IDs corretos
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

    let weeklyTreinosCount = 0;
    let weeklyConcluidoCount = 0;

    treinos.forEach(treino => {
      if (typeof treino.data === 'string' && treino.data.includes('T')) {
        const treinoDate = parseISO(treino.data);
        if (!isNaN(treinoDate.getTime()) && isWithinInterval(treinoDate, { start: startOfCurrentWeek, end: endOfCurrentWeek })) {
          weeklyTreinosCount++;
          // ALTERADO: Verifica a conclusão pelo ID do treino
          if (treinosConcluidos[treino.id] && treinosConcluidos[treino.id].completed) {
            weeklyConcluidoCount++;
          }
        }
      }
    });

    setTreinosTotalSemana(weeklyTreinosCount);
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


    // Primeiro, processa todos os treinos para marcar as datas
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

        // ALTERADO: Acessa o objeto de conclusão para o ID específico do treino
        const completionDetails = treinosConcluidos[treino.id];
        const isConcluido = completionDetails ? completionDetails.completed : false;

        const isTodayDate = format(treinoDateLocalStartOfDay, 'yyyy-MM-dd') === format(todayLocalStartOfDay, 'yyyy-MM-dd');
        // A Lógica para o passado e futuro é mantida para os ícones e cor
        const isPastDate = treinoDateLocalStartOfDay < todayLocalStartOfDay;
        const isFutureDate = treinoDateLocalStartOfDay > todayLocalStartOfDay;
        // A lógica de "perdido" é tratada separadamente na renderização dos cards

        console.log(`[Marcação Treino] Data: ${dataStr}, Nome: ${treino.nome}, ID: ${treino.id}, Concluido: ${isConcluido}, Hoje (str): ${isTodayDate}, Passado (date-fns): ${isPastDate}, Futuro (date-fns): ${isFutureDate}`);
        console.log(`    -> Status Calculado para ${dataStr}: Hoje: ${isTodayDate}, Passado: ${isPastDate}, Futuro: ${isFutureDate}`);

        // Inicializa as marcações para o dia se ainda não existirem
        if (!marcacoes[dataStr]) {
          marcacoes[dataStr] = {
            dots: [],
            marked: true,
            customStyles: {
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
            },
          };
        }

        // Determina o status do dia com base nos treinos
        // Prioridade: Concluído > Hoje Pendente > Perdido > Futuro Agendado
        if (isConcluido) {
          // Se *qualquer* treino do dia estiver concluído, o dia pode ter um indicador de "concluído"
          // No entanto, para evitar que um treino concluído marque o dia todo,
          // vamos focar a marcação do dia na presença de treinos em geral,
          // e o status individual será tratado nos cards.
          // Para o calendário, um dia com treinos concluídos pode ter um dot específico.
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'treinoConcluido')) {
            marcacoes[dataStr].dots.push({ key: 'treinoConcluido', color: STATUS_COLORS.completed });
          }
        } else if (isTodayDate) {
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'treinoHoje')) {
            marcacoes[dataStr].dots.push({ key: 'treinoHoje', color: STATUS_COLORS.todayPending });
            // Se for hoje e ainda não foi concluído, marca a borda
            marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.todayPending;
            marcacoes[dataStr].customStyles.container.borderWidth = 2;
            marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.todayPending;
          }
        } else if (isPastDate) {
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'treinoPerdido')) {
            marcacoes[dataStr].dots.push({ key: 'treinoPerdido', color: STATUS_COLORS.missed });
            // Se for passado e não concluído, marca como perdido
            marcacoes[dataStr].customStyles.container.backgroundColor = '#FFEBEE';
            marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.missed;
            marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.missed;
            marcacoes[dataStr].customStyles.container.borderWidth = 1;
          }
        } else if (isFutureDate) {
          if (!marcacoes[dataStr].dots.some(dot => dot.key === 'treinoFuturo')) {
            marcacoes[dataStr].dots.push({ key: 'treinoFuturo', color: STATUS_COLORS.scheduledFuture });
            // Se for futuro, marca com a cor de agendado
            marcacoes[dataStr].customStyles.container.backgroundColor = STATUS_COLORS.scheduledFuture;
            marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.scheduledFuture;
            marcacoes[dataStr].customStyles.container.borderWidth = 1;
            marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.evaluationText;
          }
        }
      } else {
        console.warn(`⚠️ Treino com formato de data inválido ou ausente: ${treino.data} (ID: ${treino.id})`);
      }
    });

    // Em seguida, processa as avaliações (elas podem sobrescrever ou adicionar marcações)
    avaliacoes.forEach((avaliacao) => {
      if (avaliacao.data && typeof avaliacao.data === 'string') {
        const dataStr = avaliacao.data;

        const avaliacaoDate = parseISO(avaliacao.data);
        if (isNaN(avaliacaoDate.getTime())) {
          console.warn(`⚠️ Data de avaliação inválida para parseISO: ${avaliacao.data} (ID: ${avaliacao.id})`);
          return;
        }

        console.log(`[Marcação Avaliação] Data: ${dataStr}, ID: ${avaliacao.id}`);

        // Garante que a data existe nas marcações antes de adicionar a avaliação
        if (!marcacoes[dataStr]) {
          marcacoes[dataStr] = {
            dots: [],
            marked: true,
            customStyles: {
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
            },
          };
        }

        // Adiciona o dot de avaliação e define o estilo para a avaliação
        if (!marcacoes[dataStr].dots.some(dot => dot.key === 'avaliacao')) {
          marcacoes[dataStr].dots.push({ key: 'avaliacao', color: STATUS_COLORS.evaluationText });
        }
        // O estilo da avaliação pode sobrescrever o do treino se houver conflito visual
        marcacoes[dataStr].customStyles.container.backgroundColor = STATUS_COLORS.evaluation;
        marcacoes[dataStr].customStyles.container.borderColor = STATUS_COLORS.evaluationText;
        marcacoes[dataStr].customStyles.container.borderWidth = 1;
        marcacoes[dataStr].customStyles.text.color = STATUS_COLORS.evaluationText;

        console.log(`    -> Avaliação ${dataStr}: Marcada (Fundo ${STATUS_COLORS.evaluation} / Texto ${STATUS_COLORS.evaluationText})`);
      } else {
        console.warn(`⚠️ Avaliação com formato de data inválido ou ausente: ${avaliacao.data} (ID: ${avaliacao.id})`);
      }
    });

    // Por fim, aplica o estilo para o dia selecionado (que tem prioridade visual)
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
            ...marcacoes[selectedDate]?.customStyles?.container // Mantém estilos existentes se houver
          },
          text: {
            color: STATUS_COLORS.selectedDayText,
            fontWeight: 'bold',
            ...marcacoes[selectedDate]?.customStyles?.text // Mantém estilos existentes se houver
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
    ).sort((a, b) => { // Ordena os treinos do dia pela hora
      const timeA = new Date(a.data).getTime();
      const timeB = new Date(b.data).getTime();
      return timeA - timeB;
    });

    const avaliacoesDia = avaliacoes.filter(
      (a) => typeof a.data === 'string' && a.data === day.dateString
    ).sort((a, b) => { // Ordena as avaliações do dia pela hora (se houver)
      const timeA = a.hora ? new Date(`${a.data}T${a.hora}`).getTime() : 0;
      const timeB = b.hora ? new Date(`${b.data}T${b.hora}`).getTime() : 0;
      return timeA - timeB;
    });

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
      case 'mobilidade': // Adicionado para cobrir "Mobilidade"
        return <MaterialCommunityIcons name="yoga" size={24} color={COLORS.primary} />;
      case 'core': // Adicionado para "Core"
        return <MaterialCommunityIcons name="dumbbell" size={24} color={COLORS.primary} />;
      case 'hiit':
        return <MaterialCommunityIcons name="flash" size={24} color={COLORS.primary} />;
      default:
        return <MaterialCommunityIcons name="run" size={24} color={COLORS.primary} />;
    }
  };

  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return 'N/A'; // Alterado para < 0
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60); // Arredonda para baixo para segundos inteiros

    const parts = [];
    if (h > 0) {
      parts.push(String(h).padStart(2, '0'));
    }
    parts.push(String(m).padStart(2, '0'));
    parts.push(String(s).padStart(2, '0'));

    // Remove '00:' se for o primeiro componente e houver mais componentes (ex: '00:05:30' -> '05:30')
    // Mas mantém '00:00' se a duração for 0
    if (parts.length > 1 && parts[0] === '00') {
      return parts.slice(1).join(':');
    }
    return parts.join(':');
  };


  return (
    <View style={styles.fullScreenContainer}>
      {/* Barra Fixa do Cabeçalho */}
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
                    // ALTERADO: Verifica a conclusão pelo ID do treino
                    const completionDetails = treinosConcluidos[treino.id];
                    const isConcluido = completionDetails ? completionDetails.completed : false;
                    const duracaoTreino = completionDetails ? completionDetails.duration : null;

                    const treinoDateTime = parseISO(treino.data);
                    const now = new Date();
                    const isFutureTrainingSession = isFuture(treinoDateTime);
                    const isTodayTrainingSession = isToday(treinoDateTime);
                    // A nova lógica para "perdido" considera a data E a hora
                    const isOverdueTrainingSession = now > treinoDateTime && !isConcluido;

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
                            {isOverdueTrainingSession && ( // Adiciona ícone para treino perdido com a nova lógica
                              <MaterialCommunityIcons name="alert-circle" size={18} color={STATUS_COLORS.missed} style={{ marginLeft: 5 }} />
                            )}
                          </Text>
                        </View>
                        <Text style={styles.treinoCategoria}>
                          Categoria: {treino.categoria}
                        </Text>

                        {/* Descrição e exercícios apenas para treinos passados/hoje/concluídos, não futuros */}
                        {!isFutureTrainingSession && (
                          <>
                            <Text style={styles.treinoDescricao}>{treino.descricao}</Text>
                            {/* Verifica se é um treino de modelo ou personalizado para exibir os exercícios */}
                            {(treino.templateExercises || treino.customExercises)?.length > 0 && (
                              <>
                                <Text style={styles.exerciciosTitle}>Exercícios:</Text>
                                {(treino.templateExercises || treino.customExercises).map((ex, idx) => (
                                  <Text key={idx} style={styles.exercicioItem}>
                                    • {ex.exerciseName} — {ex.repsOrDuration} {ex.sets ? `x ${ex.sets} séries` : ''}
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

                        {isTodayTrainingSession && !isConcluido && !isOverdueTrainingSession && ( // Mostra o botão apenas para hoje, pendente e não perdido
                          <TouchableOpacity
                            style={styles.btnIniciar}
                            onPress={() => navigation.navigate('ExecucaoTreinoScreen', { treino })}
                          >
                            <Text style={styles.btnIniciarText}>Iniciar Treino</Text>
                          </TouchableOpacity>
                        )}

                        {isOverdueTrainingSession && ( // Exibe se for um treino perdido com a nova lógica
                          <View style={styles.treinoPerdidoContainer}>
                            <Text style={styles.treinoPerdidoText}>Treino Perdido</Text>
                          </View>
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
    backgroundColor: '#B8860B', // Cor Alterada para B8860B
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    borderWidth: 1,
    borderColor: COLORS.darkPrimary,
  },
  headerAvatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerAppName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    fontStyle: 'italic',
  },
  motivationalPhraseTextFixed: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    textAlign: 'left',
    width: '100%',
    paddingLeft: 50, // Alinha com o texto do nome
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: FIXED_HEADER_HEIGHT + 20, // Ajusta o padding para a barra fixa
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  progressBarContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  calendar: {
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btnLimpar: {
    backgroundColor: COLORS.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  btnLimparText: {
    color: COLORS.neutralGray,
    fontWeight: 'bold',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
    marginBottom: 15,
  },
  treinoBox: {
    backgroundColor: COLORS.cardBackground,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  treinoConcluidoBox: {
    borderColor: STATUS_COLORS.completed,
    backgroundColor: '#E8F5E9', // Um verde muito claro para o fundo
  },
  treinoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  treinoNome: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
    marginLeft: 10,
  },
  treinoNomeConcluido: {
    color: STATUS_COLORS.completed,
  },
  treinoCategoria: {
    fontSize: 14,
    color: COLORS.neutralGray,
    marginBottom: 5,
  },
  treinoDescricao: {
    fontSize: 14,
    color: COLORS.neutralGray,
    marginBottom: 10,
  },
  exerciciosTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
    marginTop: 5,
    marginBottom: 5,
  },
  exercicioItem: {
    fontSize: 14,
    color: COLORS.neutralGray,
    marginLeft: 10,
    marginBottom: 3,
  },
  treinoHora: {
    fontSize: 14,
    color: COLORS.neutralGray,
    fontStyle: 'italic',
    marginTop: 5,
  },
  treinoDuracao: {
    fontSize: 14,
    color: COLORS.darkPrimary,
    fontWeight: 'bold',
    marginTop: 5,
  },
  btnIniciar: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  btnIniciarText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  noTreinos: {
    fontSize: 16,
    color: COLORS.neutralGray,
    textAlign: 'center',
    marginTop: 20,
  },
  selecioneData: {
    fontSize: 16,
    color: COLORS.neutralGray,
    textAlign: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  // NOVOS ESTILOS PARA TREINO PERDIDO
  treinoPerdidoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE', // Fundo vermelho claro
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: STATUS_COLORS.missed,
  },
  treinoPerdidoText: {
    color: STATUS_COLORS.missed,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
});