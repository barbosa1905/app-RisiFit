import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import FormNota from './FormNota';
import FormTreino from './FormTreino';
import FormAvaliacao from './FormAvaliacao';

export default function ModalAgenda({ date, onClose }) {
  const [tipo, setTipo] = useState(null);

  return (
    <Modal isVisible={true} onBackdropPress={onClose}>
      <View style={styles.modal}>
        {!tipo ? (
          <>
            <Text style={styles.title}>📅 {date}</Text>
            <Button title="➕ Adicionar Nota" onPress={() => setTipo('nota')} />
            <Button title="🏋️ Agendar Treino" onPress={() => setTipo('treino')} />
            <Button title="🧪 Agendar Avaliação" onPress={() => setTipo('avaliacao')} />
          </>
        ) : tipo === 'nota' ? (
          <FormNota date={date} onCancel={() => setTipo(null)} onClose={onClose} />
        ) : tipo === 'treino' ? (
          <FormTreino date={date} onCancel={() => setTipo(null)} onClose={onClose} />
        ) : (
          <FormAvaliacao date={date} onCancel={() => setTipo(null)} onClose={onClose} />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center'
  }
});
