// screens/Admin/RespostasQuestionarioScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

import AppHeader from '../../components/AppHeader';
import Colors from '../../constants/Colors';
import { db } from '../../services/firebaseConfig';

const auth = getAuth();

/** Botão com micro-escala na pressão (efeito pro, leve) */
const PressableScale = ({ onPress, children, style, scaleTo = 0.98 }) => {
  const v = useRef(new Animated.Value(1)).current;
  const inA = () => Animated.timing(v, { toValue: scaleTo, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  const outA = () => Animated.timing(v, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={inA} onPressOut={outA} onPress={onPress} android_ripple={{ color: `${Colors.secondary}18` }} style={style}>
      <Animated.View style={{ transform: [{ scale: v }] }}>{children}</Animated.View>
    </Pressable>
  );
};

/** tenta extrair um timestamp de vários campos possíveis */
const getDateFromAny = (obj) => {
  const cands = [obj?.timestamp, obj?.createdAt, obj?.respondidoEm, obj?.data];
  for (const c of cands) {
    if (c?.toDate) return c.toDate();
    if (c instanceof Date) return c;
    if (typeof c === 'number') return new Date(c);
    if (typeof c === 'string') {
      const d = new Date(c);
      if (!isNaN(+d)) return d;
    }
  }
  return null;
};

export default function RespostasQuestionarioScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // Se vieres de Clientes, costumamos receber estes:
  const { clienteId, clienteNome } = route.params || {};

  const [items, setItems] = useState([]); // [{id, questionarioId, nomeQuestionario, date}]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // cache de títulos para não fazer getDoc repetido
  const qTitleCache = useRef(new Map());

  useEffect(() => {
    const t = setTimeout(() => setDebounced((search || '').trim().toLowerCase()), 220);
    return () => clearTimeout(t);
  }, [search]);

  // garante auth anónimo se necessário
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) signInAnonymously(auth).catch(() => {});
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    setErr('');

    // Monta a query: se temos clienteId -> filtra; senão, traz tudo
    const baseRef = collection(db, 'respostasQuestionarios');
    const qRef = clienteId ? query(baseRef, where('userId', '==', clienteId)) : baseRef;

    const unsub = onSnapshot(
      qRef,
      async (snap) => {
        try {
          const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // Enriquecer com título do questionário (com cache)
          const out = await Promise.all(
            raw.map(async (r) => {
              const qid = r.questionarioId;
              let nomeQuestionario = qTitleCache.current.get(qid);
              if (!nomeQuestionario && qid) {
                try {
                  const qDoc = await getDoc(doc(db, 'questionarios', qid));
                  nomeQuestionario = qDoc.exists() ? (qDoc.data()?.titulo || 'Questionário') : 'Questionário';
                } catch {
                  nomeQuestionario = 'Questionário';
                }
                qTitleCache.current.set(qid, nomeQuestionario);
              }

              const date = getDateFromAny(r);
              return {
                id: r.id,
                questionarioId: qid,
                nomeQuestionario: nomeQuestionario || 'Questionário',
                date,
              };
            })
          );

          // ordenar por data (desc), sem exigir índices
          out.sort((a, b) => {
            const ta = a.date ? +a.date : 0;
            const tb = b.date ? +b.date : 0;
            return tb - ta;
          });

          setItems(out);
          setLoading(false);
        } catch (e) {
          if (__DEV__) console.error('[RespostasQuestionarioScreen] parse', e);
          setErr('Erro ao processar os questionários.');
          setLoading(false);
        }
      },
      (error) => {
        if (__DEV__) console.error('[RespostasQuestionarioScreen] snapshot', error);
        setErr('Não foi possível carregar os questionários.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [clienteId]);

  const filtrados = useMemo(() => {
    if (!debounced) return items;
    return items.filter((it) => (it.nomeQuestionario || '').toLowerCase().includes(debounced));
  }, [items, debounced]);

  const renderItem = ({ item }) => {
    const dataStr = item.date
      ? item.date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Data desconhecida';

    return (
      <PressableScale
        onPress={() =>
          navigation.navigate('RespostasQuestionariosClientes', {
            clienteId,
            questionarioId: item.questionarioId,
            clienteNome,
          })
        }
        style={styles.card}
      >
        <View style={styles.bullet}>
          <Ionicons name="document-text-outline" size={18} color={Colors.onSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nomeQuestionario}</Text>
          <Text style={styles.cardSubtitle}>Preenchido: {dataStr}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </PressableScale>
    );
  };

  const headerTitle = clienteNome ? `Questionários de ${clienteNome}` : 'Questionários respondidos';

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={headerTitle} showBackButton onBackPress={() => navigation.goBack()} />

      {/* Pesquisa */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar questionário"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar…</Text>
        </View>
      ) : err ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : filtrados.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}><Ionicons name="reader-outline" size={28} color={Colors.secondary} /></View>
          <Text style={styles.emptyTitle}>Sem questionários</Text>
          <Text style={styles.emptyText}>
            {clienteId ? 'Este cliente ainda não respondeu a questionários.' : 'Não encontrámos respostas.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 6,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: Colors.textPrimary },

  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  errorText: { marginTop: 10, color: Colors.error, textAlign: 'center', paddingHorizontal: 24 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: `${Colors.secondary}22`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyTitle: { fontWeight: '900', color: Colors.textPrimary, fontSize: 18 },
  emptyText: { color: Colors.textSecondary, marginTop: 6 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.divider,
    padding: 14, marginTop: 10,
  },
  bullet: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary,
  },
  cardTitle: { color: Colors.textPrimary, fontWeight: '800' },
  cardSubtitle: { color: Colors.textSecondary, marginTop: 2, fontSize: 12 },
});
