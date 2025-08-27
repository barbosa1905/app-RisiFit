// screens/Admin/EditarQuestionarioScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Alert, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';

import AppHeader from '../../components/AppHeader';
import Colors from '../../constants/Colors';
import Layout from '../../constants/Layout';

// ---- UI consts ----
const TIPOS_PERGUNTA = [
  { label: 'Texto', value: 'texto', icon: 'create-outline' },
  { label: 'Múltipla', value: 'multipla', icon: 'list-outline' },
];

const now = () => new Date();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const Chip = ({ icon, text, tone = 'neutral' }) => (
  <View style={[styles.chip, styles[`chip_${tone}`]]}>
    {icon ? <Ionicons name={icon} size={14} color={styles[`chipText_${tone}`].color} /> : null}
    <Text style={[styles.chipText, styles[`chipText_${tone}`]]}>{text}</Text>
  </View>
);

// ---------- Normalização ULTRA robusta ----------
const LOWER_KEYS_TEXT = ['pergunta','text','question','enunciado','titulo','texto','label','name','nome'];
const LOWER_KEYS_TYPE = ['tipo','type','questiontype','kind'];
const LOWER_KEYS_OPTIONS = ['opcoes','options','alternativas','choices','itens','items','values'];

const isPlainObject = (o) => o && typeof o === 'object' && !Array.isArray(o);

// Procura profunda pela 1ª string em qualquer uma das chaves-alvo
const deepPickStringByKeys = (node, wantedKeys, depth = 0) => {
  if (depth > 6 || node == null) return null;
  if (typeof node === 'string') return node; // defesa
  if (Array.isArray(node)) {
    for (const el of node) {
      const got = deepPickStringByKeys(el, wantedKeys, depth + 1);
      if (got && typeof got === 'string' && got.trim()) return got;
    }
    return null;
  }
  if (isPlainObject(node)) {
    // 1) tenta pelas chaves
    for (const k of Object.keys(node)) {
      if (wantedKeys.includes(k.toLowerCase())) {
        const v = node[k];
        if (typeof v === 'string' && v.trim()) return v;
      }
    }
    // 2) desce recursivamente
    for (const k of Object.keys(node)) {
      const got = deepPickStringByKeys(node[k], wantedKeys, depth + 1);
      if (got && typeof got === 'string' && got.trim()) return got;
    }
  }
  return null;
};

// Converte maps { "0": {...}, "1": {...} } em array
const numericMapToArray = (obj) => {
  if (!isPlainObject(obj)) return null;
  const keys = Object.keys(obj);
  if (!keys.length || !keys.every(k => /^\d+$/.test(k))) return null;
  return keys.sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>obj[k]);
};

// Extrai uma lista de opções de vários formatos (array, map numerado, nested)
const deepExtractOptionsList = (node, depth = 0) => {
  if (depth > 6 || node == null) return [];
  if (Array.isArray(node)) {
    return node
      .map(v => {
        if (typeof v === 'string') return v;
        if (isPlainObject(v)) {
          const txt = deepPickStringByKeys(v, LOWER_KEYS_TEXT);
          return typeof txt === 'string' ? txt : null;
        }
        return null;
      })
      .filter(Boolean);
  }
  if (isPlainObject(node)) {
    // procurar por chaves óbvias primeiro
    for (const k of Object.keys(node)) {
      if (LOWER_KEYS_OPTIONS.includes(k.toLowerCase())) {
        const val = node[k];
        if (Array.isArray(val)) return deepExtractOptionsList(val, depth + 1);
        const asArr = numericMapToArray(val);
        if (asArr) return deepExtractOptionsList(asArr, depth + 1);
      }
    }
    // fallback: procurar mais fundo
    for (const k of Object.keys(node)) {
      const got = deepExtractOptionsList(node[k], depth + 1);
      if (got.length) return got;
    }
  }
  return [];
};

// Decide se um array “parece perguntas”
const isPlausibleQuestionsArray = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  let score = 0;
  for (const el of arr) {
    if (typeof el === 'string') { score++; continue; }
    if (isPlainObject(el)) {
      const hasText = !!deepPickStringByKeys(el, LOWER_KEYS_TEXT);
      const hasType = !!deepPickStringByKeys(el, LOWER_KEYS_TYPE);
      const hasOpts = deepExtractOptionsList(el).length > 0;
      if (hasText || hasType || hasOpts) score++;
    }
  }
  return score >= Math.ceil(arr.length / 2);
};

