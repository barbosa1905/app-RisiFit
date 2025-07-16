import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Platform
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
  doc, getDoc
} from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { UnreadContext } from '../../contexts/UnreadContext';

// Altura da barra fixa do cabeçalho
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 90 : 80;

// Novas cores
const COLORS = {
  primary: '#d4ac54',      // color1
  lightPrimary: '#e0c892',   // color2 (não usado diretamente neste arquivo, mas mantido na paleta)
  darkPrimary: '#69511a',    // color3
  neutralGray: '#767676',    // color4
  lightGray: '#bdbdbd',      // color5 (não usado diretamente neste arquivo, mas mantido na paleta)
  white: '#fff',
  black: '#1a1a1a',          // Um preto mais genérico para textos
  background: '#fafafa',     // Fundo geral
  unreadRed: '#e53935',      // Cor para indicadores de não lidas (mantida)
  avatarShadow: '#5a31f4',   // Cor da sombra do avatar (mantida)
};

export default function CreateChatScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({});
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(UnreadContext);

  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  useFocusEffect(
    useCallback(() => {
      let unsubscribers = [];
      setLoading(true);

      const fetchAdminsAndChats = async () => {
        try {
          // 1. Buscar dados do utilizador logado para o cabeçalho
          if (auth.currentUser) {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              setUserName(userData.name || 'Utilizador');
              setUserInitial(userData.name ? userData.name.charAt(0).toUpperCase() : 'U');
            } else {
              setUserName('Utilizador');
              setUserInitial('U');
            }
          }

          // 2. Buscar administradores
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
          console.error('Erro ao buscar usuários ou dados do usuário:', error);
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar dados...</Text>
      </View>
    );
  }

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.fullScreenContainer}>
      {/* Cabeçalho Fixo (Barra Fixa) */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerUserInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{userInitial}</Text>
          </View>
          <Text style={styles.headerUserName}>{userName}</Text>
        </View>
        <Text style={styles.headerAppName}>RisiFit</Text>
      </View>

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
        ListHeaderComponent={
          <Text style={styles.title}>Escolha um administrador para iniciar o chat:</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum administrador encontrado.</Text>
        }
        contentContainerStyle={styles.flatListContentContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FIXED_HEADER_HEIGHT,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    backgroundColor: COLORS.primary, // color1
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 10,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: COLORS.primary, // color1
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  flatListContentContainer: {
    paddingHorizontal: 24,
    paddingTop: FIXED_HEADER_HEIGHT + 20,
    paddingBottom: 20,
  },
  // 'container' style was removed as 'fullScreenContainer' and 'flatListContentContainer' manage layout
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 25,
    color: COLORS.darkPrimary, // color3
    textAlign: 'center',
    marginTop: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary, // color1
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: COLORS.primary, // color1
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  userItemUnread: {
    borderWidth: 2,
    borderColor: COLORS.unreadRed,
  },
  avatar: {
    backgroundColor: COLORS.white,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: COLORS.avatarShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: COLORS.darkPrimary, // color3
    fontSize: 22,
    fontWeight: '900',
  },
  userName: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.white, // Branco
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white, // Branco
    marginRight: 10,
  },
  lastMessageTextUnread: {
    fontWeight: 'bold',
    color: COLORS.black, // Preto para destaque
  },
  lastMessageTime: {
    fontSize: 12,
    color: COLORS.neutralGray, // color4
  },
  unreadBadge: {
    backgroundColor: COLORS.unreadRed,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.unreadRed,
    marginLeft: 8,
    alignSelf: 'center',
  },
  separator: {
    height: 12,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.neutralGray, // color4
    textAlign: 'center',
    marginTop: 60,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: FIXED_HEADER_HEIGHT,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingTop: FIXED_HEADER_HEIGHT,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.neutralGray, // color4
  },
});
