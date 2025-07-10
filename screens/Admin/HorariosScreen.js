import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const horariosDisponiveis = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

export default function HorariosScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { data, clienteId, clientename } = route.params;

  const [horarioSelecionado, setHorarioSelecionado] = useState(null);

  const selecionarHorario = (horario) => {
    setHorarioSelecionado(horario);
  };

  const confirmarHorario = () => {
    if (!horarioSelecionado) return;

    navigation.navigate('SessaoTreinos', {
      data,
      clienteId,
      clientename,
      horario: horarioSelecionado,
    });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.horarioBox,
        item === horarioSelecionado && styles.horarioSelecionado,
      ]}
      onPress={() => selecionarHorario(item)}
    >
      <Text style={styles.horarioTexto}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {`Seleciona o horário para ${clientename} em ${data}`}
      </Text>

      <FlatList
        data={horariosDisponiveis}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 20 }}
      />

      <TouchableOpacity
        style={[styles.botaoConfirmar, !horarioSelecionado && styles.botaoDesativado]}
        onPress={confirmarHorario}
        disabled={!horarioSelecionado}
      >
        <Text style={styles.textoBotao}>Confirmar Horário</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F0F4F8' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 20, color: '#222' },
  horarioBox: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  horarioSelecionado: {
    borderColor: '#22c55e',
    backgroundColor: '#d1fae5',
  },
  horarioTexto: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  botaoConfirmar: {
    marginTop: 30,
    backgroundColor: '#22c55e',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  botaoDesativado: {
    backgroundColor: '#ccc',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
