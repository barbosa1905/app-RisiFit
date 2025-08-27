// screens/Admin/CriarQuestionarioScreen.js
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Firebase
import { getAuth } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

// UI base
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

const QUESTION_TYPES = [
  { key: 'texto', label: 'Resposta Livre', icon: 'create-outline' },
  { key: 'unica', label: 'Escolha Única', icon: 'radio-button-on-outline' },
  { key: 'multipla', label: 'Múltipla Escolha', icon: 'checkbox-outline' },
];

const makeOption = (idx = 1) => ({ id: String(Date.now() + idx), texto: `Opção ${idx}` });
const makeQuestion = (type = 'texto') => ({
  id: String(Date.now()),
  texto: '',
  tipo: type,
  obrigatoria: false,
  opcoes: type === 'texto' ? [] : [makeOption(1), makeOption(2)],
});

export default function CriarQuestionarioScreen() {
  const navigation = useNavigation();
  const auth = getAuth();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [perguntas, setPerguntas] = useState([makeQuestion('texto')]);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => titulo.trim().length > 0 && perguntas.length > 0, [titulo, perguntas]);

  const adicionarPergunta = (tipo) => {
    setPerguntas((arr) => [...arr, makeQuestion(tipo)]);
    setMenuVisivel(false);
  };

  const removerPergunta = (id) => {
    Alert.alert('Remover pergunta', 'Tem a certeza que pretende remover esta pergunta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => setPerguntas((arr) => arr.filter((p) => p.id !== id)),
      },
    ]);
  };

  const duplicarPergunta = (id) => {
    setPerguntas((arr) => {
      const idx = arr.findIndex((p) => p.id === id);
      if (idx < 0) return arr;
      const q = arr[idx];
      const clone = {
        ...q,
        id: String(Date.now()),
        opcoes: q.opcoes?.map((o, i) => ({ id: String(Date.now() + i + 1), texto: o.texto })) || [],
      };
      const novo = [...arr];
      novo.splice(idx + 1, 0, clone);
      return novo;
    });
  };

  const moverPergunta = (id, dir) => {
    setPerguntas((arr) => {
      const idx = arr.findIndex((p) => p.id === id);
      if (idx < 0) return arr;
      const novo = [...arr];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= novo.length) return arr;
      const [item] = novo.splice(idx, 1);
      novo.splice(target, 0, item);
      return novo;
    });
  };

  const atualizarTextoPergunta = (perguntaId, texto) => {
    setPerguntas((arr) => arr.map((p) => (p.id === perguntaId ? { ...p, texto } : p)));
  };

  const alterarTipoPergunta = (perguntaId, tipo) => {
    setPerguntas((arr) =>
      arr.map((p) =>
        p.id === perguntaId
          ? {
              ...p,
              tipo,
              opcoes: tipo === 'texto' ? [] : p.opcoes?.length ? p.opcoes : [makeOption(1), makeOption(2)],
            }
          : p
      )
    );
  };

  const toggleObrigatoria = (perguntaId) => {
    setPerguntas((arr) => arr.map((p) => (p.id === perguntaId ? { ...p, obrigatoria: !p.obrigatoria } : p)));
  };

  const adicionarOpcao = (perguntaId) => {
    setPerguntas((arr) =>
      arr.map((p) =>
        p.id === perguntaId ? { ...p, opcoes: [...(p.opcoes || []), makeOption((p.opcoes || []).length + 1)] } : p
      )
    );
  };

  const removerOpcao = (perguntaId, opcaoId) => {
    setPerguntas((arr) =>
      arr.map((p) =>
        p.id === perguntaId
          ? { ...p, opcoes: (p.opcoes || []).filter((o) => o.id !== opcaoId) }
          : p
      )
    );
  };

  const atualizarTextoOpcao = (perguntaId, opcaoId, texto) => {
    setPerguntas((arr) =>
      arr.map((p) =>
        p.id === perguntaId
          ? { ...p, opcoes: (p.opcoes || []).map((o) => (o.id === opcaoId ? { ...o, texto } : o)) }
          : p
      )
    );
  };

  const validar = () => {
    if (!titulo.trim()) {
      Alert.alert('Falta o título', 'Insira um título para o questionário.');
      return false;
    }
    for (const [i, p] of perguntas.entries()) {
      if (!p.texto.trim()) {
        Alert.alert('Pergunta sem texto', `A pergunta ${i + 1} está vazia.`);
        return false;
      }
      if ((p.tipo === 'unica' || p.tipo === 'multipla')) {
        const ops = (p.opcoes || []).map((o) => o.texto.trim()).filter(Boolean);
        if (ops.length < 2) {
          Alert.alert('Poucas opções', `A pergunta ${i + 1} precisa de pelo menos 2 opções.`);
          return false;
        }
      }
    }
    return true;
    };

  const guardar = async () => {
    if (!validar()) return;
    try {
      setSaving(true);
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        perguntas,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null,
        ativo: true,
        versao: 1,
      };
      const ref = await addDoc(collection(db, 'questionarios'), payload);
      Alert.alert('Sucesso', 'Questionário guardado com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      console.log('Questionário ID:', ref.id);
    } catch (e) {
      console.error('Erro ao guardar questionário:', e);
      Alert.alert('Erro', 'Não foi possível guardar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title="Criar Questionário" showBackButton />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho do formulário */}
        <View style={styles.card}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Ex.: Anamnese Inicial"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Descrição (opcional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={descricao}
            onChangeText={setDescricao}
            multiline
            placeholder="Ex.: Responda para personalizar o seu plano."
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {/* Perguntas */}
        {perguntas.map((p, idx) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.qHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.qIndex}>{`Pergunta ${idx + 1}`}</Text>
                <View style={styles.chip}>
                  <Ionicons
                    name={QUESTION_TYPES.find((t) => t.key === p.tipo)?.icon || 'help-circle-outline'}
                    size={14}
                    color={Colors.secondary}
                  />
                  <Text style={styles.chipText}>
                    {QUESTION_TYPES.find((t) => t.key === p.tipo)?.label || p.tipo}
                  </Text>
                </View>
              </View>

              <View style={styles.qActions}>
                <TouchableOpacity onPress={() => moverPergunta(p.id, 'up')} style={styles.iconBtn} disabled={idx === 0}>
                  <Ionicons name="arrow-up" size={18} color={idx === 0 ? Colors.divider : Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moverPergunta(p.id, 'down')}
                  style={styles.iconBtn}
                  disabled={idx === perguntas.length - 1}
                >
                  <Ionicons
                    name="arrow-down"
                    size={18}
                    color={idx === perguntas.length - 1 ? Colors.divider : Colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => duplicarPergunta(p.id)} style={styles.iconBtn}>
                  <Ionicons name="copy-outline" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removerPergunta(p.id)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Texto da pergunta</Text>
            <TextInput
              style={styles.input}
              value={p.texto}
              onChangeText={(t) => atualizarTextoPergunta(p.id, t)}
              placeholder="Escreva a pergunta…"
              placeholderTextColor={Colors.textSecondary}
            />

            {/* Tipo de pergunta */}
            <View style={styles.typeRow}>
              {QUESTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, p.tipo === t.key && styles.typeBtnActive]}
                  onPress={() => alterarTipoPergunta(p.id, t.key)}
                >
                  <Ionicons
                    name={t.icon}
                    size={16}
                    color={p.tipo === t.key ? Colors.onPrimary : Colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: p.tipo === t.key ? Colors.onPrimary : Colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Opções (para unica/multipla) */}
            {(p.tipo === 'unica' || p.tipo === 'multipla') && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Opções</Text>
                {(p.opcoes || []).map((o, i) => (
                  <View key={o.id} style={styles.optionRow}>
                    <TextInput
                      style={styles.inputOption}
                      value={o.texto}
                      onChangeText={(t) => atualizarTextoOpcao(p.id, o.id, t)}
                      placeholder={`Opção ${i + 1}`}
                      placeholderTextColor={Colors.textSecondary}
                    />
                    <TouchableOpacity
                      onPress={() => removerOpcao(p.id, o.id)}
                      style={styles.optionIcon}
                      disabled={(p.opcoes || []).length <= 1}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={22}
                        color={(p.opcoes || []).length <= 1 ? Colors.divider : Colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity onPress={() => adicionarOpcao(p.id)} style={styles.addOptionBtn} activeOpacity={0.9}>
                  <Ionicons name="add-circle-outline" size={20} color={Colors.secondary} />
                  <Text style={styles.addOptionText}>Adicionar opção</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Obrigatória */}
            <TouchableOpacity style={styles.requiredRow} onPress={() => toggleObrigatoria(p.id)} activeOpacity={0.8}>
              <Ionicons
                name={p.obrigatoria ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={p.obrigatoria ? Colors.secondary : Colors.textSecondary}
              />
              <Text style={styles.requiredText}>Obrigatória</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Botão Guardar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
          onPress={guardar}
          disabled={!canSave || saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={Colors.onPrimary} />
              <Text style={styles.saveText}>Guardar Questionário</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* FAB adicionar pergunta */}
      <TouchableOpacity style={styles.fab} onPress={() => setMenuVisivel((v) => !v)} activeOpacity={0.9}>
        <Ionicons name={menuVisivel ? 'close' : 'add'} size={24} color={Colors.onPrimary} />
      </TouchableOpacity>

      {/* Menu de tipos */}
      {menuVisivel && (
        <View style={styles.typeMenu}>
          {QUESTION_TYPES.map((t) => (
            <TouchableOpacity key={t.key} style={styles.menuItem} onPress={() => adicionarPergunta(t.key)}>
              <Ionicons name={t.icon} size={18} color={Colors.textSecondary} />
              <Text style={styles.menuText}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  content: { padding: 16, paddingBottom: 140 },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 12,
    ...Colors.cardElevation,
  },

  label: { color: Colors.textSecondary, fontWeight: '700', marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qIndex: { color: Colors.textPrimary, fontWeight: '800', fontSize: 16 },
  qActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 6, borderRadius: 10 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { color: Colors.primary, fontWeight: '800', fontSize: 12 },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '100%',
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontWeight: '800', fontSize: 12 },

  optionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  inputOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  optionIcon: { paddingHorizontal: 8, paddingVertical: 6 },

  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  addOptionText: { color: Colors.secondary, fontWeight: '800' },

  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  requiredText: { color: Colors.textPrimary, fontWeight: '700' },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 16,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: { color: Colors.onPrimary, fontWeight: '800' },

  fab: {
    position: 'absolute',
    bottom: 86,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.cardElevation,
  },

  typeMenu: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    width: 230,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: 6,
    ...Colors.cardElevation,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { color: Colors.textPrimary, fontWeight: '700' },
});
