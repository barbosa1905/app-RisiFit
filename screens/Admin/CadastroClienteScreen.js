// screens/Admin/CadastroClienteScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform,
  ScrollView, Switch, SafeAreaView, StatusBar, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

// Firebase (usa a tua config central)
import { app as primaryApp, db, auth } from '../../services/firebaseConfig';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Tema/componentes
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

/* =================== Países =================== */
const countryCodes = [
  { label: '🇵🇹 Portugal (+351)', value: '+351' },
  // ... (mantém a tua lista completa aqui)
];

/* =================== Helpers =================== */
const emailRegex = /\S+@\S+\.\S+/;
const onlyDigits = (s = '') => s.replace(/[^\d]/g, '');

export default function CadastroClienteScreen({ navigation }) {
  // Form
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [prefixoTelefone, setPrefixoTelefone] = useState('+351');
  const [telefone, setTelefone] = useState('');

  const [dataNascimento, setDataNascimento] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [genero, setGenero] = useState(null);
  const [grupo, setGrupo] = useState(null);

  const [enviarAcesso, setEnviarAcesso] = useState(true);

  // PT
  const [nomePT, setNomePT] = useState('Personal Trainer');
  const [loadingPT, setLoadingPT] = useState(true);

  // UX
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /* -------- Carregar nome do PT -------- */
  useEffect(() => {
    const fetchPT = async () => {
      try {
        if (auth?.currentUser) {
          const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (snap.exists()) {
            const d = snap.data();
            setNomePT(d.name || d.firstName || d.nome || 'Personal Trainer');
          }
        }
      } catch {}
      setLoadingPT(false);
    };
    fetchPT();
  }, []);

  /* -------- Date picker -------- */
  const onChangeDate = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setDataNascimento(date);
  };
  const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  /* -------- Validação -------- */
  const validate = () => {
    const e = {};
    if (!nome.trim()) e.nome = 'Obrigatório.';
    if (!email.trim()) e.email = 'Obrigatório.';
    else if (!emailRegex.test(email)) e.email = 'Email inválido.';
    if (!senha) e.senha = 'Obrigatório.';
    else if (senha.length < 6) e.senha = 'Mínimo 6 caracteres.';
    if (!grupo) e.grupo = 'Escolhe um grupo.';
    if (telefone && onlyDigits(telefone) !== telefone) e.telefone = 'Só dígitos.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* -------- Registar cliente (app secundária) -------- */
  const handleRegister = async () => {
    if (loadingPT) {
      Alert.alert('Aguarde', 'A carregar dados do treinador...');
      return;
    }
    if (!validate()) {
      Alert.alert('Verifica os campos', 'Corrige os campos assinalados.');
      return;
    }

    setSubmitting(true);
    // app secundária para não terminar sessão do admin
    const secondaryApp =
      getApps().find((a) => a.name === 'secondary') || initializeApp(primaryApp.options, 'secondary');
    const secondaryAuth = getAuth(secondaryApp);

    try {
      // 1) Criar utilizador
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), senha);
      const userId = cred.user.uid;

      // 2) Gravar no Firestore
      const userData = {
        email: email.trim(),
        name: nome.trim(),
        role: 'user',
        telefoneCompleto: `${prefixoTelefone}${telefone}`,
        dataNascimento: dataNascimento ? formatDate(dataNascimento) : '',
        genero: genero || '',
        grupo,
        enviarAcesso,
        adminId: auth.currentUser?.uid || '',
        criadoEm: new Date().toISOString(),
        PasswordResetRequiredScreen: true,
      };
      await setDoc(doc(db, 'users', userId), userData);
      console.log('User details saved in Firestore:', userData);

      // 3) Enviar e-mail (não-bloqueante)
      let emailOk = false;
      if (enviarAcesso) {
        try {
          const functions = getFunctions(primaryApp, 'us-central1');
          const enviarEmailBoasVindas = httpsCallable(functions, 'enviarEmailBoasVindas');
          await enviarEmailBoasVindas({
            email: email.trim(),
            password: senha,
            nome_cliente: nome.trim(),
            username: email.trim(),
            link_plataforma: 'https://risifit.com',
            nome_personal_trainer: nomePT,
          });
          emailOk = true;
        } catch (e) {
          // Mostra no console a razão exata devolvida pelo backend (SendGrid)
          console.log('Falha ao enviar e-mail de boas-vindas:',
            e?.details?.reason || e?.message || e);
        }
      }

      // 4) Anotar status de e-mail
      try {
        await setDoc(
          doc(db, 'users', userId),
          { welcomeEmailSent: emailOk, welcomeEmailLastTryAt: new Date().toISOString() },
          { merge: true }
        );
      } catch {}

      // 5) Feedback ao utilizador
      Alert.alert(
        'Sucesso',
        !enviarAcesso
          ? 'Cliente registado com sucesso.'
          : emailOk
          ? 'Cliente registado e e-mail enviado.'
          : 'Cliente registado com sucesso. (Aviso: não foi possível enviar o e-mail de acesso agora.)'
      );

      // 6) Limpar formulário
      setNome('');
      setEmail('');
      setSenha('');
      setPrefixoTelefone('+351');
      setTelefone('');
      setDataNascimento(null);
      setGenero(null);
      setGrupo(null);
      setEnviarAcesso(true);
      setErrors({});
    } catch (error) {
      console.error('ERRO no registo:', error);
      let msg = 'Ocorreu um erro ao registar o cliente.';
      if (error?.code === 'auth/email-already-in-use') msg = 'Este email já está em uso.';
      if (error?.code === 'auth/invalid-email') msg = 'Email inválido.';
      if (error?.code === 'auth/weak-password') msg = 'A senha é muito fraca (mín. 6).';
      Alert.alert('Erro', msg);
    } finally {
      try { await signOut(secondaryAuth); } catch {}
      setSubmitting(false);
    }
  };

  /* -------- UI -------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppHeader title="Registar Novo Cliente" showBackButton onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>

          {/* Nome */}
          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={[styles.input, errors.nome && styles.inputError]}
            placeholder="Nome completo"
            placeholderTextColor={Colors.textSecondary}
            value={nome}
            onChangeText={(t) => { setNome(t); if (errors.nome) setErrors((e) => ({ ...e, nome: undefined })); }}
            autoCapitalize="words"
          />
          {!!errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}

          {/* Email */}
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="email@exemplo.com"
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={(t) => { setEmail(t.trim()); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Senha */}
          <Text style={styles.label}>Senha</Text>
          <View style={[styles.input, styles.passwordRow, errors.senha && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mín. 6 caracteres"
              placeholderTextColor={Colors.textSecondary}
              value={senha}
              onChangeText={(t) => { setSenha(t); if (errors.senha) setErrors((e) => ({ ...e, senha: undefined })); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {!!errors.senha && <Text style={styles.errorText}>{errors.senha}</Text>}

          {/* Grupo */}
          <Text style={styles.label}>Grupo</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={grupo}
              onValueChange={(v) => { setGrupo(v); if (errors.grupo) setErrors((e) => ({ ...e, grupo: undefined })); }}
              style={styles.picker}
            >
              <Picker.Item label="Selecione..." value={null} />
              <Picker.Item label="Online" value="Online" />
              <Picker.Item label="Presencial" value="Presencial" />
            </Picker>
          </View>
          {!!errors.grupo && <Text style={styles.errorText}>{errors.grupo}</Text>}

          {/* Data de nascimento */}
          <Text style={styles.label}>Data de nascimento</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: dataNascimento ? Colors.textPrimary : Colors.textSecondary }}>
              {dataNascimento ? formatDate(dataNascimento) : 'DD/MM/YYYY'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dataNascimento || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )}

          {/* Telefone */}
          <Text style={styles.label}>WhatsApp / Telefone</Text>
          <View style={styles.phoneRow}>
            <View style={[styles.pickerContainer, { flex: 0.45 }]}>
              <Picker selectedValue={prefixoTelefone} onValueChange={setPrefixoTelefone} style={styles.picker}>
                {countryCodes.map((c) => <Picker.Item label={c.label} value={c.value} key={c.value} />)}
              </Picker>
            </View>
            <TextInput
              style={[styles.input, { flex: 0.55 }, errors.telefone && styles.inputError]}
              placeholder="Número"
              placeholderTextColor={Colors.textSecondary}
              value={telefone}
              onChangeText={(t) => { const d = onlyDigits(t); setTelefone(d); if (errors.telefone) setErrors((e) => ({ ...e, telefone: undefined })); }}
              keyboardType="phone-pad"
            />
          </View>
          {!!errors.telefone && <Text style={styles.errorText}>{errors.telefone}</Text>}

          {/* Género */}
          <Text style={styles.label}>Género</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={genero} onValueChange={setGenero} style={styles.picker}>
              <Picker.Item label="Selecione..." value={null} />
              <Picker.Item label="Masculino" value="Masculino" />
              <Picker.Item label="Feminino" value="Feminino" />
              <Picker.Item label="Outro" value="Outro" />
            </Picker>
          </View>

          {/* Acesso */}
          <Text style={styles.sectionTitle}>Configurações de Acesso</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enviar informações de acesso ao cliente</Text>
            <Switch
              value={enviarAcesso}
              onValueChange={setEnviarAcesso}
              trackColor={{ false: '#C7CBD1', true: '#C7CBD1' }}
              thumbColor={enviarAcesso ? Colors.secondary : '#FFF'}
            />
          </View>

          {/* Botão */}
          <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleRegister} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.buttonText}>Registar Cliente</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =================== Styles =================== */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 20, paddingBottom: 36 },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 6, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, marginTop: 10 },
  errorText: { color: '#E53935', marginTop: -6, marginBottom: 8, fontSize: 12, fontWeight: '600' },

  input: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: Colors.textPrimary,
    fontSize: 16, marginBottom: 10,
  },
  inputError: { borderColor: '#E53935' },

  passwordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  passwordInput: { flex: 1, marginRight: 8, color: Colors.textPrimary },

  dateInput: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider, borderRadius: 12,
    height: 48, paddingHorizontal: 12, justifyContent: 'center', marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
  },
  picker: { height: 48, width: '100%', color: Colors.textPrimary },

  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },

  switchRow: {
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  switchLabel: { color: Colors.textPrimary, fontWeight: '700', flex: 1, paddingRight: 12 },

  button: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
});
