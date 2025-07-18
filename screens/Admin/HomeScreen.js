import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView, ScrollView, Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Importar MaterialCommunityIcons para as estrelas
import { db, auth } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, collectionGroup, doc, getDoc } from 'firebase/firestore';

// A função formatarDuracao é útil em vários locais, então é bom mantê-la globalmente ou aqui.
const formatarDuracao = (totalSegundos) => {
    if (typeof totalSegundos !== 'number' || isNaN(totalSegundos) || totalSegundos < 0) {
        return 'N/A';
    }
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;
    const pad = (num) => num.toString().padStart(2, '0');
    
    const parts = [];
    if (horas > 0) {
        parts.push(`${horas}h`);
    }
    if (min > 0 || (horas === 0 && seg > 0)) {
        parts.push(`${pad(min)}m`);
    }
    if (seg > 0 || (horas === 0 && min === 0)) {
        parts.push(`${pad(seg)}s`);
    }
    
    return parts.join(' ');
};

const { width } = Dimensions.get('window');

// Paleta de Cores Refinada para um look mais elegante e menos pesado
const Colors = {
    primaryGold: '#D4AF37', // Ouro mais clássico
    darkBrown: '#3E2723',   // Marrom bem escuro, quase preto
    lightBrown: '#795548',  // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro
    mediumGray: '#B0BEC5',  // Cinza médio para textos secundários
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',  // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336',    // Vermelho para erros/alertas
    unreadBadge: '#EF5350', // Vermelho mais vibrante para badge de não lidas
};


