import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';

export default function RegistoClienteScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // no Android fecha automaticamente
    if (selectedDate) {
      setDataNascimento(selectedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-'); // formato YYYY-MM-DD
  };

  const handleRegister = async () => {
    if (!email || !senha || !nome) {
      Alert.alert('Erro', 'Por favor preencha todos os campos obrigatórios.');
      return;
    }

    try {
        const adminId = auth.currentUser.uid;  // Guarda o ID do admin antes de criar o novo user
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const userId = userCredential.user.uid;

      await setDoc(doc(db, 'users', userId), {
        email,
        name: nome,
        role: 'user',
        telefone,
        dataNascimento: dataNascimento ? formatDate(dataNascimento) : '',
            adminId: adminId, 
      });

      Alert.alert('Sucesso', 'Cliente registado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao registar cliente:', error);
      Alert.alert('Erro', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registar Novo Cliente</Text>

      <TextInput
        style={styles.input}
        placeholder="📛 Nome completo"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="📧 Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="🔒 Palavra-passe"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="📞 Telefone (ex: 912345678)"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
      />

      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: dataNascimento ? '#000' : '#888' }}>
          {dataNascimento ? formatDate(dataNascimento) : '🎂 Selecionar Data de Nascimento'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dataNascimento || new Date(1990, 0, 1)}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()} // não pode ser data futura
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registar Cliente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  dateInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#d0a956',
    fontWeight: '600',
    fontSize: 16,
  },
});
