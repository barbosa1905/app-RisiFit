import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions, // Importar Dimensions para o gráfico
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { format, parse, isValid, parseISO, isPast, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Importação do react-native-chart-kit
import { PieChart } from 'react-native-chart-kit';

// Importações do Firebase
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getUserIdLoggedIn } from '../../services/authService';
import { auth } from '../../services/firebaseConfig';
import { buscarTodosTreinosDoUser } from '../../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Altura da barra fixa do cabeçalho
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 90 : 80;

// Novas cores
const COLORS = {
  primary: '#d4ac54',        // color1
  lightPrimary: '#e0c892',   // color2
  darkPrimary: '#69511a',    // color3
  neutralGray: '#767676',    // color4
  lightGray: '#bdbdbd',      // color5
  white: '#fff',
  black: '#1a1a1a',
  background: '#f9fafb',
  cardBackground: '#ffffff',
  borderLight: '#e5e7eb',
  textLight: '#6b7280',
  textDark: '#4b3e00',
  pickerText: '#735c00',
  pickerBackground: '#fff',
  force: '#7c3aed',
  cardio: '#10b981',
  flexibility: '#f59e0b',
  hiit: '#ef4444',
  completedGreen: '#4CAF50', // Verde para concluído
  missedRed: '#FF5252',      // Vermelho para perdido
};

const screenWidth = Dimensions.get('window').width;

