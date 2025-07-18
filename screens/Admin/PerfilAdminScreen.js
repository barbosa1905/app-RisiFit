import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  // Removido: Image, // Não precisamos mais do componente Image diretamente para o avatar
  ScrollView,
  Platform,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilAdminScreen() {
  const { user } = useUser();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // Função para obter a inicial do nome
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
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>A carregar dados do administrador...</Text>
      </View>
    );
  }

  if (!adminData) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Administrador não encontrado ou erro ao carregar.</Text>
        <TouchableOpacity onPress={fetchAdminData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Obter a inicial do nome para o avatar
  const avatarInitial = getInitial(adminData.nome);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header com Avatar e Nome */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {/* Avatar com a inicial do nome */}
          <View style={styles.initialsAvatar}>
            <Text style={styles.initialsText}>{avatarInitial}</Text>
          </View>
          {/* Removido: TouchableOpacity do botão de edição do avatar */}
        </View>
        <Text style={styles.nome}>{adminData.nome || 'Sem Nome'}</Text>
        <Text style={styles.roleTag}>Administrador</Text>
      </View>

      {/* Detalhes do Perfil */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.detailIcon} />
          <Text style={styles.info}>Email: {user?.email || 'N/A'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={20} color={colors.primary} style={styles.detailIcon} />
          <Text style={styles.info}>ID: {user?.uid || 'N/A'}</Text>
        </View>
      </View>

      {/* Grupo de Ações */}
      <View style={styles.actionGroup}>
        <Text style={styles.sectionTitle}>Ações Rápidas</Text>

        <TouchableOpacity style={styles.actionButton} onPress={irParaCadastroCliente}>
          <Ionicons name="person-add-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Cadastrar Novo Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CriarAvaliacao')}>
          <Ionicons name="create-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Criar Nova Avaliação</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleEditarPerfil}>
          <Ionicons name="build-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Gerir Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('ListarQuestionarios')}>
          <Ionicons name="list-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Gerir Questionários</Text>
        </TouchableOpacity>
      </View>

      {/* Botão de Terminar Sessão */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.backgroundLight} style={styles.logoutIcon} />
        <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// --- Definição da Paleta de Cores ---
const colors = {
  primary: '#D4AC54',       // Dourado principal - Para botões, ícones, títulos
  primaryDark: '#A88433',   // Dourado mais escuro - Para texto em destaque
  secondary: '#69511A',     // Castanho escuro - Para texto principal
  textMuted: '#767676',     // Cinzento médio - Para texto secundário
  background: '#F8F8F8',    // Fundo geral claro
  backgroundLight: '#FFFFFF',// Fundo de cards/elementos brancos
  border: '#E0E0E0',        // Cor para bordas sutis
  shadow: 'rgba(0,0,0,0.08)', // Sombra suave
  danger: '#D32F2F',        // Vermelho para ações destrutivas (logout)
  textLight: '#FFFFFF',     // Texto para fundos escuros
};

// --- Estilos Profissionais ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.secondary,
    fontSize: 16,
  },
  errorText: {
    fontSize: 17,
    color: colors.danger,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  retryButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- Header Section ---
  header: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 25,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  // Novo estilo para o avatar com as iniciais
  initialsAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDark, // Fundo do avatar com a cor dourado escuro
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  initialsText: {
    color: colors.textLight, // Cor branca para o texto das iniciais
    fontSize: 60, // Tamanho grande para a inicial
    fontWeight: 'bold',
  },
  // Removido: editAvatarButton e seus estilos

  nome: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 5,
    textAlign: 'center',
  },
  roleTag: {
    backgroundColor: colors.primary,
    color: colors.textLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Details Card ---
  detailsCard: {
    width: '100%',
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    padding: 18,
    marginBottom: 25,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIcon: {
    marginRight: 10,
  },
  info: {
    fontSize: 16,
    color: colors.textMuted,
    flexShrink: 1,
  },

  // --- Action Group ---
  actionGroup: {
    width: '100%',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 15,
    textAlign: 'left',
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionIcon: {
    marginRight: 15,
  },
  actionButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.secondary,
  },

  // --- Logout Button ---
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 10,
    marginTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 7,
      },
    }),
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutButtonText: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
});