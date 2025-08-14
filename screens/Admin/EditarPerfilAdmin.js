import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';
import {
  getAuth,
  updateEmail, // Mantido para referência, mas não usado para edição
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  signInAnonymously,
} from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { Ionicons } from '@expo/vector-icons';

// --- FIREBASE CONFIGURATION: Torna o componente auto-suficiente ---
// Substitua com as suas credenciais
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


// Paleta de Cores (constants/Colors.js) - Usando a paleta fornecida
const Colors = {
  // Cores Primárias (Dourado/Preto)
  primary: '#B8860B', // Dourado mais escuro para a marca principal
  primaryLight: '#D4AF37', // Dourado mais claro para destaques
  primaryDark: '#8B6B08', // Dourado mais profundo

  secondary: '#000000ff', // Um preto muito escuro ou cinza carvão para secundário
  secondaryLight: '#4A4E46', // Um cinza escuro um pouco mais claro
  secondaryDark: '#1C201A', // Um preto quase absoluto

  accent: '#FFD700', // Dourado puro/ouro para ênfase forte
  accentLight: '#FFE066', // Amarelo dourado mais suave
  accentDark: '#CCAA00', // Dourado mais escuro para contraste

  // Cores de Fundo
  background: '#F0F0F0', // Fundo geral muito claro (quase branco)
  surface: '#FFFFFF', // Fundo para cartões, headers (branco puro)
  cardBackground: '#FFFFFF', // Alias para surface

  // Cores de Texto
  textPrimary: '#1A1A1A', // Texto principal (preto bem escuro)
  textSecondary: '#505050', // Texto secundário (cinza médio-escuro)
  textLight: '#8a8a8a96', // Texto mais claro (cinza claro)

  // Cores Neutras (Pretos, Brancos, Tons de Cinza)
  white: '#FFFFFF',
  black: '#000000',

  lightGray: '#E0E0E0', // Bordas, separadores
  mediumGray: '#C0C0C0', // Componentes desabilitados, fundos sutis
  darkGray: '#707070', // Texto e ícones gerais que não sejam primary/secondary

  // Cores de Feedback
  success: '#4CAF50', // Mantido verde para universalidade (sucesso)
  warning: '#FFC107', // Mantido amarelo para universalidade (avisos)
  error: '#DC3545', // Mantido vermelho para universalidade (erros)
  info: '#17A2B8', // Mantido azul para universalidade (informações/links)
  
  // Cores de "On" (para texto/ícone sobre a cor base)
  onPrimary: '#FFFFFF', // Branco sobre o dourado
  onSecondary: '#871818ff', // Branco sobre o preto/cinza escuro
  onAccent: '#1A1A1A', // Preto sobre o dourado de ênfase
};

// Global Styles (para sombras consistentes)
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

// Componente AppHeader (copiado do PerfilAdminScreen para consistência)
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

export default function EditarPerfilAdmin() {
  const [user, setUser] = useState(auth.currentUser);

  const navigation = useNavigation();

  // Removido o estado 'telefone'
  const [novaPassword, setNovaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [passwordAtual, setPasswordAtual] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).then(userCredential => {
          setUser(userCredential.user);
        }).catch(error => {
          console.error("Erro ao autenticar anonimamente:", error);
          Alert.alert("Erro", "Não foi possível autenticar o utilizador.");
        });
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Não é necessário carregar dados do Firestore se apenas a password for alterada
    // Apenas definimos loading como false, pois não há dados adicionais para buscar
    setLoading(false);
  }, [user]); // Depender do objeto user completo

  const reautenticar = async () => {
    if (!auth.currentUser || !passwordAtual) {
      throw new Error("Credenciais insuficientes para reautenticação.");
    }
    const credenciais = EmailAuthProvider.credential(auth.currentUser.email, passwordAtual);
    await reauthenticateWithCredential(auth.currentUser, credenciais);
  };

  const guardarAlteracoes = async () => {
    // Reautenticação é sempre necessária se houver tentativa de mudar a password
    const needsReauthentication = !!novaPassword;

    if (needsReauthentication && !passwordAtual) {
      Alert.alert('Autenticação necessária', 'Introduz a tua palavra-passe atual para confirmar a alteração de palavra-passe.');
      return;
    }

    if (novaPassword && novaPassword !== confirmarPassword) {
      Alert.alert('Erro', 'As novas palavras-passe não coincidem.');
      return;
    }

    // Se novaPassword estiver vazia e confirmarPassword também, não há alteração de password
    if (!novaPassword && !confirmarPassword) {
      Alert.alert('Nenhuma alteração', 'Nenhuma nova palavra-passe foi fornecida.');
      return;
    }

    setLoading(true);
    try {
      if (needsReauthentication) {
        await reautenticar();
      }

      // Não há updateDoc para telefone ou nome, apenas a password
      if (novaPassword) {
        await updatePassword(auth.currentUser, novaPassword);
      }

      Alert.alert('Sucesso', 'Palavra-passe atualizada com sucesso.');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao atualizar palavra-passe:', error);
      let errorMessage = 'Não foi possível atualizar a palavra-passe.';
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Palavra-passe atual incorreta. Tenta novamente.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por favor, autentica-te novamente para realizar esta alteração.';
      }
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Alterar Palavra-passe" showBackButton={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Alterar Palavra-passe" showBackButton={true} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- SECÇÃO: Alterar Palavra-passe --- */}
        <View style={styles.passwordSection}>
          <Text style={styles.sectionTitle}>Alterar Palavra-passe</Text>

          <Text style={styles.label}>Nova Palavra-passe</Text>
          <TextInput
            style={styles.input}
            value={novaPassword}
            onChangeText={setNovaPassword}
            placeholder="Nova palavra-passe"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
          />

          <Text style={styles.label}>Confirmar Nova Palavra-passe</Text>
          <TextInput
            style={styles.input}
            value={confirmarPassword}
            onChangeText={setConfirmarPassword}
            placeholder="Confirme a nova palavra-passe"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
          />

          {/* Campo de Palavra-passe Atual (sempre visível dentro desta secção se novaPassword for preenchida) */}
          {/* A lógica de exibição condicional foi removida para ser sempre visível se houver novaPassword */}
          <Text style={styles.label}>Palavra-passe atual</Text>
          <TextInput
            style={styles.input}
            value={passwordAtual}
            onChangeText={setPasswordAtual}
            placeholder="Introduza a sua palavra-passe atual"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
          />
        </View>
        {/* --- FIM SECÇÃO --- */}

        <TouchableOpacity style={[styles.saveButton, GlobalStyles.shadow]} onPress={guardarAlteracoes}>
          <Text style={styles.saveButtonText}>💾 Guardar Alterações</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginBottom: 10,
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.background,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    ...GlobalStyles.shadow,
  },
  saveButtonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  // --- NOVOS ESTILOS PARA A SECÇÃO DE PALAVRA-PASSE ---
  passwordSection: {
    marginTop: 0, // Ajustado para não ter margem superior extra
    paddingTop: 0, // Ajustado para não ter padding superior extra
    borderTopWidth: 0, // Removida a linha divisória, pois é a única secção
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20, // Ligeiramente aumentado para ser mais proeminente
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 15, // Espaço abaixo do título
    textAlign: 'left',
  },
});
