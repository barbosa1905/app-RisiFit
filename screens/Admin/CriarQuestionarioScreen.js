import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../../services/firebaseConfig';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import uuid from 'react-native-uuid';
import { auth } from '../../services/firebaseConfig';
export default function CriarQuestionarioScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const questionarioExistente = route.params?.questionario ?? null;
  const adminId = auth.currentUser?.uid ?? route.params?.adminId ?? null;

  const [nome, setNome] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [questionarioId, setQuestionarioId] = useState(null);

  useEffect(() => {
    if (questionarioExistente) {
      setNome(questionarioExistente.nome);
      setPerguntas(questionarioExistente.perguntas);
      setQuestionarioId(questionarioExistente.id);
    }
  }, [questionarioExistente]);

  const adicionarPergunta = (tipo) => {
    setPerguntas((prev) => [
      ...prev,
      { id: uuid.v4(), pergunta: '', tipo, opcoes: tipo !== 'texto' ? [''] : [] },
    ]);
  };

  const atualizarPergunta = (index, campo, valor) => {
    const novas = [...perguntas];
    novas[index][campo] = valor;
    setPerguntas(novas);
  };

  const atualizarOpcao = (index, idxOpcao, valor) => {
    const novas = [...perguntas];
    novas[index].opcoes[idxOpcao] = valor;
    setPerguntas(novas);
  };

  const adicionarOpcao = (index) => {
    const novas = [...perguntas];
    novas[index].opcoes.push('');
    setPerguntas(novas);
  };

  const removerPergunta = (index) => {
    const novas = [...perguntas];
    novas.splice(index, 1);
    setPerguntas(novas);
  };

  const removerOpcao = (perguntaIndex, opcaoIndex) => {
    const novas = [...perguntas];
    novas[perguntaIndex].opcoes.splice(opcaoIndex, 1);
    setPerguntas(novas);
  };

  const validarCampos = () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do questionário é obrigatório.');
      return false;
    }

    for (let i = 0; i < perguntas.length; i++) {
      const p = perguntas[i];
      if (!p.pergunta.trim()) {
        Alert.alert('Erro', `A pergunta ${i + 1} está vazia.`);
        return false;
      }

      if (p.tipo !== 'texto') {
        for (let j = 0; j < p.opcoes.length; j++) {
          if (!p.opcoes[j].trim()) {
            Alert.alert('Erro', `A opção ${j + 1} da pergunta ${i + 1} está vazia.`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const salvarQuestionario = async () => {
    if (!validarCampos()) return;

    if (!adminId) {
      Alert.alert('Erro', 'ID do administrador não encontrado.');
      return;
    }

    try {
      const data = {
        nome,
        perguntas,
        atualizadoEm: new Date(),
      };

      if (questionarioId) {
  // Atualiza no admin
  await updateDoc(doc(db, 'admins', adminId, 'questionarios', questionarioId), data);

  // Atualiza na coleção pública também
  await setDoc(doc(db, 'questionariosPublicos', questionarioId), {
    ...data,
    id: questionarioId,
    criadoPor: adminId,
  });

  Alert.alert('Sucesso', 'Questionário atualizado!');
} else {
  const id = uuid.v4();

  // Cria no admin
  await setDoc(doc(db, 'admins', adminId, 'questionarios', id), {
    ...data,
    id,
    criadoEm: new Date(),
  });

  // Cria na coleção pública
  await setDoc(doc(db, 'questionariosPublicos', id), {
    ...data,
    id,
    criadoEm: new Date(),
    criadoPor: adminId,
  });

  Alert.alert('Sucesso', 'Questionário criado!');
}


      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar o questionário.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.botaoVoltar}>
        <Text style={styles.voltarTexto}>⬅️ Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>{questionarioId ? 'Editar Questionário' : 'Criar Novo Questionário'}</Text>

      <TextInput
        placeholder="Nome do questionário"
        style={styles.input}
        value={nome}
        onChangeText={setNome}
      />

      {perguntas.map((p, index) => (
        <View key={p.id} style={styles.perguntaBox}>
          <Text style={styles.label}>Pergunta {index + 1}</Text>
          <TextInput
            placeholder="Texto da pergunta"
            style={styles.input}
            value={p.pergunta}
            onChangeText={(text) => atualizarPergunta(index, 'pergunta', text)}
          />

          {p.tipo !== 'texto' && (
            <>
              {p.opcoes.map((op, idx) => (
                <View key={idx} style={styles.opcaoContainer}>
                  <TextInput
                    placeholder={`Opção ${idx + 1}`}
                    style={[styles.input, { flex: 1 }]}
                    value={op}
                    onChangeText={(text) => atualizarOpcao(index, idx, text)}
                  />
                  <TouchableOpacity onPress={() => removerOpcao(index, idx)}>
                    <Text style={styles.removerTexto}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => adicionarOpcao(index)}>
                <Text style={styles.adicionarOpcao}>+ Adicionar opção</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.tipo}>
            Tipo: {p.tipo === 'texto' ? 'Resposta livre' : p.tipo === 'multipla' ? 'Múltipla escolha' : 'Escolha única'}
          </Text>

          <TouchableOpacity onPress={() => removerPergunta(index)}>
            <Text style={styles.removerPergunta}>🗑️ Remover Pergunta</Text>
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.botoesContainer}>
        <TouchableOpacity onPress={() => adicionarPergunta('texto')} style={styles.botao}>
          <Text style={styles.botaoTexto}>+ Pergunta (resposta livre)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => adicionarPergunta('unica')} style={styles.botao}>
          <Text style={styles.botaoTexto}>+ Pergunta (escolha única)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => adicionarPergunta('multipla')} style={styles.botao}>
          <Text style={styles.botaoTexto}>+ Pergunta (múltipla escolha)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.botaoSalvar} onPress={salvarQuestionario}>
        <Text style={styles.botaoTextoSalvar}>💾 {questionarioId ? 'Atualizar' : 'Salvar'} Questionário</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  perguntaBox: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
  },
  tipo: {
    marginTop: 6,
    fontStyle: 'italic',
    color: '#555',
  },
  adicionarOpcao: {
    color: '#d0a956',
    fontWeight: '600',
    marginTop: 6,
  },
  removerPergunta: {
    color: 'red',
    marginTop: 10,
    fontWeight: '600',
  },
  removerTexto: {
    color: 'red',
    fontSize: 18,
    marginLeft: 8,
  },
  opcaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botoesContainer: {
    marginVertical: 12,
  },
  botao: {
    backgroundColor: '#e0e7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  botaoTexto: {
    color: '#000',
    fontWeight: '600',
  },
  botaoSalvar: {
    backgroundColor: '#d0a956',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  botaoTextoSalvar: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  botaoVoltar: {
    marginBottom: 10,
  },
  voltarTexto: {
    color: '#007AFF',
    fontSize: 16,
  },
});
