import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Dimensions, // Importar Dimensions para cálculos de layout
} from 'react-native';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  getFirestore 
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader'; // Caminho corrigido para o AppHeader
import Colors from '../../constants/Colors'; // Caminho corrigido para Colors
import Layout from '../../constants/Layout'; // Caminho corrigido para Layout

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


// Color Palette and Global Styles
const GlobalStyles = {
  cardShadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Aumentado para uma sombra mais visível
    shadowRadius: 6, // Ajustado para uma sombra mais suave mas presente
    elevation: 8, // Aumentado para Android
  }
};

export default function ListarQuestionariosScreen() {
  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  const adminId = auth.currentUser?.uid;

  useEffect(() => {
    // Anonymous authentication to ensure Firestore can be accessed
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(e => console.error("Error in anonymous authentication:", e));
      }
    });

    const q = query(collection(db, 'questionarios'));

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuestionarios(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to questionnaires:', error);
      Alert.alert('Error', 'Failed to load questionnaires.');
      setLoading(false);
    });

    // The cleanup function of useEffect returns the function to stop the listener
    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot();
    };
  }, []);

  const handleExcluir = (questionarioId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este questionário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'questionarios', questionarioId));
              Alert.alert('Sucesso', 'Questionário excluído.');
            } catch (error) {
              console.error('Error deleting:', error);
              Alert.alert('Error', 'Could not delete the questionnaire.');
            }
          }
        }
      ]
    );
  };
  
  const renderItem = ({ item }) => (
    <View style={[styles.itemContainer, GlobalStyles.cardShadow]}>
      <Text style={styles.title}>{item.titulo || item.id}</Text>
      <View style={styles.buttonsRow}>
        {/* --- REMOVED: View button --- */}
        
        <TouchableOpacity
          style={[styles.button, styles.editButton, GlobalStyles.cardShadow]}
          onPress={() =>
            navigation.navigate('CriarQuestionario', {
              questionario: item,
              adminId,
            })
          }
        >
          <Ionicons name="pencil-outline" size={18} color={Colors.white} />
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton, GlobalStyles.cardShadow]}
          onPress={() => handleExcluir(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={styles.buttonText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const headerTitle = "Meus Questionários";

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title={headerTitle} showBackButton={true} onBackPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar questionários...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={headerTitle} showBackButton={true} onBackPress={() => navigation.goBack()} />
      {questionarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={50} color={Colors.mediumGray} />
          <Text style={styles.emptyText}>Nenhum questionário encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={questionarios}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
      <TouchableOpacity
        style={[styles.newButton, GlobalStyles.cardShadow]}
        onPress={() => navigation.navigate('CriarQuestionario', { adminId })}
      >
        <Ionicons name="add-circle-outline" size={24} color={Colors.onPrimary} />
        <Text style={styles.newButtonText}>Criar Novo Questionário</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 100, // Increased padding to prevent overlap with newButton
  },
  itemContainer: {
    marginBottom: 15,
    padding: 18,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
    color: Colors.textPrimary,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Usar space-between para distribuir melhor
    marginTop: 10,
    marginHorizontal: -4, // Margem negativa para compensar as margens dos botões
  },
  button: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '48%', // Ajustado para 2 botões por linha
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 4, // Margem horizontal consistente entre os botões
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  // --- CHANGES HERE: Button backgrounds updated based on the provided palette ---
  editButton: { backgroundColor: Colors.primaryDark }, // Dourado mais profundo para Editar
  deleteButton: { backgroundColor: Colors.error }, // Vermelho para Excluir (mantido)
  // Removed viewButton style as the button was removed
  buttonText: {
    color: Colors.onPrimary, // Use onPrimary for text over primary/dark colors
    fontWeight: '700',
    marginLeft: 5,
    fontSize: 13, // Slightly increased for better readability
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 17,
    color: Colors.mediumGray,
    fontWeight: '500',
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary, // Primary gold for the create button
    padding: 18, // Increased padding for a larger button
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 }, // Increased shadow offset
    shadowOpacity: 0.3, // Increased shadow opacity
    shadowRadius: 8, // Increased shadow radius
    elevation: 10, // Increased elevation for Android
  },
  newButtonText: {
    color: Colors.onPrimary, // Text color for the create button
    fontSize: 19, // Slightly increased font size
    fontWeight: '800', // Increased font weight
    marginLeft: 10,
  },
});
