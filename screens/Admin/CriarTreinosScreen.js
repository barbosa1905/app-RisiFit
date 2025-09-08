// screens/Admin/CriarTreinosScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Platform, Modal, Alert,
  KeyboardAvoidingView, ActivityIndicator, Switch, FlatList,
  Dimensions, Pressable, ScrollView, TouchableWithoutFeedback
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { buscarClientes, criarTreinoParaCliente, buscarTodosTreinosComNomes } from '../../services/adminService';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obterNomeCliente } from '../../utils/clienteUtils';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { db } from '../../services/firebaseConfig';
import { collection, query, onSnapshot, Timestamp, doc, setDoc, getDoc, addDoc, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AppHeader from '../../components/AppHeader';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';

/* ================= AI local determinística ================= */
const mulberry32 = (seed = 123456) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
const pickN = (arr, n) => arr.slice(0, Math.max(0, n));

const PRESETS = {
  Hipertrofia: { seriesType:'reps_and_load', reps:'8-12', sets:3, descanso:'60-90s' },
  Força:       { seriesType:'reps_and_load', reps:'3-6',  sets:4, descanso:'120-180s' },
  Emagrecimento:{seriesType:'reps_and_time', reps:'12-15',sets:3, descanso:'30-60s' },
  Mobilidade:  { seriesType:'reps_and_time', reps:'10-12',sets:2, descanso:'20-40s' },
};
const VOLUME_FACTOR = { Iniciante:0.85, 'Intermédio':1, 'Avançado':1.2 };
const CONTRA = [
  { tag:'joelho',  avoid: [/agach/i, /jump/i, /plyo/i, /lunge/i] },
  { tag:'ombro',   avoid: [/overhead/i, /military/i, /press/i, /snatch/i] },
  { tag:'lombar',  avoid: [/deadlift/i, /good ?morning/i, /hip hinge/i] },
  { tag:'cotovelo',avoid: [/skull/i, /french/i] },
];
const hitsRestricao = (exName = '', restr = '') => {
  const lower = (restr || '').toLowerCase();
  if (!lower) return null;
  for (const r of CONTRA) {
    if (lower.includes(r.tag) && r.avoid.some(rx => rx.test(exName))) return r.tag;
  }
  return null;
};
const scoreExercise = (ex, ctx) => {
  const reasons = [];
  let s = 0;
  if (ctx.focoSet.size) {
    const tm = new Set(ex.targetMuscles || []);
    const ok = [...ctx.focoSet].some(m => tm.has(m));
    if (ok){ s += 3; reasons.push('alinha com foco muscular'); }
    else   { s -= 1; reasons.push('fora do foco muscular'); }
  }
  if (ctx.cat && ex.category === ctx.cat){ s += 1.5; reasons.push('categoria correspondente'); }
  if (ctx.equipSet.size) {
    const eq = new Set(ex.equipment || []);
    const ok = [...ctx.equipSet].some(e => eq.has(e));
    if (ok){ s += 1.2; reasons.push('usa equipamento disponível'); }
    else   { s -= 0.5; reasons.push('exige outro equipamento'); }
  }
  if (ex.animationUrl){ s += 1.5; reasons.push('tem vídeo'); }
  const restrTag = hitsRestricao(ex.name || ex.exerciseName || '', ctx.restr);
  if (restrTag){ s -= 5; reasons.push(`evitar por restrição: ${restrTag}`); }
  return { score:s, reasons };
};
const muscleKey = (ex) => (ex.targetMuscles && ex.targetMuscles[0]) || 'geral';
const validatePlan = (plan, ctx) => {
  const issues = [];
  plan.forEach((ex,i)=>{ if (!ex.setDetails?.length) issues.push(`Exercício ${i+1} sem séries`); });
  if (ctx.focoSet.size) {
    const cobertos = new Set();
    plan.forEach(ex => (ex.targetMuscles||[]).forEach(m => ctx.focoSet.has(m) && cobertos.add(m)));
    const faltam = [...ctx.focoSet].filter(m=>!cobertos.has(m));
    if (faltam.length) issues.push(`Cobertura insuficiente de: ${faltam.join(', ')}`);
  }
  const proibidos = plan.filter(ex => hitsRestricao(ex.name||'', ctx.restr));
  if (proibidos.length) issues.push(`Potenciais contra-indicações: ${proibidos.map(e=>e.name).join(', ')}`);
  return issues;
};
const generateWorkout = ({
  objetivo, nivel, exerciciosPorSessao, focoMuscular, equipamento, incluirCardio,
  categoriaTreino, restricoes, listaExercicios, seed = 42
}) => {
  const rnd = mulberry32(seed);
  const focoSet = new Set(focoMuscular || []);
  const equipSet = new Set(equipamento || []);
  const ctx = { focoSet, equipSet, cat: categoriaTreino, restr: restricoes };

  let cand = (listaExercicios||[]).filter(ex => {
    if (categoriaTreino && categoriaTreino!=='Outro' && ex.category && ex.category!==categoriaTreino) return false;
    if (equipSet.size) {
      const eq = new Set(ex.equipment||[]);
      if (![...equipSet].some(e=>eq.has(e))) return false;
    }
    if (focoSet.size) {
      const tm = new Set(ex.targetMuscles||[]);
      if (![...focoSet].some(m=>tm.has(m))) return false;
    }
    return true;
  });
  if (!cand.length) cand = [...(listaExercicios||[])];

  const scored = cand.map(ex=>{
    const { score, reasons } = scoreExercise(ex, ctx);
    return { ex, score, reasons, tiebreak: rnd() };
  }).sort((a,b)=> (b.score - a.score) || (a.tiebreak - b.tiebreak));

  const buckets = new Map();
  scored.forEach(s=>{
    const k = muscleKey(s.ex);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(s);
  });
  const roundRobin = [];
  const keys = [...buckets.keys()];
  let idx = 0;
  while (roundRobin.length < Math.min(exerciciosPorSessao, scored.length)) {
    const k = keys[idx % keys.length];
    const arr = buckets.get(k);
    if (arr?.length) roundRobin.push(arr.shift());
    idx++;
    if (idx > 5000) break;
  }
  let picked = roundRobin.map(s=>s);
  if (picked.length < exerciciosPorSessao) {
    const leftovers = scored.filter(s=>!picked.includes(s));
    picked = picked.concat(pickN(leftovers, exerciciosPorSessao - picked.length));
  }
  picked = picked.slice(0, exerciciosPorSessao);

  const preset = PRESETS[objetivo] || PRESETS.Hipertrofia;
  const vol = Math.max(2, Math.round(preset.sets * (VOLUME_FACTOR[nivel] || 1)));

  const plan = picked.map(({ ex, reasons }) => ({
    id: ex.id,
    name: ex.name,
    description: ex.description,
    category: ex.category,
    targetMuscles: ex.targetMuscles,
    equipment: ex.equipment,
    animationUrl: ex.animationUrl,
    imageUrl: ex.imageUrl,
    notes: '',
    customExerciseId: String(Date.now()) + Math.random().toString(36).slice(2,7),
    isExpanded: true,
    explicacaoAI: reasons,
    confidence: Math.max(0, Math.min(100, Math.round(reasons.length * 12 + (ex.animationUrl ? 16 : 0)))),
    setDetails: Array.from({ length: vol }).map(() => ({
      id: String(Date.now()) + Math.random().toString(36).slice(2,7),
      seriesType: preset.seriesType,
      reps: preset.seriesType.includes('reps') ? preset.reps : '',
      tempo: preset.seriesType.includes('time') ? '30-45s' : '',
      peso: preset.seriesType === 'reps_and_load' ? '' : '',
      inclinacao: '', distancia: '', ritmo: (objetivo==='Emagrecimento') ? 'RPE7-8' : '',
      descanso: preset.descanso, notas: '', cadencia: '',
    })),
  }));

  if (incluirCardio) {
    const cardio = (listaExercicios||[]).find(e => (e.category||'').toLowerCase().includes('cardio'));
    if (cardio) {
      plan.push({
        id: cardio.id, name: cardio.name, description: cardio.description, category: cardio.category,
        targetMuscles: cardio.targetMuscles, equipment: cardio.equipment, animationUrl: cardio.animationUrl, imageUrl: cardio.imageUrl,
        notes: '', customExerciseId: String(Date.now()) + Math.random().toString(36).slice(2,7), isExpanded: true,
        explicacaoAI: ['bloco de cardio solicitado'], confidence: 70,
        setDetails: [{ id: String(Date.now()) + Math.random().toString(36).slice(2,7), seriesType:'time_and_incline', tempo:'10-15m', inclinacao:'leve', ritmo:'confortável', descanso:'—', reps:'', peso:'', distancia:'', notas:'', cadencia:'' }],
      });
    }
  }

  const issues = validatePlan(plan, ctx);
  return { plan, issues, seedUsed: seed };
};
/* ===================== FIM AI local ===================== */

/* ---------- Cores ---------- */
const Colors = {
  primary: '#2A3B47', secondary: '#FFB800', background: '#F4F6F8', cardBackground: '#FFFFFF',
  textPrimary: '#1F2A37', textSecondary: '#6B7280', success: '#22C55E', danger: '#EF4444',
  info: '#3B82F6', placeholder: '#9CA3AF', shadow: 'rgba(16, 24, 40, 0.1)', border: '#E5E7EB',
};

/* ---------- UI helpers ---------- */
const BotaoPilula = ({ title, onPress, icon = 'plus-circle', variant = 'primary', size = 'md', style }) => {
  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const height = size === 'sm' ? 32 : 48;
  const paddingH = size === 'sm' ? 12 : 18;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
      style={({ pressed }) => [
        {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          height, paddingHorizontal: paddingH, borderRadius: 999,
          backgroundColor: isPrimary ? Colors.primary : 'transparent',
          borderWidth: isOutline ? 1 : 0, borderColor: isOutline ? Colors.border : 'transparent',
          opacity: pressed ? 0.9 : 1, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isPrimary ? 0.15 : 0.05, shadowRadius: 6, elevation: isPrimary ? 2 : 0,
        }, style,
      ]}
    >
      {!!icon && <Feather name={icon} size={size === 'sm' ? 16 : 18} color={isPrimary ? '#fff' : Colors.textPrimary} style={{ marginRight: title ? 10 : 0 }} />}
      {!!title && <Text style={{ color: isPrimary ? '#fff' : Colors.textPrimary, fontWeight: '800', fontSize: size === 'sm' ? 13 : 16 }}>{title}</Text>}
    </Pressable>
  );
};

