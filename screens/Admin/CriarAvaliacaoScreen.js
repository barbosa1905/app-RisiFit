// screens/Admin/CriarAvaliacaoScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { AntDesign } from '@expo/vector-icons';

// Firebase (usa a config central da tua app)
import { db, auth } from '../../services/firebaseConfig';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

// Tema/componentes globais
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

// ---------- helpers ----------
const sanitizeDecimal = (text = '') =>
  text.replace(/[^0-9.,]/g, '').replace(',', '.');

const toNumberOrNull = (v) => {
  const n = parseFloat(sanitizeDecimal(v));
  return Number.isFinite(n) ? n : null;
};

const formatDatePT = (d) =>
  (d instanceof Date ? d : new Date(d)).toLocaleDateString('pt-PT');

// Classificação simples do IMC (OMS)
const classifyImc = (imc) => {
  if (!Number.isFinite(imc)) return { label: '-', color: Colors.textSecondary };
  if (imc < 18.5) return { label: 'Abaixo do peso', color: '#1E88E5' };
  if (imc < 25) return { label: 'Normal', color: '#43A047' };
  if (imc < 30) return { label: 'Excesso de peso', color: '#FB8C00' };
  if (imc < 35) return { label: 'Obesidade I', color: '#E53935' };
  if (imc < 40) return { label: 'Obesidade II', color: '#D32F2F' };
  return { label: 'Obesidade III', color: '#B71C1C' };
};

