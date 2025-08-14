import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

// Importar o novo componente de cabeçalho
import SearchHeader from '../../components/SearchHeader';

// Paleta de Cores Refinada
const Colors = {
  primaryGold: '#B8860B',
  darkBrown: '#3E2723',
  lightBrown: '#795548',
  creamBackground: '#FDF7E4',
  white: '#FFFFFF',
  lightGray: '#ECEFF1',
  mediumGray: '#B0BEC5',
  darkGray: '#424242',
  accentBlue: '#2196F3',
  successGreen: '#4CAF50',
  errorRed: '#F44336',
  buttonTextLight: '#FFFFFF',
  buttonTextDark: '#3E2723',
  shadow: 'rgba(0,0,0,0.08)',
  black: '#000000',
};

const { width } = Dimensions.get('window');

// Global Styles for consistent shadows
const GlobalStyles = {
  shadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardShadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};

// --- Componente AppHeaderPersonalizado (Mantido) ---
const AppHeaderPersonalizado = ({ title }) => {
  return (
    <View style={headerStyles.headerContainer}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.primaryGold}
      />
      <View style={headerStyles.headerContent}>
        <Text style={headerStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.primaryGold,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.black,
  },
});

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [adminInfo, setAdminInfo] = useState(null);
  const navigation = useNavigation();
  const route = useRoute();

  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          setAdminInfo(docSnap.data());
        } else {
          setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
        }
      }, (error) => {
        console.error("Erro ao buscar informações do admin:", error);
        setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
      });
      return unsubscribe;
    } else {
      setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante' });
      return () => { };
    }
  }, []);

  const carregarClientes = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      const lista = await Promise.all(
        snapshot.docs.map(async (docUser) => {
          const userData = docUser.data();
          const treinosSnap = await getDocs(
            collection(db, 'users', docUser.id, 'treinos')
          );
          return {
            id: docUser.id,
            ...userData,
            totalTreinos: treinosSnap.size,
            dataCriacao: (userData.createdAt && userData.createdAt.toDate) ? userData.createdAt.toDate() : new Date(),
          };
        })
      );
      setClientes(lista);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAdmin = fetchAdminInfo();
    carregarClientes();
    const unsubscribeFocus = navigation.addListener('focus', () => {
      carregarClientes();
    });
    return () => {
      unsubscribeAdmin();
      unsubscribeFocus();
    };
  }, [fetchAdminInfo, carregarClientes, navigation]);

  const confirmarRemocao = (cliente) => {
    Alert.alert(
      'Remover Cliente',
      `Tem certeza que quer remover ${cliente.name || 'este cliente'}? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', cliente.id));
              carregarClientes();
              Alert.alert('Sucesso', 'Cliente removido com sucesso!');
            } catch (error) {
              console.error('Erro ao apagar cliente:', error);
              Alert.alert('Erro', 'Não foi possível apagar o cliente.');
            }
          },
        },
      ]
    );
  };

  const clientesFiltrados = clientes
    .filter((cliente) => {
      const termo = pesquisa.toLowerCase();
      return cliente.name && cliente.name.toLowerCase().includes(termo);
    })
    .sort((a, b) => {
      const dateA = a.dataCriacao instanceof Date ? a.dataCriacao.getTime() : new Date(0).getTime();
      const dateB = b.dataCriacao instanceof Date ? b.dataCriacao.getTime() : new Date(0).getTime();
      return dateB - dateA;
    });

  const renderItem = ({ item }) => {
    const iniciais = item.name && item.name.length > 0 ? item.name[0].toUpperCase() : '?';

    return (
      <TouchableOpacity
        style={[styles.card, GlobalStyles.cardShadow]}
        onPress={() => navigation.navigate('FichaCliente', { clienteId: item.id, clientename: item.name })}
        activeOpacity={0.8}
      >
        <View style={styles.headerCard}>
          <View style={styles.avatarCard}>
            <Text style={styles.avatarTextCard}>{iniciais}</Text>
          </View>
          <View style={styles.infoClienteContainer}>
            <Text style={styles.nameCard}>{item.name || 'Cliente Sem Nome'}</Text>
            <Text style={styles.emailCard}>{item.email}</Text>
            <Text style={styles.treinosCard}>
              <Ionicons name="barbell-outline" size={14} color={Colors.lightBrown} /> {item.totalTreinos} treinos atribuídos
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          {/* BOTÃO DE TREINOS */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.accentBlue }]}
            onPress={() =>
              navigation.navigate('TreinosCliente', {
                clienteId: item.id,
                clientename: item.name,
              })
            }
          >
            <Ionicons name="fitness-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Treinos</Text>
          </TouchableOpacity>

          {/* NOVO BOTÃO DE QUESTIONÁRIOS */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primaryGold }]}
            onPress={() =>
              navigation.navigate('RespostasQuestionario', {
                clienteId: item.id,
                clienteNome: item.name,
              })
            }
          >
            <Ionicons name="document-text-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Questionários</Text>
          </TouchableOpacity>
          
          {/* BOTÃO DE FICHA */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.lightBrown }]}
            onPress={() =>
              navigation.navigate('FichaCliente', {
                clienteId: item.id,
                clientename: item.name,
              })
            }
          >
            <Ionicons name="person-circle-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Ficha</Text>
          </TouchableOpacity>

          {/* BOTÃO DE REMOVER */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.errorRed }]}
            onPress={() => confirmarRemocao(item)}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Remover</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryGold} />
        <Text style={styles.loadingText}>A carregar clientes...</Text>
      </View>
    );
  }

  const searchHeaderProps = {
    pesquisa: pesquisa,
    setPesquisa: setPesquisa,
    clientesFiltradosCount: clientesFiltrados.length,
    showEmptyResults: clientesFiltrados.length === 0 && (pesquisa !== ''),
    emptyResultsText: "Nenhum cliente corresponde ao seu critério de pesquisa.",
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeaderPersonalizado title="Os Meus Alunos" />
      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentPadding}
        renderItem={renderItem}
        ListHeaderComponent={<SearchHeader {...searchHeaderProps} />}
        ListEmptyComponent={!loading && clientes.length === 0 && (
          <View style={styles.emptyResultsContainer}>
            <Ionicons name="people-outline" size={50} color={Colors.mediumGray} />
            <Text style={styles.emptyResultsText}>
              Ainda não há clientes registados.
            </Text>
            <TouchableOpacity
              style={[styles.addButton, GlobalStyles.shadow]}
              onPress={() => navigation.navigate('CadastroCliente')}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.buttonTextLight} />
              <Text style={styles.addButtonText}>Adicionar Primeiro Cliente</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  listContentPadding: {
    paddingBottom: 30,
    paddingTop: 10,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginHorizontal: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarCard: {
    backgroundColor: Colors.lightBrown,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: Colors.primaryGold,
  },
  avatarTextCard: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 24,
  },
  infoClienteContainer: {
    flex: 1,
  },
  nameCard: {
    fontWeight: '700',
    fontSize: 19,
    color: Colors.darkBrown,
    marginBottom: 2,
  },
  emailCard: {
    color: Colors.mediumGray,
    fontSize: 14,
    marginBottom: 5,
  },
  treinosCard: {
    marginTop: 4,
    color: Colors.lightBrown,
    fontSize: 13,
    fontWeight: '500',
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    minWidth: (width - (20 * 2) - (8 * 3)) / 4, // Ajustado para 4 botões
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    color: Colors.buttonTextLight,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
    textAlign: 'center',
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    textAlign: 'center',
  },
  emptyResultsText: {
    fontSize: 17,
    color: Colors.mediumGray,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryGold,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 25,
  },
  addButtonText: {
    color: Colors.buttonTextLight,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
});