const Chip = ({ label, selected, onToggle, style, icon }) => (
  <Pressable
    onPress={onToggle}
    style={({ pressed }) => [
      {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 36,
        borderRadius: 999, marginRight: 8, marginBottom: 8,
        backgroundColor: selected ? Colors.primary : '#F8FAFC',
        borderWidth: 1, borderColor: selected ? Colors.primary : Colors.border, opacity: pressed ? 0.9 : 1,
      }, style,
    ]}>
    {icon ? <Feather name={icon} size={14} color={selected ? '#fff' : Colors.textPrimary} style={{ marginRight: 6 }} /> : null}
    <Text style={{ color: selected ? '#fff' : Colors.textPrimary, fontWeight: '600', fontSize: 12 }}>{label}</Text>
  </Pressable>
);

/* ---------- Séries ---------- */
const categorias = ['Cardio', 'Força', 'Mobilidade', 'Flexibilidade', 'Core', 'Outro'];
const seriesTypes = {
  reps_and_load: { label: 'Repetições e carga', fields: ['reps', 'peso', 'descanso'], icons: ['repeat', 'dumbbell', 'pause-circle'] },
  reps_load_time: { label: 'Repetições, carga e tempo', fields: ['reps', 'peso', 'tempo', 'descanso'], icons: ['repeat', 'dumbbell', 'clock', 'pause-circle'] },
  reps_and_time: { label: 'Repetições e tempo', fields: ['reps', 'tempo', 'descanso'], icons: ['repeat', 'clock', 'pause-circle'] },
  time_and_incline: { label: 'Tempo e inclinação', fields: ['tempo', 'inclinacao', 'descanso'], icons: ['clock', 'trending-up', 'pause-circle'] },
  running: { label: 'Corrida', fields: ['distancia', 'tempo', 'ritmo', 'descanso'], icons: ['map', 'clock', 'activity', 'pause-circle'] },
  notes: { label: 'Observações', fields: ['notas'], icons: ['edit-3'] },
  cadence: { label: 'Cadência', fields: ['cadencia', 'descanso'], icons: ['music', 'pause-circle'] },
  split_series: { label: 'Série Split', fields: ['reps', 'peso', 'descanso'], icons: ['repeat', 'dumbbell', 'pause-circle'] },
};

const gerarIDUnico = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

const InlineWorkoutDetailsInput = React.memo(({ placeholder, value, onChangeText, multiline = false, keyboardType = 'default', style, icon }) => {
  const IconComponent = icon === 'dumbbell' ? FontAwesome5 : Feather;
  return (
    <View style={localStyles.inputContainer}>
      <IconComponent name={icon} size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
      <TextInput
        style={[localStyles.input, multiline && localStyles.multilineInput, style]}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        enablesReturnKeyAutomatically
      />
    </View>
  );
});

/* ---------- helpers texto ---------- */
const toSlug = (s='') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const splitList = (txt='') => txt.split(',').map(t=>t.trim()).filter(Boolean);

