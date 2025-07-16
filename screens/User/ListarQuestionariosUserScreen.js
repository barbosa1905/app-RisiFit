import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView, // Adicionado SafeAreaView para melhor layout em diferentes dispositivos
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getUserIdLoggedIn } from '../../services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Definição da paleta de cores para consistência
const COLORS = {
  primaryAccent: '#FBBF24',   // Amarelo/Dourado para acentos principais
  backgroundLight: '#F9FAFB', // Fundo geral mais claro
  cardBackground: '#FFFFFF',  // Branco para cartões
  textDark: '#1F2937',        // Texto escuro para títulos
  textMedium: '#4B5563',      // Texto médio para descrições/geral
  textLight: '#9CA3AF',       // Texto claro para detalhes
  borderLight: '#E5E7EB',     // Borda clara padrão
  // Cores de status
  completedStatusBg: '#D1FAE5',      // Fundo verde claro para respondido
  completedStatusBorder: '#34D399',  // Borda verde para respondido
  completedStatusText: '#065F46',    // Texto verde escuro para respondido
  activeCardBorder: '#FBBF24',      // Borda para cartões não respondidos
  activeCardBackground: '#FFFBEB',   // Fundo amarelo muito claro para cartões não respondidos
};

export default function ListarQuestionariosUserScreen() {
  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondedQuestionnaireIds, setRespondedQuestionnaireIds] = useState(new Set());
  const navigation = useNavigation();
  const [userId, setUserId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        setLoading(true);
        const currentUserId = await getUserIdLoggedIn();
        if (!currentUserId) {
          Alert.alert("Erro", "Utilizador não autenticado. Por favor, faça login novamente.");
          setLoading(false);
          return;
        }
        setUserId(currentUserId);

        await Promise.all([
          carregarQuestionarios(currentUserId),
          carregarRespostasDoUtilizador(currentUserId)
        ]);
        setLoading(false);
      }

      loadData();
    }, [])
  );

  const carregarQuestionarios = async (currentUserId) => {
    try {
      console.log("Buscando questionários públicos...");
      const snapshot = await getDocs(collection(db, 'questionariosPublicos'));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuestionarios(lista);
      console.log(`Encontrados ${lista.length} questionários públicos.`);
    } catch (error) {
      console.error('Erro ao buscar questionários públicos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os questionários.');
    }
  };

  const carregarRespostasDoUtilizador = async (currentUserId) => {
    try {
      console.log("Buscando respostas do utilizador para questionários...");
      const respostasQuery = query(
        collection(db, 'respostasQuestionarios'),
        where('userId', '==', currentUserId)
      );
      const respostasSnapshot = await getDocs(respostasQuery);
      const respondedIds = new Set(
        respostasSnapshot.docs.map(doc => doc.data().questionarioId)
      );
      setRespondedQuestionnaireIds(respondedIds);
      console.log(`Utilizador respondeu a ${respondedIds.size} questionários.`);
    } catch (error) {
      console.error('Erro ao carregar respostas do utilizador:', error);
      Alert.alert('Erro', 'Não foi possível verificar o status das suas respostas.');
    }
  };

  const renderItem = ({ item }) => {
    const isResponded = respondedQuestionnaireIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isResponded ? styles.cardResponded : styles.cardPending // Novo estilo para pendente
        ]}
        onPress={() => {
          if (isResponded) {
            Alert.alert(
              "Questionário Respondido",
              "Você já respondeu a este questionário. Deseja respondê-lo novamente?",
              [
                { text: "Cancelar", style: "cancel" },
                { text: "Sim", onPress: () => navigation.navigate('ResponderQuestionarioScreen', { questionarioId: item.id }) }
              ]
            );
          } else {
            navigation.navigate('ResponderQuestionarioScreen', { questionarioId: item.id });
          }
        }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.titulo}>{item.nome || 'Sem título'}</Text>
          {item.descricao && <Text style={styles.descricao}>{item.descricao}</Text>}
        </View>
        {isResponded && (
          <View style={styles.respondedIndicator}>
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.completedStatusText} />
            <Text style={styles.respondedText}>Respondido</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryAccent} />
        <Text style={styles.loadingText}>Carregando questionários...</Text>
      </View>
    );
  }

  if (questionarios.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum questionário disponível no momento.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Barra Fixa do Cabeçalho */}
      <View style={styles.fixedHeader}>
        <Text style={styles.headerTitle}>Questionários Disponíveis</Text>
      </View>

      {/* Conteúdo da Lista (FlatList) */}
      <FlatList
        data={questionarios}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent} // Mantém o padding inferior e superior para o conteúdo da lista
        showsVerticalScrollIndicator={false}
        style={styles.flatListStyle} // Estilo para o componente FlatList em si
      />
    </SafeAreaView>
  );
}

// Altura da barra fixa, ajustável conforme necessário
const HEADER_HEIGHT = 70;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  fixedHeader: {
    height: HEADER_HEIGHT, // Altura fixa da barra
    backgroundColor: COLORS.cardBackground, // Fundo branco
    justifyContent: 'center', // Centraliza o conteúdo verticalmente
    alignItems: 'center', // Centraliza o conteúdo horizontalmente
    borderBottomWidth: StyleSheet.hairlineWidth, // Borda inferior sutil
    borderBottomColor: COLORS.borderLight,
    shadowColor: '#000', // Sombra suave para dar profundidade
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    paddingHorizontal: 20, // Padding horizontal
  },
  headerTitle: {
    fontSize: 24, // Tamanho da fonte do título
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMedium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  flatListStyle: {
    flex: 1, // Faz a FlatList ocupar o restante do espaço vertical
    paddingHorizontal: 20, // Padding horizontal para a FlatList
  },
  listContent: {
    paddingTop: 15, // Espaço entre a barra fixa e o primeiro item da lista
    paddingBottom: 30, // Espaço na parte inferior da lista
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  cardPending: {
    borderColor: COLORS.activeCardBorder,
    backgroundColor: COLORS.activeCardBackground,
  },
  cardResponded: {
    backgroundColor: COLORS.completedStatusBg,
    borderColor: COLORS.completedStatusBorder,
    shadowColor: COLORS.completedStatusBorder,
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
    marginRight: 15,
  },
  titulo: {
    fontSize: 19,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  descricao: {
    fontSize: 15,
    color: COLORS.textMedium,
  },
  respondedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.completedStatusBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.completedStatusBorder,
  },
  respondedText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.completedStatusText,
    marginLeft: 6,
  },
});
