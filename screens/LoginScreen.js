// screens/LoginScreen.js
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

const PALETTE = {
  bgTop: '#121A22',
  bgBottom: '#0D141A',
  gold: '#FFB800',
  gold2: '#FFCC48',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.12)',
  textPrimary: '#EAF2F7',
  textSecondary: 'rgba(234,242,247,0.7)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.12)',
  success: '#28A745',
  error: '#DC3545',
};

export default function LoginScreen({ navigation }) {
  const auth = useMemo(() => getAuth(), []);
  const [role, setRole] = useState('user'); // 'user' | 'admin'
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Animações
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [cardOpacity, cardY, headerOpacity, headerY]);

  const onSwitchRole = (nextRole) => {
    if (role === nextRole) return;
    setRole(nextRole);
    setErr(null); // não mostrar mensagens “por baixo”
  };

  const onLogin = async () => {
    if (!email.trim() || !pwd.trim()) {
      setErr('Preenche email e palavra-passe.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pwd.trim());
      const uid = cred.user.uid;

      // Busca papel guardado no Firestore
      const snap = await getDoc(doc(db, 'users', uid));
      const userData = snap.exists() ? snap.data() : null;
      const papel = (userData?.role || 'user').toLowerCase();

      // Validação de papel (sem popups extra — apenas erro no card)
      const required = role === 'admin' ? 'admin' : 'user';
      if (papel !== required) {
        await signOut(auth);
        setErr(
          required === 'user'
            ? 'Esta conta é de Personal Trainer. Alterna para "PT/Admin".'
            : 'Esta conta é de Utilizador. Alterna para "Utilizador".'
        );
        return;
      }

      if (papel === 'admin') navigation.replace('AdminTabs');
      else navigation.replace('UserTabs');
    } catch (e) {
      setErr(
        e?.code === 'auth/wrong-password'
          ? 'Palavra-passe incorreta.'
          : e?.code === 'auth/user-not-found'
          ? 'Utilizador não encontrado.'
          : 'Não foi possível iniciar sessão.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.statusBackdrop} />
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgBottom]} style={StyleSheet.absoluteFill} />

      {/* Shapes decorativos */}
      <View style={[styles.shape, { top: 160, right: -100, opacity: 0.25 }]} />
      <View style={[styles.shape, { bottom: -220, left: -160, opacity: 0.18 }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header/brand */}
          <Animated.View
            style={[
              styles.brandRow,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerY }],
              },
            ]}
          >
            <View style={styles.brandIcon}>
              {/* Troca o ícone pelo teu LOGO */}
              <Image
                source={require('../assets/logo.png')}
                style={{ width: 44, height: 44, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.brandTitle}>RisiFit</Text>
              <Text style={styles.brandTag} numberOfLines={1} ellipsizeMode="tail">
                Crescimento · Disciplina · Sucesso
              </Text>
            </View>

            {/* Role switch (sem mensagens/tooltip) */}
            <View style={styles.roleSwitch}>
              <TouchableOpacity
                onPress={() => onSwitchRole('user')}
                style={[styles.rolePill, role === 'user' && styles.rolePillActive]}
              >
                <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>
                  Utilizador
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSwitchRole('admin')}
                style={[styles.rolePill, role === 'admin' && styles.rolePillActive]}
              >
                <Text style={[styles.roleText, role === 'admin' && styles.roleTextActive]}>
                  PT/Admin
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Text style={styles.headline}>Bem-vindo de volta</Text>
          <Text style={styles.subhead}>
            Inicia sessão para continuares a tua evolução
          </Text>

          {/* Card de login */}
          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardY }],
              },
            ]}
          >
            {/* Email */}
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Feather name="mail" size={18} color={PALETTE.textSecondary} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={PALETTE.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            {/* Password */}
            <View style={styles.inputRow}>
              <View style={styles.inputIconWrap}>
                <Feather name="lock" size={18} color={PALETTE.textSecondary} />
              </View>
              <TextInput
                value={pwd}
                onChangeText={setPwd}
                placeholder="Palavra-passe"
                placeholderTextColor={PALETTE.textSecondary}
                secureTextEntry={secure}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setSecure((s) => !s)} style={styles.eyeBtn}>
                <Feather
                  name={secure ? 'eye-off' : 'eye'}
                  size={18}
                  color={PALETTE.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity
              onPress={() => navigation.navigate('PasswordResetRequiredScreen')}
              style={{ alignSelf: 'center', paddingVertical: 10 }}
            >
              <Text style={styles.forgot}>Esqueceste-te da palavra-passe?</Text>
            </TouchableOpacity>

            {/* Erro */}
            {!!err && (
              <View style={styles.errorBox}>
                <Feather name="alert-triangle" size={16} color={PALETTE.error} />
                <Text style={styles.errorText}>{err}</Text>
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity onPress={onLogin} disabled={loading} style={styles.cta} activeOpacity={0.9}>
              <LinearGradient
                colors={[PALETTE.gold, PALETTE.gold2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGrad}
              >
                {loading ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>Entrar</Text>
                    <Ionicons name="arrow-forward" size={20} color="#1A1A1A" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footer}>© 2025 RisiFit · Todos os direitos reservados</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.bgTop },

  statusBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: (StatusBar.currentHeight || 24),
    backgroundColor: '#121A22',
    opacity: 0.95,
    zIndex: -1,
  },

  scroll: {
    paddingTop: (StatusBar.currentHeight || 24) + 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  // Header
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  brandTitle: {
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandTag: {
    color: PALETTE.textSecondary,
    marginTop: 2,
  },

  roleSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rolePillActive: { backgroundColor: PALETTE.gold },
  roleText: {
    color: PALETTE.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  roleTextActive: { color: '#1A1A1A' },

  headline: {
    color: PALETTE.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subhead: {
    color: PALETTE.textSecondary,
    marginBottom: 16,
  },

  card: {
    backgroundColor: PALETTE.card,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 18,
    padding: 16,
    paddingTop: 18,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 12,
  },
  inputIconWrap: { width: 28, alignItems: 'center' },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  input: {
    flex: 1,
    color: PALETTE.textPrimary,
    fontSize: 16,
    paddingLeft: 8,
  },

  forgot: { color: PALETTE.gold, fontWeight: '700', letterSpacing: 0.2 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(220,53,69,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220,53,69,0.35)',
    marginBottom: 10,
  },
  errorText: { color: '#FFC6CC', fontSize: 13, flex: 1 },

  cta: { marginTop: 6, borderRadius: 14, overflow: 'hidden' },
  ctaGrad: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  ctaText: { color: '#1A1A1A', fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },

  footer: {
    textAlign: 'center',
    color: 'rgba(234,242,247,0.6)',
    marginTop: 18,
    fontSize: 12,
  },

  shape: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: PALETTE.gold,
  },
});
