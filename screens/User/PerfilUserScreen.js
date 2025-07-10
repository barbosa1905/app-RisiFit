import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import ListarQuestionariosUserScreen from './ListarQuestionariosUserScreen';

export default function PerfilUserScreen() {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const refUser = doc(db, 'users', user.uid);
          const snapshot = await getDoc(refUser);
          if (snapshot.exists()) {
            setUserData(snapshot.data());
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do usuário:', error);
          Alert.alert('Erro', 'Não foi possível carregar os dados do usuário.');
          setUserData(null);
        } finally {
          setLoading(false);
        }
      };

      if (user?.uid) {
        setLoading(true);
        fetchUserData();
      }
    }, [user?.uid])
  );

  const handleLogout = () => {
    Alert.alert('Terminar sessão', 'Tens a certeza que queres sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            console.error('Erro ao terminar sessão:', error);
            Alert.alert('Erro', 'Não foi possível terminar a sessão.');
          }
        },
      },
    ]);
  };

  const handleAbrirQuestionario = () => {
    navigation.navigate('ListarQuestionariosUser');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text style={{ marginTop: 10 }}>A carregar dados do usuário...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.nome}>Usuário não encontrado</Text>
      </View>
    );
  }

  const inicial = (userData.nome || userData.name || 'Usuário').charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.inicial}>{inicial}</Text>
      </View>

      <Text style={styles.nome}>{userData.nome || userData.name || 'Sem nome'}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>📞 Telefone: {userData.telefone || 'Não fornecido'}</Text>
        <Text style={styles.cardText}>🎂 Data de Nascimento: {userData.dataNascimento || 'Não fornecida'}</Text>
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleAbrirQuestionario}>
        <Text style={[styles.botaoTexto, { color: '#fff' }]}>📝 Responder Questionário</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.botao, styles.logout]} onPress={handleLogout}>
        <Text style={[styles.botaoTexto, { color: '#dc2626' }]}>🚪 Terminar Sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    flexGrow: 1,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#d0a956',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  inicial: {
    fontSize: 64,
    color: '#fff',
    fontWeight: 'bold',
  },
  nome: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  cardText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 6,
  },
  botao: {
    width: '100%',
    backgroundColor: '#d0a956',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  logout: {
    backgroundColor: '#fee2e2',
  },
  botaoTexto: {
    fontWeight: '600',
    fontSize: 16,
  },
});
