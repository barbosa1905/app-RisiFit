// screens/Admin/EditarDadosPessoaisScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  ScrollView,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';

import { db, auth } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

/* ---------------- helpers ---------------- */
const onlyDigits = (s) => (s || '').replace(/\D+/g, '');
const trim = (s) => (s || '').trim();

/** DD/MM/AAAA -> Date (ou null) */
const parseDDMMYYYY = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  const d = new Date(yy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
};
/** Date -> DD/MM/AAAA */
const fmtDDMMYYYY = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear());
  return `${dd}/${mm}/${yy}`;
};

const daysInMonth = (m, y) => new Date(y, m, 0).getDate();
/** máscara dinâmica DD/MM/AAAA */
const maskDate = (raw) => {
  const d = onlyDigits(raw).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

const isValidDateDDMMYYYY = (s) => {
  if (!s) return true; // opcional
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (!m) return false;
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12) return false;
  const dim = daysInMonth(mm, yy);
  if (dd < 1 || dd > dim) return false;

  const d = new Date(yy, mm - 1, dd);
  const today = new Date();
  const min = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  const max = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
  if (d < min || d > max) return false;
  return true;
};

/** Máscara/normalização de telefone com foco em PT */
const formatPhonePT = (raw) => {
  if (!raw) return '';
  let s = raw.replace(/[^\d+ ]/g, '').replace(/\s+/g, ' ').trim();

  // normalizar prefixos PT
  if (s.startsWith('00351')) s = '+' + s.slice(2); // 00351 -> +351
  if (s.startsWith('351')) s = '+351 ' + s.slice(3).trim();
  if (s.startsWith('+351') && s.length === 4) return '+351 ';

  // garantir + à frente se existir
  const plus = s.startsWith('+') ? '+' : '';
  const digits = onlyDigits(s);
  if (plus && !digits.startsWith('351')) {
    // outro país: apenas agrupar a cada 3-4 p/ não ser intrusivo
    return plus + digits.replace(/^(\d{3})(\d{3})(\d{3,})$/, '$1 $2 $3').trim();
  }

  // PT: +351 [9|2]XX XXX XXX
  if (digits.startsWith('351')) {
    const local = digits.slice(3);
    if (!local) return '+351 ';
    // móveis (9xx xxx xxx) ou fixos (2xx xxx xxx)
    if (local.length <= 3) return `+351 ${local}`;
    if (local.length <= 6) return `+351 ${local.slice(0, 3)} ${local.slice(3)}`;
    return `+351 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`.trim();
  }

  // sem indicativo: formata em blocos 3-3-3
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`.trim();
};

const isValidPhone = (s) => {
  if (!s) return true;
  const d = onlyDigits(s);
  // E.164 PT típico: 9 dígitos locais; com +351 + 9 = 12
  return d.length >= 9;
};

const fieldError = (nome, telefone, dataNascimento) => {
  if (trim(nome).length < 2) return 'O nome deve ter pelo menos 2 caracteres.';
  if (!isValidPhone(telefone)) return 'Telefone inválido (mín. 9 dígitos).';
  if (!isValidDateDDMMYYYY(dataNascimento))
    return 'Data inválida. Use DD/MM/AAAA (idade entre 10 e 100 anos).';
  return null;
};

/* ---------------- screen ---------------- */
export default function EditarDadosPessoaisScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const adminSnapshot = route.params?.adminSnapshot || null;

  const user = auth.currentUser;
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [morada, setMorada] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateValue, setDateValue] = useState(null); // espelha a data em Date

  const initialRef = useRef({ nome: '', telefone: '', morada: '', dataNascimento: '' });

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      let data = adminSnapshot;
      if (!data) {
        const snap = await getDoc(doc(db, 'users', uid));
        data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      }
      const _nome = data?.name || data?.nome || user?.displayName || '';
      const _telefone = data?.telefone || data?.telefoneCompleto || '';
      const _morada = data?.morada || '';
      const _dataNasc = data?.dataNascimento || '';

      setNome(_nome);
      setTelefone(formatPhonePT(_telefone));
      setMorada(_morada);
      setDataNascimento(_dataNasc);

      const d = parseDDMMYYYY(_dataNasc);
      setDateValue(d);

      initialRef.current = {
        nome: _nome,
        telefone: formatPhonePT(_telefone),
        morada: _morada,
        dataNascimento: _dataNasc,
      };
    } catch (e) {
      console.error('[EditarDados] load', e);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }, [uid, adminSnapshot, user?.displayName]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    const i = initialRef.current;
    return (
      trim(nome) !== trim(i.nome) ||
      trim(telefone) !== trim(i.telefone) ||
      trim(morada) !== trim(i.morada) ||
      trim(dataNascimento) !== trim(i.dataNascimento)
    );
  }, [nome, telefone, morada, dataNascimento]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (!dirty || saving) return;
      e.preventDefault();
      Alert.alert(
        'Descartar alterações?',
        'Tens alterações por guardar. Queres sair sem guardar?',
        [
          { text: 'Ficar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return unsub;
  }, [navigation, dirty, saving]);

  const errorMsg = useMemo(() => fieldError(nome, telefone, dataNascimento), [nome, telefone, dataNascimento]);
  const canSave = useMemo(() => dirty && !errorMsg && !saving, [dirty, errorMsg, saving]);

  /* --------- handlers --------- */
  const onChangeDateText = (txt) => {
    const masked = maskDate(txt);
    setDataNascimento(masked);
    const d = parseDDMMYYYY(masked);
    setDateValue(d);
  };

  const onChangePhone = (txt) => setTelefone(formatPhonePT(txt));

  const openDatePicker = () => {
    // tentar derivar Date a partir do texto; caso contrário hoje-18 anos
    let base = parseDDMMYYYY(dataNascimento);
    if (!base) {
      const today = new Date();
      base = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    }
    setDateValue(base);
    setShowDatePicker(true);
    Keyboard.dismiss();
  };

  const onDatePicked = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event?.type === 'dismissed') return;

    const d = selectedDate || dateValue || new Date();
    setDateValue(d);
    setDataNascimento(fmtDDMMYYYY(d));
  };

  const onSave = async () => {
    if (!uid) return;
    const err = fieldError(nome, telefone, dataNascimento);
    if (err) {
      Alert.alert('Verifica os dados', err);
      return;
    }
    try {
      setSaving(true);
      Keyboard.dismiss();

      // guardar telefone em versão limpa (sem espaços) mas com +351 se aplicável
      let phoneForSave = telefone.replace(/\s+/g, ' ').trim();
      // normalizar +351 sem espaços
      if (phoneForSave.startsWith('+351')) {
        const d = onlyDigits(phoneForSave).slice(3);
        phoneForSave = '+351 ' + (d ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`.trim() : '');
        phoneForSave = phoneForSave.trim();
      }

      const payload = {
        nome: trim(nome),
        name: trim(nome), // manter compatibilidade
        telefone: phoneForSave,
        telefoneCompleto: phoneForSave,
        morada: trim(morada),
        dataNascimento: trim(dataNascimento),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', uid), payload, { merge: true });

      try {
        if (trim(nome) && user) await updateProfile(user, { displayName: trim(nome) });
      } catch (e) {
        if (__DEV__) console.warn('updateProfile falhou:', e?.message || e);
      }

      initialRef.current = {
        nome: payload.nome,
        telefone: formatPhonePT(payload.telefone),
        morada: payload.morada,
        dataNascimento: payload.dataNascimento,
      };

      Alert.alert('Sucesso', 'Dados atualizados com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('[EditarDados] save', e);
      Alert.alert('Erro', 'Não foi possível guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    const i = initialRef.current;
    setNome(i.nome);
    setTelefone(i.telefone);
    setMorada(i.morada);
    setDataNascimento(i.dataNascimento);
    setDateValue(parseDDMMYYYY(i.dataNascimento));
  };

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <AppHeader title="Editar dados" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.centerBody}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar…</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Editar dados" showBackButton onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Nome */}
          <Text style={styles.label}>Nome completo <Text style={styles.req}>*</Text></Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Ex.: João Silva"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Telefone */}
          <Text style={styles.label}>Telefone</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={telefone}
              onChangeText={onChangePhone}
              placeholder="Ex.: +351 912 345 678"
              placeholderTextColor={Colors.textSecondary}
              style={styles.input}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>
          <Text style={styles.helper}>Aceita +, espaços e dígitos. Mínimo 9 dígitos.</Text>

          {/* Morada */}
          <Text style={styles.label}>Morada</Text>
          <View style={[styles.inputRow, { alignItems: 'flex-start' }]}>
            <Ionicons name="location-outline" size={18} color={Colors.textSecondary} style={[styles.inputIcon, { marginTop: 12 }]} />
            <TextInput
              value={morada}
              onChangeText={setMorada}
              placeholder="Rua, nº, localidade"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.input, { height: 96, textAlignVertical: 'top', paddingTop: 12 }]}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Data de nascimento */}
          <Text style={styles.label}>Data de nascimento</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={dataNascimento}
              onChangeText={onChangeDateText}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.input, { flex: 1 }]}
              keyboardType="number-pad"
              maxLength={10}
            />
            <TouchableOpacity onPress={openDatePicker} style={styles.inlineBtn} activeOpacity={0.8}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={styles.inlineBtnText}>Escolher</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helper}>Formato: DD/MM/AAAA. Idade aceitável: 10 - 100 anos.</Text>

          {/* DateTimePicker (Android: inline modal; iOS: spinner) */}
          {showDatePicker && (
            <DateTimePicker
              value={dateValue || new Date(1990, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              onChange={onDatePicked}
              maximumDate={new Date(new Date().getFullYear() - 10, 11, 31)}
              minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
            />
          )}

          {/* Erro global de validação */}
          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          {/* Ações */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onReset}
              disabled={!dirty || saving}
              style={[styles.resetBtn, (!dirty || saving) && styles.resetBtnDisabled]}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color={(!dirty || saving) ? Colors.textSecondary : Colors.primary} />
              <Text style={[styles.resetText, { color: (!dirty || saving) ? Colors.textSecondary : Colors.primary }]}>
                Repor originais
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onSave}
              disabled={!canSave}
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color={Colors.onPrimary} />
                  <Text style={styles.saveText}>{dirty ? 'Guardar alterações' : 'Sem alterações'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footerNote}>
            As alterações atualizam o teu perfil e o registo em “users/{'{uid}'}”.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background },
  centerBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, color: Colors.textSecondary },

  content: { padding: 16, paddingBottom: 40 },

  label: { color: Colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 12 },
  req: { color: Colors.error },
  helper: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1, borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    paddingRight: 8,
  },
  inputIcon: { marginLeft: 10 },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    color: Colors.textPrimary,
  },

  inlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primary + '55',
    backgroundColor: Colors.cardBackground,
    marginLeft: 6,
  },
  inlineBtnText: { color: Colors.primary, fontWeight: '700' },

  errorText: {
    marginTop: 12,
    color: Colors.error,
    fontWeight: '600',
  },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  resetBtn: {
    flex: 1, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.primary,
  },
  resetBtnDisabled: { borderColor: Colors.divider, backgroundColor: Colors.cardBackground },
  resetText: { fontWeight: '800' },

  saveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  saveBtnDisabled: { backgroundColor: Colors.textSecondary },
  saveText: { color: Colors.onPrimary, fontWeight: '800' },

  footerNote: { marginTop: 12, color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
});
