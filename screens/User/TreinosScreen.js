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
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import {
  buscarTreinosDoUser,
  buscarAvaliacoesAgendaDoUser,
  // buscarTreinosConcluidosDoUser, // <-- Removido, não é necessário para AsyncStorage
} from '../../services/userService';
import { format, parseISO } from 'date-fns';
import { getUserIdLoggedIn } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- Re-importado
import { ThemeContext } from '../ThemeContext'; 

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
    <Animated.View style={{ opacity: fadeCheck, marginLeft: 6 }}>
      <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
    </Animated.View>
  );
};

export default function TreinosScreen() {
  const [treinos, setTreinos] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState('');
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [avaliacoesDoDia, setAvaliacoesDoDia] = useState([]);
  const [loading, setLoading] = useState(false);
  // Revertido para usar um objeto simples para chaves de data (YYYY-MM-DD)
  const [treinosConcluidos, setTreinosConcluidos] = useState({}); 
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const [fraseMotivacional, setFraseMotivacional] = useState('');
  const { colors, toggleTheme, theme } = useContext(ThemeContext);

  // Esta função agora busca do AsyncStorage
  const carregarTreinosConcluidos = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return;

      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      setTreinosConcluidos(dados ? JSON.parse(dados) : {});
      console.log('✅ Treinos concluídos carregados do AsyncStorage.');
    } catch (error) {
      console.error('Erro ao carregar treinos concluídos do AsyncStorage:', error);
      Alert.alert('Erro', 'Falha ao carregar histórico de treinos concluídos.');
    }
  };

  // Use useFocusEffect para recarregar todos os dados quando a tela for focada
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

          // Carrega treinos e avaliações em paralelo
          const [treinosCarregados, avaliacoesCarregadas] = await Promise.all([
            buscarTreinosDoUser(userId),
            buscarAvaliacoesAgendaDoUser(userId)
          ]);

          setTreinos(treinosCarregados);
          setAvaliacoes(avaliacoesCarregadas);
          await carregarTreinosConcluidos(); // Carrega do AsyncStorage

          console.log('✅ Todos os dados recarregados com sucesso.');

        } catch (error) {
          console.error('❌ ERRO NO RECARREGAMENTO DE DADOS (useFocusEffect):', error);
          Alert.alert('Erro', `Não foi possível recarregar os dados: ${error.message || 'Erro desconhecido.'}`);
        } finally {
          setLoading(false);
          console.log('--- Fim do Recarregamento de Dados do Utilizador ---');
        }
      }
      reloadAllData();
    }, []) // Array de dependências vazio para executar apenas quando a tela for focada
  );

  useEffect(() => {
    const indexAleatorio = Math.floor(Math.random() * frasesMotivacionais.length);
    setFraseMotivacional(frasesMotivacionais[indexAleatorio]);
  }, []);

  useEffect(() => {
    const marcacoes = {};

    // Marcação de Treinos
    treinos.forEach((treino) => {
      if (typeof treino.data === 'string' && treino.data.includes('T')) {
        const dataStr = treino.data.split('T')[0]; // Pega apenas a parte da data (YYYY-MM-DD)
        // Usa o estado 'treinosConcluidos' do AsyncStorage
        const isConcluido = Boolean(treinosConcluidos[dataStr]); 

        marcacoes[dataStr] = {
          ...marcacoes[dataStr], 
          customStyles: {
            container: {
              backgroundColor: isConcluido ? '#d1fae5' : '#e0e7ff', 
              borderRadius: 8,
              ...marcacoes[dataStr]?.customStyles?.container
            },
            text: {
              color: isConcluido ? '#065f46' : '#1e3a8a', 
              fontWeight: 'bold',
              ...marcacoes[dataStr]?.customStyles?.text
            },
          },
        };
      }
    });

    // Marcação de Avaliações
    avaliacoes.forEach((avaliacao) => {
      if (avaliacao.data && typeof avaliacao.data === 'string') {
        const dataStr = avaliacao.data;
        marcacoes[dataStr] = {
          ...marcacoes[dataStr], 
          customStyles: {
            container: {
              backgroundColor: '#fde68a', 
              borderRadius: 8,
              ...marcacoes[dataStr]?.customStyles?.container 
            },
            text: {
              color: '#92400e', 
              fontWeight: 'bold',
              ...marcacoes[dataStr]?.customStyles?.text 
            },
          },
        };
      }
    });

    // Marcação da data selecionada (sobrepõe as outras para destaque)
    if (selectedDate) {
      marcacoes[selectedDate] = {
        ...marcacoes[selectedDate], 
        customStyles: {
          container: { 
            backgroundColor: '#facc15', 
            borderRadius: 8,
            ...marcacoes[selectedDate]?.customStyles?.container 
          },
          text: { 
            color: '#78350f', 
            fontWeight: 'bold',
            ...marcacoes[selectedDate]?.customStyles?.text 
          },
        },
      };
    }

    setMarkedDates(marcacoes);
  }, [treinos, treinosConcluidos, avaliacoes, selectedDate]); // Depende de treinosConcluidos

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
          <MaterialCommunityIcons name="weight-lifter" size={24} color="#d0a956" />
        );
      case 'cardio':
        return <MaterialCommunityIcons name="heart-pulse" size={24} color="#d0a956" />;
      case 'flexibilidade':
        return <MaterialCommunityIcons name="yoga" size={24} color="#d0a956" />;
      case 'hiit':
        return <MaterialCommunityIcons name="flash" size={24} color="#d0a956" />;
      default:
        return <MaterialCommunityIcons name="run" size={24} color="#d0a956" />;
    }
  };

  // Função auxiliar para formatar a duração em hh:mm:ss (ainda pode ser útil para exibição)
  const formatDuration = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return 'N/A';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0) 
      .join(':');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} bounces>
      <Text style={styles.title}>Meus Treinos</Text>

      <Text style={styles.fraseMotivacional}>{fraseMotivacional}</Text>

      {/* BARRA DE PROGRESSO DE TREINOS CONCLUÍDOS */}
      <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontWeight: '700', marginBottom: 8, color: '#333', fontSize: 16 }}>
          Treinos concluídos: {Object.keys(treinosConcluidos).length} / {treinos.length}
        </Text>

        <View
          style={{
            height: 20,
            backgroundColor: '#222',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#d0a956',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.7,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <View
            style={{
              height: '100%',
              backgroundColor: '#fbbf24',
              width:
                treinos.length > 0
                  ? `${((Object.keys(treinosConcluidos).length / treinos.length) * 100).toFixed(0)}%`
                  : '0%',
              borderRadius: 12,
            }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#d0a956" style={{ marginVertical: 20 }} />
      ) : (
        <>
          <Calendar
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType={'custom'}
            theme={{
              selectedDayBackgroundColor: '#d0a956',
              todayTextColor: '#d0a956',
              arrowColor: '#d0a956',
              textSectionTitleColor: '#000',
              monthTextColor: '#000',
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
                  // Agora verificamos pelo ID do treino e pela data original
                  // treinosConcluidos agora usa a data formatada como chave
                  const isConcluido = Boolean(treinosConcluidos[treino.data.split('T')[0]]);
                  // Se a duração era guardada no AsyncStorage, teria que ser recuperada daqui.
                  // Como a sua versão antiga do AsyncStorage guardava apenas um boolean, não temos duração.
                  // Se precisar, teremos que ajustar o formato no AsyncStorage.
                  const duracaoTreino = null; // Não disponível se AsyncStorage só guarda boolean

                  return (
                    <View key={treino.id} style={[styles.treinoBox, isConcluido && styles.treinoConcluidoBox]}>
                      <View style={styles.treinoHeader}>
                        {getIconByCategoria(treino.categoria)}
                        <Text style={[styles.treinoNome, isConcluido && styles.treinoNomeConcluido]}>
                          {treino.nome}{' '}
                          {isConcluido && (
                            <AnimatedCheckIcon />
                          )}
                        </Text>
                      </View>
                      <Text style={styles.treinoCategoria}>
                        Categoria: {treino.categoria}
                      </Text>
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

                      <Text style={styles.treinoHora}>
                        Hora:{' '}
                        {new Date(treino.data).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>

                      {isConcluido && duracaoTreino && ( // A duração não estará disponível com seu formato antigo de AsyncStorage
                        <Text style={styles.treinoDuracao}>
                          Duração: {formatDuration(duracaoTreino)}
                        </Text>
                      )}

                      {/* O botão "Iniciar Treino" só aparece se o treino NÃO estiver concluído */}
                      {!isConcluido && (
                        <TouchableOpacity
                          style={styles.btnIniciar}
                          // IMPORTANTE: Nome da tela de navegação consistente
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
                    style={[styles.treinoBox, { borderColor: '#fbbf24' }]}
                  >
                    <Text style={[styles.treinoNome, { color: '#92400e' }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
    paddingBottom: 50,
    minHeight: '100%',
  },
  calendar: {
    borderRadius: 8,
    elevation: 3,
    marginBottom: 25,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d0a956',
    marginBottom: 15,
    textAlign: 'center',
  },
  fraseMotivacional: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1e293b',
  },
  noTreinos: {
    fontStyle: 'italic',
    color: '#6b7280',
    textAlign: 'center',
  },
  selecioneData: {
    textAlign: 'center',
    fontSize: 16,
    color: '#d0a956',
    marginTop: 30,
  },
  treinoBox: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 18,
    borderColor: '#000',
    borderWidth: 3,
  },
  treinoConcluidoBox: {
    borderColor: '#10b981', // Borda verde para treinos concluídos
    backgroundColor: '#e6ffe6', // Fundo mais claro para treinos concluídos
  },
  treinoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  treinoNome: {
    fontSize: 19,
    fontWeight: '700',
    marginLeft: 8,
    color: '#1e293b',
  },
  treinoNomeConcluido: {
    color: '#065f46', // Cor do texto para treinos concluídos
  },
  treinoCategoria: {
    fontWeight: '700',
    marginBottom: 4,
    color: '#6b7280',
  },
  treinoDescricao: {
    fontSize: 15,
    marginBottom: 8,
    color: '#334155',
  },
  exerciciosTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 5,
    color: '#444',
  },
  exercicioItem: {
    fontSize: 15,
    marginLeft: 6,
    marginBottom: 3,
    color: '#475569',
  },
  treinoHora: {
    fontSize: 14,
    color: '#334155',
    marginTop: 5,
  },
  treinoDuracao: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065f46',
    marginTop: 5,
  },
  btnIniciar: {
    backgroundColor: '#d0a956',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  btnIniciarText: {
    textAlign: 'center',
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 16,
  },
  btnLimpar: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  btnLimparText: {
    color: '#d0a956',
    fontWeight: '600',
    fontSize: 16,
  },
});