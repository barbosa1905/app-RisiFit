import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { db } from '../services/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export default function FormNota({ date, onCancel, onClose }) {
  const [texto, setTexto] = useState('');
  const [importancia, setImportancia] = useState('media');

  const guardarNota = async () => {
    await addDoc(collection(db, 'notas'), {
      data: date,
      tipo: 'nota',
      texto,
      importancia
    });
    onClose();
  };

  return (
    <View>
      <Text>Nota:</Text>
      <TextInput value={texto} onChangeText={setTexto} placeholder="Escreve a nota..." />
      <Text>Importância:</Text>
      <Button title="Baixa" onPress={() => setImportancia('baixa')} />
      <Button title="Média" onPress={() => setImportancia('media')} />
      <Button title="Alta" onPress={() => setImportancia('alta')} />
      <Button title="Guardar" onPress={guardarNota} />
      <Button title="Cancelar" onPress={onCancel} />
    </View>
  );
}
