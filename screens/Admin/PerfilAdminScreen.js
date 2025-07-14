import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function PerfilAdminScreen() {
  const { user } = useUser();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const DEFAULT_AVATAR = require('../../assets/default-avatar.png');

  const fetchAdminData = useCallback(() => {
    async function getData() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setAdminData(data);
        } else {
          Alert.alert('Erro', 'Dados do administrador não encontrados.');
        }
      } catch (error) {
        console.error('Erro ao carregar dados do admin:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [user?.uid]);

  useFocusEffect(fetchAdminData);

  const handleLogout = () => {
    Alert.alert(
      'Terminar Sessão',
      'Tem a certeza que quer sair?',
      [
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
              Alert.alert(
                'Erro ao sair',
                'Ocorreu um problema ao terminar a sessão. Tente novamente.'
              );
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const irParaCadastroCliente = () => {
    navigation.navigate('CadastroCliente', { adminId: user.uid });
  };

  const handleEditarPerfil = () => {
    navigation.navigate('EditarPerfilAdmin');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b38600" />
        <Text style={styles.loadingText}>A carregar dados do administrador...</Text>
      </View>
    );
  }

  if (!adminData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Administrador não encontrado ou erro ao carregar.</Text>
        <TouchableOpacity onPress={fetchAdminData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image
          source={DEFAULT_AVATAR}
          style={styles.avatar}
        />
      </View>

      <Text style={styles.nome}>{adminData.nome || 'Sem nome'}</Text>
      <Text style={styles.info}>Email: {user?.email || 'N/A'}</Text>
      <Text style={styles.info}>ID: {user?.uid || 'N/A'}</Text>
      <Text style={styles.info}>Função: {adminData.role || 'Admin'}</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.botao} onPress={irParaCadastroCliente}>
          <Text style={styles.botaoTexto}>➕ Cadastrar Novo Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('CriarAvaliacao')}>
          <Text style={styles.botaoTexto}>📝 Criar Nova Avaliação</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={handleEditarPerfil}>
          <Text style={styles.botaoTexto}>✏️ Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('ListarQuestionarios')}>
          <Text style={styles.botaoTexto}>🛠️ Gerir Questionários</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.botao, styles.logoutButton]} onPress={handleLogout}>
        <Text style={[styles.botaoTexto, styles.logoutButtonText]}>🚪 Terminar Sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15, // Reduz o padding geral
    backgroundColor: '#FBF8F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FBF8F1',
  },
  loadingText: {
    marginTop: 8, // Reduz a margem
    color: '#6B5A00',
    fontSize: 15, // Fonte ligeiramente menor
  },
  errorText: {
    fontSize: 16, // Fonte ligeiramente menor
    color: '#D13E3E',
    marginBottom: 10, // Reduz a margem
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#D0A956',
    paddingVertical: 8, // Reduz o padding
    paddingHorizontal: 16, // Reduz o padding
    borderRadius: 6, // Raio menor
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15, // Fonte ligeiramente menor
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 15, // Reduz a margem vertical
  },
  avatar: {
    width: 120, // Avatar menor
    height: 120, // Avatar menor
    borderRadius: 60, // Ajusta o raio para ser um círculo
    borderWidth: 3, // Borda mais fina
    borderColor: '#D0A956',
    shadowColor: '#A17F00',
    shadowOffset: { width: 0, height: 3 }, // Sombra menos proeminente
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  nome: {
    fontSize: 24, // Nome menor
    fontWeight: '800',
    color: '#4B3B00',
    marginTop: 8, // Margem menor
    marginBottom: 5, // Margem menor
    textAlign: 'center',
  },
  info: {
    fontSize: 15, // Info menor
    color: '#6B5A00',
    marginBottom: 3, // Margem menor
    textAlign: 'center',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 15, // Margem menor
  },
  botao: {
    width: '100%',
    marginTop: 10, // Margem entre botões menor
    backgroundColor: '#D0A956',
    paddingVertical: 12, // Padding vertical do botão menor
    borderRadius: 10, // Raio menor
    alignItems: 'center',
    shadowColor: '#A17F00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  botaoTexto: {
    fontWeight: '700',
    fontSize: 16, // Texto do botão menor
    color: '#FFFFFF',
  },
  logoutButton: {
    marginTop: 25, // Margem maior, mas reduzida da original
    backgroundColor: '#A35400',
  },
  logoutButtonText: {
    color: '#FFECB3',
  },
});