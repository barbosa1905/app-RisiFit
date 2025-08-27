// screens/User/EditarDadosPessoais.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform,
  ScrollView, TextInput, Alert, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../../services/firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import Colors from '../../constants/Colors';

export default function EditarDadosPessoais() {
  const navigation = useNavigation();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [morada, setMorada] = useState('');

  const load = useCallback(async () => {
    if (!user?.uid) return setLoading(false);
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setNome(d?.nome || d?.name || '');
        setTelefone(d?.telefoneCompleto || d?.telefone || '');
        setNascimento(d?.dataNascimento || '');
        setMorada(d?.morada || d?.endereco || '');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível carregar os teus dados.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!nome.trim()) return Alert.alert('Atenção', 'O nome é obrigatório.');
    try {
      setLoading(true);
      const ref = doc(db, 'users', user.uid);
      const payload = {
        nome: nome.trim(),
        telefoneCompleto: telefone.trim(),
        dataNascimento: nascimento.trim(),
        morada: morada.trim(),
        updatedAt: new Date(),
      };
      const snap = await getDoc(ref);
      if (snap.exists()) await updateDoc(ref, payload);
      else await setDoc(ref, payload, { merge: true });
      Alert.alert('Sucesso', 'Dados atualizados.');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      {/* Top Bar */}
      <View style={styles.topBarWrap}>
        <LinearGradient colors={[Colors.primary, '#22313B']} style={StyleSheet.absoluteFill} />
        <View style={styles.topBarRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.onPrimary} />
          </TouchableOpacity>
          <View style={styles.brandCenter} pointerEvents="none">
            <Text style={styles.brandRisi}>RISI</Text>
            <Text style={styles.brandFit}> FIT</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.title}>Editar dados pessoais</Text>

          <Field label="Nome completo">
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex.: João Silva" />
          </Field>

          <Field label="Telefone">
            <TextInput
              style={styles.input}
              value={telefone}
              onChangeText={setTelefone}
              keyboardType="phone-pad"
              placeholder="Ex.: +351 9xxxxxxxx"
            />
          </Field>

          <Field label="Data de nascimento">
            <TextInput
              style={styles.input}
              value={nascimento}
              onChangeText={setNascimento}
              placeholder="DD/MM/AAAA"
            />
          </Field>

          <Field label="Morada">
            <TextInput style={styles.input} value={morada} onChangeText={setMorada} placeholder="Rua / Cidade" />
          </Field>

          <TouchableOpacity disabled={loading} onPress={save} style={styles.saveBtn}>
            <Text style={styles.saveText}>{loading ? 'A guardar…' : 'Guardar'}</Text>
            <Ionicons name="checkmark" size={18} color={Colors.onPrimary} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBarWrap: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 6 : 10,
    paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden',
  },
  topBarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, justifyContent: 'space-between' },
  brandCenter: { flexDirection: 'row', alignItems: 'center' },
  brandRisi: { color: Colors.onPrimary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  brandFit: { color: Colors.secondary, fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },

  title: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10 },
  fieldLabel: { color: Colors.textSecondary, marginBottom: 6, fontWeight: '700' },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.divider, color: Colors.textPrimary,
  },
  saveBtn: {
    marginTop: 10, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  saveText: { color: Colors.onPrimary, fontWeight: '900', marginRight: 6 },
});
