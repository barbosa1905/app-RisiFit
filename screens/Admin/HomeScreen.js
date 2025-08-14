import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, Image, SafeAreaView, ScrollView,
    Platform, StatusBar, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../../services/firebaseConfig';
import {
    collection, query, where, getDocs, onSnapshot, orderBy, limit,
    collectionGroup, doc, getDoc
} from 'firebase/firestore';

// --- Importações de componentes e constantes modulares ---
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';
import StatItem from '../../components/StatItem';
import ActionButton from '../../components/ActionButton';
import TrainingCard from '../../components/TrainingCard';
import AppHeader from '../../components/AppHeader'; // Seu AppHeader limpo e com bordas arredondadas

// --- Funções Auxiliares (mantidas aqui ou movidas para um 'utils' se usadas em mais lugares) ---
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
    const [recentCompletedTrainings, setRecentCompletedTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Refs para gerir unsubscribers de listeners do Firestore
    const chatMessageUnsubscribersRef = useRef({});
    const chatMainUnsubscriberRef = useRef(null);
    const otherFirestoreUnsubscribers = useRef([]);

    // Efeito para carregar detalhes do usuário se não estiverem disponíveis
    useEffect(() => {
        if (user && !userDetails) {
            loadUserDetails(user.uid);
        }
    }, [user, userDetails, loadUserDetails]);

    // --- Funções de busca/assinatura (encapsuladas com useCallback para estabilidade) ---
    const fetchStaticStats = useCallback(async () => {
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
            console.error("Erro ao buscar estatísticas estáticas:", err);
            // Poderia adicionar setError aqui para mostrar na UI
        }
    }, []);

    const subscribeToTrainingsToday = useCallback(() => {
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
            if (err.code === 'permission-denied') {
                console.log("Permissão negada para treinos de hoje. Isso é esperado em logout.");
                setStats(prevStats => ({ ...prevStats, trainingsToday: 0 }));
                return;
            }
            if (err.code === 'failed-precondition' && err.message.includes('A non-descending order by is required')) {
                Alert.alert("Erro de Firebase", "É necessário um índice no Firestore para esta query. Por favor, verifique a consola do Firebase > Firestore > Índices e crie o índice sugerido.");
                setError("Erro: Índice necessário no Firebase para treinos de hoje.");
            } else {
                setError(`Não foi possível carregar treinos de hoje em tempo real: ${err.message}.`);
            }
        });
        return unsubscribe;
    }, []);

    const fetchUpcomingTrainings = useCallback(() => {
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

                if (currentUserId && auth.currentUser) {
                    try {
                        const clientDocRef = doc(db, 'users', currentUserId);
                        const clientDocSnap = await getDoc(clientDocRef);
                        if (clientDocSnap.exists()) {
                            const client = clientDocSnap.data();
                            clientName = client.name || client.firstName || client.nome || 'Cliente sem nome';
                        } else {
                            clientName = 'Cliente (Não Encontrado)';
                        }
                    } catch (e) {
                        clientName = 'Cliente (Erro na Busca)';
                    }
                } else {
                    clientName = 'Cliente (Não Autenticado)';
                }
                return {
                    id: treinoDoc.id,
                    ...data,
                    data: data.data ? data.data.toDate() : null,
                    clientName: clientName,
                };
            }));
            setUpcomingTrainings(trainingsData); // onSnapshot já garante que esta lista é substituída, não duplicada.
        }, (err) => {
            console.error("Erro ao buscar próximos treinos:", err);
            if (err.code === 'permission-denied') {
                console.log("Permissão negada para próximos treinos. Isso é esperado em logout.");
                setUpcomingTrainings([]);
                return;
            }
            if (err.code === 'failed-precondition' && err.message.includes('A non-descending order by is required')) {
                Alert.alert("Erro de Firebase", "É necessário um índice no Firestore para esta query. Por favor, verifique a consola do Firebase > Firestore > Índices e crie o índice sugerido.");
                setError("Erro de índice nos próximos treinos.");
            } else {
                setError(`Não foi possível carregar os próximos treinos: ${err.message}`);
            }
        });
        return unsubscribe;
    }, []);

    const fetchRecentCompletedTrainings = useCallback(() => {
        const historicoRef = collection(db, 'historicoTreinos');
        const q = query(
            historicoRef,
            orderBy('dataConclusao', 'desc'),
            limit(3)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const completedTrainingsData = await Promise.all(snapshot.docs.map(async docSnap => {
                const data = docSnap.data();
                let clientName = 'Cliente Desconhecido';

                if (data.userId && auth.currentUser) {
                    try {
                        const clientDocRef = doc(db, 'users', data.userId);
                        const clientDocSnap = await getDoc(clientDocRef);
                        if (clientDocSnap.exists()) {
                            const client = clientDocSnap.data();
                            clientName = client.name || client.firstName || client.nome || 'Cliente sem nome';
                        }
                    } catch (e) {
                        clientName = 'Cliente (Erro na Busca)';
                    }
                } else {
                    clientName = 'Cliente (Não Autenticado)';
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
            if (err.code === 'permission-denied') {
                console.log("Permissão negada para treinos concluídos recentes. Isso é esperado em logout.");
                setRecentCompletedTrainings([]);
                return;
            }
            setError(`Não foi possível carregar os últimos treinos concluídos: ${err.message}`);
        });
        return unsubscribe;
    }, []);

    const subscribeToUnreadMessages = useCallback(() => {
        console.log("Iniciando subscribeToUnreadMessages...");

        // Garante que todos os listeners de mensagens anteriores são limpos
        Object.values(chatMessageUnsubscribersRef.current).forEach(unsub => unsub());
        chatMessageUnsubscribersRef.current = {};

        if (chatMainUnsubscriberRef.current) {
            chatMainUnsubscriberRef.current();
            chatMainUnsubscriberRef.current = null;
        }

        if (!auth.currentUser) {
            console.log("Usuário não autenticado. Não subscrevendo mensagens não lidas.");
            setStats(prevStats => ({ ...prevStats, unreadMessages: 0 }));
            setLoading(false);
            return;
        }

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
            console.log("Snapshot do listener principal de chats recebido.");
            chatsSnapshot.docChanges().forEach(change => {
                const chatId = change.doc.id;

                if (change.type === 'removed') {
                    console.log(`Chat ${chatId} removido. Limpando sub-listener.`);
                    if (chatMessageUnsubscribersRef.current[chatId]) {
                        chatMessageUnsubscribersRef.current[chatId]();
                        delete chatMessageUnsubscribersRef.current[chatId];
                    }
                    if (currentUnreadCounts[chatId] !== undefined) {
                        totalUnread -= currentUnreadCounts[chatId];
                        delete currentUnreadCounts[chatId];
                        setStats(prevStats => ({ ...prevStats, unreadMessages: totalUnread }));
                    }
                    return;
                }

                if (!chatMessageUnsubscribersRef.current[chatId] || change.type === 'modified') {
                    console.log(`Subscrevendo mensagens para o chat ${chatId}.`);
                    if (chatMessageUnsubscribersRef.current[chatId]) {
                        chatMessageUnsubscribersRef.current[chatId]();
                    }

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
                        if (err.code === 'permission-denied') {
                            console.log(`Permissão negada para mensagens do chat ${chatId}. Isso é esperado em logout.`);
                            if (currentUnreadCounts[chatId] !== undefined) {
                                totalUnread -= currentUnreadCounts[chatId];
                                delete currentUnreadCounts[chatId];
                                setStats(prevStats => ({ ...prevStats, unreadMessages: totalUnread }));
                            }
                            if (chatMessageUnsubscribersRef.current[chatId]) {
                                chatMessageUnsubscribersRef.current[chatId]();
                                delete chatMessageUnsubscribersRef.current[chatId];
                            }
                            return;
                        }
                        setError(`Erro ao carregar mensagens não lidas: ${err.message}`);
                    });
                    chatMessageUnsubscribersRef.current[chatId] = unsubscribeMessages;
                }
            });
            setLoading(false);
        }, (err) => {
            console.error("Erro ao assinar chats principais:", err);
            if (err.code === 'permission-denied') {
                console.log("Permissão negada para chats principais. Isso é esperado em logout.");
                setStats(prevStats => ({ ...prevStats, unreadMessages: 0 }));
                setLoading(false);
                return;
            }
            setError(`Erro ao carregar chats: ${err.message}`);
            setLoading(false);
        });

        chatMainUnsubscriberRef.current = unsubscribeChats;

        return () => {
            console.log("Função de limpeza de subscribeToUnreadMessages ativada.");
            if (chatMainUnsubscriberRef.current) {
                chatMainUnsubscriberRef.current();
                chatMainUnsubscriberRef.current = null;
            }
            Object.values(chatMessageUnsubscribersRef.current).forEach(unsub => unsub());
            chatMessageUnsubscribersRef.current = {};
            setStats(prevStats => ({ ...prevStats, unreadMessages: 0 }));
            console.log("Listeners de chat desinscritos.");
        };
    }, []);

    // useFocusEffect para o ciclo de vida da tela
    useFocusEffect(
        useCallback(() => {
            console.log("HomeScreen: useFocusEffect ATIVADO (tela em foco).");
            const currentUser = auth.currentUser;

            // Limpa todos os listeners existentes ao focar (para evitar duplicatas)
            // A forma como os listeners são armazenados e limpos é robusta.
            otherFirestoreUnsubscribers.current.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            });
            otherFirestoreUnsubscribers.current = [];

            if (!currentUser) {
                console.log("HomeScreen: Usuário não autenticado. Limpando dados e listeners.");
                setStats({ newClients: 0, trainingsToday: 0, unreadMessages: 0, pendingEvaluations: 0 });
                setUpcomingTrainings([]);
                setRecentCompletedTrainings([]);
                setLoading(false);
                setError(null);
                const chatCleanup = subscribeToUnreadMessages();
                if (typeof chatCleanup === 'function') chatCleanup();
                return () => {
                    console.log("HomeScreen: useFocusEffect cleanup (sem usuário).");
                };
            }

            console.log("HomeScreen: Usuário autenticado. Iniciando buscas e assinaturas...");
            setLoading(true);
            setError(null);

            // Inicia todas as buscas e assinaturas
            fetchStaticStats();
            const unsubscribeTrainingsToday = subscribeToTrainingsToday();
            const unsubscribeUpcomingTrainings = fetchUpcomingTrainings();
            const unsubscribeRecentCompletedTrainings = fetchRecentCompletedTrainings();
            const cleanupUnreadMessages = subscribeToUnreadMessages();

            // Armazena todas as funções de 'unsubscribe' para limpeza posterior
            otherFirestoreUnsubscribers.current.push(
                unsubscribeTrainingsToday,
                unsubscribeUpcomingTrainings,
                unsubscribeRecentCompletedTrainings,
                cleanupUnreadMessages
            );

            // A função de retorno de 'useFocusEffect' é a função de limpeza
            return () => {
                console.log("HomeScreen: useFocusEffect cleanup. Desinscrevendo todos os listeners.");
                otherFirestoreUnsubscribers.current.forEach(unsub => {
                    if (typeof unsub === 'function') unsub();
                });
                otherFirestoreUnsubscribers.current = [];
                // Nao é necessário limpar os estados aqui, pois a proxima vez que a tela
                // for focada, os novos dados serao carregados.
                console.log("HomeScreen: Listeners desinscritos no cleanup.");
            };
        }, [user, fetchStaticStats, subscribeToTrainingsToday, fetchUpcomingTrainings, fetchRecentCompletedTrainings, subscribeToUnreadMessages])
    );

    // Detalhes do utilizador para o avatar e nome
    const userDisplayName = userDetails?.nome || userDetails?.firstName || userDetails?.name || 'Admin';
    const firstName = userDisplayName.split(' ')[0];
    const userInitial = firstName ? firstName.charAt(0).toUpperCase() : '';

    if (loading || !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
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
                }} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Barra Fixa Superior (Header) - Agora um componente! */}
            <AppHeader />

            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.welcomeSection}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        // Usando getParent() para navegar para a rota PerfilAdmin no AdminStack pai
                        onPress={() => navigation.getParent()?.navigate('PerfilAdmin')}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{userInitial}</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.welcomeCombinedText}>Boa noite, {firstName}</Text>
                </View>

                {/* --- RESUMO RÁPIDO / ESTATÍSTICAS --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Estatísticas Chave</Text>
                    <View style={styles.statsContainer}>
                        <StatItem value={stats.newClients} label="Meus Clientes" icon="person-add-outline" style={styles.statItemColumn} />
                        <StatItem value={stats.trainingsToday} label="Treinos Hoje" icon="barbell-outline" style={styles.statItemColumn} />
                        <StatItem value={stats.unreadMessages} label="Mensagens Novas" icon="chatbubbles-outline" isUnread={stats.unreadMessages > 0} style={styles.statItemColumn} />
                        <StatItem value={stats.pendingEvaluations} label="Aval. Pendentes" icon="document-text-outline" style={styles.statItemColumn} />
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
                        <ActionButton icon="chatbubbles-outline" text="Chat Online" onPress={() => navigation.navigate('AdminChatList')} />
                        <ActionButton icon="library-outline" text="Gerir Modelos" onPress={() => navigation.navigate('WorkoutTemplates')} />
                        <ActionButton icon="barbell-outline" text="Gerir Exercícios" onPress={() => navigation.navigate('ExerciseLibrary')} />
                        <ActionButton icon="checkmark-done-circle-outline" text="Histórico Treinos" onPress={() => navigation.navigate('CompletedTrainingsHistory')} />
                        <ActionButton icon="calendar-number-outline" text="Gerir Aulas PT" onPress={() => navigation.navigate('ManagePTClasses')} />
                    </ScrollView>
                </View>

                {/* --- PRÓXIMOS TREINOS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderWithButton}>
                        <Text style={styles.sectionTitle}>Próximos Treinos</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Agenda')} activeOpacity={0.7}>
                            <Text style={styles.viewAllLink}>Ver todos <Ionicons name="arrow-forward-outline" size={Layout.fontSizes.medium} color={Colors.info} /></Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.card}>
                        {upcomingTrainings.length > 0 ? (
                            upcomingTrainings.map((training, index) => (
                                <React.Fragment key={training.id}>
                                    <TrainingCard type="upcoming" training={training} formatarDuracao={formatarDuracao} />
                                    {index < upcomingTrainings.length - 1 && <View style={styles.itemSeparator} />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>Nenhum treino agendado para breve.</Text>
                        )}
                    </View>
                </View>

                {/* --- ÚLTIMOS TREINOS CONCLUÍDOS --- */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderWithButton}>
                        <Text style={styles.sectionTitle}>Últimos Treinos Concluídos</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('CompletedTrainingsHistory')} activeOpacity={0.7}>
                            <Text style={styles.viewAllLink}>Ver todo o Histórico <Ionicons name="arrow-forward-outline" size={Layout.fontSizes.medium} color={Colors.info} /></Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.card}>
                        {recentCompletedTrainings.length > 0 ? (
                            recentCompletedTrainings.map((training, index) => (
                                <React.Fragment key={training.id}>
                                    <TrainingCard type="completed" training={training} formatarDuracao={formatarDuracao} />
                                    {index < recentCompletedTrainings.length - 1 && <View style={styles.itemSeparator} />}
                                </React.Fragment>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>Nenhum treino concluído recentemente.</Text>
                        )}
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
        // Removendo paddingTop aqui, pois o AppHeader já lida com a StatusBar
        // e o ScrollView compensará a borda arredondada.
    },
    
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: Layout.spacing.medium,
        fontSize: Layout.fontSizes.large,
        color: Colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: Layout.padding,
    },
    errorText: {
        fontSize: Layout.fontSizes.large,
        color: Colors.error,
        textAlign: 'center',
        marginBottom: Layout.spacing.large,
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: Layout.spacing.medium,
        paddingHorizontal: Layout.spacing.large,
        borderRadius: Layout.borderRadius.medium,
    },
    retryButtonText: {
        color: Colors.onPrimary,
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
    },
    scrollViewContent: {
        paddingVertical: Layout.padding, // Mantém o padding vertical para o conteúdo
        paddingHorizontal: Layout.padding, // Mantém o padding horizontal
        // Este marginTop é crucial para que o conteúdo "suba" e se encaixe na curva do AppHeader
        marginTop: -Layout.borderRadius.medium * 1.5, // Multiplicar por 1.5 ou 2 pode dar um efeito mais visível
        paddingTop: Layout.padding + Layout.borderRadius.medium * 1.5, // Ajusta o padding para compensar o marginTop negativo
    },
    // --- ESTILOS PARA A SEÇÃO DE BOAS-VINDAS (AJUSTADOS) ---
    welcomeSection: {
        flexDirection: 'row',
        alignItems: 'center', // Alinha verticalmente o avatar e o texto
        paddingHorizontal: Layout.padding, // Usar o padding do Layout para consistência
        marginTop: 20,
        marginBottom: 20, // Espaço após a seção de boas-vindas
    },
    avatarContainer: {
        marginRight: 10, // Espaço entre o avatar e o texto
    },
    avatar: {
        width: 40, // AVATAR MENOR
        height: 40, // AVATAR MENOR
        borderRadius: Layout.borderRadius.pill,
        backgroundColor: Colors.primary, // Dourado
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5, // Borda um pouco mais fina
        borderColor: Colors.accent,
    },
    avatarText: {
        color: Colors.onPrimary, // Branco sobre dourado
        fontSize: Layout.fontSizes.medium, // Letra menor para o avatar menor
        fontWeight: 'bold',
    },
    welcomeCombinedText: {
        fontSize: Layout.fontSizes.large, // Tamanho do texto de saudação
        color: Colors.textPrimary, // Cor principal para o texto
        fontWeight: '600', // Um pouco mais de destaque
    },
    // --- ESTILOS REMOVIDOS/AJUSTADOS ---
    // welcomeTextContainer foi removido (não necessário com um único Text)
    // welcomeGreeting e welcomeName foram substituídos por welcomeCombinedText

    // --- ESTILOS EXISTENTES (verificar e ajustar se necessário) ---
    section: {
        marginBottom: Layout.spacing.xlarge,
    },
    sectionTitle: {
        fontSize: Layout.fontSizes.title,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: Layout.spacing.medium,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItemColumn: {
        width: (Layout.window.width - Layout.padding * 2 - Layout.spacing.medium) / 2, // Ajustado para corresponder ao padding do scrollViewContent
        marginBottom: Layout.spacing.medium,
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
        padding: Layout.spacing.medium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionsScrollContent: {
        paddingVertical: Layout.spacing.small,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
        overflow: 'hidden',
        paddingVertical: Layout.spacing.small,
    },
    itemSeparator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.lightGray,
        marginHorizontal: Layout.spacing.medium,
    },
    noDataText: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.textSecondary,
        padding: Layout.padding,
        textAlign: 'center',
    },
    sectionHeaderWithButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Layout.spacing.medium,
    },
    viewAllLink: {
        fontSize: Layout.fontSizes.medium,
        fontWeight: '600',
        color: Colors.info,
    },
});