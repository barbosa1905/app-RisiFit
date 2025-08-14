import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';

// Importações do Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Ícones FontAwesome para uso no botão "adicionar" e outros elementos.
import { FontAwesome5 } from '@expo/vector-icons';

// ============================================================================
// Paleta de Cores (Cores.js)
// ============================================================================
const Cores = {
  // Cores Primárias (Dourado/Preto)
  primaria: '#B8860B', // Dourado mais escuro para a marca principal
  primariaClara: '#D4AF37', // Dourado mais claro para destaques
  primariaEscura: '#8B6B08', // Dourado mais profundo

  secundaria: '#000000ff', // Um preto muito escuro ou cinza carvão para secundário
  secundariaClara: '#4A4E46', // Um cinza escuro um pouco mais claro
  secundariaEscura: '#1C201A', // Um preto quase absoluto

  acento: '#FFD700', // Dourado puro/ouro para ênfase forte
  acentoClaro: '#FFE066', // Amarelo dourado mais suave
  acentoEscuro: '#CCAA00', // Dourado mais escuro para contraste

  // Cores de Fundo
  fundo: '#F0F0F0', // Fundo geral muito claro (quase branco)
  superficie: '#FFFFFF', // Fundo para cartões, cabeçalhos (branco puro)
  fundoCard: '#FFFFFF', // Alias para superficie

  // Cores de Texto
  textoPrimario: '#1A1A1A', // Texto principal (preto bem escuro)
  textoSecundario: '#505050', // Texto secundário (cinza médio-escuro)
  textoClaro: '#8a8a8a96', // Texto mais claro (cinza claro)
  textoNaPrimaria: '#FFFFFF', // Texto sobre o fundo primário
  textoNaPrimariaEscura: '#1A1A1A', // Texto escuro sobre o fundo primário para contraste

  // Cores Neutras (Pretos, Brancos, Tons de Cinza)
  branco: '#FFFFFF',
  preto: '#000000',

  cinzentoClaro: '#E0E0E0', // Bordas, separadores
  cinzentoMedio: '#C0C0C0', // Componentes desabilitados, fundos subtis
  cinzentoEscuro: '#707070', // Texto e ícones gerais que não sejam primary/secondary

  // Cores de Feedback
  sucesso: '#4CAF50', // Mantido verde para universalidade (sucesso)
  aviso: '#FFC107', // Mantido amarelo para universalidade (avisos)
  erro: '#DC3545', // Mantido vermelho para universalidade (erros)
  info: '#17A2B8', // Mantido azul para universalidade (informações/links)

  // Cores de "On" (para texto/ícone sobre a cor base)
  onPrimaria: '#FFFFFF', // Branco sobre o dourado
  onSecundaria: '#871818ff', // Branco sobre o preto/cinza escuro
  onAcento: '#1A1A1A', // Preto sobre o dourado de ênfase
};

