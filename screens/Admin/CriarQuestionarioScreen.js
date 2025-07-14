import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../../services/firebaseConfig';
import { doc, setDoc, updateDoc, getDoc, collection } from 'firebase/firestore';
import uuid from 'react-native-uuid';

// ============================================================================
// Conteúdo dos Questionários Pré-definidos
// ============================================================================

const PAR_Q_PREDEFINIDO_ID = 'PAR-Q_Predefinido';
const PADRAO_PREDEFINIDO_ID = 'Padrao_Predefinido';

const PAR_Q_PREDEFINIDO_CONTENT = {
  nome: "Anamnese PAR-Q",
  descricao: "Questionário de Prontidão para Atividade Física (PAR-Q) - Pré-definido",
  perguntas: [
    { id: "parq1", pergunta: "Algum médico já lhe disse que você tem um problema cardíaco e que só deve fazer atividade física recomendada por ele?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq2", pergunta: "Você sente dor no peito ao fazer atividade física?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq3", pergunta: "Você já sentiu dor no peito no último mês?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq4", pergunta: "Você perde o equilíbrio por tontura ou desmaia?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq5", pergunta: "Você tem algum problema ósseo ou articular que possa piorar com a atividade física?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq6", pergunta: "Você toma algum medicamento para pressão arterial ou problema cardíaco?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "parq7", pergunta: "Você conhece alguma outra razão pela qual não deveria fazer atividade física?", tipo: "booleana", opcoes: ["Sim", "Não"] }
  ]
};

const PADRAO_PREDEFINIDO_CONTENT = {
  nome: "Anamnese Padrão",
  descricao: "Questionário de saúde e histórico geral - Pré-definido",
  perguntas: [
    { id: "padrao1", pergunta: "Qual o seu objetivo principal com o treino?", tipo: "texto" },
    { id: "padrao2", pergunta: "Você pratica alguma atividade física atualmente? Se sim, qual e com que frequência?", tipo: "texto" },
    { id: "padrao3", pergunta: "Você tem alguma lesão ou dor crônica?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "padrao4", pergunta: "Você tem alguma condição médica (diabetes, hipertensão, asma, etc.)?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "padrao5", pergunta: "Você tem alergias?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "padrao6", pergunta: "Qual a sua alimentação típica?", tipo: "texto" },
    { id: "padrao7", pergunta: "Quantas horas você dorme por noite, em média?", tipo: "texto" },
    { id: "padrao8", pergunta: "Você fuma?", tipo: "booleana", opcoes: ["Sim", "Não"] },
    { id: "padrao9", pergunta: "Você consome bebidas alcoólicas? Se sim, com que frequência?", tipo: "texto" }
  ]
};

export default function CriarQuestionarioScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const questionarioExistente = route.params?.questionario ?? null;
  const [adminId, setAdminId] = useState(auth.currentUser?.uid ?? route.params?.adminId ?? null);
  const [loadingPredefined, setLoadingPredefined] = useState(true);

  const [nome, setNome] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [questionarioId, setQuestionarioId] = useState(null);

  // Efeito para obter o adminId se não estiver disponível imediatamente
  useEffect(() => {
    console.log('[CriarQuestionarioScreen] useEffect: Verificando adminId...');
    if (!adminId) {
      const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
          setAdminId(user.uid);
          console.log('[CriarQuestionarioScreen] adminId definido por onAuthStateChanged:', user.uid);
        } else {
          console.log('[CriarQuestionarioScreen] Nenhum usuário autenticado encontrado.');
        }
      });
      return unsubscribe;
    } else {
      console.log('[CriarQuestionarioScreen] adminId já disponível:', adminId);
    }
  }, [adminId]);

  // Efeito para carregar questionário existente e para semear os pré-definidos
  useEffect(() => {
    const initializeScreen = async () => {
      console.log('[CriarQuestionarioScreen] useEffect: Inicializando tela...');
      if (questionarioExistente) {
        console.log('[CriarQuestionarioScreen] Editando questionário existente:', questionarioExistente.id);
        setNome(questionarioExistente.nome);
        const loadedPerguntas = questionarioExistente.perguntas.map(p => ({
          ...p,
          opcoes: p.opcoes || (p.tipo !== 'texto' && p.tipo !== 'booleana' ? [''] : []),
        }));
        setPerguntas(loadedPerguntas);
        setQuestionarioId(questionarioExistente.id);
        setLoadingPredefined(false);
      } else {
        console.log('[CriarQuestionarioScreen] Criando novo questionário. Tentando semear pré-definidos...');
        if (adminId) {
          await seedPredefinedQuestionarios();
          setLoadingPredefined(false);
        } else {
          console.log('[CriarQuestionarioScreen] adminId ainda não disponível para semear. Aguardando...');
        }
      }
    };

    initializeScreen();
  }, [questionarioExistente, adminId]);

  const seedPredefinedQuestionarios = async () => {
    console.log('[CriarQuestionarioScreen] Iniciando seedPredefinedQuestionarios...');
    if (!adminId) {
      console.log('[CriarQuestionarioScreen] Erro: adminId não disponível para semear questionários.');
      return;
    }

    const dbInstance = db;
    const predefinedQuestionarios = [
      { id: PAR_Q_PREDEFINIDO_ID, content: PAR_Q_PREDEFINIDO_CONTENT },
      { id: PADRAO_PREDEFINIDO_ID, content: PADRAO_PREDEFINIDO_CONTENT },
    ];

    for (const pq of predefinedQuestionarios) {
      const publicDocRef = doc(dbInstance, 'questionariosPublicos', pq.id);
      const publicDocSnap = await getDoc(publicDocRef);

      if (!publicDocSnap.exists()) {
        console.log(`[CriarQuestionarioScreen] Semear: Questionário '${pq.content.nome}' (ID: ${pq.id}) NÃO existe. Criando...`);
        const now = new Date();
        const dataToSave = {
          ...pq.content,
          id: pq.id,
          criadoEm: now,
          atualizadoEm: now,
          criadoPor: 'sistema_predefinido',
        };

        try {
          await setDoc(publicDocRef, dataToSave);
          console.log(`[CriarQuestionarioScreen] Semear: '${pq.content.nome}' criado em 'questionariosPublicos'.`);

          const adminDocRef = doc(dbInstance, 'admins', adminId, 'questionarios', pq.id);
          await setDoc(adminDocRef, {
            ...dataToSave,
            criadoPor: adminId,
          });
          console.log(`[CriarQuestionarioScreen] Semear: '${pq.content.nome}' criado na subcoleção do admin (${adminId}).`);
        } catch (error) {
          console.error(`[CriarQuestionarioScreen] Erro ao semear '${pq.content.nome}':`, error);
        }
      } else {
        console.log(`[CriarQuestionarioScreen] Semear: Questionário '${pq.content.nome}' (ID: ${pq.id}) JÁ existe. Pulando.`);
      }
    }
    console.log('[CriarQuestionarioScreen] seedPredefinedQuestionarios concluído.');
  };

  const adicionarPergunta = (tipo) => {
    let novaPergunta = { id: uuid.v4(), pergunta: '', tipo: tipo };
    if (tipo === 'unica' || tipo === 'multipla') {
      novaPergunta.opcoes = [''];
    } else if (tipo === 'booleana') {
      novaPergunta.opcoes = ['Sim', 'Não'];
    }
    setPerguntas((prev) => [...prev, novaPergunta]);
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
    if (novas[index].opcoes) {
      novas[index].opcoes.push('');
    } else {
      novas[index].opcoes = [''];
    }
    setPerguntas(novas);
  };

  const removerPergunta = (index) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja remover esta pergunta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: () => {
            const novas = [...perguntas];
            novas.splice(index, 1);
            setPerguntas(novas);
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const removerOpcao = (perguntaIndex, opcaoIndex) => {
    const novas = [...perguntas];
    if (novas[perguntaIndex].opcoes && novas[perguntaIndex].opcoes.length > 1) {
      novas[perguntaIndex].opcoes.splice(opcaoIndex, 1);
      setPerguntas(novas);
    } else {
      Alert.alert('Erro', 'Uma pergunta de escolha deve ter pelo menos uma opção.');
    }
  };

  const validarCampos = () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do questionário é obrigatório.');
      return false;
    }

    if (perguntas.length === 0) {
      Alert.alert('Erro', 'O questionário deve ter pelo menos uma pergunta.');
      return false;
    }

    for (let i = 0; i < perguntas.length; i++) {
      const p = perguntas[i];
      if (!p.pergunta.trim()) {
        Alert.alert('Erro', `A pergunta ${i + 1} está vazia.`);
        return false;
      }

      if (p.tipo === 'unica' || p.tipo === 'multipla') {
        if (!p.opcoes || p.opcoes.length === 0 || p.opcoes.some(op => !op.trim())) {
          Alert.alert('Erro', `A pergunta ${i + 1} precisa de pelo menos uma opção preenchida.`);
          return false;
        }
      }
    }
    return true;
  };

  const salvarQuestionario = async () => {
    if (!validarCampos()) return;

    if (!adminId) {
      Alert.alert('Erro', 'ID do administrador não encontrado. Tente novamente.');
      return;
    }

    try {
      const data = {
        nome: nome.trim(),
        perguntas: perguntas.map(p => ({
          id: p.id,
          pergunta: p.pergunta.trim(),
          tipo: p.tipo,
          ...(p.tipo === 'unica' || p.tipo === 'multipla' || p.tipo === 'booleana' ? { opcoes: p.opcoes.filter(Boolean).map(op => op.trim()) } : {}),
        })),
        atualizadoEm: new Date(),
      };

      const id = questionarioId || uuid.v4();

      await setDoc(doc(db, 'admins', adminId, 'questionarios', id), {
        ...data,
        id,
        criadoEm: questionarioExistente ? questionarioExistente.criadoEm : new Date(),
      });

      await setDoc(doc(db, 'questionariosPublicos', id), {
        ...data,
        id,
        criadoEm: questionarioExistente ? questionarioExistente.criadoEm : new Date(),
        criadoPor: adminId,
      });

      Alert.alert('Sucesso', `Questionário ${questionarioId ? 'atualizado' : 'criado'}!`);
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar questionário:', error);
      Alert.alert('Erro', 'Não foi possível salvar o questionário.');
    }
  };

  if (loadingPredefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text style={styles.loadingText}>Configurando questionários pré-definidos...</Text>
      </View>
    );
  }

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

          {(p.tipo === 'unica' || p.tipo === 'multipla') && (
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
            Tipo: {p.tipo === 'texto' ? 'Resposta livre' : p.tipo === 'unica' ? 'Escolha única' : p.tipo === 'multipla' ? 'Múltipla escolha' : 'Sim/Não'}
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
        <TouchableOpacity onPress={() => adicionarPergunta('booleana')} style={styles.botao}>
          <Text style={styles.botaoTexto}>+ Pergunta (Sim/Não)</Text>
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