// Procura profunda por um array plausível em qualquer ramo
const deepFindQuestionsArray = (node, visited = new Set(), path = '$', depth = 0) => {
  if (depth > 6 || node == null) return null;
  if (visited.has(node)) return null;
  visited.add(node);

  if (Array.isArray(node) && isPlausibleQuestionsArray(node)) return { arr: node, path };

  if (isPlainObject(node)) {
    const maybeArr = numericMapToArray(node);
    if (maybeArr && isPlausibleQuestionsArray(maybeArr)) return { arr: maybeArr, path: `${path}/*numeric-map*` };

    // prioriza chaves “question like”
    const keys = Object.keys(node).sort((a,b)=>{
      const qa = /(perg|quest|question|itens|items|conteudo|content|sections|secoes)/i.test(a);
      const qb = /(perg|quest|question|itens|items|conteudo|content|sections|secoes)/i.test(b);
      return (qb?1:0)-(qa?1:0);
    });

    for (const k of keys) {
      const child = node[k];
      const newPath = `${path}.${k}`;

      if (Array.isArray(child) && isPlausibleQuestionsArray(child)) return { arr: child, path: newPath };

      const mapArr = numericMapToArray(child);
      if (mapArr && isPlausibleQuestionsArray(mapArr)) return { arr: mapArr, path: `${newPath}/*numeric-map*` };

      if (isPlainObject(child) || Array.isArray(child)) {
        const deeper = deepFindQuestionsArray(child, visited, newPath, depth + 1);
        if (deeper) return deeper;
      }
    }
  }

  return null;
};

// Normaliza um item (string/objeto) para {id, pergunta, tipo, opcoes?}
const normalizeItem = (it) => {
  if (typeof it === 'string') return { id: uid(), pergunta: it, tipo: 'texto' };

  // texto
  const pergunta =
    deepPickStringByKeys(it, LOWER_KEYS_TEXT) ??
    '';

  // tipo
  let tipo =
    (deepPickStringByKeys(it, LOWER_KEYS_TYPE) || 'texto')
      .toString()
      .toLowerCase();

  if (['texto','text','open','aberta','short','long','input'].includes(tipo)) tipo = 'texto';
  if (['multipla','multiple','multiple_choice','mc','choices','radio','select'].includes(tipo)) tipo = 'multipla';

  // opções (se houver)
  let opcoes = deepExtractOptionsList(it);
  if (!Array.isArray(opcoes)) opcoes = [];

  const base = { id: it?.id || it?.uid || it?.key || uid(), pergunta: String(pergunta), tipo };
  return tipo === 'multipla' ? { ...base, opcoes } : base;
};

// Normaliza array (strings/objetos mistos)
const normalizeArray = (arr) => Array.isArray(arr) ? arr.map(normalizeItem) : [];

// Ponto único: tenta todos os formatos conhecidos + busca profunda
const normalizePerguntas = (qDoc) => {
  if (!qDoc || typeof qDoc !== 'object') return [];

  // formatos diretos
  if (Array.isArray(qDoc.perguntas)) return normalizeArray(qDoc.perguntas);
  if (Array.isArray(qDoc.questions)) return normalizeArray(qDoc.questions);

  // sections / secoes
  if (Array.isArray(qDoc.sections)) {
    const flat = qDoc.sections.flatMap(s => (Array.isArray(s?.questions) ? s.questions : []));
    if (flat.length) return normalizeArray(flat);
  }
  if (Array.isArray(qDoc.secoes)) {
    const flat = qDoc.secoes.flatMap(s => (Array.isArray(s?.perguntas) ? s.perguntas : []));
    if (flat.length) return normalizeArray(flat);
  }

  // maps numerados
  const asArrPerguntas = numericMapToArray(qDoc.perguntas);
  if (asArrPerguntas) return normalizeArray(asArrPerguntas);

  // procura profunda
  const deep = deepFindQuestionsArray(qDoc);
  if (deep?.arr) {
    if (__DEV__) console.log('[DEBUG] perguntas encontradas em', deep.path);
    return normalizeArray(deep.arr);
  }

  return [];
};

