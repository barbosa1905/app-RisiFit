import React, { useCallback, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../contexts/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// ... (your colors definition remains the same)
const colors = {
    primary: '#D4AC54',
    primaryDark: '#A88433',
    secondary: '#69511A',
    textMuted: '#767676',
    background: '#F8F8F8',
    backgroundLight: '#FFFFFF',
    border: '#E0E0E0',
    shadow: 'rgba(0,0,0,0.08)',
    danger: '#D32F2F',
    textLight: '#FFFFFF',
};

export default function PerfilUserScreen() {
    const { user } = useUser();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();

    const getInitial = useCallback((name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    }, []);

    const fetchUserData = useCallback(() => { // This outer function is the one passed to useFocusEffect
        async function getData() { // This is your async function defined inside
            if (!user?.uid) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const userDocRef = doc(db, 'users', user.uid);
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

        getData(); // Call the async function immediately
    }, [user?.uid]);

    // This is the correct way to use useFocusEffect with an async function
    useFocusEffect(fetchUserData); // Pass the memoized callback directly

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
                            await signOut(auth);
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });
                        } catch (error) {
                            console.error('Erro ao terminar sessão:', error);
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

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
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
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <View style={styles.initialsAvatar}>
                        <Text style={styles.initialsText}>{avatarInitial}</Text>
                    </View>
                </View>
                <Text style={styles.nome}>{userNameToDisplay}</Text>
                <Text style={styles.roleTag}>Utilizador</Text>
            </View>

            <View style={styles.detailsCard}>
                <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.info}>Email: {user?.email || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="card-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.info}>ID: {user?.uid || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.info}>Telefone: {userData.telefone || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.info}>Nascimento: {userData.dataNascimento || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={20} color={colors.primary} style={styles.detailIcon} />
                    <Text style={styles.info}>Endereço: {userData.endereco || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="fitness-outline" size={20} color={colors.primary} style={styles.detailIcon} /> 
                    <Text style={styles.info}>Plano: {userData.plan || 'N/A'}</Text>
                </View>
            </View>

            <View style={styles.actionGroup}>
                <Text style={styles.sectionTitle}>Ações Rápidas</Text>

                <TouchableOpacity style={styles.actionButton} onPress={handleAbrirQuestionario}>
                    <Ionicons name="clipboard-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
                    <Text style={styles.actionButtonText}>Responder Questionário</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleGerirPerfil}>
                    <Ionicons name="create-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} />
                    <Text style={styles.actionButtonText}>Gerir Perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('HistoricoTreinosUser')}>
                    <Ionicons name="barbell-outline" size={22} color={colors.primaryDark} style={styles.actionIcon} /> 
                    <Text style={styles.actionButtonText}>Ver Meus Treinos</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={22} color={colors.textLight} style={styles.logoutIcon} />
                <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ... (your styles definition remains the same)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        padding: 20,
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: colors.secondary,
        fontSize: 16,
    },
    errorText: {
        fontSize: 17,
        color: colors.danger,
        marginBottom: 15,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        elevation: 3,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
        }),
    },
    retryButtonText: {
        color: colors.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    header: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 25,
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    initialsAvatar: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 4,
        borderColor: colors.primary,
        backgroundColor: colors.primaryDark,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    initialsText: {
        color: colors.textLight,
        fontSize: 60,
        fontWeight: 'bold',
    },

    nome: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 5,
        textAlign: 'center',
    },
    roleTag: {
        backgroundColor: colors.primary,
        color: colors.textLight,
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
        fontSize: 14,
        fontWeight: '600',
    },

    detailsCard: {
        width: '100%',
        backgroundColor: colors.backgroundLight,
        borderRadius: 12,
        padding: 18,
        marginBottom: 25,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.15,
                shadowRadius: 6,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailIcon: {
        marginRight: 10,
    },
    info: {
        fontSize: 16,
        color: colors.textMuted,
        flexShrink: 1,
    },

    actionGroup: {
        width: '100%',
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.secondary,
        marginBottom: 15,
        textAlign: 'left',
        width: '100%',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    actionIcon: {
        marginRight: 15,
    },
    actionButtonText: {
        fontSize: 17,
        fontWeight: '500',
        color: colors.secondary,
    },

    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor: colors.danger,
        paddingVertical: 16,
        borderRadius: 10,
        marginTop: 10,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 5,
            },
            android: {
                elevation: 7,
            },
        }),
    },
    logoutIcon: {
        marginRight: 10,
    },
    logoutButtonText: {
        color: colors.textLight,
        fontSize: 18,
        fontWeight: '600',
    },
});