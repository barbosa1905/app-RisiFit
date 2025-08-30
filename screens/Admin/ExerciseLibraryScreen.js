// screens/Admin/ExerciseLibraryScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView,
  StatusBar, Dimensions, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, query, orderBy, addDoc,
  updateDoc, deleteDoc, doc, getDocs
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import AppHeader from '../../components/AppHeader';

/* =================== Tema =================== */
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
const VIDEO_W = Math.min(width, 1024);
const VIDEO_H = Math.min(height * 0.62, (VIDEO_W * 9) / 16);

/* =================== Firestore =================== */
const COLLECTION = 'Exercise';

/* =================== Catálogos (PT-PT) =================== */
const EXERCISE_CATEGORIES = [
  
  'Parte Superior', 'Parte Inferior', 'Corpo Inteiro'
];
const TARGET_MUSCLES = [
  'Peitorais', 'Costas', 'Deltoides', 'Bíceps', 'Tríceps', 'Quadríceps',
  'Isquiotibiais', 'Gémeos', 'Glúteos', 'Core', 'Reto Abdominal',
  'Oblíquos', 'Zona Lombar', 'Grande Dorsal', 'Romboides', 'Trapézio',
  'Antebraços', 'Adutores', 'Abdutores', 'Eretores da Coluna', 'Serrátil Anterior'
];
const EQUIPMENT_OPTIONS = [
  'Nenhum', 'Barra', 'Halteres', 'Máquina', 'Polia', 'Elástico',
  'Kettlebell', 'Barra EZ', 'Barra Hexagonal', 'Máquina Smith',
  'Barra Fixa', 'Paralelas', 'Banco', 'TRX', 'Bola Medicinal', 'Corda'
];

/* =================== Helpers =================== */
const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);
const MUSCLE_SYNONYMS = new Map([
  ['Panturrilha','Gémeos'], ['Panturrilhas','Gémeos'], ['Gemeos','Gémeos'], ['Gêmeos','Gémeos'],
  ['Posterior de Coxa','Isquiotibiais'], ['Posteriores da Coxa','Isquiotibiais'],
  ['Adutor','Adutores'], ['Abdutor','Abdutores'],
  ['Abdominais','Reto Abdominal'], ['Reto do Abdómen','Reto Abdominal'], ['Reto abdominal','Reto Abdominal'],
  ['Lower Back','Zona Lombar'], ['Eretores da Espinha','Eretores da Coluna'], ['Eretores Espinais','Eretores da Coluna'],
  ['Lats','Grande Dorsal'], ['Dorsais','Grande Dorsal'], ['Latíssimo do Dorso','Grande Dorsal'], ['Latissimo do Dorso','Grande Dorsal'],
  ['Romboide','Romboides'], ['Deltoídes','Deltoides'], ['Deltoide','Deltoides'],
  ['Biceps','Bíceps'], ['Triceps','Tríceps'], ['Antebraço','Antebraços'],
  ['Peito','Peitorais'], ['Peitoral','Peitorais'], ['Quadriceps','Quadríceps'],
  ['Gluteo','Glúteos'], ['Gluteos','Glúteos'],
  ['Obliquos','Oblíquos'], ['Serratil Anterior','Serrátil Anterior'],
]);
const canon = (m) => {
  const t = String(m || '').trim();
  return MUSCLE_SYNONYMS.get(t) || t;
};

