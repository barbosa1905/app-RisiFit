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

export default function CreateChatScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({});
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(UnreadContext);

  useFocusEffect(
    useCallback(() => {
      let unsubscribers = [];
      setLoading(true);

      const fetchAdminsAndChats = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'admin'));
          const querySnapshot = await getDocs(q);
          const usersList = querySnapshot.docs
            .map(doc => ({ uid: doc.id, ...doc.data() }))
            .filter(user => user.uid !== auth.currentUser.uid);

          setUsers(usersList);

          setChatInfo({}); // Limpa info antes de carregar

          usersList.forEach(async (user) => {
            const chatQuery = query(
              collection(db, 'chats'),
              where('isGroup', '==', false),
              where('participants', 'array-contains', auth.currentUser.uid)
            );

            const chatSnapshot = await getDocs(chatQuery);
            const existingChat = chatSnapshot.docs.find(doc => {
              const data = doc.data();
              const participants = data.participants || [];
              // Confirma chat só com estes dois participantes
              return (
                participants.length === 2 &&
                participants.includes(auth.currentUser.uid) &&
                participants.includes(user.uid)
              );
            });

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
                      [user.uid]: {
                        chatId,
                        lastMessage: lastMsg?.text || '',
                        lastSender: lastMsg?.senderId === auth.currentUser.uid ? 'Você' : user.name || 'Admin',
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
          console.error('Erro ao buscar usuários:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAdminsAndChats();

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }, [])
  );

  const createChat = async (user) => {
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
          participants.includes(user.uid)
        );
      });

      if (existingChat) {
        navigation.navigate('UserChatRoom', {
          chatId: existingChat.id,
          userId: user.uid,
        });
        return;
      }

      const newChatRef = await addDoc(collection(db, 'chats'), {
        isGroup: false,
        participants: [auth.currentUser.uid, user.uid],
        createdAt: serverTimestamp(),
      });

      navigation.navigate('UserChatRoom', {
        chatId: newChatRef.id,
        userId: user.uid,
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
      <Text style={styles.title}>Escolha um administrador para iniciar o chat:</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.uid}
        renderItem={({ item }) => {
          const info = chatInfo[item.uid];
          const hasUnread = info?.unreadCount > 0;

          return (
            <TouchableOpacity
              style={[
                styles.userItem,
                hasUnread && styles.userItemUnread
              ]}
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
          <Text style={styles.emptyText}>Nenhum administrador encontrado.</Text>
        }
        contentContainerStyle={users.length === 0 && styles.emptyContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 25,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d0a956',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#d0a956',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  userItemUnread: {
    borderWidth: 2,
    borderColor: '#e53935',
  },
  avatar: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#5a31f4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
  },
  userName: {
    fontSize: 19,
    fontWeight: '600',
    color: '#222',
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  lastMessageTextUnread: {
    fontWeight: 'bold',
    color: '#000',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#555',
  },
  unreadBadge: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e53935',
    marginLeft: 8,
    alignSelf: 'center',
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
    alignItems: 'center'    






  },
});





