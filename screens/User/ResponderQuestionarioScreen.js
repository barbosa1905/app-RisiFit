import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { getUserIdLoggedIn } from '../../services/authService';

const COLORS = {
  primary: '#FBBF24',
  background: '#F9FAFB',
  card: '#FFFFFF',
  textDark: '#1F2937',
  textMedium: '#4B5563',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  selected: '#D1FAE5',
};

export default function ResponderQuestionarioScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { questionarioId } = route.params;

  const [questionario, setQuestionario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respostas, setRespostas] = useState({});
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const uid = await getUserIdLoggedIn();
        if (!uid) throw new Error('Usuário não autenticado');
        setUserId(uid);

        const docRef = doc(db, 'questionarios', questionarioId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setQuestionario(data);
        } else {
          Alert.alert('Erro', 'Questionário não encontrado.');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Erro ao carregar questionário:', error);
        Alert.alert('Erro', 'Não foi possível carregar o questionário.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleChangeResposta = (perguntaId, valor, tipo) => {
    setRespostas((prev) => {
      if (tipo === 'multipla') {
        const atual = prev[perguntaId] || [];
        if (atual.includes(valor)) {
          return {
            ...prev,
            [perguntaId]: atual.filter((v) => v !== valor),
          };
        } else {
          return {
            ...prev,
            [perguntaId]: [...atual, valor],
          };
        }
      } else {
        return {
          ...prev,
          [perguntaId]: valor,
        };
      }
    });
  };

 const handleSubmit = async () => {
  if (!questionario || !questionario.perguntas) return;

  // Validar se todas foram respondidas
  for (const pergunta of questionario.perguntas) {
    const resposta = respostas[pergunta.id];
    const estaVazia =
      resposta === undefined ||
      (typeof resposta === 'string' && resposta.trim() === '') ||
      (Array.isArray(resposta) && resposta.length === 0);

    if (estaVazia) {
      Alert.alert('Atenção', 'Responda todas as perguntas antes de enviar.');
      return;
    }
  }

  try {
    // Montar respostas detalhadas com pergunta + resposta
    const respostasDetalhadas = questionario.perguntas.map((pergunta) => ({
      pergunta: pergunta.texto,
      resposta: respostas[pergunta.id],
    }));

    await addDoc(collection(db, 'respostasQuestionarios'), {
      userId,
      questionarioId,
      nomeQuestionario: questionario.titulo || 'Sem nome',
      respostasDetalhadas,
      timestamp: new Date(),
    });

    Alert.alert('Sucesso', 'Respostas enviadas com sucesso!', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  } catch (error) {
    console.error('Erro ao enviar respostas:', error);
    Alert.alert('Erro', 'Não foi possível enviar suas respostas.');
  }
};


  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando questionário...</Text>
      </View>
    );
  }

  if (!questionario) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Questionário não encontrado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{questionario.nome}</Text>
        {questionario.descricao && (
          <Text style={styles.descricao}>{questionario.descricao}</Text>
        )}

        {questionario.perguntas?.map((pergunta) => (
          <View key={pergunta.id} style={styles.perguntaContainer}>
            <Text style={styles.perguntaTexto}>{pergunta.texto}</Text>

            {/* Perguntas de texto */}
            {pergunta.tipo === 'texto' && (
              <TextInput
                style={styles.inputTexto}
                placeholder="Digite sua resposta"
                value={respostas[pergunta.id] || ''}
                onChangeText={(texto) =>
                  handleChangeResposta(pergunta.id, texto, 'texto')
                }
                multiline
              />
            )}

            {/* Perguntas de opção única ou múltipla */}
            {(pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') &&
              pergunta.opcoes?.map((opcao) => {
                const selecionado =
                  pergunta.tipo === 'multipla'
                    ? (respostas[pergunta.id] || []).includes(opcao.texto)
                    : respostas[pergunta.id] === opcao.texto;

                return (
                  <TouchableOpacity
                    key={opcao.id}
                    style={[
                      styles.opcaoButton,
                      selecionado && styles.opcaoSelecionada,
                    ]}
                    onPress={() =>
                      handleChangeResposta(
                        pergunta.id,
                        opcao.texto,
                        pergunta.tipo
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.opcaoTexto,
                        selecionado && styles.opcaoTextoSelecionado,
                      ]}
                    >
                      {opcao.texto}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        ))}

        <TouchableOpacity style={styles.enviarButton} onPress={handleSubmit}>
          <Text style={styles.enviarTexto}>Enviar Respostas</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  descricao: {
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 20,
  },
  perguntaContainer: {
    marginBottom: 25,
  },
  perguntaTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  inputTexto: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  opcaoButton: {
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  opcaoSelecionada: {
    backgroundColor: COLORS.selected,
    borderColor: COLORS.primary,
  },
  opcaoTexto: {
    fontSize: 16,
    color: COLORS.textMedium,
  },
  opcaoTextoSelecionado: {
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  enviarButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  enviarTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMedium,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.error,
  },
});