export default function HistoricoScreen() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  const formatDuration = (totalSegundos) => {
    if (typeof totalSegundos !== 'number' || isNaN(totalSegundos) || totalSegundos < 0) return 'N/A';
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;

    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(horas)}:${pad(min)}:${pad(seg)}`;
  };

  const getTreinosConcluidosMap = async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return {};
      const chave = `treinosConcluidos_${userId}`;
      const dados = await AsyncStorage.getItem(chave);
      let loadedRawData = dados ? JSON.parse(dados) : {};
      const processedConcluidos = {};
      for (const treinoId in loadedRawData) {
        const completionDetails = loadedRawData[treinoId];
        if (typeof completionDetails === 'object' && completionDetails !== null && 'completed' in completionDetails) {
          processedConcluidos[treinoId] = {
            completed: completionDetails.completed || false,
            duration: completionDetails.duration || 0,
            completionDate: completionDetails.completionDate || null,
          };
        }
      }
      return processedConcluidos;
    } catch (error) {
      console.error('Erro ao carregar treinos concluídos do AsyncStorage:', error);
      return {};
    }
  };

  useEffect(() => {
    const carregarHistoricoCompleto = async () => {
      setLoading(true);
      console.log('--- Iniciando carregamento do histórico completo ---');
      try {
        const userId = await getUserIdLoggedIn();
        if (!userId) {
          Alert.alert('Erro', 'Usuário não autenticado');
          setLoading(false);
          return;
        }

        const dbFirestore = getFirestore();
        if (auth.currentUser) {
          const userDocRef = doc(dbFirestore, 'users', auth.currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(userData.name || 'Utilizador');
            setUserInitial(userData.name ? userData.name.charAt(0).toUpperCase() : 'U');
          } else {
            setUserName('Utilizador');
            setUserInitial('U');
          }
        } else {
          setUserName('');
          setUserInitial('');
        }

        const allScheduledTreinos = await buscarTodosTreinosDoUser(userId);
        console.log('Todos os treinos agendados carregados:', allScheduledTreinos.length);

        const completedTreinosMap = await getTreinosConcluidosMap();
        console.log('Status de conclusão carregados do AsyncStorage:', Object.keys(completedTreinosMap).length);

        const now = new Date();
        const pastTreinos = [];

        allScheduledTreinos.forEach(treino => {
          const treinoDateTime = parseISO(treino.data);

          if (!isValid(treinoDateTime)) {
            console.warn(`⚠️ Data de treino inválida para parseISO: ${treino.data} (ID: ${treino.id})`);
            return;
          }

          if (isPast(treinoDateTime) || (isToday(treinoDateTime) && treinoDateTime < now)) {
            const completionDetails = completedTreinosMap[treino.id];
            const isConcluido = completionDetails?.completed || false;

            pastTreinos.push({
              id: treino.id,
              nome: treino.nome,
              categoria: treino.categoria,
              descricao: treino.descricao,
              dataOriginalAgendada: treino.data,
              dataConclusao: isConcluido ? (completionDetails.completionDate || treino.data) : treino.data,
              duracaoSegundos: isConcluido ? completionDetails.duration : 0,
              status: isConcluido ? 'concluido' : 'perdido',
              exercicios: treino.templateExercises || treino.customExercises || [],
            });
          }
        });

        pastTreinos.sort((a, b) => parseISO(b.dataConclusao).getTime() - parseISO(a.dataConclusao).getTime());

        setHistorico(pastTreinos);
        console.log('Histórico final de treinos passados (concluídos e perdidos):', pastTreinos.length);

      } catch (error) {
        console.error('❌ Erro ao carregar histórico completo:', error);
        Alert.alert('Erro', `Não foi possível carregar o histórico: ${error.message || 'Erro desconhecido.'}`);
      } finally {
        setLoading(false);
        console.log('--- Fim do carregamento do histórico completo ---');
      }
    };

    carregarHistoricoCompleto();
  }, [appId]);

  const treinosFiltrados = historico.filter((treino) => {
    if (!treino.dataConclusao || typeof treino.dataConclusao !== 'string') {
      return false;
    }
    const dataObj = parseISO(treino.dataConclusao);

    const condicaoMes = !filtroMes || format(dataObj, 'yyyy-MM') === filtroMes;
    const condicaoCategoria =
      !filtroCategoria ||
      String(treino.categoria || '').toLowerCase() === filtroCategoria.toLowerCase();

    return condicaoMes && condicaoCategoria;
  });

  const somarDuracoes = (treinosArray) => {
    let totalSegundos = 0;
    treinosArray.forEach((treino) => {
      if (treino.status === 'concluido' && typeof treino.duracaoSegundos === 'number' && !isNaN(treino.duracaoSegundos)) {
        totalSegundos += treino.duracaoSegundos;
      }
    });
    return formatDuration(totalSegundos);
  };

  const totalTreinosConcluidos = treinosFiltrados.filter(t => t.status === 'concluido').length;
  const totalTreinosPerdidos = treinosFiltrados.filter(t => t.status === 'perdido').length;
  const tempoTotalConcluido = somarDuracoes(treinosFiltrados.filter(t => t.status === 'concluido'));

  const mesesDisponiveis = [
    ...new Set(historico.map((treino) => format(parseISO(treino.dataConclusao), 'yyyy-MM'))),
  ].sort((a, b) => new Date(a) - new Date(b));

  const categoriasDisponiveis = [
    ...new Set(
      historico.map((treino) => treino.categoria).filter(Boolean)
    ),
  ].sort();

  const getCategoriaColor = (categoria) => {
    switch (String(categoria || '').toLowerCase()) {
      case 'força':
        return COLORS.force;
      case 'cardio':
        return COLORS.cardio;
      case 'flexibilidade':
        return COLORS.flexibility;
      case 'hiit':
        return COLORS.hiit;
      default:
        return COLORS.primary;
    }
  };

  const chartData = [
    {
      name: 'Concluídos',
      population: totalTreinosConcluidos,
      color: COLORS.completedGreen,
      legendFontColor: COLORS.darkPrimary,
      legendFontSize: 15,
    },
    {
      name: 'Perdidos',
      population: totalTreinosPerdidos,
      color: COLORS.missedRed,
      legendFontColor: COLORS.darkPrimary,
      legendFontSize: 15,
    },
  ];

  const chartConfig = {
    backgroundColor: COLORS.cardBackground,
    backgroundGradientFrom: COLORS.cardBackground,
    backgroundGradientTo: COLORS.cardBackground,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    decimalPlaces: 0,
    propsForLabels: {
      fontWeight: 'bold',
    },
  };

  return (
    <View style={styles.fullScreenContainer}>

      <View style={styles.fixedHeader}>
        <View style={styles.headerUserInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{userInitial}</Text>
          </View>
          <Text style={styles.headerUserName}>{userName}</Text>
        </View>
        <Text style={styles.headerAppName}>RisiFit</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.title}>Histórico de Treinos</Text>

        <View style={styles.estatisticasBox}>
          <View style={styles.estatisticaItem}>
            <Text style={styles.estatisticaIcon}>📅</Text>
            <Text style={styles.estatisticaTexto}>
              <Text style={styles.valor}>{totalTreinosConcluidos}</Text> treinos concluídos
            </Text>
          </View>
          <View style={styles.estatisticaItem}>
            <Text style={styles.estatisticaIcon}>⏱️</Text>
            <Text style={styles.estatisticaTexto}>
              <Text style={styles.valor}>{tempoTotalConcluido}</Text> acumulado
            </Text>
          </View>
        </View>

        {/* Gráfico de Treinos Concluídos vs. Perdidos */}
        {!loading && (totalTreinosConcluidos > 0 || totalTreinosPerdidos > 0) ? (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Visão Geral dos Treinos</Text>
            <PieChart
              data={chartData}
              width={screenWidth - 40} // Largura da tela menos o padding
              height={150} // Altura ajustada
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]} // Ajuste para centralizar o gráfico
              absolute // Exibe os valores absolutos na legenda
            />
          </View>
        ) : !loading && (
          <Text style={styles.semDadosChart}>
            Não há dados de treinos concluídos ou perdidos para exibir no gráfico.
          </Text>
        )}

        <View style={styles.filtrosContainer}>
          <View style={styles.filtroBox}>
            <Text style={styles.filtroLabel}>Mês:</Text>
            <Picker
              selectedValue={filtroMes}
              onValueChange={(value) => setFiltroMes(value)}
              style={styles.picker}
              dropdownIconColor={COLORS.primary}
            >
              <Picker.Item label="Todos" value="" />
              {mesesDisponiveis.map((mes) => (
                <Picker.Item
                  key={mes}
                  label={format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: pt })}
                  value={mes}
                />
              ))}
            </Picker>
          </View>

          <View style={styles.filtroBox}>
            <Text style={styles.filtroLabel}>Categoria:</Text>
            <Picker
              selectedValue={filtroCategoria}
              onValueChange={(value) => setFiltroCategoria(value)}
              style={styles.picker}
              dropdownIconColor={COLORS.primary}
            >
              <Picker.Item label="Todas" value="" />
              {categoriasDisponiveis.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>
        </View>

        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}

        {!loading && treinosFiltrados.length === 0 && (
          <Text style={styles.semDados}>
            Nenhum treino encontrado com os filtros selecionados.
          </Text>
        )}

        {!loading &&
          treinosFiltrados.map((treino) => {
            const corCategoria = getCategoriaColor(treino.categoria);
            const isConcluido = treino.status === 'concluido';
            const isPerdido = treino.status === 'perdido';

            return (
              <View
                key={treino.id}
                style={[
                  styles.card,
                  { borderLeftColor: isConcluido ? COLORS.completedGreen : COLORS.missedRed },
                ]}
              >
                <Text style={styles.data}>{format(parseISO(treino.dataConclusao), 'dd/MM/yyyy HH:mm')}</Text>
                <Text style={[styles.nome, isPerdido && styles.nomePerdido]}>
                  {String(treino.nome || treino.nomeTreino)}
                  {isPerdido && (
                    <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.missedRed} style={{ marginLeft: 5 }} />
                  )}
                </Text>
                <Text style={styles.categoria}>
                  Categoria: {String(treino.categoria || 'N/A')}
                </Text>
                <Text style={styles.descricao}>{String(treino.descricao || 'Sem descrição')}</Text>

                {isConcluido && (
                  <Text style={styles.duracao}>Duração: {formatDuration(treino.duracaoSegundos)}</Text>
                )}
                {isPerdido && (
                  <Text style={styles.statusPerdido}>Status: Perdido</Text>
                )}
              </View>
            );
          })}
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
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10,
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
    color: COLORS.primary,
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
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    backgroundColor: COLORS.background,
    paddingTop: FIXED_HEADER_HEIGHT + 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 0,
  },
  estatisticasBox: {
    backgroundColor: COLORS.lightPrimary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  estatisticaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  estatisticaIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  estatisticaTexto: {
    fontSize: 16,
    color: COLORS.darkPrimary,
  },
  valor: {
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
  },
  chartContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16, // Tamanho da fonte ajustado
    fontWeight: 'bold',
    color: COLORS.darkPrimary,
    marginBottom: 8, // Margem inferior ajustada
  },
  semDadosChart: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: COLORS.neutralGray,
    marginTop: 10,
    marginBottom: 20,
  },
  filtrosContainer: {
    marginBottom: 20,
  },
  filtroBox: {
    marginBottom: 12,
  },
  filtroLabel: {
    fontWeight: '600',
    color: COLORS.darkPrimary,
    marginBottom: 4,
  },
  picker: {
    backgroundColor: COLORS.pickerBackground,
    borderRadius: 8,
    color: COLORS.pickerText,
  },
  semDados: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: COLORS.neutralGray,
    marginTop: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  data: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 2,
  },
  nome: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkPrimary,
    marginBottom: 4,
  },
  nomePerdido: {
    color: COLORS.missedRed,
  },
  categoria: {
    fontSize: 14,
    color: COLORS.darkPrimary,
    marginBottom: 4,
  },
  descricao: {
    fontSize: 14,
    color: COLORS.neutralGray,
    marginBottom: 6,
  },
  duracao: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.darkPrimary,
    marginBottom: 6,
  },
  statusPerdido: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.missedRed,
    marginBottom: 6,
  },
  exerciciosTitulo: {
    fontWeight: '600',
    color: COLORS.darkPrimary,
    marginTop: 6,
    marginBottom: 4,
  },
  exercicio: {
    marginLeft: 10,
    color: COLORS.neutralGray,
    fontSize: 13,
    marginBottom: 2,
  },
});
