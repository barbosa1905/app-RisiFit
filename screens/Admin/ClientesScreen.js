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

// Paleta de Cores Refinada
const Colors = {
    primaryGold: '#D4AF37', // Ouro mais clássico
    darkBrown: '#3E2723',   // Marrom bem escuro, quase preto
    lightBrown: '#795548',  // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro
    mediumGray: '#B0BEC5',  // Cinza médio para textos secundários
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',  // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336',    // Vermelho para erros/alertas
    unreadBadge: '#EF5350', // Vermelho mais vibrante para badge de não lidas
};


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
          console.log('User details loaded:', docSnap.data());
        } else {
          console.warn('Usuário logado não é um administrador ou dados não encontrados.');
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
            dataCriacao: docUser.createTime?.toDate?.() || new Date(0),
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

    return () => {
      unsubscribeAdmin();
    };
  }, [fetchAdminInfo, carregarClientes]);

  const confirmarRemocao = (cliente) => {
    Alert.alert(
      'Remover cliente',
      `Tens a certeza que queres remover ${cliente.name || 'este cliente'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmação final',
              'Esta ação é irreversível. Queres mesmo apagar este cliente?',
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
        (filtroTipo === 'ComTreinos' && cliente.totalTreinos > 0);
      return (nameOk || emailOk) && tipoOk;
    })
    .sort((a, b) => {
      if (ordem === 'recente') {
        return b.dataCriacao.getTime() - a.dataCriacao.getTime();
      } else {
        return a.dataCriacao.getTime() - b.dataCriacao.getTime();
      }
    });

  const renderItem = ({ item }) => {
    const iniciais = item.name
      ? item.name
          .split(' ')
          .map((parte) => parte[0])
          .join('')
          .toUpperCase()
      : '👤';

    return (
      <View style={styles.card}>
        <View style={styles.headerCard}>
          <View style={styles.avatarCard}>
            <Text style={styles.avatarTextCard}>{iniciais}</Text>
          </View>
          <View>
            <Text style={styles.nameCard}>{item.name || 'Sem nome'}</Text>
            <Text style={styles.emailCard}>{item.email}</Text>
            <Text style={styles.treinosCard}>
              Treinos atribuídos: {item.totalTreinos}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('TreinosCliente', {
                clienteId: item.id,
                clientename: item.name,
              })
            }
          >
            <Text style={styles.buttonText}>📋 Ver Treinos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.navigate('FichaCliente', {
                clienteId: item.id,
              })
            }
          >
            <Text style={styles.buttonText}>📄 Ficha de Cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmarRemocao(item)}
          >
            <Text style={styles.buttonText}>🗑️ Remover</Text>
          </TouchableOpacity>
        </View>
      </View>
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
      {/* Barra Fixa Superior (Header - Otimizada) */}
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
          <Text style={styles.userNameText}>Olá, {adminDisplayName}</Text>
        </View>
      </View>

      <Text style={styles.total}>
        👥 {clientesFiltrados.length} clientes encontrados
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Procurar por nome ou email"
        value={pesquisa}
        onChangeText={setPesquisa}
      />

      <View style={styles.filtros}>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            filtroTipo === 'Todos' && styles.filtroAtivo,
          ]}
          onPress={() => setFiltroTipo('Todos')}
        >
          <Text>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            filtroTipo === 'ComTreinos' && styles.filtroAtivo,
          ]}
          onPress={() => setFiltroTipo('ComTreinos')}
        >
          <Text>Com Treinos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroBtn,
            ordem === 'recente' && styles.filtroAtivo,
          ]}
          onPress={() => setOrdem('recente')}
        >
          <Text>Mais Recentes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            ordem === 'antigo' && styles.filtroAtivo,
          ]}
          onPress={() => setOrdem('antigo')}
        >
          <Text>Mais Antigos</Text>
        </TouchableOpacity>
      </View>

      {clientesFiltrados.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Nenhum cliente corresponde à pesquisa.
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
        />
      )}
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
    marginTop: 10,
    fontSize: 16,
    color: Colors.darkBrown,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8, // Reduzido de 10 para 8
    backgroundColor: Colors.primaryGold,
    borderBottomWidth: 0,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 2 : 0, // Reduzido de 5 para 2
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  headerLogo: {
    width: 40, // Reduzido de 50 para 40
    height: 40, // Reduzido de 50 para 40
    borderRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38, // Reduzido de 44 para 38
    height: 38, // Reduzido de 44 para 38
    borderRadius: 19, // Ajustado para ser metade da nova altura/largura
    backgroundColor: Colors.darkBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18, // Reduzido de 20 para 18
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 16, // Reduzido de 17 para 16
    fontWeight: '600',
    color: Colors.white,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 20,
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 8,
    color: '#000',
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    fontSize: 15,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filtroBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  filtroAtivo: {
    backgroundColor: '#d0a956',
    borderColor: '#d0a956',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#d0a956',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCard: {
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarTextCard: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  nameCard: {
    fontWeight: '600',
    fontSize: 18,
    color: '#111827',
  },
  emailCard: {
    color: '#6b7280',
    fontSize: 14,
  },
  treinosCard: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 6,
    flex: 1,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 6,
    flex: 1,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 6,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
