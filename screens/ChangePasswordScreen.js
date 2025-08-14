// screens/ChangePasswordScreen.js
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
  Alert,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig'; // Apenas auth é necessário aqui
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; // Para navegação

const colors = {
  primary: '#D4AC54',
  primaryDark: '#A88433',
  secondary: '#69511A',
  textMuted: '#767676',
  background: '#F8F8F8',
  backgroundLight: '#FFFFFF',
  border: '#E0E0E0',
  shadow: 'rgba(0,0,0,0.08)',
  danger: '#D32F2F',
  textLight: '#FFFFFF',
};

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [secureTextCurrent, setSecureTextCurrent] = useState(true);
  const [secureTextNew, setSecureTextNew] = useState(true);
  const [secureTextConfirm, setSecureTextConfirm] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg('');
  };

  const handleChangePassword = useCallback(async () => {
    clearMessages();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('A nova palavra-passe e a confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        Alert.alert('Erro', 'Nenhum utilizador logado ou email não disponível.');
        // Forçar logout e voltar para o login
        await auth.signOut();
        navigation.replace('Login');
        return;
      }

      // 1. Reautenticar o utilizador com a palavra-passe atual
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Se a reautenticação for bem-sucedida, atualize a palavra-passe
      await updatePassword(user, newPassword);

      Alert.alert(
        'Sucesso!',
        'A sua palavra-passe foi alterada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }] // Volta para a tela de perfil
      );

      // Limpar os campos após o sucesso
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

    } catch (error) {
      console.error("Erro ao alterar palavra-passe:", error);
      let errorMessage = 'Ocorreu um erro ao alterar a palavra-passe. Tente novamente.';

      if (error.code === 'auth/wrong-password') {
        errorMessage = 'A palavra-passe atual está incorreta.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente e tente alterar a senha.';
        // Forçar logout e voltar para o login
        await auth.signOut();
        navigation.replace('Login');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A nova palavra-passe é muito fraca. Por favor, escolha uma mais forte.';
      } else if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
        // Isso não deve acontecer se o user estiver logado, mas é um fallback
        errorMessage = 'Erro de autenticação. Por favor, faça login novamente.';
        await auth.signOut();
        navigation.replace('Login');
      }
      setErrorMsg(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmNewPassword, navigation]);

  return (
    <ImageBackground
      source={require('../assets/fundo.png')} // Certifique-se que o caminho está correto
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
          <Text style={styles.title}>Alterar Palavra-passe</Text>
          <Text style={styles.subtitle}>Mantenha a sua conta segura definindo uma nova palavra-passe.</Text>

          {/* Campo Palavra-passe Atual */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Palavra-passe Atual:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="A sua palavra-passe atual"
                placeholderTextColor={styles.inputPlaceholder.color}
                value={currentPassword}
                onChangeText={text => {
                  setCurrentPassword(text);
                  clearMessages();
                }}
                secureTextEntry={secureTextCurrent}
                textContentType="password"
                returnKeyType="next"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setSecureTextCurrent(prev => !prev)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={secureTextCurrent ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Campo Nova Palavra-passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nova Palavra-passe:</Text>
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
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setSecureTextNew(prev => !prev)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={secureTextNew ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Campo Confirmar Nova Palavra-passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirme a Nova Palavra-passe:</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Repita a nova palavra-passe"
                placeholderTextColor={styles.inputPlaceholder.color}
                value={confirmNewPassword}
                onChangeText={text => {
                  setConfirmNewPassword(text);
                  clearMessages();
                }}
                secureTextEntry={secureTextConfirm}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setSecureTextConfirm(prev => !prev)} style={styles.eyeIcon} disabled={loading}>
                <Ionicons name={secureTextConfirm ? 'eye-off' : 'eye'} size={22} color={styles.eyeIcon.color} />
              </TouchableOpacity>
            </View>
          </View>

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <TouchableOpacity style={styles.button} onPress={handleChangePassword} activeOpacity={0.8} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Alterar Palavra-passe</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
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
    color: colors.secondary,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  input: {
    height: 50,
    backgroundColor: colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.secondary,
    width: '100%',
  },
  inputPlaceholder: {
    color: colors.textMuted,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
  },
  eyeIcon: {
    paddingHorizontal: 6,
    color: colors.textMuted,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: colors.danger,
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 14,
    width: '100%',
  },
});
