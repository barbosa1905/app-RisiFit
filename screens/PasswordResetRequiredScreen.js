// screens/PasswordResetRequiredScreen.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../services/firebaseConfig';
import Colors from '../constants/Colors';

export default function PasswordResetRequiredScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1=Email, 2=Código, 3=Nova Pass
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [resentCountdown, setResentCountdown] = useState(0);

  const functions = useMemo(() => getFunctions(app), []);

  const solicitar = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Escreve o teu email.');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'solicitarCodigoReset');
      await fn({ email: email.trim() });
      setStep(2);
      // countdown 60s
      setResentCountdown(60);
      const timer = setInterval(() => {
        setResentCountdown((v) => {
          if (v <= 1) {
            clearInterval(timer);
            return 0;
          }
          return v - 1;
        });
      }, 1000);
      Alert.alert('Código enviado', 'Verifica o teu email e introduz o código.');
    } catch (e) {
      Alert.alert('Erro', (e?.message || 'Falha ao solicitar código.'));
    } finally {
      setLoading(false);
    }
  };

  const validarCodigo = async () => {
    if (!code || String(code).length !== 6) {
      Alert.alert('Atenção', 'O código deve ter 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'verificarCodigoReset');
      await fn({ email: email.trim(), code: String(code) });
      setStep(3);
    } catch (e) {
      Alert.alert('Código inválido', e?.message || 'Confirma o código e tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    if (!pwd || pwd.length < 6) {
      Alert.alert('Atenção', 'A palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    if (pwd !== pwd2) {
      Alert.alert('Atenção', 'As palavras-passe não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'confirmarResetSenha');
      await fn({ email: email.trim(), code: String(code), newPassword: pwd });
      Alert.alert('Sucesso', 'A tua palavra-passe foi alterada. Faz login novamente.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível alterar a palavra-passe.');
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async () => {
    if (resentCountdown > 0) return;
    await solicitar();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[Colors.primary, '#1f2a33']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="shield-checkmark-outline" size={24} color={Colors.onPrimary} />
          <Text style={styles.headerTitle}>Recuperar Acesso</Text>
        </View>
        <Text style={styles.headerSub}>Segurança em três passos</Text>
        <View style={styles.steps}>
          <StepDot active={step >= 1} label="Email" />
          <StepLine />
          <StepDot active={step >= 2} label="Código" />
          <StepLine />
          <StepDot active={step >= 3} label="Nova senha" />
        </View>
      </LinearGradient>

      <View style={styles.container}>
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.label}>Email da conta</Text>
            <View style={styles.input}>
              <Feather name="mail" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="o.teu@email.com"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={solicitar} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Enviar código</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.label}>Código recebido por email</Text>
            <View style={styles.input}>
              <Feather name="key" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="6 dígitos"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={validarCodigo} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Validar código</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={reenviar} disabled={resentCountdown > 0 || loading}>
              <Text style={styles.link}>
                {resentCountdown > 0 ? `Reenviar em ${resentCountdown}s` : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.label}>Nova palavra-passe</Text>
            <View style={styles.input}>
              <Feather name="lock" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
                value={pwd}
                onChangeText={setPwd}
              />
            </View>

            <Text style={styles.label}>Confirmar palavra-passe</Text>
            <View style={styles.input}>
              <Feather name="lock" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
                value={pwd2}
                onChangeText={setPwd2}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={confirmar} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.primaryBtnText}>Guardar nova palavra-passe</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.replace('Login')}>
          <Text style={styles.secondaryBtnText}>Voltar ao início de sessão</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function StepDot({ active, label }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.stepDot, active && styles.stepDotActive]} />
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

function StepLine() {
  return <View style={styles.stepLine} />;
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? 28 : 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerTitle: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: 20,
    marginLeft: 8,
  },
  headerSub: {
    color: Colors.onPrimary,
    opacity: 0.8,
    marginTop: 6,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  stepDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepDotActive: {
    backgroundColor: Colors.secondary,
  },
  stepLabel: {
    color: Colors.onPrimary,
    fontSize: 11,
    marginTop: 6,
    opacity: 0.85,
  },
  stepLine: {
    height: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 4,
  },
  container: {
    flex: 1,
    padding: 18,
    gap: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    color: Colors.textPrimary,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: Colors.onSecondary,
    fontWeight: '700',
    fontSize: 16,
  },
  linkBtn: { alignSelf: 'center', marginTop: 8 },
  link: { color: Colors.primary, fontWeight: '600' },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
