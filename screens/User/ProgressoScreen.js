import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  Platform, // Importado para Platform.OS
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign } from '@expo/vector-icons';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'; // Adicionado doc, getDoc
import { auth, db } from '../../services/firebaseConfig';
import Animated, { Layout, FadeIn, FadeOut } from 'react-native-reanimated';

const screenWidth = Dimensions.get('window').width - 32;

const categorias = {
  'Medidas Corporais': [
    { label: 'Peso', key: 'peso', suffix: 'kg' },
    { label: 'Altura', key: 'altura', suffix: 'm', decimals: 2 },
    { label: 'IMC', key: 'imc' },
    { label: 'Gordura Corporal', key: 'gorduraCorporal', suffix: '%' },
    { label: 'Musculatura', key: 'musculatura', suffix: '%' },
  ],
  Perímetros: [
    { label: 'Cintura', key: 'cintura', suffix: 'cm' },
    { label: 'Quadril', key: 'quadril', suffix: 'cm' },
    { label: 'Braço', key: 'braco', suffix: 'cm' },
    { label: 'Coxa', key: 'coxa', suffix: 'cm' },
    { label: 'Panturrilha', key: 'panturrilha', suffix: 'cm' },
    { label: 'Peito', key: 'peito', suffix: 'cm' },
  ],
  'Dobras Cutâneas': [
    { label: 'Tríceps', key: 'triceps', suffix: 'mm' },
    { label: 'Bíceps', key: 'biceps', suffix: 'mm' },
    { label: 'Subescapular', key: 'subescapular', suffix: 'mm' },
    { label: 'Suprailíaca', key: 'suprailíaca', suffix: 'mm' },
    { label: 'Abdominal', key: 'abdominal', suffix: 'mm' },
    { label: 'Coxa (dobra)', key: 'coxaDobra', suffix: 'mm' },
    { label: 'Panturrilha (dobra)', key: 'panturrilhaDobra', suffix: 'mm' },
  ],
};

const formatDate = (date) => new Date(date).toLocaleDateString();

// Altura da barra fixa do cabeçalho
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 90 : 80;

