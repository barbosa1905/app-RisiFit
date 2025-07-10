import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export default function SessaoTreinosScreen() {
  const { user } = useUser();
  const route = useRoute();
  const navigation = useNavigation();
  const { data, index } = route.params;

  const [tempo, setTempo] = useState(0);
  const intervalRef = useRef(null);
  const [exercicios, setExercicios] = useState([]);
  const [treino, setTreino] = useState(null);

  useEffect(() => {
    const fetchTreino = async () => {
      try {
        const docRef = doc(db, 'treinos', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();
          const treinoSelecionado = dados[data][index];
          setTreino(treinoSelecionado);
          setExercicios(treinoSelecionado.exercicios || []);
        }
      } catch (err) {
        console.error('Erro ao carregar treino:', err);
      }
    };

    fetchTreino();

    // iniciar cronómetro
    intervalRef.current = setInterval(() => {
      setTempo((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60)
      .toString()
      .padStart(2, '0');
    const seg = (segundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
  };

  const concluirTreino = async () => {
    try {
      const ref = doc(db, 'treinos', user.uid);
      const snap = await getDoc(ref);
      const dados = snap.data();
      dados[data][index].feito = true;
      await setDoc(ref, dados);

      Alert.alert('✅ Treino concluído', 'Bom trabalho!');
      navigation.goBack();
    } catch (err) {
      console.error('Erro ao concluir treino:', err);
    }
  };

  if (!treino) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>A iniciar treino...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.nomeTreino}>{treino.nome}</Text>
        <Text style={styles.timer}>{formatarTempo(tempo)}</Text>
      </View>

      <Text style={styles.subtitulo}>Exercícios:</Text>
      <FlatList
        data={exercicios}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => (
          <Text style={styles.item}>• {item}</Text>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>Sem exercícios atribuídos.</Text>
        }
      />

      <TouchableOpacity style={styles.btn} onPress={concluirTreino}>
        <Text style={styles.btnText}>✅ Concluir Treino</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F0F4F8',
  },
  loading: {
    textAlign: 'center',
    marginTop: 30,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  nomeTreino: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  timer: {
    fontSize: 18,
    color: '#3478f6',
    fontWeight: '600',
  },
  subtitulo: {
    fontSize: 16,
    marginBottom: 8,
    color: '#444',
  },
  item: {
    fontSize: 15,
    paddingVertical: 4,
    color: '#333',
  },
  vazio: {
    fontStyle: 'italic',
    color: '#888',
    marginTop: 10,
  },
  btn: {
    marginTop: 30,
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});