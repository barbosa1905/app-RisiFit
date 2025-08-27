// screens/User/HistoricoScreen.js
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert,
  Platform, Dimensions, RefreshControl, SafeAreaView, TouchableOpacity,
  TextInput, Share, Modal, TouchableWithoutFeedback
} from 'react-native';
import { format, parseISO, isValid, isPast, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { PieChart } from 'react-native-chart-kit';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../services/firebaseConfig';
import { getUserIdLoggedIn } from '../../services/authService';
import { buscarTodosTreinosDoUser } from '../../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign, Feather } from '@expo/vector-icons';
import Animated, { Layout, FadeIn, FadeOut } from 'react-native-reanimated';

const W = Dimensions.get('window').width;
const SP = 12;                 // spacing exterior (reduzido)
const RADIUS = 14;
const HEADER_H = Platform.OS === 'android' ? 104 : 92;
const CARD_PADDING = 12;       // padding interno do card (reduzido)
const CARD_W = W - SP * 2;     // largura total do card
const CONTENT_W = CARD_W - CARD_PADDING * 2; // largura útil
const DONUT_SIZE = Math.min(CONTENT_W, 150);

// utils
const toDate = (v) => {
  try {
    if (!v) return null;
    if (v?.toDate) return v.toDate();
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
      const d = parseISO(v);
      return isValid(d) ? d : new Date(v);
    }
    return null;
  } catch { return null; }
};
const fmtDuration = (totalSeg) => {
  if (typeof totalSeg !== 'number' || isNaN(totalSeg) || totalSeg < 0) return '—';
  const h = Math.floor(totalSeg / 3600);
  const m = Math.floor((totalSeg % 3600) / 60);
  const s = Math.floor(totalSeg % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};
const lastNDays = (n = 30) => {
  const today = new Date();
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    d.setHours(12, 0, 0, 0);
    return d;
  });
};

