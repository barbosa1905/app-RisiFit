import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ClientesScreen() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [ordem, setOrdem] = useState('recente');
  const navigation = useNavigation();
  const route = useRoute();

  const carregarClientes = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

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
                    } catch (error) {
                      console.error('Erro ao apagar cliente:', error);
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
        return b.dataCriacao - a.dataCriacao;
      } else {
        return a.dataCriacao - b.dataCriacao;
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
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{iniciais}</Text>
          </View>
          <View>
            <Text style={styles.name}>{item.name || 'Sem nome'}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.treinos}>
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff8e1' }}>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingTop: 20,
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
  },
  filtroAtivo: {
    backgroundColor: '#d0a956',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    backgroundColor: '#d0a956',
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
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  name: {
    fontWeight: '600',
    fontSize: 18,
    color: '#111827',
  },
  email: {
    color: '#6b7280',
    fontSize: 14,
  },
  treinos: {
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
