import React, { useState, useCallback, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet
} from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { UnreadContext } from '../../contexts/UnreadContext';

export default function AdminChatListScreen() {
  const [clientsWithChat, setClientsWithChat] = useState([]);
  const [clientsWithoutChat, setClientsWithoutChat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({});
  const [showNewChatList, setShowNewChatList] = useState(false);
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(UnreadContext);

  useFocusEffect(
    useCallback(() => {
      let unsubscribers = [];
      setLoading(true);

      const fetchClientsWithChats = async () => {
        try {
          const userQuery = query(
            collection(db, 'users'),
            where('role', '==', 'user'),
            where('adminId', '==', auth.currentUser.uid)
          );
          const userSnap = await getDocs(userQuery);
          const allClients = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const chatQuery = query(
            collection(db, 'chats'),
            where('isGroup', '==', false),
            where('participants', 'array-contains', auth.currentUser.uid)
          );
          const chatSnap = await getDocs(chatQuery);

          const relevantChats = chatSnap.docs.filter(chat => {
            const data = chat.data();
            return data.participants.length === 2;
          });

          const chatClients = allClients.filter(client =>
            relevantChats.some(chat =>
              chat.data().participants.includes(client.id)
            )
          );

          setClientsWithChat(chatClients);
          setChatInfo({});

          const clientIdsWithChats = chatClients.map(client => client.id);
          const clientsNoChat = allClients.filter(client => !clientIdsWithChats.includes(client.id));
          setClientsWithoutChat(clientsNoChat);

          chatClients.forEach((client) => {
            const existingChat = relevantChats.find(chat =>
              chat.data().participants.includes(client.id)
            );

            if (existingChat) {
              const chatId = existingChat.id;

              const unsubscribe = onSnapshot(
                collection(db, 'chats', chatId, 'messages'),
                (snapshot) => {
                  const messages = snapshot.docs.map(doc => doc.data());
                  const lastMsg = messages[messages.length - 1];

                  const unreadCount = messages.filter(
                    msg => !msg.lida && msg.senderId !== auth.currentUser.uid
                  ).length;

                  setChatInfo(prev => {
                    const newInfo = {
                      ...prev,
                      [client.id]: {
                        chatId,
                        lastMessage: lastMsg?.text || '',
                        lastSender: lastMsg?.senderId === auth.currentUser.uid ? 'Você' : client.name || 'Cliente',
                        lastTime: lastMsg?.createdAt?.toDate() || null,
                        unreadCount,
                      },
                    };

                    const totalUnread = Object.values(newInfo).reduce(
                      (sum, info) => sum + (info?.unreadCount || 0),
                      0
                    );
                    setUnreadCount(totalUnread);

                    return newInfo;
                  });
                }
              );

              unsubscribers.push(unsubscribe);
            }
          });

        } catch (error) {
          console.error('Erro ao buscar chats/clientes:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchClientsWithChats();

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }, [])
  );

  const createChat = async (client) => {
    try {
      const chatQuery = query(
        collection(db, 'chats'),
        where('isGroup', '==', false),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const chatSnapshot = await getDocs(chatQuery);
      const existingChat = chatSnapshot.docs.find(doc => {
        const participants = doc.data().participants;
        return (
          participants.length === 2 &&
          participants.includes(client.id)
        );
      });

      if (existingChat) {
        navigation.navigate('AdminChatRoom', {
          chatId: existingChat.id,
          userId: client.id,
        });
        return;
      }

      const newChatRef = await addDoc(collection(db, 'chats'), {
        isGroup: false,
        participants: [auth.currentUser.uid, client.id],
        createdAt: serverTimestamp(),
      });

      navigation.navigate('AdminChatRoom', {
        chatId: newChatRef.id,
        userId: client.id,
      });
    } catch (error) {
      console.error('Erro ao criar chat:', error);
    }
  };

  const getInitial = (user) => {
    const name = user.name || user.email || '';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d0a956" />
      </View>
    );
  }

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Seus chats com clientes:</Text>

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => setShowNewChatList(!showNewChatList)}
      >
        <Text style={styles.newChatButtonText}>
          {showNewChatList ? 'Fechar lista de clientes' : 'Iniciar nova conversa'}
        </Text>
      </TouchableOpacity>

      {showNewChatList && (
        <FlatList
          data={clientsWithoutChat}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.newChatItem}
              onPress={() => createChat(item)}
            >
              <Text style={styles.newChatItemText}>{item.name || item.email}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={<Text style={styles.emptyText}>Todos os clientes já têm conversa.</Text>}
          contentContainerStyle={clientsWithoutChat.length === 0 && styles.emptyContainer}
        />
      )}

      <FlatList
        data={clientsWithChat}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const info = chatInfo[item.id];
          const hasUnread = info?.unreadCount > 0;

          return (
            <TouchableOpacity
              style={[styles.userItem, hasUnread && styles.userItemUnread]}
              onPress={() => createChat(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitial(item)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.userName}>{item.name || item.email}</Text>
                  {hasUnread && <View style={styles.notificationDot} />}
                </View>
                {info && (
                  <View style={styles.lastMessageRow}>
                    <Text
                      style={[
                        styles.lastMessageText,
                        hasUnread && styles.lastMessageTextUnread
                      ]}
                      numberOfLines={1}
                    >
                      {info.lastSender}: {info.lastMessage}
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
          <Text style={styles.emptyText}>Nenhuma conversa encontrada.</Text>
        }
        contentContainerStyle={clientsWithChat.length === 0 && styles.emptyContainer}
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
    color: '#4b3b00',
    textAlign: 'center',
  },
  newChatButton: {
    backgroundColor: '#4b3b00',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  newChatButtonText: {
    color: '#fff8dc',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  newChatItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f4e2a0',
    borderRadius: 10,
    marginBottom: 10,
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
  },
  userItemUnread: {
    borderWidth: 2,
    borderColor: '#b35400',
  },
  avatar: {
    backgroundColor: '#fff8dc',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#a17f00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#4b3b00',
    fontSize: 22,
    fontWeight: '900',
  },
  userName: {
    fontSize: 19,
    fontWeight: '600',
    color: '#4b3b00',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    paddingVertical: 2,
    alignSelf: 'flex-start',
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
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginTop: 60,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
