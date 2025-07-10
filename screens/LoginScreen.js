import React, { useState, useCallback } from 'react';
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

  const clearErrors = () => setErrorMsg('');

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg('Preencha o email e a senha.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setErrorMsg('Dados do utilizador não encontrados.');
        return;
      }

      const userData = userDocSnap.data();
      const userRole = userData.role || 'user';

      setUser(user);
      setRole(userRole);
      setErrorMsg('');

      if (userRole === 'admin') {
        navigation.replace('AdminTabs', { user });
      } else if (userRole === 'user') {
        navigation.replace('UserTabs', { user });
      } else {
        setErrorMsg('Tipo de utilizador desconhecido.');
      }
    } catch (error) {
      handleAuthError(error);
    }
  }, [email, password, navigation, setRole, setUser]);

  const handleAuthError = (error) => {
    switch (error.code) {
      case 'auth/user-not-found':
        setErrorMsg('Usuário não encontrado.');
        break;
      case 'auth/wrong-password':
        setErrorMsg('Senha incorreta.');
        break;
      case 'auth/invalid-email':
        setErrorMsg('Email inválido.');
        break;
      case 'auth/too-many-requests':
        setErrorMsg('Muitas tentativas. Tente novamente mais tarde.');
        break;
      default:
        setErrorMsg('Erro ao fazer login. Tente novamente.');
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

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Image
          source={require('../assets/logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.inner}>
          <Text style={styles.title}>Bem-vindo ao RisiFit</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
              <Ionicons name={secureText ? 'eye-off' : 'eye'} size={22} color="#666" />
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
        </View>
      </KeyboardAvoidingView>

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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  logo: {
    width: 350,
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  inner: {
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontSize: 16,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    color: '#111',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeIcon: {
    paddingHorizontal: 6,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
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
    color: '#2563EB',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    marginBottom: 10,
    color: '#111',
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
    color: '#888',
    fontSize: 16,
  },
  modalSendText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 16,
  },
});
