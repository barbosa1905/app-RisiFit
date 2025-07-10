import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';

const TIPOS_PERGUNTA = [
  { label: 'Texto', value: 'texto' },
  { label: 'Múltipla Escolha', value: 'multipla' },
];

export default function EditarQuestionarioScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const questionarioId = route.params?.questionarioId || null;

  const adminId = auth.currentUser?.uid;

  const [titulo, setTitulo] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarQuestionario = async () => {
      if (!adminId) {
        Alert.alert('Erro', 'Admin não autenticado');
        navigation.goBack();
        return;
      }

      if (!questionarioId) {
        setTitulo('');
        setPerguntas([]);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'admins', adminId, 'questionarios', questionarioId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitulo(data.titulo || '');
          setPerguntas(data.perguntas || []);
        } else {
          Alert.alert('Aviso', 'Questionário não encontrado');
          navigation.goBack();
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Erro', 'Falha ao carregar questionário');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    carregarQuestionario();
  }, [questionarioId, adminId, navigation]);

  function atualizarPerguntaText(index, text) {
    const newPerguntas = [...perguntas];
    newPerguntas[index].pergunta = text;
    setPerguntas(newPerguntas);
  }

  function atualizarTipoPergunta(index, tipo) {
    const newPerguntas = [...perguntas];
    newPerguntas[index].tipo = tipo;
    if (tipo === 'multipla' && !newPerguntas[index].opcoes) {
      newPerguntas[index].opcoes = [''];
    }
    if (tipo !== 'multipla') {
      delete newPerguntas[index].opcoes;
    }
    setPerguntas(newPerguntas);
  }

  function atualizarOpcao(indexPergunta, indexOpcao, text) {
    const newPerguntas = [...perguntas];
    newPerguntas[indexPergunta].opcoes[indexOpcao] = text;
    setPerguntas(newPerguntas);
  }

  function adicionarOpcao(indexPergunta) {
    const newPerguntas = [...perguntas];
    newPerguntas[indexPergunta].opcoes.push('');
    setPerguntas(newPerguntas);
  }

  function removerOpcao(indexPergunta, indexOpcao) {
    const newPerguntas = [...perguntas];
    newPerguntas[indexPergunta].opcoes.splice(indexOpcao, 1);
    setPerguntas(newPerguntas);
  }

  function adicionarPergunta() {
    setPerguntas(prev => [
      ...prev,
      { id: Date.now().toString(), pergunta: '', tipo: 'texto' },
    ]);
  }

  function removerPergunta(index) {
    Alert.alert(
      'Remover pergunta',
      'Deseja remover esta pergunta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            const newPerguntas = [...perguntas];
            newPerguntas.splice(index, 1);
            setPerguntas(newPerguntas);
          },
        },
      ]
    );
  }

  async function salvarQuestionario() {
    if (!titulo.trim()) {
      Alert.alert('Validação', 'Informe um título para o questionário.');
      return;
    }

    if (perguntas.length === 0) {
      Alert.alert('Validação', 'Adicione pelo menos uma pergunta.');
      return;
    }

    for (const p of perguntas) {
      if (!p.pergunta.trim()) {
        Alert.alert('Validação', 'Todas as perguntas devem ter texto.');
        return;
      }
      if (p.tipo === 'multipla') {
        if (!p.opcoes || p.opcoes.length === 0) {
          Alert.alert('Validação', 'Perguntas de múltipla escolha devem ter pelo menos uma opção.');
          return;
        }
        for (const op of p.opcoes) {
          if (!op.trim()) {
            Alert.alert('Validação', 'Todas as opções devem ter texto.');
            return;
          }
        }
      }
    }

    try {
      setLoading(true);
      const idToSave = questionarioId || Date.now().toString();

      await setDoc(doc(db, 'admins', adminId, 'questionarios', idToSave), {
        titulo,
        perguntas,
      });

      Alert.alert('Sucesso', 'Questionário salvo com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao salvar questionário.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={styles.label}>Título do Questionário:</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Digite o título"
        />

        <Text style={[styles.label, { marginTop: 20 }]}>Perguntas:</Text>

        {perguntas.map((p, index) => (
          <View key={p.id} style={styles.perguntaContainer}>
            <TextInput
              style={styles.input}
              placeholder={`Pergunta ${index + 1}`}
              value={p.pergunta}
              onChangeText={text => atualizarPerguntaText(index, text)}
            />

            <View style={styles.tipoContainer}>
              {TIPOS_PERGUNTA.map(tipo => (
                <TouchableOpacity
                  key={tipo.value}
                  style={[
                    styles.tipoButton,
                    p.tipo === tipo.value && styles.tipoButtonSelecionado,
                  ]}
                  onPress={() => atualizarTipoPergunta(index, tipo.value)}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      p.tipo === tipo.value && styles.tipoButtonTextSelecionado,
                    ]}
                  >
                    {tipo.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {p.tipo === 'multipla' && (
              <View style={styles.opcoesContainer}>
                {p.opcoes.map((opcao, i) => (
                  <View key={i} style={styles.opcaoRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`Opção ${i + 1}`}
                      value={opcao}
                      onChangeText={text => atualizarOpcao(index, i, text)}
                    />
                    <TouchableOpacity
                      onPress={() => removerOpcao(index, i)}
                      style={styles.removeOpcaoButton}
                    >
                      <Text style={styles.removeOpcaoButtonText}>X</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={() => adicionarOpcao(index)}
                  style={styles.addOpcaoButton}
                >
                  <Text style={styles.addOpcaoButtonText}>+ Adicionar Opção</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => removerPergunta(index)}
              style={styles.removePerguntaButton}
            >
              <Text style={styles.removePerguntaButtonText}>Remover Pergunta</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={adicionarPergunta}>
          <Text style={styles.addButtonText}>+ Adicionar Pergunta</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={salvarQuestionario}>
          <Text style={styles.saveButtonText}>Salvar Questionário</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: {
    fontWeight: '700',
    fontSize: 18,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    fontSize: 16,
  },
  perguntaContainer: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  tipoContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  tipoButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  tipoButtonSelecionado: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  tipoButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  tipoButtonTextSelecionado: {
    color: '#fff',
  },
  opcoesContainer: {
    marginTop: 10,
  },
  opcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  removeOpcaoButton: {
    marginLeft: 10,
    backgroundColor: '#e53935',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeOpcaoButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  addOpcaoButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addOpcaoButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  removePerguntaButton: {
    marginTop: 15,
    backgroundColor: '#e53935',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  removePerguntaButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  addButton: {
    marginTop: 30,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 25,
    backgroundColor: '#d0a956',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
