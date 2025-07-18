import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView, // Adicionado
  StatusBar,    // Adicionado
  Platform,     // Adicionado
} from 'react-native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native'; // Adicionado useIsFocused
import { Ionicons } from '@expo/vector-icons'; // Usaremos Ionicons

// Paleta de Cores Refinada (Mantida a sua, que é boa!)
const Colors = {
  primaryGold: '#D4AF37',   // Ouro mais clássico
  darkBrown: '#3E2723',     // Marrom bem escuro, quase preto
  lightBrown: '#795548',    // Marrom mais suave
  creamBackground: '#FDF7E4', // Fundo creme claro
  white: '#FFFFFF',
  lightGray: '#ECEFF1',     // Cinza muito claro
  mediumGray: '#B0BEC5',    // Cinza médio para textos secundários
  darkGray: '#424242',      // Cinza escuro para textos principais
  accentBlue: '#2196F3',    // Azul vibrante para links
  successGreen: '#4CAF50',  // Verde para sucesso
  errorRed: '#F44336',      // Vermelho para erros/alertas
  buttonTextLight: '#FFFFFF', // Cor de texto para botões com fundo escuro
  buttonTextDark: '#3E2723', // Cor de texto para botões com fundo claro
  shadow: 'rgba(0,0,0,0.08)', // Sombra suave
};

export default function TreinosDoClienteScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused(); // Hook para verificar se a tela está focada

  const { clienteId, clientename } = route.params;

  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função useCallback para carregar treinos, otimizando renders
  const carregarTreinos = useCallback(async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Zera hora para comparar apenas datas

      const ref = collection(db, 'users', clienteId, 'treinos');
      const snapshot = await getDocs(ref);

      const listaTreinos = snapshot.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
        .filter((treino) => {
          if (!treino.data) return false;
          // Converte Timestamp para Date ou string para Date
          const dataTreino = treino.data.toDate ? treino.data.toDate() : new Date(treino.data);
          // Filtra apenas treinos futuros ou do dia atual
          return dataTreino >= hoje;
        })
        .sort((a, b) => { // Ordena os treinos por data, do mais próximo ao mais distante
            const dateA = a.data.toDate ? a.data.toDate() : new Date(a.data);
            const dateB = b.data.toDate ? b.data.toDate() : new Date(b.data);
            return dateA.getTime() - dateB.getTime();
        });

      setTreinos(listaTreinos);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os treinos. Tente novamente mais tarde.');
      console.error('Erro ao carregar treinos:', error);
    } finally {
      setLoading(false);
    }
  }, [clienteId]); // clienteId como dependência

  useEffect(() => {
    // Atualiza o título da tela
    navigation.setOptions({ title: `Treinos de ${clientename || 'Cliente'}` });

    // Carrega os treinos quando a tela é focada (útil após voltar de EditarTreino)
    if (isFocused) {
      carregarTreinos();
    }
  }, [navigation, clientename, isFocused, carregarTreinos]); // Adicionado isFocused e carregarTreinos

  // Função para formatar data (similar à FichaClienteScreen para consistência)
  const formatarData = (data) => {
    if (!data) return 'Sem data definida';
    if (data.seconds) {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-PT');
    }
    if (typeof data === 'string' && (data.includes('T') || data.includes('-'))) {
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate)) {
            return parsedDate.toLocaleDateString('pt-PT');
        }
    }
    return new Date(data).toLocaleDateString('pt-PT'); // Fallback para outros formatos de data
  };

  const confirmarRemocao = (treinoId, treinoNome) => {
    Alert.alert(
      'Remover Treino',
      `Tens a certeza que queres remover o treino "${treinoNome || 'sem nome'}"? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => apagarTreino(treinoId),
        },
      ]
    );
  };

  const apagarTreino = useCallback(async (treinoId) => {
    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treinoId);
      await deleteDoc(treinoRef);
      Alert.alert('Sucesso', 'Treino removido com sucesso!');
      carregarTreinos(); // Recarrega a lista
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível apagar o treino. Tente novamente.');
      console.error('Erro ao apagar treino:', error);
    }
  }, [clienteId, carregarTreinos]); // clienteId e carregarTreinos como dependências

  const renderItem = ({ item }) => {
    const dataFormatada = formatarData(item.data);

    return (
      <View style={styles.card}>
        <Text style={styles.treinoNome}>
          <Ionicons name="fitness-outline" size={18} color={Colors.darkBrown} /> {item.nome || 'Treino sem nome'}
        </Text>
        <Text style={styles.treinoData}>
          <Ionicons name="calendar-outline" size={16} color={Colors.mediumGray} /> Data: {dataFormatada}
        </Text>

        <View style={styles.botoesRow}>
          <TouchableOpacity
            style={styles.editarBtn}
            onPress={() =>
              navigation.navigate('EditarTreino', {
                clienteId,
                treino: item,
                reloadTreinos: carregarTreinos, // Passa a função de recarga
              })
            }
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.buttonTextDark} />
            <Text style={styles.btnText}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.apagarBtn}
            onPress={() => confirmarRemocao(item.id, item.nome)}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.btnText}>Apagar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.creamBackground} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primaryGold} />
          <Text style={styles.loadingText}>A carregar treinos...</Text>
        </View>
      ) : treinos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={60} color={Colors.mediumGray} />
          <Text style={styles.emptyText}>Nenhum treino futuro atribuído a {clientename || 'este cliente'}!</Text>
          <TouchableOpacity
            style={styles.addTreinoButton}
            onPress={() => navigation.navigate('CriarTreinoScreen', { clienteId, clientename, reloadTreinos: carregarTreinos })}
          >
            <Ionicons name="add-circle-outline" size={22} color={Colors.buttonTextLight} />
            <Text style={styles.addTreinoButtonText}>Atribuir Novo Treino</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={treinos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={() => (
            <TouchableOpacity
              style={styles.addTreinoButtonBottom}
              onPress={() => navigation.navigate('CriarTreinoScreen', { clienteId, clientename, reloadTreinos: carregarTreinos })}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.buttonTextLight} />
              <Text style={styles.addTreinoButtonText}>Atribuir Novo Treino</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.creamBackground,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.darkBrown,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.creamBackground,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.mediumGray,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 25,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    backgroundColor: Colors.white,
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  treinoNome: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
    color: Colors.darkBrown,
    flexDirection: 'row',
    alignItems: 'center',
  },
  treinoData: {
    fontSize: 15,
    color: Colors.mediumGray,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  botoesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10, // Espaçamento entre os botões
  },
  editarBtn: {
    backgroundColor: Colors.lightGray, // Cor mais neutra para editar
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  apagarBtn: {
    backgroundColor: Colors.errorRed, // Cor de erro
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  btnText: {
    color: Colors.darkBrown, // Texto para editar (cor DarkBrown)
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6, // Espaço entre ícone e texto
  },
  // Estilo específico para o texto do botão Apagar para ser branco
  apagarBtnText: {
    color: Colors.buttonTextLight,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  addTreinoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGold,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 30,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  addTreinoButtonText: {
    color: Colors.buttonTextLight,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  addTreinoButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryGold,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 25,
    marginBottom: 10, // Pequena margem para o final da lista
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginHorizontal: 20, // Alinha com o padding da lista
  },
});