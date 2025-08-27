import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import { getUserIdLoggedIn } from '../../services/authService';

const Shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
};

export default function ResponderQuestionarioScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { questionarioId } = route.params;

  const [questionario, setQuestionario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respostas, setRespostas] = useState({});
  const [userId, setUserId] = useState(null);
  const scrollRef = useRef(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const uid = await getUserIdLoggedIn();
        if (!uid) throw new Error('Utilizador não autenticado');
        setUserId(uid);

        const ref = doc(db, 'questionarios', questionarioId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          Alert.alert('Erro', 'Questionário não encontrado.');
          navigation.goBack();
          return;
        }
        setQuestionario(snap.data());
      } catch (e) {
        console.error('Erro ao carregar questionário:', e);
        Alert.alert('Erro', 'Não foi possível carregar o questionário.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation, questionarioId]);

  const totalPerguntas = questionario?.perguntas?.length || 0;
  const respondidas = useMemo(() => {
    if (!questionario?.perguntas) return 0;
    return questionario.perguntas.reduce((acc, p) => {
      const r = respostas[p.id];
      const vazia =
        r === undefined ||
        (typeof r === 'string' && r.trim() === '') ||
        (Array.isArray(r) && r.length === 0);
      return acc + (vazia ? 0 : 1);
    }, 0);
  }, [questionario?.perguntas, respostas]);

  const progresso = totalPerguntas ? Math.round((respondidas / totalPerguntas) * 100) : 0;

  const updateResposta = (perguntaId, valor, tipo) => {
    setRespostas((prev) => {
      if (tipo === 'multipla') {
        const arr = Array.isArray(prev[perguntaId]) ? prev[perguntaId] : [];
        return arr.includes(valor)
          ? { ...prev, [perguntaId]: arr.filter((v) => v !== valor) }
          : { ...prev, [perguntaId]: [...arr, valor] };
      }
      return { ...prev, [perguntaId]: valor };
    });
  };

  const clearResposta = (perguntaId) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: undefined }));
  };

  const handleSubmit = async () => {
    if (!questionario?.perguntas) return;

    for (const p of questionario.perguntas) {
      const r = respostas[p.id];
      const vazia =
        r === undefined ||
        (typeof r === 'string' && r.trim() === '') ||
        (Array.isArray(r) && r.length === 0);
      if (vazia) {
        Alert.alert('Atenção', 'Responda todas as perguntas antes de enviar.');
        return;
      }
    }

    try {
      const respostasDetalhadas = questionario.perguntas.map((p) => ({
        idPergunta: p.id,
        pergunta: p.texto,
        tipo: p.tipo,
        resposta: respostas[p.id],
      }));

      await addDoc(collection(db, 'respostasQuestionarios'), {
        userId,
        questionarioId,
        nomeQuestionario: questionario.nome || questionario.titulo || 'Questionário',
        respostas: respostasDetalhadas,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Sucesso', 'Respostas enviadas com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error('Erro ao enviar respostas:', e);
      Alert.alert('Erro', 'Não foi possível enviar as respostas.');
    }
  };

  // Loading
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Responder Questionário" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.centerText}>A carregar questionário…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!questionario) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title="Responder Questionário" />
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: Colors.danger }]}>Questionário não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Responder Questionário" onBack={() => navigation.goBack()} />

      {/* Cabeçalho com progresso */}
      <View style={[styles.progressCard, Shadow.soft]}>
        <View style={styles.progressRow}>
          <Text style={styles.qTitle} numberOfLines={2}>
            {questionario.nome || questionario.titulo || 'Questionário'}
          </Text>
          <Text style={styles.progressPct}>{progresso}%</Text>
        </View>
        <View style={styles.progressBarWrap}>
          <View style={[styles.progressFill, { width: `${progresso}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          {respondidas}/{totalPerguntas} respondidas
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {!!questionario.descricao && (
            <Text style={styles.desc}>{questionario.descricao}</Text>
          )}

          {questionario.perguntas?.map((p, idx) => (
            <View key={p.id} style={[styles.card, Shadow.soft]}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{idx + 1}</Text>
                </View>
                <Text style={styles.perguntaTexto}>{p.texto}</Text>
              </View>

              {/* Texto aberto */}
              {p.tipo === 'texto' && (
                <TextInput
                  style={styles.input}
                  placeholder="Escreve a tua resposta"
                  placeholderTextColor={Colors.placeholder}
                  value={respostas[p.id] || ''}
                  onChangeText={(t) => updateResposta(p.id, t, 'texto')}
                  multiline
                />
              )}

              {/* Única / Múltipla */}
              {(p.tipo === 'unica' || p.tipo === 'multipla') && (
                <View style={styles.optionsWrap}>
                  {p.opcoes?.map((opt) => {
                    const selected =
                      p.tipo === 'multipla'
                        ? (respostas[p.id] || []).includes(opt.texto)
                        : respostas[p.id] === opt.texto;

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => updateResposta(p.id, opt.texto, p.tipo)}
                        activeOpacity={0.9}
                        style={[
                          styles.option,
                          selected && styles.optionSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.optionBullet,
                            selected && { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
                          ]}
                        >
                          {selected && (
                            <MaterialCommunityIcons
                              name="check"
                              size={12}
                              color={Colors.onPrimary}
                            />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.optionText,
                            selected && { color: Colors.textPrimary, fontWeight: '800' },
                          ]}
                        >
                          {opt.texto}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Limpar resposta */}
              <TouchableOpacity onPress={() => clearResposta(p.id)} style={styles.clearBtn}>
                <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
                <Text style={styles.clearText}>Limpar resposta</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Botão fixo de submissão */}
      <View style={[styles.submitBar, Shadow.soft]}>
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.9}
          style={styles.submitBtn}
        >
          <Ionicons name="paper-plane-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.submitText}>Enviar respostas</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ------- UI helpers ------- */

function Header({ title = '', onBack }) {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primary + 'E6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={{ width: 28 }}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={{ padding: 6 }}>
            <Ionicons name="arrow-back" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      <View style={{ width: 28 }} />
    </LinearGradient>
  );
}

/* ------- styles ------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 14,
    paddingBottom: 14,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.onPrimary,
    fontWeight: '800',
    fontSize: 18,
  },

  progressCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  qTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginRight: 10 },
  progressPct: { fontWeight: '900', color: Colors.primary },
  progressBarWrap: { height: 10, backgroundColor: '#E9EDF2', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.secondary },
  progressHint: { marginTop: 8, color: Colors.textSecondary, fontSize: 12 },

  desc: { color: Colors.textSecondary, marginHorizontal: 16, marginBottom: 10 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  badgeText: { fontWeight: '800', color: Colors.secondary },
  perguntaTexto: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },

  input: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    padding: 12,
    minHeight: 92,
    textAlignVertical: 'top',
    color: Colors.textPrimary,
  },

  optionsWrap: { marginTop: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
  },
  optionSelected: {
    borderColor: Colors.secondary,
    backgroundColor: '#FFF8E0',
  },
  optionBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.secondary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  optionText: { color: Colors.textSecondary, fontSize: 15 },

  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  clearText: { color: Colors.textSecondary, fontSize: 12 },

  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    padding: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: Colors.divider,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: { color: Colors.onPrimary, fontWeight: '900', fontSize: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { marginTop: 8, color: Colors.textSecondary },
});
