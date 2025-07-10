import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import {
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function EditarPerfilAdmin() {
  const { user } = useUser();
  const navigation = useNavigation();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(user.email);
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [passwordAtual, setPasswordAtual] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const ref = doc(db, 'users', user.uid);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setNome(data.nome || '');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) {
      carregarDados();
    }
  }, [user?.uid]);

  const reautenticar = async () => {
    const credenciais = EmailAuthProvider.credential(user.email, passwordAtual);
    await reauthenticateWithCredential(auth.currentUser, credenciais);
  };

  const guardarAlteracoes = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio.');
      return;
    }

    if ((novaPassword || email !== user.email) && !passwordAtual) {
      Alert.alert('Autenticação necessária', 'Introduz a tua palavra-passe atual para confirmar.');
      return;
    }

    if (novaPassword && novaPassword !== confirmarPassword) {
      Alert.alert('Erro', 'As palavras-passe não coincidem.');
      return;
    }

    try {
      if (novaPassword || email !== user.email) {
        await reautenticar();
      }

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { nome });

      if (email !== user.email) {
        await updateEmail(auth.currentUser, email);
      }

      if (novaPassword) {
        await updatePassword(auth.currentUser, novaPassword);
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso.');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil. Verifica a palavra-passe atual.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>A carregar perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nome</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome do administrador"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Nova Palavra-passe</Text>
      <TextInput
        style={styles.input}
        value={novaPassword}
        onChangeText={setNovaPassword}
        placeholder="Nova palavra-passe"
        secureTextEntry
      />

      <Text style={styles.label}>Confirmar Palavra-passe</Text>
      <TextInput
        style={styles.input}
        value={confirmarPassword}
        onChangeText={setConfirmarPassword}
        placeholder="Confirmar palavra-passe"
        secureTextEntry
      />

      {(novaPassword || email !== user.email) && (
        <>
          <Text style={styles.label}>Palavra-passe atual</Text>
          <TextInput
            style={styles.input}
            value={passwordAtual}
            onChangeText={setPasswordAtual}
            placeholder="Palavra-passe atual"
            secureTextEntry
          />
        </>
      )}

      <TouchableOpacity style={styles.botao} onPress={guardarAlteracoes}>
        <Text style={styles.botaoTexto}>💾 Guardar Alterações</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  botao: {
    backgroundColor: '#d0a956',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});