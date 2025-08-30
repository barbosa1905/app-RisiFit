// screens/User/ProgressoScreen.js — foco: TABELA incrível + header estável (sem mudar o fundo)
// Mantém todas as tuas funcionalidades (chips, KPIs, gráficos, exportações)
// Melhorias:
//  • Tabela responsiva (auto-ajusta nº de colunas por página consoante a largura)
//  • Coluna "Data" fixa visualmente, números alinhados, setas de tendência por célula
//  • Tabs por grupo (Última/Básicas/Composição/Perímetros/Dobras)
//  • Ordenação ao tocar no cabeçalho (asc/desc), sem scroll infinito
//  • Header sem "tremor": animação com translateY + diffClamp (useNativeDriver), bounces/overscroll desativados

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar, Animated,
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Alert,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Svg, Circle } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import { auth, db } from '../../services/firebaseConfig';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const Colors = {
  primary: '#2A3B47',
  primaryLight: '#3A506B',
  secondary: '#FFB800',
  background: '#F0F2F5', // fundo original mantido
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E6E8EB',
  success: '#22C55E',
  danger: '#EF4444',
};
const { width: W } = Dimensions.get('window');

// ===== Helpers =====
const safeToNumber = (v) => {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};
const normalizeDate = (d) => {
  try {
    if (!d) return null;
    if (d.toDate) return d.toDate();
    if (typeof d === 'string') return new Date(d);
    if (d.seconds) return new Date(d.seconds * 1000);
    return new Date(d);
  } catch { return null; }
};
const fmtDate = (date) => (date ? new Date(date).toLocaleDateString('pt-PT') : '—');
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;

// ===== Catálogo de Métricas =====
const FIELD_DEFS = {
  // Métricas básicas
  peso: { label: 'Peso', suffix: 'kg', decimals: 1 },
  altura: { label: 'Altura', suffix: 'm', decimals: 2 },
  imc: { label: 'IMC', suffix: '', decimals: 1 },
  tmb: { label: 'TMB', suffix: 'kcal/d', decimals: 0 },
  massaMagraKg: { label: 'Massa magra', suffix: 'kg', decimals: 1 },
  massaMagraPerc: { label: 'Massa magra', suffix: '%', decimals: 1 },
  massaGordaKg: { label: 'Massa gorda', suffix: 'kg', decimals: 1 },
  massaGordaPerc: { label: 'Massa gorda', suffix: '%', decimals: 1 },
  // Composição
  gorduraCorporal: { label: 'Gordura corporal', suffix: '%', decimals: 1 },
  massaMuscular: { label: 'Massa muscular', suffix: '%', decimals: 1 },
  aguaCorporalTotal: { label: 'Água corporal total', suffix: '%', decimals: 1 },
  massaOssea: { label: 'Massa óssea', suffix: '%', decimals: 1 },
  // Perímetros (cm)
  peito: { label: 'Peito', suffix: 'cm', decimals: 1 },
  cintura: { label: 'Cintura', suffix: 'cm', decimals: 1 },
  abdomenPer: { label: 'Abdómen (perímetro)', suffix: 'cm', decimals: 1 },
  anca: { label: 'Anca', suffix: 'cm', decimals: 1 },
  bracoDireitoRelaxado: { label: 'Braço direito (relaxado)', suffix: 'cm', decimals: 1 },
  bracoDireitoContraido: { label: 'Braço direito (contraído)', suffix: 'cm', decimals: 1 },
  bracoEsquerdoRelaxado: { label: 'Braço esquerdo (relaxado)', suffix: 'cm', decimals: 1 },
  bracoEsquerdoContraido: { label: 'Braço esquerdo (contraído)', suffix: 'cm', decimals: 1 },
  coxaDireita: { label: 'Coxa direita', suffix: 'cm', decimals: 1 },
  coxaEsquerda: { label: 'Coxa esquerda', suffix: 'cm', decimals: 1 },
  gemeoDireito: { label: 'Gémeo direito', suffix: 'cm', decimals: 1 },
  gemeoEsquerdo: { label: 'Gémeo esquerdo', suffix: 'cm', decimals: 1 },
  // Dobras (mm)
  tricepsDobra: { label: 'Tríceps (dobra)', suffix: 'mm', decimals: 0 },
  bicepsDobra: { label: 'Bíceps (dobra)', suffix: 'mm', decimals: 0 },
  subescapularDobra: { label: 'Subescapular (dobra)', suffix: 'mm', decimals: 0 },
  suprailicaDobra: { label: 'Suprailíaca (dobra)', suffix: 'mm', decimals: 0 },
  abdominalDobra: { label: 'Abdominal (dobra)', suffix: 'mm', decimals: 0 },
  coxaDobra: { label: 'Coxa (dobra)', suffix: 'mm', decimals: 0 },
  panturrilhaDobra: { label: 'Panturrilha (dobra)', suffix: 'mm', decimals: 0 },
  peitoralDobra: { label: 'Peitoral (dobra)', suffix: 'mm', decimals: 0 },
};

