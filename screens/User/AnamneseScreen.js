import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../../services/firebaseConfig'; // Usar auth diretamente para o currentUser

export default function AnamneseScreen() {
  const [loading, setLoading] = useState(true);
  const [questionario, setQuestionario] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [userId, setUserId] = useState(null);
  const [anamneseJaPreenchida, setAnamneseJaPreenchida] = useState(false);

  useEffect(() => {
    const carregarAnamnese = async () => {
      setLoading(true);
      try {
        const currentUserId = auth.currentUser?.uid; // Obtém o UID do usuário logado
        if (!currentUserId) {
          Alert.alert('Erro', 'Utilizador não autenticado.');
          setLoading(false);
          return;
        }
        setUserId(currentUserId);

        const db = getFirestore();
        const userDocRef = doc(db, 'users', currentUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const tipoAnamneseId = userData.tipoAnamneseId; // Agora é o ID do questionário

          if (tipoAnamneseId) {
            // Referência para as respostas do usuário para este questionário específico
            const anamneseRespostasDocRef = doc(db, 'users', currentUserId, 'anamneseRespostas', tipoAnamneseId);
            const anamneseRespostasSnap = await getDoc(anamneseRespostasDocRef);

            if (anamneseRespostasSnap.exists()) {
              setRespostas(anamneseRespostasSnap.data().respostas || {});
              setAnamneseJaPreenchida(true);
              Alert.alert('Informação', 'Sua anamnese já foi preenchida.');
              // Carrega o questionário mesmo se já preenchido para exibir as perguntas
              const questionarioDocRef = doc(db, 'questionariosPublicos', tipoAnamneseId);
              const questionarioDocSnap = await getDoc(questionarioDocRef);
              if (questionarioDocSnap.exists()) {
                setQuestionario(questionarioDocSnap.data());
              } else {
                Alert.alert('Erro', `Questionário com ID '${tipoAnamneseId}' não encontrado.`);
              }
              setLoading(false);
              return; 
            }

            // Se não foi preenchida, carrega o questionário para preenchimento
            const questionarioDocRef = doc(db, 'questionariosPublicos', tipoAnamneseId);
            const questionarioDocSnap = await getDoc(questionarioDocRef);

            if (questionarioDocSnap.exists()) {
              const loadedQuestionario = questionarioDocSnap.data();
              setQuestionario(loadedQuestionario);
              // Inicializa as respostas com valores padrão
              const initialResponses = {};
              loadedQuestionario.perguntas.forEach(pergunta => {
                if (pergunta.tipo === 'booleana') {
                  initialResponses[pergunta.id] = false;
                } else if (pergunta.tipo === 'multipla') {
                  initialResponses[pergunta.id] = []; // Array para múltiplas escolhas
                } else {
                  initialResponses[pergunta.id] = '';
                }
              });
              setRespostas(initialResponses);
            } else {
              Alert.alert('Erro', `Questionário com ID '${tipoAnamneseId}' não encontrado no Firebase.`);
            }
          } else {
            Alert.alert('Informação', 'Nenhum questionário de anamnese atribuído a você.');
          }
        } else {
          Alert.alert('Erro', 'Dados do utilizador não encontrados.');
        }
      } catch (error) {
        console.error('Erro ao carregar anamnese:', error);
        Alert.alert('Erro', 'Não foi possível carregar o questionário de anamnese.');
      } finally {
        setLoading(false);
      }
    };

    carregarAnamnese();
  }, []);

  const handleRespostaChange = (perguntaId, valor) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: valor,
    }));
  };

  const handleMultiplaEscolhaChange = (perguntaId, opcao) => {
    setRespostas(prev => {
      const currentSelections = prev[perguntaId] || [];
      const updatedSelections = currentSelections.includes(opcao)
        ? currentSelections.filter(item => item !== opcao)
        : [...currentSelections, opcao];
      return {
        ...prev,
        [perguntaId]: updatedSelections,
      };
    });
  };

  const salvarRespostas = async () => {
    if (!userId || !questionario) {
      Alert.alert('Erro', 'Não foi possível salvar as respostas. Dados incompletos.');
      return;
    }

    try {
      const db = getFirestore();
      // Salva as respostas na subcoleção 'anamneseRespostas' com o ID do questionário
      const anamneseRespostasDocRef = doc(db, 'users', userId, 'anamneseRespostas', questionario.id);
      
      await setDoc(anamneseRespostasDocRef, {
        questionarioId: questionario.id,
        questionarioNome: questionario.nome,
        dataPreenchimento: new Date().toISOString(),
        respostas: respostas,
      });

      Alert.alert('Sucesso', 'Respostas da anamnese salvas com sucesso!');
      setAnamneseJaPreenchida(true); // Marca como preenchida
    } catch (error) {
      console.error('Erro ao salvar respostas da anamnese:', error);
      Alert.alert('Erro', 'Não foi possível salvar as respostas.');
    }
  };

  const renderPergunta = (pergunta) => {
    // Lógica para perguntas condicionais (se você adicionar no CriarQuestionarioScreen)
    // Por enquanto, o CriarQuestionarioScreen não tem 'condicional', então esta parte não é usada.
    // Se você adicionar 'condicional' ao CriarQuestionarioScreen, esta lógica será útil.
    // Exemplo: if (pergunta.condicional) { ... }

    switch (pergunta.tipo) {
      case 'booleana':
        return (
          <View key={pergunta.id} style={styles.perguntaContainer}>
            <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Não</Text>
              <Switch
                value={respostas[pergunta.id] || false}
                onValueChange={(value) => handleRespostaChange(pergunta.id, value)}
                trackColor={{ false: '#767577', true: '#d0a956' }}
                thumbColor={respostas[pergunta.id] ? '#f4f3f4' : '#f4f3f4'}
                disabled={anamneseJaPreenchida}
              />
              <Text style={styles.switchLabel}>Sim</Text>
            </View>
          </View>
        );
      case 'texto': // Corresponde a 'textoLongo' ou 'textoCurto' no seu design anterior
        return (
          <View key={pergunta.id} style={styles.perguntaContainer}>
            <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]} // Usar multiline para flexibilidade
              value={respostas[pergunta.id]}
              onChangeText={(text) => handleRespostaChange(pergunta.id, text)}
              placeholder="Sua resposta"
              placeholderTextColor="#999"
              multiline
              editable={!anamneseJaPreenchida}
            />
          </View>
        );
      case 'unica':
        return (
          <View key={pergunta.id} style={styles.perguntaContainer}>
            <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>
            {pergunta.opcoes && pergunta.opcoes.map((opcao, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.opcaoButton}
                onPress={() => handleRespostaChange(pergunta.id, opcao)}
                disabled={anamneseJaPreenchida}
              >
                <View style={styles.radioCircle}>
                  {respostas[pergunta.id] === opcao && <View style={styles.selectedRadioFill} />}
                </View>
                <Text style={styles.opcaoText}>{opcao}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case 'multipla':
        return (
          <View key={pergunta.id} style={styles.perguntaContainer}>
            <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>
            {pergunta.opcoes && pergunta.opcoes.map((opcao, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.opcaoButton}
                onPress={() => handleMultiplaEscolhaChange(pergunta.id, opcao)}
                disabled={anamneseJaPreenchida}
              >
                <View style={styles.checkboxSquare}>
                  {respostas[pergunta.id]?.includes(opcao) && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.opcaoText}>{opcao}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      default:
        return null;
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

  if (!questionario && !anamneseJaPreenchida) {
    return (
      <View style={styles.noQuestionarioContainer}>
        <Text style={styles.noQuestionarioText}>Nenhum questionário de anamnese atribuído ou encontrado.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{questionario?.nome || 'Anamnese'}</Text>
      {questionario?.descricao && (
        <Text style={styles.description}>{questionario.descricao}</Text>
      )}

      {anamneseJaPreenchida && (
        <Text style={styles.alreadyFilledMessage}>
          Este questionário já foi preenchido. As respostas abaixo são as que você enviou.
        </Text>
      )}

      {questionario?.perguntas.map(renderPergunta)}

      {!anamneseJaPreenchida && (
        <TouchableOpacity style={styles.saveButton} onPress={salvarRespostas}>
          <Text style={styles.saveButtonText}>Salvar Respostas</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  noQuestionarioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  noQuestionarioText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  alreadyFilledMessage: {
    fontSize: 14,
    color: '#d9534f',
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic',
    padding: 10,
    backgroundColor: '#ffe0e0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9534f',
  },
  perguntaContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  perguntaTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 10,
  },
  opcaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  opcaoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d0a956',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d0a956',
  },
  checkboxSquare: {
    height: 20,
    width: 20,
    borderWidth: 2,
    borderColor: '#d0a956',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  checkboxCheck: {
    color: '#d0a956',
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
