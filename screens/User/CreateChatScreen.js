import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert
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

// --- CONSTANTES E ESTILOS ---

// Altura da barra fixa do cabeçalho
const FIXED_HEADER_HEIGHT = Platform.OS === 'android' ? 90 : 80;

// Novas cores (mantidas da paleta)
const COLORS = {
  primary: '#d4ac54',      // color1
  lightPrimary: '#e0c892',   // color2
  darkPrimary: '#69511a',    // color3
  neutralGray: '#767676',    // color4
  lightGray: '#bdbdbd',      // color5
  white: '#fff',
  black: '#1a1a1a',
  background: '#fafafa',
  unreadRed: '#e53935',
  avatarShadow: 'rgba(0, 0, 0, 0.2)', // Ajustado para ser mais genérico
};

export default function CreateChatScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState({});
  const navigation = useNavigation();
  const { setUnreadCount } = useContext(UnreadContext);

  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('');

  // useRef para armazenar os unsubscribers e garantir que são limpos
  const unsubscribersRef = useRef([]);

  const cleanupUnsubscribers = () => {
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
  };

  useFocusEffect(
    useCallback(() => {
      const fetchAdminsAndChats = async () => {
        setLoading(true);
        cleanupUnsubscribers(); // Limpa listeners anteriores antes de carregar novos

        try {
          const currentUserId = auth.currentUser?.uid;
          if (!currentUserId) {
            Alert.alert('Erro', 'Usuário não autenticado.');
            navigation.goBack();
            return;
          }

          // 1. Buscar dados do utilizador logado para o cabeçalho
          const userDocRef = doc(db, 'users', currentUserId);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserName(userData.name || 'Utilizador');
            setUserInitial(userData.name ? userData.name.charAt(0).toUpperCase() : 'U');
          } else {
            setUserName('Utilizador');
            setUserInitial('U');
          }

          // 2. Buscar administradores
          const q = query(collection(db, 'users'), where('role', '==', 'admin'));
          const querySnapshot = await getDocs(q);
          const usersList = querySnapshot.docs
            .map(doc => ({ uid: doc.id, ...doc.data() }))
            .filter(user => user.uid !== currentUserId);
          
          setUsers(usersList);

          // 3. Configurar ouvintes para cada chat com um administrador
          const newChatInfo = {};
          let totalUnread = 0;
          
          usersList.forEach(adminUser => {
            const chatQuery = query(
              collection(db, 'chats'),
              where('isGroup', '==', false),
              where('participants', 'array-contains', currentUserId)
            );

            const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
              const existingChat = snapshot.docs.find(doc => {
                const data = doc.data();
                const participants = data.participants || [];
                return (
                  participants.length === 2 &&
                  participants.includes(adminUser.uid)
                );
              });

              if (existingChat) {
                const chatId = existingChat.id;

                // Sub-ouvinte para as mensagens do chat
                const messagesUnsubscribe = onSnapshot(
                  collection(db, 'chats', chatId, 'messages'),
                  (messagesSnapshot) => {
                    const messages = messagesSnapshot.docs.map(doc => doc.data());
                    const lastMsg = messages[messages.length - 1];

                    const unreadCount = messages.filter(
                      msg => !msg.lida && msg.senderId !== currentUserId
                    ).length;
                    
                    newChatInfo[adminUser.uid] = {
                      chatId,
                      lastMessage: lastMsg?.text || '',
                      lastSender: lastMsg?.senderId === currentUserId ? 'Você' : adminUser.name || 'Admin',
                      lastTime: lastMsg?.createdAt?.toDate() || null,
                      unreadCount,
                    };
                    
                    // Recalcula o total de não lidas e atualiza o contexto
                    totalUnread = Object.values(newChatInfo).reduce(
                      (sum, info) => sum + (info?.unreadCount || 0),
                      0
                    );
                    setUnreadCount(totalUnread);
                    setChatInfo({ ...newChatInfo }); // Atualiza o estado
                  }
                );
                unsubscribersRef.current.push(messagesUnsubscribe);
              } else {
                // Caso não exista chat, limpa a informação
                setChatInfo(prev => {
                  const newPrev = { ...prev };
                  delete newPrev[adminUser.uid];
                  return newPrev;
                });
              }
            });
            unsubscribersRef.current.push(unsubscribe);
          });
        } catch (error) {
          console.error('Erro ao buscar dados:', error);
          Alert.alert('Erro', `Não foi possível carregar os dados. (${error.message})`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchAdminsAndChats();

      return () => {
        // A função de limpeza do useFocusEffect é chamada ao sair do ecrã
        cleanupUnsubscribers();
      };
    }, [navigation])
  );

  const createChat = async (user) => {
    try {
      const currentUserId = auth.currentUser?.uid;
      if (!currentUserId) return;

      const info = chatInfo[user.uid];
      if (info && info.chatId) {
        navigation.navigate('UserChatRoom', {
          chatId: info.chatId,
          userId: user.uid,
        });
        return;
      }

      // Se não houver chat, cria um novo
      const newChatRef = await addDoc(collection(db, 'chats'), {
        isGroup: false,
        participants: [currentUserId, user.uid],
        createdAt: serverTimestamp(),
      });

      navigation.navigate('UserChatRoom', {
        chatId: newChatRef.id,
        userId: user.uid,
      });
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      Alert.alert('Erro', 'Não foi possível iniciar o chat.');
    }
  };

  const getInitial = (user) => {
    const name = user.name || user.email || '';
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: FIXED_HEADER_HEIGHT }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>A carregar administradores...</Text>
      </View>
    );
  }

  const ItemSeparator = () => <View style={styles.separator} />;

  return (
    <View style={styles.fullScreenContainer}>
      {/* Cabeçalho Fixo */}
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
          const lastMessageText = info ? `${info.lastSender}: ${info.lastMessage}` : 'Iniciar nova conversa';

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
                <Text style={styles.userName}>{item.name || item.email}</Text>
                <View style={styles.lastMessageRow}>
                  <Text
                    style={[
                      styles.lastMessageText,
                      hasUnread && styles.lastMessageTextUnread
                    ]}
                    numberOfLines={1}
                  >
                    {lastMessageText}
                  </Text>
                  {info?.lastTime && (
                    <Text style={styles.lastMessageTime}>
                      {moment(info.lastTime).format('HH:mm')}
                    </Text>
                  )}
                </View>
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
          <Text style={styles.title}>Conversas com Administradores</Text>
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

// --- ESTILOS ---
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
    backgroundColor: '#B8860B', // Cor Alterada para B8860B
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
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
    borderWidth: 1,
    borderColor: COLORS.darkPrimary,
  },
  headerAvatarText: {
    color: COLORS.primary,
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 25,
    color: COLORS.darkPrimary,
    textAlign: 'center',
    marginTop: 0,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  userItemUnread: {
    backgroundColor: '#fffbe5', // Um amarelo claro para destaque
    borderWidth: 2,
    borderColor: COLORS.unreadRed,
  },
  avatar: {
    backgroundColor: COLORS.lightPrimary,
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
    color: COLORS.darkPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  userName: {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.darkPrimary,
  },
  lastMessageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  lastMessageText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.neutralGray,
    marginRight: 10,
  },
  lastMessageTextUnread: {
    fontWeight: 'bold',
    color: COLORS.black,
  },
  lastMessageTime: {
    fontSize: 12,
    color: COLORS.neutralGray,
  },
  unreadBadge: {
    backgroundColor: COLORS.unreadRed,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 12,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.neutralGray,
    textAlign: 'center',
    marginTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.neutralGray,
  },
});