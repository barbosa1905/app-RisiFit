// IMPORTS E USES COMO ANTES, só atualizei a navegação no botão de editar

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function TreinosDoClienteScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { clienteId, clientename } = route.params;

  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: `Treinos de ${clientename || 'Cliente'}` });
    carregarTreinos();
  }, []);

  async function carregarTreinos() {
    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const ref = collection(db, 'users', clienteId, 'treinos');
      const snapshot = await getDocs(ref);

      const filtrados = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(treino => {
          if (!treino.data) return false;
          const dataTreino = treino.data.toDate ? treino.data.toDate() : new Date(treino.data);
          return dataTreino >= hoje;
        });

      setTreinos(filtrados);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar os treinos.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function confirmarRemocao(treinoId) {
    Alert.alert(
      'Remover treino',
      'Tens a certeza que queres remover este treino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => apagarTreino(treinoId),
        },
      ]
    );
  }

  async function apagarTreino(treinoId) {
    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treinoId);
      await deleteDoc(treinoRef);
      carregarTreinos();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível apagar o treino.');
      console.error(error);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (treinos.length === 0) {
    return (
      <View style={styles.center}>
        <Text>Nenhum treino futuro encontrado.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const dataFormatada = (() => {
      if (!item.data) return 'Sem data';
      const d = item.data.toDate ? item.data.toDate() : new Date(item.data);
      return d.toLocaleDateString();
    })();

    return (
      <View style={styles.card}>
        <Text style={styles.treinoNome}>{item.nome || 'Treino sem nome'}</Text>
        <Text>Data: {dataFormatada}</Text>

        <View style={styles.botoesRow}>
          <TouchableOpacity
            style={styles.editarBtn}
            onPress={() =>
              navigation.navigate('EditarTreino', {
                clienteId,
                treino: item,
                reloadTreinos: carregarTreinos,
              })
            }
          >
            <Text style={styles.btnText}>✏️ Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.apagarBtn}
            onPress={() => confirmarRemocao(item.id)}
          >
            <Text style={styles.btnText}>🗑️ Apagar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={treinos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
   backgroundColor: '#fff8e1',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#d0a956',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  treinoNome: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111827',
  },
  botoesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  editarBtn: {
    backgroundColor: '#d0a956',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  apagarBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  btnText: {
    color: '#001',
    fontWeight: '600',
  },
});
