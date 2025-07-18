import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
  Keyboard,
  ImageBackground, // Importar ImageBackground
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';

export default function LoginScreen({ navigation }) {
  const { setUser, setRole } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [emailReset, setEmailReset] = useState('');
  const [msgReset, setMsgReset] = useState('');
  const [selectedLoginRole, setSelectedLoginRole] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);

  const clearErrors = () => setErrorMsg('');

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Lógica se precisar reagir ao teclado (ex: esconder elementos)
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Lógica se precisar reagir ao teclado
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg('Preencha o email e a senha.');
      return;
    }

    if (!selectedLoginRole) {
      setErrorMsg('Erro: Tipo de utilizador não selecionado. Por favor, reinicie.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setErrorMsg('Dados do utilizador não encontrados no Firebase.');
        return;
      }

      const userData = userDocSnap.data();
      const firebaseRole = userData.role;

      let expectedSelectedRoleType = null;
      if (firebaseRole === 'user') {
        expectedSelectedRoleType = 'aluno';
      } else if (firebaseRole === 'admin') {
        expectedSelectedRoleType = 'personalTrainer';
      } else {
        setErrorMsg('Tipo de utilizador desconhecido no Firebase. Contacte o suporte.');
        return;
      }

      if (selectedLoginRole !== expectedSelectedRoleType) {
        setErrorMsg(`A sua conta é de ${expectedSelectedRoleType === 'aluno' ? 'Aluno' : 'Personal Trainer'}. Por favor, selecione o tipo correto.`);
        return;
      }

      setUser(user);
      setRole(firebaseRole);
      setErrorMsg('');

      if (firebaseRole === 'admin') {
        navigation.replace('AdminTabs', { user });
      } else if (firebaseRole === 'user') {
        navigation.replace('UserTabs', { user });
      } else {
        setErrorMsg('Erro de navegação: Papel do utilizador não reconhecido.');
      }
    } catch (error) {
      handleAuthError(error);
    }
  }, [email, password, navigation, setRole, setUser, selectedLoginRole]);