// ============================================================================
// Configuração do Firebase
// Substitua com as suas credenciais do projeto Firebase
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDOP9sg9slVIXrkEvdTpXrL-DRAeolLI8I",
  authDomain: "risifit-4defe.firebaseapp.com",
  projectId: "risifit-4defe",
  storageBucket: "risifit-4defe.firebasestorage.app",
  messagingSenderId: "485424698583",
  appId: "1:485424698583:web:0d6095f3ca5a071b4ccc92",
  measurementId: "G-J7PVBCXMT5"
};
// Inicializa o Firebase e o Firestore, mas apenas se ainda não tiver sido inicializado.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Componente principal para a tela de criação/edição do questionário
export default function CriarQuestionarioScreen() {
  // Estado para armazenar o título do questionário
  const [titulo, setTitulo] = useState('');
  // Estado para armazenar a descrição do questionário
  const [descricao, setDescricao] = useState('');
  // Estado que armazena todas as perguntas do questionário
  const [perguntas, setPerguntas] = useState([
    {
      id: '1',
      texto: 'Qual é o seu nome completo?',
      tipo: 'texto',
    },
  ]);
  // Estado para controlar a visibilidade do menu de seleção de tipo de pergunta
  const [menuVisivel, setMenuVisivel] = useState(false);
  // Estado que guarda a ID da pergunta que está a ser editada
  const [perguntaEmEdicao, setPerguntaEmEdicao] = useState(null);

  // Função para adicionar uma nova pergunta ao questionário
  const adicionarPergunta = (tipo) => {
    // Cria uma nova pergunta com um ID único e o tipo selecionado
    const novaPergunta = {
      id: Date.now().toString(),
      texto: '',
      tipo: tipo,
      opcoes: tipo !== 'texto' ? [{ id: 'op1', texto: 'Opção 1' }] : [],
    };
    // Adiciona a nova pergunta ao array de perguntas
    setPerguntas([...perguntas, novaPergunta]);
    // Fecha o menu de seleção de tipo de pergunta
    setMenuVisivel(false);
  };

  // Função para remover uma pergunta
  const removerPergunta = (id) => {
    // Alerta de confirmação para evitar remoções acidentais
    Alert.alert(
      'Confirmar Remoção',
      'Tem a certeza que quer remover esta pergunta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          onPress: () => {
            // Remove a pergunta do array pelo seu ID
            setPerguntas(perguntas.filter((pergunta) => pergunta.id !== id));
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Função para adicionar uma opção a uma pergunta de escolha
  const adicionarOpcao = (perguntaId) => {
    // Encontra a pergunta pelo seu ID
    const pergunta = perguntas.find((p) => p.id === perguntaId);
    if (!pergunta) return;

    // Adiciona uma nova opção à pergunta
    const novaOpcao = { id: Date.now().toString(), texto: `Nova Opção` };
    const novasPerguntas = perguntas.map((p) =>
      p.id === perguntaId ? { ...p, opcoes: [...p.opcoes, novaOpcao] } : p
    );
    setPerguntas(novasPerguntas);
  };

  // Função para remover uma opção de uma pergunta de escolha
  const removerOpcao = (perguntaId, opcaoId) => {
    // Encontra a pergunta
    const pergunta = perguntas.find((p) => p.id === perguntaId);
    if (!pergunta) return;

    // Remove a opção do array de opções da pergunta
    const novasPerguntas = perguntas.map((p) =>
      p.id === perguntaId
        ? { ...p, opcoes: p.opcoes.filter((o) => o.id !== opcaoId) }
        : p
    );
    setPerguntas(novasPerguntas);
  };

  // Função para atualizar o texto de uma pergunta
  const atualizarTextoPergunta = (perguntaId, novoTexto) => {
    const novasPerguntas = perguntas.map((p) =>
      p.id === perguntaId ? { ...p, texto: novoTexto } : p
    );
    setPerguntas(novasPerguntas);
  };

  // Função para atualizar o texto de uma opção de pergunta
  const atualizarTextoOpcao = (perguntaId, opcaoId, novoTexto) => {
    const novasPerguntas = perguntas.map((p) =>
      p.id === perguntaId
        ? {
            ...p,
            opcoes: p.opcoes.map((o) =>
              o.id === opcaoId ? { ...o, texto: novoTexto } : o
            ),
          }
        : p
    );
    setPerguntas(novasPerguntas);
  };

  // Função que lida com o envio do questionário
  const lidarComEnvio = async () => {
    // Validação básica para garantir que o título e pelo menos uma pergunta existem
    if (!titulo.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para o questionário.');
      return;
    }
    if (perguntas.length === 0) {
      Alert.alert('Erro', 'O questionário deve ter pelo menos uma pergunta.');
      return;
    }

    // Lógica para guardar os dados no Firebase.
    try {
      // Cria uma referência para a coleção 'questionarios'
      const docRef = await addDoc(collection(db, "questionarios"), {
        titulo: titulo,
        descricao: descricao,
        perguntas: perguntas,
        dataCriacao: serverTimestamp(),
      });
      console.log("Documento guardado com o ID: ", docRef.id);
      Alert.alert("Sucesso", "Questionário guardado com sucesso!");
    } catch (error) {
      console.error("Erro ao guardar o questionário:", error);
      Alert.alert("Erro", "Não foi possível guardar o questionário.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Criar Questionário</Text>
          <Text style={styles.headerSubtitle}>Construa o seu formulário</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Campo para o Título do Questionário */}
        <View style={styles.card}>
          <Text style={styles.label}>Título do Questionário</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex: Questionário de Satisfação do Cliente"
            placeholderTextColor={Cores.cinzentoMedio}
          />
        </View>

        {/* Campo para a Descrição do Questionário */}
        <View style={styles.card}>
          <Text style={styles.label}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            placeholder="Ex: Por favor, responda a estas questões para nos ajudar a melhorar o nosso serviço."
            placeholderTextColor={Cores.cinzentoMedio}
          />
        </View>

        {/* Mapeia e renderiza as perguntas existentes */}
        {perguntas.map((pergunta, index) => (
          <View key={pergunta.id} style={styles.card}>
            {/* Cabeçalho da Pergunta com botões de ação */}
            <View style={styles.perguntaHeader}>
              <Text style={styles.perguntaNumero}>Pergunta {index + 1}</Text>
              <TouchableOpacity
                onPress={() => removerPergunta(pergunta.id)}
                style={styles.botaoRemover}
              >
                <FontAwesome5 name="trash" size={16} color={Cores.erro} />
              </TouchableOpacity>
            </View>

            {/* Input para o texto da pergunta */}
            <Text style={styles.label}>Texto da Pergunta</Text>
            <TextInput
              style={styles.input}
              value={pergunta.texto}
              onChangeText={(texto) => atualizarTextoPergunta(pergunta.id, texto)}
              placeholder="Ex: Qual é a sua principal preocupação?"
              placeholderTextColor={Cores.cinzentoMedio}
            />

            {/* Condicional para renderizar campos de opções, se aplicável */}
            {(pergunta.tipo === 'unica' || pergunta.tipo === 'multipla') && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Opções</Text>
                {/* Mapeia e renderiza as opções da pergunta */}
                {pergunta.opcoes.map((opcao, opcaoIndex) => (
                  <View key={opcao.id} style={styles.opcaoContainer}>
                    <TextInput
                      style={styles.inputOpcao}
                      value={opcao.texto}
                      onChangeText={(texto) =>
                        atualizarTextoOpcao(pergunta.id, opcao.id, texto)
                      }
                      placeholder={`Opção ${opcaoIndex + 1}`}
                      placeholderTextColor={Cores.cinzentoMedio}
                    />
                    <TouchableOpacity
                      onPress={() => removerOpcao(pergunta.id, opcao.id)}
                      style={styles.botaoRemoverOpcao}
                    >
                      <FontAwesome5 name="minus-circle" size={20} color={Cores.erro} />
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Botão para adicionar mais opções */}
                <TouchableOpacity
                  onPress={() => adicionarOpcao(pergunta.id)}
                  style={styles.botaoAdicionarOpcao}
                >
                  <FontAwesome5 name="plus-circle" size={20} color={Cores.primaria} />
                  <Text style={styles.textoBotaoAdicionarOpcao}> Adicionar Opção</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Espaçador para o botão flutuante */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botão para guardar o questionário */}
      <TouchableOpacity
        style={styles.botaoGuardar}
        onPress={lidarComEnvio}
      >
        <Text style={styles.textoBotaoGuardar}>Guardar Questionário</Text>
      </TouchableOpacity>

      {/* Botão flutuante para adicionar nova pergunta */}
      <TouchableOpacity
        style={styles.botaoFlutuante}
        onPress={() => setMenuVisivel(!menuVisivel)}
      >
        <FontAwesome5 name="plus" size={24} color={Cores.branco} />
      </TouchableOpacity>

      {/* Menu flutuante para selecionar o tipo de pergunta */}
      {menuVisivel && (
        <View style={styles.menuFlutuante}>
          <TouchableOpacity
            style={styles.opcaoMenu}
            onPress={() => adicionarPergunta('texto')}
          >
            <FontAwesome5 name="align-left" size={18} color={Cores.textoSecundario} />
            <Text style={styles.textoOpcaoMenu}>Resposta Livre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.opcaoMenu}
            onPress={() => adicionarPergunta('unica')}
          >
            <FontAwesome5 name="dot-circle" size={18} color={Cores.textoSecundario} />
            <Text style={styles.textoOpcaoMenu}>Escolha Única</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.opcaoMenu}
            onPress={() => adicionarPergunta('multipla')}
            >
            <FontAwesome5 name="check-square" size={18} color={Cores.textoSecundario} />
            <Text style={styles.textoOpcaoMenu}>Múltipla Escolha</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Definição dos estilos usando StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Cores.fundo,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    backgroundColor: Cores.primaria,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: Cores.cinzentoEscuro,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Cores.branco,
  },
  headerSubtitle: {
    fontSize: 16,
    color: Cores.branco,
    opacity: 0.8,
    marginTop: 5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Espaço extra para o botão flutuante e o de guardar
  },
  card: {
    backgroundColor: Cores.branco,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: Cores.cinzentoEscuro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Cores.textoPrimario,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Cores.cinzentoClaro,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Cores.textoPrimario,
    backgroundColor: Cores.fundo,
  },
  perguntaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  perguntaNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Cores.textoPrimario,
  },
  botaoRemover: {
    padding: 5,
  },
  opcaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputOpcao: {
    flex: 1,
    borderWidth: 1,
    borderColor: Cores.cinzentoClaro,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Cores.textoPrimario,
    backgroundColor: Cores.fundo,
  },
  botaoRemoverOpcao: {
    marginLeft: 10,
    padding: 5,
  },
  botaoAdicionarOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  textoBotaoAdicionarOpcao: {
    marginLeft: 5,
    fontSize: 14,
    color: Cores.primaria,
    fontWeight: '600',
  },
  botaoGuardar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: Cores.primaria,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Cores.cinzentoEscuro,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  textoBotaoGuardar: {
    color: Cores.branco,
    fontSize: 18,
    fontWeight: 'bold',
  },
  botaoFlutuante: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Cores.primaria,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Cores.cinzentoEscuro,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  menuFlutuante: {
    position: 'absolute',
    bottom: 170,
    right: 20,
    width: 200,
    backgroundColor: Cores.branco,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: Cores.cinzentoEscuro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  opcaoMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  textoOpcaoMenu: {
    marginLeft: 10,
    fontSize: 16,
    color: Cores.textoPrimario,
  },
});
