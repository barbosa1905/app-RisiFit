import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Altura da barra fixa do cabeçalho
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 90 : 80;

// Novas cores
const COLORS = {
  primary: '#d4ac54', // color1
  lightPrimary: '#e0c892', // color2
  darkPrimary: '#69511a', // color3
  neutralGray: '#767676', // color4
  lightGray: '#bdbdbd', // color5
  white: '#fff',
  black: '#111827', // Mantido para texto escuro geral, ou pode ser ajustado
  background: '#F3F4F6', // Fundo geral
  inputBackground: '#F9FAFB', // Fundo de inputs
  inputBorder: '#D1D5DB', // Borda de inputs (pode ser substituído por lightGray)
  logoutBg: '#fee2e2', // Fundo do botão de logout
  logoutText: '#dc2626', // Texto do botão de logout
};


export default function PerfilUserScreen() {
  const { user } = useUser();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Estados para os campos editáveis
  const [isEditing, setIsEditing] = useState(false);
  const [editedNome, setEditedNome] = useState('');
  const [editedTelefone, setEditedTelefone] = useState('');
  const [editedDataNascimento, setEditedDataNascimento] = useState('');
  const [editedEndereco, setEditedEndereco] = useState('');
  const [editedPlan, setEditedPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados para o nome e inicial do utilizador para o cabeçalho
  const [headerUserName, setHeaderUserName] = useState('');
  const [headerUserInitial, setHeaderUserInitial] = useState('');

  // Função para buscar os dados do utilizador
  const fetchUserData = useCallback(async () => {
    try {
      const refUser = doc(db, 'users', user.uid);
      const snapshot = await getDoc(refUser);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserData(data);
        // Inicializa os estados de edição com os dados atuais
        setEditedNome(data.nome || data.name || '');
        setEditedTelefone(data.telefone || '');
        setEditedDataNascimento(data.dataNascimento || '');
        setEditedEndereco(data.endereco || '');
        setEditedPlan(data.plan || '');

        // Define os estados para o cabeçalho fixo
        setHeaderUserName(data.nome || data.name || 'Utilizador');
        setHeaderUserInitial((data.nome || data.name || 'U').charAt(0).toUpperCase());

      } else {
        setUserData(null);
        // Limpa os estados de edição se o utilizador não for encontrado
        setEditedNome('');
        setEditedTelefone('');
        setEditedDataNascimento('');
        setEditedEndereco('');
        setEditedPlan('');

        setHeaderUserName('Utilizador');
        setHeaderUserInitial('U');
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do usuário.');
      setUserData(null);
      setHeaderUserName('Utilizador');
      setHeaderUserInitial('U');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        setLoading(true);
        fetchUserData();
      }
    }, [user?.uid, fetchUserData])
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

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Restaura os estados de edição para os dados originais do utilizador
    if (userData) {
      setEditedNome(userData.nome || userData.name || '');
      setEditedTelefone(userData.telefone || '');
      setEditedDataNascimento(userData.dataNascimento || '');
      setEditedEndereco(userData.endereco || '');
      setEditedPlan(userData.plan || '');
    }
  };

  // Função para guardar/atualizar os dados no Firebase
  const handleSaveProfile = async () => {
    if (!user || !user.uid) {
      Alert.alert('Erro', 'Utilizador não autenticado.');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        nome: editedNome,
        telefone: editedTelefone,
        dataNascimento: editedDataNascimento,
        endereco: editedEndereco,
        plan: editedPlan,
      });
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      setIsEditing(false); // Sai do modo de edição
      fetchUserData(); // Recarrega os dados para exibir as atualizações (e atualizar o cabeçalho)
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o perfil. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // O loading container agora precisa considerar o cabeçalho fixo
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fixedHeader}>
          <View style={styles.headerUserInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{headerUserInitial || 'U'}</Text>
            </View>
            <Text style={styles.headerUserName}>{headerUserName || 'Utilizador'}</Text>
          </View>
          <Text style={styles.headerAppName}>RisiFit</Text>
        </View>
        <View style={styles.loadingContentContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10 }}>A carregar dados do usuário...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // O caso de userData não encontrado também precisa considerar o cabeçalho fixo
  if (!userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fixedHeader}>
          <View style={styles.headerUserInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{headerUserInitial || 'U'}</Text>
            </View>
            <Text style={styles.headerUserName}>{headerUserName || 'Utilizador'}</Text>
          </View>
          <Text style={styles.headerAppName}>RisiFit</Text>
        </View>
        <View style={styles.loadingContentContainer}>
          <Text style={styles.nome}>Usuário não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Removidas as variáveis 'inicial', 'userName', 'userPlanOrEmail' locais,
  // pois o cabeçalho usa 'headerUserInitial' e 'headerUserName'.
  // Para o corpo da tela, usaremos os 'edited...' ou 'userData' diretamente.

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho Fixo (Barra Fixa) */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerUserInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{headerUserInitial}</Text>
          </View>
          <Text style={styles.headerUserName}>{headerUserName}</Text>
        </View>
        <Text style={styles.headerAppName}>RisiFit</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Informações Pessoais - Condicionalmente editáveis */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações Pessoais</Text>
          
          {/* Ícone de Edição */}
          {!isEditing && (
            <TouchableOpacity style={styles.editIconContainer} onPress={handleEditProfile}>
              <Icon name="pencil-alt" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nome:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedNome}
                onChangeText={setEditedNome}
                placeholder="Nome completo"
                autoCapitalize="words"
              />
            ) : (
              <Text style={styles.cardTextValue}>{editedNome || 'Não fornecido'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Telefone:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedTelefone}
                onChangeText={setEditedTelefone}
                placeholder="Ex: 912345678"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.cardTextValue}>{editedTelefone || 'Não fornecido'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Data de Nascimento:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedDataNascimento}
                onChangeText={setEditedDataNascimento}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.cardTextValue}>{editedDataNascimento || 'Não fornecida'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Endereço:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedEndereco}
                onChangeText={setEditedEndereco}
                placeholder="Seu endereço completo"
                autoCapitalize="sentences"
                multiline
              />
            ) : (
              <Text style={styles.cardTextValue}>{editedEndereco || 'Não fornecido'}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Tipo de Plano:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedPlan}
                onChangeText={setEditedPlan}
                placeholder="Ex: Básico, Premium"
                autoCapitalize="words"
              />
            ) : (
              <Text style={styles.cardTextValue}>{editedPlan || 'Não fornecido'}</Text>
            )}
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.cardTextValue}>{user.email || 'Não fornecido'}</Text>
          </View>

          {/* Botões de Ação - DENTRO DO CARTÃO */}
          {isEditing && (
            <View style={styles.cardButtonContainer}>
              <TouchableOpacity
                style={[styles.cardButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={isSaving}
              >
                <Text style={[styles.cardButtonText, styles.cancelButtonText]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cardButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.cardButtonText, styles.saveButtonText]}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Os botões de questionário e logout permanecem fora do cartão */}
        <TouchableOpacity style={styles.botao} onPress={handleAbrirQuestionario}>
          <Text style={[styles.botaoTexto, { color: COLORS.white }]}>📝 Responder Questionário</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.botao, styles.logout]} onPress={handleLogout}>
          <Text style={[styles.botaoTexto, { color: COLORS.logoutText }]}>🚪 Terminar Sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // NOVO ESTILO PARA A BARRA FIXA
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20, // Ajuste para Android para status bar
    backgroundColor: COLORS.primary, // Cor de fundo azul -> color1
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15, // Arredondamento nas bordas inferiores
    borderBottomRightRadius: 15,
    elevation: 5, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10, // Garante que fique acima do conteúdo que rola
  },
  headerUserInfo: { // Estilo para agrupar avatar e nome do user
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: { // Estilo para o avatar na barra fixa
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white, // Branco
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { // Estilo para o texto do avatar na barra fixa
    color: COLORS.primary, // Cor do texto do avatar -> color1
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserName: { // Estilo para o nome do user na barra fixa
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white, // Branco
  },
  headerAppName: { // Estilo para o nome da app na barra fixa
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white, // Branco
  },
  // Ajuste para o conteúdo da ScrollView para começar abaixo do cabeçalho fixo
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Mantenha o paddingBottom original
    backgroundColor: COLORS.background, // Fundo geral
    paddingTop: FIXED_HEADER_HEIGHT + 20, // Adiciona padding para o cabeçalho fixo + um pouco mais
    alignItems: 'center', // Mantém o alinhamento central para o conteúdo
    flexGrow: 1, // Garante que a ScrollView ocupe o espaço disponível
  },
  // O loadingContainer e nome (para "usuário não encontrado") agora precisam de padding superior
  loadingContentContainer: { // NOVO: Container para o conteúdo de loading/erro
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background, // Fundo geral
    paddingTop: FIXED_HEADER_HEIGHT, // Garante que o conteúdo não fique por baixo do header
  },
  
  card: {
    backgroundColor: COLORS.white, // Branco
    padding: 16,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkPrimary, // Cor do título do card -> color3
    marginBottom: 10,
    paddingRight: 40,
  },
  editIconContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 16,
    color: COLORS.neutralGray, // Cor do label -> color4
    fontWeight: '600',
    marginRight: 5,
    minWidth: 120,
  },
  cardTextValue: {
    fontSize: 16,
    color: COLORS.neutralGray, // Cor do valor do texto do card -> color4
    flexShrink: 1,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground, // Fundo de inputs
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
    fontSize: 16,
    color: COLORS.black, // Cor do texto do input
    borderWidth: 1,
    borderColor: COLORS.lightGray, // Borda de inputs -> color5
  },
  cardButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray, // Borda do container de botões do card -> color5
    paddingTop: 15,
  },
  cardButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: COLORS.primary, // Cor do botão Guardar -> color1
  },
  saveButtonText: {
    color: COLORS.white, // Branco
  },
  cancelButton: {
    backgroundColor: COLORS.white, // Branco
    borderWidth: 1,
    borderColor: COLORS.primary, // Borda do botão Cancelar -> color1
  },
  cancelButtonText: {
    color: COLORS.primary, // Cor do texto do botão Cancelar -> color1
  },
  botao: {
    width: '100%',
    backgroundColor: COLORS.primary, // Cor do botão "Responder Questionário" -> color1
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  logout: {
    backgroundColor: COLORS.logoutBg, // Fundo do botão de logout
  },
  botaoTexto: {
    fontWeight: '600',
    fontSize: 16,
  },
  nome: { // Estilo para 'Usuário não encontrado'
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
  },
});
