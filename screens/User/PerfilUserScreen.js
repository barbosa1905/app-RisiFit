import React, { useCallback, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    ScrollView,
    Platform,
    StatusBar,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc, getFirestore } from 'firebase/firestore'; // Adicionado getFirestore
import { getAuth, signOut, onAuthStateChanged, signInAnonymously } from 'firebase/auth'; // Adicionado onAuthStateChanged, signInAnonymously
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationHelpers from '@react-navigation/native';
import { initializeApp, getApps, getApp } from 'firebase/app'; // Adicionado para inicialização do Firebase

// --- FIREBASE CONFIGURATION: Makes the component self-sufficient ---
// Replace with your credentials
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


// Paleta de Cores (constants/Colors.js) - Usando a paleta fornecida
const Colors = {
    // Cores Primárias (Dourado/Preto)
    primary: '#D4AC54', // Dourado mais escuro para a marca principal
    primaryLight: '#e0c892', // Dourado mais claro para destaques (ajustado para ser mais claro)
    primaryDark: '#69511a', // Dourado mais profundo (ajustado para ser mais escuro)

    secondary: '#1a1a1a', // Um preto muito escuro ou cinza carvão para secundário
    secondaryLight: '#4A4E46', // Um cinza escuro um pouco mais claro
    secondaryDark: '#1C201A', // Um preto quase absoluto

    accent: '#FFD700', // Dourado puro/ouro para ênfase forte
    accentLight: '#FFE066', // Amarelo dourado mais suave
    accentDark: '#CCAA00', // Dourado mais escuro para contraste

    // Cores de Fundo
    background: '#F9FAFB', // Fundo geral muito claro (quase branco)
    surface: '#FFFFFF', // Fundo para cartões, headers (branco puro)
    cardBackground: '#FFFFFF', // Alias para surface

    // Cores de Texto
    textPrimary: '#1A1A1A', // Texto principal (preto bem escuro)
    textSecondary: '#505050', // Texto secundário (cinza médio-escuro)
    textLight: '#8a8a8a96', // Texto mais claro (cinza claro)

    // Cores Neutras (Pretos, Brancos, Tons de Cinza)
    white: '#FFFFFF',
    black: '#000000',

    lightGray: '#E0E0E0', // Bordas, separadores
    mediumGray: '#C0C0C0', // Componentes desabilitados, fundos sutis
    darkGray: '#707070', // Texto e ícones gerais que não sejam primary/secondary

    // Cores de Feedback
    success: '#4CAF50', // Mantido verde para universalidade (sucesso)
    warning: '#FFC107', // Mantido amarelo para universalidade (avisos)
    error: '#DC3545', // Mantido vermelho para universalidade (erros)
    info: '#17A2B8', // Mantido azul para universalidade (informações/links)

    // Cores de "On" (para texto/ícone sobre a cor base)
    onPrimary: '#FFFFFF', // Branco sobre o dourado
    onSecondary: '#871818ff', // Branco sobre o preto/cinza escuro
    onAccent: '#1A1A1A', // Preto sobre o dourado de ênfase
};

// Global Styles (para sombras consistentes)
const GlobalStyles = {
    shadow: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 7,
    },
    cardShadow: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 14,
    }
};

// Componente AppHeader (copiado e adaptado do PerfilAdminScreen)
const AppHeader = ({ title, showBackButton = false, onBackPress = () => {} }) => {
    return (
        <View style={headerStyles.headerContainer}>
            <StatusBar
                barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                backgroundColor={Colors.primary}
            />
            <View style={headerStyles.headerContent}>
                {showBackButton && (
                    <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
                        <Ionicons name="arrow-back" size={22} color={Colors.onPrimary} />
                    </TouchableOpacity>
                )}
                <Text style={[headerStyles.headerTitle, !showBackButton && { marginLeft: 0 }]}>{title}</Text>
            </View>
        </View>
    );
};

// Estilos para o AppHeader
const headerStyles = StyleSheet.create({
    headerContainer: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 12,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
        marginBottom: 10,
        width: '100%',
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.onPrimary,
        textAlign: 'center',
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        padding: 5,
    }
});


