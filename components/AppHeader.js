import React from 'react';
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- CONSTANTES DE CORES E LAYOUT ---
// Estas constantes devem ser as mesmas que você usa em seus outros arquivos
const Colors = {
    primaryGold: '#B8860B', // Dourado mais clássico e vibrante
    darkBrown: '#3E2723',   // Marrom bem escuro para textos e ícones principais
    lightBrown: '#795548',  // Marrom mais suave para detalhes e placeholders
    creamBackground: '#FDF7E4', // Fundo creme claro para a maioria da tela

    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro para fundos secundários
    mediumGray: '#B0BEC5',   // Cinza médio para textos secundários e bordas inativas
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',   // Azul vibrante para links/destaques (ex: treino completo)
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#EF5350',    // Vermelho para erros/alertes (urgente)

    headerBackground: '#B8860B', // Fundo do header, igual ao primaryGold
    headerText: '#000000',     // Texto e ícones do header (ajustado para ser mais visível no dourado)
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

    // Cores adicionais para o tema
    textPrimary: '#3E2723', // Marrom escuro para texto principal
    textSecondary: '#795548', // Marrom suave para texto secundário
    info: '#2196F3', // Azul para links/informações
    warning: '#FFC107', // Amarelo para avisos
    error: '#EF5350', // Vermelho para erros
    onPrimary: '#FFFFFF', // Cor do texto sobre o primaryGold (anteriormente 'primary')
    accent: '#D4AF37', // Dourado mais claro para acentos
    surface: '#FFFFFF', // Fundo de superfície para cards, etc.
    textOnPrimary: '#000000', // Cor do texto sobre o fundo primário (dourado) - ALTERADO PARA PRETO
};

const Layout = {
    padding: 20,
    spacing: {
        xsmall: 4,
        small: 8,
        medium: 16,
        large: 24,
        xlarge: 32,
    },
    borderRadius: {
        small: 6,
        medium: 12,
        large: 20,
        pill: 50,
    },
    fontSizes: {
        xsmall: 12,
        small: 14,
        medium: 16,
        large: 18,
        xlarge: 22,
        title: 28,
        header: 24,
    },
    cardElevation: Platform.select({
        ios: {
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },
        android: {
            elevation: 6,
        },
    }),
};


// AppHeader.js - Com o fundo dourado (Colors.primary)
const AppHeader = ({ 
    title = 'Painel Admin',
    subtitle = '',
    showBackButton = false,
    onBackPress = () => {},
    showBell = true, // Alterado para true por padrão
    showMenu = false,
    notificationCount = 0, // NOVO: Propriedade para o contador de notificações
}) => {
    return (
        <View style={styles.headerContainer}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.headerBackground} />
            <View style={styles.leftContainer}>
                {showBackButton && (
                    <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                        <Ionicons name="arrow-back-outline" size={28} color={Colors.textOnPrimary} />
                    </TouchableOpacity>
                )}
                {showMenu && (
                    <TouchableOpacity style={styles.menuButton}>
                        <Ionicons name="menu-outline" size={28} color={Colors.textOnPrimary} />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.centerContainer}>
                {title && <Text style={styles.headerTitle}>{title}</Text>}
                {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
            </View>
            <View style={styles.rightContainer}>
                {showBell && (
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={24} color={Colors.textOnPrimary} />
                        {notificationCount > 0 && ( // Renderiza o badge apenas se houver notificações
                            <View style={styles.notificationBadge}>
                                <Text style={styles.notificationBadgeText}>
                                    {notificationCount > 99 ? '99+' : notificationCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + Layout.spacing.small : Layout.spacing.medium,
        backgroundColor: Colors.primaryGold, // Usando primaryGold como o AppHeader original
        paddingHorizontal: Layout.padding,
        paddingBottom: Layout.spacing.medium,
        borderBottomLeftRadius: Layout.borderRadius.large * 2, // Ajustado para maior arredondamento
        borderBottomRightRadius: Layout.borderRadius.large * 2, // Ajustado para maior arredondamento
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: Colors.shadowColor, // Usando shadowColor da paleta
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    leftContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    centerContainer: {
        flex: 2,
        alignItems: 'center',
    },
    rightContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    headerTitle: {
        fontSize: Layout.fontSizes.title,
        fontWeight: 'bold',
        color: Colors.textOnPrimary, // Usando textOnPrimary
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: Layout.fontSizes.small,
        color: Colors.textOnPrimary, // Usando textOnPrimary
        textAlign: 'center',
        marginTop: Layout.spacing.xsmall,
    },
    backButton: {
        padding: Layout.spacing.small,
    },
    menuButton: {
        padding: Layout.spacing.small,
    },
    notificationButton: {
        padding: Layout.spacing.small,
        position: 'relative', // Necessário para posicionar o badge
    },
    // NOVO: Estilos para o badge de notificação
    notificationBadge: {
        position: 'absolute',
        top: 5, // Ajuste a posição conforme necessário
        right: 5, // Ajuste a posição conforme necessário
        backgroundColor: Colors.errorRed, // Cor de destaque para o badge
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.white, // Borda branca para contraste
    },
    notificationBadgeText: {
        color: Colors.white,
        fontSize: Layout.fontSizes.xsmall,
        fontWeight: 'bold',
    },
});

export default AppHeader;
