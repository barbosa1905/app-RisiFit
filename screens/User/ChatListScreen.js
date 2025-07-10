import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

export default function ChatListScreen() {
  const [chats, setChats] = useState([]);
  const [userNames, setUserNames] = useState({});
  const navigation = useNavigation();

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setChats(chatData);

      // Buscar nomes dos outros participantes
      for (const chat of chatData) {
        const otherUserId = chat.participants.find(id => id !== auth.currentUser.uid);
        if (otherUserId && !userNames[otherUserId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const nome = userDoc.data().name || 'Usuário';
              setUserNames(prev => {
                if (prev[otherUserId]) return prev;
                return { ...prev, [otherUserId]: nome };
              });
            } else {
              setUserNames(prev => ({ ...prev, [otherUserId]: 'Usuário' }));
            }
          } catch (error) {
            console.error('Erro ao buscar nome do utilizador:', error);
          }
        }
      }
    });

    return unsubscribe;
  }, []);

  const renderItem = ({ item }) => {
    const otherUserId = item.participants.find(id => id !== auth.currentUser.uid);
    const nome = item.isGroup ? item.name : userNames[otherUserId] || '...';

    // Verificação de mensagens não lidas
    const lastMessageTime = item.lastMessage?.timestamp?.toDate?.();
    const lastRead = item.lastReadTimestamps?.[auth.currentUser.uid]?.toDate?.();
    const hasUnread = lastMessageTime && (!lastRead || lastMessageTime > lastRead);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('UserChatRoom', {
            chatId: item.id,
            userId: otherUserId,
          })
        }
      >
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle}>{nome}</Text>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingVertical: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  chatItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: {
    fontSize: 16,
    color: '#007bff',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginLeft: 10,
  },
});
