import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { AntDesign } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
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

const ProgressoScreen = () => {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategorias, setExpandedCategorias] = useState({});

  useEffect(() => {
    const fetchAvaliacoes = async () => {
      setLoading(true);
      try {
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
        console.error('Erro ao buscar avaliações:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacoes();
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
    <ScrollView contentContainerStyle={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
    textAlign: 'center',
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
