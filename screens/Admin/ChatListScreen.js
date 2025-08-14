import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { db, auth } from '../../services/firebaseConfig';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';

export default function ChatListScreen() {
    const [chats, setChats] = useState([]);
    const [userNames, setUserNames] = useState({});
    const [currentUserUid, setCurrentUserUid] = useState(null);
    const navigation = useNavigation();

    // useRef para armazenar APENAS o unsubscribe do listener principal da lista de chats
    const unsubscribeMainChatList = useRef(null);

    // LOG: Componente AdminChatListScreen montado/renderizado
    console.log("AdminChatListScreen: COMPONENT RENDERIZADO.");

    // Função de limpeza centralizada para o listener principal
    const cleanupMainListener = useCallback(() => {
        if (unsubscribeMainChatList.current) {
            console.log("AdminChatListScreen: Executando limpeza do listener principal da lista de chats.");
            try {
                unsubscribeMainChatList.current(); // Chama a função de desinscrição
            } catch (e) {
                console.warn("AdminChatListScreen: Erro ao desinscrever listener principal:", e);
            }
            unsubscribeMainChatList.current = null; // Limpa a referência
        }
        setChats([]); // Limpa os chats visíveis
        setUserNames({}); // Limpa os nomes dos usuários
        console.log("AdminChatListScreen: Estados de chat limpos após cleanup.");
    }, []);

    // Listener para o estado de autenticação (global para o componente)
    useEffect(() => {
        console.log("AdminChatListScreen: useEffect de onAuthStateChanged ATIVADO.");
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUserUid(user.uid);
                console.log("AdminChatListScreen: Auth state changed. User:", user.uid);
            } else {
                setCurrentUserUid(null);
                console.log("AdminChatListScreen: Auth state changed. User is NULL (logged out).");
                // Chamar a limpeza do listener principal AQUI, para garantir
                // que ele seja parado o mais rápido possível após o logout.
                cleanupMainListener();
            }
        });

        // Retorna a função de limpeza para o listener de autenticação
        return () => {
            console.log("AdminChatListScreen: useEffect de onAuthStateChanged CLEANUP EXECUTADO.");
            unsubscribeAuth();
            // Garante que o listener principal é limpo quando o componente é desmontado
            cleanupMainListener();
        };
    }, [cleanupMainListener]);

    // Listener principal para a lista de chats do usuário atual
    // Usando useFocusEffect para garantir que só roda quando a tela está focada
    useFocusEffect(
        useCallback(() => {
            console.log(`AdminChatListScreen: useFocusEffect ativado. CurrentUserUid: ${currentUserUid}`);

            // Limpa o listener principal anterior antes de configurar um novo
            cleanupMainListener();

            if (!currentUserUid) {
                console.log("AdminChatListScreen: Sem currentUserUid, abortando listener de chats.");
                return () => {
                    console.log("AdminChatListScreen: useFocusEffect CLEANUP - Nada para desinscrever (sem currentUserUid).");
                }; // Retorna uma função de limpeza vazia
            }

            const q = query(
                collection(db, 'chats'),
                where('participants', 'array-contains', currentUserUid)
            );

            // Listener principal para a lista de chats
            const unsubscribe = onSnapshot(q, async (snapshot) => {
                console.log(`AdminChatListScreen: onSnapshot de chats acionado. Docs: ${snapshot.docs.length}`);
                const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Armazena o timestamp da última mensagem de cada chat para exibição
                // Isso elimina a necessidade de listeners individuais para cada chat
                const chatsWithLastMessage = chatData.map(chat => {
                    const lastMessageText = chat.lastMessage?.text || 'Nenhuma mensagem.';
                    const lastMessageSender = chat.lastMessage?.senderId;
                    const lastMessageTimestamp = chat.lastMessage?.timestamp?.toDate();
                    return { ...chat, lastMessageText, lastMessageSender, lastMessageTimestamp };
                });

                setChats(chatsWithLastMessage); // Atualiza o estado dos chats com as últimas mensagens

                const newNames = {};
                const promises = chatData.map(async (chat) => {
                    const otherUserId = chat.participants.find(id => id !== currentUserUid);
                    if (otherUserId && !userNames[otherUserId] && !newNames[otherUserId]) {
                        try {
                            const userDoc = await getDoc(doc(db, 'users', otherUserId));
                            const name = userDoc.exists() ? userDoc.data().name || 'Usuário Desconhecido' : 'Usuário Desconhecido';
                            newNames[otherUserId] = name;
                        } catch (error) {
                            console.error('AdminChatListScreen: Erro ao buscar nome do usuário:', error);
                            newNames[otherUserId] = 'Usuário Desconhecido';
                        }
                    }
                });
                await Promise.all(promises);
                if (Object.keys(newNames).length > 0) {
                    setUserNames(prev => ({ ...prev, ...newNames }));
                }

            }, (error) => {
                console.error('AdminChatListScreen: ERRO no onSnapshot de chats:', error);
                if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
                    Alert.alert(
                        'Erro de Permissão',
                        'Você não tem permissão para acessar esta lista de chats. Por favor, faça login novamente ou contate o suporte.'
                    );
                    cleanupMainListener(); // Limpa tudo em caso de erro de permissão na lista principal
                }
            });

            // Armazena a função de unsubscribe do listener principal
            unsubscribeMainChatList.current = unsubscribe;

            // Retorna a função de limpeza que será chamada quando a tela perder o foco
            return () => {
                console.log('AdminChatListScreen: useFocusEffect CLEANUP EXECUTADO. Desinscrevendo listener principal da lista de chats.');
                cleanupMainListener();
            };
        }, [currentUserUid, cleanupMainListener])
    );

    const renderItem = ({ item }) => {
        const otherUserId = item.participants.find(id => id !== currentUserUid);
        const nome = item.isGroup ? item.name : userNames[otherUserId] || 'Carregando...';

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() =>
                    navigation.navigate('AdminChatRoom', {
                        chatId: item.id,
                        userId: otherUserId,
                        userName: nome,
                        adminUid: currentUserUid,
                    })
                }
            >
                <Text style={styles.chatTitle}>{nome}</Text>
                {item.lastMessageText && (
                    <Text style={styles.lastMessageText} numberOfLines={1}>
                        {item.lastMessageSender === currentUserUid ? 'Você: ' : ''}
                        {item.lastMessageText}
                        {item.lastMessageTimestamp && ` - ${item.lastMessageTimestamp.toLocaleTimeString()}`}
                    </Text>
                )}
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
                        {currentUserUid ? 'Nenhum chat encontrado.' : 'Faça login para ver seus chats.'}
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
        fontWeight: 'bold',
        marginBottom: 4,
    },
    lastMessageText: {
        fontSize: 13,
        color: '#666',
    },
});