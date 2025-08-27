// screens/User/CreateChatUserScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import moment from 'moment';
import 'moment/locale/pt';
moment.locale('pt');

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

// ——— utils
const normalize = (s = '') =>
  s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const initialsFrom = (name = '') =>
  name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => (p[0] || '').toUpperCase())
    .join('');

// ——— UI: Skeleton
function SkeletonCard() {
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <View style={styles.skelAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.skelLineWide} />
        <View style={styles.skelLine} />
        <View style={[styles.skelLine, { width: '40%' }]} />
      </View>
      <View style={styles.skelCTA} />
    </View>
  );
}

// ——— UI: Card do Treinador
function TrainerCard({ item, onPress }) {
  const nome = item.name || item.nome || item.email || 'Treinador';
  const email = item.email || '';
  const telefone = item.telefoneCompleto || item.telefone || '';
  const ativo = item.ativo !== false; // default ativo
  const createdAt = item.criadoEm
    ? (item.criadoEm.toDate ? item.criadoEm.toDate() : new Date(item.criadoEm))
    : null;

  return (
    <TouchableOpacity activeOpacity={0.95} style={styles.card} onPress={() => onPress(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{initialsFrom(nome) || 'PT'}</Text>
      </View>

      <View style={{ flex: 1, paddingRight: 10 }}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>
            {nome}
          </Text>
          <Text style={styles.rolePill}>Personal Trainer</Text>
        </View>

        {!!email && (
          <Text style={styles.meta} numberOfLines={1}>
            <Ionicons name="mail-outline" size={14} /> {email}
          </Text>
        )}
        {!!telefone && (
          <Text style={styles.meta} numberOfLines={1}>
            <Ionicons name="call-outline" size={14} /> {telefone}
          </Text>
        )}
        {!!createdAt && (
          <Text style={styles.metaTiny}>
            Acompanha-te desde{' '}
            {moment(createdAt).calendar(null, {
              sameDay: '[hoje]',
              lastDay: '[ontem]',
              lastWeek: 'DD/MM',
              sameElse: 'DD/MM/YYYY',
            })}
          </Text>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Text style={[styles.statusPill, !ativo && styles.statusPaused]}>
          {ativo ? 'Ativo' : 'Pausa'}
        </Text>
        <View style={styles.cta}>
          <Ionicons name="chatbubbles" size={16} color={Colors.onPrimary} />
          <Text style={styles.ctaTxt}>Conversar</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ——— Screen
export default function CreateChatUserScreen({ navigation }) {
  const auth = getAuth();
  const uid = auth.currentUser?.uid || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainers, setTrainers] = useState([]); // lista de PTs associados
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const loadTrainers = useCallback(async () => {
    if (!uid) {
      setTrainers([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // 1) ler o doc do utilizador para saber adminId / adminIds
      const meRef = doc(db, 'users', uid);
      const meSnap = await getDoc(meRef);
      if (!meSnap.exists()) {
        setTrainers([]);
      } else {
        const meData = meSnap.data() || {};
        const ids = Array.isArray(meData.adminIds)
          ? meData.adminIds
          : meData.adminId
          ? [meData.adminId]
          : [];

        if (!ids.length) {
          setTrainers([]);
        } else {
          // 2) buscar docs dos treinadores
          const out = [];
          for (const id of ids) {
            const ptRef = doc(db, 'users', id);
            const ptSnap = await getDoc(ptRef);
            if (ptSnap.exists()) out.push({ id: ptSnap.id, ...ptSnap.data() });
          }
          // Ordena por ativo e nome
          out.sort((a, b) => {
            const aAtivo = a.ativo !== false ? 1 : 0;
            const bAtivo = b.ativo !== false ? 1 : 0;
            if (aAtivo !== bAtivo) return bAtivo - aAtivo;
            const an = (a.name || a.nome || '').toLowerCase();
            const bn = (b.name || b.nome || '').toLowerCase();
            return an.localeCompare(bn);
          });
          setTrainers(out);
        }
      }
    } catch (e) {
      console.error('[CreateChatUser] loadTrainers error:', e);
      setError('Não foi possível carregar os teus treinadores.');
      setTrainers([]);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    mounted.current = true;
    loadTrainers();
    return () => {
      mounted.current = false;
    };
  }, [loadTrainers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTrainers();
    } finally {
      setRefreshing(false);
    }
  }, [loadTrainers]);

  const filtered = useMemo(() => {
    const n = normalize(search);
    if (!n) return trainers;
    return trainers.filter(
      (t) =>
        normalize(t.name || t.nome || '').includes(n) ||
        normalize(t.email || '').includes(n) ||
        normalize(t.telefoneCompleto || t.telefone || '').includes(n)
    );
  }, [trainers, search]);

  const openOrCreateChat = useCallback(
    async (trainer) => {
      try {
        if (!uid) {
          Alert.alert('Sessão', 'Por favor, inicia sessão novamente.');
          return;
        }
        const otherId = trainer.id;

        // procurar chat 1-para-1 existente
        const pair = [uid, otherId].sort();
        const qExisting = query(
          collection(db, 'chats'),
          where('participantsSorted', '==', pair),
          where('isGroup', '==', false)
        );
        const existing = await getDocs(qExisting);
        let chatId = existing.docs[0]?.id;

        // criar se não existir
        if (!chatId) {
          const ref = await addDoc(collection(db, 'chats'), {
            isGroup: false,
            participants: [uid, otherId],
            participantsSorted: pair,
            createdAt: serverTimestamp(),
          });
          chatId = ref.id;
        }

        navigation.navigate('UserChatRoom', {
          chatId,
          userId: otherId,
          userName: trainer.name || trainer.nome || trainer.email || 'Personal Trainer',
        });
      } catch (e) {
        console.error('[CreateChatUser] openOrCreateChat error:', e);
        Alert.alert('Erro', 'Não foi possível abrir a conversa.');
      }
    },
    [uid, navigation]
  );

  const renderItem = ({ item }) => <TrainerCard item={item} onPress={openOrCreateChat} />;

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Nova Conversa" showBackButton onBackPress={() => navigation.goBack()} />

      {/* Pesquisa */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar treinador por nome, email, telefone…"
          placeholderTextColor={Colors.textSecondary}
          style={styles.search}
          returnKeyType="search"
        />
        {search?.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Lista */}
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={40} color={Colors.danger} />
          <Text style={styles.errTitle}>Ocorreu um problema</Text>
          <Text style={styles.errText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={loadTrainers}>
            <Ionicons name="refresh" size={16} color={Colors.onPrimary} />
            <Text style={styles.retryTxt}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="person-outline" size={56} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>Sem treinador associado</Text>
              <Text style={styles.emptyText}>
                Assim que o teu PT te associar (adminId), poderás iniciar aqui a conversa.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ——— Styles
const AVATAR = 48;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    height: 48,
  },
  search: {
    flex: 1,
    color: Colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 16,
    padding: 14,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#EAEFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarTxt: { fontWeight: '800', color: Colors.textPrimary },

  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, maxWidth: '70%' },

  rolePill: {
    backgroundColor: Colors.lightGray,
    color: Colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    overflow: 'hidden',
  },

  meta: { color: Colors.textSecondary, marginTop: 2 },
  metaTiny: { color: Colors.textSecondary, fontSize: 12, marginTop: 4 },

  statusPill: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.success,
    color: Colors.onPrimary,
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  statusPaused: { backgroundColor: Colors.danger },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ctaTxt: { color: Colors.onPrimary, fontWeight: '800' },

  center: { padding: 24, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontWeight: '800', color: Colors.textPrimary },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },

  errTitle: { marginTop: 10, fontWeight: '800', color: Colors.textPrimary },
  errText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  retry: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryTxt: { color: Colors.onPrimary, fontWeight: '800' },

  // Skeletons
  skelAvatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#EDEFF3', marginRight: 12 },
  skelLineWide: { height: 12, borderRadius: 6, backgroundColor: '#EDEFF3', width: '60%' },
  skelLine: { height: 10, borderRadius: 5, backgroundColor: '#EDEFF3', width: '80%' },
  skelCTA: { width: 88, height: 36, borderRadius: 12, backgroundColor: '#EDEFF3', marginLeft: 10 },
});
