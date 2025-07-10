import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdLoggedIn } from '../../services/authService';
export default function ExecucaoTreinoScreen({ route, navigation }) {
  const { treino } = route.params;
  const [tempo, setTempo] = useState(0);
  const [emExecucao, setEmExecucao] = useState(false);

  useEffect(() => {
    let timer;
    if (emExecucao) {
      timer = setInterval(() => setTempo((t) => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [emExecucao]);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

 const concluirTreino = async () => {
  setEmExecucao(false);

  try {
    const userId = await getUserIdLoggedIn();
    const dataTreino = treino.data?.split('T')[0];

    if (!userId || !dataTreino) {
      console.warn('❌ userId ou dataTreino está undefined');
      return;
    }

    const chave = `treinosConcluidos_${userId}`;
    const dadosSalvos = JSON.parse(await AsyncStorage.getItem(chave)) || {};

    dadosSalvos[dataTreino] = {
      nome: treino.nome,
      categoria: treino.categoria,
      descricao: treino.descricao,
      exercicios: treino.exercicios,
      duracao: formatarTempo(tempo),
    };

    await AsyncStorage.setItem(chave, JSON.stringify(dadosSalvos));

    console.log('✅ Treino salvo com sucesso!');
    console.log('🔑 Chave usada:', chave);
    console.log('📦 Conteúdo salvo:', dadosSalvos[dataTreino]);
  } catch (error) {
    console.error('Erro ao salvar treino concluído:', error);
  }

  Alert.alert('Treino concluído!', `Duração total: ${formatarTempo(tempo)}`, [
    {
      text: 'OK',
      onPress: () => navigation.goBack(),
    },
  ]);
};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{treino.nome}</Text>
      <Text style={styles.subtitulo}>{treino.categoria}</Text>
      <Text style={styles.descricao}>{treino.descricao}</Text>

      <View style={styles.tempoContainer}>
        <Text style={styles.tempo}>{formatarTempo(tempo)}</Text>

        <TouchableOpacity
          style={[
            styles.botao,
            { backgroundColor: emExecucao ? '#f87171' : '#2563eb' },
          ]}
          onPress={() => setEmExecucao(!emExecucao)}
        >
          <Text style={styles.botaoTexto}>
            {emExecucao ? 'Pausar' : 'Iniciar'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.exerciciosTitulo}>Exercícios</Text>

      {treino.exercicios && treino.exercicios.length > 0 ? (
        treino.exercicios.map((ex, idx) => (
          <View key={idx} style={styles.exercicioCard}>
            <Text style={styles.exercicioNome}>{ex.nome}</Text>
            <Text style={styles.exercicioTipo}>
              {ex.tipo === 'reps'
                ? `${ex.valor} repetições`
                : `${ex.valor} segundos`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.semExercicios}>Nenhum exercício cadastrado.</Text>
      )}

      {/* Botão de Concluir Treino */}
      <TouchableOpacity style={styles.botaoConcluir} onPress={concluirTreino}>
        <Text style={styles.botaoTexto}>Concluir Treino</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f1f5f9',
    flexGrow: 1,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 18,
    color: '#3b82f6',
    marginBottom: 4,
    textAlign: 'center',
  },
  descricao: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  tempoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  tempo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#eab308',
    marginBottom: 15,
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    elevation: 3,
  },
  botaoConcluir: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    elevation: 2,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciciosTitulo: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0f172a',
  },
  exercicioCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  exercicioNome: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
  },
  exercicioTipo: {
    fontSize: 15,
    color: '#475569',
    marginTop: 4,
  },
  semExercicios: {
    fontStyle: 'italic',
    color: '#6b7280',
    textAlign: 'center',
  },
});
