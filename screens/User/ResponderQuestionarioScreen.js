import React, { useEffect, useState, useCallback } from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { getUserIdLoggedIn } from '../../services/authService'; 

export default function ResponderQuestionarioScreen() {
  const route = useRoute();
  const navigation = useNavigation();
 
  const questionarioId = route.params?.questionarioId;

  const [questionario, setQuestionario] = useState(null); // Alterado para null, pois é um objeto
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [respostas, setRespostas] = useState({});
  const [userId, setUserId] = useState(null); // Estado para armazenar o userId logado

  // Efeito para obter o userId assim que o componente monta
  useEffect(() => {
    async function loadUserId() {
      const currentUserId = await getUserIdLoggedIn();
      setUserId(currentUserId);
      if (!currentUserId) {
        setErrorMsg('Usuário não autenticado.');
        setLoading(false);
      }
    }
    loadUserId();
  }, []);

  const carregarQuestionario = useCallback(async () => {
    if (!userId || !questionarioId) {
      // Espera o userId e questionarioId estarem disponíveis
      return;
    }

    setLoading(true);
    setErrorMsg(''); // Limpa mensagens de erro anteriores
    setJaRespondeu(false); // Reseta o status de respondido

    try {
      // 1. Verificar se o usuário já respondeu a este questionário
      const respostasQuery = query(
        collection(db, 'respostasQuestionarios'), // Coleção raiz para respostas
        where('questionarioId', '==', questionarioId),
        where('userId', '==', userId)
      );
      const respostasSnapshot = await getDocs(respostasQuery);
      if (!respostasSnapshot.empty) {
        setJaRespondeu(true);
        setLoading(false);
        return; // Sai da função se já respondeu
      }

      // 2. Carregar o questionário da coleção 'questionariosPublicos'
      const questionarioSnap = await getDoc(
        doc(db, 'questionariosPublicos', questionarioId) // Caminho corrigido
      );

      if (questionarioSnap.exists()) {
        const data = questionarioSnap.data();
        // Garante que 'perguntas' e 'opcoes' são arrays
        const perguntasComOpcoesSeguras = (data.perguntas || []).map((p) => ({
          ...p,
          opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
        }));
        setQuestionario({ id: questionarioSnap.id, ...data, perguntas: perguntasComOpcoesSeguras });
        
        // Inicializa as respostas para cada pergunta
        const initialRespostas = {};
        perguntasComOpcoesSeguras.forEach(pergunta => {
            if (pergunta.tipo === 'multipla') {
                initialRespostas[pergunta.id] = [];
            } else {
                initialRespostas[pergunta.id] = '';
            }
        });
        setRespostas(initialRespostas);

      } else {
        setErrorMsg('Questionário não encontrado.');
      }
    } catch (error) {
      console.error("Erro ao carregar questionário:", error);
      setErrorMsg('Erro ao carregar questionário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [userId, questionarioId]); // Dependências: recarrega se userId ou questionarioId mudar

  // Chama a função de carregamento quando userId ou questionarioId estiverem prontos
  useEffect(() => {
    carregarQuestionario();
  }, [carregarQuestionario]);


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
    if (!userId) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!questionario) {
      Alert.alert('Erro', 'Questionário não carregado.');
      return;
    }

    // Validação de todas as perguntas respondidas
    for (let pergunta of questionario.perguntas) {
      const resposta = respostas[pergunta.id];
      if (
        resposta === undefined ||
        resposta === null ||
        (Array.isArray(resposta) && resposta.length === 0) ||
        (typeof resposta === 'string' && resposta.trim() === '')
      ) {
        Alert.alert('Atenção', `Por favor, responda a pergunta: "${pergunta.pergunta}"`);
        return;
      }
    }

    setLoading(true);
    try {
      // Salva a resposta na coleção raiz 'respostasQuestionarios'
      // Usa um ID composto para garantir unicidade por usuário e questionário
      const respostaDocRef = doc(db, 'respostasQuestionarios', `${questionarioId}_${userId}`);
      await setDoc(respostaDocRef, {
        questionarioId: questionarioId,
        userId: userId,
        respostas: respostas,
        dataEnvio: Timestamp.now(),
      });
      
      Alert.alert('Sucesso', 'Questionário enviado com sucesso!');
      setJaRespondeu(true); // Marca como respondido
      navigation.goBack(); // Volta para a tela anterior (ListarQuestionariosUserScreen)

    } catch (error) {
      console.error("Erro ao enviar respostas:", error);
      Alert.alert('Erro', 'Falha ao enviar respostas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text style={styles.loadingText}>Carregando questionário...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (jaRespondeu) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Você já respondeu a este questionário. Obrigado!</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Se questionario é null (não encontrado ou erro)
  if (!questionario) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum questionário disponível ou encontrado.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // Ajuste o offset conforme necessário
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{questionario.nome || 'Questionário'}</Text> 
        {questionario.descricao && <Text style={styles.description}>{questionario.descricao}</Text>}

        {questionario.perguntas && questionario.perguntas.length > 0 ? (
          questionario.perguntas.map((pergunta) => {
            const opcoes = Array.isArray(pergunta.opcoes) ? pergunta.opcoes : [];
            const perguntaId = pergunta.id || pergunta.pergunta; // Usar ID único se disponível, senão o texto da pergunta

            return (
              <View key={perguntaId} style={styles.perguntaContainer}>
                <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>

                {pergunta.tipo === 'texto' && (
                  <TextInput
                    style={styles.input}
                    value={respostas[perguntaId] || ''}
                    onChangeText={(text) => handleChangeResposta(perguntaId, text, 'texto')}
                    placeholder="Digite sua resposta"
                    multiline={true} // Para textos longos
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                )}

                {(pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') && opcoes.length > 0 ? (
                  opcoes.map((opcao) => {
                    const selecionado =
                      pergunta.tipo === 'multipla'
                        ? (respostas[perguntaId] || []).includes(opcao)
                        : respostas[perguntaId] === opcao;

                    return (
                      <TouchableOpacity
                        key={opcao}
                        style={[
                          styles.opcaoButton,
                          selecionado && styles.opcaoButtonSelected,
                        ]}
                        onPress={() => handleChangeResposta(perguntaId, opcao, pergunta.tipo)}
                      >
                        <Text style={[styles.opcaoTexto, selecionado && { color: '#fff' }]}>
                          {opcao}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') && (
                  <Text style={styles.warningText}>
                    ⚠ Opções não encontradas para esta pergunta.
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>Nenhuma pergunta disponível neste questionário.</Text>
        )}

        <View style={styles.buttonWrapper}>
          <TouchableOpacity style={styles.enviarButton} onPress={handleEnviar} disabled={loading}>
            <Text style={styles.enviarButtonText}>Enviar Respostas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: { // Novo estilo para mensagens de erro
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fef2f2', // Fundo vermelho claro
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 10,
    margin: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  messageContainer: { // Novo estilo para mensagens de "já respondeu"
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ecfdf5', // Fundo verde claro
    borderColor: '#10b981',
    borderWidth: 1,
    borderRadius: 10,
    margin: 20,
  },
  messageText: {
    fontSize: 18,
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#d0a956',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espaço extra para o teclado
    backgroundColor: '#f9fafb', // Cor de fundo consistente
  },
  title: {
    fontSize: 28, // Maior
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937', // Mais escuro
    textAlign: 'center',
  },
  description: { // Novo estilo para descrição do questionário
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  perguntaContainer: {
    marginBottom: 25, // Mais espaço entre perguntas
    backgroundColor: '#fff',
    padding: 18, // Mais padding
    borderRadius: 12,
    borderColor: '#e5e7eb', // Borda mais suave
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  perguntaTexto: {
    fontSize: 17, // Ligeiramente maior
    fontWeight: '600',
    marginBottom: 12, // Mais espaço
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12, // Mais padding
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#1f2937',
    minHeight: 100, // Altura mínima para texto longo
    textAlignVertical: 'top',
  },
  opcaoButton: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    paddingVertical: 12, // Mais padding
    paddingHorizontal: 16,
    marginVertical: 6, // Mais espaço vertical
    backgroundColor: '#fff',
    alignItems: 'center', // Centraliza o texto
  },
  opcaoButtonSelected: {
    backgroundColor: '#d0a956',
    borderColor: '#d0a956', // Borda da mesma cor
  },
  opcaoTexto: {
    color: '#d0a956',
    fontWeight: '600',
    fontSize: 16, // Ligeiramente maior
  },
  warningText: { // Estilo para avisos de opções ausentes
    color: '#f59e0b', // Amarelo/Laranja
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: 30,
    marginBottom: 50,
  },
  enviarButton: {
    backgroundColor: '#d0a956',
    paddingVertical: 16, // Mais padding
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15, // Sombra mais forte
    shadowRadius: 6,
    elevation: 5,
  },
  enviarButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
