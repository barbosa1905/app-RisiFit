import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { UnreadContext } from '../../contexts/UnreadContext';
import { obterNomeCliente } from '../../utils/clienteUtils'; // Certifique-se de que este import está correto

export default function AdminChatListScreen() {
  const [clientsWithChat, setClientsWithChat] = useState([]);
  const [clientsWithoutChat, setClientsWithoutChat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({}); // Contém chatId, lastMessage, lastSender, lastTime, unreadCount
  const [showNewChatList, setShowNewChatList] = useState(false);
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(UnreadContext);

  // Use useRef para armazenar unsubscribers para limpeza
  const unsubscribersRef = useRef([]);

  // --- Efeito para calcular e atualizar o UnreadCount global ---
  // Este useEffect é executado sempre que 'chatInfo' muda, mas APÓS a renderização do componente.
  useEffect(() => {
    const total = Object.values(chatInfo).reduce(
      (sum, info) => sum + (info?.unreadCount || 0),
      0
    );
    setUnreadCount(total);
  }, [chatInfo, setUnreadCount]); // Depende de chatInfo e setUnreadCount (que é estável)

  // --- Funções Auxiliares de Busca ---

  // Função para buscar clientes e configurar listeners para chats existentes
  const fetchAndSetupChatListeners = useCallback(async () => {
    setLoading(true);
    try {
      const adminId = auth.currentUser.uid;

      // 1. Buscar todos os clientes associados a este admin
      const userQuery = query(
        collection(db, 'users'),
        where('role', '==', 'user'),
        where('adminId', '==', adminId)
      );
      const userSnap = await getDocs(userQuery);
      const allClients = userSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 2. Buscar todos os chats onde o admin é participante e que não são grupos
      const chatQuery = query(
        collection(db, 'chats'),
        where('isGroup', '==', false),
        where('participants', 'array-contains', adminId)
      );
      const chatSnap = await getDocs(chatQuery);

      const existingChatsMap = new Map();
      const clientIdsInChats = new Set();

      chatSnap.docs.forEach((chatDoc) => {
        const data = chatDoc.data();
        if (data.participants.length === 2 && data.participants.includes(adminId)) {
          const otherParticipantId = data.participants.find((id) => id !== adminId);
          existingChatsMap.set(otherParticipantId, { chatId: chatDoc.id, data: data });
          clientIdsInChats.add(otherParticipantId);
        }
      });

      // 3. Classificar clientes
      const clientsWithExistingChat = [];
      const clientsWithoutExistingChat = [];

      allClients.forEach((client) => {
        if (clientIdsInChats.has(client.id)) {
          clientsWithExistingChat.push(client);
        } else {
          clientsWithoutExistingChat.push(client);
        }
      });

      setClientsWithChat(clientsWithExistingChat);
      setClientsWithoutChat(clientsWithoutExistingChat);

      // --- Configuração dos Listeners para cada chat ---
      // Limpa listeners antigos antes de configurar novos
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = []; // Resetar array de unsubscribers

      // Resetar chatInfo para garantir que não haja informações antigas antes de preencher
      setChatInfo({});

      clientsWithExistingChat.forEach((client) => {
        const chatEntry = existingChatsMap.get(client.id);
        if (chatEntry) {
          const chatId = chatEntry.chatId;

          const unsubscribe = onSnapshot(
            collection(db, 'chats', chatId, 'messages'),
            (snapshot) => {
              const messages = snapshot.docs.map((doc) => doc.data());
              const lastMsg = messages[messages.length - 1];

              const unreadCountForThisChat = messages.filter(
                (msg) => !msg.lida && msg.senderId !== auth.currentUser.uid
              ).length;

              // ATENÇÃO: AQUI APENAS ATUALIZAMOS O ESTADO LOCAL 'chatInfo'
              // O useEffect acima irá lidar com a atualização do 'UnreadContext'
              setChatInfo(prev => ({
                ...prev,
                [client.id]: {
                  chatId: chatId,
                  lastMessage: lastMsg?.text || '',
                  lastSender:
                    lastMsg?.senderId === auth.currentUser.uid
                      ? 'Você'
                      : obterNomeCliente(client) || 'Cliente',
                  lastTime: lastMsg?.createdAt?.toDate() || null,
                  unreadCount: unreadCountForThisChat,
                },
              }));
            },
            (error) => {
              console.error('Erro ao ouvir mensagens do chat:', error);
            }
          );
          unsubscribersRef.current.push(unsubscribe); // Armazenar o unsubscriber
        }
      });

    } catch (error) {
      console.error('Erro ao buscar dados de clientes e chats:', error);
      Alert.alert('Erro', 'Não foi possível carregar as conversas.');
    } finally {
      setLoading(false);
    }
  }, []); // Sem dependências que mudem frequentemente para esta função principal

  // useFocusEffect para carregar dados e configurar listeners quando a tela está em foco
  useFocusEffect(
    useCallback(() => {
      fetchAndSetupChatListeners(); // Chama a função que busca dados e configura listeners

      return () => {
        // Limpeza: desativar todos os listeners ao sair da tela
        unsubscribersRef.current.forEach((unsub) => unsub());
        unsubscribersRef.current = []; // Limpa o array

        // Limpar estados ao sair para evitar flashes de dados antigos
        setClientsWithChat([]);
        setClientsWithoutChat([]);
        setChatInfo({});
        setUnreadCount(0); // Resetar contagem de não lidas do contexto
      };
    }, [fetchAndSetupChatListeners, setUnreadCount])
  ); // Depende da função de fetch (que é estável) e setUnreadCount

  // --- Lógica de Criação de Chat ---
  const createChat = async (client) => {
    try {
      const adminId = auth.currentUser.uid;
      const existingChatQuery = query(
        collection(db, 'chats'),
        where('isGroup', '==', false),
        where('participants', 'array-contains', adminId),
        where('participants', 'array-contains', client.id)
      );
      const existingChatSnapshot = await getDocs(existingChatQuery);

      let chatIdToNavigate = null;

      if (!existingChatSnapshot.empty) {
        existingChatSnapshot.docs.forEach(doc => {
          const participants = doc.data().participants;
          if (participants.length === 2 && participants.includes(adminId) && participants.includes(client.id)) {
            chatIdToNavigate = doc.id;
          }
        });
      }

      if (chatIdToNavigate) {
        navigation.navigate('AdminChatRoom', {
          chatId: chatIdToNavigate,
          userId: client.id,
          userName: obterNomeCliente(client),
        });
        setShowNewChatList(false);
        return;
      }

      const newChatRef = await addDoc(collection(db, 'chats'), {
        isGroup: false,
        participants: [adminId, client.id],
        createdAt: serverTimestamp(),
      });

      // Após criar um novo chat, recarregamos tudo para que o novo chat apareça e seja monitorizado
      await fetchAndSetupChatListeners(); 

      navigation.navigate('AdminChatRoom', {
        chatId: newChatRef.id,
        userId: client.id,
        userName: obterNomeCliente(client),
      });
      setShowNewChatList(false);
    } catch (error) {
      console.error('Erro ao criar ou navegar para o chat:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
    }
  };

  // --- Função para Obter Inicial do Avatar ---
  const getInitial = (user) => {
    const name = user.name || user.email || '';
    return name.charAt(0).toUpperCase();
  };

  // --- Renderização Condicional ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d0a956" />
        <Text style={styles.loadingText}>A carregar conversas...</Text>
      </View>
    );
  }

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suas Conversas</Text>

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => setShowNewChatList(!showNewChatList)}
      >
        <Text style={styles.newChatButtonText}>
          {showNewChatList ? 'Esconder Clientes sem Conversa' : 'Iniciar Nova Conversa'}
        </Text>
      </TouchableOpacity>

      {showNewChatList && (
        <>
          <Text style={styles.sectionTitle}>Clientes sem conversa:</Text>
          <FlatList
            data={clientsWithoutChat}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.newChatItem}
                onPress={() => createChat(item)}
              >
                <Text style={styles.newChatItemText}>{obterNomeCliente(item)}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={ItemSeparator}
            ListEmptyComponent={
              <Text style={styles.infoText}>Todos os clientes já têm uma conversa.</Text>
            }
            contentContainerStyle={clientsWithoutChat.length === 0 && styles.emptyListContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}

      {clientsWithChat.length > 0 && !showNewChatList && (
        <Text style={styles.sectionTitle}>Conversas existentes:</Text>
      )}

      <FlatList
        data={clientsWithChat}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const info = chatInfo[item.id];
          const hasUnread = info?.unreadCount > 0;

          return (
            <TouchableOpacity
              style={[styles.userItem, hasUnread && styles.userItemUnread]}
              onPress={() =>
                navigation.navigate('AdminChatRoom', {
                  chatId: info?.chatId,
                  userId: item.id,
                  userName: obterNomeCliente(item),
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(item)}</Text>
              </View>
              <View style={styles.chatDetailsContainer}>
                <View style={styles.chatHeader}>
                  <Text style={styles.userName}>{obterNomeCliente(item)}</Text>
                  {hasUnread && <View style={styles.notificationDot} />}
                </View>
                {info && (
                  <View style={styles.lastMessageRow}>
                    <Text
                      style={[
                        styles.lastMessageText,
                        hasUnread && styles.lastMessageTextUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {info.lastSender}: {info.lastMessage || 'Nenhuma mensagem ainda.'}
                    </Text>
                    <Text style={styles.lastMessageTime}>
                      {info.lastTime ? moment(info.lastTime).format('HH:mm') : ''}
                    </Text>
                  </View>
                )}
              </View>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{info.unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={
          !showNewChatList && (
            <Text style={styles.infoText}>Nenhuma conversa existente. Inicie uma nova!</Text>
          )
        }
        contentContainerStyle={clientsWithChat.length === 0 && !showNewChatList && styles.emptyListContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8e1',
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4b3b00',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 25,
    color: '#4b3b00',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4b3b00',
    marginTop: 15,
    marginBottom: 10,
  },
  newChatButton: {
    backgroundColor: '#4b3b00',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  newChatButtonText: {
    color: '#fff8dc',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 17,
  },
  newChatItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f4e2a0',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0d080',
  },
  newChatItemText: {
    fontSize: 16,
    color: '#4b3b00',
    fontWeight: '500',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d0a956',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#a17f00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 12,
  },
  userItemUnread: {
    borderWidth: 2,
    borderColor: '#b35400',
  },
  avatar: {
    backgroundColor: '#fff8dc',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#a17f00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#4b3b00',
    fontSize: 24,
    fontWeight: '900',
  },
  chatDetailsContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  userName: {
    fontSize: 19,
    fontWeight: '600',
    color: '#4b3b00',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#6b5a00',
    marginRight: 10,
  },
  lastMessageTextUnread: {
    fontWeight: 'bold',
    color: '#4b3b00',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#8c7b00',
  },
  unreadBadge: {
    backgroundColor: '#b35400',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff8dc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#b35400',
    marginLeft: 8,
  },
  separator: {
    height: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 50,
  },
});