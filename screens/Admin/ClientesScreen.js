import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
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
import { Ionicons } from '@expo/vector-icons'; // Importar ícones

// Paleta de Cores Refinada
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

const { width } = Dimensions.get('window');

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [ordem, setOrdem] = useState('recente');
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
      return () => {};
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
      const nameOk =
        cliente.name && cliente.name.toLowerCase().includes(termo);
      const emailOk =
        cliente.email && cliente.email.toLowerCase().includes(termo);
      const tipoOk =
        filtroTipo === 'Todos' ||
        (filtroTipo === 'ComTreinos' && cliente.totalTreinos > 0) ||
        (filtroTipo === 'SemTreinos' && cliente.totalTreinos === 0);
      return (nameOk || emailOk) && tipoOk;
    })
    .sort((a, b) => {
      const dateA = a.dataCriacao instanceof Date ? a.dataCriacao.getTime() : new Date(0).getTime();
      const dateB = b.dataCriacao instanceof Date ? b.dataCriacao.getTime() : new Date(0).getTime();

      if (ordem === 'recente') {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });


  const renderItem = ({ item }) => {
    const iniciais = item.name
      ? item.name
          .split(' ')
          .map((parte) => parte[0])
          .join('')
          .toUpperCase()
      : '??';

    return (
      <TouchableOpacity
        style={styles.card}
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
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primaryGold }]}
            onPress={() =>
              navigation.navigate('TreinosCliente', {
                clienteId: item.id,
                clientename: item.name,
              })
            }
          >
            <Ionicons name="fitness-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Ver Treinos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.lightBrown }]}
            onPress={() =>
              navigation.navigate('FichaCliente', {
                clienteId: item.id,
                clientename: item.name,
              })
            }
          >
            <Ionicons name="document-text-outline" size={18} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Ver Ficha</Text>
          </TouchableOpacity>

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

  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Fixa Superior (Header) */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo.jpeg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{adminInitial}</Text>
          </View>
          <Text style={styles.userNameText}>Olá, {adminDisplayName.split(' ')[0]}</Text>
        </View>
      </View>

      <FlatList
        data={clientesFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View>
            {/* Contagem de Clientes - Agora sem margin horizontal */}
            <View style={styles.totalClientsContainer}>
              <Text style={styles.totalClientsText}>
                <Ionicons name="people-outline" size={20} color={Colors.darkBrown} /> {clientesFiltrados.length} clientes encontrados
              </Text>
            </View>

            {/* Campo de Pesquisa - Agora sem margin horizontal */}
            <View style={styles.searchInputContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="🔍 Pesquisar por nome ou email..."
                  placeholderTextColor={Colors.mediumGray}
                  value={pesquisa}
                  onChangeText={setPesquisa}
                />
            </View>


            {/* Filtros e Ordenação (Compactos e Horizontais) - Agora sem margin horizontal */}
            <View style={styles.filterSortRow}>
              <Text style={styles.filterSortLabel}>Filtrar:</Text>
              <View style={styles.filterButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterButtonCompact,
                    filtroTipo === 'Todos' && styles.filterButtonActiveCompact,
                  ]}
                  onPress={() => setFiltroTipo('Todos')}
                >
                  <Text style={[styles.filterButtonTextCompact, filtroTipo === 'Todos' && styles.filterButtonTextActiveCompact]}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButtonCompact,
                    filtroTipo === 'ComTreinos' && styles.filterButtonActiveCompact,
                  ]}
                  onPress={() => setFiltroTipo('ComTreinos')}
                >
                  <Text style={[styles.filterButtonTextCompact, filtroTipo === 'ComTreinos' && styles.filterButtonTextActiveCompact]}>Com Treinos</Text>
                </TouchableOpacity>
                 <TouchableOpacity
                  style={[
                    styles.filterButtonCompact,
                    filtroTipo === 'SemTreinos' && styles.filterButtonActiveCompact,
                  ]}
                  onPress={() => setFiltroTipo('SemTreinos')}
                >
                  <Text style={[styles.filterButtonTextCompact, filtroTipo === 'SemTreinos' && styles.filterButtonTextActiveCompact]}>Sem Treinos</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.filterSortLabel}>Ordenar:</Text>
              <View style={styles.filterButtonGroup}>
                <TouchableOpacity
                  style={[
                    styles.filterButtonCompact,
                    ordem === 'recente' && styles.filterButtonActiveCompact,
                  ]}
                  onPress={() => setOrdem('recente')}
                >
                  <Text style={[styles.filterButtonTextCompact, ordem === 'recente' && styles.filterButtonTextActiveCompact]}>Recentes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButtonCompact,
                    ordem === 'antigo' && styles.filterButtonActiveCompact,
                  ]}
                  onPress={() => setOrdem('antigo')}
                >
                  <Text style={[styles.filterButtonTextCompact, ordem === 'antigo' && styles.filterButtonTextActiveCompact]}>Antigos</Text>
                </TouchableOpacity>
              </View>
            </View>
             {clientesFiltrados.length === 0 && (
                <View style={styles.emptyResultsContainer}>
                  <Ionicons name="sad-outline" size={50} color={Colors.mediumGray} />
                  <Text style={styles.emptyResultsText}>
                    Nenhum cliente corresponde aos seus critérios de pesquisa/filtro.
                  </Text>
                </View>
              )}
          </View>
        )}
        ListEmptyComponent={!loading && clientes.length === 0 && (
            <View style={styles.emptyResultsContainer}>
                <Ionicons name="people-outline" size={50} color={Colors.mediumGray} />
                <Text style={styles.emptyResultsText}>
                    Ainda não há clientes registados.
                </Text>
                <TouchableOpacity
                    style={styles.addButton}
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.primaryGold,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 5,
  },
  headerLogo: {
    width: 45,
    height: 45,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.darkBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: '700',
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
  },

  // --- List Header Components (Search, Filters, Total) ---
  // Novo contêiner para o total de clientes
  totalClientsContainer: {
    width: '100%', // Ocupa a largura total
    backgroundColor: Colors.creamBackground, // Fundo transparente ou da tela
    paddingVertical: 20, // Mantém o padding vertical
    paddingHorizontal: 20, // Adiciona padding interno
    marginBottom: 15, // Mantém a margem inferior
  },
  totalClientsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkBrown,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Novo contêiner para a barra de pesquisa
  searchInputContainer: {
    width: '100%',
    backgroundColor: Colors.white, // Fundo branco
    paddingHorizontal: 20, // Adiciona padding interno
    paddingVertical: 12, // Mantém o padding vertical
    marginBottom: 20,
    borderRadius: 10, // Arredonda as bordas
    shadowColor: Colors.shadow, // Sombra
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginHorizontal: 0, // Remove a margem horizontal
  },
  searchInput: {
    // Estilos internos do TextInput
    flex: 1, // Ocupa o espaço disponível
    fontSize: 16,
    color: Colors.darkGray,
    padding: 0, // Remover padding interno do TextInput se já tiver no container
  },
  // Contêiner de filtros e ordenação - Alterado para ter padding interno
  filterSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 0, // Remove a margem horizontal
    marginBottom: 20,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15, // Adiciona padding interno
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterSortLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkBrown,
    marginRight: 8,
  },
  filterButtonGroup: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 15,
    paddingVertical: 5,
  },
  filterButtonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    backgroundColor: Colors.lightGray,
  },
  filterButtonActiveCompact: {
    backgroundColor: Colors.primaryGold,
    borderColor: Colors.primaryGold,
  },
  filterButtonTextCompact: {
    fontSize: 13,
    color: Colors.darkGray,
    fontWeight: '500',
  },
  filterButtonTextActiveCompact: {
    color: Colors.buttonTextLight,
    fontWeight: '700',
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  addButtonText: {
    color: Colors.buttonTextLight,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },

  // --- Client List & Cards ---
  listContainer: {
    paddingHorizontal: 20, // Mantém o padding para os cards
    paddingBottom: 30,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.lightGray,
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
    minWidth: (width - 40 - 16) / 3,
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
  },
});