import React, { useState, useCallback, useContext, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Alert,
    SafeAreaView,
    StatusBar,
    Platform,
    TextInput, // Mantido para a barra de pesquisa
} from 'react-native';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import { UnreadContext } from '../../contexts/UnreadContext'; // Assumindo que este caminho está correto
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // Para ícones como 'add' ou 'chat-bubble-outline'
import Ionicons from 'react-native-vector-icons/Ionicons'; // Para o ícone de fechar no modal (removido, mas mantido para outros usos se necessário)

// --- FIREBASE CONFIGURATION: Torna o componente auto-suficiente ---
// Substitua com as suas credenciais
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


// Paleta de Cores Refinada (adaptada para o estilo das imagens fornecidas)
const Colors = {
    // Cores principais do tema (inspiradas no dourado/mostarda e marrom)
    primaryGold: '#B8860B', // Dourado mais clássico e vibrante
    darkBrown: '#3E2723',   // Marrom bem escuro para textos e ícones principais
    lightBrown: '#795548',  // Marrom mais suave para detalhes e placeholders
    creamBackground: '#FDF7E4', // Fundo creme claro para a maioria da tela

    // Cores neutras e de feedback
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro para fundos secundários
    mediumGray: '#B0BEC5',   // Cinza médio para textos secundários e bordas inativas
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',   // Azul vibrante para links/destaques (ex: treino completo)
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#EF5350',    // Vermelho para erros/alertes (urgente)

    // Cores específicas de componentes
    headerBackground: '#B8860B', // Fundo do header, igual ao primaryGold
    headerText: '#000000',     // Texto e ícones do header
    tabBarBackground: '#FDF7E4', // Fundo da tab bar
    tabBarIconActive: '#D4AF37', // Ícone ativo da tab bar
    tabBarIconInactive: '#8D8D8D', // Ícone inativo da tab bar
    tabBarTextActive: '#D4AF37', // Texto ativo da tab bar
    tabBarTextInactive: '#8D8D8D', // Texto inativo da tab bar

    shadowColor: 'rgba(0, 0, 0, 0.2)', // Sombra mais pronunciada mas suave
    cardBackground: '#FFFFFF', // Fundo dos cartões (items de lista)
    borderColor: '#D4AF37', // Borda para inputs e elementos selecionáveis (ativo)
    placeholderText: '#A1887F', // Marrom suave para placeholders
    inputBackground: '#FBF5EB', // Fundo de inputs para contraste suave
};

// Layout (melhorado com valores mais consistentes)
const Layout = {
    padding: 20, // Padding geral
    spacing: {
        xsmall: 4,
        small: 8,
        medium: 16,
        large: 24,
        xlarge: 32,
    },
    borderRadius: {
        small: 6,
        medium: 12, // Usar este para bordas arredondadas de cards/botões
        large: 20,
        pill: 50, // Ajustado para ser mais arredondado em elementos pequenos
    },
    fontSizes: {
        xsmall: 12,
        small: 14,
        medium: 16,
        large: 18,
        xlarge: 22,
        title: 28, // Usado para o título "Agenda"
        header: 24, // Tamanho do texto no cabeçalho
    },
    cardElevation: Platform.select({
        ios: {
            shadowColor: Colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, // Mais sutil
            shadowRadius: 8,    // Mais espalhada
        },
        android: {
            elevation: 6, // Equivalente à sombra iOS
        },
    }),
};

// Componente AppHeader
const AppHeader = ({ title }) => {
    return (
        <View style={appHeaderStyles.headerContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.headerBackground} />
            <View style={appHeaderStyles.header}>
                <Text style={appHeaderStyles.headerTitle}>{title}</Text>
            </View>
        </View>
    );
};

const appHeaderStyles = StyleSheet.create({
    headerContainer: {
        backgroundColor: Colors.headerBackground, // Fundo dourado
        borderBottomLeftRadius: Layout.borderRadius.medium * 2,
        borderBottomRightRadius: Layout.borderRadius.medium * 2,
        elevation: 4,
        shadowColor: Colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + Layout.spacing.small : Layout.spacing.medium,
        paddingHorizontal: Layout.padding,
        paddingBottom: Layout.spacing.medium,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centraliza o texto
    },
    headerTitle: {
        fontSize: Layout.fontSizes.title - 4, // Um pouco menor que o title geral
        fontWeight: 'bold',
        color: Colors.headerText,
    },
});

