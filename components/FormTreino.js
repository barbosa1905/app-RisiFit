import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export default function FormTreino({ date, onCancel, onClose }) {
  const [cliente, setCliente] = useState('');
  const [hora, setHora] = useState('');
  const [tipo, setTipo] = useState('');
  const [obs, setObs] = useState('');

  const guardarTreino = async () => {
    await addDoc(collection(db, 'eventos'), {
      data: date,
      tipo: 'treino',
      cliente,
      hora,
      tipoTreino: tipo,
      observacoes: obs
    });
    onClose();
  };

  return (
    <View>
      <Text>Cliente:</Text>
      <TextInput value={cliente} onChangeText={setCliente} placeholder="Nome do cliente" />
      <Text>Hora:</Text>
      <TextInput value={hora} onChangeText={setHora} placeholder="Ex: 14:30" />
      <Text>Tipo:</Text>
      <TextInput value={tipo} onChangeText={setTipo} placeholder="Cardio, Força, etc." />
      <Text>Observações:</Text>
      <TextInput value={obs} onChangeText={setObs} />
      <Button title="Guardar" onPress={guardarTreino} />
      <Button title="Cancelar" onPress={onCancel} />
    </View>
  );
}
