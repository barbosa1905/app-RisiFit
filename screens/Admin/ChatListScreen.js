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
        const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChats(chatData);

        // Busca os nomes dos usuários de forma paralela
        const nomesPromises = chatData.map(async (chat) => {
          const otherUserId = chat.participants.find(id => id !== auth.currentUser.uid);
          if (!otherUserId || userNames[otherUserId]) return null;

          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            const nome = userDoc.exists() ? userDoc.data().name || 'Usuário' : 'Usuário';
            return { [otherUserId]: nome };
          } catch (error) {
            console.error('Erro ao buscar nome do usuário:', error);
            return { [otherUserId]: 'Usuário' };
          }
        });

        const nomes = await Promise.all(nomesPromises);
        const nomesMap = Object.assign({}, ...nomes.filter(Boolean));

        setUserNames(prev => ({ ...prev, ...nomesMap }));
      });

      return () => unsubscribe();
    }, [userNames]);

    const renderItem = ({ item }) => {
      const otherUserId = item.participants.find(id => id !== auth.currentUser.uid);
      const nome = item.isGroup ? item.name : userNames[otherUserId] || '...';

      return (
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() =>
            navigation.navigate('AdminChatRoom', {
              chatId: item.id,
              userId: otherUserId,
            })
          }
        >
          <Text style={styles.chatTitle}>{nome}</Text>
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
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#555' }}>
              Nenhum chat encontrado.
            </Text>
          }
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
    chatTitle: {
      fontSize: 16,
      color: '#007bff',
    },
  });