// Função auxiliar para obter o nome do cliente (assumindo que existe em utils/clienteUtils.js)
const obterNomeCliente = (client) => client.name || client.email || 'Cliente Desconhecido';

export default function AdminChatListScreen() {
    const [clientsWithChat, setClientsWithChat] = useState([]);
    const [clientsWithoutChat, setClientsWithoutChat] = useState([]);
    const [allRegisteredClients, setAllRegisteredClients] = useState([]); // Novo estado para todos os clientes
    const [loading, setLoading] = useState(true);
    const [chatInfo, setChatInfo] = useState({});
    const [searchQuery, setSearchQuery] = useState(''); // Novo estado para a barra de pesquisa
    const navigation = useNavigation();
    const { setUnreadCount } = useContext(UnreadContext);

    const unsubscribersRef = useRef([]);

    useEffect(() => {
        const total = Object.values(chatInfo).reduce(
            (sum, info) => sum + (info?.unreadCount || 0),
            0
        );
        setUnreadCount(total);
    }, [chatInfo, setUnreadCount]);

    const fetchAndSetupChatListeners = useCallback(async () => {
        setLoading(true);
        const adminId = auth.currentUser?.uid;
        if (!adminId) {
            console.warn("AdminChatListScreen: Nenhum admin logado. Não é possível carregar chats.");
            setLoading(false);
            setClientsWithChat([]);
            setClientsWithoutChat([]);
            setAllRegisteredClients([]);
            setChatInfo({});
            setUnreadCount(0);
            return;
        }

        try {
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
            setAllRegisteredClients(allClients); // Armazena todos os clientes

            const chatQuery = query(
                collection(db, 'chats'),
                where('isGroup', '==', false),
                where('participants', 'array-contains', adminId)
            );
            const chatSnap = await getDocs(chatQuery);

            const existingChatsMap = new Map();
            chatSnap.docs.forEach((chatDoc) => {
                const data = chatDoc.data();
                if (data.participants.length === 2 && data.participants.includes(adminId)) {
                    const otherParticipantId = data.participants.find((id) => id !== adminId);
                    existingChatsMap.set(otherParticipantId, { chatId: chatDoc.id, data: data });
                }
            });

            unsubscribersRef.current.forEach(unsub => unsub());
            unsubscribersRef.current = [];

            setChatInfo({}); // Reset chat info

            // Use a temporary map to build chatInfo and then update state once
            const newChatInfo = {};
            const tempClientsWithChat = [];

            // Set up listeners for ALL relevant chats (even potentially empty ones)
            // This will populate newChatInfo with hasMessages flag
            const promises = allClients.map(async (client) => {
                const chatEntry = existingChatsMap.get(client.id);
                if (chatEntry) {
                    const chatId = chatEntry.chatId;

                    return new Promise((resolve) => {
                        const unsubscribe = onSnapshot(
                            query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc')),
                            (snapshot) => {
                                const messages = snapshot.docs.map((doc) => doc.data());
                                const lastMsg = messages[messages.length - 1];
                                const hasMessages = messages.length > 0; // Crucial check

                                const unreadCountForThisChat = messages.filter(
                                    (msg) => !msg.lida && msg.senderId !== adminId
                                ).length;

                                newChatInfo[client.id] = {
                                    chatId: chatId,
                                    lastMessage: lastMsg?.text || '',
                                    lastSender:
                                        lastMsg?.senderId === adminId
                                            ? 'Você'
                                            : obterNomeCliente(client) || 'Cliente',
                                    lastTime: lastMsg?.createdAt?.toDate() || null,
                                    unreadCount: unreadCountForThisChat,
                                    hasMessages: hasMessages, // Store this flag
                                };

                                // If this chat now has messages, add client to tempClientsWithChat
                                if (hasMessages && !tempClientsWithChat.some(c => c.id === client.id)) {
                                    tempClientsWithChat.push(client);
                                } else if (!hasMessages && tempClientsWithChat.some(c => c.id === client.id)) {
                                    // If chat becomes empty, remove from tempClientsWithChat
                                    const index = tempClientsWithChat.findIndex(c => c.id === client.id);
                                    if (index > -1) {
                                        tempClientsWithChat.splice(index, 1);
                                    }
                                }
                                // Resolve the promise once the first snapshot is received
                                // Subsequent snapshots will update chatInfo directly via setChatInfo in the outer scope
                                resolve();
                            },
                            (error) => {
                                console.error(`Erro ao ouvir mensagens do chat ${chatId}:`, error);
                                resolve(); // Resolve even on error to not block Promise.all
                            }
                        );
                        unsubscribersRef.current.push(unsubscribe);
                    });
                }
                return Promise.resolve(); // Resolve immediately if no chat entry
            });

            await Promise.all(promises); // Wait for all initial onSnapshots to fire

            setChatInfo(newChatInfo); // Set the accumulated chat info
            
            // Derive clientsWithChat and clientsWithoutChat from allClients and newChatInfo
            const finalClientsWithChat = allClients.filter(client => newChatInfo[client.id]?.hasMessages);
            const finalClientsWithoutChat = allClients.filter(client => !newChatInfo[client.id]?.hasMessages);

            setClientsWithChat(finalClientsWithChat);
            setClientsWithoutChat(finalClientsWithoutChat);


        } catch (error) {
            console.error('Erro ao buscar dados de clientes e chats (catch principal):', error);
            Alert.alert('Erro', 'Não foi possível carregar as conversas.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchAndSetupChatListeners();

            return () => {
                unsubscribersRef.current.forEach((unsub) => unsub());
                unsubscribersRef.current = [];
                setClientsWithChat([]);
                setClientsWithoutChat([]);
                setAllRegisteredClients([]); // Limpa também a lista de todos os clientes
                setChatInfo({});
                setUnreadCount(0);
            };
        }, [fetchAndSetupChatListeners, setUnreadCount])
    );

    const createChat = async (client) => {
        setLoading(true);
        try {
            const adminId = auth.currentUser?.uid;
            if (!adminId) {
                Alert.alert("Erro", "Você não está logado para criar um chat.");
                return;
            }

            const clientId = client.id;

            const sortedIds = [adminId, clientId].sort();

            const existingChatQuery = query(
                collection(db, 'chats'),
                where('participantsSorted', '==', sortedIds)
            );
            const existingChatSnapshot = await getDocs(existingChatQuery);

            let chatIdToNavigate = null;

            if (!existingChatSnapshot.empty) {
                chatIdToNavigate = existingChatSnapshot.docs[0].id;
            } else {
                const newChatRef = await addDoc(collection(db, 'chats'), {
                    isGroup: false,
                    participants: [adminId, clientId],
                    participantsSorted: sortedIds,
                    createdAt: serverTimestamp(),
                });
                chatIdToNavigate = newChatRef.id;
                // DO NOT call fetchAndSetupChatListeners here.
                // The onSnapshot listener will automatically update chatInfo when messages are sent.
                // If we call it here, it will re-fetch everything and might cause flickering.
            }

            navigation.navigate('AdminChatRoom', {
                chatId: chatIdToNavigate,
                userId: clientId,
                userName: obterNomeCliente(client),
            });
        } catch (error) {
            console.error('Erro ao criar ou navegar para o chat:', error);
            Alert.alert('Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const getInitial = (user) => {
        const name = user.name || user.email || '';
        return name.charAt(0).toUpperCase();
    };

    const ItemSeparator = () => <View style={styles.separator} />;

    // Lógica para filtrar clientes com base na pesquisa
    const displayedClients = useMemo(() => {
        const lowerCaseQuery = searchQuery.toLowerCase();
        const filtered = allRegisteredClients.filter(client =>
            obterNomeCliente(client).toLowerCase().includes(lowerCaseQuery)
        );

        // If search query is empty, show only clients with active chats (hasMessages: true)
        if (!searchQuery) {
            return filtered.filter(client => chatInfo[client.id]?.hasMessages);
        }

        // If search query is present, show all matching clients (with or without messages)
        // Order them: clients with active chats first, then clients without chats
        const clientsWithActiveChats = [];
        const clientsWithoutActiveChats = [];

        filtered.forEach(client => {
            if (chatInfo[client.id]?.hasMessages) {
                clientsWithActiveChats.push(client);
            } else {
                clientsWithoutActiveChats.push(client);
            }
        });

        // Sort clients with active chats by last message time (most recent first)
        clientsWithActiveChats.sort((a, b) => {
            const timeA = chatInfo[a.id]?.lastTime?.getTime() || 0;
            const timeB = chatInfo[b.id]?.lastTime?.getTime() || 0;
            return timeB - timeA;
        });

        // Return combined list
        return [...clientsWithActiveChats, ...clientsWithoutActiveChats];

    }, [searchQuery, allRegisteredClients, chatInfo]); // chatInfo is now a dependency

    return (
        <SafeAreaView style={styles.container}>
            <AppHeader title="Conversas" />

            <View style={styles.content}>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.primaryGold} />
                        <Text style={styles.loadingText}>A carregar conversas...</Text>
                    </View>
                )}

                {!loading && (
                    <>
                        {/* Barra de Pesquisa */}
                        <View style={[styles.searchInputContainer, Layout.cardElevation]}>
                            <Ionicons name="search" size={20} color={Colors.mediumGray} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Pesquisar conversas ou clientes..."
                                placeholderTextColor={Colors.placeholderText}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                                    <Ionicons name="close-circle" size={20} color={Colors.mediumGray} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Condições para exibir mensagens ou a lista */}
                        {displayedClients.length > 0 ? (
                            <>
                                <Text style={styles.sectionTitle}>
                                    {searchQuery === '' ? 'Conversas existentes:' : 'Resultados da Pesquisa:'}
                                </Text>
                                <FlatList
                                    data={displayedClients}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => {
                                        const info = chatInfo[item.id];
                                        // Apenas renderiza como chat existente se tiver mensagens
                                        const hasActiveChat = info?.hasMessages; 

                                        if (hasActiveChat) {
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
                                        } else if (searchQuery !== '') { // Só mostra clientes sem chat se houver uma pesquisa ativa
                                            // Renderiza item para iniciar nova conversa
                                            return (
                                                <TouchableOpacity
                                                    style={[styles.newChatItem, Layout.cardElevation]}
                                                    onPress={() => createChat(item)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.avatar}>
                                                        <Text style={styles.avatarText}>{getInitial(item)}</Text>
                                                    </View>
                                                    <View style={styles.chatDetailsContainer}>
                                                        <Text style={styles.clientName}>{obterNomeCliente(item)}</Text>
                                                        <Text style={styles.newChatPrompt}>Iniciar nova conversa</Text>
                                                    </View>
                                                    <MaterialIcons name="chat-bubble-outline" size={24} color={Colors.lightBrown} />
                                                </TouchableOpacity>
                                            );
                                        }
                                        return null; // Não renderiza se não for chat ativo e pesquisa vazia
                                    }}
                                    ItemSeparatorComponent={ItemSeparator}
                                    contentContainerStyle={styles.flatListContentContainer}
                                    showsVerticalScrollIndicator={false}
                                />
                            </>
                        ) : (
                            <Text style={[styles.infoText, styles.emptyListMessageContainer]}>
                                {searchQuery === ''
                                    ? 'Comece a pesquisar para encontrar clientes e conversas.'
                                    : `Nenhum resultado encontrado para "${searchQuery}".`}
                            </Text>
                        )}
                    </>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.creamBackground,
    },
    content: {
        flex: 1,
        paddingHorizontal: Layout.padding,
        paddingTop: Layout.spacing.medium,
    },
    loadingOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: Layout.spacing.small,
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
    },
    sectionTitle: {
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
        color: Colors.darkBrown,
        marginTop: Layout.spacing.medium,
        marginBottom: Layout.spacing.small,
    },
    // Estilos para o item de conversa existente
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBackground,
        paddingVertical: Layout.spacing.medium,
        paddingHorizontal: Layout.padding,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
        marginBottom: Layout.spacing.medium,
        borderLeftWidth: 5,
        borderLeftColor: Colors.lightBrown,
    },
    userItemUnread: {
        borderLeftColor: Colors.primaryGold, // Destaque para conversas não lidas
    },
    // Estilos para o avatar
    avatar: {
        backgroundColor: Colors.lightGray,
        width: 50,
        height: 50,
        borderRadius: Layout.borderRadius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Layout.spacing.medium,
        ...Layout.cardElevation,
        elevation: Layout.cardElevation.android?.elevation / 2 || 2,
    },
    avatarText: {
        color: Colors.darkBrown,
        fontSize: Layout.fontSizes.xlarge,
        fontWeight: 'bold',
    },
    // Estilos para os detalhes do chat
    chatDetailsContainer: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    userName: {
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
        color: Colors.darkBrown,
    },
    lastMessageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: Layout.spacing.xsmall,
    },
    lastMessageText: {
        flex: 1,
        fontSize: Layout.fontSizes.small,
        color: Colors.mediumGray,
        marginRight: Layout.spacing.small,
    },
    lastMessageTextUnread: {
        fontWeight: 'bold',
        color: Colors.darkBrown,
    },
    lastMessageTime: {
        fontSize: Layout.fontSizes.xsmall,
        color: Colors.mediumGray,
    },
    // Estilos para o badge de mensagens não lidas
    unreadBadge: {
        backgroundColor: Colors.errorRed,
        borderRadius: Layout.borderRadius.medium,
        paddingHorizontal: Layout.spacing.small,
        paddingVertical: Layout.spacing.xsmall,
        minWidth: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: Layout.spacing.small,
    },
    unreadText: {
        color: Colors.white,
        fontSize: Layout.fontSizes.small,
        fontWeight: 'bold',
    },
    notificationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.errorRed,
        marginLeft: Layout.spacing.xsmall,
    },
    separator: {
        height: Layout.spacing.medium,
    },
    infoText: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.mediumGray,
        textAlign: 'center',
        marginTop: Layout.spacing.large,
        paddingHorizontal: Layout.padding,
    },
    flatListContentContainer: { // Novo nome para o estilo do FlatList
        flexGrow: 1,
        paddingBottom: Layout.spacing.large * 2,
    },
    emptyListMessageContainer: { // Novo estilo para as mensagens de lista vazia
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: Layout.spacing.large * 2,
    },
    // Estilos para a barra de pesquisa
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.inputBackground,
        borderRadius: Layout.borderRadius.medium,
        borderWidth: 1,
        borderColor: Colors.borderColor,
        paddingHorizontal: Layout.spacing.medium,
        marginBottom: Layout.spacing.large,
        ...Layout.cardElevation,
        elevation: Layout.cardElevation.android?.elevation / 2 || 2,
    },
    searchIcon: {
        marginRight: Layout.spacing.small,
    },
    searchInput: {
        flex: 1,
        height: 50, // Altura fixa para o input
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
    },
    clearSearchButton: {
        padding: Layout.spacing.xsmall,
    },
    // Estilos para o item de "nova conversa" (quando pesquisado)
    newChatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBackground,
        paddingVertical: Layout.spacing.medium,
        paddingHorizontal: Layout.padding,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
        marginBottom: Layout.spacing.medium,
        borderLeftWidth: 3, // Destaque sutil
        borderLeftColor: Colors.accentBlue, // Cor diferente para nova conversa
    },
    clientName: {
        fontSize: Layout.fontSizes.large,
        color: Colors.darkBrown,
        fontWeight: 'bold',
        flex: 1,
    },
    newChatPrompt: {
        fontSize: Layout.fontSizes.small,
        color: Colors.lightBrown,
        marginTop: Layout.spacing.xsmall,
    },
});