// ---------- Componente ----------
export default function EditarQuestionarioScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const routeQuestionario = route.params?.questionario || null;
  const questionarioId = route.params?.questionarioId || routeQuestionario?.id || null;

  const currentUser = auth.currentUser;
  const adminId = currentUser?.uid || null;

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [estado, setEstado] = useState('rascunho');
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        if (routeQuestionario) {
          const norm = normalizePerguntas(routeQuestionario);
          setTitulo(routeQuestionario.titulo || routeQuestionario.title || '');
          setDescricao(routeQuestionario.descricao || routeQuestionario.description || '');
          setEstado((routeQuestionario.estado || 'rascunho').toLowerCase());
          setPerguntas(norm);
          if (__DEV__) {
            console.log('[DEBUG] routeQuestionario =>', routeQuestionario);
            console.log('[DEBUG] perguntas normalizadas =>', norm);
          }
          setLoading(false);
          return;
        }

        if (questionarioId) {
          const ref = doc(db, 'questionarios', questionarioId);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            Alert.alert('Aviso', 'Questionário não encontrado.');
            navigation.goBack();
            return;
          }
          const data = snap.data();
          const norm = normalizePerguntas(data);
          setTitulo(data.titulo || data.title || '');
          setDescricao(data.descricao || data.description || '');
          setEstado((data.estado || 'rascunho').toLowerCase());
          setPerguntas(norm);
          if (__DEV__) {
            console.log('[DEBUG] doc data =>', data);
            console.log('[DEBUG] perguntas normalizadas =>', norm);
          }
          setLoading(false);
          return;
        }

        // novo
        setTitulo('');
        setDescricao('');
        setEstado('rascunho');
        setPerguntas([]);
        setLoading(false);
      } catch (e) {
        console.error('Falha ao carregar questionário:', e);
        Alert.alert('Erro', 'Falha ao carregar questionário.');
        navigation.goBack();
      }
    };
    carregar();
  }, [questionarioId, routeQuestionario, navigation]);

  // Ações
  const adicionarPergunta = useCallback(() => {
    setPerguntas((prev) => [...prev, { id: uid(), pergunta: '', tipo: 'texto' }]);
    setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 150);
  }, []);

  const atualizarPerguntaText = useCallback((index, text) => {
    setPerguntas((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], pergunta: text };
      return next;
    });
  }, []);

  const atualizarTipoPergunta = useCallback((index, tipo) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const p = { ...next[index], tipo };
      if (tipo === 'multipla' && !Array.isArray(p.opcoes)) p.opcoes = [''];
      if (tipo !== 'multipla') delete p.opcoes;
      next[index] = p;
      return next;
    });
  }, []);

  const adicionarOpcao = useCallback((pi) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const p = { ...next[pi] };
      p.opcoes = Array.isArray(p.opcoes) ? [...p.opcoes, ''] : [''];
      next[pi] = p;
      return next;
    });
  }, []);

  const atualizarOpcao = useCallback((pi, oi, text) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const p = { ...next[pi] };
      const ops = [...(p.opcoes || [])];
      ops[oi] = text;
      p.opcoes = ops;
      next[pi] = p;
      return next;
    });
  }, []);

  const removerOpcao = useCallback((pi, oi) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const p = { ...next[pi] };
      p.opcoes = (p.opcoes || []).filter((_, idx) => idx !== oi);
      next[pi] = p;
      return next;
    });
  }, []);

  const moverPergunta = useCallback((index, dir) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const alvo = index + dir;
      if (alvo < 0 || alvo >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[alvo];
      next[alvo] = tmp;
      return next;
    });
  }, []);

  const duplicarPergunta = useCallback((index) => {
    setPerguntas((prev) => {
      const next = [...prev];
      const p = next[index];
      next.splice(index + 1, 0, { ...p, id: uid() });
      return next;
    });
  }, []);

  const removerPergunta = useCallback((index) => {
    Alert.alert('Remover pergunta', 'Queres mesmo remover esta pergunta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setPerguntas((prev) => prev.filter((_, i) => i !== index)) },
    ]);
  }, []);

  // Validação & Guardar
  const validar = useCallback(() => {
    if (!titulo.trim()) {
      Alert.alert('Validação', 'Indica um título para o questionário.');
      return false;
    }
    if (perguntas.length === 0) {
      Alert.alert('Validação', 'Adiciona pelo menos uma pergunta.');
      return false;
    }
    for (const p of perguntas) {
      if (!p.pergunta?.trim()) {
        Alert.alert('Validação', 'Todas as perguntas devem ter texto.');
        return false;
      }
      if (p.tipo === 'multipla') {
        if (!Array.isArray(p.opcoes) || p.opcoes.length === 0) {
          Alert.alert('Validação', 'Perguntas de múltipla escolha precisam de pelo menos uma opção.');
          return false;
        }
        if (p.opcoes.some((op) => !String(op).trim())) {
          Alert.alert('Validação', 'Todas as opções devem ter texto.');
          return false;
        }
      }
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, perguntas]);

  const salvar = useCallback(async () => {
    if (!validar()) return;
    try {
      setSaving(true);
      const idToSave = questionarioId || Date.now().toString();

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        estado,
        perguntas, // já normalizadas
        updatedAt: now(),
        ...(questionarioId ? {} : { dataCriacao: now(), criadoPor: adminId || null }),
      };

      await setDoc(doc(db, 'questionarios', idToSave), payload, { merge: true });

      Alert.alert('Sucesso', 'Questionário guardado com sucesso!');
      navigation.goBack();
    } catch (e) {
      console.error('Falha ao guardar questionário:', e);
      Alert.alert('Erro', 'Não foi possível guardar o questionário.');
    } finally {
      setSaving(false);
    }
  }, [validar, questionarioId, titulo, descricao, estado, perguntas, adminId, navigation]);

  const headerTitle = questionarioId ? 'Editar Questionário' : 'Novo Questionário';

  // UI
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <AppHeader title={headerTitle} showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>A carregar…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <AppHeader
        title={headerTitle}
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightContent={
          <TouchableOpacity onPress={salvar} style={styles.headerSaveBtn}>
            <Ionicons name="save-outline" size={18} color={Colors.onSecondary} />
            <Text style={styles.headerSaveBtnText}>Guardar</Text>
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 100 }} style={styles.scroll}>
          {/* Meta */}
          <View style={[styles.card, styles.cardElev]}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Avaliação Inicial — Saúde & Fitness"
              placeholderTextColor={Colors.textSecondary}
              value={titulo}
              onChangeText={setTitulo}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Breve descrição para contexto do questionário…"
              placeholderTextColor={Colors.textSecondary}
              value={descricao}
              onChangeText={setDescricao}
              multiline
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Estado</Text>
            <View style={styles.segment}>
              {[
                { key: 'rascunho', label: 'Rascunho' },
                { key: 'publicado', label: 'Publicado' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setEstado(opt.key)}
                  style={[styles.segmentBtn, estado === opt.key && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, estado === opt.key && styles.segmentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.metaChips}>
              <Chip icon="person-circle-outline" text={auth.currentUser?.email || '—'} tone="neutral" />
              <Chip icon="time-outline" text={questionarioId ? 'Edição' : 'Novo'} tone="neutral" />
              <Chip icon="checkmark-done-outline" text={`${perguntas.length} ${perguntas.length === 1 ? 'pergunta' : 'perguntas'}`} tone="info" />
            </View>
          </View>

          {/* Perguntas */}
          <Text style={styles.sectionTitle}>Perguntas</Text>

          {perguntas.map((p, index) => (
            <View key={p.id || index} style={[styles.qCard, styles.cardElev]}>
              <View style={styles.qHeader}>
                <Text style={styles.qIndex}>#{index + 1}</Text>
                <View style={styles.qHeaderActions}>
                  <TouchableOpacity onPress={() => moverPergunta(index, -1)} disabled={index === 0} style={styles.iconBtn}>
                    <Ionicons name="arrow-up" size={18} color={index === 0 ? Colors.mediumGray : Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moverPergunta(index, 1)} disabled={index === perguntas.length - 1} style={styles.iconBtn}>
                    <Ionicons name="arrow-down" size={18} color={index === perguntas.length - 1 ? Colors.mediumGray : Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => duplicarPergunta(index)} style={styles.iconBtn}>
                    <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removerPergunta(index)} style={[styles.iconBtn, styles.iconDanger]}>
                    <Ionicons name="trash-outline" size={18} color={Colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.labelSmall}>Enunciado</Text>
              <TextInput
                style={styles.input}
                placeholder={`Escreve a pergunta ${index + 1}…`}
                placeholderTextColor={Colors.textSecondary}
                value={p.pergunta ?? ''}   // <— assegura sempre string
                onChangeText={(t) => atualizarPerguntaText(index, t)}
              />

              <Text style={[styles.labelSmall, { marginTop: 10 }]}>Tipo</Text>
              <View style={styles.tipoRow}>
                {TIPOS_PERGUNTA.map((t) => {
                  const active = p.tipo === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => atualizarTipoPergunta(index, t.value)}
                      style={[styles.tipoBtn, active && styles.tipoBtnActive]}
                    >
                      <Ionicons
                        name={t.icon}
                        size={16}
                        color={active ? Colors.onSecondary : Colors.textSecondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.tipoText, active && styles.tipoTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {p.tipo === 'multipla' && (
                <View style={styles.optionsWrap}>
                  {(p.opcoes || []).map((op, oi) => (
                    <View key={`${p.id}-op-${oi}`} style={styles.optionRow}>
                      <Ionicons name="ellipse-outline" size={16} color={Colors.secondary} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder={`Opção ${oi + 1}`}
                        placeholderTextColor={Colors.textSecondary}
                        value={op}
                        onChangeText={(t) => atualizarOpcao(index, oi, t)}
                      />
                      <TouchableOpacity onPress={() => removerOpcao(index, oi)} style={[styles.iconBtn, styles.iconDanger]}>
                        <Ionicons name="close" size={18} color={Colors.onPrimary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => adicionarOpcao(index)} style={styles.addOptionBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.secondary} />
                    <Text style={styles.addOptionText}>Adicionar opção</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={adicionarPergunta} style={[styles.addQuestionBtn, styles.cardElev]}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.onSecondary} />
            <Text style={styles.addQuestionText}>Adicionar pergunta</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer fixo */}
      <View style={[styles.footer, styles.cardElev]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.footerBtn, styles.footerBtnGhost]}>
          <Ionicons name="arrow-back" size={18} color={Colors.textPrimary} />
          <Text style={[styles.footerBtnText, { color: Colors.textPrimary }]}>Voltar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={salvar} style={[styles.footerBtn, styles.footerBtnPrimary]} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={Colors.onPrimary} />
              <Text style={[styles.footerBtnText, { color: Colors.onPrimary }]}>Guardar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, color: Colors.textSecondary },

  scroll: { paddingHorizontal: Layout?.padding ?? 16, paddingTop: 12 },

  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerSaveBtnText: { color: Colors.onSecondary, fontWeight: '800', marginLeft: 6 },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider ?? '#E6E8EB',
    marginBottom: 12,
  },
  cardElev: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },

  label: { fontWeight: '800', fontSize: 15, color: Colors.textPrimary },
  labelSmall: { fontWeight: '700', fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },

  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 10,
    padding: 4,
    marginTop: 8,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: Colors.secondary },
  segmentText: { color: Colors.textPrimary, fontWeight: '700' },
  segmentTextActive: { color: Colors.onSecondary, fontWeight: '900' },

  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: '800' },
  chip_neutral: { backgroundColor: Colors.lightGray },
  chip_info: { backgroundColor: '#E8F1FF' },
  chipText_neutral: { color: Colors.textSecondary },
  chipText_info: { color: Colors.primary },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: Colors.primary, marginTop: 12, marginBottom: 8 },

  qCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    marginBottom: 12,
  },
  qHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  qIndex: { fontWeight: '900', color: Colors.primary },
  qHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, borderRadius: 8, marginLeft: 6, backgroundColor: Colors.lightGray },
  iconDanger: { backgroundColor: Colors.danger },

  tipoRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tipoBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface,
  },
  tipoBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  tipoText: { color: Colors.textPrimary, fontWeight: '700' },
  tipoTextActive: { color: Colors.onSecondary, fontWeight: '900' },

  optionsWrap: { marginTop: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: `${Colors.secondary}22`, borderWidth: 1, borderColor: Colors.secondary,
  },
  addOptionText: { marginLeft: 8, color: Colors.secondary, fontWeight: '800' },

  addQuestionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary,
    paddingVertical: 12, borderRadius: 12, justifyContent: 'center', marginTop: 4,
  },
  addQuestionText: { color: Colors.onSecondary, fontWeight: '900', marginLeft: 8 },

  footer: {
    position: 'absolute', left: Layout?.padding ?? 16, right: Layout?.padding ?? 16, bottom: 12,
    backgroundColor: Colors.surface, borderRadius: 14, padding: 10, flexDirection: 'row',
    justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.divider,
  },
  footerBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  footerBtnGhost: { marginRight: 8, backgroundColor: Colors.lightGray },
  footerBtnPrimary: { marginLeft: 8, backgroundColor: Colors.primary },
  footerBtnText: { marginLeft: 8, fontWeight: '900' },
});
