// screens/User/ProgressoScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, StatusBar, Animated, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Svg, Circle } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

import { auth, db } from '../../services/firebaseConfig';
import { usePreferences } from '../../contexts/PreferencesContext';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';

const Colors = {
  primary: '#2A3B47',
  primaryLight: '#3A506B',
  secondary: '#FFB800',
  background: '#F0F2F5',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E6E8EB',
  success: '#22C55E',
  danger: '#EF4444',
};

const { width: W } = Dimensions.get('window');

// ==== Helpers ====
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
  } catch {
    return null;
  }
};
const fmtDate = (date) => (date ? new Date(date).toLocaleDateString() : '—');
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const mapRoot = (raw) => {
  const outros = raw.outrosParametros || {};
  const per = raw.perimetros || raw.perimetrosCorporais || {};
  return {
    data:
      normalizeDate(raw.dataAvaliacao) ||
      normalizeDate(raw.data) ||
      normalizeDate(raw.createdAt) ||
      normalizeDate(raw.criadoEm),

    peso: safeToNumber(raw.peso ?? outros.peso),
    altura: safeToNumber(raw.altura ?? outros.altura),
    imc: safeToNumber(raw.imc ?? outros.imc),
    gorduraCorporal: safeToNumber(outros.gorduraCorporal ?? raw.gorduraCorporal),
    musculatura: safeToNumber(outros.musculatura ?? raw.musculatura),

    cintura: safeToNumber(per.cintura ?? raw.cintura),
    quadril: safeToNumber(per.quadril ?? raw.quadril),
    braco: safeToNumber(per.braco ?? raw.braco ?? per.bracoDireito),
    coxa: safeToNumber(per.coxa ?? raw.coxa),
    panturrilha: safeToNumber(per.panturrilha ?? raw.panturrilha),
    peito: safeToNumber(per.peito ?? raw.peito),
  };
};
const mapSub = (raw) => ({
  data:
    normalizeDate(raw.data) ||
    normalizeDate(raw.dataAvaliacao) ||
    normalizeDate(raw.createdAt) ||
    normalizeDate(raw.criadoEm),

  peso: safeToNumber(raw.peso),
  altura: safeToNumber(raw.altura),
  imc: safeToNumber(raw.imc),
  gorduraCorporal: safeToNumber(raw.gorduraCorporal ?? raw.gordura),
  musculatura: safeToNumber(raw.musculatura),

  cintura: safeToNumber(raw.cintura),
  quadril: safeToNumber(raw.quadril),
  braco: safeToNumber(raw.braco),
  coxa: safeToNumber(raw.coxa),
  panturrilha: safeToNumber(raw.panturrilha),
  peito: safeToNumber(raw.peito),
});

// ==== Ring ====
function Ring({ size = 116, stroke = 12, percent = 0, color = Colors.secondary, label, value, suffix }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E6E8EB" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700' }}>{label}</Text>
        <Text style={{ fontSize: 20, color: '#fff', fontWeight: '800' }}>
          {value}{suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
    </View>
  );
}