const handleAuthError = (error) => {
  switch (error.code) {
    case 'auth/user-not-found':
      setErrorMsg('Utilizador não encontrado. Verifique o email.');
      break;
    case 'auth/wrong-password':
      setErrorMsg('Senha incorreta. Tente novamente ou redefina a senha.');
      break;
    case 'auth/invalid-email':
      setErrorMsg('Email inválido. Verifique o formato do email.');
      break;
    case 'auth/invalid-credential': // Adicione esta linha
      setErrorMsg('Credenciais inválidas. Verifique o email e a senha.'); // Mensagem mais clara
      break;
    case 'auth/too-many-requests':
      setErrorMsg('Muitas tentativas de login falhadas. Tente novamente mais tarde.');
      break;
    case 'auth/user-disabled': // Adicione este caso também, caso um utilizador seja desativado
      setErrorMsg('A sua conta foi desativada. Contacte o suporte.');
      break;
    default:
      setErrorMsg('Erro ao fazer login. Tente novamente.');
      console.error('Erro de autenticação:', error);
  }
};

  const handlePasswordReset = useCallback(async () => {
    try {
      await sendPasswordResetEmail(auth, emailReset.trim());
      setMsgReset('📩 Email de recuperação enviado!');
    } catch (err) {
      console.error('Erro ao enviar email de recuperação:', err.code);
      setMsgReset('⚠️ Verifica o email inserido.');
    }
  }, [emailReset]);

  const handleRoleSelect = (role) => {
    setSelectedLoginRole(role);
    setShowLoginForm(true);
    clearErrors();
  };

  const handleBackToRoleSelection = () => {
    setShowLoginForm(false);
    setSelectedLoginRole(null);
    setEmail('');
    setPassword('');
    setErrorMsg('');
  };

  return (
    // Envolve tudo com ImageBackground
    <ImageBackground
      source={require('../assets/fundo.png')} // Caminho para a tua imagem de fundo
      style={styles.backgroundImage} // Estilo para a imagem de fundo
      resizeMode="cover" // Ajusta como a imagem preenche o espaço (cover, contain, stretch)
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer} // Um novo estilo para o KAV
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../assets/logo.jpeg')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Bem-vindo ao RisiFit</Text>

          {!showLoginForm ? (
            <View style={styles.roleSelectionScreen}>
              <Text style={styles.roleSelectionPrompt}>Quem és tu?</Text>

              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleRoleSelect('aluno')}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={22} color={styles.roleButtonIcon.color} style={styles.roleButtonIcon} />
                <Text style={styles.roleButtonText}>Sou Aluno</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleRoleSelect('personalTrainer')}
                activeOpacity={0.8}
              >
                <Ionicons name="fitness-outline" size={22} color={styles.roleButtonIcon.color} style={styles.roleButtonIcon} />
                <Text style={styles.roleButtonText}>Sou Personal Trainer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginFormContainer}>
              <Text style={styles.continueAsText}>
                Aceder como <Text style={styles.continueAsRoleText}>{selectedLoginRole === 'aluno' ? 'Aluno' : 'Personal Trainer'}</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={styles.inputPlaceholder.color}
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  clearErrors();
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Senha"
                  placeholderTextColor={styles.inputPlaceholder.color}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    clearErrors();
                  }}
                  secureTextEntry={secureText}
                  textContentType="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setSecureText(prev => !prev)} style={styles.eyeIcon}>
                  <Ionicons name={secureText ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
                </TouchableOpacity>
              </View>

              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Entrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowReset(true);
                  setEmailReset('');
                  setMsgReset('');
                  clearErrors();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToRoleSelection}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>Voltar para a seleção de perfil</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <Modal visible={showReset} transparent animationType="slide" onRequestClose={() => setShowReset(false)}>
          <View style={styles.modalBg}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Recuperar Palavra-passe</Text>
              <TextInput
                placeholder="Insere o teu email"
                value={emailReset}
                onChangeText={setEmailReset}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor={styles.inputPlaceholder.color}
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={handlePasswordReset}
              />
              {!!msgReset && <Text style={styles.resetMessage}>{msgReset}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowReset(false)}>
                  <Text style={styles.modalCloseText}>Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePasswordReset}>
                  <Text style={styles.modalSendText}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Paleta de Cores
  colors: {
    color1: '#d4ac54', // Dourado/Mostarda - Principal para botões de ação
    color2: '#e0c892', // Dourado mais claro - Para fundos mais suaves
    color3: '#69511a', // Castanho escuro/Dourado - Para texto principal e links
    color4: '#767676', // Cinzento médio - Para texto secundário e placeholders
    color5: '#bdbdbd', // Cinzento claro - Para bordas e elementos discretas
  },
  // Novo estilo para ImageBackground
  backgroundImage: {
    flex: 1, // Faz com que a imagem de fundo ocupe todo o espaço
    width: '100%',
    height: '100%',
  },
  // Novo estilo para KeyboardAvoidingView, pois agora está dentro de ImageBackground
  keyboardAvoidingContainer: {
    flex: 1, // Ocupa todo o espaço dentro do ImageBackground
    backgroundColor: 'transparent', // O fundo agora é transparente para ver a imagem
  },
  // O container original foi removido, pois o ImageBackground e o KeyboardAvoidingView tratam do fundo
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    paddingBottom: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 350,
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#69511a',
    textAlign: 'center',
    marginBottom: 40,
  },
  roleSelectionScreen: {
    width: '100%',
    marginBottom: 20,
    marginTop: -20,
  },
  roleSelectionPrompt: {
    fontSize: 20,
    fontWeight: '500',
    color: '#69511a',
    marginBottom: 30,
    textAlign: 'center',
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#d4ac54',
    marginBottom: 15,
    shadowColor: '#69511a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  roleButtonIcon: {
    marginRight: 8,
    fontSize: 22,
    color: '#fff',
  },
  roleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loginFormContainer: {
    width: '100%',
  },
  continueAsText: {
    textAlign: 'center',
    color: '#767676',
    marginBottom: 25,
    fontSize: 18,
  },
  continueAsRoleText: {
    fontWeight: 'bold',
    color: '#69511a',
  },
  input: {
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
    borderColor: '#bdbdbd',
    borderWidth: 1,
    color: '#69511a',
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
    marginBottom: 20,
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
    marginTop: 10,
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
  forgotText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#69511a',
    textDecorationLine: 'underline',
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(105, 81, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#69511a',
    marginBottom: 10,
  },
  resetMessage: {
    marginBottom: 10,
    color: '#16a34a',
    fontSize: 14,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#767676',
    fontSize: 16,
  },
  modalSendText: {
    color: '#69511a',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    marginTop: 25,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#767676',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});