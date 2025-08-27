// screens/BookingForm.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import dayjs from 'dayjs';
import { createBooking } from '../services/bookings';

export default function BookingForm({ route, navigation }) {
  // se vieres da página do cliente, podes receber o ID por params
  const defaultClientId = route?.params?.clientId ?? '';
  const [clientId, setClientId] = useState(defaultClientId);
  const [startISO, setStartISO] = useState(dayjs().add(1, 'hour').startOf('hour').toISOString());
  const [endISO, setEndISO] = useState(dayjs().add(2, 'hour').startOf('hour').toISOString());
  const [notes, setNotes] = useState('');

  const onSubmit = async () => {
    try {
      if (!clientId) throw new Error('Escolhe/indica o ID do cliente');
      const start = new Date(startISO).getTime();
      const end   = new Date(endISO).getTime();
      await createBooking({ clientId, start, end, notes });
      Alert.alert('Sucesso', 'Marcação criada!', [
        { text: 'OK', onPress: () => navigation?.goBack?.() },
      ]);
    } catch (e) {
      if (e.code === 'already-exists') {
        Alert.alert('Conflito', 'Já existe uma marcação neste período.');
      } else if (e.code === 'unauthenticated') {
        Alert.alert('Sessão', 'Inicia sessão primeiro.');
      } else if (e.code === 'invalid-argument') {
        Alert.alert('Dados inválidos', 'Verifica cliente e horários.');
      } else {
        Alert.alert('Erro', e.message || 'Não foi possível criar a marcação.');
      }
    }
  };

  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>Nova Marcação</Text>

      <Text>Cliente (ID)</Text>
      <TextInput value={clientId} onChangeText={setClientId}
        placeholder="ex.: abc123"
        style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />

      <Text>Início (ISO)</Text>
      <TextInput value={startISO} onChangeText={setStartISO}
        placeholder="YYYY-MM-DDTHH:mm:ssZ"
        style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />

      <Text>Fim (ISO)</Text>
      <TextInput value={endISO} onChangeText={setEndISO}
        placeholder="YYYY-MM-DDTHH:mm:ssZ"
        style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />

      <Text>Notas</Text>
      <TextInput value={notes} onChangeText={setNotes}
        style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:10 }} />

      <TouchableOpacity onPress={onSubmit}
        style={{ backgroundColor:'#111', padding:12, borderRadius:8, marginTop:8 }}>
        <Text style={{ color:'#fff', textAlign:'center' }}>Marcar</Text>
      </TouchableOpacity>
    </View>
  );
}
