import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
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
  Image,
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
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
} from 'firebase/firestore';
import ChatMessageItem from '../../components/ChatMessageItem';
import { Ionicons } from '@expo/vector-icons';

export default function ChatRoomScreen({ route, navigation }) {
  const { chatId, userId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [usersMap, setUsersMap] = useState({});
  const [contact, setContact] = useState({ name: 'Carregando...', avatar: '' });
  const [sending, setSending] = useState(false);
  const [lastReplyTime, setLastReplyTime] = useState(null);
  const flatListRef = useRef();

  useEffect(() => {
    if (!userId) {
      console.warn('userId não fornecido');
      setContact({ name: 'Usuário', avatar: '' });
      return;
    }

    const fetchContact = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setContact({
            name: typeof data.name === 'string' ? data.name : 'Usuário',
            avatar: data.avatar || '',
          });
        } else {
          console.warn(`Utilizador com ID ${userId} não encontrado na coleção 'users'.`);
          setContact({ name: 'Usuário', avatar: '' });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do contato:', error);
        setContact({ name: 'Usuário', avatar: '' });
      }
    };

    fetchContact();
  }, [userId]);

  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      const unread = msgs.filter(
        (msg) => msg.senderId !== auth.currentUser.uid && !msg.lida
      );

      await Promise.all(
        unread.map((msg) => {
          const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
          return updateDoc(msgRef, { lida: true });
        })
      );

      // Atualizar lastReadTimestamps
      await updateDoc(doc(db, 'chats', chatId), {
        [`lastReadTimestamps.${auth.currentUser.uid}`]: serverTimestamp(),
      });

      const replies = msgs.filter(
        (msg) => msg.senderId !== auth.currentUser.uid && msg.createdAt?.toDate
      );

      if (replies.length > 0) {
        const last = replies[replies.length - 1];
        setLastReplyTime(last.createdAt.toDate());
      }

      const senderIdsToFetch = [
        ...new Set(
          msgs
            .map((m) => m.senderId)
            .filter((id) => id && id !== auth.currentUser.uid && !usersMap[id])
        ),
      ];

      if (senderIdsToFetch.length > 0) {
        senderIdsToFetch.forEach(async (id) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', id));
            const data = userDoc.exists() ? userDoc.data() : {};
            setUsersMap((prev) => ({
              ...prev,
              [id]: data.name || 'Usuário',
            }));
          } catch {
            setUsersMap((prev) => ({ ...prev, [id]: 'Usuário' }));
          }
        });
      }
    });

    return unsubscribe;
  }, [chatId, usersMap]);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    setSending(true);

    try {
      const trimmed = text.trim();

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: trimmed,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lida: false,
      });

      // Atualizar o último estado do chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: trimmed,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
        },
      });

      setText('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <View style={styles.headerBar}>
        {contact.avatar ? (
          <Image source={{ uri: contact.avatar }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle-outline" size={40} color="#007bff" />
        )}
        <Text style={styles.headerTitle}>
          {contact.name === 'Carregando...' ? '...' : contact.name}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatMessageItem
            message={item}
            senderName={usersMap[item.senderId]}
            lastReplyTime={lastReplyTime}
          />
        )}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        style={{ marginTop: 56 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem..."
          style={[styles.input, sending && styles.inputDisabled]}
          multiline
          editable={!sending}
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendButton, (sending || !text.trim()) && styles.sendButtonDisabled]}
          disabled={sending || text.trim().length === 0}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={24}
              color={text.trim() ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#007bff',
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f3f6',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: '#222',
    maxHeight: 100,
  },
  inputDisabled: {
    backgroundColor: '#e0e0e0',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    borderRadius: 24,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007bff',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
});
