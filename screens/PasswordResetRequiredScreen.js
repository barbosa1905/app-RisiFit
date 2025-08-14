// screens/PasswordResetRequiredScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert, // Para exibir mensagens ao usuário
  StatusBar,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { getAuth, updatePassword } from 'firebase/auth'; // Para atualizar a senha do Firebase Auth
import { doc, updateDoc, getDoc } from 'firebase/firestore'; // Para atualizar o Firestore
import { auth, db } from '../services/firebaseConfig'; // Suas instâncias de auth e db
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext'; // Se precisar do contexto do usuário

export default function PasswordResetRequiredScreen({ navigation, route }) {
  // O 'user' do contexto pode não estar totalmente atualizado aqui se a navegação foi 'replace'
  // O 'uid' e 'email' passados via route.params são mais confiáveis para este fluxo.
  const { setUser, setRole } = useUser();
  const uid = route.params?.userId; // Receber userId da navegação (nome que passamos do LoginScreen)
  const emailFromRoute = route.params?.email; // Receber email da navegação

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureTextNew, setSecureTextNew] = useState(true);
  const [secureTextConfirm, setSecureTextConfirm] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false); // Adicionado estado de loading

  const clearMessages = () => {
    setErrorMsg('');
  };

  const handlePasswordUpdate = useCallback(async () => {
    clearMessages();

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Por favor, preencha ambos os campos de senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) { // Firebase exige no mínimo 6 caracteres
      setErrorMsg('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true); // Inicia o loading
    try {
      const currentUser = auth.currentUser; // O usuário atualmente logado (o que fez o primeiro login)

      if (!currentUser || currentUser.uid !== uid) {
        // Isso pode acontecer se o token expirar ou se houver um problema de autenticação.
        // Forçar o logout e voltar para a tela de login.
        Alert.alert(
          'Sessão Expirada',
          'Sua sessão expirou ou há um problema de autenticação. Por favor, faça login novamente.'
        );
        await auth.signOut();
        navigation.replace('Login'); // Redireciona para a tela de Login principal
        return;
      }

      // 1. Atualizar a senha no Firebase Authentication
      await updatePassword(currentUser, newPassword);

      // 2. Atualizar o campo no Firestore para indicar que a senha foi redefinida
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        // CORRIGIDO: Usar o nome exato da propriedade como está no Firestore
        PasswordResetRequiredScreen: false, 
      });

      // Após sucesso, redirecionar para as telas principais
      // Buscar o role do usuário novamente para garantir a navegação correta
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();
      const firebaseRole = userData.role;

      // Atualizar o contexto do usuário (se necessário, para ter o objeto user mais recente)
      setUser(currentUser); // Atualiza o objeto user no contexto
      setRole(firebaseRole); // Atualiza o role no contexto

      Alert.alert(
        'Sucesso!',
        'Sua senha foi redefinida. Pode agora aceder à aplicação.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (firebaseRole === 'admin') {
                navigation.replace('AdminTabs'); // Não precisa passar user, o contexto já o tem
              } else if (firebaseRole === 'user') {
                navigation.replace('UserTabs'); // Não precisa passar user, o contexto já o tem
              } else {
                // Caso o role seja desconhecido, volta para o login por segurança
                Alert.alert('Erro de Navegação', 'Papel do utilizador desconhecido. Por favor, faça login novamente.');
                auth.signOut();
                navigation.replace('Login');
              }
            },
          },
        ]
      );

    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      let errorMessage = 'Erro ao redefinir senha. Tente novamente.';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente para redefinir sua senha.';
        // Força logout e volta para a tela de login
        await auth.signOut();
        navigation.replace('Login'); // Redireciona para a tela de Login principal
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Por favor, escolha uma senha mais forte (mínimo 6 caracteres).';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciais inválidas. Por favor, faça login novamente.';
        await auth.signOut();
        navigation.replace('Login');
      }
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false); // Finaliza o loading
    }
  }, [newPassword, confirmPassword, uid, navigation, setRole, setUser]); // Adicionar dependências

  return (
    <ImageBackground
      source={require('../assets/fundo.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Defina a Sua Nova Senha</Text>
          <Text style={styles.subtitle}>Por segurança, é obrigatório definir uma nova senha no seu primeiro acesso.</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nova Senha:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={styles.inputPlaceholder.color}
                value={newPassword}
                onChangeText={text => {
                  setNewPassword(text);
                  clearMessages();
                }}
                secureTextEntry={secureTextNew}
                textContentType="newPassword"
                returnKeyType="next"
                editable={!loading} // Desabilita input durante o loading
              />
              <TouchableOpacity onPress={() => setSecureTextNew(prev => !prev)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={secureTextNew ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirme a Nova Senha:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Repita a nova senha"
                placeholderTextColor={styles.inputPlaceholder.color}
                value={confirmPassword}
                onChangeText={text => {
                  setConfirmPassword(text);
                  clearMessages();
                }}
                secureTextEntry={secureTextConfirm}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handlePasswordUpdate}
                editable={!loading} // Desabilita input durante o loading
              />
              <TouchableOpacity onPress={() => setSecureTextConfirm(prev => !prev)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={secureTextConfirm ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
              </TouchableOpacity>
            </View>
          </View>

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          {/* Removido successMsg para usar Alert.alert para feedback final */}

          <TouchableOpacity style={styles.button} onPress={handlePasswordUpdate} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Redefinir Senha</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Reutiliza e adapta estilos do LoginScreen, se necessário
  colors: {
    color1: '#d4ac54',
    color2: '#e0c892',
    color3: '#69511a',
    color4: '#767676',
    color5: '#bdbdbd',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#69511a',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#767676',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#69511a',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderColor: '#bdbdbd',
    borderWidth: 1,
    color: '#69511a',
    width: '100%',
  },
  inputPlaceholder: {
    color: '#767676',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bdbdbd',
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeIcon: {
    paddingHorizontal: 6,
    color: '#767676',
  },
  button: {
    backgroundColor: '#d4ac54',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    shadowColor: '#69511a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    width: '100%',
  },
  successText: { // Mantido, mas não usado diretamente no Alert.alert
    color: '#16a34a',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    width: '100%',
  },
});
