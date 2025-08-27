// screens/Admin/CreateChatScreen.js
import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import 'moment/locale/pt';
moment.locale('pt');

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import SearchHeader from '../../components/SearchHeader';
import { UnreadContext } from '../../contexts/UnreadContext';
import { Ionicons } from '@expo/vector-icons';

/* ---------------- helpers ---------------- */
const normalize = (s = '') =>
  s
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const onlyDigits = (s = '') => s.replace(/[^\d]/g, '');

/* =======================================================================
   CreateChatScreen
   ======================================================================= */
export default function CreateChatScreen() {
  const navigation = useNavigation();
  const auth = getAuth();

  const { setUnreadCount } = useContext(UnreadContext);

  const [allClients, setAllClients] = useState([]); // [{id, name, email, ...}]
  const [chatInfo, setChatInfo] = useState({});     // { [clientId]: { chatId, lastMessage, lastTime, lastSender, unreadCount, hasMessages } }
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // refs
  const chatsUnsubRef = useRef(null);
  const usersUnsubRef = useRef(null);
  const perChatListenersRef = useRef({}); // { [chatId]: { lastUnsub, unreadUnsub } }
  const allClientsRef = useRef([]);       // mantém a lista mais recente para evitar closures antigas

  // total não lidas (para badge global)
  useEffect(() => {
    const total = Object.values(chatInfo).reduce((sum, c) => sum + (c?.unreadCount || 0), 0);
    setUnreadCount?.(total);
  }, [chatInfo, setUnreadCount]);

  // nome seguro por ID
  const displayNameById = useCallback((userId) => {
    const u = allClientsRef.current.find((c) => c.id === userId);
    return u?.name || u?.email || 'Cliente';
  }, []);

  /* ---------------- listeners ---------------- */
  useFocusEffect(
    useCallback(() => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setAllClients([]);
        setChatInfo({});
        setLoading(false);
        return () => {};
      }

      setLoading(true);

      // 1) Ouvir clientes deste PT
      const qUsers = query(collection(db, 'users'), where('role', '==', 'user'), where('adminId', '==', uid));
      usersUnsubRef.current = onSnapshot(
        qUsers,
        (snap) => {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || '', 'pt'));
          allClientsRef.current = list;
          setAllClients(list);
        },
        (err) => {
          console.error('[users snapshot]', err);
          allClientsRef.current = [];
          setAllClients([]);
        }
      );

      // 2) Ouvir chats 1-1 onde o PT participa
      const qChats = query(
        collection(db, 'chats'),
        where('isGroup', '==', false),
        where('participants', 'array-contains', uid)
      );

      chatsUnsubRef.current = onSnapshot(
        qChats,
        async (snap) => {
          // limpar listeners de chats que saíram
          const liveChatIds = new Set(snap.docs.map((d) => d.id));
          for (const [chatId, subs] of Object.entries(perChatListenersRef.current)) {
            if (!liveChatIds.has(chatId)) {
              subs?.lastUnsub?.();
              subs?.unreadUnsub?.();
              delete perChatListenersRef.current[chatId];
            }
          }

          // listeners para cada chat
          snap.forEach((chatDoc) => {
            const chat = chatDoc.data();
            const chatId = chatDoc.id;
            if (!Array.isArray(chat.participants) || chat.participants.length !== 2) return;

            const otherId = chat.participants.find((id) => id !== uid);
            if (!otherId) return;

            if (perChatListenersRef.current[chatId]) return;

            const msgsRef = collection(db, 'chats', chatId, 'messages');

            // a) última mensagem
            const lastUnsub = onSnapshot(
              query(msgsRef, orderBy('createdAt', 'desc'), limit(1)),
              (msnap) => {
                const m = msnap.docs[0]?.data();
                setChatInfo((prev) => ({
                  ...prev,
                  [otherId]: {
                    ...(prev[otherId] || {}),
                    chatId,
                    hasMessages: !!m,
                    lastMessage: m?.text || '',
                    lastTime: m?.createdAt?.toDate?.() || null,
                    lastSender: m ? (m.senderId === uid ? 'Você' : displayNameById(otherId)) : '',
                  },
                }));
              },
              (err) => console.error(`[last message ${chatId}]`, err)
            );

            // b) não lidas (mensagens do cliente para o PT)
            const unreadUnsub = onSnapshot(
              query(msgsRef, where('lida', '==', false), where('senderId', '!=', uid)),
              (usnap) => {
                setChatInfo((prev) => ({
                  ...prev,
                  [otherId]: { ...(prev[otherId] || {}), chatId, unreadCount: usnap.size || 0 },
                }));
              },
              (err) => {
                console.warn(`[unread ${chatId}]`, err?.message || err);
                setChatInfo((prev) => ({
                  ...prev,
                  [otherId]: { ...(prev[otherId] || {}), chatId, unreadCount: 0 },
                }));
              }
            );

            perChatListenersRef.current[chatId] = { lastUnsub, unreadUnsub };
          });

          setLoading(false);
        },
        (err) => {
          console.error('[chats snapshot]', err);
          setLoading(false);
        }
      );

      return () => {
        usersUnsubRef.current?.();
        chatsUnsubRef.current?.();
        Object.values(perChatListenersRef.current).forEach((s) => {
          s?.lastUnsub?.();
          s?.unreadUnsub?.();
        });
        perChatListenersRef.current = {};
      };
    }, [auth.currentUser?.uid])
  );

  /* ---------------- actions ---------------- */
  const createChat = useCallback(async (client) => {
    const adminId = auth.currentUser?.uid;
    if (!adminId) {
      Alert.alert('Erro', 'Inicie sessão para criar um chat.');
      return;
    }

    try {
      const clientId = client.id;
      const sorted = [adminId, clientId].sort();

      // evita duplicados
      const existing = await getDocs(
        query(collection(db, 'chats'), where('participantsSorted', '==', sorted))
      );
      let chatId = existing.docs[0]?.id;

      if (!chatId) {
        const ref = await addDoc(collection(db, 'chats'), {
          isGroup: false,
          participants: [adminId, clientId],
          participantsSorted: sorted,
          createdAt: serverTimestamp(),
        });
        chatId = ref.id;
      }

      navigation.navigate('AdminChatRoom', {
        chatId,
        userId: clientId,
        userName: displayNameById(clientId),
      });
    } catch (e) {
      console.error('[createChat]', e);
      Alert.alert('Erro', 'Não foi possível iniciar a conversa.');
    }
  }, [auth.currentUser?.uid, displayNameById, navigation]);

  const openWhatsApp = (client) => {
    const phone = onlyDigits(client?.telefoneCompleto || '');
    if (!phone) {
      Alert.alert('Sem número', 'Este cliente não tem telefone registado.');
      return;
    }
    Linking.openURL(`https://wa.me/${phone}`).catch(() =>
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.')
    );
  };

  /* ---------------- derived list ---------------- */
  const displayed = useMemo(() => {
    const n = normalize(search);
    const base = n
      ? allClients.filter((c) =>
          `${normalize(c.name || '')} ${normalize(c.email || '')}`.includes(n)
        )
      : allClients;

    if (!n) {
      return base
        .filter((c) => chatInfo[c.id]?.hasMessages)
        .sort((a, b) => {
          const ta = chatInfo[a.id]?.lastTime?.getTime?.() || 0;
          const tb = chatInfo[b.id]?.lastTime?.getTime?.() || 0;
          return tb - ta;
        });
    }

    const withChat = [];
    const withoutChat = [];
    base.forEach((c) => (chatInfo[c.id]?.hasMessages ? withChat : withoutChat).push(c));
    withChat.sort((a, b) => {
      const ta = chatInfo[a.id]?.lastTime?.getTime?.() || 0;
      const tb = chatInfo[b.id]?.lastTime?.getTime?.() || 0;
      return tb - ta;
    });
    return [...withChat, ...withoutChat];
  }, [search, allClients, chatInfo]);

  /* ---------------- render ---------------- */
  const renderItem = ({ item }) => {
    const info = chatInfo[item.id];
    const hasChat = !!info?.hasMessages;
    const unread = info?.unreadCount || 0;

    if (hasChat) {
      return (
        <TouchableOpacity
          style={[styles.card, unread > 0 && styles.cardUnread]}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('AdminChatRoom', {
              chatId: info.chatId,
              userId: item.id,
              userName: displayNameById(item.id),
            })
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayNameById(item.id) || '?').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {displayNameById(item.id)}
              </Text>
              {!!info.lastTime && (
                <Text style={styles.time}>{moment(info.lastTime).format('HH:mm')}</Text>
              )}
            </View>

            <View style={styles.rowBottom}>
              <Text
                style={[styles.lastMsg, unread > 0 && styles.lastMsgUnread]}
                numberOfLines={1}
              >
                {info.lastSender ? `${info.lastSender}: ` : ''}
                {info.lastMessage || '—'}
              </Text>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unread}</Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => openWhatsApp(item)} style={styles.waBtn}>
            <Ionicons name="logo-whatsapp" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    // Pesquisa ativa e cliente sem chat → CTA para iniciar conversa
    if (search) {
      return (
        <TouchableOpacity
          style={[styles.card, styles.cardNew]}
          activeOpacity={0.8}
          onPress={() => createChat(item)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayNameById(item.id) || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayNameById(item.id)}</Text>
            <Text style={styles.newHint}>Iniciar nova conversa</Text>
          </View>
          <Ionicons name="chatbubbles-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Conversas" />

      <SearchHeader
        value={search}
        onChangeText={setSearch}
        placeholder="Pesquisar conversas ou clientes"
        onAddPress={() => navigation.navigate('CadastroCliente')}
      />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>A carregar conversas…</Text>
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={56} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Sem conversas</Text>
          <Text style={styles.emptyText}>
            Usa a pesquisa para encontrar um cliente e iniciar uma conversa.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const AVATAR = 48;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '' },

  loader: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loaderText: { marginTop: 8, color: Colors.textSecondary },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontWeight: '800', fontSize: 18, color: Colors.textPrimary, marginTop: 10 },
  emptyText: { color: Colors.textSecondary, marginTop: 6, textAlign: 'center' },

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
  cardUnread: { borderLeftWidth: 4, borderLeftColor: Colors.secondary },
  cardNew: { borderLeftWidth: 3, borderLeftColor: Colors.primary },

  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#EAEFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  name: { fontWeight: '800', color: Colors.textPrimary },
  time: { color: Colors.textSecondary, fontSize: 12, marginLeft: 8 },

  lastMsg: { flex: 1, color: Colors.textSecondary, fontSize: 13 },
  lastMsgUnread: { color: Colors.textPrimary, fontWeight: '700' },

  unreadBadge: {
    backgroundColor: '#E53935',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  waBtn: {
    marginLeft: 10,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackground,
  },

  newHint: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
});
