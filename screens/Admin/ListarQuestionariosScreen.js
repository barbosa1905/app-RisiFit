// screens/Admin/ListarQuestionariosScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
} from 'firebase/firestore';

import AppHeader from '../../components/AppHeader';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import { db, auth } from '../../services/firebaseConfig';

// ——— utils ———
const toDate = (v) => {
  try {
    if (!v) return null;
    if (v.toDate) return v.toDate();
    const d = new Date(v);
    return isNaN(d) ? null : d;
  } catch { return null; }
};
const fmtDate = (d) => (d ? d.toLocaleDateString('pt-PT') : '—');
const countPerguntas = (q) => {
  if (Array.isArray(q?.perguntas)) return q.perguntas.length;
  if (Array.isArray(q?.sections)) return q.sections.reduce((n, s) => n + (s?.questions?.length || 0), 0);
  if (Array.isArray(q?.secoes)) return q.secoes.reduce((n, s) => n + (s?.perguntas?.length || 0), 0);
  return q?.totalPerguntas || 0;
};

export default function ListarQuestionariosScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [questionarios, setQuestionarios] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Lê diretamente de 'questionarios' (onde os crias com dataCriacao). :contentReference[oaicite:2]{index=2}
    const col = collection(db, 'questionarios');
    const unsub = onSnapshot(
      col,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // ordena de forma robusta, mesmo que não exista updatedAt
        list.sort((a, b) => {
          const ad = toDate(a.updatedAt) || toDate(a.dataCriacao) || toDate(a.createdAt);
          const bd = toDate(b.updatedAt) || toDate(b.dataCriacao) || toDate(b.createdAt);
          return (bd?.getTime?.() || 0) - (ad?.getTime?.() || 0);
        });
        setQuestionarios(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao ler questionários:', err);
        Alert.alert('Erro', 'Não foi possível carregar os questionários.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return questionarios;
    return questionarios.filter((q) => {
      const t = (q.titulo || q.title || q.nome || '').toLowerCase();
      const d = (q.descricao || q.description || '').toLowerCase();
      return t.includes(s) || d.includes(s);
    });
  }, [search, questionarios]);

  const onRefresh = useCallback(() => {
    // onSnapshot já mantém live; isto é só UX
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleEditar = (item) => {
    navigation.navigate('EditarQuestionario', {
      questionario: item,
      adminId: auth.currentUser?.uid || null,
    });
  };

  const handleExcluir = (item) => {
    Alert.alert(
      'Eliminar questionário',
      `Queres mesmo eliminar “${item.titulo || item.title || item.id}”?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { doc, deleteDoc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'questionarios', item.id));
            } catch (e) {
              console.error('Erro a eliminar:', e);
              Alert.alert('Erro', 'Não foi possível eliminar.');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const titulo = item.titulo || item.title || item.nome || `Questionário ${item.id}`;
    const perguntas = countPerguntas(item);
    const date = toDate(item.updatedAt) || toDate(item.dataCriacao) || toDate(item.createdAt);

    return (
      <View style={[styles.card, styles.cardElev]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{titulo}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Ionicons name="help-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.chipText}>
              {perguntas} {perguntas === 1 ? 'pergunta' : 'perguntas'}
            </Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.chipText}>Criado {fmtDate(date)}</Text>
          </View>
        </View>

        {!!(item.descricao || item.description) && (
          <Text style={styles.desc} numberOfLines={2}>
            {item.descricao || item.description}
          </Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnEdit]} onPress={() => handleEditar(item)}>
            <Ionicons name="pencil-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.btnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => handleExcluir(item)}>
            <Ionicons name="trash-outline" size={18} color={Colors.onPrimary} />
            <Text style={styles.btnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const headerTitle = 'Meus Questionários';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <AppHeader title={headerTitle} showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar questionários…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <AppHeader
        title={headerTitle}
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightContent={
          <TouchableOpacity
            onPress={() => navigation.navigate('CriarQuestionario', { adminId: auth.currentUser?.uid || null })}
            style={styles.headerNewBtn}
          >
            <Ionicons name="add" size={20} color={Colors.onSecondary} />
            <Text style={styles.headerNewBtnText}>Novo</Text>
          </TouchableOpacity>
        }
      />

      {/* Pesquisa */}
      <View style={[styles.searchBox, styles.cardElev]}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por título ou descrição…"
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="clipboard-outline" size={50} color={Colors.mediumGray} />
          <Text style={styles.emptyTitle}>Sem questionários</Text>
          <Text style={styles.emptyText}>Cria o teu primeiro questionário para começar.</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('CriarQuestionario', { adminId: auth.currentUser?.uid || null })}
            style={[styles.cta, styles.cardElev]}
          >
            <Ionicons name="add-circle-outline" size={20} />
            <Text style={styles.ctaText}>Criar novo questionário</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontSize: 16 },

  headerNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerNewBtnText: { color: Colors.onSecondary, fontWeight: '800', marginLeft: 6 },

  searchBox: {
    marginHorizontal: Layout?.padding ?? 16,
    marginTop: Layout?.padding ?? 16,
    marginBottom: 6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.divider ?? '#E6E8EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: { flex: 1, marginHorizontal: 8, color: Colors.textPrimary, paddingVertical: 4, fontSize: 16 },

  listContent: { paddingHorizontal: Layout?.padding ?? 16, paddingBottom: 24 + 16 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider ?? '#E6E8EB',
  },
  cardElev: {
    ...(Layout?.cardElevation || {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flex: 1, color: Colors.textPrimary, fontSize: 18, fontWeight: '800', paddingRight: 12 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: Colors.textSecondary, fontWeight: '600' },

  desc: { marginTop: 10, color: Colors.textSecondary, lineHeight: 20 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnEdit: { backgroundColor: Colors.primary },
  btnDelete: { backgroundColor: Colors.danger },
  btnText: { marginLeft: 6, color: Colors.onPrimary, fontWeight: '800' },

  empty: { flex: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, marginTop: 10 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  cta: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: Colors.onSecondary, fontWeight: '900', marginLeft: 8 },
});