const ProgressoScreen = () => {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategorias, setExpandedCategorias] = useState({});
  const [userName, setUserName] = useState(''); // Estado para o nome do utilizador
  const [userInitial, setUserInitial] = useState(''); // Estado para a inicial do utilizador

  useEffect(() => {
    const fetchUserDataAndAvaliacoes = async () => {
      setLoading(true);
      try {
        // 1. Buscar dados do utilizador para o cabeçalho
        if (auth.currentUser) {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(userData.name || 'Utilizador');
            setUserInitial(userData.name ? userData.name.charAt(0).toUpperCase() : 'U');
          } else {
            setUserName('Utilizador');
            setUserInitial('U');
          }
        }

        // 2. Buscar avaliações
        const q = query(
          collection(db, 'avaliacoesFisicas'),
          where('clienteId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const dados = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          dados.push({
            id: doc.id,
            data: data.dataAvaliacao.toDate(),
            peso: data.peso,
            altura: data.altura,
            imc: data.imc,
            gorduraCorporal: data.outrosParametros?.gorduraCorporal,
            musculatura: data.outrosParametros?.musculatura,
            ...data.perimetros,
            ...data.dobrasCutaneas,
          });
        });

        setAvaliacoes(dados);
      } catch (error) {
        console.error('Erro ao buscar dados ou avaliações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndAvaliacoes();
  }, []);

  const avaliacoesProcessadas = useMemo(() => {
    return avaliacoes
      .filter((a) => a.data)
      .sort((a, b) => a.data - b.data);
  }, [avaliacoes]);

  const toggleCategoria = (cat) => {
    setExpandedCategorias((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const renderChart = (label, key, suffix = '', decimals = 1, avaliacoes) => {
    const pontosValidos = avaliacoes.filter(
      (item) => item[key] !== undefined && item[key] !== null
    );

    if (pontosValidos.length === 0) return null;

    const data = pontosValidos.map((item) => item[key]);
    const labels = pontosValidos.map((item) => formatDate(item.data));
    const ultimoValor = data[data.length - 1];

    const maxLabels = 5;
    const labelInterval = Math.ceil(labels.length / maxLabels);
    const reducedLabels = labels.filter((_, idx) => idx % labelInterval === 0);
    const reducedData = data.filter((_, idx) => idx % labelInterval === 0);

    return (
      <Animated.View
        key={key}
        entering={FadeIn.delay(100)}
        layout={Layout.springify()}
        style={styles.innerChartContainer}
      >
        <Text style={styles.chartLabel}>
          {label}: {ultimoValor?.toFixed(decimals)}{suffix}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{labels[0]}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>{labels[labels.length - 1]}</Text>
        </View>

        <LineChart
          data={{
            labels: reducedLabels,
            datasets: [{ data: reducedData }],
          }}
          width={screenWidth - 30}
          height={250}
          yAxisSuffix={suffix}
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: decimals,
            color: (opacity = 1) => `rgba(208, 169, 86, ${opacity})`,
            labelColor: () => '#1f2937',
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#d0a956',
            },
            propsForBackgroundLines: {
              stroke: '#e5e7eb',
            },
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={styles.chart}
        />
      </Animated.View>
    );
  };

  const CategoriaSection = ({ categoria, itens, expanded, toggle, avaliacoes }) => {
    const hasData = itens.some(({ key }) =>
      avaliacoes.some((a) => a[key] !== undefined && a[key] !== null)
    );
    if (!hasData) return null;

    return (
      <View style={styles.categoryContainer} key={categoria}>
        <TouchableOpacity
          onPress={() => toggle(categoria)}
          style={styles.categoryHeader}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryTitle}>{categoria}</Text>
          <AntDesign
            name={expanded ? 'up' : 'down'}
            size={22}
            color="#d0a956"
          />
        </TouchableOpacity>

        {expanded && (
          <Animated.View
            layout={Layout.springify()}
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.categoryContent}
          >
            {itens.map(({ label, key, suffix, decimals }) =>
              renderChart(label, key, suffix, decimals, avaliacoes)
            )}
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.fullScreenContainer}>
      {/* Cabeçalho Fixo (Barra Fixa) */}
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
        <Text style={styles.title}>Progresso Físico</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#d0a956" style={{ marginTop: 40 }} />
        ) : avaliacoesProcessadas.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
            Nenhuma avaliação disponível.
          </Text>
        ) : (
          Object.entries(categorias).map(([categoria, itens]) => (
            <CategoriaSection
              key={categoria}
              categoria={categoria}
              itens={itens}
              expanded={expandedCategorias[categoria]}
              toggle={toggleCategoria}
              avaliacoes={avaliacoesProcessadas}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  // ESTILO DA BARRA FIXA
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20, // Ajuste para Android para status bar
    backgroundColor: '#d4ac54', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15, // Arredondamento nas bordas inferiores
    borderBottomRightRadius: 15,
    elevation: 5, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10, // Garante que fique acima do conteúdo que rola
  },
  headerUserInfo: { // Estilo para agrupar avatar e nome do user
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: { // Estilo para o avatar na barra fixa
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { // Estilo para o texto do avatar na barra fixa
    color: '#d4ac54',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserName: { // Estilo para o nome do user na barra fixa
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerAppName: { // Estilo para o nome da app na barra fixa
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff', // Cor do texto da app
  },
  // Ajuste para o conteúdo da ScrollView para começar abaixo do cabeçalho fixo
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Mantenha o paddingBottom original
    backgroundColor: '#f9fafb',
    paddingTop: FIXED_HEADER_HEIGHT + 20, // Adiciona padding para o cabeçalho fixo + um pouco mais
  },
  container: { // O estilo 'container' original foi ajustado para ser o contentContainerStyle da ScrollView
    // padding: 20, // Já definido em scrollViewContent
    // paddingBottom: 60, // Já definido em scrollViewContent
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
    textAlign: 'center',
    marginTop: 0, // Removido marginTop extra, já que paddingTop do scrollViewContent já lida com isso
  },
  categoryContainer: {
    marginBottom: 28,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 22,
    color: '#000',
  },
  categoryContent: {
    marginTop: 16,
  },
  innerChartContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  chartLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: '#000',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 20,
  },
});

export default ProgressoScreen;
