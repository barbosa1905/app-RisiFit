import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

// Paleta de Cores (Mantida)
const Colors = {
  primaryGold: '#D4AF37',
  darkBrown: '#3E2723',
  lightBrown: '#795548',
  creamBackground: '#FDF7E4',
  white: '#FFFFFF',
  lightGray: '#ECEFF1',
  mediumGray: '#B0BEC5',
  darkGray: '#424242',
  successGreen: '#4CAF50',
  errorRed: '#F44336',
  shadow: 'rgba(0,0,0,0.08)',
};

export default function FichaClienteScreen({ route }) {
  const { clienteId } = route.params; // clientename não é estritamente necessário aqui, simplificando
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClient = async () => {
      try {
        const docRef = doc(db, 'users', clienteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCliente(docSnap.data());
        } else {
          setCliente(null);
        }
      } catch (error) {
        console.error('Failed to load client data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadClient();
  }, [clienteId]);

  // Helper para formatar data
  const formatDate = (data) => {
    if (!data) return 'N/A'; // N/A para "Não Aplicável" ou "Não Informado"
    if (data.seconds) { // Firestore Timestamp
      return new Date(data.seconds * 1000).toLocaleDateString('pt-PT');
    }
    if (typeof data === 'string' && (data.includes('T') || data.includes('-'))) { // ISO string ou YYYY-MM-DD
        const parsedDate = new Date(data);
        if (!isNaN(parsedDate)) { // Check if date is valid
            return parsedDate.toLocaleDateString('pt-PT');
        }
    }
    if (data instanceof Date) { // JavaScript Date object
        return data.toLocaleDateString('pt-PT');
    }
    return data; // Assume it's already in the desired string format
  };

  // Helper para renderizar booleans com ícones compactos
  const renderBooleanIcon = (value) => {
    if (value === true || value === 'Sim') {
      return <Ionicons name="checkmark-circle" size={18} color={Colors.successGreen} />; // Ícone menor
    }
    if (value === false || value === 'Não') {
      return <Ionicons name="close-circle" size={18} color={Colors.errorRed} />; // Ícone menor
    }
    return <Text style={styles.valueTextNA}>N/A</Text>; // Texto menor
  };

  // Componente de item de ficha mais compacto
  const FichaItem = ({ iconName, label, value, isBoolean = false }) => (
    <View style={styles.cardItem}>
      <View style={styles.itemContent}>
        <Ionicons name={iconName} size={20} color={Colors.primaryGold} style={styles.itemIcon} /> 
        <Text style={styles.itemLabel}>{label}:</Text> 
        {isBoolean ? (
          <View style={styles.itemValueBooleanContainer}>
            {renderBooleanIcon(value)}
          </View>
        ) : (
          <Text style={styles.itemValueText}>{value || 'N/A'}</Text>
        )}
      </View>
    </View>
  );


  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primaryGold} />
        <Text style={styles.loadingText}>A carregar ficha...</Text>
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={40} color={Colors.errorRed} />
        <Text style={styles.errorText}>Cliente não encontrado.</Text>
      </View>
    );
  }

  const clientInitial = cliente.name ? cliente.name.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.creamBackground} />
      <ScrollView contentContainerStyle={styles.scrollViewContent}>

        <View style={styles.clientHeader}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>{clientInitial}</Text>
          </View>
          <Text style={styles.clientNameTitle}>{cliente.name || 'Cliente'}</Text>
          <Text style={styles.clientEmailSubtitle}>{cliente.email || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <FichaItem iconName="person-outline" label="Nome" value={cliente.name} />
          <FichaItem iconName="call-outline" label="Telefone" value={cliente.telefoneCompleto} />
          <FichaItem iconName="calendar-outline" label="Nascimento" value={formatDate(cliente.dataNascimento)} />
          <FichaItem iconName="transgender-outline" label="Gênero" value={cliente.genero} />
          <FichaItem iconName="people-outline" label="Grupo" value={cliente.grupo} />
          <FichaItem iconName="time-outline" label="Criado Em" value={formatDate(cliente.criadoEm)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>
          <FichaItem iconName="mail-outline" label="Enviar Acesso" value={cliente.enviarAcesso} isBoolean />
          <FichaItem iconName="document-text-outline" label="Enviar Anamnese" value={cliente.enviarAnamnese} isBoolean />

          {cliente.enviarAnamnese === 'Sim' && cliente.tipoAnamneseId && (
            <FichaItem iconName="reader-outline" label="Tipo Anamnese" value={cliente.tipoAnamneseId} />
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
  },
  scrollViewContent: {
    padding: 15, // Reduzido o padding geral
    backgroundColor: Colors.creamBackground,
    flexGrow: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.creamBackground,
  },
  loadingText: {
    marginTop: 10, // Espaçamento menor
    fontSize: 16, // Fonte menor
    color: Colors.darkBrown,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16, // Fonte menor
    color: Colors.errorRed,
    marginTop: 10, // Espaçamento menor
    textAlign: 'center',
  },
  valueTextNA: {
    fontSize: 14, // Fonte menor para N/A
    color: Colors.mediumGray,
  },

  // --- Client Header Section (mais compacto) ---
  clientHeader: {
    alignItems: 'center',
    marginBottom: 25, // Espaçamento menor
    paddingBottom: 15, // Espaçamento menor
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  clientAvatar: {
    width: 80, // Avatar menor
    height: 80, // Avatar menor
    borderRadius: 40,
    backgroundColor: Colors.primaryGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, // Espaçamento menor
    borderWidth: 2, // Borda mais fina
    borderColor: Colors.darkBrown,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 3 }, // Sombra mais sutil
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 6, // Elevação menor
      },
    }),
  },
  clientAvatarText: {
    color: Colors.white,
    fontSize: 38, // Fonte do avatar menor
    fontWeight: 'bold',
  },
  clientNameTitle: {
    fontSize: 24, // Título menor
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: 3, // Espaçamento menor
    textAlign: 'center',
  },
  clientEmailSubtitle: {
    fontSize: 14, // Subtítulo menor
    color: Colors.mediumGray,
    textAlign: 'center',
  },

  // --- Sections (mais compactas) ---
  section: {
    marginBottom: 25, // Espaçamento entre seções menor
  },
  sectionTitle: {
    fontSize: 18, // Título de seção menor
    fontWeight: '600',
    color: Colors.darkBrown,
    marginBottom: 15, // Espaçamento menor
    textAlign: 'center',
  },

  // --- Card Item Styles (mais compactos) ---
  cardItem: { // Renomeado de 'card' para 'cardItem' para clareza
    backgroundColor: Colors.white,
    borderRadius: 10, // Arredondamento menor
    padding: 12, // Padding menor
    marginBottom: 10, // Margem menor entre itens
    shadowColor: Colors.shadow,
    shadowOpacity: 0.08, // Sombra mais sutil
    shadowRadius: 5, // Sombra mais sutil
    shadowOffset: { width: 0, height: 3 },
    elevation: 4, // Elevação menor
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    // Não há marginBottom aqui, pois o padding do card já lida com o espaçamento
  },
  itemIcon: {
    marginRight: 8, // Espaçamento menor
  },
  itemLabel: {
    fontSize: 15, // Rótulo menor
    fontWeight: '600',
    color: Colors.darkBrown,
    flex: 1, // Permite que o rótulo ocupe o espaço e o valor fique ao lado
  },
  itemValueText: {
    fontSize: 15, // Valor menor, alinhado com o rótulo
    color: Colors.darkGray,
    // Removido paddingLeft, agora o alinhamento é feito pelo flexbox
  },
  itemValueBooleanContainer: {
    // Removido paddingLeft
  },
});