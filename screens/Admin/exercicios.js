// screens/exercicios.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
} from 'firebase/firestore';
// ⚠️ Ajusta este import conforme a tua estrutura:
import { db } from '../../services/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

/* =================== Tema consistente =================== */
const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  background: '#F0F2F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#222222',
  textSecondary: '#666666',
  success: '#4CAF50',
  danger: '#F44336',
  info: '#2196F3',
  divider: '#E6E8EB',
};

const RADIUS = 16;
const GAP = 12;
const { width, height } = Dimensions.get('window');

/* =================== Constantes de filtro =================== */
const EXERCISE_CATEGORIES = [
  'Força',
  'Aeróbico',
  'Alongamento',
  'HIIT',
  'Funcional',
  'Peso Corporal',
  'Máquina',
  'Equipamento',
  'Elástico',
  'Outro',
];

const TARGET_MUSCLES = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Pernas',
  'Glúteos',
  'Quadríceps',
  'Posterior de Coxa',
  'Panturrilha',
  'Core',
  'Oblíquos',
  'Lombar',
  'Corpo inteiro',
  'Adutores',
  'Abdutores',
];

const EQUIPMENT_OPTIONS = [
  'Nenhum',
  'Banco',
  'Barra',
  'Barra W',
  'Barra Fixa',
  'Paralelas',
  'Halter',
  'Kettlebell',
  'Máquina',
  'Polia',
  'Corda',
  'Elástico',
  'Colchonete',
  'Outro',
];

