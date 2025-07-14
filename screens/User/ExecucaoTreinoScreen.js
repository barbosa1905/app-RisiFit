// screens/ExecucaoTreinoScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
import { salvarTreinoConcluido } from '../../services/userService';

export default function ExecucaoTreinoScreen({ route, navigation }) {
  const { treino } = route.params;
  const [tempo, setTempo] = useState(0);
  const [emExecucao, setEmExecucao] = useState(false);
  const timerRef = useRef(null);

  // --- Adicionado para Depuração: Verificação de Tipos de Dados ---
  useEffect(() => {
    console.log('--- Dados do Treino em ExecucaoTreinoScreen ---');
    console.log('Objeto treino completo:', treino);
    console.log('Tipo de treino.nome:', typeof treino.nome, 'Valor:', treino.nome);
    console.log('Tipo de treino.categoria:', typeof treino.categoria, 'Valor:', treino.categoria);
    console.log('Tipo de treino.descricao:', typeof treino.descricao, 'Valor:', treino.descricao);

    if (treino.exercicios && Array.isArray(treino.exercicios)) {
      treino.exercicios.forEach((ex, idx) => {
        console.log(`Exercício ${idx} - Objeto completo:`, ex);
        console.log(`Exercício ${idx} - Tipo de ex.nome:`, typeof ex.nome, 'Valor:', ex.nome);
        console.log(`Exercício ${idx} - Tipo de ex.tipo:`, typeof ex.tipo, 'Valor:', ex.tipo);
        console.log(`Exercício ${idx} - Tipo de ex.valor:`, typeof ex.valor, 'Valor:', ex.valor);
      });
    } else {
      console.warn('treino.exercicios não é um array ou está vazio:', treino.exercicios);
    }
    console.log('-------------------------------------------');
  }, [treino]);

  useEffect(() => {
    if (emExecucao) {
      timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [emExecucao]);

  const formatarTempo = (totalSegundos) => {
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;

    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(horas)}:${pad(min)}:${pad(seg)}`;
  };

  const iniciarTreino = () => {
    setEmExecucao(true);
  };

  const pausarTreino = () => {
    setEmExecucao(false);
  };

  const resetarTreino = () => {
    setEmExecucao(false);
    setTempo(0);
  };

  const concluirTreino = async () => {
    pausarTreino();

    Alert.alert(
      'Concluir Treino',
      `Deseja realmente concluir o treino "${String(treino.nome)}" com duração de ${formatarTempo(tempo)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => iniciarTreino(),
        },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              const userId = await getUserIdLoggedIn();
              if (!userId) {
                Alert.alert('Erro', 'Utilizador não autenticado.');
                return;
              }

              const chaveAsyncStorage = `treinosConcluidos_${userId}`;
              const dadosAtuaisJson = await AsyncStorage.getItem(chaveAsyncStorage);
              const dadosAtuais = dadosAtuaisJson ? JSON.parse(dadosAtuaisJson) : {};
              dadosAtuais[String(treino.data).split('T')[0]] = true;
              await AsyncStorage.setItem(chaveAsyncStorage, JSON.stringify(dadosAtuais));

              await salvarTreinoConcluido(
                userId,
                treino.id,
                String(treino.nome),
                String(treino.data),
                tempo
              );

              Alert.alert('Sucesso', 'Treino concluído e registado!');
              navigation.goBack();
            } catch (error) {
              console.error('Erro ao salvar treino concluído:', error);
              Alert.alert('Erro', 'Não foi possível registar o treino. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{String(treino.nome)}</Text>
      <Text style={styles.subtitulo}>{String(treino.categoria)}</Text>
      <Text style={styles.descricao}>{String(treino.descricao)}</Text>

      <View style={styles.tempoContainer}>
        <Text style={styles.tempo}>{formatarTempo(tempo)}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.botao,
              styles.botaoIniciar,
              emExecucao && styles.botaoDesabilitado,
            ]}
            onPress={iniciarTreino}
            disabled={emExecucao}
          >
            <Text style={styles.botaoTexto}>Iniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.botao,
              styles.botaoPausar,
              !emExecucao && styles.botaoDesabilitado,
            ]}
            onPress={pausarTreino}
            disabled={!emExecucao}
          >
            <Text style={styles.botaoTexto}>Pausar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botao, styles.botaoResetar]}
            onPress={resetarTreino}
          >
            <Text style={styles.botaoTexto}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.exerciciosTitulo}>Exercícios</Text>

      {treino.exercicios && treino.exercicios.length > 0 ? (
        treino.exercicios.map((ex, idx) => (
          <View key={idx} style={styles.exercicioCard}>
            <Text style={styles.exercicioNome}>{String(ex.nome)}</Text>
            <Text style={styles.exercicioTipo}>
              {ex.tipo === 'reps'
                ? `${String(ex.valor)} repetições`
                : `${String(ex.valor)} segundos`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.semExercicios}>Nenhum exercício cadastrado.</Text>
      )}

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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 3,
    minWidth: 100,
    alignItems: 'center',
  },
  botaoIniciar: {
    backgroundColor: '#2563eb',
  },
  botaoPausar: {
    backgroundColor: '#f87171',
  },
  botaoResetar: {
    backgroundColor: '#64748b',
  },
  botaoDesabilitado: {
    opacity: 0.5,
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
