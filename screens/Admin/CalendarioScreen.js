import React, { useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CalendarioScreen() {
  const navigation = useNavigation();
  const [data, setData] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      setData(selectedDate);
    }
  };

  const formatarData = (date) => {
    return date.toISOString().split('T')[0];
  };

  const irParaClientes = () => {
    navigation.navigate('Clientes', { data: formatarData(data) });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Escolhe a data do treino:</Text>
      <Button title="Selecionar Data" onPress={() => setShowPicker(true)} />
      {showPicker && (
        <DateTimePicker
          value={data}
          mode="date"
          display="calendar"
          onChange={onChange}
          minimumDate={new Date()}
        />
      )}
      <Text style={styles.dataSelecionada}>{formatarData(data)}</Text>

      <Button title="Próximo → Selecionar Cliente" onPress={irParaClientes} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, marginBottom: 10 },
  dataSelecionada: { fontSize: 22, fontWeight: '700', marginVertical: 20 },
});