/* =================== Exercícios predefinidos (seed opcional) =================== */
// Mantive apenas alguns exemplos; se quiseres, cola aqui a tua lista completa.
const PREDEFINED_EXERCISES = [
  {
    id: 'agachamento',
    nome_pt: 'Agachamento',
    nome_en: 'Squat',
    descricao_breve: 'Exercício fundamental para membros inferiores.',
    category: 'Peso Corporal',
    musculos_alvo: ['Quadríceps', 'Glúteos', 'Core'],
    equipamento: 'Nenhum',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
  {
    id: 'flexao_braços',
    nome_pt: 'Flexão de Braços',
    nome_en: 'Push-up',
    descricao_breve: 'Clássico para peito e tríceps.',
    category: 'Peso Corporal',
    musculos_alvo: ['Peito', 'Tríceps', 'Core'],
    equipamento: 'Nenhum',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
  {
    id: 'prancha',
    nome_pt: 'Prancha',
    nome_en: 'Plank',
    descricao_breve: 'Isométrico para core.',
    category: 'Peso Corporal',
    musculos_alvo: ['Core'],
    equipamento: 'Nenhum',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
  {
    id: 'remada_curvada_barra',
    nome_pt: 'Remada Curvada com Barra',
    nome_en: 'Barbell Bent Over Row',
    descricao_breve: 'Força para costas.',
    category: 'Equipamento',
    musculos_alvo: ['Costas', 'Bíceps'],
    equipamento: 'Barra',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
  {
    id: 'supino_reto_barra',
    nome_pt: 'Supino Reto com Barra',
    nome_en: 'Barbell Bench Press',
    descricao_breve: 'Clássico de peito.',
    category: 'Equipamento',
    musculos_alvo: ['Peito', 'Tríceps', 'Ombros'],
    equipamento: 'Barra',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
  {
    id: 'elevação_panturrilha_maquina',
    nome_pt: 'Elevação de Panturrilha na Máquina',
    nome_en: 'Machine Calf Raise',
    descricao_breve: 'Panturrilhas na máquina.',
    category: 'Máquina',
    musculos_alvo: ['Panturrilha'],
    equipamento: 'Máquina',
    animacao_url: 'https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio',
  },
];

/* =================== Helpers =================== */
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

/* =================== Componente =================== */
export default function ExerciseLibraryScreen() {
  const navigation = useNavigation();

  // Estado: dados
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado: filtros/pesquisa
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterMuscles, setFilterMuscles] = useState([]);
  const [filterEquipment, setFilterEquipment] = useState([]);

  // Estado: modal add/edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nome_pt: '',
    nome_en: '',
    descricao_breve: '',
    category: '',
    musculos_alvo: [],
    equipamento: 'Nenhum',
    animacao_url: '',
  });

  // Estado: modal animação
  const [isAnimVisible, setIsAnimVisible] = useState(false);
  const [animUrl, setAnimUrl] = useState('');

  /* -------- Firestore: subscribe em tempo real -------- */
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, 'exercises');
    const qy = query(colRef, orderBy('nome_pt', 'asc'));

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setExercises(list);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao buscar exercícios:', err);
        setError('Não foi possível carregar os exercícios.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* -------- Seed opcional: só preenche se coleção estiver vazia -------- */
  const seedIfEmpty = useCallback(async () => {
    try {
      const colRef = collection(db, 'exercises');
      const snap = await getDocs(colRef);
      if (snap.empty) {
        await Promise.all(PREDEFINED_EXERCISES.map((ex) => addDoc(colRef, ex)));
        Alert.alert('Ok', 'Exercícios predefinidos adicionados.');
      } else {
        Alert.alert('Info', 'A coleção já tem exercícios.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falhou o preenchimento automático.');
    }
  }, []);

  /* -------- Filtro memoizado -------- */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch =
        !s ||
        (ex.nome_pt && ex.nome_pt.toLowerCase().includes(s)) ||
        (ex.nome_en && ex.nome_en.toLowerCase().includes(s)) ||
        (ex.descricao_breve && ex.descricao_breve.toLowerCase().includes(s));

      const matchesCategory =
        filterCategory === 'Todos' ||
        (ex.category && String(ex.category).toLowerCase() === filterCategory.toLowerCase());

      const muscles = toArray(ex.musculos_alvo);
      const equipment = toArray(ex.equipamento);

      const matchesMuscles =
        filterMuscles.length === 0 ||
        filterMuscles.every((m) => muscles.map(String).includes(m));

      const matchesEquipment =
        filterEquipment.length === 0 ||
        filterEquipment.every((e) => equipment.map(String).includes(e));

      return matchesSearch && matchesCategory && matchesMuscles && matchesEquipment;
    });
  }, [exercises, search, filterCategory, filterMuscles, filterEquipment]);

  /* -------- Ações: abrir/fechar modais -------- */
  const openCreate = () => {
    setEditingId(null);
    setForm({
      nome_pt: '',
      nome_en: '',
      descricao_breve: '',
      category: '',
      musculos_alvo: [],
      equipamento: 'Nenhum',
      animacao_url: '',
    });
    setIsModalVisible(true);
  };

  const openEdit = (ex) => {
    setEditingId(ex.id);
    setForm({
      nome_pt: ex.nome_pt || '',
      nome_en: ex.nome_en || '',
      descricao_breve: ex.descricao_breve || '',
      category: ex.category || '',
      musculos_alvo: toArray(ex.musculos_alvo),
      equipamento: Array.isArray(ex.equipamento)
        ? ex.equipamento[0] || 'Nenhum'
        : ex.equipamento || 'Nenhum',
      animacao_url: ex.animacao_url || '',
    });
    setIsModalVisible(true);
  };

  const closeModal = () => setIsModalVisible(false);

  const openAnimation = (url) => {
    setAnimUrl(url || '');
    setIsAnimVisible(true);
  };
  const closeAnimation = () => setIsAnimVisible(false);

  /* -------- Persistência -------- */
  const saveExercise = async () => {
    const payload = {
      nome_pt: form.nome_pt.trim(),
      nome_en: form.nome_en.trim(),
      descricao_breve: form.descricao_breve.trim(),
      category: form.category,
      musculos_alvo: toArray(form.musculos_alvo),
      equipamento: form.equipamento || 'Nenhum',
      animacao_url: form.animacao_url.trim(),
      nameLower: form.nome_pt.trim().toLowerCase(),
      updatedAt: new Date(),
    };

    if (!payload.nome_pt) return Alert.alert('Erro', 'Indica o nome (PT).');
    if (!payload.category) return Alert.alert('Erro', 'Escolhe a categoria.');

    try {
      if (editingId) {
        await updateDoc(doc(db, 'exercises', editingId), payload);
        Alert.alert('Sucesso', 'Exercício atualizado.');
      } else {
        await addDoc(collection(db, 'exercises'), { ...payload, createdAt: new Date() });
        Alert.alert('Sucesso', 'Exercício criado.');
      }
      closeModal();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível guardar o exercício.');
    }
  };

  const confirmDelete = (id) => {
    Alert.alert('Apagar', 'Queres apagar este exercício?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'exercises', id));
            Alert.alert('Removido', 'Exercício removido.');
          } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível remover.');
          }
        },
      },
    ]);
  };

  /* -------- Renders -------- */
  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const ExerciseCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.nome_pt || 'Exercício'}
        </Text>
        <View style={styles.cardActions}>
          {!!item.animacao_url && (
            <TouchableOpacity
              onPress={() => openAnimation(item.animacao_url)}
              style={styles.iconBtn}
            >
              <Ionicons name="play-circle-outline" size={22} color={Colors.info} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaRow}>
        {item.category ? (
          <View style={[styles.pill, { backgroundColor: '#EAF3FF', borderColor: '#CFE3FF' }]}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.info} />
            <Text style={styles.pillText}>{item.category}</Text>
          </View>
        ) : null}

        {toArray(item.equipamento).map((eq) => (
          <View
            key={eq}
            style={[styles.pill, { backgroundColor: '#FFF7E0', borderColor: '#FFE6A8' }]}
          >
            <Ionicons name="hammer-outline" size={14} color={Colors.secondary} />
            <Text style={styles.pillText}>{eq}</Text>
          </View>
        ))}
      </View>

      {toArray(item.musculos_alvo).length > 0 && (
        <View style={styles.metaRowWrap}>
          {toArray(item.musculos_alvo).map((m) => (
            <View
              key={m}
              style={[styles.tag, { backgroundColor: '#F4F6F8', borderColor: Colors.divider }]}
            >
              <Text style={styles.tagText}>{m}</Text>
            </View>
          ))}
        </View>
      )}

      {item.descricao_breve ? (
        <Text style={styles.cardSubtitle} numberOfLines={3}>
          {item.descricao_breve}
        </Text>
      ) : null}
    </View>
  );

  /* -------- UI -------- */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>A carregar exercícios…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biblioteca de Exercícios</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={openCreate} style={styles.headerBtn}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar por nome, descrição…"
          placeholderTextColor={Colors.textSecondary}
          style={styles.searchInput}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {renderChip(
          filterCategory === 'Todos' ? 'Categoria: Todos' : `Categoria: ${filterCategory}`,
          filterCategory !== 'Todos',
          () => {
            // ciclo simples por categorias ao toque
            const all = ['Todos', ...EXERCISE_CATEGORIES];
            const idx = all.indexOf(filterCategory);
            setFilterCategory(all[(idx + 1) % all.length]);
          }
        )}
        {renderChip(
          filterMuscles.length ? `Músculos (${filterMuscles.length})` : 'Músculos',
          filterMuscles.length > 0,
          () => {
            // alterna rapidamente alguns exemplos (para UI demo). Podes trocar por modal de multi-seleção.
            const opts = ['Peito', 'Costas', 'Quadríceps', 'Core'];
            setFilterMuscles((prev) => (prev.length ? [] : opts));
          }
        )}
        {renderChip(
          filterEquipment.length ? `Equipamento (${filterEquipment.length})` : 'Equipamento',
          filterEquipment.length > 0,
          () => {
            const opts = ['Nenhum', 'Halter', 'Barra', 'Máquina'];
            setFilterEquipment((prev) => (prev.length ? [] : opts));
          }
        )}
        {/* Botão rápido para semear a coleção (opcional) */}
        <TouchableOpacity onPress={seedIfEmpty} style={styles.seedBtn}>
          <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
          <Text style={styles.seedText}>Predefinidos</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lista */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="fitness-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>Sem resultados com os filtros atuais.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={ExerciseCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal: criar/editar */}
      <Modal transparent animationType="fade" visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Exercício' : 'Novo Exercício'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.6 }}>
              <Text style={styles.label}>Nome (PT)</Text>
              <TextInput
                style={styles.input}
                value={form.nome_pt}
                onChangeText={(t) => setForm((p) => ({ ...p, nome_pt: t }))}
                placeholder="Ex.: Agachamento"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.label}>Nome (EN) — opcional</Text>
              <TextInput
                style={styles.input}
                value={form.nome_en}
                onChangeText={(t) => setForm((p) => ({ ...p, nome_en: t }))}
                placeholder="Ex.: Squat"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.label}>Descrição breve</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={form.descricao_breve}
                onChangeText={(t) => setForm((p) => ({ ...p, descricao_breve: t }))}
                placeholder="Notas rápidas sobre o exercício…"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />

              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {EXERCISE_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setForm((p) => ({ ...p, category: c }))}
                    style={[styles.chip, form.category === c && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, form.category === c && styles.chipTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Músculos alvo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {TARGET_MUSCLES.map((m) => {
                  const on = form.musculos_alvo.includes(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() =>
                        setForm((p) => ({
                          ...p,
                          musculos_alvo: on ? p.musculos_alvo.filter((x) => x !== m) : [...p.musculos_alvo, m],
                        }))
                      }
                      style={[styles.chip, on && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Equipamento principal</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {EQUIPMENT_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setForm((p) => ({ ...p, equipamento: e }))}
                    style={[styles.chip, form.equipamento === e && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, form.equipamento === e && styles.chipTextSelected]}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>URL da Animação (gif ou vídeo)</Text>
              <TextInput
                style={styles.input}
                value={form.animacao_url}
                onChangeText={(t) => setForm((p) => ({ ...p, animacao_url: t }))}
                placeholder="https://…"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
              />
            </ScrollView>

            <TouchableOpacity onPress={saveExercise} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{editingId ? 'Guardar alterações' : 'Criar exercício'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: animação */}
      <Modal transparent animationType="fade" visible={isAnimVisible} onRequestClose={closeAnimation}>
        <View style={styles.modalOverlay}>
          <View style={styles.animCard}>
            {animUrl ? (
              <WebView
                source={{
                  html: `
                  <html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
                  <style>html,body{margin:0;height:100%;background:#000;display:flex;align-items:center;justify-content:center}
                  img,video{max-width:100%;max-height:100%;object-fit:contain}</style></head>
                  <body>
                    ${animUrl.endsWith('.gif')
                      ? `<img src="${animUrl}" />`
                      : `<video src="${animUrl}" autoplay loop controls></video>`}
                  </body></html>`,
                }}
                style={{ width: width * 0.9, height: height * 0.6 }}
                allowsFullscreenVideo
                javaScriptEnabled
                domStorageEnabled
              />
            ) : (
              <Text style={{ color: '#fff' }}>Sem animação disponível.</Text>
            )}
            <TouchableOpacity onPress={closeAnimation} style={styles.closeAnimBtn}>
              <Text style={styles.closeAnimText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =================== Styles =================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 10, color: Colors.textPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: RADIUS,
    borderBottomRightRadius: RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  headerBtn: { padding: 6, borderRadius: 20 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  searchBar: {
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.textPrimary },

  filtersRow: { paddingHorizontal: 16, paddingBottom: 6, alignItems: 'center', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.cardBackground,
  },
  chipSelected: { backgroundColor: Colors.info, borderColor: Colors.info },
  chipText: { color: Colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: Colors.cardBackground },

  seedBtn: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  seedText: { color: Colors.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: GAP,
    borderLeftWidth: 5,
    borderLeftColor: Colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1, paddingRight: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { marginLeft: 2, color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },

  tag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  cardSubtitle: { marginTop: 10, color: Colors.textSecondary, lineHeight: 20 },

  errorBox: {
    margin: 16,
    padding: 14,
    backgroundColor: '#FFE8E8',
    borderWidth: 1,
    borderColor: '#FFCDCD',
    borderRadius: 12,
  },
  errorText: { color: Colors.danger },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    margin: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  emptyText: { marginTop: 10, color: Colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '92%',
    backgroundColor: Colors.cardBackground,
    borderRadius: RADIUS,
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  label: { color: Colors.textPrimary, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardBackground,
    color: Colors.textPrimary,
  },

  saveBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  animCard: {
    width: width * 0.92,
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
  },
  closeAnimBtn: {
    marginTop: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeAnimText: { color: Colors.primary, fontWeight: '700' },
});
