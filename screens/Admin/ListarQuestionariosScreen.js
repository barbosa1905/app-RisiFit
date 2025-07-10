import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';


export default function ListarQuestionariosScreen() {
  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const adminId = auth.currentUser?.uid;

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const carregarQuestionarios = async () => {
        try {
          if (!adminId) {
            Alert.alert('Erro', 'Admin não autenticado.');
            setLoading(false);
            return;
          }

          setLoading(true);
          const q = query(
            collection(db, 'admins', adminId, 'questionarios')
          );
          const snapshot = await getDocs(q);

          if (!isActive) return;

          const list = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          setQuestionarios(list);
        } catch (error) {
          console.error('Erro ao carregar questionários:', error);
          Alert.alert('Erro', 'Falha ao carregar questionários.');
        } finally {
          if (isActive) setLoading(false);
        }
      };

      carregarQuestionarios();

      return () => {
        isActive = false;
      };
    }, [adminId])
  );

  const handleExcluir = (questionarioId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este questionário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'admins', adminId, 'questionarios', questionarioId));
              setQuestionarios(prev =>
                prev.filter(q => q.id !== questionarioId)
              );
              Alert.alert('Sucesso', 'Questionário excluído.');
            } catch (error) {
              console.error('Erro ao excluir:', error);
              Alert.alert('Erro', 'Não foi possível excluir o questionário.');
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <Text style={styles.title}>{item.nome || item.id}</Text>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() =>
            navigation.navigate('CriarQuestionario', {
              questionario: item,
              adminId,
            })
          }
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>


        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={() => handleExcluir(item.id)}
        >
          <Text style={styles.buttonText}>Excluir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.viewButton]}
          onPress={() => navigation.navigate('RespostasQuestionario', { questionarioId: item.id })}
        >
          <Text style={styles.buttonText}>Ver Respostas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text>Carregando questionários...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {questionarios.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum questionário encontrado.</Text>
      ) : (
        <FlatList
          data={questionarios}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate('CriarQuestionario')}
      >
        <Text style={styles.newButtonText}>+ Criar Novo Questionário</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  itemContainer: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f0f0e8',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: { backgroundColor: '#4caf50' },
  deleteButton: { backgroundColor: '#e53935' },
  viewButton: { backgroundColor: '#2196f3' },
  buttonText: { color: '#fff', fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#666' },
  newButton: {
    backgroundColor: '#d0a956',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  newButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
