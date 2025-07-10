import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons'; // se usar Expo, ou troque o pacote de ícones

export default function FichaClienteScreen({ route }) {
  const { clienteId } = route.params;
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarCliente = async () => {
      try {
        const docRef = doc(db, 'users', clienteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCliente(docSnap.data());
        } else {
          setCliente(null);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarCliente();
  }, [clienteId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Cliente não encontrado.</Text>
      </View>
    );
  }

  // Função para formatar data (caso esteja em Timestamp do Firestore)
  const formatarData = (data) => {
    if (!data) return 'Não informado';
    if (data.seconds) return new Date(data.seconds * 1000).toLocaleDateString();
    return data;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ficha do Cliente</Text>

      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="person" size={24} color="#d0a956" />
          <Text style={styles.label}>Nome</Text>
        </View>
        <Text style={styles.value}>{cliente.name || 'Não informado'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="email" size={24} color="#d0a956" />
          <Text style={styles.label}>Email</Text>
        </View>
        <Text style={styles.value}>{cliente.email || 'Não informado'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="phone" size={24} color="#d0a956" />
          <Text style={styles.label}>Telefone</Text>
        </View>
        <Text style={styles.value}>{cliente.telefone || 'Não informado'}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="cake" size={24} color="#d0a956" />
          <Text style={styles.label}>Data de Nascimento</Text>
        </View>
        <Text style={styles.value}>{formatarData(cliente.dataNascimento)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#d0a956',
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 28,
    color: '#111827',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#111827',
  },
  value: {
    fontSize: 17,
    color: '#374151',
    paddingLeft: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#111827',
  },
});
