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
    SafeAreaView, // Adicionado para safe area
    StatusBar,    // Adicionado para status bar
} from 'react-native';
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
    getFirestore, // Importar getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Importar getAuth
import { initializeApp, getApps, getApp } from 'firebase/app'; // Importar initializeApp, getApps, getApp
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ChatMessageItem from '../../components/ChatMessageItem'; // Assumindo que este componente existe e está estilizado

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

    // Cores para bolhas de chat
    myBubbleBackground: '#D4AF37', // Dourado claro para minhas mensagens
    myBubbleText: '#FFFFFF', // Texto branco nas minhas mensagens
    otherBubbleBackground: '#FFFFFF', // Branco para mensagens do outro
    otherBubbleText: '#3E2723', // Marrom escuro para texto do outro
    timestampText: '#A1887F', // Marrom suave para timestamps
    readIndicator: '#2196F3', // Azul para indicador de lido
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

// Componente AppHeader para a sala de chat
const ChatRoomHeader = ({ title, onBackPress }) => {
    return (
        <View style={headerStyles.headerContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.headerBackground} />
            <View style={headerStyles.headerContent}>
                <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.headerText} />
                </TouchableOpacity>
                <Text style={headerStyles.headerTitle}>{title}</Text>
            </View>
        </View>
    );
};