export default function PerfilUserScreen() {
    const { user } = useUser(); // Mantido para o contexto do utilizador
    const [currentUser, setCurrentUser] = useState(auth.currentUser); // Estado para o user do Firebase Auth
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    // Listener de autenticação para garantir que `currentUser` está atualizado
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                setCurrentUser(firebaseUser);
            } else {
                // Tenta login anónimo se não houver utilizador logado para permitir acesso ao Firestore
                signInAnonymously(auth).then(userCredential => {
                    setCurrentUser(userCredential.user);
                }).catch(error => {
                    console.error("Erro ao autenticar anonimamente:", error);
                    Alert.alert("Erro", "Não foi possível autenticar o utilizador para carregar o perfil.");
                });
            }
        });
        return () => unsubscribe();
    }, []);


    const getInitial = useCallback((name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    }, []);

    const fetchUserData = useCallback(() => {
        async function getData() {
            // Usa currentUser do Firebase Auth para o UID
            if (!currentUser?.uid) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                // Usa db do Firebase para Firestore
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    setUserData(data);
                } else {
                    Alert.alert('Erro', 'Dados do utilizador não encontrados.');
                }
            } catch (error) {
                console.error('Erro ao carregar dados do utilizador:', error);
                Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
            } finally {
                setLoading(false);
            }
        }

        getData();
    }, [currentUser?.uid]); // Depende de currentUser.uid

    useFocusEffect(
        useCallback(() => {
            fetchUserData();
            return () => {}; // Cleanup function for useFocusEffect
        }, [fetchUserData])
    );

    const handleLogout = () => {
        Alert.alert(
            'Terminar Sessão',
            'Tem a certeza que quer sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log("--- PerfilUserScreen: INICIANDO LOGOUT ---");
                            console.log("PerfilUserScreen: Usuário autenticado ANTES do signOut:", auth.currentUser?.uid);

                            await signOut(auth); // Logout do firebase
                            console.log("PerfilUserScreen: signOut do Firebase COMPLETO.");
                            console.log("PerfilUserScreen: Usuário autenticado DEPOIS do signOut:", auth.currentUser?.uid); // Deve ser null aqui

                            console.log("PerfilUserScreen: Adicionando atraso de 300ms antes de resetar a navegação...");
                            await new Promise(resolve => setTimeout(resolve, 300)); // Atraso de 300ms

                            navigation.dispatch(
                                NavigationHelpers.CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Login' }],
                                })
                            );
                            console.log("PerfilUserScreen: Pilha de navegação redefinida para 'Login'.");

                        } catch (error) {
                            console.error('PerfilUserScreen: Erro durante o logout:', error);
                            Alert.alert(
                                'Erro ao sair',
                                'Ocorreu um problema ao terminar a sessão. Tente novamente.'
                            );
                        }
                    },
                },
            ],
            { cancelable: false }
        );
    };

    const handleGerirPerfil = () => {
        navigation.navigate('EditarPerfilUser');
    };

    const handleAbrirQuestionario = () => {
        navigation.navigate('ListarQuestionariosUser');
    };

    const handleChangePassword = () => {
        navigation.navigate('ChangePasswordScreen');
    };

    const handleVerMeusTreinos = () => {
        navigation.navigate('HistoricoTreinosUser');
    };

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>A carregar dados do utilizador...</Text>
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.errorText}>Utilizador não encontrado ou erro ao carregar.</Text>
                <TouchableOpacity onPress={fetchUserData} style={styles.retryButton}>
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const userNameToDisplay = userData.nome || userData.name || 'Sem Nome';
    const avatarInitial = getInitial(userNameToDisplay);

    return (
        <SafeAreaView style={styles.safeArea}>
            <AppHeader title="Meu Perfil" showBackButton={true} onBackPress={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.contentContainer}>
                {/* Seção de Avatar e Nome */}
                <View style={styles.profileSummary}>
                    <View style={styles.avatarContainer}>
                        {userData.avatar ? (
                            <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.initialsAvatar, GlobalStyles.cardShadow]}>
                                <Text style={styles.initialsText}>{avatarInitial}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.profileName}>{userNameToDisplay}</Text>
                    <Text style={styles.profileRole}>Utilizador</Text>
                </View>

                {/* Card de Informações Pessoais */}
                <View style={[styles.infoCard, GlobalStyles.cardShadow]}>
                    <Text style={styles.cardTitle}>Informações Pessoais</Text>
                    <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={22} color={Colors.primaryDark} style={styles.detailIcon} />
                        <Text style={styles.infoText}>Email: {currentUser?.email || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={22} color={Colors.primaryDark} style={styles.detailIcon} />
                        <Text style={styles.infoText}>Telefone: {userData.telefoneCompleto || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={22} color={Colors.primaryDark} style={styles.detailIcon} />
                        <Text style={styles.infoText}>Nascimento: {userData.dataNascimento || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={22} color={Colors.primaryDark} style={styles.detailIcon} />
                        <Text style={styles.infoText}>Endereço: {userData.endereco || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="fitness-outline" size={22} color={Colors.primaryDark} style={styles.detailIcon} />
                        <Text style={styles.infoText}>Plano: {userData.plan || 'N/A'}</Text>
                    </View>
                </View>

                {/* Grupo de Ações */}
                <View style={styles.actionGroup}>
                    <Text style={styles.sectionTitle}>Ações Rápidas</Text>

                    <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={handleGerirPerfil}>
                        <Ionicons name="create-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Gerir Perfil</Text>
                        <Ionicons name="chevron-forward-outline" size={24} color={Colors.darkGray} style={styles.actionArrow} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={handleChangePassword}>
                        <Ionicons name="key-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Alterar Palavra-passe</Text>
                        <Ionicons name="chevron-forward-outline" size={24} color={Colors.darkGray} style={styles.actionArrow} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={handleAbrirQuestionario}>
                        <Ionicons name="clipboard-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Responder Questionário</Text>
                        <Ionicons name="chevron-forward-outline" size={24} color={Colors.darkGray} style={styles.actionArrow} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, GlobalStyles.shadow]} onPress={handleVerMeusTreinos}>
                        <Ionicons name="barbell-outline" size={24} color={Colors.primaryDark} style={styles.actionIcon} />
                        <Text style={styles.actionButtonText}>Ver Meus Treinos</Text>
                        <Ionicons name="chevron-forward-outline" size={24} color={Colors.darkGray} style={styles.actionArrow} />
                    </TouchableOpacity>
                </View>

                {/* Botão de Terminar Sessão */}
                <TouchableOpacity style={[styles.logoutButton, GlobalStyles.cardShadow]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color={Colors.white} style={styles.logoutIcon} />
                    <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 17,
        color: Colors.error,
        marginBottom: 15,
        textAlign: 'center',
        fontWeight: '500',
    },
    retryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
        ...GlobalStyles.shadow,
    },
    retryButtonText: {
        color: Colors.onPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    profileSummary: {
        alignItems: 'center',
        marginBottom: 30,
        width: '100%',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGray,
    },
    avatarContainer: {
        marginBottom: 15,
    },
    initialsAvatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImage: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryDark,
    },
    initialsText: {
        color: Colors.white,
        fontSize: 60,
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.textPrimary,
        marginBottom: 5,
        textAlign: 'center',
    },
    profileRole: {
        backgroundColor: Colors.primaryLight,
        color: Colors.secondary,
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
        fontSize: 14,
        fontWeight: '600',
    },
    infoCard: {
        width: '100%',
        backgroundColor: Colors.surface,
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.secondary,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.lightGray,
        paddingBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailIcon: {
        marginRight: 15,
        color: Colors.primaryDark,
    },
    infoText: {
        fontSize: 16,
        color: Colors.textSecondary,
        flexShrink: 1,
    },
    actionGroup: {
        width: '100%',
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.secondary,
        marginBottom: 15,
        textAlign: 'left',
        width: '100%',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.lightGray,
    },
    actionIcon: {
        marginRight: 15,
    },
    actionButtonText: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
        color: Colors.secondary,
    },
    actionArrow: {
        marginLeft: 10,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: Colors.error,
        paddingVertical: 16,
        borderRadius: 10,
        marginTop: 10,
    },
    logoutIcon: {
        marginRight: 10,
    },
    logoutButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '600',
    },
});
