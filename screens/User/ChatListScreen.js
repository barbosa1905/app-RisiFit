// screens/User/ChatListScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import moment from 'moment';
import 'moment/locale/pt';
moment.locale('pt');

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import SearchHeader from '../../components/SearchHeader';

const normalize = (s = '') =>
  s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function ChatListScreen() {
  const navigation = useNavigation();
  const auth = getAuth();

  const [currentUserUid, setCurrentUserUid] = useState(null);
  const [chats, setChats] = useState([]); // [{ id, participants, lastMessage, lastRead }]
  const [names, setNames] = useState({}); // { userId: name }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const unsubRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user?.uid || null);
      if (!user) cleanup();
    });
    return () => {
      unsub();
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch {}
      unsubRef.current = null;
    }
    setChats([]);
    setNames({});
  }, []);

  useFocusEffect(
    useCallback(() => {
      cleanup();
      if (!currentUserUid) {
        setLoading(false);
        return () => {};
      }

      setLoading(true);
      const qChats = query(collection(db, 'chats'), where('participants', 'array-contains', currentUserUid));
      const unsub = onSnapshot(
        qChats,
        async (snapshot) => {
          const rows = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => !c.isGroup)
            .sort((a, b) => {
              const ta = a?.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
              const tb = b?.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
              return tb - ta;
            });

          setChats(rows);

          // Nomes do outro participante
          const cache = {};
          await Promise.all(
            rows.map(async (c) => {
              const otherId = (c.participants || []).find((id) => id !== currentUserUid);
              if (!otherId || names[otherId] || cache[otherId]) return;
              try {
                const snap = await getDoc(doc(db, 'users', otherId));
                cache[otherId] = snap.exists() ? (snap.data().name || snap.data().email || 'Personal Trainer') : 'Personal Trainer';
              } catch {
                cache[otherId] = 'Personal Trainer';
              }
            })
          );
          if (Object.keys(cache).length) setNames((prev) => ({ ...prev, ...cache }));
          setLoading(false);
        },
        (err) => {
          if (String(err?.message || '').includes('insufficient permissions')) {
            Alert.alert('Permissão', 'Sem permissão para ver os chats. Inicia sessão novamente.');
          }
          setLoading(false);
        }
      );

      unsubRef.current = unsub;
      return () => cleanup();
    }, [currentUserUid, cleanup])
  );

  const filtered = useMemo(() => {
    const n = normalize(search);
    if (!n) return chats;
    return chats.filter((c) => {
      const otherId = (c.participants || []).find((id) => id !== currentUserUid);
      const name = names[otherId] || '';
      return normalize(name).includes(n) || normalize(c?.lastMessage?.text || '').includes(n);
    });
  }, [search, chats, names, currentUserUid]);

  const calcUnread = (c) => {
    try {
      const last = c?.lastMessage?.timestamp?.toDate?.();
      const me = currentUserUid;
      const myRead = c?.lastRead?.[me]?.toDate?.();
      const isFromOther = c?.lastMessage?.senderId && c.lastMessage.senderId !== me;
      if (!last || !isFromOther) return false;
      if (!myRead) return true;
      return last.getTime() > myRead.getTime();
    } catch {
      return false;
    }
  };

  const renderItem = ({ item }) => {
    const otherId = (item.participants || []).find((id) => id !== currentUserUid);
    const nome = names[otherId] || 'Personal Trainer';
    const last = item.lastMessage;
    const unread = calcUnread(item);

    const time =
      last?.timestamp?.toDate?.() ? moment(last.timestamp.toDate()).calendar(null, {
        sameDay: 'HH:mm',
        lastDay: '[Ontem] HH:mm',
        lastWeek: 'DD/MM HH:mm',
        sameElse: 'DD/MM/YYYY',
      }) : '';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate('UserChatRoom', {
            chatId: item.id,
            userId: otherId,
            userName: nome,
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(nome || '?').charAt(0).toUpperCase()}</Text>
          {unread && <View style={styles.unreadDot} />}
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>{nome}</Text>
            {!!time && <Text style={[styles.time, unread && styles.timeUnread]}>{time}</Text>}
          </View>
          {!!last?.text && (
            <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
              {last.text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Conversas" />
      <SearchHeader
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar pelo PT ou mensagem"
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>A carregar…</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filtered}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={<Text style={styles.empty}>Ainda não tens conversas.</Text>}
            showsVerticalScrollIndicator={false}
          />

          {/* FAB: Nova conversa */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateChatUser')}
            activeOpacity={0.9}
            style={styles.fab}
          >
            <Ionicons name="chatbubbles" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loader: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loaderText: { marginTop: 6, color: Colors.textSecondary },
  empty: { textAlign: 'center', marginTop: 24, color: Colors.textSecondary },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#EAEFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: { fontWeight: '800', color: Colors.textPrimary },
  unreadDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.cardBackground,
  },

  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '800', color: Colors.textPrimary, maxWidth: '70%' },
  titleUnread: { color: Colors.primary },
  time: { color: Colors.textSecondary, fontSize: 12 },
  timeUnread: { color: Colors.primary },
  preview: { color: Colors.textSecondary, marginTop: 2 },
  previewUnread: { color: Colors.textPrimary },

  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