export default function CriarAvaliacaoScreen({ navigation }) {
  // ----- estado -----
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [clienteId, setClienteId] = useState(null);

  const [dataAvaliacao, setDataAvaliacao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // métricas base
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [imc, setImc] = useState('');

  // perímetros (cm)
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  const [braco, setBraco] = useState('');
  const [coxa, setCoxa] = useState('');
  const [panturrilha, setPanturrilha] = useState('');
  const [peito, setPeito] = useState('');

  // dobras (mm)
  const [triceps, setTriceps] = useState('');
  const [biceps, setBiceps] = useState('');
  const [subescapular, setSubescapular] = useState('');
  const [suprail, setSuprail] = useState('');
  const [abdominal, setAbdominal] = useState('');
  const [coxaDobra, setCoxaDobra] = useState('');
  const [panturrilhaDobra, setPanturrilhaDobra] = useState('');

  // outros (%)
  const [gorduraCorporal, setGorduraCorporal] = useState('');
  const [musculatura, setMusculatura] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ----- carregar clientes (apenas role=user; ordena por nome) -----
  useEffect(() => {
    const run = async () => {
      setClientesLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach((docu) => {
          const d = docu.data() || {};
          if (d.role === 'user' && (!d.adminId || d.adminId === auth.currentUser?.uid)) {
            list.push({
              id: docu.id,
              label: d.name || d.nome || d.email || 'Cliente',
              value: docu.id,
              key: docu.id,
            });
          }
        });
        list.sort((a, b) => a.label.localeCompare(b.label, 'pt'));
        setClientes(list);
      } catch (e) {
        console.log('Erro a carregar clientes:', e);
        Alert.alert('Erro', 'Não foi possível carregar os clientes.');
      } finally {
        setClientesLoading(false);
      }
    };
    run();
  }, []);

  // ----- IMC automático -----
  useEffect(() => {
    const p = toNumberOrNull(peso);
    const a = toNumberOrNull(altura);
    if (p && a && a > 0) {
      const value = p / (a * a);
      setImc(value.toFixed(2));
    } else {
      setImc('');
    }
  }, [peso, altura]);

  const imcInfo = useMemo(() => classifyImc(parseFloat(imc)), [imc]);

  // ----- date picker -----
  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDataAvaliacao(selectedDate);
  };

  // ----- validação -----
  const validate = () => {
    const e = {};
    if (!clienteId) e.clienteId = 'Seleciona um cliente.';
    const p = toNumberOrNull(peso);
    if (!(p && p > 0)) e.peso = 'Peso inválido.';
    const a = toNumberOrNull(altura);
    if (!(a && a > 0)) e.altura = 'Altura inválida.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ----- guardar -----
  const handleSalvar = async () => {
    if (!validate()) {
      Alert.alert('Verifica os campos', 'Corrige os campos assinalados.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        clienteId,
        dataAvaliacao: Timestamp.fromDate(dataAvaliacao),
        peso: toNumberOrNull(peso),
        altura: toNumberOrNull(altura),
        imc: toNumberOrNull(imc),

        perimetros: {
          cintura: toNumberOrNull(cintura),
          quadril: toNumberOrNull(quadril),
          braco: toNumberOrNull(braco),
          coxa: toNumberOrNull(coxa),
          panturrilha: toNumberOrNull(panturrilha),
          peito: toNumberOrNull(peito),
        },
        dobrasCutaneas: {
          triceps: toNumberOrNull(triceps),
          biceps: toNumberOrNull(biceps),
          subescapular: toNumberOrNull(subescapular),
          suprail: toNumberOrNull(suprail),
          abdominal: toNumberOrNull(abdominal),
          coxa: toNumberOrNull(coxaDobra),
          panturrilha: toNumberOrNull(panturrilhaDobra),
        },
        outrosParametros: {
          gorduraCorporal: toNumberOrNull(gorduraCorporal),
          musculatura: toNumberOrNull(musculatura),
        },
        criadoPor: auth.currentUser?.uid || null,
        criadoEmISO: new Date().toISOString(),
      };

      await addDoc(collection(db, 'avaliacoesFisicas'), payload);
      Alert.alert('Sucesso', 'Avaliação criada com sucesso!');
      navigation.goBack();
    } catch (e) {
      console.log('Erro ao salvar avaliação:', e);
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    } finally {
      setSaving(false);
    }
  };

  // ----- UI -----
  const DropdownIcon = () => (
    <AntDesign name="down" size={16} color={Colors.textSecondary} style={{ marginRight: 10 }} />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppHeader title="Criar Nova Avaliação" showBackButton onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cliente + Data */}
        <Text style={styles.sectionTitle}>Detalhes da Avaliação</Text>

        <Text style={styles.label}>Cliente</Text>
        {clientesLoading ? (
          <View style={[styles.input, styles.center]}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => {
                setClienteId(value);
                if (errors.clienteId) setErrors((e) => ({ ...e, clienteId: undefined }));
              }}
              items={clientes}
              placeholder={{ label: 'Selecione um cliente...', value: null, color: Colors.textSecondary }}
              style={pickerStyles}
              value={clienteId}
              useNativeAndroidPickerStyle={false}
              Icon={DropdownIcon}
            />
          </View>
        )}
        {!!errors.clienteId && <Text style={styles.errorText}>{errors.clienteId}</Text>}

        <Text style={styles.label}>Data</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDatePT(dataAvaliacao)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dataAvaliacao}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeDate}
            maximumDate={new Date()}
          />
        )}

        {/* Métricas básicas */}
        <Text style={styles.sectionTitle}>Métricas Básicas</Text>

        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          style={[styles.input, errors.peso && styles.inputError]}
          placeholder="Ex.: 75.5"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="decimal-pad"
          value={peso}
          onChangeText={(t) => {
            const v = sanitizeDecimal(t);
            setPeso(v);
            if (errors.peso) setErrors((e) => ({ ...e, peso: undefined }));
          }}
        />
        {!!errors.peso && <Text style={styles.errorText}>{errors.peso}</Text>}

        <Text style={styles.label}>Altura (m)</Text>
        <TextInput
          style={[styles.input, errors.altura && styles.inputError]}
          placeholder="Ex.: 1.70"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="decimal-pad"
          value={altura}
          onChangeText={(t) => {
            const v = sanitizeDecimal(t);
            setAltura(v);
            if (errors.altura) setErrors((e) => ({ ...e, altura: undefined }));
          }}
        />
        {!!errors.altura && <Text style={styles.errorText}>{errors.altura}</Text>}

        <View style={styles.imcRow}>
          <View style={styles.imcBox}>
            <Text style={styles.imcLabel}>IMC</Text>
            <Text style={styles.imcValue}>{imc || '-'}</Text>
          </View>
          <View style={[styles.imcChip, { borderColor: imcInfo.color }]}>
            <Text style={[styles.imcChipText, { color: imcInfo.color }]}>{imcInfo.label}</Text>
          </View>
        </View>

        {/* Perímetros */}
        <Text style={styles.sectionTitle}>Perímetros (cm)</Text>
        <TextInput style={styles.input} placeholder="Cintura" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={cintura} onChangeText={(t) => setCintura(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Quadril" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={quadril} onChangeText={(t) => setQuadril(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Braço" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={braco} onChangeText={(t) => setBraco(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Coxa" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={coxa} onChangeText={(t) => setCoxa(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Panturrilha" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={panturrilha} onChangeText={(t) => setPanturrilha(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Peito" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={peito} onChangeText={(t) => setPeito(sanitizeDecimal(t))} />

        {/* Dobras */}
        <Text style={styles.sectionTitle}>Dobras Cutâneas (mm)</Text>
        <TextInput style={styles.input} placeholder="Tríceps" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={triceps} onChangeText={(t) => setTriceps(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Bíceps" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={biceps} onChangeText={(t) => setBiceps(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Subescapular" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={subescapular} onChangeText={(t) => setSubescapular(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Suprailíaca" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={suprail} onChangeText={(t) => setSuprail(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Abdominal" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={abdominal} onChangeText={(t) => setAbdominal(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Coxa (dobra)" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={coxaDobra} onChangeText={(t) => setCoxaDobra(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Panturrilha (dobra)" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={panturrilhaDobra} onChangeText={(t) => setPanturrilhaDobra(sanitizeDecimal(t))} />

        {/* Outros */}
        <Text style={styles.sectionTitle}>Outros Parâmetros (%)</Text>
        <TextInput style={styles.input} placeholder="Gordura corporal (%)" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={gorduraCorporal} onChangeText={(t) => setGorduraCorporal(sanitizeDecimal(t))} />
        <TextInput style={styles.input} placeholder="Musculatura (%)" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={musculatura} onChangeText={(t) => setMusculatura(sanitizeDecimal(t))} />

        {/* Botão */}
        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSalvar}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.buttonText}>Salvar Avaliação</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- estilos ----------
const pickerStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.divider || '#E0E0E0',
    borderRadius: 12,
    color: Colors.textPrimary,
    paddingRight: 30,
    backgroundColor: Colors.cardBackground,
    height: 48,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.divider || '#E0E0E0',
    borderRadius: 12,
    color: Colors.textPrimary,
    paddingRight: 30,
    backgroundColor: Colors.cardBackground,
    height: 48,
  },
  iconContainer: { top: 14, right: 10 },
  placeholder: { color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider || '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
    height: 48,
  },
  inputError: { borderColor: '#E53935' },

  dateInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider || '#E0E0E0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  dateText: { color: Colors.textPrimary, fontSize: 16 },

  imcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  imcBox: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider || '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  imcLabel: { fontWeight: '800', color: Colors.textSecondary, marginBottom: 4 },
  imcValue: { fontWeight: '800', fontSize: 18, color: Colors.textPrimary },
  imcChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  imcChipText: { fontWeight: '800' },

  center: { alignItems: 'center', justifyContent: 'center' },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
