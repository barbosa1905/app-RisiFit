// screens/Admin/CriarAvaliacaoScreen.js — estabilidade do teclado + layout pro
// Obrigatórios: Cliente e Peso. Restante opcional. Corrigido: teclado a fechar em inputs numéricos.

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
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db, auth } from '../../services/firebaseConfig';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

// ---------- helpers ----------
const sanitizeDecimal = (text = '') => text.replace(/[^0-9.,]/g, '').replace(',', '.');
const toNumberOrNull = (v) => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const formatDatePT = (d) => (d instanceof Date ? d : new Date(d)).toLocaleDateString('pt-PT');

const classifyImc = (imc) => {
  if (!Number.isFinite(imc)) return { label: '-', color: Colors.textSecondary };
  if (imc < 18.5) return { label: 'Abaixo do peso', color: '#1E88E5' };
  if (imc < 25) return { label: 'Normal', color: '#43A047' };
  if (imc < 30) return { label: 'Excesso de peso', color: '#FB8C00' };
  if (imc < 35) return { label: 'Obesidade I', color: '#E53935' };
  if (imc < 40) return { label: 'Obesidade II', color: '#D32F2F' };
  return { label: 'Obesidade III', color: '#B71C1C' };
};

const calcTMB = ({ pesoKg, alturaM, idadeAnos, sexo }) => {
  const peso = Number.isFinite(pesoKg) ? pesoKg : null;
  const alturaCm = Number.isFinite(alturaM) ? alturaM * 100 : null;
  const idade = Number.isFinite(idadeAnos) ? idadeAnos : null;
  if (peso == null || alturaCm == null || idade == null || !sexo) return null;
  const base = 10 * peso + 6.25 * alturaCm - 5 * idade;
  return sexo === 'masculino' ? Math.round(base + 5) : Math.round(base - 161);
};

