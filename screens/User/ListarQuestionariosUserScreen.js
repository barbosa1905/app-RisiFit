import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../../services/firebaseConfig';
import { getUserIdLoggedIn } from '../../services/authService';
import Colors from '../../constants/Colors';

const HEADER_H = 92;

export default function ListarQuestionariosUserScreen() {
  const navigation = useNavigation();

  const [questionarios, setQuestionarios] = useState([]);
  const [respondidasSet, setRespondidasSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos'); // todos | porResponder | respondidos

  // Carregamento inicial + ao focar
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        setLoading(true);
        try {
          const uid = await getUserIdLoggedIn();
          if (!uid) throw new Error('Utilizador não autenticado');
          if (!mounted) return;

          setUserId(uid);
          await Promise.all([fetchQuestionarios(), fetchRespondidas(uid)]);
        } catch (e) {
          console.error(e);
          Alert.alert('Erro', 'Não foi possível carregar os questionários.');
        } finally {
          if (mounted) setLoading(false);
        }
      })();
      return () => (mounted = false);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchQuestionarios(), fetchRespondidas(userId)]);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const fetchQuestionarios = async () => {
    const snap = await getDocs(collection(db, 'questionarios'));
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setQuestionarios(lista);
  };

  const fetchRespondidas = async (uid) => {
    if (!uid) return;
    const qRes = query(collection(db, 'respostasQuestionarios'), where('userId', '==', uid));
    const snap = await getDocs(qRes);
    const ids = new Set(snap.docs.map((d) => d.data()?.questionarioId));
    setRespondidasSet(ids);
  };

  // Pesquisa + filtro
  const filteredData = useMemo(() => {
    const term = search.trim().toLowerCase();
    return questionarios
      .filter((q) => {
        if (tab === 'respondidos' && !respondidasSet.has(q.id)) return false;
        if (tab === 'porResponder' && respondidasSet.has(q.id)) return false;
        return true;
      })
      .filter((q) => {
        if (!term) return true;
        const titulo = (q.titulo || q.nome || '').toLowerCase();
        const desc = (q.descricao || '').toLowerCase();
        return titulo.includes(term) || desc.includes(term);
      });
  }, [questionarios, respondidasSet, tab, search]);

  const goResponder = (qid, isResponded) => {
    if (isResponded) {
      Alert.alert(
        'Questionário respondido',
        'Já respondeste a este questionário. Queres responder novamente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Responder', onPress: () => navigation.navigate('ResponderQuestionario', { questionarioId: qid }) },
        ]
      );
      return;
    }
    navigation.navigate('ResponderQuestionario', { questionarioId: qid });
  };

  const renderCard = ({ item }) => {
    const isResponded = respondidasSet.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[
          styles.card,
          isResponded ? styles.cardRespondido : styles.cardPendente,
        ]}
        onPress={() => goResponder(item.id, isResponded)}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.titulo || item.nome || 'Sem título'}
          </Text>
          {!!item.descricao && (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.descricao}
            </Text>
          )}
          <View style={styles.cardMetaRow}>
            {isResponded ? (
              <>
                <MaterialCommunityIcons name="check-decagram" size={18} color="#0C7A55" />
                <Text style={[styles.metaText, { color: '#0C7A55' }]}>Respondido</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="clipboard-edit-outline" size={18} color={Colors.secondary} />
                <Text style={[styles.metaText, { color: Colors.secondary }]}>Por responder</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.chevron}>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={isResponded ? '#0C7A55' : Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Loading / vazio
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.centerText}>A carregar questionários…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header />

      {/* Search + Tabs */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Procurar por título ou descrição…"
            placeholderTextColor={Colors.placeholder}
            style={styles.searchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabs}>
          <TabChip label="Todos" active={tab === 'todos'} onPress={() => setTab('todos')} />
          <TabChip label="Por responder" active={tab === 'porResponder'} onPress={() => setTab('porResponder')} />
          <TabChip label="Respondidos" active={tab === 'respondidos'} onPress={() => setTab('respondidos')} />
        </View>
      </View>

      {filteredData.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Nada por aqui…</Text>
          <Text style={styles.emptyText}>
            Não encontrámos questionários com os filtros atuais.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.secondary]}
              progressBackgroundColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------- UI helpers ---------- */

function Header() {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primary + 'E6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={Colors.onPrimary} />
        <Text style={styles.headerTitle}>Questionários</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={styles.headerIconBtn}>
          <Ionicons name="help-circle-outline" size={18} color={Colors.onPrimary} />
        </View>
        <View style={styles.headerIconBtn}>
          <Ionicons name="share-social-outline" size={18} color={Colors.onPrimary} />
        </View>
      </View>
    </LinearGradient>
  );
}

function TabChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabChip, active && styles.tabChipActive]}
      activeOpacity={0.9}
    >
      <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    height: HEADER_H,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: 20,
    marginLeft: 8,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  toolbar: { padding: 16, paddingTop: 12, gap: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    height: 48,
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15 },

  tabs: { flexDirection: 'row', gap: 8, marginTop: 2 },
  tabChip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabChipActive: {
    backgroundColor: '#FFF3CD',
    borderColor: Colors.secondary,
  },
  tabChipText: { color: Colors.textSecondary, fontWeight: '600' },
  tabChipTextActive: { color: Colors.secondary, fontWeight: '800' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 5,
  },
  cardPendente: { backgroundColor: '#FFF9E7', borderColor: '#FFE08A' },
  cardRespondido: { backgroundColor: '#EAFBF2', borderColor: '#9CE2C3' },
  cardTitle: { fontSize: 16, color: Colors.textPrimary, fontWeight: '800' },
  cardDesc: { marginTop: 4, color: Colors.textSecondary },
  cardMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { fontWeight: '700' },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  centerText: { marginTop: 8, color: Colors.textSecondary },

  empty: { flex: 1, alignItems: 'center', padding: 32 },
  emptyTitle: { marginTop: 12, fontWeight: '800', color: Colors.textPrimary, fontSize: 18 },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
});
