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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CriarQuestionarioScreen from './CriarQuestionarioScreen';
export default function PerfilAdminScreen() {

  const { user } = useUser();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();
  const [fotoPerfil, setFotoPerfil] = useState(null);

  useFocusEffect(
    useCallback(() => {
      const fetchAdminData = async () => {
        try {
          setLoading(true);
          const refDoc = doc(db, 'users', user.uid);
          const snapshot = await getDoc(refDoc);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setAdminData(data);
            setFotoPerfil(data.fotoPerfil || null);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do admin:', error);
        } finally {
          setLoading(false);
        }
      };

      if (user?.uid) {
        fetchAdminData();
      }
    }, [user?.uid])
  );

 const handleSelecionarFoto = async () => {
     const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
     if (status !== 'granted') {
       Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para selecionar uma imagem.');
       return;
     }
 
     const result = await ImagePicker.launchImageLibraryAsync({
       mediaTypes: ImagePicker.MediaTypeOptions.Images,
       allowsEditing: true,
       aspect: [1, 1],
       quality: 1,
     });
 
     if (!result.canceled) {
       setFotoPerfil(result.assets[0].uri);
     }
   };
 

  const handleLogout = () => {
  Alert.alert(
    'Terminar sessão',
    'Tens a certeza que queres sair?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          // Executa o logout de forma assíncrona
          const performLogout = async () => {
            try {
              await signOut(auth);

              // Redefine a navegação e envia o utilizador para a tela de login
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
          };

          performLogout();
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

  const handleAbrirQuestionario = () => {
    navigation.navigate('SalvarQuestionario');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text style={{ marginTop: 10 }}>A carregar dados do administrador...</Text>
      </View>
    );
  }

  if (!adminData) {
    return (
      <View style={styles.container}>
        <Text style={styles.nome}>Administrador não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleSelecionarFoto} style={styles.avatarContainer}>
        {uploading ? (
          <ActivityIndicator size="large" color="#d0a956" />
        ) : (
          <Image
            source={
              fotoPerfil
                ? { uri: fotoPerfil }
                : require('../../assets/default-avatar.png')
            }
            style={styles.avatar}
          />
        )}
        <Text style={styles.trocarFotoTexto}>📷 Trocar Foto</Text>
      </TouchableOpacity>

      <Text style={styles.nome}>{adminData.nome || 'Sem nome'}</Text>
      <Text style={styles.info}>Email: {user.email}</Text>
      <Text style={styles.info}>ID: {user.uid}</Text>
      <Text style={styles.info}>Função: {adminData.role || 'admin'}</Text>

      <TouchableOpacity style={styles.botao} onPress={irParaCadastroCliente}>
        <Text style={styles.botaoTexto}>➕ Cadastrar Novo Cliente</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botao}
        onPress={() => navigation.navigate('CriarAvaliacao')}
      >
        <Text style={styles.botaoTexto}>📝 Criar Nova Avaliação</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botao} onPress={handleEditarPerfil}>
        <Text style={styles.botaoTexto}>✏️ Editar Perfil</Text>
      </TouchableOpacity>

    

<TouchableOpacity
  style={styles.botao}
  onPress={() => navigation.navigate('ListarQuestionarios')}
>
  <Text style={styles.botaoTexto}>🛠️ Questionários</Text>
</TouchableOpacity>
      

      <TouchableOpacity style={[styles.botao, styles.logout]} onPress={handleLogout}>
        <Text style={[styles.botaoTexto, { color: '#000' }]}>🚪 Terminar Sessão</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff8e1', // tom creme suave
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#b38600', // dourado escuro
    shadowColor: '#b38600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  trocarFotoTexto: {
    marginTop: 10,
    color: '#8c6d00', // dourado médio
    fontWeight: '600',
    fontSize: 14,
  },
  nome: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4b3b00', // marrom escuro para bom contraste
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#6b5a00', // dourado escuro suave
    marginBottom: 4,
    textAlign: 'center',
  },
  botao: {
    width: '100%',
    marginTop: 12,
    backgroundColor: '#d0a956', // dourado principal
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#a17f00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  botaoTexto: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff8dc', // branco creme para contraste no botão
  },
  logout: {
    marginTop: 25,
    backgroundColor: '#a35400', // tom laranja escuro para logout (alerta suave)
  },
});
