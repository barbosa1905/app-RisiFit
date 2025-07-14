import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Alert,
  LayoutAnimation,
  UIManager,
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
// IMPORTANTE: Certifique-se de que este caminho aponta para O SEU ChatMessageItem.js
import ChatMessageItem from '../../components/ChatMessageItem';
import { Ionicons } from '@expo/vector-icons'; // Você usa MaterialIcons no ChatMessageItem, mas Ionicons aqui, verifique se está consistente

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Colors = {
  primary: '#5C4033',
  secondary: '#FFD700',
  background: '#F8F8F8',
  cardBackground: '#FFFFFF',
  textDark: '#333333',
  textLight: '#FFFFFF',
  border: '#EEEEEE',
  disabled: '#D0D0D0',
  myBubble: '#E6E6E6',
  otherBubble: '#FFFFFF',
  timestampText: '#AAAAAA',
  // Estas cores não são usadas diretamente no ChatMessageItem se ele tiver lógica interna,
  // mas podem ser úteis para outros elementos ou para manter consistência
  readIndicator: '#00BFFF',
  deliveredIndicator: '#AAAAAA',
};

export default function AdminChatRoomScreen({ route, navigation }) {
  const { chatId, userId, userName: initialUserName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [contact, setContact] = useState({ name: initialUserName || 'Carregando...', avatar: null });
  const [sending, setSending] = useState(false);
  // O clientLastMessageTimestamp é o 'lastReplyTime' para o ChatMessageItem
  const [clientLastMessageTimestamp, setClientLastMessageTimestamp] = useState(null);
  const flatListRef = useRef();

  // --- Efeito para buscar informações do contato ---
  useEffect(() => {
    if (!userId) {
      setContact({ name: 'Cliente Desconhecido', avatar: null });
      return;
    }

    const fetchContactData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.adminId !== auth.currentUser.uid) {
            console.warn('Alerta de Segurança: Este cliente não pertence ao admin logado!');
            Alert.alert('Erro de Acesso', 'Você não tem permissão para aceder a esta conversa.');
            navigation.goBack();
            return;
          }
          setContact({
            name: data.name || 'Cliente',
            avatar: data.avatar || null,
          });
        } else {
          setContact({ name: 'Cliente', avatar: null });
          Alert.alert('Erro', 'Cliente não encontrado. A conversa pode estar corrompida.');
        }
      } catch (error) {
        console.error('Erro ao buscar contato do cliente:', error);
        setContact({ name: 'Cliente', avatar: null });
        Alert.alert('Erro', 'Não foi possível carregar informações do cliente.');
      }
    };

    fetchContactData();
  }, [userId, navigation]);

  // --- Efeito para escutar mensagens e dados do chat principal ---
  useEffect(() => {
    if (!chatId) return;

    // Listener para as mensagens da subcoleção
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      // Aqui adicionamos o chatId a cada mensagem para o resendMessage funcionar
      const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, chatId: chatId, ...doc.data() }));
      setMessages(fetchedMessages);

      // Marca a última mensagem do cliente encontrada na coleção
      const lastClientMessage = fetchedMessages
        .filter(msg => msg.senderId === userId && msg.createdAt)
        .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
        .at(0);

      // Definimos o lastReplyTime (clientLastMessageTimestamp) aqui
      setClientLastMessageTimestamp(lastClientMessage?.createdAt?.toDate ? lastClientMessage.createdAt.toDate() : null);

      // Marca como lidas as mensagens do cliente que o admin não leu
      const unreadMessagesFromClient = fetchedMessages.filter(
        msg => msg.senderId === userId && !msg.lida
      );
      if (unreadMessagesFromClient.length > 0) {
        try {
          await Promise.all(
            unreadMessagesFromClient.map(msg =>
              updateDoc(doc(db, 'chats', chatId, 'messages', msg.id), { lida: true })
            )
          );
        } catch (error) {
          console.error('Erro ao marcar mensagens do cliente como lidas:', error);
        }
      }

      // Atualiza o timestamp de última leitura do ADMIN no chat principal (para o CLIENTE saber que o admin leu)
      if (fetchedMessages.length > 0 && auth.currentUser) {
        try {
          await updateDoc(doc(db, 'chats', chatId), {
            [`lastReadTimestamps.${auth.currentUser.uid}`]: serverTimestamp(),
          });
        } catch (error) {
          console.error('Erro ao atualizar timestamp de leitura do admin:', error);
        }
      }

      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    });

    // Não precisamos de um listener separado para clientLastReadTimestamp aqui
    // porque o ChatMessageItem está a usar message.lida e lastReplyTime.
    // O `lastReadTimestamps` do chat principal é mais para o *cliente* saber
    // quando o admin leu, não para o admin saber quando o cliente leu as próprias mensagens.
    // O ChatMessageItem depende do `message.lida` na mensagem do Firebase.

    // O onSnapshot acima já marca as mensagens do cliente como lidas no Firebase (`lida: true`),
    // o que por sua vez, deve acionar a lógica do cliente para mostrar o visto azul nas mensagens que o cliente enviou.

    // Apenas retorne a função de limpeza para o listener de mensagens
    return () => {
      unsubscribeMessages();
      // Não precisamos de unsubscribeChatDoc se não o configurarmos
    };
  }, [chatId, userId]);


  // --- Função para enviar mensagens ---
  const sendMessage = useCallback(async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    const trimmedText = text.trim();

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: trimmedText,
        senderId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        lida: false, // Mensagem enviada pelo admin, ainda não lida pelo cliente
      });

      // Atualiza lastMessage no documento principal do chat
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: trimmedText,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp(),
        },
      });

      setText('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  }, [chatId, text, sending]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Barra de cabeçalho fixa */}
      <View style={styles.headerBar}>
        {contact.avatar ? (
          <Image source={{ uri: contact.avatar }} style={styles.avatar} />
        ) : (
          <Ionicons name="person-circle-outline" size={40} color={Colors.primary} />
        )}
        <Text style={styles.headerTitle}>{contact.name}</Text>
      </View>

      {/* Lista de Mensagens */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isMyMessage = item.senderId === auth.currentUser.uid;
          // Não precisamos mais de isRead e isDelivered aqui,
          // pois a lógica está no ChatMessageItem e ele usa `message.lida`
          // e o `lastReplyTime` que estamos a passar.

          return (
            <ChatMessageItem
              message={item}
              senderName={isMyMessage ? 'Você (Admin)' : contact.name}
              // Passamos o clientLastMessageTimestamp como lastReplyTime
              lastReplyTime={clientLastMessageTimestamp}
              chatId={chatId} // Passamos o chatId para a função de reenvio
            />
          );
        }}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        style={styles.flatList}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {/* Container de Input de Mensagem */}
      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Digite uma mensagem..."
          style={[styles.input, sending && styles.inputDisabled]}
          multiline
          editable={!sending}
          placeholderTextColor={Colors.disabled}
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendButton, (sending || !text.trim()) && styles.sendButtonDisabled]}
          disabled={sending || !text.trim()}
          activeOpacity={0.7}
        >
          {sending ? <ActivityIndicator size="small" color={Colors.textLight} /> : <Ionicons name="send" size={24} color={Colors.textLight} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  flatList: {
    marginTop: 56,
  },
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBackground,
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -1 },
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: Colors.textDark,
    maxHeight: 120,
    lineHeight: Platform.OS === 'ios' ? 20 : 22,
  },
  inputDisabled: {
    backgroundColor: Colors.disabled,
    opacity: 0.6,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 26,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
});