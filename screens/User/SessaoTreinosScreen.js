import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { buscarTreinosDoUser } from '../../services/userService';

export default function SessaoTreinosScreen() {
  const { user } = useUser();
  const route = useRoute();
  const navigation = useNavigation();
  const { data } = route.params;
  const [exercicios, setExercicios] = useState([]);
  const [concluidos, setConcluidos] = useState([]);

  useEffect(() => {
    async function carregarTreino() {
      const lista = await buscarTreinosDoUser(user.uid);
      const treino = lista.find(t => t.data === data);

      if (treino && Array.isArray(treino.exercicios)) {
        setExercicios(treino.exercicios);
      } else {
        Alert.alert('Treino não encontrado ou sem exercícios.');
        navigation.goBack();
      }
    }

    carregarTreino();
  }, []);

  const toggleConcluido = (i) => {
    setConcluidos((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const finalizarTreino = () => {
    Alert.alert('✅ Treino concluído!', 'Bom trabalho 💪', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const renderItem = ({ item, index }) => {
    if (typeof item !== 'string') return null;

    return (
      <TouchableOpacity
        style={[
          styles.exercicioBox,
          concluidos.includes(index) && styles.exercicioConcluido,
        ]}
        onPress={() => toggleConcluido(index)}
      >
        <Text style={styles.exercicioTexto}>
          {concluidos.includes(index) ? '✅ ' : '▫️ '}
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏋️ Sessão de Treino</Text>
      <FlatList
        data={exercicios}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <TouchableOpacity
        style={[
          styles.finalizarBtn,
          concluidos.length !== exercicios.length && styles.finalizarBtnDesativado,
        ]}
        onPress={finalizarTreino}
        disabled={concluidos.length !== exercicios.length}
      >
        <Text style={styles.finalizarTexto}>
          {concluidos.length === exercicios.length
            ? '✅ Finalizar Treino'
            : 'Conclui todos os exercícios'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#222',
  },
  exercicioBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#2563eb',
  },
  exercicioConcluido: {
    backgroundColor: '#d1fae5',
    borderLeftColor: '#22c55e',
  },
  exercicioTexto: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  finalizarBtn: {
    marginTop: 20,
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  finalizarBtnDesativado: {
    backgroundColor: '#ccc',
  },
  finalizarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