const headerStyles = StyleSheet.create({
    headerContainer: {
        backgroundColor: Colors.headerBackground,
        paddingHorizontal: Layout.padding,
        paddingVertical: Layout.spacing.medium,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + Layout.spacing.small : Layout.spacing.medium,
        borderBottomLeftRadius: Layout.borderRadius.medium, // Ajustado para um visual mais suave
        borderBottomRightRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation, // Sombra para o header
        marginBottom: Layout.spacing.small, // Pequeno espaçamento
        width: '100%',
        position: 'absolute', // Fixa o header no topo
        top: 0,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    headerTitle: {
        fontSize: Layout.fontSizes.header,
        fontWeight: 'bold',
        color: Colors.headerText,
        flex: 1, // Permite que o título ocupe o espaço restante
        textAlign: 'center',
        marginLeft: -Layout.spacing.xlarge, // Compensa o backButton para centralizar melhor
    },
    backButton: {
        position: 'absolute',
        left: 0,
        padding: Layout.spacing.xsmall,
        zIndex: 1, // Garante que o botão seja clicável
    }
});


export default function AdminChatRoomScreen({ route, navigation }) {
    const { chatId, userId, userName: initialUserName } = route.params;
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [contact, setContact] = useState({ name: initialUserName || 'Carregando...', avatar: null });
    const [sending, setSending] = useState(false);
    const [clientLastMessageTimestamp, setClientLastMessageTimestamp] = useState(null);
    const flatListRef = useRef();

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
                    if (auth.currentUser && data.adminId !== auth.currentUser.uid) {
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
    }, [userId, navigation, auth.currentUser]);


    useFocusEffect(
        useCallback(() => {
            if (!chatId || !auth.currentUser?.uid) {
                setMessages([]);
                return () => {};
            }

            const messagesQuery = query(
                collection(db, 'chats', chatId, 'messages'),
                orderBy('createdAt', 'asc')
            );

            const unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                const fetchedMessages = snapshot.docs.map(doc => ({ id: doc.id, chatId: chatId, ...doc.data() }));
                setMessages(fetchedMessages);

                const lastClientMessage = fetchedMessages
                    .filter(msg => msg.senderId === userId && msg.createdAt)
                    .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
                    .at(0);

                setClientLastMessageTimestamp(lastClientMessage?.createdAt?.toDate ? lastClientMessage.createdAt.toDate() : null);

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
            }, (error) => {
                console.error(`ERRO FATAL no onSnapshot de mensagens para chat ${chatId}:`, error);
                if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
                    Alert.alert(
                        'Sessão Expirada',
                        'Sua sessão expirou ou você não tem permissão para aceder a esta conversa. Por favor, faça login novamente.',
                        [{ text: 'OK' }]
                    );
                    setMessages([]);
                }
            });

            return () => {
                unsubscribeMessages();
            };
        }, [chatId, userId])
    );


    const sendMessage = useCallback(async () => {
        if (!text.trim() || sending) {
            return;
        }

        setSending(true);
        const trimmedText = text.trim();
        const currentUser = auth.currentUser;

        if (!currentUser || !chatId) {
            Alert.alert('Erro', 'Você precisa estar logado para enviar mensagens.');
            setSending(false);
            return;
        }

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: trimmedText,
                senderId: currentUser.uid,
                createdAt: serverTimestamp(),
                lida: false,
            });

            await updateDoc(doc(db, 'chats', chatId), {
                lastMessage: {
                    text: trimmedText,
                    senderId: currentUser.uid,
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
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? headerStyles.headerContainer.height + (Layout.spacing.medium * 2) : 0} // Ajusta offset para o header
            >
                {/* Header da Sala de Chat */}
                <ChatRoomHeader title={contact.name} onBackPress={() => navigation.goBack()} />

                {/* Lista de Mensagens */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                        const isMyMessage = auth.currentUser ? item.senderId === auth.currentUser.uid : false;
                        return (
                            <ChatMessageItem
                                message={item}
                                isMyMessage={isMyMessage} // Passa a prop para o ChatMessageItem
                                senderName={isMyMessage ? 'Você (Admin)' : contact.name}
                                lastReplyTime={clientLastMessageTimestamp}
                                chatId={chatId}
                                // Passa as cores para o ChatMessageItem
                                myBubbleBackground={Colors.myBubbleBackground}
                                myBubbleText={Colors.myBubbleText}
                                otherBubbleBackground={Colors.otherBubbleBackground}
                                otherBubbleText={Colors.otherBubbleText}
                                timestampText={Colors.timestampText}
                                readIndicatorColor={Colors.readIndicator}
                                // Passa o Layout para o ChatMessageItem
                                layoutSpacing={Layout.spacing}
                                layoutBorderRadius={Layout.borderRadius}
                                layoutFontSizes={Layout.fontSizes}
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

                {/* Input de Mensagem */}
                <View style={styles.inputContainer}>
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Digite uma mensagem..."
                        style={[styles.input, sending && styles.inputDisabled]}
                        multiline
                        editable={!sending}
                        placeholderTextColor={Colors.placeholderText} // Usar cor da paleta
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        style={[styles.sendButton, (sending || !text.trim()) && styles.sendButtonDisabled]}
                        disabled={sending || !text.trim()}
                        activeOpacity={0.7}
                    >
                        {sending ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="send" size={24} color={Colors.white} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.creamBackground, // Fundo geral da tela
    },
    container: {
        flex: 1,
        backgroundColor: Colors.creamBackground,
    },
    flatList: {
        // Ajusta o marginTop para abaixo do header fixo
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight + Layout.spacing.small + Layout.spacing.medium + Layout.padding * 2 : Layout.spacing.medium * 2 + Layout.padding * 2, // Aproximadamente a altura do header
    },
    messagesContainer: {
        paddingHorizontal: Layout.spacing.medium,
        paddingVertical: Layout.spacing.medium,
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingVertical: Layout.spacing.small, // Ajustado o padding vertical
        paddingHorizontal: Layout.padding,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: Colors.borderColor, // Cor da borda
        backgroundColor: Colors.cardBackground, // Fundo do input container
        alignItems: 'flex-end',
        ...Layout.cardElevation, // Sombra
        paddingBottom: Platform.OS === 'ios' ? Layout.spacing.medium : Layout.spacing.small, // Ajuste para iOS
    },
    input: {
        flex: 1,
        backgroundColor: Colors.inputBackground, // Fundo do input
        borderRadius: Layout.borderRadius.large, // Mais arredondado
        paddingHorizontal: Layout.spacing.medium,
        paddingVertical: Platform.OS === 'ios' ? Layout.spacing.medium : Layout.spacing.small,
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown, // Cor do texto
        maxHeight: 120,
        lineHeight: Platform.OS === 'ios' ? 20 : 22,
        borderWidth: 1, // Adiciona borda
        borderColor: Colors.lightGray, // Cor da borda do input
    },
    inputDisabled: {
        backgroundColor: Colors.lightGray, // Cor mais clara para desabilitado
        opacity: 0.8,
    },
    sendButton: {
        marginLeft: Layout.spacing.small,
        backgroundColor: Colors.primaryGold, // Cor do botão de enviar
        borderRadius: Layout.borderRadius.pill, // Totalmente arredondado
        width: 52,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        ...Layout.cardElevation, // Sombra
    },
    sendButtonDisabled: {
        backgroundColor: Colors.mediumGray, // Cor para botão desabilitado
        shadowOpacity: 0,
        elevation: 0,
        opacity: 0.6,
    },
});