// ===== Normalizadores =====
const mapFromRoot = (raw) => {
  const mb = raw.metricasBasicas || {};
  const per = raw.perimetros || raw.perimetrosCorporais || {};
  const comp = raw.composicaoCorporal || {};
  const dob = raw.dobrasCutaneas || {};
  const outros = raw.outrosParametros || {};
  return {
    id: raw.id,
    data: normalizeDate(raw.dataAvaliacao) || normalizeDate(raw.data) || normalizeDate(raw.createdAt) || normalizeDate(raw.criadoEm) || normalizeDate(raw.criadoEmISO),
    // Métricas
    peso: safeToNumber(mb.peso ?? raw.peso ?? outros.peso),
    altura: safeToNumber(mb.altura ?? raw.altura ?? outros.altura),
    imc: safeToNumber(mb.imc ?? raw.imc ?? outros.imc),
    tmb: safeToNumber(mb.tmb ?? raw.tmb ?? outros.tmb),
    massaMagraKg: safeToNumber(mb.massaMagraKg ?? raw.massaMagraKg),
    massaMagraPerc: safeToNumber(mb.massaMagraPerc ?? raw.massaMagraPerc),
    massaGordaKg: safeToNumber(mb.massaGordaKg ?? raw.massaGordaKg),
    massaGordaPerc: safeToNumber(mb.massaGordaPerc ?? raw.massaGordaPerc),
    gorduraCorporal: safeToNumber(comp.gorduraCorporal ?? raw.gorduraCorporal ?? outros.gorduraCorporal),
    massaMuscular: safeToNumber(comp.massaMuscular ?? raw.musculatura ?? outros.musculatura),
    aguaCorporalTotal: safeToNumber(comp.aguaCorporalTotal ?? raw.aguaCorporalTotal),
    massaOssea: safeToNumber(comp.massaOssea ?? raw.massaOssea),
    peito: safeToNumber(per.peito ?? raw.peito),
    cintura: safeToNumber(per.cintura ?? raw.cintura),
    abdomenPer: safeToNumber(per.abdomen ?? raw.abdomen),
    anca: safeToNumber(per.anca ?? per.quadril ?? raw.quadril),
    bracoDireitoRelaxado: safeToNumber(per.bracoDireitoRelaxado),
    bracoDireitoContraido: safeToNumber(per.bracoDireitoContraido),
    bracoEsquerdoRelaxado: safeToNumber(per.bracoEsquerdoRelaxado),
    bracoEsquerdoContraido: safeToNumber(per.bracoEsquerdoContraido),
    coxaDireita: safeToNumber(per.coxaDireita ?? raw.coxaDireita),
    coxaEsquerda: safeToNumber(per.coxaEsquerda ?? raw.coxaEsquerda),
    gemeoDireito: safeToNumber(per.gemeoDireito ?? per.panturrilhaDireito ?? raw.gemeoDireito),
    gemeoEsquerdo: safeToNumber(per.gemeoEsquerdo ?? per.panturrilhaEsquerdo ?? raw.gemeoEsquerdo),
    tricepsDobra: safeToNumber(dob.triceps ?? raw.triceps),
    bicepsDobra: safeToNumber(dob.biceps ?? raw.biceps),
    subescapularDobra: safeToNumber(dob.subescapular ?? raw.subescapular),
    suprailicaDobra: safeToNumber(dob.suprailica ?? raw.suprailica),
    abdominalDobra: safeToNumber(dob.abdominal ?? raw.abdominalDobra ?? raw.abdominalD),
    coxaDobra: safeToNumber(dob.coxa ?? raw.coxaDobra),
    panturrilhaDobra: safeToNumber(dob.panturrilha ?? raw.panturrilhaDobra),
    peitoralDobra: safeToNumber(dob.peitoral ?? raw.peitoralDobra),
  };
};

const mapFromSub = (raw) => {
  const mb = raw.metricasBasicas || {};
  const per = raw.perimetros || raw.perimetrosCorporais || {};
  const comp = raw.composicaoCorporal || {};
  const dob = raw.dobrasCutaneas || {};
  return {
    id: raw.id,
    data: normalizeDate(raw.data) || normalizeDate(raw.dataAvaliacao) || normalizeDate(raw.createdAt) || normalizeDate(raw.criadoEm) || normalizeDate(raw.criadoEmISO),
    peso: safeToNumber(raw.peso ?? mb.peso),
    altura: safeToNumber(raw.altura ?? mb.altura),
    imc: safeToNumber(raw.imc ?? mb.imc),
    tmb: safeToNumber(raw.tmb ?? mb.tmb),
    massaMagraKg: safeToNumber(raw.massaMagraKg ?? mb.massaMagraKg),
    massaMagraPerc: safeToNumber(raw.massaMagraPerc ?? mb.massaMagraPerc),
    massaGordaKg: safeToNumber(raw.massaGordaKg ?? mb.massaGordaKg),
    massaGordaPerc: safeToNumber(raw.massaGordaPerc ?? mb.massaGordaPerc),
    gorduraCorporal: safeToNumber(raw.gorduraCorporal ?? raw.gordura ?? comp.gorduraCorporal),
    massaMuscular: safeToNumber(raw.musculatura ?? comp.massaMuscular),
    aguaCorporalTotal: safeToNumber(raw.aguaCorporalTotal ?? comp.aguaCorporalTotal),
    massaOssea: safeToNumber(raw.massaOssea ?? comp.massaOssea),
    peito: safeToNumber(raw.peito ?? per.peito),
    cintura: safeToNumber(raw.cintura ?? per.cintura),
    abdomenPer: safeToNumber(raw.abdomen ?? per.abdomen),
    anca: safeToNumber(raw.quadril ?? per.anca ?? per.quadril),
    bracoDireitoRelaxado: safeToNumber(per.bracoDireitoRelaxado ?? raw.bracoDireitoRelaxado),
    bracoDireitoContraido: safeToNumber(per.bracoDireitoContraido ?? raw.bracoDireitoContraido),
    bracoEsquerdoRelaxado: safeToNumber(per.bracoEsquerdoRelaxado ?? raw.bracoEsquerdoRelaxado),
    bracoEsquerdoContraido: safeToNumber(per.bracoEsquerdoContraido ?? raw.bracoEsquerdoContraido),
    coxaDireita: safeToNumber(raw.coxaDireita ?? per.coxaDireita ?? raw.coxa),
    coxaEsquerda: safeToNumber(raw.coxaEsquerda ?? per.coxaEsquerda),
    gemeoDireito: safeToNumber(per.gemeoDireito ?? raw.gemeoDireito ?? raw.panturrilhaDireito),
    gemeoEsquerdo: safeToNumber(per.gemeoEsquerdo ?? raw.gemeoEsquerdo ?? raw.panturrilhaEsquerdo),
    tricepsDobra: safeToNumber(raw.triceps ?? dob.triceps),
    bicepsDobra: safeToNumber(raw.biceps ?? dob.biceps),
    subescapularDobra: safeToNumber(raw.subescapular ?? dob.subescapular),
    suprailicaDobra: safeToNumber(raw.suprailica ?? dob.suprailica),
    abdominalDobra: safeToNumber(raw.abdominalDobra ?? dob.abdominal),
    coxaDobra: safeToNumber(raw.coxaDobra ?? dob.coxa),
    panturrilhaDobra: safeToNumber(raw.panturrilhaDobra ?? dob.panturrilha),
    peitoralDobra: safeToNumber(raw.peitoralDobra ?? dob.peitoral),
  };
};

