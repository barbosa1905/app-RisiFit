import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { initializeApp, getApps, getApp } from 'firebase/app';

// --- FIREBASE CONFIGURATION: Makes the component self-sufficient ---
// Replace with your credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// --- PALETA DE CORES E ESTILOS GLOBAIS ---
const Colors = {
  primary: '#B8860B',
  primaryLight: '#D4AF37',
  primaryDark: '#8B6B08',
  secondary: '#000000ff',
  secondaryLight: '#4A4E46',
  secondaryDark: '#1C201A',
  accent: '#FFD700',
  accentLight: '#FFE066',
  accentDark: '#CCAA00',
  background: '#F0F0F0',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#505050',
  textLight: '#8a8a8a96',
  white: '#FFFFFF',
  black: '#000000',
  lightGray: '#E0E0E0',
  mediumGray: '#C0C0C0',
  darkGray: '#707070',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',
  onPrimary: '#FFFFFF',
  onSecondary: '#871818ff',
  onAccent: '#1A1A1A',
};

const GlobalStyles = {
  shadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
  },
  cardShadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 14,
  }
};

const AppHeader = ({ title, showBackButton = false, onBackPress = () => {} }) => {
  return (
    <View style={headerStyles.headerContainer}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.primary}
      />
      <View style={headerStyles.headerContent}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[headerStyles.headerTitle, !showBackButton && { marginLeft: 0 }]}>{title}</Text>
      </View>
    </View>
  );
};

export default function PerfilAdminScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // OTIMIZAÇÃO: Removido o código de signInAnonymously daqui
  // Este useEffect agora apenas define o estado do usuário.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const getInitial = useCallback((name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  }, []);

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

  useFocusEffect(
    useCallback(() => {
        fetchAdminData();
        return () => {};
    }, [fetchAdminData])
  );

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
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            } catch (error) {
              console.error('Erro durante o logout:', error);
              Alert.alert('Erro ao sair', 'Ocorreu um problema ao terminar a sessão. Tente novamente.');
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
  const irParaCriarAvaliacao = () => {
    navigation.navigate('CriarAvaliacao', { adminId: user.uid });
  };
  const irParaListarQuestionarios = () => {
    navigation.navigate('ListarQuestionarios');
  };
  const handleEditarDadosPessoais = () => {
    // Corrigido para passar os dados corretos
    navigation.navigate('EditarDadosPessoais', { adminData: adminData });
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>A carregar dados do Personal Trainer...</Text>
      </View>
    );
  }

  if (!adminData) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Personal Trainer não encontrado ou erro ao carregar.</Text>
        <TouchableOpacity onPress={fetchAdminData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Corrigido para usar adminData.name em vez de adminData.nome
  const avatarInitial = getInitial(adminData.name);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Meu Perfil" />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={[styles.initialsAvatar, GlobalStyles.cardShadow]}>
              <Text style={styles.initialsText}>{avatarInitial}</Text>
            </View>
          </View>
          {/* Corrigido para usar adminData.name */}
          <Text style={styles.nome}>{adminData.name || 'Sem Nome'}</Text>
          <Text style={styles.roleTag}>Personal Trainer</Text>
        </View>

        <View style={[styles.personalDataCard, GlobalStyles.cardShadow]}>
          <Text style={styles.personalDataTitle}>Dados Pessoais</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={22} color={Colors.darkGray} style={styles.detailIcon} />
            <Text style={styles.info}>Nome Completo: {adminData.name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={22} color={Colors.darkGray} style={styles.detailIcon} />
            <Text style={styles.info}>Email: {user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={22} color={Colors.darkGray} style={styles.detailIcon} />
            <Text style={styles.info}>Telefone: {adminData.telefone || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={22} color={Colors.darkGray} style={styles.detailIcon} />
            <Text style={styles.info}>Morada: {adminData.morada || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={22} color={Colors.darkGray} style={styles.detailIcon} />
            <Text style={styles.info}>Data de Nascimento: {adminData.dataNascimento || 'N/A'}</Text>
          </View>

          <TouchableOpacity style={[styles.editPersonalDataButton, GlobalStyles.shadow]} onPress={handleEditarPerfil}>
            <Ionicons name="pencil-outline" size={22} color={Colors.onPrimary} style={styles.editPersonalDataIcon} />
            <Text style={styles.editPersonalDataButtonText}>Alterar a palavra-passe</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionGroup}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>

          <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={irParaCadastroCliente}>
            <Ionicons name="person-add-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Cadastrar Novo Cliente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={irParaCriarAvaliacao}>
            <Ionicons name="create-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Criar Nova Avaliação</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={irParaListarQuestionarios}>
            <Ionicons name="list-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Gerir Questionários</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.logoutButton, GlobalStyles.cardShadow]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.white} style={styles.logoutIcon} />
          <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- ESTILOS ---
const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimary,
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 5,
  }
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 17,
    color: Colors.error,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    ...GlobalStyles.shadow,
  },
  retryButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  header: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 25,
    marginBottom: 25,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  initialsAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: Colors.primary,
    backgroundColor: Colors.secondaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: Colors.onPrimary,
    fontSize: 60,
    fontWeight: 'bold',
  },
  nome: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleTag: {
    backgroundColor: Colors.primaryLight,
    color: Colors.textPrimary,
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 30,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    marginRight: 15,
    color: Colors.darkGray,
  },
  info: {
    fontSize: 16,
    color: Colors.textSecondary,
    flexShrink: 1,
  },

  personalDataCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    ...GlobalStyles.cardShadow,
  },
  personalDataTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 18,
    textAlign: 'left',
    width: '100%',
  },
  editPersonalDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 12,
    marginTop: 20,
    ...GlobalStyles.shadow,
  },
  editPersonalDataIcon: {
    marginRight: 12,
    color: Colors.onPrimary,
  },
  editPersonalDataButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.onPrimary,
  },

  actionGroup: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    textAlign: 'left',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 18,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    ...GlobalStyles.shadow,
  },
  actionIcon: {
    marginRight: 18,
    color: Colors.primaryDark,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: Colors.error,
    paddingVertical: 18,
    borderRadius: 15,
    marginTop: 25,
    ...GlobalStyles.cardShadow,
  },
  logoutIcon: {
    marginRight: 12,
    color: Colors.white,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: '700',
  },
});