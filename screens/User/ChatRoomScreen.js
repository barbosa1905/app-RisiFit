// screens/User/ChatRoomScreen.js
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
  Animated,
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

const copyToClipboard = async (txt) => {
  try {
    const mod = await import('@react-native-clipboard/clipboard');
    const Clipboard = mod?.default || mod;
    Clipboard?.setString?.(txt || '');
    Alert.alert('Copiado', 'Mensagem copiada para a área de transferência.');
  } catch (e) {
    Alert.alert('Indisponível', 'Copiar texto não está disponível nesta build.');
  }
};

function MessageBubble({ item, isMine, onLongPress }) {
  const createdAt = tsToDate(item.createdAt);
  const time = createdAt ? moment(createdAt).format('HH:mm') : '';
  const isRead = !!item.lida && isMine;
  const ticksIcon = isRead ? 'checkmark-done' : 'checkmark';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
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

const DateSeparator = ({ date }) => (
  <View style={styles.sepWrap}>
    <View style={styles.sepLine} />
    <Text style={styles.sepText}>{humanDay(date)}</Text>
    <View style={styles.sepLine} />
  </View>
);

function TypingPill({ visible }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const mkAnim = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.3, duration: 450, useNativeDriver: true }),
        ])
      );
    const a1 = mkAnim(dot1, 0);
    const a2 = mkAnim(dot2, 150);
    const a3 = mkAnim(dot3, 300);

    if (visible) {
      a1.start(); a2.start(); a3.start();
    }
    return () => { dot1.stopAnimation(); dot2.stopAnimation(); dot3.stopAnimation(); };
  }, [visible, dot1, dot2, dot3]);

  if (!visible) return null;
  return (
    <View style={styles.typingBar}>
      <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
      <Text style={styles.typingText}>a escrever…</Text>
    </View>
  );
}

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, userId, userName: initialName } = route.params || {};
  const auth = getAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [contactName, setContactName] = useState(initialName || 'Personal Trainer');
  const [sending, setSending] = useState(false);
  const [typingOther, setTypingOther] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const flatRef = useRef(null);

  useEffect(() => {
    if (!chatId || !userId) {
      Alert.alert('Conversa inválida', 'Não foi possível abrir esta conversa.');
      navigation.goBack();
    }
  }, [chatId, userId, navigation]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!alive) return;
        if (snap.exists()) setContactName(snap.data().name || snap.data().email || 'Personal Trainer');
      } catch {}
    })();
    return () => { alive = false; };
  }, [userId]);

  useEffect(() => {
    const me = auth.currentUser?.uid;
    if (!chatId || !me) return;

    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMsgs = onSnapshot(
      q,
      async (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(list);

        const unread = list.filter((m) => m.senderId !== me && !m.lida);
        if (unread.length) {
          try {
            await Promise.all(unread.map((m) => updateDoc(doc(db, 'chats', chatId, 'messages', m.id), { lida: true })));
            await setDoc(doc(db, 'chats', chatId), { lastRead: { [me]: serverTimestamp() } }, { merge: true });
          } catch {}
        }

        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
      },
      (err) => {
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
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 50);
    } catch {
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

  const onScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
    setShowJump(!atBottom);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={contactName} showBackButton onBackPress={() => navigation.goBack()} />

      {/* Sub-status sob o header */}
      <View style={styles.subHeader}>
        <View style={[styles.statusDot, { backgroundColor: typingOther ? Colors.success : Colors.textSecondary }]} />
        <Text style={styles.subHeaderText}>{typingOther ? 'a escrever…' : 'conectado'}</Text>
      </View>

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
          onScroll={onScroll}
          showsVerticalScrollIndicator={false}
        />

        <TypingPill visible={typingOther} />

        {/* FAB - Scroll to bottom */}
        {showJump && (
          <TouchableOpacity
            onPress={() => flatRef.current?.scrollToEnd({ animated: true })}
            style={styles.jumpBtn}
            activeOpacity={0.9}
          >
            <Ionicons name="chevron-down" size={20} color={Colors.onPrimary} />
          </TouchableOpacity>
        )}

        {/* Input */}
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

const BUBBLE_RADIUS = 16;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 14 },

  // Subheader com estado
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  subHeaderText: { color: Colors.textSecondary, fontSize: 12 },

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
  bubbleMine: { backgroundColor: Colors.secondary, borderColor: Colors.secondary, borderTopRightRadius: 6 },
  bubbleOther: { backgroundColor: Colors.cardBackground, borderColor: Colors.divider, borderTopLeftRadius: 6 },
  bubblePending: { opacity: 0.6 },

  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: Colors.onPrimary },
  msgTextOther: { color: Colors.textPrimary },

  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  time: { fontSize: 11 },
  timeMine: { color: Colors.onPrimary },
  timeOther: { color: Colors.textSecondary },

  sepWrap: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginVertical: 10 },
  sepLine: { height: 1, width: 56, backgroundColor: Colors.divider },
  sepText: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.cardBackground,
    color: Colors.textSecondary,
    borderWidth: 1,
    borderColor: Colors.divider,
    fontSize: 12,
  },

  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginLeft: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.divider,
    gap: 6,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecondary },
  typingText: { color: Colors.textSecondary, fontSize: 12 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    borderTopWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
    maxHeight: 140,
  },
  inputDisabled: { opacity: 0.6 },
  sendBtn: { marginLeft: 8, backgroundColor: Colors.primary, height: 46, width: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.textSecondary },

  jumpBtn: {
    position: 'absolute',
    right: 16,
    bottom: 86,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    elevation: 4,
  },
});