// Wrapper de input (não sanitiza a cada tecla para evitar re-render agressivo)
// Input NÃO CONTROLADO: mantém o foco estável no Android e só "commita" valor ao terminar
const UnitInputU = React.memo(({ defaultValue = '', onCommit, placeholder, unit, error, keyboardType = 'decimal-pad' }) => {
  const [local, setLocal] = useState(String(defaultValue ?? ''));
  return (
    <View style={[styles.inputWrap, error && styles.inputError]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        defaultValue={local}
        onChangeText={(t) => setLocal(t)}
        onEndEditing={() => onCommit && onCommit(local)}
        onBlur={() => onCommit && onCommit(local)}
        autoCorrect={false}
        autoCapitalize="none"
        blurOnSubmit={false}
        returnKeyType="next"
      />
      <View style={styles.unitBadge} pointerEvents="none"><Text style={styles.unitText}>{unit}</Text></View>
    </View>
  );
});

export default function CriarAvaliacaoScreen({ navigation }) {
  const [clientes, setClientes] = useState([]);
  const [clientesLoading, setClientesLoading] = useState(true);
  const [clienteId, setClienteId] = useState(null);

  const [dataAvaliacao, setDataAvaliacao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [sexo, setSexo] = useState(null);
  const [idade, setIdade] = useState('');

  // Estados de TEXTO para inputs (evita perder foco ao normalizar)
  const [pesoTxt, setPesoTxt] = useState('');
  const [alturaTxt, setAlturaTxt] = useState('');
  const [massaMagraKgTxt, setMassaMagraKgTxt] = useState('');
  const [massaMagraPercTxt, setMassaMagraPercTxt] = useState('');
  const [massaGordaKgTxt, setMassaGordaKgTxt] = useState('');
  const [massaGordaPercTxt, setMassaGordaPercTxt] = useState('');

  const [bracoDirRelaxTxt, setBracoDirRelaxTxt] = useState('');
  const [bracoDirContrTxt, setBracoDirContrTxt] = useState('');
  const [bracoEsqRelaxTxt, setBracoEsqRelaxTxt] = useState('');
  const [bracoEsqContrTxt, setBracoEsqContrTxt] = useState('');
  const [peitoTxt, setPeitoTxt] = useState('');
  const [cinturaTxt, setCinturaTxt] = useState('');
  const [abdomenTxt, setAbdomenTxt] = useState('');
  const [ancaTxt, setAncaTxt] = useState('');
  const [coxaDirTxt, setCoxaDirTxt] = useState('');
  const [coxaEsqTxt, setCoxaEsqTxt] = useState('');
  const [gemeoDirTxt, setGemeoDirTxt] = useState('');
  const [gemeoEsqTxt, setGemeoEsqTxt] = useState('');

  const [tricepsTxt, setTricepsTxt] = useState('');
  const [bicepsTxt, setBicepsTxt] = useState('');
  const [subescapularTxt, setSubescapularTxt] = useState('');
  const [suprailicaTxt, setSuprailicaTxt] = useState('');
  const [abdominalTxt, setAbdominalTxt] = useState('');
  const [coxaDobraTxt, setCoxaDobraTxt] = useState('');
  const [GêmeoDobraTxt, setGêmeoDobraTxt] = useState('');
  const [peitoralTxt, setPeitoralTxt] = useState('');

  const [gorduraCorporalTxt, setGorduraCorporalTxt] = useState('');
  const [massaMuscularTxt, setMassaMuscularTxt] = useState('');
  const [aguaTotalTxt, setAguaTotalTxt] = useState('');
  const [massaOsseaTxt, setMassaOsseaTxt] = useState('');

  const [imc, setImc] = useState('');
  const [tmb, setTmb] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [openDados, setOpenDados] = useState(false);
  const [openMetricas, setOpenMetricas] = useState(true);
  const [openPerimetros, setOpenPerimetros] = useState(false);
  const [openDobras, setOpenDobras] = useState(false);
  const [openComposicao, setOpenComposicao] = useState(false);

  useEffect(() => {
    const run = async () => {
      setClientesLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach((docu) => {
          const d = docu.data() || {};
          if (d.role === 'user' && (!d.adminId || d.adminId === auth.currentUser?.uid)) {
            list.push({ id: docu.id, label: d.name || d.nome || d.email || 'Cliente', value: docu.id, key: docu.id });
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

  // Cálculos derivam de TEXTO, mas convertem com sanitize no momento do cálculo
  useEffect(() => {
    const id = setTimeout(() => {
      const p = toNumberOrNull(sanitizeDecimal(pesoTxt));
      const a = toNumberOrNull(sanitizeDecimal(alturaTxt));
      if (p && a && a > 0) setImc((p / (a * a)).toFixed(2)); else setImc('');
    }, 120);
    return () => clearTimeout(id);
  }, [pesoTxt, alturaTxt]);

  useEffect(() => {
    const id = setTimeout(() => {
      const calc = calcTMB({
        pesoKg: toNumberOrNull(sanitizeDecimal(pesoTxt)),
        alturaM: toNumberOrNull(sanitizeDecimal(alturaTxt)),
        idadeAnos: toNumberOrNull(sanitizeDecimal(idade)),
        sexo,
      });
      setTmb(calc ? String(calc) : '');
    }, 120);
    return () => clearTimeout(id);
  }, [pesoTxt, alturaTxt, idade, sexo]);

  const imcInfo = useMemo(() => classifyImc(parseFloat(imc)), [imc]);

  // Validação mínima
  const validate = () => {
    const e = {};
    if (!clienteId) e.clienteId = 'Seleciona um cliente (obrigatório).';
    const p = toNumberOrNull(sanitizeDecimal(pesoTxt));
    if (!(p && p > 0)) e.peso = 'Peso inválido (obrigatório).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const obrigatoriosPreenchidos = [clienteId ? 1 : 0, toNumberOrNull(sanitizeDecimal(pesoTxt)) ? 1 : 0].reduce((a, b) => a + b, 0);

  const handleSalvar = async () => {
    if (!validate()) {
      Alert.alert('Verifica os campos', 'Preenche os campos obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        clienteId,
        dataAvaliacao: Timestamp.fromDate(dataAvaliacao),
        sexo: sexo || null,
        idade: toNumberOrNull(sanitizeDecimal(idade)),
        metricasBasicas: {
          peso: toNumberOrNull(sanitizeDecimal(pesoTxt)),
          altura: toNumberOrNull(sanitizeDecimal(alturaTxt)),
          imc: toNumberOrNull(imc),
          massaMagraKg: toNumberOrNull(sanitizeDecimal(massaMagraKgTxt)),
          massaMagraPerc: toNumberOrNull(sanitizeDecimal(massaMagraPercTxt)),
          massaGordaKg: toNumberOrNull(sanitizeDecimal(massaGordaKgTxt)),
          massaGordaPerc: toNumberOrNull(sanitizeDecimal(massaGordaPercTxt)),
          tmb: toNumberOrNull(sanitizeDecimal(tmb)),
        },
        perimetros: {
          bracoDireitoRelaxado: toNumberOrNull(sanitizeDecimal(bracoDirRelaxTxt)),
          bracoDireitoContraido: toNumberOrNull(sanitizeDecimal(bracoDirContrTxt)),
          bracoEsquerdoRelaxado: toNumberOrNull(sanitizeDecimal(bracoEsqRelaxTxt)),
          bracoEsquerdoContraido: toNumberOrNull(sanitizeDecimal(bracoEsqContrTxt)),
          peito: toNumberOrNull(sanitizeDecimal(peitoTxt)),
          cintura: toNumberOrNull(sanitizeDecimal(cinturaTxt)),
          abdomen: toNumberOrNull(sanitizeDecimal(abdomenTxt)),
          anca: toNumberOrNull(sanitizeDecimal(ancaTxt)),
          coxaDireita: toNumberOrNull(sanitizeDecimal(coxaDirTxt)),
          coxaEsquerda: toNumberOrNull(sanitizeDecimal(coxaEsqTxt)),
          gemeoDireito: toNumberOrNull(sanitizeDecimal(gemeoDirTxt)),
          gemeoEsquerdo: toNumberOrNull(sanitizeDecimal(gemeoEsqTxt)),
        },
        dobrasCutaneas: {
          triceps: toNumberOrNull(sanitizeDecimal(tricepsTxt)),
          biceps: toNumberOrNull(sanitizeDecimal(bicepsTxt)),
          subescapular: toNumberOrNull(sanitizeDecimal(subescapularTxt)),
          suprailica: toNumberOrNull(sanitizeDecimal(suprailicaTxt)),
          abdominal: toNumberOrNull(sanitizeDecimal(abdominalTxt)),
          coxa: toNumberOrNull(sanitizeDecimal(coxaDobraTxt)),
          Gêmeo: toNumberOrNull(sanitizeDecimal(GêmeoDobraTxt)),
          peitoral: toNumberOrNull(sanitizeDecimal(peitoralTxt)),
        },
        composicaoCorporal: {
          gorduraCorporal: toNumberOrNull(sanitizeDecimal(gorduraCorporalTxt)),
          massaMuscular: toNumberOrNull(sanitizeDecimal(massaMuscularTxt)),
          aguaCorporalTotal: toNumberOrNull(sanitizeDecimal(aguaTotalTxt)),
          massaOssea: toNumberOrNull(sanitizeDecimal(massaOsseaTxt)),
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

  const DropdownIcon = () => (
    <AntDesign name="down" size={16} color={Colors.textSecondary} style={{ marginRight: 10 }} />
  );

  const Section = ({ title, subtitle, open, onToggle, children }) => (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
      </Pressable>
      {open && <View style={styles.cardBody}>{children}</View>}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={Colors.primary} barStyle="light-content" />
      <AppHeader title="Criar Nova Avaliação" showBackButton onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          removeClippedSubviews={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <LinearGradient colors={[Colors.primary, Colors.secondary || '#FFB800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Nova Avaliação</Text>
                <Text style={styles.heroKpis}>Obrigatórios: {obrigatoriosPreenchidos}/2</Text>
              </View>
              <Ionicons name="fitness-outline" size={28} color={Colors.onPrimary} />
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalhes</Text>

            <Text style={styles.label}>Cliente <Text style={styles.req}>*</Text></Text>
            {clientesLoading ? (
              <View style={[styles.inputWrap, styles.center]}>
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
              <DateTimePicker value={dataAvaliacao} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { if (Platform.OS === 'android') setShowDatePicker(false); if (d) setDataAvaliacao(d); }} maximumDate={new Date()} />
            )}
          </View>

          <Section title="Dados Pessoais para Cálculos (opcional)" subtitle="Necessários apenas para calcular TMB" open={openDados} onToggle={() => setOpenDados((v) => !v)}>
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.pickerContainer}>
              <RNPickerSelect
                onValueChange={(value) => setSexo(value)}
                items={[{ label: 'Masculino', value: 'masculino' }, { label: 'Feminino', value: 'feminino' }]}
                placeholder={{ label: 'Selecione o sexo...', value: null, color: Colors.textSecondary }}
                style={pickerStyles}
                value={sexo}
                useNativeAndroidPickerStyle={false}
                Icon={DropdownIcon}
              />
            </View>

            <Text style={styles.label}>Idade (anos)</Text>
            <View style={styles.inputWrap}><TextInput style={styles.input} placeholder="Ex.: 30" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" value={idade} onChangeText={setIdade} autoCorrect={false} autoCapitalize="none" blurOnSubmit={false} returnKeyType="done" /></View>
          </Section>

          <Section title="Métricas Básicas" subtitle="Peso é obrigatório; altura é opcional" open={openMetricas} onToggle={() => setOpenMetricas((v) => !v)}>
            <Text style={styles.label}>Peso corporal <Text style={styles.req}>*</Text></Text>
            <UnitInputU defaultValue={pesoTxt} onCommit={setPesoTxt} placeholder="Ex.: 75.5" unit="kg" error={!!errors.peso} />
            {!!errors.peso && <Text style={styles.errorText}>{errors.peso}</Text>}

            <Text style={styles.label}>Altura (opcional)</Text>
            <UnitInputU defaultValue={alturaTxt} onCommit={setAlturaTxt} placeholder="Ex.: 1.70" unit="m" />

            <View style={styles.imcRow}>
              <View style={styles.imcBox}>
                <Text style={styles.imcLabel}>IMC (kg/m²)</Text>
                <Text style={styles.imcValue}>{imc || '-'}</Text>
                {!alturaTxt && <Text style={styles.hint}>Preenche a altura para calcular o IMC.</Text>}
              </View>
              <View style={[styles.imcChip, { borderColor: imcInfo.color }]}>
                <Text style={[styles.imcChipText, { color: imcInfo.color }]}>{imcInfo.label}</Text>
              </View>
            </View>

            <Text style={styles.subLabel}>Composição estimada (opcional)</Text>
            <UnitInputU defaultValue={massaMagraKgTxt} onCommit={setMassaMagraKgTxt} placeholder="Massa magra" unit="kg" />
            <UnitInputU defaultValue={massaMagraPercTxt} onCommit={setMassaMagraPercTxt} placeholder="Massa magra" unit="%" />
            <UnitInputU defaultValue={massaGordaKgTxt} onCommit={setMassaGordaKgTxt} placeholder="Massa gorda" unit="kg" />
            <UnitInputU defaultValue={massaGordaPercTxt} onCommit={setMassaGordaPercTxt} placeholder="Massa gorda" unit="%" />

            <Text style={styles.label}>Taxa metabólica basal</Text>
            <View style={[styles.inputWrap, styles.readonly]}>
              <TextInput style={styles.input} placeholder="Calculada automaticamente" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" value={tmb} editable={false} />
              <View style={styles.unitBadge} pointerEvents="none"><Text style={styles.unitText}>kcal/d</Text></View>
            </View>
          </Section>

          <Section title="Perímetros Corporais (opcional)" subtitle="Todos os campos são opcionais" open={openPerimetros} onToggle={() => setOpenPerimetros((v) => !v)}>
            <UnitInputU defaultValue={bracoDirRelaxTxt} onCommit={setBracoDirRelaxTxt} placeholder="Braço direito (relaxado)" unit="cm" />
            <UnitInputU defaultValue={bracoDirContrTxt} onCommit={setBracoDirContrTxt} placeholder="Braço direito (contraído)" unit="cm" />
            <UnitInputU defaultValue={bracoEsqRelaxTxt} onCommit={setBracoEsqRelaxTxt} placeholder="Braço esquerdo (relaxado)" unit="cm" />
            <UnitInputU defaultValue={bracoEsqContrTxt} onCommit={setBracoEsqContrTxt} placeholder="Braço esquerdo (contraído)" unit="cm" />
            <UnitInputU defaultValue={peitoTxt} onCommit={setPeitoTxt} placeholder="Peito" unit="cm" />
            <UnitInputU defaultValue={cinturaTxt} onCommit={setCinturaTxt} placeholder="Cintura" unit="cm" />
            <UnitInputU defaultValue={abdomenTxt} onCommit={setAbdomenTxt} placeholder="Abdómen" unit="cm" />
            <UnitInputU defaultValue={ancaTxt} onCommit={setAncaTxt} placeholder="Anca" unit="cm" />
            <UnitInputU defaultValue={coxaDirTxt} onCommit={setCoxaDirTxt} placeholder="Coxa direita" unit="cm" />
            <UnitInputU defaultValue={coxaEsqTxt} onCommit={setCoxaEsqTxt} placeholder="Coxa esquerda" unit="cm" />
            <UnitInputU defaultValue={gemeoDirTxt} onCommit={setGemeoDirTxt} placeholder="Gémeo direito" unit="cm" />
            <UnitInputU defaultValue={gemeoEsqTxt} onCommit={setGemeoEsqTxt} placeholder="Gémeo esquerdo" unit="cm" />
          </Section>

          <Section title="Dobras Cutâneas (opcional)" subtitle="Valores em milímetros" open={openDobras} onToggle={() => setOpenDobras((v) => !v)}>
            <UnitInputU defaultValue={tricepsTxt} onCommit={setTricepsTxt} placeholder="Tríceps" unit="mm" />
            <UnitInputU defaultValue={bicepsTxt} onCommit={setBicepsTxt} placeholder="Bíceps" unit="mm" />
            <UnitInputU defaultValue={subescapularTxt} onCommit={setSubescapularTxt} placeholder="Subescapular" unit="mm" />
            <UnitInputU defaultValue={suprailicaTxt} onCommit={setSuprailicaTxt} placeholder="Suprailíaca" unit="mm" />
            <UnitInputU defaultValue={abdominalTxt} onCommit={setAbdominalTxt} placeholder="Abdominal (dobra)" unit="mm" />
            <UnitInputU defaultValue={coxaDobraTxt} onCommit={setCoxaDobraTxt} placeholder="Coxa (dobra)" unit="mm" />
            <UnitInputU defaultValue={GêmeoDobraTxt} onCommit={setGêmeoDobraTxt} placeholder="Gêmeo (dobra)" unit="mm" />
            <UnitInputU defaultValue={peitoralTxt} onCommit={setPeitoralTxt} placeholder="Peitoral" unit="mm" />
          </Section>

          <Section title="Composição Corporal (opcional)" subtitle="Percentagens de referência" open={openComposicao} onToggle={() => setOpenComposicao((v) => !v)}>
           
            <UnitInputU defaultValue={aguaTotalTxt} onCommit={setAguaTotalTxt} placeholder="Água corporal total" unit="%" />
            <UnitInputU defaultValue={massaOsseaTxt} onCommit={setMassaOsseaTxt} placeholder="Massa óssea"  />
          </Section>

          <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSalvar} disabled={saving}>
            {saving ? <ActivityIndicator color={Colors.onPrimary} /> : <Text style={styles.buttonText}>Guardar Avaliação</Text>}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>Campos assinalados com <Text style={styles.req}>*</Text> são obrigatórios. O resto é opcional.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const pickerStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', borderRadius: 12, color: Colors.textPrimary, paddingRight: 30, backgroundColor: Colors.cardBackground, height: 48 },
  inputAndroid: { fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', borderRadius: 12, color: Colors.textPrimary, paddingRight: 30, backgroundColor: Colors.cardBackground, height: 48 },
  iconContainer: { top: 14, right: 10 },
  placeholder: { color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { borderRadius: 16, padding: 16, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: { color: Colors.onPrimary, fontSize: 18, fontWeight: '800' },
  heroKpis: { color: Colors.onPrimary, opacity: 0.9, marginTop: 2 },
  card: { backgroundColor: Colors.cardBackground, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardBody: { marginTop: 8 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6, marginTop: 4 },
  subLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 8, marginBottom: 6 },
  req: { color: '#E53935' },
  inputWrap: { backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, height: 48, paddingRight: 52 },
  input: { flex: 1, paddingHorizontal: 12, color: Colors.textPrimary, fontSize: 16 },
  unitBadge: { position: 'absolute', right: 6, top: 6, bottom: 6, minWidth: 44, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  unitText: { color: Colors.textSecondary, fontWeight: '700' },
  inputError: { borderColor: '#E53935' },
  dateInput: { backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', borderRadius: 12, height: 48, paddingHorizontal: 12, justifyContent: 'center', marginBottom: 10 },
  dateText: { color: Colors.textPrimary, fontSize: 16 },
  imcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  imcBox: { flex: 1, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider || '#E0E0E0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  imcLabel: { fontWeight: '800', color: Colors.textSecondary, marginBottom: 4 },
  imcValue: { fontWeight: '800', fontSize: 18, color: Colors.textPrimary },
  hint: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },
  imcChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1.5, alignSelf: 'flex-start' },
  imcChipText: { fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center' },
  button: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  pickerContainer: { borderWidth: 0 },
  disclaimer: { textAlign: 'center', color: Colors.textSecondary, fontSize: 12, marginTop: 10 },
  readonly: { opacity: 0.9 },
});
