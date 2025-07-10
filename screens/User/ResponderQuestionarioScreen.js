import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { useRoute } from '@react-navigation/native';

export default function ResponderQuestionarioScreen() {
  const route = useRoute();
  const { questionarioId } = route.params;

  const [questionario, setQuestionario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [respostas, setRespostas] = useState({});

  useEffect(() => {
    const carregarQuestionario = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          setErrorMsg('Usuário não autenticado');
          setLoading(false);
          return;
        }

        const userSnap = await getDoc(doc(db, 'users', userId));
        if (!userSnap.exists()) {
          setErrorMsg('Usuário não encontrado');
          setLoading(false);
          return;
        }

        const adminId = userSnap.data().adminId;
        if (!adminId) {
          setErrorMsg('Admin associado ao usuário não encontrado');
          setLoading(false);
          return;
        }

        const respostasSnapshot = await getDocs(
          query(
            collection(db, 'users', userId, 'respostasQuestionarios'),
            where('questionarioId', '==', questionarioId)
          )
        );
        if (!respostasSnapshot.empty) {
          setJaRespondeu(true);
          setLoading(false);
          return;
        }

        const questionarioSnap = await getDoc(
          doc(db, 'admins', adminId, 'questionarios', questionarioId)
        );

        if (questionarioSnap.exists()) {
          const data = questionarioSnap.data();
          const perguntasComOpcoesSeguras = (data.perguntas || []).map((p) => ({
            ...p,
            opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
          }));
          setQuestionario(perguntasComOpcoesSeguras);
        } else {
          setErrorMsg('Questionário não encontrado');
        }
      } catch (error) {
        console.error(error);
        setErrorMsg('Erro ao carregar questionário');
      } finally {
        setLoading(false);
      }
    };

    carregarQuestionario();
  }, [questionarioId]);

  const handleChangeResposta = (perguntaId, valor, tipo) => {
    setRespostas((prev) => {
      if (tipo === 'multipla') {
        const respostasAtuais = prev[perguntaId] || [];
        if (respostasAtuais.includes(valor)) {
          return { ...prev, [perguntaId]: respostasAtuais.filter((v) => v !== valor) };
        } else {
          return { ...prev, [perguntaId]: [...respostasAtuais, valor] };
        }
      } else {
        return { ...prev, [perguntaId]: valor };
      }
    });
  };

  const handleEnviar = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    for (let pergunta of questionario) {
      const resposta = respostas[pergunta.id];
      if (
        resposta === undefined ||
        resposta === null ||
        (Array.isArray(resposta) && resposta.length === 0) ||
        (typeof resposta === 'string' && resposta.trim() === '')
      ) {
        Alert.alert('Atenção', `Por favor responda a pergunta: "${pergunta.pergunta}"`);
        return;
      }
    }

    try {
      setLoading(true);
      const respostasRef = doc(
        db,
        'users',
        userId,
        'respostasQuestionarios',
        `${questionarioId}Resposta`
      );
      await setDoc(respostasRef, {
        questionarioId,
        respostas,
        data: Timestamp.now(),
      });
      Alert.alert('Sucesso', 'Questionário enviado!');
      setJaRespondeu(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao enviar respostas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text>Carregando questionário...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{errorMsg}</Text>
      </View>
    );
  }

  if (jaRespondeu) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Você já respondeu a este questionário. Obrigado!</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Questionário</Text>

        {questionario.length > 0 ? (
          questionario.map((pergunta) => {
            const opcoes = Array.isArray(pergunta.opcoes) ? pergunta.opcoes : [];
            return (
              <View key={pergunta.id} style={styles.perguntaContainer}>
                <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>

                {pergunta.tipo === 'texto' && (
                  <TextInput
                    style={styles.input}
                    value={respostas[pergunta.id] || ''}
                    onChangeText={(text) => handleChangeResposta(pergunta.id, text, 'texto')}
                    placeholder="Digite sua resposta"
                  />
                )}

                {(pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') && opcoes.length > 0 ? (
                  opcoes.map((opcao) => {
                    const selecionado =
                      pergunta.tipo === 'multipla'
                        ? (respostas[pergunta.id] || []).includes(opcao)
                        : respostas[pergunta.id] === opcao;

                    return (
                      <TouchableOpacity
                        key={opcao}
                        style={[
                          styles.opcaoButton,
                          selecionado && styles.opcaoButtonSelected,
                        ]}
                        onPress={() => handleChangeResposta(pergunta.id, opcao, pergunta.tipo)}
                      >
                        <Text style={[styles.opcaoTexto, selecionado && { color: '#fff' }]}>
                          {opcao}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : pergunta.tipo !== 'texto' && (
                  <Text style={{ color: 'red' }}>
                    ⚠ Opções não encontradas para esta pergunta.
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text>Nenhuma pergunta disponível.</Text>
        )}

        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.enviarButton} onPress={handleEnviar}>
            <Text style={styles.enviarButtonText}>Enviar Respostas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fdfcf9',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#d0a956',
    textAlign: 'center',
  },
  perguntaContainer: {
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderColor: '#eee',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  perguntaTexto: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  opcaoButton: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 5,
    backgroundColor: '#fff',
  },
  opcaoButtonSelected: {
    backgroundColor: '#d0a956',
  },
  opcaoTexto: {
    color: '#d0a956',
    fontWeight: '600',
  },
  error: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
    color: '#2f855a',
  },
  buttonWrapper: {
    marginTop: 30,
    marginBottom: 50,
  },
  enviarButton: {
    backgroundColor: '#d0a956',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