// ==== Screen ====
export default function ProgressoScreen() {
  const { prefs } = (usePreferences?.() || {});
  const units = prefs?.units || 'metric';
  const weightSuffix = units === 'imperial' ? 'lb' : 'kg';

  // Header animado sem absolute — sem sobreposições
  const HEADER_MAX = 260;
  const HEADER_MIN = 120;
  const COLLAPSE = HEADER_MAX - HEADER_MIN;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: 'clamp',
  });
  const headerScaleRing = scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [1, 0.75],
    extrapolate: 'clamp',
  });
  const headerFadeBig = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const headerFadeCompact = scrollY.interpolate({
    inputRange: [0, 60, 120],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('U');

  const [range, setRange] = useState('ALL');
  const metricCatalog = useMemo(
    () => [
      { key: 'peso', label: 'Peso', suffix: weightSuffix, decimals: 1, icon: 'activity' },
      { key: 'gorduraCorporal', label: 'Gordura %', suffix: '%', decimals: 1, icon: 'percent' },
      { key: 'imc', label: 'IMC', suffix: '', decimals: 1, icon: 'trending-up' },
      { key: 'musculatura', label: 'Massa %', suffix: '%', decimals: 1, icon: 'bar-chart-2' },
      { key: 'cintura', label: 'Cintura', suffix: 'cm', decimals: 1, icon: 'maximize' },
      { key: 'quadril', label: 'Quadril', suffix: 'cm', decimals: 1, icon: 'maximize' },
    ],
    [weightSuffix]
  );
  const [selectedMetric, setSelectedMetric] = useState(() => metricCatalog[0]);

  const convertWeightIfNeeded = useCallback(
    (val, key) => {
      const n = safeToNumber(val);
      if (n === undefined) return undefined;
      if (key === 'peso' && units === 'imperial') return n * 2.2046226218;
      return n;
    },
    [units]
  );

  const loadData = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setRows([]);
        setLoading(false);
        return;
      }
      // Nome
      try {
        const us = await getDoc(doc(db, 'users', uid));
        if (us.exists()) {
          const d = us.data() || {};
          const nome = d.name || d.nome || '';
          setUserName(nome);
          setUserInitial(nome?.trim()?.charAt(0)?.toUpperCase() || 'U');
        }
      } catch {}

      // Subcoleção
      let list = [];
      const subRef = collection(db, 'users', uid, 'avaliacoes');
      const subSnap = await getDocs(subRef);
      subSnap.forEach((docu) => list.push({ id: docu.id, ...mapSub(docu.data() || {}) }));

      // Fallback root
      if (!list.length) {
        const rootRef = collection(db, 'avaliacoesFisicas');
        const q = query(rootRef, where('clienteId', '==', uid));
        const rootSnap = await getDocs(q);
        rootSnap.forEach((docu) => list.push({ id: docu.id, ...mapRoot(docu.data() || {}) }));
      }

      setRows(
        list
          .filter((a) => a.data instanceof Date && !Number.isNaN(a.data))
          .sort((a, b) => a.data - b.data)
      );
    } catch (e) {
      console.error('Erro ao carregar progresso:', e);
      setError('Não foi possível carregar os dados de progresso.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!rows.length) return [];
    if (range === 'ALL') return rows;
    const now = new Date();
    const msRange = { '3M': 1000 * 60 * 60 * 24 * 90, '6M': 1000 * 60 * 60 * 24 * 180, '12M': 1000 * 60 * 60 * 24 * 365 }[range];
    return rows.filter((e) => now - e.data <= msRange);
  }, [rows, range]);

  const kpis = useMemo(() => {
    if (!filtered.length) return [];
    const last = filtered[filtered.length - 1];
    const prev = filtered.length > 1 ? filtered[filtered.length - 2] : null;
    const defs = [
      { key: 'peso', label: 'Peso', suffix: weightSuffix, decimals: 1 },
      { key: 'gorduraCorporal', label: 'Gordura', suffix: '%', decimals: 1 },
      { key: 'imc', label: 'IMC', suffix: '', decimals: 1 },
    ];
    return defs.map((d) => {
      const cur = convertWeightIfNeeded(last[d.key], d.key);
      const ant = prev ? convertWeightIfNeeded(prev[d.key], d.key) : undefined;
      const delta = cur !== undefined && ant !== undefined ? cur - ant : undefined;
      return { ...d, value: cur, delta };
    });
  }, [filtered, convertWeightIfNeeded, weightSuffix]);

  const mainChart = useMemo(() => {
    const arr = filtered
      .map((e) => ({
        x: fmtDate(e.data),
        y: convertWeightIfNeeded(e[selectedMetric.key], selectedMetric.key),
      }))
      .filter((p) => p.y !== undefined);

    const first = arr.length ? arr[0].y : undefined;
    const last = arr.length ? arr[arr.length - 1].y : undefined;
    const delta = first !== undefined && last !== undefined ? last - first : undefined;
    const percent = first && last !== undefined ? (first !== 0 ? (delta / first) * 100 : undefined) : undefined;

    return {
      labels: arr.map((v) => v.x),
      data: arr.map((v) => Number(v.y.toFixed(selectedMetric.decimals))),
      last,
      delta,
      percent,
    };
  }, [filtered, selectedMetric, convertWeightIfNeeded]);

  const monthlyBar = useMemo(() => {
    if (!filtered.length) return { labels: [], data: [] };
    const map = new Map();
    filtered.forEach((e) => {
      const y = convertWeightIfNeeded(e[selectedMetric.key], selectedMetric.key);
      if (y === undefined) return;
      const k = monthKey(e.data);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(y);
    });
    const entries = [...map.entries()].sort(([a], [b]) => (a > b ? 1 : -1)).slice(-6);
    const labels = entries.map(([k]) => {
      const [Y, M] = k.split('-');
      return `${M}/${String(Y).slice(2)}`;
    });
    const data = entries.map(([, arr]) =>
      Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(selectedMetric.decimals))
    );
    return { labels, data };
  }, [filtered, selectedMetric, convertWeightIfNeeded]);

  const ringInfo = useMemo(() => {
    const vals = filtered
      .map((e) => convertWeightIfNeeded(e[selectedMetric.key], selectedMetric.key))
      .filter((v) => v !== undefined);
    if (!vals.length) return { last: undefined, percent: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const last = vals[vals.length - 1];
    const percent = min === max ? 100 : ((last - min) / (max - min)) * 100;
    return { last, percent: Math.max(0, Math.min(100, percent)) };
  }, [filtered, selectedMetric, convertWeightIfNeeded]);

  const flatForExport = useMemo(
    () =>
      rows.map((r) => ({
        data: fmtDate(r.data),
        peso: convertWeightIfNeeded(r.peso, 'peso'),
        imc: r.imc,
        gordura: r.gorduraCorporal,
        musculatura: r.musculatura,
        cintura: r.cintura,
        quadril: r.quadril,
        braco: r.braco,
        coxa: r.coxa,
        peito: r.peito,
      })),
    [rows, convertWeightIfNeeded]
  );

  const exportCSV = useCallback(async () => {
    try {
      if (!flatForExport.length) return Alert.alert('Sem dados', 'Não há avaliações para exportar.');
      const headers = [
        'Data', `Peso (${weightSuffix})`, 'IMC', 'Gordura (%)', 'Massa (%)',
        'Cintura (cm)', 'Quadril (cm)', 'Braço (cm)', 'Coxa (cm)', 'Peito (cm)',
      ];
      const lines = flatForExport.map((r) =>
        [r.data, r.peso ?? '', r.imc ?? '', r.gordura ?? '', r.musculatura ?? '', r.cintura ?? '', r.quadril ?? '', r.braco ?? '', r.coxa ?? '', r.peito ?? ''].join(';')
      );
      const csv = [headers.join(';'), ...lines].join('\n');
      const fileUri = FileSystem.documentDirectory + `risifit_progresso_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
    } catch (e) {
      console.error('CSV error', e);
      Alert.alert('Erro', 'Não foi possível exportar o CSV.');
    }
  }, [flatForExport, weightSuffix]);

  const exportPDF = useCallback(async () => {
    try {
      if (!flatForExport.length) return Alert.alert('Sem dados', 'Não há avaliações para exportar.');
      const rowsHtml = flatForExport
        .map(
          (r) => `<tr>
            <td>${r.data}</td><td>${r.peso ?? '-'}</td><td>${r.imc ?? '-'}</td>
            <td>${r.gordura ?? '-'}</td><td>${r.musculatura ?? '-'}</td>
            <td>${r.cintura ?? '-'}</td><td>${r.quadril ?? '-'}</td>
            <td>${r.braco ?? '-'}</td><td>${r.coxa ?? '-'}</td><td>${r.peito ?? '-'}</td>
          </tr>`
        )
        .join('');
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
                <th>Data</th><th>Peso (${weightSuffix})</th><th>IMC</th><th>Gordura (%)</th><th>Massa (%)</th>
                <th>Cintura (cm)</th><th>Quadril (cm)</th><th>Braço (cm)</th><th>Coxa (cm)</th><th>Peito (cm)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
    } catch (e) {
      console.error('PDF error', e);
      Alert.alert('Erro', 'Não foi possível exportar o PDF.');
    }
  }, [flatForExport, userName, weightSuffix]);

  const hasData = filtered.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" />

      {/* HEADER EM FLUXO (sem absolute) */}
      <Animated.View style={[styles.headerWrap, { height: headerHeight }]}>
        <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.headerGradient}>
          {/* Top actions */}
          <View style={styles.headerTopRow}>
            <View style={styles.brandPill}>
              <Text style={styles.brandLeft}>RISI</Text>
              <Text style={styles.brandRight}>FIT</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={exportCSV} style={styles.actionIcon} activeOpacity={0.75}>
                <Feather name="file-text" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={exportPDF} style={styles.actionIcon} activeOpacity={0.75}>
                <Feather name="download" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Secção expandida */}
          <Animated.View style={{ opacity: headerFadeBig }}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <Text style={styles.hello}>Olá,</Text>
                <Text style={styles.userName} numberOfLines={1}>{userName || 'Utilizador'}</Text>
              </View>
              <Animated.View style={{ transform: [{ scale: headerScaleRing }] }}>
                <Ring
                  size={116}
                  stroke={12}
                  percent={hasData ? (ringInfo.percent ?? 0) : 0}
                  label={selectedMetric.label}
                  value={
                    hasData && ringInfo.last !== undefined
                      ? ringInfo.last.toFixed(selectedMetric.decimals)
                      : '—'
                  }
                  suffix={selectedMetric.suffix}
                />
              </Animated.View>
            </View>

            {/* Range chips */}
            <View style={styles.rangeRow}>
              {['3M', '6M', '12M', 'ALL'].map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRange(r)}
                  style={[styles.rangeChip, range === r && styles.rangeChipActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.rangeText, range === r && styles.rangeTextActive]}>
                    {r === 'ALL' ? 'Todos' : r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Barra compacta (quando colapsa) */}
          <Animated.View style={[styles.compactBar, { opacity: headerFadeCompact }]}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {selectedMetric.label} • {userName || 'Utilizador'}
            </Text>
            <View style={styles.compactChip}>
              <Feather name="trending-up" size={14} color="#1A1A1A" />
              <Text style={styles.compactChipText}>
                {hasData && ringInfo.last !== undefined
                  ? `${ringInfo.last.toFixed(selectedMetric.decimals)} ${selectedMetric.suffix}`
                  : '—'}
              </Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* CONTEÚDO — fica logo abaixo do header (sem paddingTop gigante) */}
      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.secondary]} />}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        {/* Chips de métricas */}
        <View style={{ paddingTop: 12 }}>
          <FlatList
            data={metricCatalog}
            horizontal
            keyExtractor={(i) => i.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item }) => {
              const active = selectedMetric.key === item.key;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedMetric(item)}
                  style={[styles.metricChip, active && styles.metricChipActive]}
                  activeOpacity={0.85}
                >
                  <Feather name={item.icon} size={14} color={active ? '#1A1A1A' : Colors.text} style={{ marginRight: 6 }} />
                  <Text style={[styles.metricChipText, active && styles.metricChipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* KPIs */}
        <View style={styles.kpiWrap}>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.secondary} />
            </View>
          ) : hasData ? (
            <View style={styles.kpiRow}>
              {[
                ...kpis,
              ].map((k) => (
                <View key={k.key} style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{k.label}</Text>
                  <Text style={styles.kpiValue}>
                    {k.value !== undefined ? k.value.toFixed(k.decimals) : '—'}
                    {!!k.suffix && <Text style={styles.kpiSuffix}> {k.suffix}</Text>}
                  </Text>
                  <Text
                    style={[
                      styles.deltaInline,
                      { color: typeof k.delta === 'number' ? (k.delta >= 0 ? Colors.danger : Colors.success) : Colors.textMuted },
                    ]}
                  >
                    {typeof k.delta === 'number'
                      ? `${k.delta >= 0 ? '+' : ''}${k.delta.toFixed(1)}${k.suffix ? ' ' + k.suffix : ''} vs. ant.`
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.loadingCard, { backgroundColor: '#fff' }]}>
              <Feather name="database" color={Colors.textMuted} size={18} />
              <Text style={{ color: Colors.textMuted, marginTop: 8, fontWeight: '600' }}>
                Sem dados ainda. Puxe para atualizar.
              </Text>
            </View>
          )}
        </View>

        {/* Resumo */}
        <View style={styles.dualCard}>
          <View style={styles.dualBlock}>
            <Text style={styles.dualTitle}>Desde o início</Text>
            <Text style={styles.dualValue}>
              {mainChart.delta !== undefined
                ? `${mainChart.delta >= 0 ? '+' : ''}${mainChart.delta.toFixed(selectedMetric.decimals)}${selectedMetric.suffix ? ' ' + selectedMetric.suffix : ''}`
                : '—'}
            </Text>
            <Text style={styles.dualSub}>
              {mainChart.percent !== undefined ? `${mainChart.percent >= 0 ? '+' : ''}${mainChart.percent.toFixed(1)}%` : '—'}
            </Text>
          </View>
          <View style={styles.sep} />
          <View style={styles.dualBlock}>
            <Text style={styles.dualTitle}>Valor atual</Text>
            <Text style={styles.dualValue}>
              {mainChart.last !== undefined
                ? `${Number(mainChart.last).toFixed(selectedMetric.decimals)}${selectedMetric.suffix ? ' ' + selectedMetric.suffix : ''}`
                : '—'}
            </Text>
            <Text style={styles.dualSub}>Métrica: {selectedMetric.label}</Text>
          </View>
        </View>

        {/* Gráfico principal */}
        <View style={styles.mainCard}>
          <Text style={styles.mainTitle}>Histórico • {selectedMetric.label}</Text>
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
            ) : mainChart.data?.length > 1 ? (
              <LineChart
                data={{ labels: mainChart.labels, datasets: [{ data: mainChart.data }] }}
                width={W - 32}
                height={240}
                yAxisSuffix={selectedMetric.suffix ? ` ${selectedMetric.suffix}` : ''}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: selectedMetric.decimals,
                  color: () => '#2A3B47',
                  labelColor: () => Colors.textMuted,
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
          <Text style={styles.mainTitle}>Média mensal ({selectedMetric.label})</Text>
          {monthlyBar.data.length ? (
            <BarChart
              data={{ labels: monthlyBar.labels, datasets: [{ data: monthlyBar.data }] }}
              width={W - 32}
              height={210}
              fromZero
              yAxisSuffix={selectedMetric.suffix ? ` ${selectedMetric.suffix}` : ''}
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                color: () => '#2A3B47',
                labelColor: () => Colors.textMuted,
                propsForBackgroundLines: { stroke: Colors.border, strokeDasharray: '3' },
                barPercentage: 0.5,
              }}
              style={{ borderRadius: 16 }}
            />
          ) : (
            <Text style={styles.emptyText}>Sem dados mensais suficientes.</Text>
          )}
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-triangle" size={18} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadData} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  headerWrap: {
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  brandLeft: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
  brandRight: { color: Colors.secondary, fontWeight: '800', letterSpacing: 1 },
  actionIcon: {
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 8,
    borderRadius: 999,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '800', color: '#1A1A1A', fontSize: 20 },
  hello: { color: '#D1D5DB', fontSize: 12 },
  userName: { color: 'white', fontSize: 18, fontWeight: '700', maxWidth: 180 },

  rangeRow: { flexDirection: 'row', marginTop: 14, gap: 8, alignSelf: 'center' },
  rangeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)',
  },
  rangeChipActive: { backgroundColor: '#fff' },
  rangeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rangeTextActive: { color: Colors.primary },

  compactBar: {
    position: 'absolute',
    bottom: 10, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  compactTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  compactChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  compactChipText: { marginLeft: 6, fontWeight: '800', color: '#1A1A1A', fontSize: 12 },

  // Content
  kpiWrap: { paddingHorizontal: 16, marginTop: 12 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  kpiLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: 4 },
  kpiSuffix: { fontSize: 12, color: Colors.textMuted },
  deltaInline: { marginTop: 4, fontSize: 12 },

  dualCard: {
    marginTop: 12, marginHorizontal: 16, padding: 12,
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row',
  },
  dualBlock: { flex: 1, paddingHorizontal: 8 },
  dualTitle: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  dualValue: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  dualSub: { color: Colors.textMuted, marginTop: 4 },
  sep: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },

  mainCard: {
    marginTop: 12, marginHorizontal: 16, padding: 12,
    backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  mainTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 8 },

  emptyText: { textAlign: 'center', color: Colors.textMuted, marginVertical: 12, fontStyle: 'italic' },

  loadingCard: {
    height: 96, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 0, gap: 6,
  },

  errorBox: {
    marginTop: 12, marginHorizontal: 16,
    backgroundColor: '#FFF6F7', borderColor: '#FECAD5', borderWidth: 1, borderRadius: 12, padding: 14,
    alignItems: 'center',
  },
  errorText: { color: Colors.text, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    marginTop: 10, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  retryText: { color: 'white', fontWeight: '700' },

  metricChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  metricChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  metricChipText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  metricChipTextActive: { color: '#1A1A1A' },
});
