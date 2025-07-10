import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO, isValid } from 'date-fns';
import { getUserIdLoggedIn } from '../../services/authService';

export default function HistoricoScreen() {
  const [historico, setHistorico] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        const userId = await getUserIdLoggedIn();
        if (!userId) {
          console.warn('Usuário não autenticado');
          return;
        }

        const chave = `treinosConcluidos_${userId}`;
        const dados = await AsyncStorage.getItem(chave);

        if (dados) {
          setHistorico(JSON.parse(dados));
          console.log('📥 Histórico carregado para:', chave);
        } else {
          setHistorico({});
          console.log('📭 Nenhum histórico encontrado para:', chave);
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarHistorico();
  }, []);

  const datasOrdenadas = Object.keys(historico)
    .filter((data) => isValid(parseISO(data)))
    .sort((a, b) => new Date(b) - new Date(a));

  const treinosFiltrados = datasOrdenadas.filter((data) => {
    const treino = historico[data];
    const dataObj = parseISO(data);

    const condicaoMes = !filtroMes || format(dataObj, 'yyyy-MM') === filtroMes;
    const condicaoCategoria =
      !filtroCategoria ||
      treino.categoria?.toLowerCase() === filtroCategoria.toLowerCase();

    return condicaoMes && condicaoCategoria;
  });

  const somarDuracoes = (treinos) => {
    let totalSegundos = 0;

    treinos.forEach((data) => {
      const duracao = historico[data]?.duracao;
      if (duracao) {
        const [min, seg] = duracao.split(':').map(Number);
        totalSegundos += min * 60 + seg;
      }
    });

    const totalMin = Math.floor(totalSegundos / 60);
    const totalSeg = totalSegundos % 60;

    return `${totalMin.toString().padStart(2, '0')}:${totalSeg
      .toString()
      .padStart(2, '0')}`;
  };

  const totalTreinos = treinosFiltrados.length;
  const tempoTotal = somarDuracoes(treinosFiltrados);

  const mesesDisponiveis = [
    ...new Set(datasOrdenadas.map((data) => format(parseISO(data), 'yyyy-MM'))),
  ];

  const categoriasDisponiveis = [
    ...new Set(
      datasOrdenadas.map((data) => historico[data].categoria).filter(Boolean)
    ),
  ];

  const getCategoriaColor = (categoria) => {
    switch (categoria?.toLowerCase()) {
      case 'força':
        return '#7c3aed'; // roxo (mantive)
      case 'cardio':
        return '#10b981'; // verde (mantive)
      case 'flexibilidade':
        return '#f59e0b'; // amarelo (mantive)
      case 'hiit':
        return '#ef4444'; // vermelho (mantive)
      default:
        return '#d0a956'; // dourado substitui azul
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Histórico de Treinos</Text>

      {/* Estatísticas */}
      <View style={styles.estatisticasBox}>
        <View style={styles.estatisticaItem}>
          <Text style={styles.estatisticaIcon}>📅</Text>
          <Text style={styles.estatisticaTexto}>
            <Text style={styles.valor}>{totalTreinos}</Text> treinos concluídos
          </Text>
        </View>
        <View style={styles.estatisticaItem}>
          <Text style={styles.estatisticaIcon}>⏱️</Text>
          <Text style={styles.estatisticaTexto}>
            <Text style={styles.valor}>{tempoTotal}</Text> acumulado
          </Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtrosContainer}>
        <View style={styles.filtroBox}>
          <Text style={styles.filtroLabel}>Mês:</Text>
          <Picker
            selectedValue={filtroMes}
            onValueChange={(value) => setFiltroMes(value)}
            style={styles.picker}
            dropdownIconColor="#d0a956"
          >
            <Picker.Item label="Todos" value="" />
            {mesesDisponiveis.map((mes) => (
              <Picker.Item
                key={mes}
                label={format(parseISO(mes + '-01'), 'MMMM yyyy')}
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
            dropdownIconColor="#d0a956"
          >
            <Picker.Item label="Todas" value="" />
            {categoriasDisponiveis.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#d0a956" />}

      {!loading && treinosFiltrados.length === 0 && (
        <Text style={styles.semDados}>
          Nenhum treino encontrado com os filtros selecionados.
        </Text>
      )}

      {!loading &&
        treinosFiltrados.map((data) => {
          const treino = historico[data];
          const corCategoria = getCategoriaColor(treino.categoria);
          return (
            <View
              key={data}
              style={[styles.card, { borderLeftColor: corCategoria }]}
            >
              <Text style={styles.data}>{format(parseISO(data), 'dd/MM/yyyy')}</Text>
              <Text style={styles.nome}>{treino.nome || 'Treino sem nome'}</Text>
              <Text style={styles.categoria}>
                Categoria: {treino.categoria || 'N/A'}
              </Text>
              <Text style={styles.descricao}>{treino.descricao || 'Sem descrição'}</Text>
              <Text style={styles.duracao}>Duração: {treino.duracao || '00:00'}</Text>

              {Array.isArray(treino.exercicios) && treino.exercicios.length > 0 && (
                <>
                  <Text style={styles.exerciciosTitulo}>Exercícios:</Text>
                  {treino.exercicios.map((ex, idx) => (
                    <Text key={idx} style={styles.exercicio}>
                      • {ex.nome} — {ex.tipo === 'reps' ? 'Repetições' : 'Tempo'}: {ex.valor}
                    </Text>
                  ))}
                </>
              )}
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#d0a956',
    marginBottom: 20,
    textAlign: 'center',
  },
  estatisticasBox: {
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: '#f2d88f',
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
    color: '#735c00',
  },
  valor: {
    fontWeight: 'bold',
    color: '#3f2e00',
  },
  filtrosContainer: {
    marginBottom: 20,
  },
  filtroBox: {
    marginBottom: 12,
  },
  filtroLabel: {
    fontWeight: '600',
    color: '#735c00',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#735c00',
  },
  semDados: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
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
    color: '#d0a956',
    marginBottom: 2,
  },
  nome: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4b3e00',
    marginBottom: 4,
  },
  categoria: {
    fontSize: 14,
    color: '#a38600',
    marginBottom: 4,
  },
  descricao: {
    fontSize: 14,
    color: '#7a6a00',
    marginBottom: 6,
  },
  duracao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b77900',
    marginBottom: 6,
  },
  exerciciosTitulo: {
    fontWeight: '600',
    color: '#5f4b00',
    marginTop: 6,
    marginBottom: 4,
  },
  exercicio: {
    marginLeft: 10,
    color: '#7a6a00',
    fontSize: 13,
  },
  exercicio: {
    marginLeft: 10,
    color: '#7a6a00',
    fontSize: 13,
    marginBottom: 2,
  },
});
