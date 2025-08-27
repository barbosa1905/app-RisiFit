// screens/Admin/ChatRoomScreen.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/pt';
moment.locale('pt');

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

/* ---------------- utils ---------------- */
const tsToDate = (t) => (t?.toDate ? t.toDate() : t instanceof Date ? t : null);
const isSameDay = (a, b) =>
  a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const humanDay = (d) => {
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Hoje';
  if (isSameDay(d, yesterday)) return 'Ontem';
  return moment(d).format('DD/MM/YYYY');
};

/* -------- copiar texto (import lazy, evita crash se módulo não estiver pronto) -------- */
const copyToClipboard = async (txt) => {
  try {
    const mod = await import('@react-native-clipboard/clipboard'); // só carrega quando necessário
    const Clipboard = mod?.default || mod;
    Clipboard?.setString?.(txt || '');
    Alert.alert('Copiado', 'Mensagem copiada para o clipboard.');
  } catch (e) {
    console.warn('Clipboard indisponível:', e?.message || e);
    Alert.alert('Indisponível', 'Copiar texto não está disponível nesta build.');
  }
};

/* ---------------- bolha de mensagem ---------------- */
function MessageBubble({ item, isMine, onLongPress }) {
  const createdAt = tsToDate(item.createdAt);
  const time = createdAt ? moment(createdAt).format('HH:mm') : '';
  const isRead = !!item.lida && isMine;
  const ticksIcon = isRead ? 'checkmark-done' : 'checkmark';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onLongPress?.(item, isMine)}
      style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          item.temp && styles.bubblePending,
        ]}
      >
        {!!item.text && (
          <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextOther]}>
            {item.text}
          </Text>
        )}

        <View style={styles.meta}>
          <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>{time}</Text>
          {isMine && (
            <Ionicons
              name={ticksIcon}
              size={14}
              style={{ marginLeft: 6 }}
              color={isRead ? Colors.onPrimary : (styles.timeMine.color || '#fff')}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ---------------- separador de data ---------------- */
const DateSeparator = ({ date }) => (
  <View style={styles.sepWrap}>
    <View style={styles.sepLine} />
    <Text style={styles.sepText}>{humanDay(date)}</Text>
    <View style={styles.sepLine} />
  </View>
);

/* =======================================================================
   ChatRoomScreen
   ======================================================================= */
export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, userId, userName: initialUserName } = route.params || {};
  const auth = getAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [contactName, setContactName] = useState(initialUserName || 'Cliente');
  const [sending, setSending] = useState(false);
  const [typingOther, setTypingOther] = useState(false);

  const flatRef = useRef(null);

  useEffect(() => {
    if (!chatId || !userId) {
      Alert.alert('Conversa inválida', 'Não foi possível abrir esta conversa.');
      navigation.goBack();
    }
  }, [chatId, userId, navigation]);

  useEffect(() => {
    let isMounted = true;
    const loadName = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!isMounted) return;
        if (snap.exists()) setContactName(snap.data().name || snap.data().email || 'Cliente');
      } catch {}
    };
    loadName();
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    if (!chatId || !auth.currentUser?.uid) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));

    const unsubMsgs = onSnapshot(
      q,
      async (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(list);

        // marcar como lidas (mensagens do cliente)
        const myId = auth.currentUser.uid;
        const unread = list.filter((m) => m.senderId === userId && !m.lida);
        if (unread.length) {
          try {
            await Promise.all(
              unread.map((m) => updateDoc(doc(db, 'chats', chatId, 'messages', m.id), { lida: true }))
            );
            await setDoc(doc(db, 'chats', chatId), { lastRead: { [myId]: serverTimestamp() } }, { merge: true });
          } catch (e) {
            console.warn('Falha a marcar lidas:', e?.message || e);
          }
        }

        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
      },
      (err) => {
        console.error('[ChatRoom] snapshot:', err);
        if (String(err?.message || '').includes('insufficient permissions')) {
          Alert.alert('Permissão', 'Sem permissão para esta conversa.');
          navigation.goBack();
        }
      }
    );

    const unsubTyping = onSnapshot(doc(db, 'chats', chatId), (snap) => {
      const data = snap.data() || {};
      const typing = data?.typing || {};
      setTypingOther(!!typing?.[userId]);
    });

    return () => {
      unsubMsgs();
      unsubTyping();
    };
  }, [chatId, userId, auth.currentUser?.uid, navigation]);

  const updateTyping = useCallback(
    async (value) => {
      try {
        const me = auth.currentUser?.uid;
        if (!me || !chatId) return;
        await setDoc(doc(db, 'chats', chatId), { typing: { [me]: !!value } }, { merge: true });
      } catch {}
    },
    [auth.currentUser?.uid, chatId]
  );

  const onChangeText = (t) => {
    setText(t);
    updateTyping(!!t);
  };

  const sendMessage = useCallback(async () => {
    const body = (text || '').trim();
    if (!body || sending) return;

    const user = auth.currentUser;
    if (!user || !chatId) {
      Alert.alert('Erro', 'Inicia sessão para enviar mensagens.');
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: body,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        lida: false,
      });
      await setDoc(
        doc(db, 'chats', chatId),
        { lastMessage: { text: body, senderId: user.uid, timestamp: serverTimestamp() } },
        { merge: true }
      );
      setText('');
      updateTyping(false);
    } catch (e) {
      console.error('Erro ao enviar mensagem:', e);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  }, [text, sending, auth.currentUser?.uid, chatId, updateTyping]);

  const dataWithSeparators = useMemo(() => {
    const out = [];
    let lastDate = null;
    for (const m of messages) {
      const d = tsToDate(m.createdAt);
      if (!lastDate || !isSameDay(d, lastDate)) {
        out.push({ __type: 'sep', id: `sep-${d?.getTime?.() || Math.random()}`, date: d });
        lastDate = d;
      }
      out.push({ __type: 'msg', ...m });
    }
    return out;
  }, [messages]);

  const onLongPressMessage = (msg, isMine) => {
    const opts = [
      { text: 'Copiar', onPress: () => copyToClipboard(msg.text || '') },
      ...(isMine
        ? [{
            text: 'Apagar',
            style: 'destructive',
            onPress: async () => {
              try { await deleteDoc(doc(db, 'chats', chatId, 'messages', msg.id)); }
              catch { Alert.alert('Erro', 'Não foi possível apagar.'); }
            },
          }]
        : []),
      { text: 'Fechar', style: 'cancel' },
    ];
    Alert.alert('Mensagem', 'O que pretende fazer?', opts, { cancelable: true });
  };

  const renderItem = ({ item }) => {
    if (item.__type === 'sep') return <DateSeparator date={item.date} />;
    const isMine = auth.currentUser ? item.senderId === auth.currentUser.uid : false;
    return <MessageBubble item={item} isMine={isMine} onLongPress={onLongPressMessage} />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={contactName} showBackButton onBackPress={() => navigation.goBack()} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatRef}
          data={dataWithSeparators}
          keyExtractor={(it) => it.id || it.__type + Math.random().toString(36).slice(2)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />

        {typingOther && (
          <View style={styles.typingBar}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <Text style={styles.typingText}>a escrever…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder="Escrever mensagem…"
            placeholderTextColor={Colors.textSecondary}
            style={[styles.input, sending && styles.inputDisabled]}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !text.trim()}
            style={[styles.sendBtn, (sending || !text.trim()) && styles.sendBtnDisabled]}
            activeOpacity={0.85}
          >
            {sending ? <ActivityIndicator color={Colors.onPrimary} /> : <Ionicons name="send" size={22} color={Colors.onPrimary} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------- styles ---------------- */
const BUBBLE_RADIUS = 16;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 },

  row: { flexDirection: 'row', paddingHorizontal: 6 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '82%',
    borderRadius: BUBBLE_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  bubbleMine: { backgroundColor: Colors.secondary || Colors.primary, borderColor: Colors.secondary || Colors.primary, borderTopRightRadius: 6 },
  bubbleOther: { backgroundColor: Colors.cardBackground, borderColor: Colors.divider, borderTopLeftRadius: 6 },
  bubblePending: { opacity: 0.6 },

  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: Colors.onPrimary || '#fff' },
  msgTextOther: { color: Colors.textPrimary },

  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  time: { fontSize: 11 },
  timeMine: { color: Colors.onPrimary || '#fff' },
  timeOther: { color: Colors.textSecondary },

  sepWrap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginVertical: 8 },
  sepLine: { height: 1, width: 56, backgroundColor: Colors.divider },
  sepText: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: Colors.cardBackground, color: Colors.textSecondary, borderWidth: 1, borderColor: Colors.divider, fontSize: 12 },

  typingBar: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: 12, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: Colors.cardBackground, borderWidth: 1, borderColor: Colors.divider, gap: 6 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecondary },
  typingText: { color: Colors.textSecondary, fontSize: 12 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 18 : 10, borderTopWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBackground },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBackground, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary, maxHeight: 140 },
  inputDisabled: { opacity: 0.6 },
  sendBtn: { marginLeft: 8, backgroundColor: Colors.primary, height: 46, width: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.textSecondary },
});