// ===== UI Auxiliares =====
function Ring({ size = 116, stroke = 12, percent = 0, color = Colors.secondary, label, value, suffix }) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, percent)); const dash = (p / 100) * c;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={r} stroke={Colors.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${dash} ${c-dash}`} strokeLinecap="round" rotation="-90" originX={size/2} originY={size/2} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: Colors.text, fontWeight: '700' }}>{label}</Text>
        <Text style={{ fontSize: 20, color: Colors.text, fontWeight: '800' }}>{value}{suffix ? ` ${suffix}` : ''}</Text>
      </View>
    </View>
  );
}

export default function ProgressoScreen() {
  // ===== Header sem tremor (translateY + diffClamp) =====
  const HEADER_MAX = 260; const HEADER_MIN = 120; const COLLAPSE = HEADER_MAX - HEADER_MIN;
  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = Animated.diffClamp(scrollY, 0, COLLAPSE);
  const headerTranslateY = clampedY.interpolate({ inputRange: [0, COLLAPSE], outputRange: [0, -COLLAPSE], extrapolate: 'clamp' });
  const headerFadeBig = clampedY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });
  const headerFadeCompact = clampedY.interpolate({ inputRange: [0, 60, 120], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const headerScaleRing = clampedY.interpolate({ inputRange: [0, COLLAPSE], outputRange: [1, 0.85], extrapolate: 'clamp' });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('U');

  const [metricCatalog, setMetricCatalog] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);

  // ===== TABELA =====
  const ORDER = [
    'peso','gorduraCorporal','imc','massaMuscular','massaGordaPerc','massaMagraPerc','altura','tmb','massaGordaKg','massaMagraKg',
    'cintura','anca','peito','abdomenPer',
    'bracoDireitoRelaxado','bracoDireitoContraido','bracoEsquerdoRelaxado','bracoEsquerdoContraido',
    'coxaDireita','coxaEsquerda','gemeoDireito','gemeoEsquerdo',
    'tricepsDobra','bicepsDobra','subescapularDobra','suprailicaDobra','abdominalDobra','coxaDobra','panturrilhaDobra','peitoralDobra',
  ];
  const MAX_ROWS = 4; // altura
  const minColWidth = 92; const dateWidth = 96; // responsivo
  const [tableWidth, setTableWidth] = useState(W - 32);
  const colsPerPage = useMemo(() => Math.max(2, Math.min(6, Math.floor((tableWidth - dateWidth) / minColWidth))), [tableWidth]);
  const [colPage, setColPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [tableMode, setTableMode] = useState('latest'); // 'latest' | 'basicas' | 'composicao' | 'perimetros' | 'dobras'
  const [sort, setSort] = useState({ key: 'data', dir: 'desc' });

  const GOAL = {
    massaMuscular: 'up', massaMagraPerc: 'up', massaMagraKg: 'up', tmb: 'up',
    gorduraCorporal: 'down', massaGordaPerc: 'down', massaGordaKg: 'down', cintura: 'down', abdomenPer: 'down',
    tricepsDobra: 'down', bicepsDobra: 'down', subescapularDobra: 'down', suprailicaDobra: 'down', abdominalDobra: 'down', coxaDobra: 'down', panturrilhaDobra: 'down', peitoralDobra: 'down',
    peso: null, altura: null, peito: null, anca: null,
    bracoDireitoRelaxado: null, bracoDireitoContraido: null, bracoEsquerdoRelaxado: null, bracoEsquerdoContraido: null,
    coxaDireita: null, coxaEsquerda: null, gemeoDireito: null, gemeoEsquerdo: null,
  };

  const convertIfNeeded = useCallback((val, key) => safeToNumber(val), []);

  const loadData = useCallback(async () => {
    setError(''); setLoading(true);
    try {
      const uid = auth.currentUser?.uid; if (!uid) { setRows([]); setLoading(false); return; }
      try { const us = await getDoc(doc(db, 'users', uid)); if (us.exists()) { const d = us.data() || {}; const nome = d.name || d.nome || ''; setUserName(nome); setUserInitial(nome?.trim()?.charAt(0)?.toUpperCase() || 'U'); } } catch {}

      let list = [];
      try { const subSnap = await getDocs(collection(db, 'users', uid, 'avaliacoes')); subSnap.forEach((docu) => list.push({ id: docu.id, ...mapFromSub(docu.data() || {}) })); } catch {}
      try { const q = query(collection(db, 'avaliacoesFisicas'), where('clienteId', '==', uid)); const rootSnap = await getDocs(q); rootSnap.forEach((docu) => list.push({ id: docu.id, ...mapFromRoot({ id: docu.id, ...docu.data() }) })); } catch {}

      const sorted = list.filter((a) => a.data instanceof Date && !Number.isNaN(a.data)).sort((a,b) => a.data - b.data);
      setRows(sorted);

      const keysPresent = new Set();
      sorted.forEach((r) => { Object.keys(FIELD_DEFS).forEach((k) => { if (convertIfNeeded(r[k], k) !== undefined) keysPresent.add(k); }); });
      const catalog = ORDER.filter((k) => keysPresent.has(k)).map((k) => ({ key: k, ...FIELD_DEFS[k] }));
      setMetricCatalog(catalog);
      if (!catalog.length) setSelectedMetric(null); else if (!selectedMetric || !keysPresent.has(selectedMetric.key)) setSelectedMetric(catalog[0]);

      setColPage(0); setRowPage(0);
    } catch (e) {
      console.error('Erro ao carregar progresso:', e); setError('Não foi possível carregar os dados de progresso.');
    } finally { setLoading(false); }
  }, [convertIfNeeded, selectedMetric]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await loadData(); setRefreshing(false); }, [loadData]);

  const hasData = rows.length > 0 && metricCatalog.length > 0 && selectedMetric;

  // KPIs
  const kpis = useMemo(() => {
    if (!rows.length) return [];
    const last = rows[rows.length - 1];
    const prev = rows.length > 1 ? rows[rows.length - 2] : null;
    const baseKeys = ['peso','gorduraCorporal','imc'];
    return baseKeys.filter((k) => FIELD_DEFS[k] && convertIfNeeded(last[k], k) !== undefined).map((k) => {
      const d = FIELD_DEFS[k];
      const cur = convertIfNeeded(last[k], k);
      const ant = prev ? convertIfNeeded(prev[k], k) : undefined;
      const delta = cur !== undefined && ant !== undefined ? cur - ant : undefined;
      return { key: k, label: d.label, suffix: d.suffix, decimals: d.decimals, value: cur, delta };
    });
  }, [rows, convertIfNeeded]);

  // Séries
  const mainSeries = useMemo(() => {
    if (!hasData) return { labels: [], data: [] };
    const key = selectedMetric.key;
    const arr = rows.map((e) => ({ x: fmtDate(e.data), y: convertIfNeeded(e[key], key) })).filter((p) => p.y !== undefined);
    const first = arr.length ? arr[0].y : undefined; const last = arr.length ? arr[arr.length-1].y : undefined;
    const delta = first !== undefined && last !== undefined ? last - first : undefined;
    const percent = first && last !== undefined ? (first !== 0 ? (delta/first)*100 : undefined) : undefined;
    return { labels: arr.map((v) => v.x), data: arr.map((v) => Number(v.y.toFixed(selectedMetric.decimals))), last, delta, percent };
  }, [rows, hasData, selectedMetric, convertIfNeeded]);

  const monthlyBar = useMemo(() => {
    if (!hasData) return { labels: [], data: [] };
    const key = selectedMetric.key; const map = new Map();
    rows.forEach((e) => { const y = convertIfNeeded(e[key], key); if (y === undefined) return; const k = monthKey(e.data); if (!map.has(k)) map.set(k, []); map.get(k).push(y); });
    const entries = [...map.entries()].sort(([a],[b]) => (a > b ? 1 : -1)).slice(-6);
    const labels = entries.map(([k]) => { const [Y,M] = k.split('-'); return `${M}/${String(Y).slice(2)}`; });
    const data = entries.map(([,arr]) => Number((arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(selectedMetric.decimals)));
    return { labels, data };
  }, [rows, hasData, selectedMetric, convertIfNeeded]);

  const ringInfo = useMemo(() => {
    if (!hasData) return { last: undefined, percent: 0 };
    const vals = rows.map((e) => convertIfNeeded(e[selectedMetric.key], selectedMetric.key)).filter((v) => v !== undefined);
    if (!vals.length) return { last: undefined, percent: 0 };
    const min = Math.min(...vals); const max = Math.max(...vals); const last = vals[vals.length - 1];
    const percent = min === max ? 100 : ((last - min) / (max - min)) * 100;
    return { last, percent: Math.max(0, Math.min(100, percent)) };
  }, [rows, hasData, selectedMetric, convertIfNeeded]);

  // ====== Dados da tabela ======
  const rowsSorted = useMemo(() => {
    const arr = [...rows];
    if (sort.key === 'data') {
      arr.sort((a,b) => sort.dir === 'desc' ? b.data - a.data : a.data - b.data);
    } else {
      arr.sort((a,b) => {
        const av = convertIfNeeded(a[sort.key], sort.key);
        const bv = convertIfNeeded(b[sort.key], sort.key);
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return 1;
        if (bv === undefined) return -1;
        return sort.dir === 'desc' ? (bv - av) : (av - bv);
      });
    }
    return arr;
  }, [rows, sort, convertIfNeeded]);

  const rowsDesc = useMemo(() => [...rowsSorted].reverse(), [rowsSorted]); // para lookup do "prev" quando se vê em ordem desc

  const keysByGroup = useMemo(() => ({
    basicas: ['peso','altura','imc','tmb','massaMagraKg','massaMagraPerc','massaGordaKg','massaGordaPerc'],
    composicao: ['gorduraCorporal','massaMuscular','aguaCorporalTotal','massaOssea'],
    perimetros: ['peito','cintura','abdomenPer','anca','bracoDireitoRelaxado','bracoDireitoContraido','bracoEsquerdoRelaxado','bracoEsquerdoContraido','coxaDireita','coxaEsquerda','gemeoDireito','gemeoEsquerdo'],
    dobras: ['tricepsDobra','bicepsDobra','subescapularDobra','suprailicaDobra','abdominalDobra','coxaDobra','panturrilhaDobra','peitoralDobra']
  }), []);

  const latestKeys = useMemo(() => {
    const latest = rowsSorted[0] || {};
    return ORDER.filter((k) => convertIfNeeded(latest[k], k) !== undefined);
  }, [rowsSorted, convertIfNeeded]);

  const baseCols = useMemo(() => {
    if (tableMode === 'latest') return latestKeys;
    const arr = keysByGroup[tableMode] || [];
    const present = new Set();
    rows.forEach((r) => arr.forEach((k) => { if (convertIfNeeded(r[k], k) !== undefined) present.add(k); }));
    return arr.filter((k) => present.has(k));
  }, [tableMode, latestKeys, keysByGroup, rows, convertIfNeeded]);

  const totalColPages = Math.max(1, Math.ceil(baseCols.length / colsPerPage));
  const totalRowPages = Math.max(1, Math.ceil(rowsSorted.length / MAX_ROWS));
  const shownCols = baseCols.slice(colPage * colsPerPage, colPage * colsPerPage + colsPerPage);
  const startRowIndex = rowPage * MAX_ROWS;
  const shownRows = rowsSorted.slice(startRowIndex, startRowIndex + MAX_ROWS);

  const deltaVisual = (key, delta) => {
    if (typeof delta !== 'number') return { icon: 'minus', color: Colors.textMuted };
    const goal = GOAL[key] ?? null;
    if (!goal) return { icon: delta >= 0 ? 'arrow-up-right' : 'arrow-down-right', color: Colors.textMuted };
    const improved = goal === 'up' ? delta > 0 : delta < 0;
    return { icon: improved ? 'arrow-up-right' : 'arrow-down-right', color: improved ? Colors.success : Colors.danger };
  };

  // Exportações
  const exportableCatalog = useMemo(() => metricCatalog, [metricCatalog]);
  const flatForExport = useMemo(() => rows.map((r) => ({ data: fmtDate(r.data), ...Object.fromEntries(exportableCatalog.map((m) => [m.key, convertIfNeeded(r[m.key], m.key)])) })), [rows, exportableCatalog, convertIfNeeded]);

  const exportCSV = useCallback(async () => {
    try {
      if (!flatForExport.length) return Alert.alert('Sem dados', 'Não há avaliações para exportar.');
      const headers = ['Data', ...exportableCatalog.map((m) => `${m.label}${m.suffix ? ` (${m.suffix})` : ''}`)];
      const lines = flatForExport.map((r) => [r.data, ...exportableCatalog.map((m) => (r[m.key] ?? '') )].join(';'));
      const csv = [headers.join(';'), ...lines].join('');
      const fileUri = FileSystem.documentDirectory + `risifit_progresso_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
    } catch (e) { console.error('CSV error', e); Alert.alert('Erro', 'Não foi possível exportar o CSV.'); }
  }, [flatForExport, exportableCatalog]);

  const exportPDF = useCallback(async () => {
    try {
      if (!flatForExport.length) return Alert.alert('Sem dados', 'Não há avaliações para exportar.');
      const headerCells = exportableCatalog.map((m) => `<th>${m.label}${m.suffix ? ` (${m.suffix})` : ''}</th>`).join('');
      const rowsHtml = flatForExport.map((r) => `<tr><td>${r.data}</td>${exportableCatalog.map((m) => `<td>${r[m.key] ?? '-'}</td>`).join('')}</tr>`).join('');
      const html = `
        <html><head><meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, Roboto, Arial; padding: 24px; color: #111827; }
            .title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
            .sub { color:#6B7280; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #E6E8EB; padding: 8px; text-align: center; }
            th { background: #F7F7F7; }
            .badge { display:inline-block; background:#FFB800; padding: 4px 10px; border-radius: 999px; font-weight: 700; margin-left:8px;}
          </style>
        </head>
        <body>
          <div class="title">Relatório de Progresso <span class="badge">RISI<span style="color:#1A1A1A">FIT</span></span></div>
          <div class="sub">${userName || 'Utilizador'} • Exportado em ${fmtDate(new Date())}</div>
          <table>
            <thead>
              <tr>
                <th>Data</th>${headerCells}
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
    } catch (e) { console.error('PDF error', e); Alert.alert('Erro', 'Não foi possível exportar o PDF.'); }
  }, [flatForExport, exportableCatalog, userName]);

  // ===== RENDER =====
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER fixo com translateY (sem saltos) */}
      <Animated.View style={[styles.headerWrap, { transform: [{ translateY: headerTranslateY }] }]}> 
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.headerGradient}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandPill}><Text style={styles.brandLeft}>RISI</Text><Text style={styles.brandRight}>FIT</Text></View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={exportCSV} style={styles.actionIcon} activeOpacity={0.85}><Feather name="file-text" size={18} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={exportPDF} style={styles.actionIcon} activeOpacity={0.85}><Feather name="download" size={18} color="#fff" /></TouchableOpacity>
            </View>
          </View>

          <Animated.View style={{ opacity: headerFadeBig }}>
            <View style={styles.userRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{userInitial}</Text></View>
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <Text style={styles.hello}>Olá,</Text>
                <Text style={styles.userName} numberOfLines={1}>{userName || 'Utilizador'}</Text>
              </View>
              {selectedMetric && (
                <Animated.View style={{ transform: [{ scale: headerScaleRing }] }}>
                  <Ring size={116} stroke={12} percent={hasData ? (ringInfo.percent ?? 0) : 0} label={selectedMetric.label} value={ringInfo.last !== undefined ? ringInfo.last.toFixed(selectedMetric.decimals) : '—'} suffix={selectedMetric.suffix} />
                </Animated.View>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[styles.compactBar, { opacity: headerFadeCompact }]}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {selectedMetric ? `${selectedMetric.label} • ${userName || 'Utilizador'}` : 'Sem dados'}
            </Text>
            {selectedMetric && (
              <View style={styles.compactChip}>
                <Feather name="trending-up" size={14} color="#1A1A1A" />
                <Text style={styles.compactChipText}>{ringInfo.last !== undefined ? `${ringInfo.last.toFixed(selectedMetric.decimals)} ${selectedMetric.suffix}` : '—'}</Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Scroll com offset igual ao header e sem bounces/sensibilidade extra */}
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        decelerationRate="normal"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.secondary]} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* offset para não ficar por baixo do header */}
        <View style={{ height: HEADER_MAX }} />

        {/* Chips de métricas dinâmicas */}
        <View style={{ paddingTop: 12 }}>
          <FlatList
            data={metricCatalog}
            horizontal
            keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => {
              const active = selectedMetric?.key === item.key;
              return (
                <TouchableOpacity onPress={() => setSelectedMetric(item)} style={[styles.metricChip, active && styles.metricChipActive]} activeOpacity={0.85}>
                  <Text style={[styles.metricChipText, active && styles.metricChipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* KPIs */}
        <View style={styles.kpiWrap}>
          {loading ? (
            <View style={styles.loadingCard}><ActivityIndicator color={Colors.secondary} /></View>
          ) : rows.length ? (
            <View style={styles.kpiRow}>
              {kpis.map((k) => (
                <View key={k.key} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                  <Text style={styles.kpiValue}>{k.value !== undefined ? k.value.toFixed(k.decimals) : '—'}{k.suffix ? <Text style={styles.kpiSuffix}> {k.suffix}</Text> : null}</Text>
                  <Text style={[styles.deltaInline, { color: typeof k.delta === 'number' ? (k.delta >= 0 ? Colors.danger : Colors.success) : Colors.textMuted }]}>
                    {typeof k.delta === 'number' ? `${k.delta >= 0 ? '+' : ''}${k.delta.toFixed(1)}${k.suffix ? ' ' + k.suffix : ''} vs. ant.` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.loadingCard, { backgroundColor: '#fff' }]}>
              <Feather name="database" color={Colors.textMuted} size={18} />
              <Text style={{ color: Colors.textMuted, marginTop: 8, fontWeight: '600' }}>Sem dados ainda. Puxe para atualizar.</Text>
            </View>
          )}
        </View>

        {/* Resumo */}
        <View style={styles.dualCard}>
          <View style={styles.dualBlock}>
            <Text style={styles.dualTitle}>Desde o início</Text>
            <Text style={styles.dualValue}>
              {mainSeries.delta !== undefined ? `${mainSeries.delta >= 0 ? '+' : ''}${mainSeries.delta.toFixed(selectedMetric?.decimals ?? 1)}${selectedMetric?.suffix ? ' ' + selectedMetric.suffix : ''}` : '—'}
            </Text>
            <Text style={styles.dualSub}>{mainSeries.percent !== undefined ? `${mainSeries.percent >= 0 ? '+' : ''}${mainSeries.percent.toFixed(1)}%` : '—'}</Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.dualBlock}>
            <Text style={styles.dualTitle}>Valor atual</Text>
            <Text style={styles.dualValue}>{mainSeries.last !== undefined ? `${Number(mainSeries.last).toFixed(selectedMetric?.decimals ?? 1)}${selectedMetric?.suffix ? ' ' + selectedMetric.suffix : ''}` : '—'}</Text>
            <Text style={styles.dualSub}>Métrica: {selectedMetric?.label || '—'}</Text>
          </View>
        </View>

        {/* Gráfico principal */}
        <View style={styles.mainCard}>
          <Text style={styles.mainTitle}>Histórico • {selectedMetric?.label || '—'}</Text>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
            ) : mainSeries.data?.length > 1 ? (
              <LineChart
                data={{ labels: mainSeries.labels, datasets: [{ data: mainSeries.data }] }}
                width={W - 32}
                height={240}
                yAxisSuffix={selectedMetric?.suffix ? ` ${selectedMetric.suffix}` : ''}
                chartConfig={{
                  backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
                  decimalPlaces: selectedMetric?.decimals ?? 1,
                  color: () => '#2A3B47', labelColor: () => Colors.textMuted,
                  propsForDots: { r: '4', strokeWidth: '2', stroke: Colors.secondary },
                  propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '3' },
                }}
                bezier
                style={{ borderRadius: 16 }}
              />
            ) : (
              <Text style={styles.emptyText}>Precisas de pelo menos 2 registos para o gráfico.</Text>
            )}
          </View>
        </View>

        {/* Barras mensais */}
        <View style={styles.mainCard}>
          <Text style={styles.mainTitle}>Média mensal ({selectedMetric?.label || '—'})</Text>
          {monthlyBar.data.length ? (
            <BarChart
              data={{ labels: monthlyBar.labels, datasets: [{ data: monthlyBar.data }] }}
              width={W - 32}
              height={210}
              fromZero
              yAxisSuffix={selectedMetric?.suffix ? ` ${selectedMetric.suffix}` : ''}
              chartConfig={{
                backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff', color: () => '#2A3B47', labelColor: () => Colors.textMuted,
                propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '3' }, barPercentage: 0.5,
              }}
              style={{ borderRadius: 16 }}
            />
          ) : (
            <Text style={styles.emptyText}>Sem dados mensais suficientes.</Text>
          )}
        </View>

        {/* ===== TABELA RESPONSIVA e INCRÍVEL ===== */}
        <View style={styles.tableCard} onLayout={(e) => setTableWidth(e.nativeEvent.layout.width)}>
          {/* Tabs de grupo */}
          <View style={styles.groupTabs}>
            {[
              { key: 'latest', label: 'Última avaliação' },
              { key: 'basicas', label: 'Básicas' },
              { key: 'composicao', label: 'Composição' },
              { key: 'perimetros', label: 'Perímetros' },
              { key: 'dobras', label: 'Dobras' },
            ].map((g) => {
              const active = tableMode === g.key;
              return (
                <TouchableOpacity key={g.key} onPress={() => { setTableMode(g.key); setColPage(0); }} style={[styles.tabBtn, active && styles.tabBtnActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{g.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cabeçalho (ordenável) */}
          <View style={[styles.trow, styles.thead]}>
            <TouchableOpacity
              onPress={() => setSort((s) => ({ key: 'data', dir: s.key==='data' && s.dir==='desc' ? 'asc' : 'desc' }))}
              style={[styles.tcell, styles.tcellDate, styles.tcellSticky]}
              activeOpacity={0.7}
            >
              <View style={styles.headCellWrap}>
                <Text style={[styles.tcellText, styles.theadText]}>Data</Text>
                {sort.key==='data' && <Feather name={sort.dir==='desc' ? 'chevron-down' : 'chevron-up'} size={12} color={Colors.textMuted} />}
              </View>
            </TouchableOpacity>
            {shownCols.map((k) => (
              <TouchableOpacity key={k} onPress={() => setSort((s) => ({ key: k, dir: s.key===k && s.dir==='desc' ? 'asc' : 'desc' }))} style={[styles.tcell, styles.tcellMetric]} activeOpacity={0.7}>
                <View style={styles.headCellWrap}>
                  <Text style={[styles.tcellText, styles.theadText]} numberOfLines={1}>
                    {FIELD_DEFS[k]?.label}{FIELD_DEFS[k]?.suffix ? ` (${FIELD_DEFS[k].suffix})` : ''}
                  </Text>
                  {sort.key===k && <Feather name={sort.dir==='desc' ? 'chevron-down' : 'chevron-up'} size={12} color={Colors.textMuted} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Linhas com coluna Data "fixa" visualmente */}
          {shownRows.map((r, idx) => {
            const prev = rowsSorted[startRowIndex + idx + 1];
            return (
              <View key={r.id || idx} style={[styles.trow, idx % 2 === 0 ? styles.trowEven : styles.trowOdd]}>
                <View style={[styles.tcell, styles.tcellDate, styles.tcellSticky]}>
                  <Text style={[styles.tcellText, styles.valRight]}>{fmtDate(r.data)}</Text>
                </View>
                {shownCols.map((k) => {
                  const def = FIELD_DEFS[k] || { decimals: 1 };
                  const v = convertIfNeeded(r[k], k);
                  const p = prev ? convertIfNeeded(prev[k], k) : undefined;
                  const delta = (v !== undefined && p !== undefined) ? (v - p) : undefined;
                  const { icon, color } = deltaVisual(k, delta);
                  return (
                    <View key={k} style={[styles.tcell, styles.tcellMetric]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Text style={[styles.tcellText, styles.valRight]}>{v === undefined ? '—' : v.toFixed(def.decimals)}</Text>
                        <Feather name={icon} size={12} color={color} />
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Paginação discretíssima */}
          <View style={styles.tableFooter}>
            <View style={styles.pagerPill}>
              <TouchableOpacity disabled={colPage <= 0} onPress={() => setColPage((p) => Math.max(0, p - 1))} style={[styles.pillBtn, colPage <= 0 && styles.pillBtnDisabled]}>
                <Feather name="chevron-left" size={14} color={colPage <= 0 ? '#9CA3AF' : '#1A1A1A'} />
              </TouchableOpacity>
              <Text style={styles.pillText}>{Math.min(colPage + 1, totalColPages)}/{totalColPages}</Text>
              <TouchableOpacity disabled={colPage >= totalColPages - 1} onPress={() => setColPage((p) => Math.min(totalColPages - 1, p + 1))} style={[styles.pillBtn, colPage >= totalColPages - 1 && styles.pillBtnDisabled]}>
                <Feather name="chevron-right" size={14} color={colPage >= totalColPages - 1 ? '#9CA3AF' : '#1A1A1A'} />
              </TouchableOpacity>
            </View>
            <View style={styles.pagerPill}>
              <TouchableOpacity disabled={rowPage <= 0} onPress={() => setRowPage((p) => Math.max(0, p - 1))} style={[styles.pillBtn, rowPage <= 0 && styles.pillBtnDisabled]}>
                <Feather name="chevron-up" size={14} color={rowPage <= 0 ? '#9CA3AF' : '#1A1A1A'} />
              </TouchableOpacity>
              <Text style={styles.pillText}>{Math.min(rowPage + 1, totalRowPages)}/{totalRowPages}</Text>
              <TouchableOpacity disabled={rowPage >= totalRowPages - 1} onPress={() => setRowPage((p) => Math.min(totalRowPages - 1, p + 1))} style={[styles.pillBtn, rowPage >= totalRowPages - 1 && styles.pillBtnDisabled]}>
                <Feather name="chevron-down" size={14} color={rowPage >= totalRowPages - 1 ? '#9CA3AF' : '#1A1A1A'} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.tableLegend}>Colunas: {shownCols.map((k) => FIELD_DEFS[k]?.label || k).join(' • ')}</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header absoluto com altura fixa
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, zIndex: 20 },
  headerGradient: { flex: 1, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 20, paddingBottom: 12, paddingHorizontal: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandPill: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  brandLeft: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  brandRight: { color: Colors.secondary, fontWeight: '800', letterSpacing: 1 },
  actionIcon: { marginLeft: 12, backgroundColor: 'rgba(255,255,255,0.14)', padding: 8, borderRadius: 999 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, justifyContent: 'space-between' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: '#1A1A1A', fontSize: 20 },
  hello: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  userName: { color: 'white', fontSize: 18, fontWeight: '700', maxWidth: 180 },
  compactBar: { position: 'absolute', bottom: 10, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compactTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  compactChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  compactChipText: { marginLeft: 6, fontWeight: '800', color: '#1A1A1A', fontSize: 12 },

  // Conteúdo padrão
  kpiWrap: { paddingHorizontal: 16, marginTop: 12 },
  kpiRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  kpiCard: { flexGrow: 1, flexBasis: '30%', backgroundColor: Colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.border },
  kpiLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  kpiSuffix: { fontSize: 12, color: Colors.textMuted },
  deltaInline: { marginTop: 4, fontSize: 12 },

  dualCard: { marginTop: 12, marginHorizontal: 16, padding: 12, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row' },
  dualBlock: { flex: 1, paddingHorizontal: 8 },
  dualTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  dualValue: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  dualSub: { color: Colors.textMuted, marginTop: 4 },
  sep: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },

  mainCard: { marginTop: 12, marginHorizontal: 16, padding: 12, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  mainTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginVertical: 12, fontStyle: 'italic' },
  loadingCard: { minHeight: 96, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginHorizontal: 0, gap: 6 },

  // ===== Tabela =====
  tableCard: { marginTop: 12, marginHorizontal: 16, padding: 10, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  groupTabs: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  tabBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: '#F7F7F7' },
  tabBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  tabText: { fontWeight: '700', color: Colors.text, fontSize: 12 },
  tabTextActive: { color: '#1A1A1A' },

  trow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: Colors.border },
  thead: { backgroundColor: '#F7F7F7', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  trowEven: { backgroundColor: '#FFFFFF' },
  trowOdd: { backgroundColor: '#FAFAFA' },
  tcell: { paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center' },
  tcellDate: { width: 96 },
  tcellMetric: { minWidth: 92, alignItems: 'center', flexGrow: 1 },
  tcellSticky: { backgroundColor: '#F7F7F7', borderRightWidth: 1, borderRightColor: Colors.border },
  tcellText: { color: Colors.text, fontSize: 12 },
  theadText: { fontWeight: '800', color: Colors.text },
  headCellWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  valRight: { textAlign: 'right', minWidth: 40 },

  tableFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  pagerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 },
  pillBtn: { padding: 4, borderRadius: 8 },
  pillBtnDisabled: { opacity: 0.5 },
  pillText: { fontSize: 11, fontWeight: '800', color: '#1A1A1A', marginHorizontal: 4 },

  tableLegend: { color: Colors.textMuted, fontSize: 11, marginTop: 8 },

  errorBox: { marginTop: 12, marginHorizontal: 16, backgroundColor: '#FFF6F7', borderColor: '#FECAD5', borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  errorText: { color: Colors.text, marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 10, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  retryText: { color: 'white', fontWeight: '700' },

  metricChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  metricChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  metricChipText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  metricChipTextActive: { color: '#1A1A1A' },
});
