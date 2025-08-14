import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
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
  apiKey: "AIzaSyDOP9sg9slVIXrkEvdTpXrL-DRAeolLI8I",
  authDomain: "risifit-4defe.firebaseapp.com",
  projectId: "risifit-4defe",
  storageBucket: "risifit-4defe.firebasestorage.app",
  messagingSenderId: "485424698583",
  appId: "1:485424698583:web:0d6095f3ca5a071b4ccc92",
  measurementId: "G-J7PVBCXMT5"
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
  },
};

export default function RespostasQuestionariosCliente() {
  const route = useRoute();
  const navigation = useNavigation();
  const { clienteId, clienteNome, questionarioId } = route.params || {};

  const [respostasDetalhadas, setRespostasDetalhadas] = useState([]);
  const [nomeQuestionario, setNomeQuestionario] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Autenticação anónima para garantir que o Firestore pode ser acedido
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(e => console.error("Erro na autenticação anónima:", e));
      }
    });

    const carregarRespostas = async () => {
      if (!clienteId || !questionarioId) {
        setError('ID do cliente ou do questionário não encontrado.');
        setLoading(false);
        return;
      }

      try {
        // Busca o questionário e as respostas em paralelo para maior eficiência
        const [questionarioSnap, respostaSnapshot] = await Promise.all([
          getDoc(doc(db, 'questionarios', questionarioId)),
          getDocs(query(
            collection(db, 'respostasQuestionarios'),
            where('userId', '==', clienteId),
            where('questionarioId', '==', questionarioId)
          ))
        ]);

        // Trata o resultado da busca do questionário
        if (questionarioSnap.exists()) {
          setNomeQuestionario(questionarioSnap.data().titulo || 'Questionário sem Título');
        } else {
          setNomeQuestionario('Questionário desconhecido');
        }

        // Trata o resultado da busca das respostas
        if (!respostaSnapshot.empty) {
          const respostaData = respostaSnapshot.docs[0].data();
          setRespostasDetalhadas(respostaData.respostasDetalhadas || []);
        } else {
          setError('Respostas não encontradas para este questionário.');
        }

      } catch (e) {
        console.error('Erro ao buscar dados:', e);
        Alert.alert('Erro', 'Ocorreu um erro ao carregar os dados do questionário.');
        setError('Erro ao carregar os dados do questionário.');
      } finally {
        setLoading(false);
      }
    };

    carregarRespostas();
    // Limpa a subscrição da autenticação
    return () => unsubscribeAuth();
  }, [clienteId, questionarioId]);

  const renderItem = ({ item }) => (
    <View style={[styles.card, GlobalStyles.cardShadow]}>
      <Text style={styles.cardTitle}>{item.pergunta}</Text>
      <Text style={styles.cardAnswer}>{item.resposta || 'Sem resposta'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primaryGold} />
        <Text style={styles.loadingText}>A carregar respostas...</Text>
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
        title={nomeQuestionario}
        subtitle={`Respostas de ${clienteNome}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      {respostasDetalhadas.length > 0 ? (
        <FlatList
          data={respostasDetalhadas}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="reader-outline" size={50} color={Colors.mediumGray} />
          <Text style={styles.emptyText}>Nenhuma resposta encontrada.</Text>
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
    backgroundColor: Colors.white,
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderLeftWidth: 4, // Adiciona uma borda à esquerda
    borderLeftColor: Colors.primaryGold,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: 5,
  },
  cardAnswer: {
    fontSize: 16,
    color: Colors.darkGray,
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