/* ======= Vídeo: detetar e converter para embed ======= */
const toYouTubeId = (url='') => {
  const u = String(url).trim();
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const rx of patterns) {
    const m = u.match(rx);
    if (m?.[1]) return m[1];
  }
  return '';
};
const toYouTubeEmbed = (url='') => {
  const id = toYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3` : '';
};
const toVimeoEmbed = (url='') => {
  const m = String(url).trim().match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : '';
};
const toDrivePreview = (url='') => {
  const m = String(url).trim().match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : '';
};
const toDropboxRaw = (url='') => {
  try {
    const u = new URL(String(url).trim());
    if (u.hostname.endsWith('dropbox.com')) {
      u.searchParams.set('raw','1');
      u.searchParams.delete('dl');
      return u.toString();
    }
  } catch {}
  return '';
};
const detectMedia = (url='') => {
  const u = String(url || '').trim();
  const low = u.toLowerCase();
  if (!u) return { type:'none', src:'' };

  if (low.endsWith('.gif'))  return { type:'gif',  src:u };
  if (low.endsWith('.mp4') || low.endsWith('.webm')) return { type:'mp4', src:u };

  if (low.includes('youtube.com') || low.includes('youtu.be')) {
    const id = toYouTubeId(u);
    const src = toYouTubeEmbed(u);
    return id ? { type:'youtube', src, youtubeId:id, raw:u } : { type:'ext', src:u };
  }
  if (low.includes('vimeo.com')) {
    const src = toVimeoEmbed(u);
    return src ? { type:'vimeo', src, raw:u } : { type:'ext', src:u };
  }
  if (low.includes('drive.google.com')) {
    const src = toDrivePreview(u);
    return src ? { type:'drive', src, raw:u } : { type:'ext', src:u };
  }
  if (low.includes('dropbox.com')) {
    const src = toDropboxRaw(u);
    return src ? { type:'mp4', src, raw:u } : { type:'ext', src:u };
  }
  return { type:'url', src:u };
};
const iframeHTML = (src) => `
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>html,body{margin:0;height:100%;background:#000}</style></head>
  <body>
    <iframe src="${src}" width="100%" height="100%" frameborder="0"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowfullscreen style="display:block"></iframe>
  </body></html>`;

/* Documento Firestore → objeto UI */
const normalizeDoc = (id, data) => {
  const musc = toArray(data.musculos_alvo).map(canon).filter(Boolean);
  const equipamento = data.equipamento ?? 'Nenhum';
  const categoryNormalized = (data.categoria ?? data.category ?? '').trim();
  return {
    id,
    nome_pt: data.nome_pt ?? '',
    nome_en: data.nome_en ?? '',
    descricao_breve: data.descricao_breve ?? '',
    categoria: data.categoria,
    category: data.category,
    categoryNormalized,
    musculos_alvo: musc,
    equipamento: Array.isArray(equipamento) ? equipamento : String(equipamento),
    animacao_url: data.animacao_url ?? '',
    nameLower: (data.nome_pt ?? '').toLowerCase(),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
};

/* =================== Componente =================== */
export default function ExerciseLibraryScreen() {
  const navigation = useNavigation();

  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filtros
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterMuscles, setFilterMuscles] = useState([]);
  const [filterEquipment, setFilterEquipment] = useState([]);

  // modais filtros
  const [categoryModal, setCategoryModal] = useState(false);
  const [musclesModal, setMusclesModal] = useState(false);
  const [equipmentModal, setEquipmentModal] = useState(false);

  // modal add/edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nome_pt: '', nome_en: '', descricao_breve: '',
    category: '', musculos_alvo: [], equipamento: 'Nenhum', animacao_url: '',
  });

  // modal animação
  const [isAnimVisible, setIsAnimVisible] = useState(false);
  const [animUrl, setAnimUrl] = useState('');
  const [useIframe, setUseIframe] = useState(false);
  const [layer, setLayer] = useState('hardware'); // 'hardware' | 'software'
  const [wvKey, setWvKey] = useState(0); // força re-render

  /* -------- Firestore em tempo real -------- */
  useEffect(() => {
    setLoading(true);
    const colRef = collection(db, COLLECTION);
    const qy = query(colRef, orderBy('nome_en', 'asc'));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => normalizeDoc(d.id, d.data()));
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

  /* -------- Seed opcional -------- */
  const seedIfEmpty = useCallback(async () => {
    try {
      const colRef = collection(db, COLLECTION);
      const snap = await getDocs(colRef);
      if (snap.empty) {
        Alert.alert('Info', 'Sem seed automático nesta versão.');
      } else {
        Alert.alert('Info', 'A coleção já tem exercícios.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falhou o preenchimento automático.');
    }
  }, []);

  /* -------- Filtragem -------- */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch =
        !s ||
        (ex.nome_pt && ex.nome_pt.toLowerCase().includes(s)) ||
        (ex.nome_en && ex.nome_en.toLowerCase().includes(s)) ||
        (ex.descricao_breve && ex.descricao_breve.toLowerCase().includes(s)) ||
        (ex.categoryNormalized && ex.categoryNormalized.toLowerCase().includes(s)) ||
        (toArray(ex.musculos_alvo).join(' ').toLowerCase().includes(s));

      const matchesCategory =
        filterCategory === 'Todos' ||
        (ex.categoryNormalized && ex.categoryNormalized.toLowerCase() === filterCategory.toLowerCase());

      const muscles = toArray(ex.musculos_alvo).map(String);
      const equipment = toArray(ex.equipamento).map(String);

      const matchesMuscles =
        filterMuscles.length === 0 ||
        filterMuscles.some((m) => muscles.includes(m));

      const matchesEquipment =
        filterEquipment.length === 0 ||
        filterEquipment.some((e) => equipment.includes(e));

      return matchesSearch && matchesCategory && matchesMuscles && matchesEquipment;
    });
  }, [exercises, search, filterCategory, filterMuscles, filterEquipment]);

  /* -------- Ações básicas -------- */
  const openCreate = () => {
    setEditingId(null);
    setForm({
      nome_pt: '', nome_en: '', descricao_breve: '',
      category: '', musculos_alvo: [], equipamento: 'Nenhum', animacao_url: '',
    });
    setIsModalVisible(true);
  };
  const openEdit = (ex) => {
    setEditingId(ex.id);
    setForm({
      nome_pt: ex.nome_pt || '',
      nome_en: ex.nome_en || '',
      descricao_breve: ex.descricao_breve || '',
      category: ex.categoryNormalized || '',
      musculos_alvo: toArray(ex.musculos_alvo),
      equipamento: Array.isArray(ex.equipamento) ? ex.equipamento[0] || 'Nenhum' : ex.equipamento || 'Nenhum',
      animacao_url: ex.animacao_url || '',
    });
    setIsModalVisible(true);
  };
  const closeModal = () => setIsModalVisible(false);

  const openAnimation = (url) => {
    const clean = (url || '').trim();
    const media = detectMedia(clean);
    setUseIframe(false);
    setLayer('hardware');
    setWvKey((k) => k + 1);
    setAnimUrl(clean);
    setIsAnimVisible(true);
  };
  const closeAnimation = () => setIsAnimVisible(false);

  /* -------- Persistência -------- */
  const saveExercise = async () => {
    const payload = {
      nome_pt: form.nome_pt.trim(),
      nome_en: form.nome_en.trim(),
      descricao_breve: form.descricao_breve.trim(),
      categoria: form.category,
      category: form.category,
      musculos_alvo: toArray(form.musculos_alvo).map(canon),
      equipamento: form.equipamento || 'Nenhum',
      animacao_url: form.animacao_url.trim(),
      nameLower: form.nome_en.trim().toLowerCase(),
      updatedAt: new Date(),
    };
    if (!payload.nome_pt) return Alert.alert('Erro', 'Indica o nome (PT).');
    if (!payload.category) return Alert.alert('Erro', 'Escolhe a categoria.');
    try {
      if (editingId) {
        await updateDoc(doc(db, COLLECTION, editingId), payload);
        Alert.alert('Sucesso', 'Exercício atualizado.');
      } else {
        await addDoc(collection(db, COLLECTION), { ...payload, createdAt: new Date() });
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
            await deleteDoc(doc(db, COLLECTION, id));
            Alert.alert('Removido', 'Exercício removido.');
          } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível remover.');
          }
        },
      },
    ]);
  };

  /* -------- UI helpers -------- */
  const FilterButton = ({ label, count, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.filterBtn}>
      <Ionicons name="filter-outline" size={16} color={Colors.primary} />
      <Text style={styles.filterBtnText}>{label}</Text>
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
  const renderChip = (label, selected, onPress) => (
    <TouchableOpacity key={label} onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  const ExerciseCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nome_en || 'Exercício'}</Text>
        <View style={styles.cardActions}>
          {!!item.animacao_url && (
            <TouchableOpacity onPress={() => openAnimation(item.animacao_url)} style={styles.iconBtn}>
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
        {item.categoryNormalized ? (
          <View style={[styles.pill, { backgroundColor: '#EAF3FF', borderColor: '#CFE3FF' }]}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.info} />
            <Text style={styles.pillText}>{item.categoryNormalized}</Text>
          </View>
        ) : null}

        {toArray(item.equipamento).map((eq) => (
          <View key={eq} style={[styles.pill, { backgroundColor: '#FFF7E0', borderColor: '#FFE6A8' }]}>
            <Ionicons name="hammer-outline" size={14} color={Colors.secondary} />
            <Text style={styles.pillText}>{eq}</Text>
          </View>
        ))}
      </View>

      {toArray(item.musculos_alvo).length > 0 && (
        <View style={styles.metaRowWrap}>
          {toArray(item.musculos_alvo).map((m) => (
            <View key={m} style={[styles.tag, { backgroundColor: '#F4F6F8', borderColor: Colors.divider }]}>
              <Text style={styles.tagText}>{m}</Text>
            </View>
          ))}
        </View>
      )}

      {item.descricao_breve ? (
        <Text style={styles.cardSubtitle} numberOfLines={3}>{item.descricao_breve}</Text>
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
      <AppHeader title='Os teus Exercícios' subtitle="" showBackButton onBackPress={() => navigation.goBack()} showMenu={false} showBell={false} statusBarStyle="light-content" />

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
      <View style={styles.filtersRow}>
        <FilterButton label={filterCategory === 'Todos' ? 'Categoria' : `Categoria: ${filterCategory}`} count={filterCategory === 'Todos' ? 0 : 1} onPress={() => setCategoryModal(true)} />
        <FilterButton label="Músculos" count={filterMuscles.length} onPress={() => setMusclesModal(true)} />
        <FilterButton label="Equipamento" count={filterEquipment.length} onPress={() => setEquipmentModal(true)} />
        <TouchableOpacity onPress={seedIfEmpty} style={styles.seedBtn}>
          <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
          <Text style={styles.seedText}>Predefinidos</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {error ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
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

      {/* Modal Categoria */}
      <Modal transparent animationType="fade" visible={categoryModal} onRequestClose={() => setCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Categoria</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.6 }}>
              {renderChip('Todos', filterCategory === 'Todos', () => setFilterCategory('Todos'))}
              <View style={{ height: 8 }} />
              {EXERCISE_CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setFilterCategory(c)} style={[styles.selectRow, filterCategory === c && styles.selectRowSelected]}>
                  <Text style={[styles.selectRowText, filterCategory === c && styles.selectRowTextSelected]}>{c}</Text>
                  {filterCategory === c && <Ionicons name="checkmark-circle" size={20} color={Colors.success} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity onPress={() => setFilterCategory('Todos')} style={styles.clearBtn}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setCategoryModal(false)} style={styles.applyBtn}><Text style={styles.applyText}>Aplicar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Músculos */}
      <Modal transparent animationType="fade" visible={musclesModal} onRequestClose={() => setMusclesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Músculos</Text>
              <TouchableOpacity onPress={() => setMusclesModal(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.6 }}>
              <View style={styles.wrapChips}>
                {TARGET_MUSCLES.map((m) => {
                  const on = filterMuscles.includes(m);
                  return renderChip(m, on, () => setFilterMuscles((prev) => on ? prev.filter((x) => x !== m) : [...prev, m]));
                })}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity onPress={() => setFilterMuscles([])} style={styles.clearBtn}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setMusclesModal(false)} style={styles.applyBtn}><Text style={styles.applyText}>Aplicar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Equipamento */}
      <Modal transparent animationType="fade" visible={equipmentModal} onRequestClose={() => setEquipmentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Equipamento</Text>
              <TouchableOpacity onPress={() => setEquipmentModal(false)}>
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.6 }}>
              <View style={styles.wrapChips}>
                {EQUIPMENT_OPTIONS.map((e) => {
                  const on = filterEquipment.includes(e);
                  return renderChip(e, on, () => setFilterEquipment((prev) => on ? prev.filter((x) => x !== e) : [...prev, e]));
                })}
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity onPress={() => setFilterEquipment([])} style={styles.clearBtn}><Text style={styles.clearText}>Limpar</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setEquipmentModal(false)} style={styles.applyBtn}><Text style={styles.applyText}>Aplicar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal criar/editar */}
      <Modal transparent animationType="fade" visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar Exercício' : 'Novo Exercício'}</Text>
              <TouchableOpacity onPress={closeModal}><Ionicons name="close-circle" size={26} color={Colors.danger} /></TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: height * 0.6 }}>
              <Text style={styles.label}>Nome (PT)</Text>
              <TextInput style={styles.input} value={form.nome_pt} onChangeText={(t) => setForm((p) => ({ ...p, nome_pt: t }))} placeholder="Ex.: Agachamento" placeholderTextColor={Colors.textSecondary} />

              <Text style={styles.label}>Nome (EN) — opcional</Text>
              <TextInput style={styles.input} value={form.nome_en} onChangeText={(t) => setForm((p) => ({ ...p, nome_en: t }))} placeholder="Ex.: Squat" placeholderTextColor={Colors.textSecondary} />

              <Text style={styles.label}>Descrição breve</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={form.descricao_breve} onChangeText={(t) => setForm((p) => ({ ...p, descricao_breve: t }))} placeholder="Notas rápidas sobre o exercício…" placeholderTextColor={Colors.textSecondary} multiline />

              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {EXERCISE_CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm((p) => ({ ...p, category: c }))} style={[styles.chip, form.category === c && styles.chipSelected]}>
                    <Text style={[styles.chipText, form.category === c && styles.chipTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Músculos alvo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {TARGET_MUSCLES.map((m) => {
                  const on = form.musculos_alvo.includes(m);
                  return (
                    <TouchableOpacity key={m} onPress={() => setForm((p) => ({ ...p, musculos_alvo: on ? p.musculos_alvo.filter((x) => x !== m) : [...p.musculos_alvo, m] }))} style={[styles.chip, on && styles.chipSelected]}>
                      <Text style={[styles.chipText, on && styles.chipTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>URL da Animação (gif/vídeo)</Text>
              <TextInput style={styles.input} value={form.animacao_url} onChangeText={(t) => setForm((p) => ({ ...p, animacao_url: t }))} placeholder="https://…" placeholderTextColor={Colors.textSecondary} autoCapitalize="none" />
            </ScrollView>

            <TouchableOpacity onPress={saveExercise} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{editingId ? 'Guardar alterações' : 'Criar exercício'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal animação — APENAS O VÍDEO */}
      <Modal
        transparent
        animationType="fade"
        visible={isAnimVisible}
        onRequestClose={() => setIsAnimVisible(false)}
        hardwareAccelerated
      >
        <View style={styles.modalOverlay}>
          <View style={styles.playerOnlyBox}>
            {(() => {
              const media = detectMedia(animUrl);
              if (!animUrl) return <Text style={{ color: '#fff' }}>Sem animação disponível.</Text>;

              // YouTube
              if (media.type === 'youtube' && (media.youtubeId || media.src)) {
                return (
                  <YoutubePlayer
                    height={VIDEO_H}
                    width={VIDEO_W}
                    play
                    videoId={media.youtubeId}
                    webViewStyle={{ opacity: 0.9999 }}
                    initialPlayerParams={{
                      controls: true,
                      modestbranding: true,
                      rel: false,
                      fs: 1,
                      playsinline: true,
                      iv_load_policy: 3,
                    }}
                  />
                );
              }
              // MP4
              if (media.type === 'mp4' && media.src) {
                return (
                  <WebView
                    style={{ width: VIDEO_W, height: VIDEO_H, backgroundColor: '#000' }}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsFullscreenVideo
                    originWhitelist={['*']}
                    source={{ html: `<video src="${media.src}" autoplay loop controls playsinline style="max-width:100%;max-height:100%;object-fit:contain;"></video>` }}
                  />
                );
              }
              // GIF
              if (media.type === 'gif' && media.src) {
                return (
                  <WebView
                    style={{ width: VIDEO_W, height: VIDEO_H, backgroundColor: '#000' }}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    source={{ html: `<img src="${media.src}" style="max-width:100%;max-height:100%;object-fit:contain;" />` }}
                  />
                );
              }
              // Vimeo/Drive/URL/EXT
              if (['vimeo','drive','url','ext'].includes(media.type) && media.src) {
                return (
                  <WebView
                    style={{ width: VIDEO_W, height: VIDEO_H, backgroundColor: '#000' }}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsFullscreenVideo
                    originWhitelist={['*']}
                    source={{ uri: media.src }}
                  />
                );
              }

              return <View />;
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =================== Styles =================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 10, color: Colors.textPrimary },

  searchBar: {
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  searchInput: { flex: 1, color: Colors.textPrimary },

  filtersRow: { paddingHorizontal: 16, paddingBottom: 6, alignItems: 'center', gap: 8, flexDirection: 'row', flexWrap: 'wrap' },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: '#FFF',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  filterBtnText: { color: Colors.primary, fontWeight: '700' },
  badge: { marginLeft: 2, minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  seedBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.divider, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF' },
  seedText: { color: Colors.primary, fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.cardBackground, borderRadius: RADIUS, padding: 14, marginBottom: GAP,
    borderLeftWidth: 5, borderLeftColor: Colors.secondary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, flex: 1, paddingRight: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F7F8FA', borderWidth: 1, borderColor: Colors.divider },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  metaRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  pillText: { marginLeft: 2, color: Colors.textPrimary, fontSize: 12, fontWeight: '600' },

  tag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  tagText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  cardSubtitle: { marginTop: 10, color: Colors.textSecondary, lineHeight: 20 },

  errorBox: { margin: 16, padding: 14, backgroundColor: '#FFE8E8', borderWidth: 1, borderColor: '#FFCDCD', borderRadius: 12 },
  errorText: { color: Colors.danger },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 24, margin: 16, backgroundColor: Colors.cardBackground, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider },
  emptyText: { marginTop: 10, color: Colors.textSecondary },

  modalOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  filterCard: { width: '92%', backgroundColor: Colors.cardBackground, borderRadius: RADIUS, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  filterActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  clearBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: Colors.divider },
  clearText: { color: Colors.primary, fontWeight: '700' },
  applyBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, backgroundColor: Colors.primary },
  applyText: { color: '#FFF', fontWeight: '700' },

  selectRow: {
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBackground,
    marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  selectRowSelected: { backgroundColor: '#EAF3FF', borderColor: '#CFE3FF' },
  selectRowText: { color: Colors.textPrimary, fontWeight: '600' },
  selectRowTextSelected: { color: Colors.info, fontWeight: '700' },

  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  modalCard: { width: '92%', backgroundColor: Colors.cardBackground, borderRadius: RADIUS, padding: 16 },
  label: { color: Colors.textPrimary, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: Colors.cardBackground, color: Colors.textPrimary,
  },
  chip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.cardBackground,
  },
  chipSelected: { backgroundColor: Colors.info, borderColor: Colors.info },
  chipText: { color: Colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: Colors.cardBackground },

  saveBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  /* Apenas vídeo no modal */
  playerOnlyBox: { width: VIDEO_W, height: VIDEO_H, backgroundColor: '#000' },

  /* (Estilos antigos do card/botões do modal ficaram sem uso,
     podes remover se quiseres: animCard, closeAnimBtn, closeAnimText) */
});
