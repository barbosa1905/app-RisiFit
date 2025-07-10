import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { db } from '../../services/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function ListarQuestionariosUserScreen() {
  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const carregarQuestionarios = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'questionariosPublicos'));
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setQuestionarios(lista);
      } catch (error) {
        console.error('Erro ao buscar questionários públicos:', error);
        Alert.alert('Erro', 'Não foi possível carregar os questionários.');
      } finally {
        setLoading(false);
      }
    };

    carregarQuestionarios();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('ResponderQuestionario', { questionarioId: item.id })
      }
    >
      <Text style={styles.titulo}>{item.nome || 'Sem título'}</Text>
      {item.descricao && <Text style={styles.descricao}>{item.descricao}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d0a956" />
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
    <View style={styles.container}>
      <Text style={styles.header}>Questionários Disponíveis</Text>
      <FlatList
        data={questionarios}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    backgroundColor: '#f9fafb',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d0a956',
    marginBottom: 20,
    textAlign: 'center',
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
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 30,
  },
  card: {
    padding: 16,
    backgroundColor: '#fefce8',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d0a956',
    marginBottom: 4,
  },
  descricao: {
    fontSize: 14,
    color: '#374151',
  },
});