export default function HomeScreen() {
    const { user, userDetails, loadUserDetails } = useUser();
    const navigation = useNavigation();

    const [stats, setStats] = useState({
        newClients: 0,
        trainingsToday: 0,
        unreadMessages: 0,
        pendingEvaluations: 0,
    });
    const [upcomingTrainings, setUpcomingTrainings] = useState([]);
    // NOVO ESTADO para os últimos treinos concluídos
    const [recentCompletedTrainings, setRecentCompletedTrainings] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const chatUnsubscribersRef = useRef([]);

    useEffect(() => {
        if (user && !userDetails) {
            loadUserDetails(user.uid);
        }
    }, [user, userDetails, loadUserDetails]);

    const fetchStaticStats = async () => {
        try {
            let newClientsCount = 0;
            let pendingEvaluationsCount = 0;

            const evaluationsRef = collection(db, 'evaluations');
            const qPendingEvaluations = query(
                evaluationsRef,
                where('status', '==', 'pending')
            );
            const pendingEvaluationsSnapshot = await getDocs(qPendingEvaluations);
            pendingEvaluationsCount = pendingEvaluationsSnapshot.size;

            const clientsRef = collection(db, 'users');
            const qNewClients = query(
                clientsRef,
                where('role', '==', 'user'),
            );
            const newClientsSnapshot = await getDocs(qNewClients);
            newClientsCount = newClientsSnapshot.size;

            setStats(prevStats => ({
                ...prevStats,
                newClients: newClientsCount,
                pendingEvaluations: pendingEvaluationsCount,
            }));

        } catch (err) {
            console.error("Erro ao buscar estatísticas estáticas (sem mensagens):", err);
            setError(`Não foi possível carregar algumas estatísticas: ${err.message}.`);
        }
    };

    const subscribeToTrainingsToday = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const treinosCollectionGroupRef = collectionGroup(db, 'treinos');
        const qTrainingsToday = query(
            treinosCollectionGroupRef,
            where('data', '>=', today),
            where('data', '<', tomorrow)
        );

        const unsubscribe = onSnapshot(qTrainingsToday, (snapshot) => {
            const trainingsTodayCount = snapshot.size;
            setStats(prevStats => ({
                ...prevStats,
                trainingsToday: trainingsTodayCount,
            }));
        }, (err) => {
            console.error("Erro ao assinar treinos de hoje:", err);
            if (err.code === 'failed-precondition' && err.message.includes('A non-descending order by is required')) {
                Alert.alert("Erro de Firebase", "É necessário um índice no Firestore para esta query. Por favor, verifique a consola do Firebase > Firestore > Índices e crie o índice sugerido.");
                setError("Erro: Índice necessário no Firebase para treinos de hoje.");
            } else {
                setError(`Não foi possível carregar treinos de hoje em tempo real: ${err.message}.`);
            }
        });

        return unsubscribe;
    };

    const fetchUpcomingTrainings = () => {
        const treinosCollectionGroupRef = collectionGroup(db, 'treinos');
        const q = query(
            treinosCollectionGroupRef,
            where('data', '>=', new Date()),
            orderBy('data', 'asc'),
            limit(3)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const trainingsData = await Promise.all(snapshot.docs.map(async treinoDoc => {
                const data = treinoDoc.data();
                let clientName = 'Cliente Desconhecido';

                const userIdFromPath = treinoDoc.ref.parent.parent.id;
                const currentUserId = data.userId || userIdFromPath;

                if (currentUserId) {
                    try {
                        const clientDocRef = doc(db, 'users', currentUserId);
                        const clientDocSnap = await getDoc(clientDocRef);

                        if (clientDocSnap.exists()) {
                            const client = clientDocSnap.data();
                            if (client.name) {
                                clientName = client.name;
                            } else if (client.firstName || client.lastName) {
                                clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
                            } else if (client.nome) {
                                clientName = client.nome;
                            }
                        } else {
                            clientName = 'Cliente (Não Encontrado)';
                        }
                    } catch (e) {
                        console.error(`Erro ao buscar nome do cliente para treino ID ${treinoDoc.id}:`, e);
                        clientName = 'Cliente (Erro na Busca)';
                    }
                } else {
                    clientName = 'Cliente (Sem ID)';
                }

                return {
                    id: treinoDoc.id,
                    ...data,
                    data: data.data ? data.data.toDate() : null,
                    clientName: clientName,
                };
            }));
            setUpcomingTrainings(trainingsData);
        }, (err) => {
            console.error("Erro ao buscar próximos treinos:", err);
            if (err.code === 'failed-precondition' && err.message.includes('A non-descending order by is required')) {
                Alert.alert("Erro de Firebase", "É necessário um índice no Firestore para esta query. Por favor, verifique a consola do Firebase > Firestore > Índices e crie o índice sugerido.");
                setError("Erro de índice nos próximos treinos.");
            } else {
                setError(`Não foi possível carregar os próximos treinos: ${err.message}`);
            }
        });

        return unsubscribe;
    };

    // NOVA FUNÇÃO: Busca os últimos treinos concluídos
    const fetchRecentCompletedTrainings = () => {
        const historicoRef = collection(db, 'historicoTreinos');
        const q = query(
            historicoRef,
            orderBy('dataConclusao', 'desc'), // Ordena pela data de conclusão mais recente
            limit(3) // Limita aos 3 mais recentes
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const completedTrainingsData = await Promise.all(snapshot.docs.map(async docSnap => {
                const data = docSnap.data();
                let clientName = 'Cliente Desconhecido';

                if (data.userId) {
                    try {
                        const clientDocRef = doc(db, 'users', data.userId);
                        const clientDocSnap = await getDoc(clientDocRef);
                        if (clientDocSnap.exists()) {
                            const client = clientDocSnap.data();
                            clientName = client.name || client.firstName || client.nome || 'Cliente sem nome';
                        }
                    } catch (e) {
                        console.error(`Erro ao buscar nome do cliente para treino concluído ID ${docSnap.id}:`, e);
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    dataConclusao: data.dataConclusao ? data.dataConclusao.toDate() : null,
                    clientName: clientName,
                    avaliacao: data.avaliacao || 0,
                    observacoesUser: data.observacoesUser || '',
                };
            }));
            setRecentCompletedTrainings(completedTrainingsData);
        }, (err) => {
            console.error("Erro ao buscar treinos concluídos recentes:", err);
            setError(`Não foi possível carregar os últimos treinos concluídos: ${err.message}`);
        });

        return unsubscribe;
    };


    const subscribeToUnreadMessages = () => {
        chatUnsubscribersRef.current.forEach(unsub => unsub());
        chatUnsubscribersRef.current = [];

        if (!auth.currentUser) return;

        const adminId = auth.currentUser.uid;
        let totalUnread = 0;
        const currentUnreadCounts = {};

        const chatRefs = collection(db, 'chats');
        const qChats = query(
            chatRefs,
            where('isGroup', '==', false),
            where('participants', 'array-contains', adminId)
        );

        const unsubscribeChats = onSnapshot(qChats, (chatsSnapshot) => {
            chatsSnapshot.docChanges().forEach(change => {
                const chatId = change.doc.id;

                if (change.type === 'removed') {
                    if (chatUnsubscribersRef.current[chatId]) {
                        chatUnsubscribersRef.current[chatId]();
                        delete currentUnreadCounts[chatId]; 
                    }
                    if (currentUnreadCounts[chatId]) {
                        totalUnread -= currentUnreadCounts[chatId];
                        delete currentUnreadCounts[chatId];
                        setStats(prevStats => ({ ...prevStats, unreadMessages: totalUnread }));
                    }
                    return;
                }

                if (!chatUnsubscribersRef.current[chatId]) {
                    const messagesRef = collection(db, 'chats', chatId, 'messages');
                    const unsubscribeMessages = onSnapshot(messagesRef, (messagesSnapshot) => {
                        let unreadForThisChat = 0;
                        messagesSnapshot.forEach(messageDoc => {
                            const messageData = messageDoc.data();
                            if (messageData.senderId !== adminId && !messageData.lida) {
                                unreadForThisChat++;
                            }
                        });

                        if (currentUnreadCounts[chatId] !== unreadForThisChat) {
                            totalUnread = totalUnread - (currentUnreadCounts[chatId] || 0) + unreadForThisChat;
                            currentUnreadCounts[chatId] = unreadForThisChat;
                            setStats(prevStats => ({ ...prevStats, unreadMessages: totalUnread }));
                        }
                    }, (err) => {
                        console.error(`Erro ao assinar mensagens do chat ${chatId}:`, err);
                        setError(`Erro ao carregar mensagens não lidas: ${err.message}`);
                    });
                    chatUnsubscribersRef.current[chatId] = unsubscribeMessages;
                }
            });
            setLoading(false);
        }, (err) => {
            console.error("Erro ao assinar chats:", err);
            setError(`Erro ao carregar chats: ${err.message}`);
            setLoading(false);
        });

        chatUnsubscribersRef.current.push(unsubscribeChats);
        return () => {
            chatUnsubscribersRef.current.forEach(unsub => unsub());
            chatUnsubscribersRef.current = [];
        };
    };


    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchStaticStats();
        const unsubscribeTrainingsToday = subscribeToTrainingsToday();
        const unsubscribeUpcomingTrainings = fetchUpcomingTrainings();
        // NOVO: Chamar a função para buscar treinos concluídos recentes
        const unsubscribeRecentCompletedTrainings = fetchRecentCompletedTrainings(); 
        const unsubscribeUnread = subscribeToUnreadMessages();

        return () => {
            unsubscribeTrainingsToday();
            unsubscribeUpcomingTrainings();
            // NOVO: Desinscrever dos treinos concluídos recentes
            unsubscribeRecentCompletedTrainings(); 
            unsubscribeUnread();
        };
    }, [user]);

    const userDisplayName = userDetails?.nome || userDetails?.firstName || userDetails?.name || 'Admin';
    const userInitial = userDisplayName ? userDisplayName.charAt(0).toUpperCase() : '';

    if (loading || !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primaryGold} />
                <Text style={styles.loadingText}>A carregar dados do painel...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => {
                    setLoading(true);
                    setError(null);
                    fetchStaticStats();
                    subscribeToTrainingsToday();
                    fetchUpcomingTrainings();
                    fetchRecentCompletedTrainings(); // Adicionado para tentar novamente
                    subscribeToUnreadMessages();
                }} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Barra Fixa Superior (Header) */}
            <View style={styles.header}>
                <Image
                    source={require('../../assets/logo.jpeg')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                />
                <View style={styles.userInfo}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{userInitial}</Text>
                    </View>
                    <Text style={styles.userNameText}>Olá, {userDisplayName}</Text>
                </View>
            </View>

            {/* Conteúdo da Página (rolável) */}
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.welcomeText}>Bem-vindo ao Painel Admin!</Text>

                {/* --- RESUMO RÁPIDO --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Resumo Rápido</Text>
                    <View style={styles.statsContainer}>
                        <StatItem value={stats.newClients} label="Meus Clientes" icon="person-add-outline" />
                        <StatItem value={stats.trainingsToday} label="Treinos Hoje" icon="barbell-outline" />
                        <StatItem value={stats.unreadMessages} label="Mensagens Novas" icon="chatbubbles-outline" isUnread={stats.unreadMessages > 0} />
                        <StatItem value={stats.pendingEvaluations} label="Aval. Pendentes" icon="document-text-outline" />
                    </View>
                </View>

                {/* --- AÇÕES RÁPIDAS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Ações Rápidas</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickActionsScrollContent}
                    >
                        <ActionButton icon="add-circle-outline" text="Criar Treino" onPress={() => navigation.navigate('CriarTreino')} />
                        <ActionButton icon="person-add-outline" text="Novo Cliente" onPress={() => navigation.navigate('CadastroCliente')} />
                        <ActionButton icon="clipboard-outline" text="Criar Avaliação" onPress={() => navigation.navigate('CriarAvaliacao')} />
                        <ActionButton icon="calendar-outline" text="Ver Agenda" onPress={() => navigation.navigate('Agenda')} />
                        <ActionButton icon="people-outline" text="Gerir Clientes" onPress={() => navigation.navigate('Clientes')} />
                        <ActionButton icon="chatbubbles-outline" text="Chat Online" onPress={() => navigation.navigate('Chat Online')} />
                        <ActionButton icon="library-outline" text="Gerir Modelos" onPress={() => navigation.navigate('WorkoutTemplates')} />
                        <ActionButton icon="barbell-outline" text="Gerir Exercícios" onPress={() => navigation.navigate('ExerciseLibrary')} />
                        <ActionButton icon="checkmark-done-circle-outline" text="Histórico Treinos" onPress={() => navigation.navigate('CompletedTrainingsHistory')} />
                    </ScrollView>
                </View>

                {/* --- PRÓXIMOS AGENDAMENTOS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Próximos Treinos</Text>
                    <View style={styles.card}>
                        {upcomingTrainings.length > 0 ? (
                            upcomingTrainings.map((training, index) => (
                                <React.Fragment key={training.id}>
                                    <View style={styles.trainingItem}>
                                        <Ionicons name="calendar-outline" size={18} color={Colors.lightBrown} style={{ marginRight: 8 }} />
                                        <Text style={styles.trainingText}>
                                            <Text style={styles.trainingTime}>{training.data ? training.data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</Text>
                                            <Text> | </Text>
                                            <Text style={styles.trainingClient}>{training.clientName || 'Cliente Desconhecido'}</Text>
                                            <Text> | </Text>
                                            <Text>{training.nome || 'Treino'}</Text>
                                        </Text>
                                    </View>
                                    {index < upcomingTrainings.length - 1 && <View style={styles.itemSeparator} />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>Nenhum treino agendado para breve.</Text>
                        )}
                        <TouchableOpacity onPress={() => navigation.navigate('Agenda')} style={styles.linkButton} activeOpacity={0.7}>
                            <Text style={styles.viewAllLink}>
                                <Text>Ver todos na Agenda </Text>
                                <Ionicons name="arrow-forward-outline" size={14} color={Colors.accentBlue} />
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* NOVO: ÚLTIMOS TREINOS CONCLUÍDOS */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Últimos Treinos Concluídos</Text>
                    <View style={styles.card}>
                        {recentCompletedTrainings.length > 0 ? (
                            recentCompletedTrainings.map((training, index) => (
                                <React.Fragment key={training.id}>
                                    <View style={styles.trainingItem}>
                                        <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.successGreen} style={{ marginRight: 8 }} />
                                        <Text style={styles.trainingText}>
                                            <Text style={styles.trainingTime}>{training.dataConclusao ? training.dataConclusao.toLocaleDateString() : 'N/A'}</Text>
                                            <Text> | </Text>
                                            <Text style={styles.trainingClient}>{training.clientName || 'Cliente Desconhecido'}</Text>
                                            <Text> | </Text>
                                            <Text>{training.nomeTreino || 'Treino'}</Text>
                                            {training.duracao > 0 && (
                                                <Text> ({formatarDuracao(training.duracao)})</Text>
                                            )}
                                        </Text>
                                    </View>
                                    {training.avaliacao > 0 && (
                                        <View style={styles.ratingContainer}>
                                            <Text style={styles.ratingText}>Avaliação: </Text>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <MaterialCommunityIcons
                                                    key={star}
                                                    name={star <= training.avaliacao ? 'star' : 'star-outline'}
                                                    size={16}
                                                    color="#FFD700"
                                                    style={styles.starIcon}
                                                />
                                            ))}
                                        </View>
                                    )}
                                    {training.observacoesUser ? (
                                        <View style={styles.observationSummaryContainer}>
                                            <Text style={styles.observationSummaryText}>"{training.observacoesUser.substring(0, 50)}{training.observacoesUser.length > 50 ? '...' : ''}"</Text>
                                        </View>
                                    ) : null}
                                    {index < recentCompletedTrainings.length - 1 && <View style={styles.itemSeparator} />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>Nenhum treino concluído recentemente.</Text>
                        )}
                        <TouchableOpacity onPress={() => navigation.navigate('CompletedTrainingsHistory')} style={styles.linkButton} activeOpacity={0.7}>
                            <Text style={styles.viewAllLink}>
                                <Text>Ver Histórico Completo </Text>
                                <Ionicons name="arrow-forward-outline" size={14} color={Colors.accentBlue} />
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// Componente auxiliar para os itens de estatísticas
const StatItem = ({ value, label, icon, isUnread = false }) => (
    <View style={styles.statItem}>
        <View style={styles.statIconContainer}>
            <Ionicons name={icon} size={28} color={isUnread ? Colors.unreadBadge : Colors.primaryGold} />
            {isUnread && value > 0 && (
                <View style={styles.unreadDot} />
            )}
        </View>
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// Componente auxiliar para os botões de ação rápida
const ActionButton = ({ icon, text, onPress }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={32} color={Colors.darkBrown} />
        <Text style={styles.actionButtonText}>{text}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.creamBackground,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.creamBackground,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: Colors.darkBrown,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.creamBackground,
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: Colors.errorRed,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: Colors.primaryGold,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    retryButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: Colors.primaryGold,
        borderBottomWidth: 0,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 0,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    headerLogo: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.darkBrown,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1.5,
        borderColor: Colors.white,
    },
    avatarText: {
        color: Colors.white,
        fontSize: 20,
        fontWeight: '600',
    },
    userNameText: {
        fontSize: 17,
        fontWeight: '600',
        color: Colors.white,
    },
    content: {
        flexGrow: 1,
        padding: 18,
        alignItems: 'center',
        paddingTop: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.darkBrown,
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 30,
    },
    section: {
        width: '100%',
        maxWidth: 500,
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.darkBrown,
        marginBottom: 15,
        borderBottomWidth: 1.5,
        borderBottomColor: Colors.primaryGold,
        paddingBottom: 8,
        alignSelf: 'flex-start',
    },
    card: {
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 18,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 0,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
    },
    statItem: {
        alignItems: 'center',
        width: '48%',
        marginVertical: 10,
    },
    statIconContainer: {
        position: 'relative',
        marginBottom: 5,
    },
    unreadDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: Colors.unreadBadge,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: Colors.white,
    },
    statNumber: {
        fontSize: 30,
        fontWeight: '800',
        color: Colors.primaryGold,
    },
    statLabel: {
        fontSize: 14,
        color: Colors.lightBrown,
        textAlign: 'center',
        marginTop: 4,
        fontWeight: '500',
    },
    quickActionsScrollContent: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 12,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 8,
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: 12,
        width: width * 0.25,
        height: width * 0.25,
        marginRight: 15,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 3,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.darkBrown,
        marginTop: 8,
        textAlign: 'center',
    },
    trainingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
    },
    trainingText: {
        fontSize: 15,
        color: Colors.darkBrown,
        flexShrink: 1,
    },
    trainingTime: {
        fontWeight: 'bold',
        color: Colors.darkBrown,
    },
    trainingClient: {
        fontStyle: 'italic',
        color: Colors.mediumGray,
    },
    itemSeparator: {
        height: 0.8,
        backgroundColor: Colors.lightGray,
        marginHorizontal: 5,
        marginVertical: 4,
    },
    noDataText: {
        fontSize: 15,
        color: Colors.mediumGray,
        textAlign: 'center',
        paddingVertical: 12,
    },
    linkButton: {
        marginTop: 18,
        alignSelf: 'flex-end',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: Colors.white,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 3,
    },
    viewAllLink: {
        fontSize: 15,
        color: Colors.accentBlue,
        fontWeight: '600',
    },
    // NOVOS ESTILOS para treinos concluídos
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 2,
        marginLeft: 30, // Alinha com o texto do treino
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.darkBrown,
        marginRight: 4,
    },
    starIcon: {
        marginHorizontal: 1,
    },
    observationSummaryContainer: {
        marginTop: 4,
        marginBottom: 8,
        marginLeft: 30,
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: Colors.lightGray,
        borderRadius: 8,
    },
    observationSummaryText: {
        fontSize: 13,
        color: Colors.darkGray,
        fontStyle: 'italic',
    },
});
