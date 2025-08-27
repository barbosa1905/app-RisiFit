// screens/Admin/CompletedTrainingsHistoryScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import TrainingCard from '../../components/TrainingCard';

const PAGE_SIZE = 20;

/* Helpers */
const pad2 = (n) => String(n).padStart(2, '0');
const formatarDuracao = (secs) => {
  if (typeof secs !== 'number' || isNaN(secs) || secs < 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const out = [];
  if (h) out.push(`${h}h`);
  if (m || (!h && s)) out.push(`${String(m).padStart(2, '0')}m`);
  if (s || (!h && !m)) out.push(`${String(s).padStart(2, '0')}s`);
  return out.join(' ');
};
const groupByDay = (arr) => {
  const map = new Map();
  arr.forEach((t) => {
    const d = t.dataConclusao instanceof Date ? t.dataConclusao : (t.dataConclusao?.toDate?.() ?? null);
    const key = d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : 'Sem data';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
};

export default function CompletedTrainingsHistoryScreen() {
  const navigation = useNavigation();

  const [items, setItems] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [error, setError] = useState(null);

  const normalize = (docSnap) => {
    const d = docSnap.data() || {};
    return {
      id: docSnap.id,
      raw: d,
      nomeTreino: d.nomeTreino || d.name || 'Treino',
      dataConclusao: d.dataConclusao?.toDate?.() ?? null,
      duracao: d.duracao ?? d.duration ?? null,
      avaliacao: d.avaliacao ?? 0,
      observacoesUser: d.observacoesUser ?? '',
      clientName: d.clientName || d.cliente || 'Cliente',
    };
  };

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = collection(db, 'historicoTreinos');
      const q1 = query(base, orderBy('dataConclusao', 'desc'), limit(PAGE_SIZE));
      const snap = await getDocs(q1);
      const arr = snap.docs.map(normalize);
      setItems(arr);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await loadFirstPage(); } finally { setIsRefreshing(false); }
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || isPaginating) return;
    setIsPaginating(true);
    try {
      const base = collection(db, 'historicoTreinos');
      const qMore = query(base, orderBy('dataConclusao', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
      const snap = await getDocs(qMore);
      const arr = snap.docs.map(normalize);
      setItems((prev) => [...prev, ...arr]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar mais resultados.');
    } finally {
      setIsPaginating(false);
    }
  }, [lastDoc, isPaginating]);

  useFocusEffect(useCallback(() => { loadFirstPage(); }, [loadFirstPage]));

  const sections = useMemo(() => groupByDay(items), [items]);

  return (
    <View style={styles.safe}>
      <AppHeader
        title="Histórico de Treinos"
        rightContent={
          <TouchableOpacity onPress={onRefresh} style={styles.headerIconBtn} accessibilityLabel="Atualizar">
            <Ionicons name="refresh-outline" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTxt}>A carregar histórico…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={22} color={Colors.danger} />
          <Text style={styles.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={loadFirstPage} style={styles.retryBtn} activeOpacity={0.85}>
            <Text style={styles.retryTxt}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderTxt}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemWrap}>
              <TrainingCard
                type="completed"
                training={item}
                formatarDuracao={formatarDuracao}
                onPress={() =>
                  navigation.navigate('DetalhesTreinoConcluidoScreen', {
                    treino: {
                      id: item.id,
                      nomeTreino: item.nomeTreino,
                      dataConclusao: item.dataConclusao ? item.dataConclusao.toISOString() : null,
                      duracao: item.duracao,
                      avaliacao: item.avaliacao,
                      observacoesUser: item.observacoesUser,
                      clientName: item.clientName,
                      raw: item.raw || item,
                    },
                  })
                }
              />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReachedThreshold={0.25}
          onEndReached={loadMore}
          ListFooterComponent={
            isPaginating ? (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="file-tray-outline" size={22} color={Colors.textSecondary} />
              <Text style={styles.emptyTxt}>Ainda sem treinos concluídos.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingTxt: { marginTop: 10, color: Colors.textSecondary },
  errorTxt: { marginTop: 10, color: Colors.error, textAlign: 'center' },
  retryBtn: {
    marginTop: 12, paddingHorizontal: 14, height: 42, borderRadius: 10,
    backgroundColor: Colors.cardBackground, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.divider,
  },
  retryTxt: { color: Colors.textPrimary, fontWeight: '800' },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.onPrimary}22`,
  },
  sectionHeader: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider,
    marginTop: 10,
  },
  sectionHeaderTxt: { color: Colors.textSecondary, fontWeight: '800' },
  itemWrap: { marginTop: 10 },
  separator: { height: 10 },
});
