import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { collection, query, getDocs, where, doc, getDoc, getFirestore } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import AppHeader from '../../components/AppHeader';
import { Ionicons } from '@expo/vector-icons';

// --- CONFIGURAÇÃO FIREBASE: Torna o componente auto-suficiente ---
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


// Paleta de Cores e Estilos Globais
const Colors = {
  primaryGold: '#B8860B',
  darkBrown: '#3E2723',
  lightBrown: '#795548',
  creamBackground: '#FDF7E4',
  white: '#FFFFFF',
  lightGray: '#ECEFF1',
  mediumGray: '#B0BEC5',
  darkGray: '#424242',
  accentBlue: '#2196F3',
  successGreen: '#4CAF50',
  errorRed: '#F44336',
  buttonTextLight: '#FFFFFF',
  buttonTextDark: '#3E2723',
  shadow: 'rgba(0,0,0,0.08)',
  black: '#000000',
};

const GlobalStyles = {
  cardShadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  }
};

// O nome do componente deve ser o nome do ficheiro
export default function RespostasQuestionariosClientesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { clienteId, clienteNome } = route.params || {};

  const [questionarios, setQuestionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Autenticação anónima para garantir que o Firestore pode ser acedido
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(e => console.error("Erro na autenticação anónima:", e));
      }
    });

    const carregarQuestionarios = async () => {
      if (!clienteId) {
        setError('ID do cliente não encontrado.');
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'respostasQuestionarios'),
          where('userId', '==', clienteId)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setQuestionarios([]);
        } else {
          const listaQuestionariosPromises = querySnapshot.docs.map(async docSnapshot => {
            const respostaData = docSnapshot.data();
            const questionarioId = respostaData.questionarioId;

            // --- CORREÇÃO: Usar a coleção 'questionarios' em vez de 'questionariosPublicos' ---
            const questionarioRef = doc(db, 'questionarios', questionarioId);
            const questionarioSnapshot = await getDoc(questionarioRef);
            
            // --- CORREÇÃO: Usar 'titulo' em vez de 'nome' ---
            const questionarioData = questionarioSnapshot.exists() ? questionarioSnapshot.data() : { titulo: 'Questionário desconhecido' };

            return {
              id: docSnapshot.id,
              ...respostaData,
              nomeQuestionario: questionarioData.titulo,
            };
          });

          const listaQuestionarios = await Promise.all(listaQuestionariosPromises);
          setQuestionarios(listaQuestionarios);
        }
      } catch (e) {
        console.error('Erro ao buscar questionários do cliente:', e);
        Alert.alert('Erro', 'Ocorreu um erro ao carregar os questionários.');
        setError('Ocorreu um erro ao carregar os questionários.');
      } finally {
        setLoading(false);
      }
    };

    carregarQuestionarios();
    return () => unsubscribeAuth();
  }, [clienteId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, GlobalStyles.cardShadow]}
      onPress={() => navigation.navigate('RespostasQuestionariosClientes', {
        clienteId: clienteId,
        questionarioId: item.questionarioId,
        clienteNome: clienteNome,
      })}
    >
      <Ionicons name="document-text-outline" size={24} color={Colors.darkBrown} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.nomeQuestionario || 'Questionário'}</Text>
        <Text style={styles.cardDate}>
          Preenchido em: {item.timestamp?.toDate?.().toLocaleDateString() || 'Data desconhecida'}
        </Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={Colors.mediumGray} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryGold} />
        <Text style={styles.loadingText}>A carregar questionários...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={50} color={Colors.errorRed} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`Questionários de ${clienteNome}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      {questionarios.length > 0 ? (
        <FlatList
          data={questionarios}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="reader-outline" size={50} color={Colors.mediumGray} />
          <Text style={styles.emptyText}>Nenhum questionário respondido por este cliente.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.creamBackground,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.darkBrown,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.errorRed,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryGold,
  },
  cardContent: {
    flex: 1,
    marginLeft: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkBrown,
  },
  cardDate: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: Colors.mediumGray,
  },
});
