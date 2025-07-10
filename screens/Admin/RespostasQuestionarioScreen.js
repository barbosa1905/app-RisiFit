import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { useRoute } from '@react-navigation/native';

export default function RespostasQuestionarioScreen() {
  const [respostasList, setRespostasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const route = useRoute();
  const questionarioId = route.params?.questionarioId || 'anamnesePadrao';

  useEffect(() => {
    const carregarRespostas = async () => {
      try {
        const adminId = auth.currentUser?.uid;
        if (!adminId) {
          setErrorMsg('Admin não autenticado');
          setLoading(false);
          return;
        }

        // Busca perguntas do questionário do admin (uma vez)
        const questionarioDoc = await getDoc(doc(db, 'admins', adminId, 'questionarios', questionarioId));
        const perguntas = questionarioDoc.exists() ? questionarioDoc.data().perguntas : [];

        // Busca todos os usuários associados a esse admin
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('adminId', '==', adminId))
        );

        const userDocs = usersSnapshot.docs;
        if (userDocs.length === 0) {
          setErrorMsg('Nenhum usuário associado ao admin.');
          setLoading(false);
          return;
        }

        const todasRespostas = [];

        for (const userDoc of userDocs) {
          const userId = userDoc.id;
          const userName = userDoc.data().nome || 'Nome não informado';

          // Busca respostas do usuário para o questionário selecionado
          const respostasSnapshot = await getDocs(
            query(
              collection(db, 'users', userId, 'respostasQuestionarios'),
              where('questionarioId', '==', questionarioId),
              orderBy('data', 'desc')
            )
          );

          for (const respostaDoc of respostasSnapshot.docs) {
            const respostaData = respostaDoc.data();

            todasRespostas.push({
              id: respostaDoc.id,
              userName,
              data: respostaData.data,
              respostas: respostaData.respostas,
              perguntas,
            });
          }
        }

        setRespostasList(todasRespostas);
      } catch (error) {
        console.error(error);
        setErrorMsg('Erro ao carregar respostas.');
      } finally {
        setLoading(false);
      }
    };

    carregarRespostas();
  }, [questionarioId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text>Carregando respostas...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{errorMsg}</Text>
      </View>
    );
  }

  if (respostasList.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Nenhuma resposta encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Respostas do Questionário</Text>
      {respostasList.map(({ id, userName, data, respostas, perguntas }) => (
        <View key={id} style={styles.respostaContainer}>
          <Text style={styles.subTitle}>Usuário: {userName}</Text>
          <Text style={styles.dataTexto}>
            Respondido em: {data?.toDate?.().toLocaleString() || 'Data desconhecida'}
          </Text>
          {(perguntas || []).length > 0 ? (
            perguntas.map((pergunta) => (
              <View key={pergunta.id} style={styles.perguntaResposta}>
                <Text style={styles.perguntaTexto}>{pergunta.pergunta}</Text>
                <Text style={styles.respostaTexto}>
                  {respostas?.[pergunta.id] ?? 'Sem resposta'}
                </Text>
              </View>
            ))
          ) : (
            <Text>Nenhuma pergunta disponível</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#000',
    textAlign: 'center',
  },
  respostaContainer: {
    marginBottom: 25,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingBottom: 15,
  },
  subTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 5,
    color: '#d0a956',
  },
  dataTexto: {
    fontSize: 14,
    marginBottom: 10,
    color: '#555',
  },
  perguntaResposta: {
    marginBottom: 12,
  },
  perguntaTexto: {
    fontWeight: '600',
  },
  respostaTexto: {
    marginTop: 4,
    fontSize: 16,
    color: '#333',
  },
  error: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});