export default function HistoricoScreen() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // header user
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  // filtros
  const [filtroMes, setFiltroMes] = useState('');         // yyyy-MM
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'done' | 'missed'
  const [search, setSearch] = useState('');

  // UI
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'timeline'
  const [expandedMonths, setExpandedMonths] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const scrollRef = useRef(null);

  const getTreinosConcluidosMap = useCallback(async () => {
    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) return {};
      const raw = await AsyncStorage.getItem(`treinosConcluidos_${userId}`);
      const parsed = raw ? JSON.parse(raw) : {};
      const map = {};
      Object.keys(parsed).forEach((tid) => {
        const it = parsed[tid];
        map[tid] = {
          completed: !!it?.completed,
          duration: Number(it?.duration) || 0,
          completionDate: it?.completionDate || null,
        };
      });
      return map;
    } catch { return {}; }
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      // Header user
      const db = getFirestore();
      if (auth.currentUser) {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const data = snap.data() || {};
          const n = data.name || 'Utilizador';
          setUserName(n);
          setUserInitial(n?.charAt(0).toUpperCase() || 'U');
        } else {
          setUserName('Utilizador');
          setUserInitial('U');
        }
      }

      const userId = await getUserIdLoggedIn();
      if (!userId) {
        Alert.alert('Erro', 'Utilizador não autenticado.');
        setHistorico([]);
        return;
      }

      const all = await buscarTodosTreinosDoUser(userId);
      const concluidoMap = await getTreinosConcluidosMap();

      const now = new Date();
      const lista = [];
      all.forEach((treino) => {
        const dtAgendada = toDate(treino?.data);
        if (!dtAgendada) return;

        if (isPast(dtAgendada) || (isToday(dtAgendada) && dtAgendada < now)) {
          const comp = concluidoMap[treino.id];
          const done = !!comp?.completed;
          const dataConclusao = toDate(comp?.completionDate) || dtAgendada;

          lista.push({
            id: treino.id,
            nome: treino.nome || treino.nomeTreino || 'Treino',
            categoria: treino.categoria || '—',
            descricao: treino.descricao || '',
            dataAgendada: treino.data,
            dataConclusao: dataConclusao?.toISOString(),
            duracaoSegundos: done ? comp?.duration || 0 : 0,
            status: done ? 'concluido' : 'perdido',
            exercicios: treino.templateExercises || treino.customExercises || [],
          });
        }
      });

      lista.sort((a, b) => {
        const ad = toDate(a.dataConclusao)?.getTime() || 0;
        const bd = toDate(b.dataConclusao)?.getTime() || 0;
        return bd - ad;
      });
      setHistorico(lista);
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível carregar o histórico.');
    } finally { setLoading(false); }
  }, [getTreinosConcluidosMap]);

  useEffect(() => { carregar(); }, [carregar]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await carregar(); } finally { setRefreshing(false); }
  }, [carregar]);

  // filtros + pesquisa
  const mesesDisponiveis = useMemo(
    () => [...new Set(historico.map((t) => format(toDate(t.dataConclusao) || new Date(), 'yyyy-MM')))]
      .sort((a, b) => new Date(a) - new Date(b)),
    [historico]
  );
  const categoriasDisponiveis = useMemo(
    () => [...new Set(historico.map((t) => t.categoria).filter(Boolean))].sort(),
    [historico]
  );

  const isWithinSelectedMonth = useCallback((dateISO) => {
    if (!filtroMes) return true;
    const d = toDate(dateISO);
    if (!d) return false;
    const from = startOfMonth(parseISO(`${filtroMes}-01`));
    const to = endOfMonth(parseISO(`${filtroMes}-01`));
    return d >= from && d <= to;
  }, [filtroMes]);

  const historicoFiltrado = useMemo(() => {
    const s = search.trim().toLowerCase();
    return historico.filter((t) => {
      if (!isWithinSelectedMonth(t.dataConclusao)) return false;
      const okCat = !filtroCategoria || String(t.categoria || '').toLowerCase() === filtroCategoria.toLowerCase();
      if (!okCat) return false;
      if (statusFilter === 'done' && t.status !== 'concluido') return false;
      if (statusFilter === 'missed' && t.status !== 'perdido') return false;
      const okSearch =
        !s ||
        String(t.nome || '').toLowerCase().includes(s) ||
        String(t.categoria || '').toLowerCase().includes(s) ||
        String(t.descricao || '').toLowerCase().includes(s);
      return okSearch;
    });
  }, [historico, filtroCategoria, search, statusFilter, isWithinSelectedMonth]);

  // métricas
  const totalConcluidos = useMemo(
    () => historicoFiltrado.filter((t) => t.status === 'concluido').length,
    [historicoFiltrado]
  );
  const totalPerdidos  = useMemo(
    () => historicoFiltrado.filter((t) => t.status === 'perdido').length,
    [historicoFiltrado]
  );
  const total          = totalConcluidos + totalPerdidos;
  const taxaConclusao  = total > 0 ? Math.round((totalConcluidos / total) * 100) : 0;
  const tempoTotalConcluido = useMemo(() => {
    let tot = 0;
    historicoFiltrado.forEach((t) => { if (t.status === 'concluido') tot += Number(t.duracaoSegundos) || 0; });
    return fmtDuration(tot);
  }, [historicoFiltrado]);

  // streak helpers
  const days = useMemo(() => lastNDays(30), []);
  const setByDay = useMemo(() => {
    const map = new Map();
    historico.forEach((t) => {
      const d = toDate(t.dataConclusao);
      if (!d) return;
      const key = d.toDateString();
      const done = t.status === 'concluido';
      map.set(key, map.get(key) ? map.get(key) || done : done);
    });
    return map;
  }, [historico]);

  // partilhar
  const onShare = useCallback(async () => {
    try {
      const msg = `Resumo RisiFit\n\nTaxa de conclusão: ${taxaConclusao}%\nTreinos concluídos: ${totalConcluidos}\nPerdidos: ${totalPerdidos}\nTempo acumulado: ${tempoTotalConcluido}`;
      await Share.share({ message: msg });
    } catch {}
  }, [taxaConclusao, totalConcluidos, totalPerdidos, tempoTotalConcluido]);

  // timeline agrupada
  const timelineByMonth = useMemo(() => {
    const map = new Map();
    historicoFiltrado.forEach((t) => {
      const d = toDate(t.dataConclusao) || new Date();
      const key = format(d, 'yyyy-MM');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => {
        const ad = toDate(a.dataConclusao)?.getTime() || 0;
        const bd = toDate(b.dataConclusao)?.getTime() || 0;
        return bd - ad;
      })
    );
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [historicoFiltrado]);

  // chart data
  const chartData = useMemo(() => ([
    { name: 'Concluídos', population: totalConcluidos, color: '#4CAF50', legendFontColor: Colors.textPrimary, legendFontSize: 14 },
    { name: 'Perdidos',   population: totalPerdidos,  color: '#FF5252', legendFontColor: Colors.textPrimary, legendFontSize: 14 },
  ]), [totalConcluidos, totalPerdidos]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFiltroMes('');
    setFiltroCategoria('');
    setStatusFilter('all');
  }, []);

  const onScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y || 0;
    setShowScrollTop(y > 320);
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  return (
    <SafeAreaView style={st.screen}>
      {/* HEADER */}
      <LinearGradient
        colors={[Colors.primary, '#3A506B']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={st.header}
      >
        <View style={st.headerLeft}>
          <View style={st.avatar}>
            <Text style={st.avatarTxt}>{userInitial || 'U'}</Text>
          </View>
          <View>
            <Text style={st.hello}>Olá</Text>
            <Text style={st.name}>{userName || 'Utilizador'}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={onShare} style={st.shareBtn} activeOpacity={0.85}>
          <Feather name="share-2" size={18} color={Colors.onPrimary} />
          <Text style={st.shareTxt}>Partilhar</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingHorizontal: SP, paddingTop: HEADER_H + SP, paddingBottom: SP * 2.25 }}
        refreshControl={
          <RefreshControl
            colors={[Colors.secondary]}
            tintColor={Colors.secondary}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Título + segmented + SEARCH numa única linha (mais compacto) */}
        <View style={st.compactTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={st.title}>Histórico</Text>
            <View style={st.segmentWrap}>
              <TouchableOpacity
                onPress={() => setViewMode('overview')}
                style={[st.segmentBtn, viewMode === 'overview' && st.segmentActive]}
                activeOpacity={0.95}
              >
                <Feather name="pie-chart" size={14} color={viewMode === 'overview' ? Colors.onSecondary : Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode('timeline')}
                style={[st.segmentBtn, viewMode === 'timeline' && st.segmentActive]}
                activeOpacity={0.95}
              >
                <Feather name="list" size={14} color={viewMode === 'timeline' ? Colors.onSecondary : Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={st.searchBarMini}>
            <Feather name="search" size={16} color={Colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar…"
              placeholderTextColor={Colors.textSecondary}
              style={st.searchInputMini}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* TOOLBAR compacta — tudo numa LINHA */}
        <View style={st.toolbar}>
          {/* Estado: all / done / missed (ícones) */}
          <View style={st.stateToggle}>
            <TouchableOpacity
              onPress={() => setStatusFilter('all')}
              style={[st.stateBtn, statusFilter === 'all' && st.stateBtnActive]}
            >
              <Feather name="grid" size={14} color={statusFilter === 'all' ? Colors.onSecondary : Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatusFilter('done')}
              style={[st.stateBtn, statusFilter === 'done' && st.stateBtnActive]}
            >
              <Feather name="check-circle" size={14} color={statusFilter === 'done' ? Colors.onSecondary : '#1E7E34'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStatusFilter('missed')}
              style={[st.stateBtn, statusFilter === 'missed' && st.stateBtnActive]}
            >
              <Feather name="x-circle" size={14} color={statusFilter === 'missed' ? Colors.onSecondary : '#C62828'} />
            </TouchableOpacity>
          </View>

          {/* Mês (compacto) */}
          <TouchableOpacity
            onPress={() => setFiltroMes(format(new Date(), 'yyyy-MM'))}
            style={st.compactChip}
          >
            <AntDesign name="calendar" size={13} color={Colors.onSecondary} />
            <Text style={st.compactChipTxt}>
              {filtroMes ? format(parseISO(filtroMes + '-01'), 'MMM', { locale: pt }) : 'Mês'}
            </Text>
          </TouchableOpacity>

          {/* Categoria (compacto) */}
          <TouchableOpacity
            onPress={() => setFiltersModalOpen(true)}
            style={[st.compactChip, { paddingHorizontal: 10 }]}
          >
            <AntDesign name="appstore-o" size={13} color={Colors.onSecondary} />
            <Text numberOfLines={1} style={[st.compactChipTxt, { maxWidth: 80 }]}>
              {filtroCategoria || 'Categoria'}
            </Text>
          </TouchableOpacity>

          {/* Limpar */}
          <TouchableOpacity onPress={clearFilters} style={st.iconBtn}>
            <Feather name="rotate-ccw" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Mais filtros (abre modal) */}
          <TouchableOpacity onPress={() => setFiltersModalOpen(true)} style={st.iconBtn}>
            <Feather name="sliders" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Overview */}
        {viewMode === 'overview' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout.springify()}>
            {loading ? (
              <View style={st.loadingBox}>
                <ActivityIndicator size="large" color={Colors.secondary} />
                <Text style={st.loadingTxt}>A carregar…</Text>
              </View>
            ) : (
              <>
                {/* Donut centrado */}
                <View style={st.card}>
                  <Text style={st.cardTitle}>Taxa de conclusão</Text>

                  <View style={st.donutWrap}>
                    <PieChart
                      data={[
                        { name: 'Concluídos', population: totalConcluidos, color: '#4CAF50', legendFontColor: Colors.textPrimary, legendFontSize: 14 },
                        { name: 'Perdidos',   population: totalPerdidos,  color: '#FF5252', legendFontColor: Colors.textPrimary, legendFontSize: 14 },
                      ]}
                      width={CONTENT_W}
                      height={DONUT_SIZE}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft={`${(CONTENT_W - DONUT_SIZE) / 2}`}
                      absolute
                      hasLegend={false}
                      style={{ alignSelf: 'stretch' }}
                      chartConfig={{
                        backgroundColor: Colors.cardBackground,
                        backgroundGradientFrom: Colors.cardBackground,
                        backgroundGradientTo: Colors.cardBackground,
                        color: () => Colors.textPrimary,
                        labelColor: () => Colors.textPrimary,
                        decimalPlaces: 0,
                      }}
                    />
                    <View style={st.donutCenter}>
                      <Text style={st.donutPercent}>{total > 0 ? Math.round((totalConcluidos / total) * 100) : 0}%</Text>
                      <Text style={st.donutSub}>({totalConcluidos}/{total || 0})</Text>
                    </View>
                  </View>

                  <View style={st.legendWrap}>
                    <View style={st.legendRow}>
                      <View style={[st.legendDot, { backgroundColor: '#4CAF50' }]} />
                      <Text style={st.legendTxt}>Concluídos</Text>
                    </View>
                    <View style={st.legendRow}>
                      <View style={[st.legendDot, { backgroundColor: '#FF5252' }]} />
                      <Text style={st.legendTxt}>Perdidos</Text>
                    </View>
                  </View>
                </View>

                {/* KPIs */}
                <View style={st.kpisRow}>
                  <View style={st.kpi}>
                    <Text style={st.kpiLabel}>Concluídos</Text>
                    <Text style={st.kpiVal}>{totalConcluidos}</Text>
                  </View>
                  <View style={st.kpi}>
                    <Text style={st.kpiLabel}>Tempo acumulado</Text>
                    <Text style={st.kpiVal}>{tempoTotalConcluido}</Text>
                  </View>
                  <View style={st.kpi}>
                    <Text style={st.kpiLabel}>Perdidos</Text>
                    <Text style={[st.kpiVal, { color: '#FF5252' }]}>{totalPerdidos}</Text>
                  </View>
                </View>

                {/* Streak 30 dias */}
                <View style={st.card}>
                  <View style={st.cardHeader}>
                    <Text style={st.cardTitle}>Streak • últimos 30 dias</Text>
                    <Text style={st.cardHint}>Verde: concluído • Vermelho: perdido • Cinza: sem treino</Text>
                  </View>
                  <View style={st.streakGrid}>
                    {lastNDays(30).map((d, idx) => {
                      const key = d.toDateString();
                      const concluded = setByDay.get(key) === true;
                      const hadAny = historico.some((t) => {
                        const td = toDate(t.dataConclusao);
                        return td && td.toDateString() === key;
                      });
                      const bg = concluded ? '#4CAF50' : hadAny ? '#FF5252' : '#D9DEE5';
                      return <View key={idx} style={[st.streakDot, { backgroundColor: bg }]} />;
                    })}
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        ) : null}

        {/* Timeline */}
        {viewMode === 'timeline' ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout.springify()}>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.secondary} style={{ marginTop: SP }} />
            ) : historicoFiltrado.length === 0 ? (
              <View style={st.emptyBox}>
                <Text style={st.emptyTitle}>Sem resultados</Text>
                <Text style={st.emptyDesc}>Tenta ajustar os filtros ou a pesquisa.</Text>
              </View>
            ) : (
              timelineByMonth.map(([monthKey, items]) => {
                const monthTitle = format(parseISO(monthKey + '-01'), 'MMMM yyyy', { locale: pt });
                const expanded = expandedMonths[monthKey] ?? true;
                const concl = items.filter((i) => i.status === 'concluido').length;
                const perd = items.length - concl;

                return (
                  <View key={monthKey} style={{ marginBottom: SP }}>
                    <TouchableOpacity
                      onPress={() => setExpandedMonths((p) => ({ ...p, [monthKey]: !expanded }))}
                      style={st.monthHeader}
                      activeOpacity={0.9}
                    >
                      <Text style={st.monthTitle}>{monthTitle}</Text>
                      <View style={st.monthStats}>
                        <View style={[st.badge, { backgroundColor: '#E9F7EF' }]}>
                          <Text style={[st.badgeTxt, { color: '#1E7E34' }]}>✓ {concl}</Text>
                        </View>
                        <View style={[st.badge, { backgroundColor: '#FDECEA', marginLeft: 8 }]}>
                          <Text style={[st.badgeTxt, { color: '#C62828' }]}>✗ {perd}</Text>
                        </View>
                        <AntDesign
                          name={expanded ? 'up' : 'down'}
                          size={16}
                          color={Colors.textSecondary}
                          style={{ marginLeft: 10 }}
                        />
                      </View>
                    </TouchableOpacity>

                    {expanded ? (
                      <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout.springify()}>
                        {items.map((t, idx) => {
                          const isConcluido = t.status === 'concluido';
                          const dotColor = isConcluido ? '#4CAF50' : '#FF5252';
                          return (
                            <View key={t.id} style={st.timelineRow}>
                              <View style={st.timelineCol}>
                                <View style={[st.timelineDot, { backgroundColor: dotColor }]} />
                                {idx !== items.length - 1 && <View style={st.timelineLine} />}
                              </View>
                              <View style={[st.itemCard, { borderLeftColor: dotColor }]}>
                                <View style={st.itemHeader}>
                                  <Text style={st.itemDate}>
                                    {format(toDate(t.dataConclusao) || new Date(), 'dd MMM yyyy • HH:mm', { locale: pt })}
                                  </Text>
                                  <View style={[st.badge, { backgroundColor: isConcluido ? '#E9F7EF' : '#FDECEA' }]}>
                                    <Text style={[st.badgeTxt, { color: isConcluido ? '#1E7E34' : '#C62828' }]}>
                                      {isConcluido ? 'Concluído' : 'Perdido'}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={st.itemTitle}>{t.nome || 'Treino'}</Text>
                                <Text style={st.itemSubtitle}>Categoria: {t.categoria || '—'}</Text>
                                {t.descricao ? <Text style={st.itemDesc}>{t.descricao}</Text> : null}
                                {isConcluido ? (
                                  <Text style={st.itemDuration}>Duração: {fmtDuration(t.duracaoSegundos)}</Text>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </Animated.View>
                    ) : null}
                  </View>
                );
              })
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Scroll to top */}
      {showScrollTop ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={scrollToTop}
          style={st.fab}
        >
          <AntDesign name="arrowup" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      ) : null}

      {/* MODAL de filtros detalhados — ocupa zero espaço fora daqui */}
      <Modal
        visible={filtersModalOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setFiltersModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFiltersModalOpen(false)}>
          <View style={st.modalOverlay} />
        </TouchableWithoutFeedback>

        <View style={st.modalSheet}>
          <View style={st.sheetHeader}>
            <Text style={st.sheetTitle}>Filtros</Text>
            <TouchableOpacity onPress={() => setFiltersModalOpen(false)}>
              <Feather name="x" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={st.sheetSection}>Mês</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', columnGap: 8 }}>
              <TouchableOpacity onPress={() => setFiltroMes('')} style={[st.chip, filtroMes === '' && st.chipActive]}>
                <AntDesign
                  name="calendar"
                  size={14}
                  color={filtroMes === '' ? Colors.onSecondary : Colors.textSecondary}
                />
                <Text style={[st.chipTxt, filtroMes === '' && st.chipTxtActive]}>Todos</Text>
              </TouchableOpacity>
              {mesesDisponiveis.map((m) => (
                <TouchableOpacity key={m} onPress={() => setFiltroMes(m)} style={[st.chip, filtroMes === m && st.chipActive]}>
                  <AntDesign
                    name="calendar"
                    size={14}
                    color={filtroMes === m ? Colors.onSecondary : Colors.textSecondary}
                  />
                  <Text style={[st.chipTxt, filtroMes === m && st.chipTxtActive]}>
                    {format(parseISO(m + '-01'), 'MMM yyyy', { locale: pt })}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={[st.sheetSection, { marginTop: 12 }]}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', columnGap: 8 }}>
              <TouchableOpacity onPress={() => setFiltroCategoria('')} style={[st.chip, filtroCategoria === '' && st.chipActive]}>
                <AntDesign name="appstore-o" size={14} color={filtroCategoria === '' ? Colors.onSecondary : Colors.textSecondary} />
                <Text style={[st.chipTxt, filtroCategoria === '' && st.chipTxtActive]}>Todas</Text>
              </TouchableOpacity>
              {categoriasDisponiveis.map((c) => (
                <TouchableOpacity key={c} onPress={() => setFiltroCategoria(c)} style={[st.chip, filtroCategoria === c && st.chipActive]}>
                  <AntDesign name="appstore-o" size={14} color={filtroCategoria === c ? Colors.onSecondary : Colors.textSecondary} />
                  <Text style={[st.chipTxt, filtroCategoria === c && st.chipTxtActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={st.sheetFooter}>
            <TouchableOpacity onPress={clearFilters} style={[st.sheetBtn, { backgroundColor: '#E9EDF2' }]}>
              <Feather name="rotate-ccw" size={16} color={Colors.textSecondary} />
              <Text style={[st.sheetBtnTxt, { color: Colors.textSecondary }]}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFiltersModalOpen(false)} style={[st.sheetBtn, { backgroundColor: Colors.secondary }]}>
              <Feather name="check" size={16} color={Colors.onSecondary} />
              <Text style={[st.sheetBtnTxt, { color: Colors.onSecondary }]}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
    paddingHorizontal: SP, paddingTop: Platform.OS === 'android' ? 10 : 8,
    borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: Colors.secondary, fontSize: 17, fontWeight: '800' },
  hello: { color: Colors.onPrimary, opacity: 0.85, fontSize: 11, marginBottom: 1 },
  name: { color: Colors.onPrimary, fontSize: 15, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  shareTxt: { color: Colors.onPrimary, marginLeft: 6, fontWeight: '700', fontSize: 12 },

  compactTopRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginRight: 8 },
  segmentWrap: { flexDirection: 'row', backgroundColor: '#EEF2F6', borderRadius: 999, padding: 2, borderWidth: 1, borderColor: Colors.divider, marginLeft: 2 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  segmentActive: { backgroundColor: Colors.secondary },
  searchBarMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 999, paddingHorizontal: 10, height: 36, borderWidth: 1, borderColor: Colors.divider, flex: 1 },
  searchInputMini: { flex: 1, color: Colors.textPrimary, paddingHorizontal: 6, fontSize: 13 },

  // TOOLBAR ultracompacta (uma única linha)
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  stateToggle: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 999, padding: 2,
  },
  stateBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  stateBtnActive: { backgroundColor: Colors.secondary },

  compactChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  compactChipTxt: { color: Colors.onSecondary, fontWeight: '800', fontSize: 12 },

  iconBtn: {
    height: 32, width: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
  },

  loadingBox: { paddingVertical: 20, alignItems: 'center' },
  loadingTxt: { marginTop: 6, color: Colors.textSecondary, fontSize: 12 },

  card: { backgroundColor: Colors.surface, borderRadius: RADIUS, borderWidth: 1, borderColor: Colors.divider, padding: CARD_PADDING, marginBottom: SP },
  cardHeader: { marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  cardHint: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  donutWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  donutPercent: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center' },
  donutSub: { color: Colors.textSecondary, fontWeight: '700', marginTop: 2, textAlign: 'center', fontSize: 12 },
  legendWrap: { marginTop: 8, flexDirection: 'row', columnGap: 14, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendTxt: { color: Colors.textSecondary, fontWeight: '600', fontSize: 12 },

  kpisRow: { flexDirection: 'row', columnGap: 10, marginBottom: SP },
  kpi: { flex: 1, backgroundColor: Colors.surface, borderRadius: RADIUS, borderWidth: 1, borderColor: Colors.divider, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  kpiLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4 },
  kpiVal: { color: Colors.textPrimary, fontSize: 18, fontWeight: '900' },

  streakGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  streakDot: { width: (W - SP * 2 - 8 * 9) / 10, height: 12, borderRadius: 4 },

  monthHeader: { backgroundColor: Colors.surface, borderRadius: RADIUS, borderWidth: 1, borderColor: Colors.divider, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  monthStats: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 12 },
  timelineCol: { width: 20, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.divider, marginTop: 4, marginBottom: 8 },
  itemCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: RADIUS, borderLeftWidth: 5, borderWidth: 1, borderColor: Colors.divider, padding: 12 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDate: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  itemTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  itemSubtitle: { color: Colors.textSecondary, marginTop: 2, fontSize: 12 },
  itemDesc: { color: Colors.textSecondary, marginTop: 6, lineHeight: 18, fontSize: 13 },
  itemDuration: { color: Colors.textPrimary, fontWeight: '700', marginTop: 8, fontSize: 13 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: Colors.secondary,
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 14, paddingBottom: 18,
    borderTopWidth: 1, borderColor: Colors.divider,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sheetSection: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, marginBottom: 6 },

  chip: { flexDirection: 'row', alignItems: 'center', columnGap: 6, backgroundColor: '#EEF2F6', borderWidth: 1, borderColor: Colors.divider, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  chipTxt: { color: Colors.textSecondary, fontWeight: '700' },
  chipTxtActive: { color: Colors.onSecondary },

  sheetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  sheetBtn: { flexDirection: 'row', alignItems: 'center', columnGap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  sheetBtnTxt: { fontWeight: '800' },
});
