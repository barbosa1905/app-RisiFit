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
import { onAuthStateChanged } from 'firebase/auth';
import moment from 'moment';
import 'moment/locale/pt';
moment.locale('pt');

import { db, auth } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import SearchHeader from '../../components/SearchHeader';

const normalize = (s = '') =>
  s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function ChatListScreen() {
  const navigation = useNavigation();

  const [currentUserUid, setCurrentUserUid] = useState(null);
  const [chats, setChats] = useState([]); // [{ id, participants, isGroup, lastMessage{ text, senderId, timestamp } }]
  const [userNames, setUserNames] = useState({}); // { userId: name }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const unsubscribeMainChatList = useRef(null);

  // auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUserUid(user?.uid || null);
      if (!user) cleanupMainListener();
    });
    return () => {
      unsub();
      cleanupMainListener();
    };
  }, []);

  const cleanupMainListener = useCallback(() => {
    if (unsubscribeMainChatList.current) {
      try { unsubscribeMainChatList.current(); } catch {}
      unsubscribeMainChatList.current = null;
    }
    setChats([]);
    setUserNames({});
  }, []);

  // listener principal dos chats (apenas quando o ecrã está focado)
  useFocusEffect(
    useCallback(() => {
      cleanupMainListener();
      if (!currentUserUid) {
        setLoading(false);
        return () => {};
      }

      setLoading(true);
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUserUid));
      const unsub = onSnapshot(
        q,
        async (snapshot) => {
          const rows = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => !c.isGroup) // se quiseres listar grupos, remove isto
            .sort((a, b) => {
              const ta = a?.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
              const tb = b?.lastMessage?.timestamp?.toDate?.()?.getTime?.() || 0;
              return tb - ta;
            });

          setChats(rows);

          // carregar nomes dos “outros” participantes
          const namesBatch = {};
          await Promise.all(
            rows.map(async (chat) => {
              const otherId = (chat.participants || []).find((id) => id !== currentUserUid);
              if (!otherId || userNames[otherId] || namesBatch[otherId]) return;
              try {
                const snap = await getDoc(doc(db, 'users', otherId));
                namesBatch[otherId] = snap.exists()
                  ? snap.data().name || snap.data().email || 'Cliente'
                  : 'Cliente';
              } catch {
                namesBatch[otherId] = 'Cliente';
              }
            })
          );
          if (Object.keys(namesBatch).length) setUserNames((prev) => ({ ...prev, ...namesBatch }));
          setLoading(false);
        },
        (error) => {
          console.error('[ChatList] onSnapshot error:', error);
          if (String(error?.message || '').includes('insufficient permissions')) {
            Alert.alert('Permissão', 'Sem permissão para ver os chats. Inicia sessão novamente.');
          }
          setLoading(false);
        }
      );

      unsubscribeMainChatList.current = unsub;
      return () => cleanupMainListener();
    }, [currentUserUid, cleanupMainListener])
  );

  const filtered = useMemo(() => {
    const n = normalize(search);
    if (!n) return chats;
    return chats.filter((c) => {
      const otherId = (c.participants || []).find((id) => id !== currentUserUid);
      const name = userNames[otherId] || '';
      return normalize(name).includes(n) || normalize(c?.lastMessage?.text || '').includes(n);
    });
  }, [search, chats, userNames, currentUserUid]);

  const renderItem = ({ item }) => {
    const otherId = (item.participants || []).find((id) => id !== currentUserUid);
    const nome = item.isGroup ? item.name : userNames[otherId] || 'Cliente';
    const last = item.lastMessage;
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
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AdminChatRoom', {
            chatId: item.id,
            userId: otherId,
            userName: nome,
            adminUid: currentUserUid,
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(nome || '?').charAt(0).toUpperCase()}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.title} numberOfLines={1}>{nome}</Text>
            {!!time && <Text style={styles.time}>{time}</Text>}
          </View>
          {!!last?.text && (
            <Text style={styles.preview} numberOfLines={1}>
              {last.senderId === currentUserUid ? 'Você: ' : ''}
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
        placeholder="Pesquisar por cliente ou mensagem"
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>A carregar…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {currentUserUid ? 'Nenhum chat encontrado.' : 'Inicia sessão para ver os chats.'}
            </Text>
          }
        />
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  avatarText: { fontWeight: '800', color: Colors.textPrimary },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '800', color: Colors.textPrimary, maxWidth: '70%' },
  time: { color: Colors.textSecondary, fontSize: 12 },
  preview: { color: Colors.textSecondary, marginTop: 2 },
});
