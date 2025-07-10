import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function EditarTreinoScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { clienteId, treino, reloadTreinos } = route.params;

  const [nome, setNome] = useState(treino.nome || '');
  const [data, setData] = useState(
    treino.data
      ? treino.data.toDate
        ? treino.data.toDate()
        : new Date(treino.data)
      : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exercicios, setExercicios] = useState(treino.exercicios || []);

  const onChangeData = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setData(selectedDate);
  };

  const adicionarExercicio = () => {
    setExercicios([
      ...exercicios,
      { nome: '', series: '', tipo: 'reps', valor: '' },
    ]);
  };

  const atualizarExercicio = (index, campo, valor) => {
    const copia = [...exercicios];
    copia[index][campo] = valor;
    setExercicios(copia);
  };

  const removerExercicio = (index) => {
    Alert.alert('Remover exercício', 'Tem certeza que deseja remover este exercício?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          const copia = [...exercicios];
          copia.splice(index, 1);
          setExercicios(copia);
        },
      },
    ]);
  };

  const salvarTreino = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do treino não pode estar vazio.');
      return;
    }

    for (const [i, ex] of exercicios.entries()) {
      if (!ex.nome.trim()) {
        Alert.alert('Erro', `O nome do exercício ${i + 1} está vazio.`);
        return;
      }
      if (!ex.series.trim() || isNaN(Number(ex.series)) || Number(ex.series) <= 0) {
        Alert.alert('Erro', `Séries inválidas no exercício ${i + 1}.`);
        return;
      }
      if (!ex.tipo || (ex.tipo !== 'reps' && ex.tipo !== 'tempo')) {
        Alert.alert('Erro', `Tipo inválido no exercício ${i + 1}.`);
        return;
      }
      if (!ex.valor.trim() || isNaN(Number(ex.valor)) || Number(ex.valor) <= 0) {
        Alert.alert('Erro', `Valor inválido no exercício ${i + 1}.`);
        return;
      }
    }

    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treino.id);
      await updateDoc(treinoRef, {
        nome: nome.trim(),
        data,
        exercicios,
      });

      Alert.alert('Sucesso', 'Treino atualizado!');
      if (reloadTreinos) reloadTreinos();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar treino.');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Nome do Treino</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome do treino"
      />

      <Text style={styles.label}>Data do Treino</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePicker}>
        <Text>{data.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={data}
          mode="date"
          display="default"
          onChange={onChangeData}
          minimumDate={new Date()}
        />
      )}

      <Text style={[styles.label, { marginTop: 20 }]}>Exercícios</Text>

      {exercicios.map((exercicio, index) => (
        <View key={index} style={styles.exercicioCard}>
          <TextInput
            style={styles.input}
            placeholder="Nome do exercício"
            value={exercicio.nome}
            onChangeText={(text) => atualizarExercicio(index, 'nome', text)}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Séries"
              keyboardType="numeric"
              value={exercicio.series}
              onChangeText={(text) => atualizarExercicio(index, 'series', text)}
            />
          </View>

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.tipoOption,
                exercicio.tipo === 'reps' && styles.tipoSelecionado,
              ]}
              onPress={() => atualizarExercicio(index, 'tipo', 'reps')}
            >
              <Text
                style={[
                  styles.tipoTexto,
                  exercicio.tipo === 'reps' && styles.tipoTextoSelecionado,
                ]}
              >
                Repetições
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tipoOption,
                exercicio.tipo === 'tempo' && styles.tipoSelecionado,
              ]}
              onPress={() => atualizarExercicio(index, 'tipo', 'tempo')}
            >
              <Text
                style={[
                  styles.tipoTexto,
                  exercicio.tipo === 'tempo' && styles.tipoTextoSelecionado,
                ]}
              >
                Tempo
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder={
              exercicio.tipo === 'tempo'
                ? 'Tempo em segundos'
                : 'Quantidade de repetições'
            }
            value={exercicio.valor}
            onChangeText={(text) => atualizarExercicio(index, 'valor', text)}
          />

          <TouchableOpacity
            style={styles.removerBtn}
            onPress={() => removerExercicio(index)}
          >
            <Text style={{ color: 'white' }}>Remover</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Button title="Adicionar Exercício" onPress={adicionarExercicio} color="#000" />

      <View style={{ marginTop: 30 }}>
        <Button title="Salvar Treino" onPress={salvarTreino} color="#d0a956" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  label: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 16,
    color: '#111827',
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    marginBottom: 12,
  },
  datePicker: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  exercicioCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  smallInput: {
    flex: 1,
    marginRight: 8,
  },
  removerBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  tipoOption: {
    flex: 1,
    padding: 10,
    backgroundColor: '#0018',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  tipoSelecionado: {
    backgroundColor: '#d0a956',
  },
  tipoTexto: {
    color: '#1f2937',
    fontWeight: '500',
  },
  tipoTextoSelecionado: {
    color: 'white',
  },
});
