import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export default function FormAvaliacao({ date, onCancel, onClose }) {
  const [cliente, setCliente] = useState('');
  const [hora  , setHora] = useState('');
  const [tipo, setTipo] = useState('');
  const [obs, setObs] = useState('');

  const guardarAvaliacao = async () => {
    await addDoc(collection(db, 'eventos'), {
      data: date,
      tipo: 'avaliacao',   
      cliente,
      hora,
      tipoAvaliacao: tipo,
      observacoes: obs
    });
    onClose();
  };

  return (
    <View>
      <Text>Cliente:</Text>
      <TextInput value={cliente} onChangeText={setCliente} placeholder="Nome do cliente" />
      <Text>Hora:</Text>
      <TextInput value={hora} onChangeText={setHora} placeholder="Ex: 16:00" />
      <Text>Tipo:</Text>
      <TextInput value={tipo} onChangeText={setTipo} placeholder="Bioimpedância, Força..." />
      <Text>Observações:</Text>
      <TextInput value={obs} onChangeText={setObs} />
      <Button title="Guardar" onPress={guardarAvaliacao} />
      <Button title="Cancelar" onPress={onCancel} />
    </View>
  );
}
  