/* ---------- TimePicker ---------- */
const renderTimePicker = ({ showPicker, value, onChange, onConfirm, minDateTime }) => {
  if (Platform.OS === 'ios') {
    return (
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={onConfirm}>
        <TouchableWithoutFeedback onPress={onConfirm}>
          <View style={localStyles.pickerModalOverlay}>
            <View style={localStyles.pickerModalContent}>
              <DateTimePicker value={value || new Date()} mode="time" is24Hour display="spinner" onChange={onChange} style={localStyles.dateTimePicker} minimumDate={minDateTime || undefined} />
              <Pressable style={localStyles.pickerConfirmButton} onPress={onConfirm}><Text style={localStyles.pickerConfirmButtonText}>Confirmar</Text></Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
  return showPicker ? <DateTimePicker value={value || new Date()} mode="time" is24Hour display="default" onChange={onChange} minimumDate={minDateTime || undefined} /> : null;
};

/* ---------- Header Steps ---------- */
const MemoizedListHeader = React.memo((props) => {
  const {
    currentStep, setCurrentStep,
    clienteSelecionado, setModalClientesVisible,
    dataSelecionada, setDataSelecionada, markedDatesForCalendar,
    mostrarPickerHora, setMostrarPickerHora, horaSelecionada, onChangeHora,
    isCreatingFromScratch, setIsCreatingFromScratch, setSelectedWorkoutTemplate, setIsTemplateSelectionModalVisible,
    nome, setNome, descricao, setDescricao, categoria, setCategoria,
    saveAsTemplate, setSaveAsTemplate, newTemplateName, setNewTemplateName, newTemplateDescription, setNewTemplateDescription,
    adicionarExercicio, selectedWorkoutTemplate, isCategoryModalVisible, setIsCategoryModalVisible, minDate, minDateTime, handleGoToStep5,
    setAIModalVisible
  } = props;

  return (
    <View style={localStyles.listHeaderContainer}>
      {/* STEP 1: Selecionar Cliente (apenas seleção) */}
      {currentStep === 1 && (
        <View style={[localStyles.card, localStyles.heroCard]}>
          <View style={localStyles.heroLeft}>
            <View style={localStyles.avatarCircle}>
              <Feather name="users" size={28} color={Colors.primary} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={localStyles.heroTitle}>Selecionar cliente</Text>
              <Text style={localStyles.heroSubtitle}>Escolhe o cliente para quem vais criar o treino.</Text>
            </View>
          </View>
          <BotaoPilula
            title="Escolher cliente"
            icon="user-check"
            onPress={() => setModalClientesVisible(true)}
            style={{ marginTop: 14 }}
          />
        </View>
      )}

      {/* STEP 2: Agendamento */}
      {currentStep === 2 && clienteSelecionado && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>2. Agendamento</Text>

          <Calendar
            onDayPress={(day) => setDataSelecionada(day.dateString)}
            minDate={minDate}
            markedDates={{
              ...markedDatesForCalendar,
              [dataSelecionada]: { selected: true, disableTouchEvent: true, selectedDotColor: Colors.cardBackground, selectedColor: Colors.primary },
            }}
            theme={{
              calendarBackground: Colors.cardBackground, selectedDayBackgroundColor: Colors.primary, selectedDayTextColor: Colors.cardBackground,
              todayTextColor: Colors.secondary, dayTextColor: Colors.textPrimary, textDisabledColor: Colors.placeholder, arrowColor: Colors.textPrimary,
              monthTextColor: Colors.textPrimary, textMonthFontWeight: 'bold',
              'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.background, borderRadius: 8, paddingVertical: 5 } }
            }}
            style={localStyles.calendar}
          />

          <Pressable onPress={() => setMostrarPickerHora(true)} style={({ pressed }) => [localStyles.timeInput, pressed && { opacity: 0.95 }]}>
            <Feather name="clock" size={20} color={Colors.placeholder} />
            <Text style={{ color: horaSelecionada ? Colors.textPrimary : Colors.placeholder, fontSize: 16 }}>
              {horaSelecionada ? horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Selecionar Hora'}
            </Text>
          </Pressable>

          {renderTimePicker({
            showPicker: mostrarPickerHora,
            value: horaSelecionada,
            onChange: onChangeHora,
            onConfirm: () => setMostrarPickerHora(false),
            minDateTime
          })}

          {dataSelecionada && horaSelecionada && (
            <BotaoPilula title="Próximo" icon="arrow-right-circle" onPress={() => setCurrentStep(3)} style={{ marginTop: 16 }} />
          )}
        </View>
      )}

      {/* STEP 3: Tipo de Treino */}
      {currentStep === 3 && clienteSelecionado && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>3. Tipo de Treino</Text>
          <View style={{ gap: 12 }}>
            <BotaoPilula title="Criar do Zero" icon="plus-circle" onPress={() => { setIsCreatingFromScratch(true); setSelectedWorkoutTemplate(null); setCurrentStep(4); }} />
            <BotaoPilula title="Usar Modelo Existente" icon="layers" variant="outline" onPress={() => setIsTemplateSelectionModalVisible(true)} />
            <View style={localStyles.aiCTA}>
              <Text style={localStyles.aiCTATitle}>Gerar com AI (beta)</Text>
              <Text style={localStyles.aiCTASubtitle}>Cria rapidamente um plano baseado no objetivo, nível e equipamentos.</Text>
              <BotaoPilula title="Configurar & Gerar" icon="sparkles" variant="primary" onPress={() => setAIModalVisible(true)} />
            </View>
          </View>
        </View>
      )}

      {/* STEP 4: Detalhes do Treino */}
      {currentStep === 4 && clienteSelecionado && dataSelecionada && horaSelecionada && (isCreatingFromScratch || selectedWorkoutTemplate) && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>4. Detalhes do Treino</Text>
          <View style={localStyles.inputContainer}>
            <Feather name="tag" size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
            <TextInput style={localStyles.input} placeholder="Nome do Treino" placeholderTextColor={Colors.placeholder} value={nome} onChangeText={setNome} />
          </View>
          <View style={[localStyles.inputContainer, { minHeight: 120 }]}>
            <Feather name="align-left" size={20} color={Colors.placeholder} style={localStyles.inputIconLeft} />
            <TextInput
              style={[localStyles.input, localStyles.multilineInput]}
              placeholder="Descrição / notas para a AI (objetivos, limitações, preferências...)"
              placeholderTextColor={Colors.placeholder}
              value={descricao}
              onChangeText={setDescricao}
              multiline
            />
          </View>
          <Text style={localStyles.inputLabel}>Categoria:</Text>
          <Pressable onPress={() => setIsCategoryModalVisible(true)} style={localStyles.pickerButton}>
            <Text style={localStyles.pickerButtonText}>{categoria || 'Selecionar Categoria'}</Text>
            <Ionicons name="caret-down" size={20} color={Colors.textPrimary} />
          </Pressable>
          {nome.trim() && categoria.trim() && <BotaoPilula title="Próximo" icon="arrow-right-circle" onPress={handleGoToStep5} style={{ marginTop: 16 }} />}
        </View>
      )}

      {/* STEP 5: Exercícios */}
      {currentStep === 5 && clienteSelecionado && (isCreatingFromScratch || selectedWorkoutTemplate) && (
        <View style={localStyles.card}>
          <Text style={localStyles.sectionTitle}>5. Exercícios do Treino</Text>
          <BotaoPilula title="Adicionar Exercício" icon="plus-circle" onPress={adicionarExercicio} />
          {isCreatingFromScratch && !selectedWorkoutTemplate && (
            <View style={localStyles.saveAsTemplateContainer}>
              <Text style={localStyles.saveAsTemplateText}>Salvar como Modelo?</Text>
              <Switch trackColor={{ false: Colors.placeholder, true: Colors.secondary }} thumbColor={Colors.cardBackground} onValueChange={setSaveAsTemplate} value={saveAsTemplate} />
            </View>
          )}
          {saveAsTemplate && isCreatingFromScratch && (
            <>
              <InlineWorkoutDetailsInput placeholder="Nome do Novo Modelo" value={newTemplateName} onChangeText={setNewTemplateName} icon="save" />
              <InlineWorkoutDetailsInput placeholder="Descrição do Novo Modelo (opcional)" value={newTemplateDescription} onChangeText={setNewTemplateDescription} multiline icon="file-text" />
            </>
          )}
        </View>
      )}
    </View>
  );
});
/* ---------- Componente principal ---------- */
export default function CriarTreinosScreen() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalClientesVisible, setModalClientesVisible] = useState(false);

  const [listaExerciciosEstado, setListaExerciciosEstado] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [filtroExercicios, setFiltroExercicios] = useState('');

  const [nome, setNome] = useState(''); const [descricao, setDescricao] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState(''); const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false); const [categoria, setCategoria] = useState('');

  const [exercicios, setExercicios] = useState([]); const [treinos, setTreinos] = useState([]);

  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);

  const [adminInfo, setAdminInfo] = useState(null);
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [isTemplateSelectionModalVisible, setIsTemplateSelectionModalVisible] = useState(false);
  const [selectedWorkoutTemplate, setSelectedWorkoutTemplate] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingFromScratch, setIsCreatingFromScratch] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState(''); const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // Vídeo preview
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrlPreview, setVideoUrlPreview] = useState('');
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const VIDEO_W = Math.min(SCREEN_W, 1024); const VIDEO_H = Math.min(SCREEN_H * 0.62, (VIDEO_W * 9) / 16);
  const toYouTubeId = (url = '') => {
    const rxs = [[/[?&]v=([A-Za-z0-9_-]{11})/],[/youtu\.be\/([A-Za-z0-9_-]{11})/],[/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/],[/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/]];
    for (const [rx] of rxs){ const m = String(url).match(rx); if (m?.[1]) return m[1]; } return '';
  };

  // Modal novo exercício
  const [novoExModal, setNovoExModal] = useState(false);
  const [novoEx, setNovoEx] = useState({ nome_en:'', nome_pt:'', categoria:'Outro', descricao_breve:'', animacao_url:'', imageUrl:'', equipamentoTxt:'', musculosTxt:'' });

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  /* ------- Admin ------- */
  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth(); const currentUser = authInstance.currentUser;
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') setAdminInfo({ ...docSnap.data(), uid: currentUser.uid });
        else setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin', uid: currentUser.uid });
      }, () => setAdminInfo({ name:'Admin', email:'admin@example.com', nome:'Admin', uid: currentUser?.uid || 'unknown' }));
      return unsubscribe;
    }
    setAdminInfo({ name:'Visitante', email:'', nome:'Visitante', uid:'unknown' }); return () => {};
  }, []);

  /* ------- Exercícios ------- */
  const fetchExercisesFromFirestore = useCallback(() => {
    setLoadingExercises(true);
    const qCol = query(collection(db, 'exercises'), orderBy('nome_en', 'asc'));
    const unsubscribe = onSnapshot(qCol, (snapshot) => {
      const arr = snapshot.docs.map(d=>{
        const data=d.data();
        const targetMuscles = Array.isArray(data.musculos_alvo) ? data.musculos_alvo.map(m=>typeof m==='string'?m:(m?.name||'')).filter(Boolean) : (Array.isArray(data.targetMuscles)?data.targetMuscles:[]);
        const equipmentRaw = data.equipamento ?? data.equipment; const equipment = Array.isArray(equipmentRaw)?equipmentRaw:(equipmentRaw?[equipmentRaw]:[]);
        return {
          id:d.id,
          name: data.nome_en || data.name || '',
          description: data.descricao_breve || data.description || '',
          category: data.category || data.categoria || '',
          targetMuscles,
          equipment,
          animationUrl: data.animationUrl || data.animacao_url || data.videoUrl || '',
          imageUrl: data.imageUrl || data.imagem_url || '',
          originalData:data
        };
      });
      setListaExerciciosEstado(arr); setLoadingExercises(false);
    }, (err)=>{ console.error(err); Alert.alert('Erro','Não foi possível carregar os exercícios.'); setLoadingExercises(false); });
    return unsubscribe;
  }, []);

  const fetchWorkoutTemplates = useCallback(() => {
    const qCol = query(collection(db, 'workoutTemplates'));
    return onSnapshot(qCol, (snapshot)=> setWorkoutTemplates(snapshot.docs.map(d=>({id:d.id,...d.data()}))));
  }, []);

  const carregarClientesETreinos = useCallback(async () => {
    try {
      const listaClientes = await buscarClientes(); setClientes(listaClientes);
      const listaTreinos = await buscarTodosTreinosComNomes(); setTreinos(listaTreinos);
    } catch { Alert.alert('Erro','Não foi possível carregar os dados.'); }
  }, []);

  useEffect(() => {
    const u1 = fetchAdminInfo();
    const u2 = fetchExercisesFromFirestore();
    const u3 = fetchWorkoutTemplates();
    carregarClientesETreinos();
    return () => { u1&&u1(); u2&&u2(); u3&&u3(); };
  }, [fetchAdminInfo, fetchExercisesFromFirestore, fetchWorkoutTemplates, carregarClientesETreinos]);

  /* ------- Helpers ------- */
  const resetFormStates = useCallback(() => {
    setNome(''); setDescricao(''); setHoraSelecionada(null); setCategoria(''); setClienteSelecionado(null);
    setExercicios([]); setFiltroExercicios(''); setSelectedWorkoutTemplate(null); setIsCreatingFromScratch(false);
    setSaveAsTemplate(false); setNewTemplateName(''); setNewTemplateDescription(''); setCurrentStep(1);
  }, []);

  const markedDates = useMemo(() => {
    const out={}; treinos.forEach(t=>{
      let dataTreino;
      if (t.data?.toDate) dataTreino=t.data.toDate(); else if (typeof t.data==='string' && t.data.includes('T')) dataTreino=new Date(t.data); else return;
      const key=dataTreino.toISOString().split('T')[0];
      if(!out[key]) out[key]={ marked:true, dots:[{key:'treino', color:Colors.secondary}], treinoCount:1, customStyles:{ container:{backgroundColor:Colors.background,borderRadius:10}, text:{color:Colors.textPrimary,fontWeight:'700'} } };
      else out[key].treinoCount+=1;
    }); return out;
  }, [treinos]);
  const markedDatesForCalendar = markedDates;

  const adicionarExercicio = useCallback(() => {
    setExercicios(prev => [...prev, { id:'', name:'', description:'', category:'', targetMuscles:[], equipment:[], animationUrl:'', imageUrl:'', notes:'', customExerciseId:gerarIDUnico(), isExpanded:true, setDetails:[], }]);
  }, []);

  const adicionarNovaSerie = useCallback((exercicioIndex, seriesType) => {
    const newSet = { id:gerarIDUnico(), seriesType, reps:'', tempo:'', peso:'', inclinacao:'', distancia:'', ritmo:'', descanso:'', notas:'', cadencia:'' };
    setExercicios(prev => { const x=[...prev]; x[exercicioIndex].setDetails.push(newSet); return x; });
  }, []);

  const removerSet = useCallback((exercicioIndex, setIndex) => {
    Alert.alert('Remover Série','Tem certeza?',[{ text:'Cancelar', style:'cancel' },{ text:'Remover', style:'destructive', onPress:()=> setExercicios(prev=>{ const x=[...prev]; x[exercicioIndex].setDetails.splice(setIndex,1); return x; }) }]);
  }, []);

  const atualizarExercicio = useCallback((i, campo, valor) => setExercicios(prev => { const x=[...prev]; x[i] = { ...x[i], [campo]: valor }; return x; }), []);
  const atualizarSet = useCallback((i, si, campo, valor) => setExercicios(prev => { const x=[...prev]; const sets=[...x[i].setDetails]; sets[si]={...sets[si],[campo]:valor}; x[i]={...x[i],setDetails:sets}; return x; }), []);
  const toggleExpandExercicio = useCallback((i)=> setExercicios(prev=>{ const x=[...prev]; x[i].isExpanded=!x[i].isExpanded; return x; }), []);
  const removerExercicio = useCallback((i)=> Alert.alert('Remover Exercício','Tem certeza?',[{ text:'Cancelar', style:'cancel' }, { text:'Remover', style:'destructive', onPress:()=> setExercicios(prev=>{ const x=[...prev]; x.splice(i,1); return x; }) }]), []);

  const limparFormulario = useCallback(() => resetFormStates(), [resetFormStates]);

  const areExercisesIdentical = useCallback((arr1, arr2) => {
    if ((arr1||[]).length !== (arr2||[]).length) return false;
    const norm = (arr)=>(arr||[]).map(({id,customExerciseId,templateExerciseId,isExpanded,...rest})=>{
      const s=(rest.setDetails||[]).map(z=>({seriesType:z.seriesType||'',reps:z.reps||'',tempo:z.tempo||'',peso:z.peso||'',inclinacao:z.inclinacao||'',distancia:z.distancia||'',ritmo:z.ritmo||'',descanso:z.descanso||'',notas:z.notas||''})).sort((a,b)=>String(a.reps).localeCompare(String(b.reps)));
      return {...rest,setDetails:s};
    }).sort((a,b)=> (a.exerciseName||a.name||'').localeCompare(b.exerciseName||b.name||''));
    return JSON.stringify(norm(arr1))===JSON.stringify(norm(arr2));
  }, []);

  const [lastSeed, setLastSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [aiDiagnostics, setAiDiagnostics] = useState({ seed: null, issues: [] });

  const proceedCreate = useCallback(async ({
    treinoDataToSave, tipoAgendamento, dataSelecionadaParam, horaSelecionadaParam
  }) => {
    const [y,m,d] = dataSelecionadaParam.split('-').map(Number);
    const dataHora = new Date(y, m-1, d, horaSelecionadaParam.getHours(), horaSelecionadaParam.getMinutes());

    await criarTreinoParaCliente({
      userId: clienteSelecionado.id, ...treinoDataToSave,
      data: Timestamp.fromDate(dataHora), criadoEm: Timestamp.now(),
      criadoPor: adminInfo?.nome || adminInfo?.name || 'Admin', status: 'agendado'
    });

    const agendaRef = doc(db, 'agenda', dataSelecionadaParam);
    const snap = await getDoc(agendaRef); let arr = [];
    if (snap.exists()) arr = (snap.data().treinos||[]).filter(Boolean);
    const mapped = (treinoDataToSave.templateExercises || treinoDataToSave.customExercises || []);
    const novo = {
      id: gerarIDUnico(), clienteId: clienteSelecionado.id, clienteNome: clienteSelecionado.name || clienteSelecionado.nome || 'Cliente',
      nomeTreino: treinoDataToSave.nome, categoria: treinoDataToSave.categoria, descricao: treinoDataToSave.descricao,
      dataAgendada: dataSelecionadaParam, hora: horaSelecionadaParam.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      tipoAgendamento, ...(tipoAgendamento==='modeloTreino'
        ? { templateId:treinoDataToSave.templateId, templateName:treinoDataToSave.templateName, templateDescription:treinoDataToSave.templateDescription, templateExercises:mapped }
        : { customExercises:mapped })
    };
    await setDoc(agendaRef, { treinos:[...arr, novo] }, { merge:true });

    Alert.alert('Sucesso','✅ Treino agendado com sucesso!');
    const listaTreinosAtualizada = await buscarTodosTreinosComNomes(); setTreinos(listaTreinosAtualizada);
    limparFormulario(); setDataSelecionada('');
  }, [clienteSelecionado, adminInfo, limparFormulario]);

  const handleCriarTreino = useCallback(async () => {
    if (!clienteSelecionado || !dataSelecionada || !horaSelecionada) return Alert.alert('Campos Obrigatórios', 'Selecione cliente, data e hora.');
    if (!nome.trim()) return Alert.alert('Campos Obrigatórios', 'Dê um nome ao agendamento.');
    if (!categoria.trim()) return Alert.alert('Campos Obrigatórios', 'Selecione a categoria.');
    if (!exercicios.length) return Alert.alert('Campos Obrigatórios', 'Adicione pelo menos um exercício.');
    for (const ex of exercicios) {
      if (!ex.name?.trim()) return Alert.alert('Campo Obrigatório', 'Todos os exercícios precisam de nome.');
      if (!ex.setDetails?.length) return Alert.alert('Campo Obrigatório', `O exercício "${ex.name}" precisa de pelo menos uma série.`);
    }

    const mapped = exercicios.map(ex=>({
      exerciseId:ex.id||null, exerciseName:ex.name,
      sets: (ex.setDetails||[]).map(s=>({ type:s.seriesType||'custom', reps:s.reps||'', tempo:s.tempo||'', peso:s.peso||'', inclinacao:s.inclinacao||'', distancia:s.distancia||'', ritmo:s.ritmo||'', descanso:s.descanso||'', notas:s.notas||'', cadencia:s.cadencia||'', })),
      notes: ex.notes||'', description:ex.description||'', category:ex.category||'',
      targetMuscles:ex.targetMuscles||[], equipment:ex.equipment||[], animationUrl:ex.animationUrl||'', imageUrl:ex.imageUrl||'',
    }));

    const isExactTemplate = selectedWorkoutTemplate && areExercisesIdentical(exercicios, (selectedWorkoutTemplate.exercises||[]));
    const treinoDataToSave = isExactTemplate ? {
      nome:nome.trim(), descricao:descricao.trim(), categoria,
      templateId:selectedWorkoutTemplate.id, templateName:selectedWorkoutTemplate.name, templateDescription:selectedWorkoutTemplate.description, templateExercises:mapped,
    } : {
      nome:nome.trim(), descricao:descricao.trim(), categoria, customExercises:mapped,
    };
    const tipoAgendamento = isExactTemplate ? 'modeloTreino' : 'treinoCompleto';

    if (aiDiagnostics.issues?.length) {
      return Alert.alert(
        'Validação do plano',
        `Foram detetadas ${aiDiagnostics.issues.length} questão(ões):\n• ${aiDiagnostics.issues.join('\n• ')}\n\nRevê o plano ou continua mesmo assim.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar mesmo assim', style: 'destructive', onPress: async () => {
              try {
                await proceedCreate({ treinoDataToSave, tipoAgendamento, dataSelecionadaParam: dataSelecionada, horaSelecionadaParam: horaSelecionada });
              } catch (e) { console.error(e); Alert.alert('Erro','Falha ao criar/agendar treino.'); }
            }
          }
        ]
      );
    }

    try {
      await proceedCreate({ treinoDataToSave, tipoAgendamento, dataSelecionadaParam: dataSelecionada, horaSelecionadaParam: horaSelecionada });
    } catch (e) { console.error(e); Alert.alert('Erro','Falha ao criar/agendar treino.'); }
  }, [clienteSelecionado, dataSelecionada, horaSelecionada, nome, descricao, categoria, exercicios, selectedWorkoutTemplate, areExercisesIdentical, aiDiagnostics, proceedCreate]);

  // ✅ não reabrir o picker depois de escolher
  const onChangeHora = useCallback((event, selectedTime) => {
    if (Platform.OS === 'android') {
      if (event?.type !== 'set') { setMostrarPickerHora(false); return; }
      setMostrarPickerHora(false);
    }
    if (selectedTime) {
      const isToday = dataSelecionada === today;
      const now = new Date();
      if (isToday && selectedTime < now) {
        Alert.alert('Hora inválida', 'Não pode agendar no passado.');
        setHoraSelecionada(null);
      } else {
        setHoraSelecionada(selectedTime);
      }
    }
  }, [dataSelecionada, today]);

  const selecionarCliente = useCallback((c)=>{
    setClienteSelecionado(c);
    setModalClientesVisible(false);
    setCurrentStep(2);
  }, []);

  const selecionarExercicioDaLista = useCallback((ex)=>{
    if(exercicioSelecionadoIndex===null) return;
    setExercicios(prev=>{ const x=[...prev]; x[exercicioSelecionadoIndex]={...ex, setDetails:[], notes:'', customExerciseId:x[exercicioSelecionadoIndex]?.customExerciseId||gerarIDUnico(), id:ex.id||'', isExpanded:true}; return x; });
    setModalListaExerciciosVisible(false); setExercicioSelecionadoIndex(null); setFiltroExercicios('');
  }, [exercicioSelecionadoIndex]);

  /* ------- Criar novo exercício ------- */
  const adicionarNovoExercicioESelecionar = useCallback(async () => {
    const nomeNovo = (novoEx.nome_en||'').trim();
    if (!nomeNovo) return Alert.alert('Campo obrigatório','Indica pelo menos o nome em inglês (nome_en).');
    if (listaExerciciosEstado.some(ex => (ex.name||'').toLowerCase() === nomeNovo.toLowerCase())) return Alert.alert('Exercício existente','Já existe um exercício com esse nome.');
    try {
      const equipArray = splitList(novoEx.equipamentoTxt); const muscArray = splitList(novoEx.musculosTxt); const now = Timestamp.now();
      const payload = {
        nome_en:nomeNovo, nome_pt:(novoEx.nome_pt||'').trim(), categoria:novoEx.categoria||'Outro',
        descricao_breve:(novoEx.descricao_breve||'').trim(), animacao_url:(novoEx.animacao_url||'').trim(), imageUrl:(novoEx.imageUrl||'').trim(),
        equipamento:equipArray, musculos_alvo:muscArray, id_slug:toSlug(nomeNovo),
        created_at:now, updated_at:now, createdByUid:adminInfo?.uid||'unknown', createdByName:adminInfo?.nome||adminInfo?.name||'', createdByEmail:adminInfo?.email||'', visibility:'private',
      };
      const newRef = await addDoc(collection(db,'exercises'), payload);
      if (adminInfo?.uid) await setDoc(doc(db, 'users', adminInfo.uid, 'exercises', newRef.id), { ...payload, globalId:newRef.id }, { merge:true });
      Alert.alert('Sucesso', `Exercício "${nomeNovo}" criado.`);
      selecionarExercicioDaLista({ id:newRef.id, name:payload.nome_en, description:payload.descricao_breve, category:payload.categoria, targetMuscles:payload.musculos_alvo, equipment:payload.equipamento, animationUrl:payload.animacao_url, imageUrl:payload.imageUrl });
      setNovoEx({ nome_en:'', nome_pt:'', categoria:'Outro', descricao_breve:'', animacao_url:'', imageUrl:'', equipamentoTxt:'', musculosTxt:'' });
      setNovoExModal(false);
    } catch (e) { console.error(e); Alert.alert('Erro','Não foi possível criar o exercício.'); }
  }, [novoEx, adminInfo, listaExerciciosEstado, selecionarExercicioDaLista]);

  const handleGoBack = useCallback(()=>{ if(currentStep===5) setExercicios([]); if(currentStep>1) setCurrentStep(p=>p-1); },[currentStep]);
  const handleTemplateSelect = useCallback((t)=>{ setSelectedWorkoutTemplate(t); setIsCreatingFromScratch(false); setNome(t.name||''); setDescricao(t.description||''); setCategoria(t.category||''); setIsTemplateSelectionModalVisible(false); setCurrentStep(4); },[]);
  const handleGoToStep5 = useCallback(()=>{ if(selectedWorkoutTemplate){ const xs=(selectedWorkoutTemplate.exercises||[]).map(ex=>({ ...ex, customExerciseId:gerarIDUnico(), isExpanded:true, id:ex.exerciseId||ex.id||'', name:ex.exerciseName||ex.name||'', setDetails:(ex.sets||[]).map(s=>({ id:gerarIDUnico(), seriesType:s.type||'reps_and_load', reps:s.reps||'', tempo:s.tempo||'', peso:s.peso||'', inclinacao:s.inclinacao||'', distancia:s.distancia||'', ritmo:s.ritmo||'', descanso:s.descanso||'', notas:s.notas||'', cadencia:s.cadencia||'' })) })); setExercicios(xs); } else setExercicios([]); setCurrentStep(5); },[selectedWorkoutTemplate]);

  const minDateTime = useMemo(()=> dataSelecionada===today ? new Date() : undefined, [dataSelecionada, today]);

  /* ======================= FILTROS ======================= */
  const { uniqueCategories, uniqueMuscles, uniqueEquipment } = useMemo(() => {
    const cSet=new Set(), mSet=new Set(), eSet=new Set();
    for (const ex of listaExerciciosEstado){ if (ex.category) cSet.add(ex.category); (ex.targetMuscles||[]).forEach(m=>mSet.add(m)); (ex.equipment||[]).forEach(e=>eSet.add(e)); }
    return { uniqueCategories:[...cSet].sort(), uniqueMuscles:[...mSet].sort(), uniqueEquipment:[...eSet].sort() };
  }, [listaExerciciosEstado]);

  const [catSel, setCatSel] = useState(new Set());
  const [musSel, setMusSel] = useState(new Set());
  const [eqSel, setEqSel] = useState(new Set());
  const [hasVideoOnly, setHasVideoOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toggleFromSet = (setFn) => (value) => setFn(prev => { const s = new Set(prev); s.has(value) ? s.delete(value) : s.add(value); return s; });
  const clearFilters = () => { setCatSel(new Set()); setMusSel(new Set()); setEqSel(new Set()); setHasVideoOnly(false); setSortBy('name'); setFiltroExercicios(''); };
  const activeCount = catSel.size + musSel.size + eqSel.size + (hasVideoOnly ? 1 : 0);

  const filteredExercises = useMemo(() => {
    const nameTerm = filtroExercicios.trim().toLowerCase();
    const catArr = [...catSel], musArr = [...musSel], eqArr = [...eqSel];
    const res = listaExerciciosEstado.filter(ex => {
      if (nameTerm && !(ex.name||'').toLowerCase().includes(nameTerm)) return false;
      if (hasVideoOnly && !ex.animationUrl) return false;
      if (catArr.length && !catArr.includes(ex.category)) return false;
      if (musArr.length) { const ms = new Set(ex.targetMuscles||[]); if (!musArr.some(m => ms.has(m))) return false; }
      if (eqArr.length) { const es = new Set(ex.equipment||[]); if (!eqArr.some(e => es.has(e))) return false; }
      return true;
    });
    res.sort((a,b)=> sortBy==='name' ? (a.name||'').localeCompare(b.name||'') : (a.category||'').localeCompare(b.category||'')); return res;
  }, [listaExerciciosEstado, filtroExercicios, hasVideoOnly, catSel, musSel, eqSel, sortBy]);

  /* ======================= AI (local) ======================= */
  const [aiModalVisible, setAIModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiParams, setAiParams] = useState({
    objetivo: 'Hipertrofia',
    nivel: 'Intermédio',
    sessoesSemana: 3,
    exerciciosPorSessao: 6,
    focoMuscular: new Set(),
    equipamento: new Set(),
    restricoes: '',
    categoriaTreino: 'Força',
    duracaoMin: 60,
    incluirCardio: false,
  });
  const updateAi = (k, v) => setAiParams(prev => ({ ...prev, [k]: v }));
  const toggleSetAi = (key, value) => setAiParams(prev => { const s = new Set(prev[key]); s.has(value) ? s.delete(value) : s.add(value); return { ...prev, [key]: s }; });

  const [exerciciosStateVersion, setExerciciosStateVersion] = useState(0);
  const gerarTreinoComAI = useCallback(() => {
    setAiLoading(true);
    try {
      const seed = lastSeed;
      const { objetivo, nivel, exerciciosPorSessao, focoMuscular, equipamento, incluirCardio, categoriaTreino, restricoes } = aiParams;

      const { plan, issues, seedUsed } = generateWorkout({
        objetivo, nivel, exerciciosPorSessao,
        focoMuscular:[...focoMuscular], equipamento:[...equipamento],
        incluirCardio, categoriaTreino, restricoes,
        listaExercicios: listaExerciciosEstado,
        seed
      });

      setIsCreatingFromScratch(true);
      setSelectedWorkoutTemplate(null);
      setCategoria(categoriaTreino || 'Força');
      setNome((prev) => prev || `Treino ${objetivo}`);
      setDescricao((prev) => prev || `Gerado com AI: objetivo ${objetivo}, nível ${nivel}.`);
      setExercicios(plan);
      setExerciciosStateVersion(v=>v+1);
      setCurrentStep(5);
      setAIModalVisible(false);

      setAiDiagnostics({ seed: seedUsed, issues });
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não consegui gerar o treino automaticamente.');
    } finally {
      setAiLoading(false);
    }
  }, [aiParams, listaExerciciosEstado, lastSeed]);

  /* ---------- UI ---------- */
  return (
    <KeyboardAvoidingView
      style={localStyles.container}
      behavior={Platform.OS==='ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS==='ios' ? 0 : 20}
    >
      <View style={localStyles.safeArea}>
        <AppHeader title="Criar e Agendar Treino" subtitle="" showBackButton={currentStep>1} onBackPress={handleGoBack} showMenu={false} showBell={false} statusBarStyle="light-content" />

        {loadingExercises && (
          <View style={localStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={localStyles.loadingText}>A carregar dados...</Text>
          </View>
        )}

        {/* [AI] Banner seed/validacao + regeneração */}
        {currentStep===5 && (
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            {!!aiDiagnostics.seed && (
              <Text style={{ textAlign:'center', color:Colors.textSecondary, marginBottom:8 }}>
                Seed AI: {aiDiagnostics.seed}
              </Text>
            )}
            {aiDiagnostics.issues?.length>0 ? (
              <View style={{ backgroundColor:'#FEF2F2', borderColor:'#FECACA', borderWidth:1, borderRadius:12, padding:10, marginBottom:8 }}>
                <Text style={{ color:'#991B1B', fontWeight:'700', marginBottom:4 }}>Avisos de validação</Text>
                {aiDiagnostics.issues.map((i,idx)=><Text key={idx} style={{ color:'#991B1B' }}>• {i}</Text>)}
              </View>
            ) : (exercicios.length>0 && (
              <View style={{ alignItems:'center', marginBottom:8 }}>
                <Text style={{ color:Colors.success, fontWeight:'800' }}>Plano verificado ✓</Text>
              </View>
            ))}
            <View style={{ flexDirection:'row', gap:8, justifyContent:'center' }}>
              <BotaoPilula title="Regenerar (mesma seed)" icon="refresh-ccw" variant="outline" onPress={()=>gerarTreinoComAI()} />
              <BotaoPilula title="Regenerar (nova seed)" icon="shuffle" variant="outline" onPress={()=>{ setLastSeed(Math.floor(Math.random()*1e9)); gerarTreinoComAI(); }} />
            </View>
          </View>
        )}
        <FlatList
          data={exercicios}
          renderItem={({ item, index }) => (
            <View style={localStyles.exercicioCard}>
              <View style={localStyles.exercicioHeader}>
                <Pressable onPress={()=>toggleExpandExercicio(index)} style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
                  <Feather name={item.isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={Colors.primary} />
                  <Text style={localStyles.exercicioNome}>{item.name || 'Novo Exercício'}</Text>
                </Pressable>
                <BotaoPilula title="" icon="x" variant="outline" size="sm" onPress={()=>removerExercicio(index)} />
              </View>

              {item.isExpanded && (
                <View style={localStyles.exercicioDetails}>
                  <BotaoPilula title={item.name ? 'Trocar exercício' : 'Selecionar Exercício da Biblioteca'} icon="search" onPress={()=>{ setExercicioSelecionadoIndex(index); setModalListaExerciciosVisible(true); setFiltroExercicios(''); }} style={{ marginBottom:12, alignSelf:'flex-start' }} />

                  {!!item.description && (<View style={localStyles.detailRow}><Feather name="info" size={16} color={Colors.textSecondary} /><Text style={localStyles.detailText}>{item.description}</Text></View>)}
                  {!!(item.targetMuscles||[]).length && (<View style={localStyles.detailRow}><FontAwesome5 name="dumbbell" size={16} color={Colors.textSecondary} /><Text style={localStyles.detailText}>Músculos-alvo: {item.targetMuscles.join(', ')}</Text></View>)}
                  {!!(item.equipment||[]).length && (<View style={localStyles.detailRow}><Feather name="tool" size={16} color={Colors.textSecondary} /><Text style={localStyles.detailText}>Equipamento: {item.equipment.join(', ')}</Text></View>)}

                  {!!item.explicacaoAI?.length && (
                    <View style={[localStyles.detailRow, { flexWrap:'wrap' }]}>
                      <Feather name="shield" size={16} color={Colors.textSecondary} />
                      <Text style={[localStyles.detailText, { fontStyle:'italic' }]}>
                        {`Motivos: ${item.explicacaoAI.join(' · ')}`}
                      </Text>
                    </View>
                  )}
                  {typeof item.confidence === 'number' && (
                    <View style={localStyles.detailRow}>
                      <Feather name="check-circle" size={16} color={Colors.textSecondary} />
                      <Text style={localStyles.detailText}>Confiança: {item.confidence}%</Text>
                    </View>
                  )}

                  <InlineWorkoutDetailsInput placeholder="Observações do Exercício (opcional)" value={item.notes} onChangeText={(t)=>atualizarExercicio(index,'notes',t)} multiline icon="message-square" style={localStyles.inlineNotesInput} />

                  <View style={localStyles.seriesContainer}>
                    {(item.setDetails||[]).map((set, setIndex) => {
                      const currentType = set?.seriesType || 'reps_and_load';
                      const fields = seriesTypes[currentType]?.fields || [];
                      const icons = seriesTypes[currentType]?.icons || [];
                      return (
                        <View key={set?.id || setIndex} style={localStyles.setCard}>
                          <View style={localStyles.setCardHeader}>
                            <Text style={localStyles.setCardTitle}>Série {setIndex+1}</Text>
                            <BotaoPilula title="" icon="minus-circle" variant="outline" size="sm" onPress={()=>removerSet(index,setIndex)} />
                          </View>
                          <View style={localStyles.pickerContainerSet}>
                            <Picker selectedValue={currentType} onValueChange={(v)=>atualizarSet(index,setIndex,'seriesType',v)} style={localStyles.pickerSet} dropdownIconColor={Colors.textPrimary}>
                              {Object.keys(seriesTypes).map(t=><Picker.Item key={t} label={seriesTypes[t].label} value={t} />)}
                            </Picker>
                          </View>
                          <View style={localStyles.setDetailsGrid}>
                            {fields.map((f,i)=>(
                              <View key={f} style={localStyles.setDetailField}>
                                {(icons[i]==='dumbbell'?<FontAwesome5 name="dumbbell" size={16} color={Colors.placeholder} />:<Feather name={icons[i]} size={16} color={Colors.placeholder} />)}
                                <TextInput style={localStyles.setDetailInput} placeholder={f[0].toUpperCase()+f.slice(1)} placeholderTextColor={Colors.placeholder} value={String(set[f]||'')} onChangeText={(v)=>atualizarSet(index,setIndex,f,v)} keyboardType={['reps','peso','inclinacao','distancia','cadencia'].includes(f)?'numeric':'default'} />
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    <BotaoPilula title="Adicionar Série" icon="plus" variant="outline" onPress={()=>adicionarNovaSerie(index,'reps_and_load')} style={{ alignSelf:'flex-start', marginTop:4 }} />
                  </View>
                </View>
              )}
            </View>
          )}
          keyExtractor={(item) => item.customExerciseId || item.id}
          contentContainerStyle={localStyles.flatListContent}
          ListHeaderComponent={
            <MemoizedListHeader
              currentStep={currentStep} setCurrentStep={setCurrentStep}
              clienteSelecionado={clienteSelecionado} setModalClientesVisible={setModalClientesVisible}
              dataSelecionada={dataSelecionada} setDataSelecionada={setDataSelecionada} markedDatesForCalendar={markedDatesForCalendar}
              mostrarPickerHora={mostrarPickerHora} setMostrarPickerHora={setMostrarPickerHora} horaSelecionada={horaSelecionada} onChangeHora={onChangeHora}
              isCreatingFromScratch={isCreatingFromScratch} setIsCreatingFromScratch={setIsCreatingFromScratch} setSelectedWorkoutTemplate={setSelectedWorkoutTemplate} setIsTemplateSelectionModalVisible={setIsTemplateSelectionModalVisible}
              nome={nome} setNome={setNome} descricao={descricao} setDescricao={setDescricao} categoria={categoria} setCategoria={setCategoria}
              saveAsTemplate={saveAsTemplate} setSaveAsTemplate={setSaveAsTemplate} newTemplateName={newTemplateName} setNewTemplateName={setNewTemplateName} newTemplateDescription={newTemplateDescription} setNewTemplateDescription={setNewTemplateDescription}
              adicionarExercicio={adicionarExercicio} selectedWorkoutTemplate={selectedWorkoutTemplate} isCategoryModalVisible={isCategoryModalVisible} setIsCategoryModalVisible={setIsCategoryModalVisible}
              minDate={today} minDateTime={minDateTime} handleGoToStep5={handleGoToStep5} setAIModalVisible={setAIModalVisible}
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
        />

        {currentStep===5 && exercicios.length>0 && clienteSelecionado && (isCreatingFromScratch || selectedWorkoutTemplate) && (
          <View style={localStyles.bottomBar}>
            <BotaoPilula title="Criar e Agendar Treino" icon="check-circle" onPress={handleCriarTreino} style={{ width:'100%' }} />
          </View>
        )}

        {/* ---------- Modal Selecionar Cliente (apenas nomes) ---------- */}
        <Modal animationType="slide" transparent visible={modalClientesVisible} onRequestClose={()=>setModalClientesVisible(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}>
                <Text style={localStyles.modalTitle}>Selecionar Cliente</Text>
                <Pressable onPress={()=>setModalClientesVisible(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable>
              </View>

              <View style={{ flex: 1, minHeight: 140 }}>
                <FlatList
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  data={clientes}
                  keyExtractor={i=>i.id}
                  renderItem={({item})=>(
                    <Pressable style={localStyles.clientRow} onPress={()=>selecionarCliente(item)}>
                      <View style={localStyles.clientAvatar}>
                        <Feather name="user" size={16} color="#fff" />
                      </View>
                      <Text style={localStyles.clientName} numberOfLines={1}>{obterNomeCliente(item)}</Text>
                      <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
                    </Pressable>
                  )}
                  ListEmptyComponent={()=> <Text style={localStyles.noItemsText}>Nenhum cliente encontrado.</Text>}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator
                />
              </View>

              <BotaoPilula title="Fechar" icon="x" variant="outline" onPress={()=>setModalClientesVisible(false)} style={{ marginTop:10 }} />
            </View>
          </View>
        </Modal>

        {/* ---------- Modal Biblioteca de Exercícios ---------- */}
        <Modal animationType="slide" transparent visible={modalListaExerciciosVisible} onRequestClose={()=>setModalListaExerciciosVisible(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}><Text style={localStyles.modalTitle}>Biblioteca de Exercícios</Text><Pressable onPress={()=>setModalListaExerciciosVisible(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable></View>

              <TextInput style={localStyles.searchBar} placeholder="Pesquisar (nome em inglês)..." placeholderTextColor={Colors.placeholder} value={filtroExercicios} onChangeText={setFiltroExercicios} />

              {/* Barra compacta */}
              <View style={localStyles.compactBar}>
                <Pressable onPress={()=>setFiltersOpen(v=>!v)} style={({pressed})=>[{ flexDirection:'row', alignItems:'center' }, pressed && { opacity:0.9 }]}>
                  <Feather name="filter" size={16} color={Colors.textPrimary} />
                  <Text style={{ marginLeft:6, fontWeight:'700', color:Colors.textPrimary }}>Filtros</Text>
                  {activeCount>0 && <View style={localStyles.badge}><Text style={localStyles.badgeText}>{activeCount}</Text></View>}
                </Pressable>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                  <View style={[localStyles.border,{ height:36, width: 160, overflow:'hidden', backgroundColor:'#F8FAFC' }]}>
                    <Picker selectedValue={sortBy} onValueChange={setSortBy} style={{ height:36 }}>
                      <Picker.Item label="Nome (A-Z)" value="name" />
                      <Picker.Item label="Categoria" value="category" />
                    </Picker>
                  </View>
                  <BotaoPilula title="Limpar" icon="rotate-ccw" variant="outline" size="sm" onPress={clearFilters} />
                </View>
              </View>

              {/* Seleções ativas */}
              {(activeCount>0) && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical:4 }}>
                  {[...catSel].map(c=>(
                    <View key={`c-${c}`} style={localStyles.smallTag}><Feather name="hash" size={12} color={Colors.textSecondary} /><Text style={localStyles.smallTagText}>{c}</Text><Pressable onPress={()=>setCatSel(prev=>{const s=new Set(prev); s.delete(c); return s;})}><Feather name="x" size={12} color={Colors.textSecondary} /></Pressable></View>
                  ))}
                  {[...musSel].map(m=>(
                    <View key={`m-${m}`} style={localStyles.smallTag}><Feather name="activity" size={12} color={Colors.textSecondary} /><Text style={localStyles.smallTagText}>{m}</Text><Pressable onPress={()=>setMusSel(prev=>{const s=new Set(prev); s.delete(m); return s;})}><Feather name="x" size={12} color={Colors.textSecondary} /></Pressable></View>
                  ))}
                  {[...eqSel].map(e=>(
                    <View key={`e-${e}`} style={localStyles.smallTag}><Feather name="tool" size={12} color={Colors.textSecondary} /><Text style={localStyles.smallTagText}>{e}</Text><Pressable onPress={()=>setEqSel(prev=>{const s=new Set(prev); s.delete(e); return s;})}><Feather name="x" size={12} color={Colors.textSecondary} /></Pressable></View>
                  ))}
                  {hasVideoOnly && (<View style={localStyles.smallTag}><Feather name="play-circle" size={12} color={Colors.textSecondary} /><Text style={localStyles.smallTagText}>Vídeo</Text><Pressable onPress={()=>setHasVideoOnly(false)}><Feather name="x" size={12} color={Colors.textSecondary} /></Pressable></View>)}
                </ScrollView>
              )}

              {filtersOpen && (
                <View style={{ marginBottom: 8 }}>
                  {!!uniqueCategories.length && (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={localStyles.filterLabel}>Categorias</Text>
                      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
                        {uniqueCategories.map(c=>(
                          <Chip key={c} label={c} selected={catSel.has(c)} onToggle={()=>toggleFromSet(setCatSel)(c)} icon="hash" />
                        ))}
                      </View>
                    </View>
                  )}
                  {!!uniqueMuscles.length && (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={localStyles.filterLabel}>Músculos-alvo</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
                        {uniqueMuscles.map(m=>(
                          <Chip key={m} label={m} selected={musSel.has(m)} onToggle={()=>toggleFromSet(setMusSel)(m)} icon="activity" />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {!!uniqueEquipment.length && (
                    <View style={{ marginBottom: 6 }}>
                      <Text style={localStyles.filterLabel}>Equipamento</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
                        {uniqueEquipment.map(e=>(
                          <Chip key={e} label={e} selected={eqSel.has(e)} onToggle={()=>toggleFromSet(setEqSel)(e)} icon="tool" />
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <Pressable onPress={()=>setHasVideoOnly(v=>!v)} style={({pressed})=>[{ flexDirection:'row', alignItems:'center', marginTop: 6 }, pressed && { opacity:0.9 }]}>
                    <Feather name={hasVideoOnly?'check-square':'square'} size={18} color={Colors.textPrimary} />
                    <Text style={{ marginLeft:8, color:Colors.textPrimary, fontWeight:'600' }}>Apenas com vídeo</Text>
                  </Pressable>
                </View>
              )}

              {/* Lista (com flex para rolar) */}
              <View style={{ flex: 1, minHeight: 120 }}>
                <FlatList
                  style={{ flex: 1, marginTop: 10 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  data={filteredExercises}
                  keyExtractor={item=>item.id}
                  renderItem={({ item }) => {
                    const hasVideo = !!item.animationUrl;
                    return (
                      <Pressable style={({pressed})=>[localStyles.exercicioBibliotecaCard, pressed && { opacity:0.95 }]} onPress={()=>selecionarExercicioDaLista(item)}>
                        <View style={localStyles.exercicioBibliotecaInfo}>
                          <Text style={localStyles.exercicioBibliotecaNome} numberOfLines={1}>{item.name || 'Exercise'}</Text>
                          {!!item.category && (<View style={localStyles.exercicioBibliotecaCategoriaContainer}><Feather name="hash" size={14} color={Colors.textSecondary}/><Text style={localStyles.exercicioBibliotecaCategoria} numberOfLines={1}>{item.category}</Text></View>)}
                          {!!(item.targetMuscles||[]).length && (<View style={localStyles.exercicioBibliotecaDetailRow}><FontAwesome5 name="dumbbell" size={14} color={Colors.textSecondary} /><Text style={localStyles.exercicioBibliotecaDetailText} numberOfLines={1}>{(item.targetMuscles||[]).join(', ')}</Text></View>)}
                          {!!(item.equipment||[]).length && (<View style={localStyles.exercicioBibliotecaDetailRow}><Feather name="tool" size={14} color={Colors.textSecondary} /><Text style={localStyles.exercicioBibliotecaDetailText} numberOfLines={1}>{(item.equipment||[]).join(', ')}</Text></View>)}
                          {!!item.description && (<Text style={localStyles.exercicioBibliotecaDescricao} numberOfLines={2}>{item.description}</Text>)}
                        </View>
                        <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                          {hasVideo && <BotaoPilula title="" icon="play-circle" variant="outline" size="sm" onPress={()=>{ setVideoUrlPreview(item.animationUrl); setVideoModalVisible(true); }} />}
                          <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
                        </View>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={()=> <Text style={localStyles.noItemsText}>Nenhum exercício encontrado.</Text>}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator
                />
              </View>

              <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop: 10 }}>
                <BotaoPilula title="Novo exercício" icon="plus" onPress={()=>setNovoExModal(true)} />
                <BotaoPilula title="Fechar" icon="x" variant="outline" onPress={()=>setModalListaExerciciosVisible(false)} />
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------- Modal: Novo Exercício ---------- */}
        <Modal animationType="slide" transparent visible={novoExModal} onRequestClose={()=>setNovoExModal(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}><Text style={localStyles.modalTitle}>Novo Exercício</Text><Pressable onPress={()=>setNovoExModal(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable></View>
              <TextInput style={localStyles.searchBar} placeholder="Nome (inglês) *" placeholderTextColor={Colors.placeholder} value={novoEx.nome_en} onChangeText={v=>setNovoEx(p=>({...p,nome_en:v}))} />
              <TextInput style={localStyles.searchBar} placeholder="Nome (português)" placeholderTextColor={Colors.placeholder} value={novoEx.nome_pt} onChangeText={v=>setNovoEx(p=>({...p,nome_pt:v}))} />
              <View style={[localStyles.pickerButton,{ marginTop:10, marginBottom:10 }]}>
                <Text style={localStyles.pickerButtonText}>{novoEx.categoria||'Categoria'}</Text>
                <Picker selectedValue={novoEx.categoria} onValueChange={v=>setNovoEx(p=>({...p,categoria:v}))} style={{ position:'absolute', right:0, left:0, opacity:0 }}>
                  {categorias.map(c=><Picker.Item key={c} label={c} value={c} />)}
                </Picker>
              </View>
              <TextInput style={[localStyles.searchBar,{ height:90, textAlignVertical:'top' }]} placeholder="Descrição breve" placeholderTextColor={Colors.placeholder} value={novoEx.descricao_breve} onChangeText={v=>setNovoEx(p=>({...p,descricao_breve:v}))} multiline />
              <TextInput style={localStyles.searchBar} placeholder="URL do vídeo (YouTube/MP4)" placeholderTextColor={Colors.placeholder} value={novoEx.animacao_url} onChangeText={v=>setNovoEx(p=>({...p,animacao_url:v}))} />
              <TextInput style={localStyles.searchBar} placeholder="Imagem (opcional)" placeholderTextColor={Colors.placeholder} value={novoEx.imageUrl} onChangeText={v=>setNovoEx(p=>({...p,imageUrl:v}))} />
              <TextInput style={localStyles.searchBar} placeholder="Equipamento (separa por vírgulas)" placeholderTextColor={Colors.placeholder} value={novoEx.equipamentoTxt} onChangeText={v=>setNovoEx(p=>({...p,equipamentoTxt:v}))} />
              <TextInput style={localStyles.searchBar} placeholder="Músculos-alvo (separa por vírgulas)" placeholderTextColor={Colors.placeholder} value={novoEx.musculosTxt} onChangeText={v=>setNovoEx(p=>({...p,musculosTxt:v}))} />
              <BotaoPilula title="Guardar" icon="check" onPress={adicionarNovoExercicioESelecionar} style={{ marginTop:6 }} />
              <BotaoPilula title="Cancelar" icon="x" variant="outline" onPress={()=>setNovoExModal(false)} style={{ marginTop:10 }} />
            </View>
          </View>
        </Modal>

        {/* ---------- Modal do Vídeo ---------- */}
        <Modal transparent animationType="fade" visible={videoModalVisible} onRequestClose={()=>setVideoModalVisible(false)}>
          <View style={localStyles.videoOverlay}>
            <View style={[localStyles.playerOnlyBox, { width:VIDEO_W, height:VIDEO_H }]}>
              {(() => {
                if (!videoUrlPreview) return <View />;
                const ytId = toYouTubeId(videoUrlPreview);
                if (ytId) {
                  return <YoutubePlayer height={VIDEO_H} width={VIDEO_W} play videoId={ytId} webViewStyle={{ opacity:0.9999 }} initialPlayerParams={{ controls:true, modestbranding:true, rel:false, fs:1, playsinline:true, iv_load_policy:3 }} />;
                }
                return (
                  <WebView style={{ width:VIDEO_W, height:VIDEO_H, backgroundColor:'#000' }} javaScriptEnabled domStorageEnabled allowsFullscreenVideo originWhitelist={['*']}
                    source={{ html:`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;height:100%;background:#000}</style></head><body><video src="${videoUrlPreview}" autoplay controls playsinline style="width:100%;height:100%;object-fit:contain;"></video></body></html>` }} />
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ---------- Modal Modelos ---------- */}
        <Modal animationType="slide" transparent visible={isTemplateSelectionModalVisible} onRequestClose={()=>setIsTemplateSelectionModalVisible(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}><Text style={localStyles.modalTitle}>Modelos de Treino</Text><Pressable onPress={()=>setIsTemplateSelectionModalVisible(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable></View>
              <View style={{ flex: 1, minHeight: 120 }}>
                <FlatList
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  data={workoutTemplates}
                  keyExtractor={i=>i.id}
                  renderItem={({item})=>(
                    <Pressable style={localStyles.modalItem} onPress={()=>handleTemplateSelect(item)}><Text style={localStyles.modalItemText}>{item.name}</Text></Pressable>
                  )}
                  ListEmptyComponent={()=> <Text style={localStyles.noItemsText}>Nenhum modelo de treino encontrado.</Text>}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------- Modal Categorias ---------- */}
        <Modal animationType="slide" transparent visible={isCategoryModalVisible} onRequestClose={()=>setIsCategoryModalVisible(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}><Text style={localStyles.modalTitle}>Selecionar Categoria</Text><Pressable onPress={()=>setIsCategoryModalVisible(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable></View>
              {categorias.map(cat=>(
                <Pressable key={cat} style={localStyles.modalItem} onPress={()=>{ setCategoria(cat); setIsCategoryModalVisible(false); }}>
                  <Text style={localStyles.modalItemText}>{cat}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        {/* ---------- Modal AI Params ---------- */}
        <Modal animationType="slide" transparent visible={aiModalVisible} onRequestClose={()=>setAIModalVisible(false)}>
          <View style={localStyles.centeredView}>
            <View style={localStyles.modalView}>
              <View style={localStyles.modalHeader}>
                <Text style={localStyles.modalTitle}>Gerar com AI (beta)</Text>
                <Pressable onPress={()=>setAIModalVisible(false)}><Feather name="x" size={22} color={Colors.textPrimary} /></Pressable>
              </View>

              <Text style={localStyles.filterLabel}>Objetivo</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 }}>
                {['Hipertrofia','Força','Emagrecimento','Mobilidade'].map(opt=>(
                  <Chip key={opt} label={opt} selected={aiParams.objetivo===opt} onToggle={()=>updateAi('objetivo', opt)} icon="target" />
                ))}
              </View>

              <Text style={localStyles.filterLabel}>Nível</Text>
              <View style={{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 }}>
                {['Iniciante','Intermédio','Avançado'].map(opt=>(
                  <Chip key={opt} label={opt} selected={aiParams.nivel===opt} onToggle={()=>updateAi('nivel', opt)} icon="trending-up" />
                ))}
              </View>

              <View style={{ flexDirection:'row', gap:8 }}>
                <View style={[localStyles.inputContainer,{ flex:1 }]}>
                  <Feather name="calendar" size={18} color={Colors.placeholder} style={localStyles.inputIconLeft} />
                  <TextInput keyboardType="numeric" value={String(aiParams.sessoesSemana)} onChangeText={v=>updateAi('sessoesSemana', Math.max(1, parseInt(v||'1')))} placeholder="Sessões/semana" placeholderTextColor={Colors.placeholder} style={localStyles.input} />
                </View>
                <View style={[localStyles.inputContainer,{ flex:1 }]}>
                  <Feather name="list" size={18} color={Colors.placeholder} style={localStyles.inputIconLeft} />
                  <TextInput keyboardType="numeric" value={String(aiParams.exerciciosPorSessao)} onChangeText={v=>updateAi('exerciciosPorSessao', Math.max(3, parseInt(v||'6')))} placeholder="Exercícios/sessão" placeholderTextColor={Colors.placeholder} style={localStyles.input} />
                </View>
              </View>

              <Text style={[localStyles.filterLabel,{ marginTop:8 }]}>Categoria do treino</Text>
              <View style={[localStyles.pickerButton,{ marginBottom:10 }]}>
                <Text style={localStyles.pickerButtonText}>{aiParams.categoriaTreino}</Text>
                <Picker selectedValue={aiParams.categoriaTreino} onValueChange={v=>updateAi('categoriaTreino', v)} style={{ position:'absolute', right:0, left:0, opacity:0 }}>
                  {categorias.map(c=><Picker.Item key={c} label={c} value={c} />)}
                </Picker>
              </View>

              {!!uniqueMuscles.length && (
                <>
                  <Text style={localStyles.filterLabel}>Foco muscular</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6, marginBottom:8 }}>
                    {uniqueMuscles.map(m=>(
                      <Chip key={m} label={m} selected={aiParams.focoMuscular.has(m)} onToggle={()=>toggleSetAi('focoMuscular', m)} icon="activity" />
                    ))}
                  </ScrollView>
                </>
              )}

              {!!uniqueEquipment.length && (
                <>
                  <Text style={localStyles.filterLabel}>Equipamento disponível</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6, marginBottom:8 }}>
                    {uniqueEquipment.map(e=>(
                      <Chip key={e} label={e} selected={aiParams.equipamento.has(e)} onToggle={()=>toggleSetAi('equipamento', e)} icon="tool" />
                    ))}
                  </ScrollView>
                </>
              )}

              <Pressable onPress={()=>updateAi('incluirCardio', !aiParams.incluirCardio)} style={({pressed})=>[{ flexDirection:'row', alignItems:'center', marginBottom:8 }, pressed && { opacity:0.9 }]}>
                <Feather name={aiParams.incluirCardio?'check-square':'square'} size={18} color={Colors.textPrimary} />
                <Text style={{ marginLeft:8, color:Colors.textPrimary, fontWeight:'600' }}>Incluir bloco de cardio</Text>
              </Pressable>

              <TextInput style={[localStyles.searchBar,{ height:70, textAlignVertical:'top' }]} placeholder="Restrições/observações (ex.: evitar impacto no joelho)" placeholderTextColor={Colors.placeholder} value={aiParams.restricoes} onChangeText={v=>updateAi('restricoes', v)} multiline />

              <BotaoPilula title={aiLoading?'A gerar...':'Gerar treino'} icon="sparkles" onPress={aiLoading?undefined:gerarTreinoComAI} />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------- Estilos ---------- */
const localStyles = StyleSheet.create({
  safeArea:{ flex:1, backgroundColor:Colors.background },
  container:{ flex:1, backgroundColor:Colors.background },
  loadingOverlay:{ position:'absolute', left:0, right:0, top:0, bottom:0, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(244,246,248,0.85)', zIndex:10 },
  loadingText:{ marginTop:10, fontSize:16, color:Colors.textPrimary },
  flatListContent:{ padding:15, paddingBottom:100 },
  listHeaderContainer:{ marginBottom:20 },
  card:{ backgroundColor:Colors.cardBackground, borderRadius:16, padding:20, marginBottom:20, shadowColor:Colors.shadow, shadowOffset:{ width:0, height:8 }, shadowOpacity:0.08, shadowRadius:12, elevation:3 },
  sectionTitle:{ fontSize:18, fontWeight:'800', color:Colors.textPrimary, marginBottom:14 },

  // --- CLIENTE (novo visual) ---
  clientCardWrap:{ backgroundColor:'#F8FAFC', borderRadius:14, borderWidth:1, borderColor:Colors.border, padding:14 },
  clientHeader:{ flexDirection:'row', alignItems:'center', marginBottom:12 },
  clientAvatar:{ width:48, height:48, borderRadius:999, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center', marginRight:12, borderWidth:1, borderColor:'#D1D5DB' },
  clientAvatarText:{ color:'#111827', fontWeight:'800' },
  clientName:{ fontSize:16, fontWeight:'900', color:Colors.textPrimary },
  clientMetaRow:{ flexDirection:'row', alignItems:'center', marginTop:2 },
  clientMetaText:{ marginLeft:6, fontSize:12, color:Colors.textSecondary },

  clientStatsRow:{ flexDirection:'row', gap:10 },
  clientStatBox:{ flex:1, flexDirection:'row', alignItems:'center', backgroundColor:'#FFFFFF', borderRadius:12, padding:10, borderWidth:1, borderColor:Colors.border },
  clientStatLabel:{ fontSize:11, color:Colors.textSecondary, textTransform:'uppercase', letterSpacing:0.6 },
  clientStatValue:{ fontSize:16, fontWeight:'800', color:Colors.textPrimary },
  clientStatValueSmall:{ fontSize:12, fontWeight:'700', color:Colors.textPrimary },

  clientEmpty:{ alignItems:'center', justifyContent:'center', paddingVertical:16, borderRadius:14, borderWidth:1, borderColor:Colors.border, backgroundColor:'#F9FAFB' },
  clientEmptyIcon:{ width:44, height:44, borderRadius:999, backgroundColor:'#EEF2FF', alignItems:'center', justifyContent:'center', marginBottom:8, borderWidth:1, borderColor:'#E0E7FF' },
  clientEmptyTitle:{ fontSize:16, fontWeight:'900', color:Colors.textPrimary },
  clientEmptyText:{ fontSize:13, color:Colors.textSecondary, marginTop:4 },

  selectedClientText:{ fontSize:16, color:Colors.textPrimary, flex:1 },
  calendar:{ borderRadius:12, marginTop:10, borderWidth:1, borderColor:Colors.border },
  timeInput:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#F8FAFC', padding:14, borderRadius:12, marginTop:12, borderWidth:1, borderColor:Colors.border },
  dateTimePicker:{ backgroundColor:Colors.cardBackground },
  pickerModalOverlay:{ flex:1, justifyContent:'flex-end', backgroundColor:'rgba(0,0,0,0.4)' },
  pickerModalContent:{ backgroundColor:'white', padding:20, borderTopLeftRadius:20, borderTopRightRadius:20 },
  pickerConfirmButton:{ marginTop:15, backgroundColor:Colors.primary, padding:15, borderRadius:12, alignItems:'center' },
  pickerConfirmButtonText:{ color:Colors.cardBackground, fontWeight:'800' },

  inputContainer:{ flexDirection:'row', alignItems:'flex-start', backgroundColor:'#F8FAFC', borderRadius:12, paddingHorizontal:14, paddingVertical:10, marginBottom:10, borderWidth:1, borderColor:Colors.border },
  inputIconLeft:{ marginRight:10, marginTop:3 },
  input:{ flex:1, fontSize:16, color:Colors.textPrimary, padding:0 },
  multilineInput:{ minHeight:80, textAlignVertical:'top' },
  inlineNotesInput:{ minHeight:50, textAlignVertical:'top', paddingTop:10, paddingBottom:10 },
  inputLabel:{ fontSize:16, fontWeight:'800', color:Colors.textPrimary, marginTop:10, marginBottom:5 },
  pickerButton:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#F8FAFC', padding:15, borderRadius:12, borderWidth:1},
   pickerButtonText:{ color:Colors.textPrimary, fontWeight:'600' },
  bottomBar:{ position:'absolute', bottom:0, left:0, right:0, padding:12, backgroundColor:Colors.cardBackground, borderTopWidth:1, borderTopColor:Colors.border },

  // Exercícios
  exercicioCard:{ backgroundColor:Colors.cardBackground, marginHorizontal:12, marginTop:10, borderRadius:12, borderWidth:1, borderColor:Colors.border },
  exercicioHeader:{ paddingHorizontal:12, paddingVertical:12, borderBottomWidth:1, borderBottomColor:Colors.border, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  exercicioNome:{ marginLeft:8, fontWeight:'700', color:Colors.textPrimary, flexShrink:1 },
  exercicioContent:{ paddingHorizontal:12, paddingVertical:10 },
  exercicioDescricao:{ color:Colors.textSecondary, marginBottom:6 },
  exercicioMeta:{ color:Colors.textSecondary, marginTop:2 },

  setsTitle:{ fontWeight:'800', color:Colors.textPrimary, marginBottom:6 },
  setRow:{ backgroundColor:'#F9FAFB', borderWidth:1, borderColor:Colors.border, borderRadius:10, padding:8, marginBottom:8 },
  setBadge:{ backgroundColor:'#E5E7EB', color:'#111827', fontWeight:'800', paddingHorizontal:8, paddingVertical:2, borderRadius:999, alignSelf:'flex-start', marginBottom:6 },
  setDetailField:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#fff', borderWidth:1, borderColor:Colors.border, borderRadius:8, paddingHorizontal:8, height:40 },
  setDetailInput:{ minWidth:70, paddingVertical:0, color:Colors.textPrimary },

  // Modais
  centeredView:{ flex:1, backgroundColor:'rgba(0,0,0,0.2)', justifyContent:'center', padding:16 },
  modalView:{ backgroundColor:'#fff', borderRadius:16, padding:16, maxHeight:'90%' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  modalTitle:{ fontWeight:'800', fontSize:16, color:Colors.textPrimary },
  modalItem:{ paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.border },
  modalItemText:{ color:Colors.textPrimary, fontWeight:'600' },
  noItemsText:{ textAlign:'center', color:Colors.textSecondary, marginTop:20 },

  // Biblioteca
  searchBar:{ height:44, backgroundColor:'#fff', borderWidth:1, borderColor:Colors.border, borderRadius:10, paddingHorizontal:12, color:Colors.textPrimary },
  exercicioBibliotecaCard:{ backgroundColor:'#fff', borderWidth:1, borderColor:Colors.border, borderRadius:10, padding:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  exercicioBibliotecaInfo:{ flex:1, paddingRight:10 },
  exercicioBibliotecaNome:{ fontWeight:'700', color:Colors.textPrimary },
  exercicioBibliotecaCategoriaContainer:{ flexDirection:'row', alignItems:'center', gap:6, marginTop:2 },
  exercicioBibliotecaCategoria:{ color:Colors.textSecondary },
  exercicioBibliotecaDetailRow:{ flexDirection:'row', alignItems:'center', gap:6, marginTop:2 },
  exercicioBibliotecaDetailText:{ color:Colors.textSecondary },
  exercicioBibliotecaDescricao:{ color:Colors.textSecondary, marginTop:4 },

  // Time picker modal (iOS)
  pickerModalOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center' },
  pickerModalContent:{ backgroundColor:'#fff', padding:16, borderRadius:16, width:'90%', maxWidth:400 },
  dateTimePicker:{ width:'100%' },
  pickerConfirmButton:{ backgroundColor:Colors.primary, borderRadius:8, marginTop:10, paddingVertical:10, alignItems:'center' },
  pickerConfirmButtonText:{ color:'#fff', fontWeight:'800' },

  aiCTA:{ marginTop:12, padding:14, borderWidth:1, borderColor:Colors.border, borderRadius:12, backgroundColor:'#F8FAFC' },
  aiCTATitle:{ fontWeight:'800', color:Colors.textPrimary, marginBottom:4 },
  aiCTASubtitle:{ color:Colors.textSecondary, marginBottom:10 },

  heroCard:{ backgroundColor:'#F8FAFC' },
  heroLeft:{ flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 },
  avatarCircle:{ width:44, height:44, borderRadius:22, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#D1D5DB' },
  heroTitle:{ fontSize:16, fontWeight:'900', color:Colors.textPrimary },
  heroSubtitle:{ color:Colors.textSecondary, marginTop:2 },

  seriesContainer:{ marginTop:4 },
  setCard:{ backgroundColor:'#F9FAFB', borderWidth:1, borderColor:Colors.border, borderRadius:12, padding:10, marginBottom:10 },
  setCardHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  setCardTitle:{ fontWeight:'800', color:Colors.textPrimary },
  pickerContainerSet:{ borderWidth:1, borderColor:Colors.border, borderRadius:10, overflow:'hidden', marginBottom:8 },
  pickerSet:{ height:42, width:'100%' },
  setDetailsGrid:{ flexDirection:'row', flexWrap:'wrap', gap:8 },

  compactBar:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:10 },
  badge:{ marginLeft:8, backgroundColor:'#E5E7EB', borderRadius:999, paddingHorizontal:8, paddingVertical:2 },
  badgeText:{ fontSize:12, fontWeight:'800', color:'#111827' },
  border:{ borderWidth:1, borderColor:Colors.border, borderRadius:10 },

  smallTag:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:8, paddingVertical:4, borderRadius:999, backgroundColor:'#F3F4F6', borderWidth:1, borderColor:Colors.border, marginRight:6 },
  smallTagText:{ color:Colors.textSecondary },

  videoOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center' },
  playerOnlyBox:{ backgroundColor:'#000', borderRadius:12, overflow:'hidden' },

  clientRow:{ flexDirection:'row', alignItems:'center', gap:10, paddingVertical:10, borderBottomWidth:1, borderBottomColor:Colors.border },
});
