// screens/Admin/RespostasQuestionariosClientes.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import AppHeader from '../../components/AppHeader';
import Colors from '../../constants/Colors';
import { db } from '../../services/firebaseConfig';

const auth = getAuth();

export default function RespostasQuestionariosCliente() {
  const route = useRoute();
  const navigation = useNavigation();
  const { clienteId, clienteNome, questionarioId } = route.params || {};

  const [respostasDetalhadas, setRespostasDetalhadas] = useState([]);
  const [nomeQuestionario, setNomeQuestionario] = useState('');
  const [timestamp, setTimestamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (!u) signInAnonymously(auth).catch(() => {});
    });

    const load = async () => {
      if (!clienteId || !questionarioId) {
        setErr('ID do cliente ou do questionário não encontrado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        const [qSnap, respSnap] = await Promise.all([
          getDoc(doc(db, 'questionarios', questionarioId)),
          getDocs(
            query(
              collection(db, 'respostasQuestionarios'),
              where('userId', '==', clienteId),
              where('questionarioId', '==', questionarioId)
            )
          ),
        ]);

        setNomeQuestionario(qSnap.exists() ? (qSnap.data()?.titulo || 'Questionário') : 'Questionário desconhecido');

        if (!respSnap.empty) {
          const data = respSnap.docs[0].data();
          setRespostasDetalhadas(data.respostasDetalhadas || []);
          setTimestamp(data.timestamp || null);
        } else {
          setErr('Respostas não encontradas para este questionário.');
        }
      } catch (e) {
        if (__DEV__) console.error('[RespostasQuestionariosClientes] load', e);
        Alert.alert('Erro', 'Ocorreu um erro ao carregar os dados do questionário.');
        setErr('Erro ao carregar os dados do questionário.');
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => unsubAuth();
  }, [clienteId, questionarioId]);

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.index}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.q}>{item.pergunta}</Text>
        <Text style={styles.a}>{item.resposta || 'Sem resposta'}</Text>
      </View>
    </View>
  );

  const dataStr =
    timestamp?.toDate?.() &&
    timestamp.toDate().toLocaleString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title={nomeQuestionario}
        subtitle={clienteNome ? `Respostas de ${clienteNome}` : undefined}
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar…</Text>
        </View>
      ) : err ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : respostasDetalhadas.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}><Ionicons name="reader-outline" size={28} color={Colors.secondary} /></View>
          <Text style={styles.emptyTitle}>Sem respostas</Text>
          <Text style={styles.emptyText}>Não encontrámos respostas para este questionário.</Text>
        </View>
      ) : (
        <>
          {!!dataStr && (
            <View style={styles.meta}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>Respondido em {dataStr}</Text>
            </View>
          )}
          <FlatList
            data={respostasDetalhadas}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  center: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  loadingText: { marginTop: 10, color: Colors.textSecondary },
  errorText: { marginTop: 10, color: Colors.error, textAlign: 'center', paddingHorizontal: 24 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: `${Colors.secondary}22`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyTitle: { fontWeight: '900', color: Colors.textPrimary, fontSize: 18 },
  emptyText: { color: Colors.textSecondary, marginTop: 6 },

  meta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, marginBottom: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider,
    borderRadius: 10,
  },
  metaText: { color: Colors.textSecondary, fontWeight: '700' },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.divider,
    padding: 14, marginTop: 10,
  },
  index: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.secondary,
  },
  indexText: { color: Colors.onSecondary, fontWeight: '900', fontSize: 12 },
  q: { color: Colors.textPrimary, fontWeight: '800', marginBottom: 4 },
  a: { color: Colors.textSecondary, lineHeight: 20 },
});
