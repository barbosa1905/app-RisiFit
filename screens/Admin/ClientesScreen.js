// screens/Admin/ClientesScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
  Linking,
  Modal,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  getCountFromServer,
  updateDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import { db } from '../../services/firebaseConfig';
import AppHeader from '../../components/AppHeader';

/* ===== Helpers ===== */
const sanitizePhone = (raw) => (raw || '').toString().replace(/[^\d+]/g, '');
const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (first + last).toUpperCase();
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ===== Pequeno wrapper para scale na pressão ===== */
const PressableScale = ({ onPress, children, style, disabled, scaleTo = 0.98 }) => {
  const anim = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.timing(anim, { toValue: scaleTo, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(anim, { toValue: 1, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  return (
    <Pressable
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      android_ripple={{ color: `${Colors.secondary}18` }}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>{children}</Animated.View>
    </Pressable>
  );
};

export default function ClientesScreen({ navigation }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // contagem real de treinos: { [userId]: number }
  const [treinosCount, setTreinosCount] = useState({});
  const [countLoading, setCountLoading] = useState(false);

  // modal “gerir cliente”
  const [manageVisible, setManageVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // filtro por estado
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'paused'

  /* ---- debounce pesquisa ---- */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch((search || '').trim().toLowerCase()), 220);
    return () => clearTimeout(t);
  }, [search]);

  /* ---- carregar clientes ---- */
  const carregarClientes = useCallback(async () => {
    try {
      !refreshing && setLoading(true);

      const qRef = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(qRef);

      const lista = snapshot.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || data.nome || '',
          email: data.email || '',
          grupo: data.grupo || '',
          telefoneCompleto: data.telefoneCompleto || data.telefone || '',
          ativo: data.ativo !== false, // default ativo quando ausente
          totalTreinos: typeof data.totalTreinos === 'number' ? data.totalTreinos : null, // fallback visual
        };
      });

      lista.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setClientes(lista);

      // limpar contadores órfãos
      setTreinosCount((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (!lista.find((c) => c.id === id)) delete next[id];
        });
        return next;
      });

      await carregarContagemTreinos(lista);
    } catch (e) {
      console.error('Erro ao carregar clientes:', e);
      Alert.alert('Erro', 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  const carregarContagemTreinos = useCallback(async (lista) => {
    try {
      setCountLoading(true);
      const batchSize = 8;
      for (let i = 0; i < lista.length; i += batchSize) {
        const slice = lista.slice(i, i + batchSize);
        const results = await Promise.all(
          slice.map(async (c) => {
            try {
              const colRef = collection(db, 'users', c.id, 'treinos');
              const snap = await getCountFromServer(colRef);
              return { id: c.id, count: snap.data().count || 0 };
            } catch {
              return { id: c.id, count: typeof c.totalTreinos === 'number' ? c.totalTreinos : 0 };
            }
          })
        );
        setTreinosCount((prev) => {
          const next = { ...prev };
          results.forEach(({ id, count }) => (next[id] = count));
          return next;
        });
        if (i + batchSize < lista.length) await sleep(60);
      }
    } finally {
      setCountLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarClientes();
  }, [carregarClientes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarClientes();
  }, [carregarClientes]);

  /* ---- Estatísticas + filtros ---- */
  const stats = useMemo(() => {
    const total = clientes.length;
    const active = clientes.filter((c) => c.ativo !== false).length;
    const paused = total - active;
    return { total, active, paused };
  }, [clientes]);

  const filtrados = useMemo(() => {
    let base = clientes;
    if (statusFilter === 'active') base = base.filter((c) => c.ativo !== false);
    if (statusFilter === 'paused') base = base.filter((c) => c.ativo === false);

    if (!debouncedSearch) return base;
    return base.filter((c) => {
      const nome = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const grupo = (c.grupo || '').toLowerCase();
      return nome.includes(debouncedSearch) || email.includes(debouncedSearch) || grupo.includes(debouncedSearch);
    });
  }, [clientes, debouncedSearch, statusFilter]);

  /* ---- Ações ---- */
  const openWhatsApp = async (phoneRaw) => {
    const phone = sanitizePhone(phoneRaw);
    if (!phone) return Alert.alert('WhatsApp', 'Sem número de telefone.');
    const urlApp = `whatsapp://send?phone=${phone}`;
    const urlWeb = `https://wa.me/${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(urlApp);
      await Linking.openURL(canOpen ? urlApp : urlWeb);
    } catch {
      Alert.alert('WhatsApp', 'Não foi possível abrir o WhatsApp.');
    }
  };

  // Modal
  const openManageClient = (client) => {
    setSelectedClient(client);
    setConfirmDelete('');
    setManageVisible(true);
  };
  const closeManageClient = () => {
    if (actionLoading) return;
    setManageVisible(false);
    setSelectedClient(null);
    setConfirmDelete('');
  };

  const handlePauseClient = async () => {
    if (!selectedClient) return;
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'users', selectedClient.id), { ativo: false });
      setClientes((prev) => prev.map((c) => (c.id === selectedClient.id ? { ...c, ativo: false } : c)));
      closeManageClient();
    } catch (e) {
      console.error('Erro ao colocar em pausa:', e);
      Alert.alert('Erro', 'Não foi possível colocar o cliente em pausa.');
      setActionLoading(false);
    }
  };

  const handleResumeClient = async () => {
    if (!selectedClient) return;
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'users', selectedClient.id), { ativo: true });
      setClientes((prev) => prev.map((c) => (c.id === selectedClient.id ? { ...c, ativo: true } : c)));
      closeManageClient();
    } catch (e) {
      console.error('Erro ao retomar cliente:', e);
      Alert.alert('Erro', 'Não foi possível retomar o cliente.');
      setActionLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (confirmDelete.trim().toUpperCase() !== 'REMOVER') {
      return Alert.alert('Confirmação', 'Escreve REMOVER para confirmar.');
    }
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'users', selectedClient.id));
      setClientes((prev) => prev.filter((c) => c.id !== selectedClient.id));
      setTreinosCount((prev) => {
        const next = { ...prev };
        delete next[selectedClient.id];
        return next;
      });
      closeManageClient();
    } catch (e) {
      console.error('Erro ao remover cliente:', e);
      Alert.alert('Erro', 'Não foi possível remover o cliente.');
      setActionLoading(false);
    }
  };

  /* ---- Render item ---- */
  const renderCliente = ({ item }) => {
    const nome = item.name || '—';
    const email = item.email || 'sem email';
    const grupo = item.grupo || '—';
    const isActive = !!item.ativo;
    const count = treinosCount[item.id];
    const showSpinner = typeof count !== 'number' && countLoading;

    return (
      <PressableScale onPress={() => openManageClient(item)} style={styles.card}>
        {/* topo: avatar + identificação + ação rápida */}
        <View style={styles.topRow}>
          <LinearGradient
            colors={isActive ? [Colors.secondary, Colors.primary] : ['#AAB1B7', '#7A8289']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarRing}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(nome)}</Text>
            </View>
          </LinearGradient>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.nome} numberOfLines={1}>{nome}</Text>
            <Text style={styles.email} numberOfLines={1}>{email}</Text>
          </View>

          <TouchableOpacity style={styles.whatsBtn} onPress={() => openWhatsApp(item.telefoneCompleto)}>
            <Ionicons name="logo-whatsapp" size={18} color={Colors.onSecondary} />
          </TouchableOpacity>
        </View>

        {/* chips: grupo + treinos + estado */}
        <View style={styles.chipsRow}>
          <View style={styles.chipStrong}>
            <Ionicons name="people-outline" size={14} color={Colors.onSecondary} />
            <Text style={styles.chipStrongText}>{grupo}</Text>
          </View>

          <View style={styles.chipLight}>
            <Ionicons name="barbell-outline" size={14} color={Colors.secondary} />
            {showSpinner ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.chipLightText}>
                {typeof count === 'number' ? count : (typeof item.totalTreinos === 'number' ? item.totalTreinos : 0)} treinos
              </Text>
            )}
          </View>

          {!isActive && (
            <View style={styles.chipPaused}>
              <Ionicons name="pause-circle" size={14} color={Colors.onSecondary} />
              <Text style={styles.chipPausedText}>Em pausa</Text>
            </View>
          )}
        </View>

        {/* ações */}
       <View style={styles.actionsRow}>
  <TouchableOpacity
    style={styles.iconBtnNeutral}
    onPress={() =>
      navigation.navigate('FichaCliente', { clienteId: item.id, clientename: nome, email: item.email })
    }
    accessibilityLabel="Abrir ficha do cliente"
  >
    <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.iconBtnNeutral}
    onPress={() =>
      navigation.navigate('RespostasQuestionario', { clienteId: item.id, clienteNome: nome, email: item.email })
    }
    accessibilityLabel="Ver questionários"
  >
    <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.iconBtnPrimary}
    onPress={() =>
      navigation.navigate('TreinosCliente', { clienteId: item.id, clientename: nome, email: item.email })
    }
    accessibilityLabel="Ver treinos do cliente"
  >
    <Ionicons name="calendar-outline" size={20} color={Colors.onSecondary} />
  </TouchableOpacity>

  <TouchableOpacity
    style={styles.actionIconOnly}
    onPress={() => openManageClient(item)}
    accessibilityLabel="Mais ações"
  >
    <Ionicons name="ellipsis-vertical" size={18} color={Colors.textPrimary} />
  </TouchableOpacity>
</View>
      </PressableScale>
    );
  };

  /* ---- Modal de gestão ---- */
  const renderManageModal = () => {
    if (!selectedClient) return null;
    const nome = selectedClient.name || '—';
    const email = selectedClient.email || '—';
    const grupo = selectedClient.grupo || '—';
    const count = treinosCount[selectedClient.id] ?? selectedClient.totalTreinos ?? 0;
    const isActive = !!selectedClient.ativo;
    const deleteEnabled = confirmDelete.trim().toUpperCase() === 'REMOVER' && !actionLoading;

    return (
      <Modal visible={manageVisible} transparent animationType="fade" onRequestClose={closeManageClient}>
        <Pressable style={styles.backdrop} onPress={closeManageClient} />
        <View style={styles.sheet}>
          <LinearGradient
            colors={[Colors.primary, '#23313B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetHeader}
          >
            <View style={styles.warnIconWrap}>
              <Ionicons name="person" size={22} color={Colors.onSecondary} />
            </View>
            <Text style={styles.sheetTitle}>Gerir cliente</Text>
            <TouchableOpacity onPress={closeManageClient} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.onPrimary} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.sheetBody}>
            <View style={styles.clientRow}>
              <View style={styles.avatarLg}>
                <Text style={styles.avatarLgText}>{getInitials(nome)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.clientName}>{nome}</Text>
                <Text style={styles.clientEmail}>{email}</Text>
              </View>
            </View>

            <View style={styles.sheetChips}>
              <View style={styles.chipLight}>
                <Ionicons name="people-outline" size={14} color={Colors.secondary} />
                <Text style={styles.chipLightText}>{grupo}</Text>
              </View>
              <View style={styles.chipLight}>
                <Ionicons name="barbell-outline" size={14} color={Colors.secondary} />
                <Text style={styles.chipLightText}>{count} treinos</Text>
              </View>
              {!isActive && (
                <View style={styles.chipPaused}>
                  <Ionicons name="pause-circle" size={14} color={Colors.onSecondary} />
                  <Text style={styles.chipPausedText}>Em pausa</Text>
                </View>
              )}
            </View>

            <View style={styles.optionBlock}>
              {isActive ? (
                <>
                  <Text style={styles.optionTitle}>Colocar em pausa?</Text>
                  <Text style={styles.optionDesc}>O cliente deixa de aparecer nas listagens e marcações, mantendo o histórico intacto.</Text>
                  <TouchableOpacity style={styles.pauseBtn} onPress={handlePauseClient} disabled={actionLoading}>
                    {actionLoading ? (
                      <ActivityIndicator color={Colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="pause-circle" size={18} color={Colors.primary} />
                        <Text style={[styles.pauseBtnText, { color: Colors.primary }]}>Colocar em pausa</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.optionTitle}>Retomar cliente?</Text>
                  <Text style={styles.optionDesc}>Volta a tornar este cliente ativo e visível nas listagens.</Text>
                  <TouchableOpacity style={styles.resumeBtn} onPress={handleResumeClient} disabled={actionLoading}>
                    {actionLoading ? (
                      <ActivityIndicator color={Colors.onSecondary} />
                    ) : (
                      <>
                        <Ionicons name="play-circle" size={18} color={Colors.onSecondary} />
                        <Text style={[styles.resumeBtnText, { color: Colors.onSecondary }]}>Retomar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={[styles.optionBlock, { marginTop: 14 }]}>
              <Text style={styles.optionTitleDanger}>Remover definitivamente</Text>
              <Text style={styles.optionDesc}>Esta ação é permanente. Para confirmar, escreve <Text style={{ fontWeight: '800' }}>REMOVER</Text>:</Text>

              <TextInput
                value={confirmDelete}
                onChangeText={setConfirmDelete}
                placeholder="Escreve REMOVER"
                placeholderTextColor={Colors.placeholder}
                style={styles.confirmInput}
                autoCapitalize="characters"
              />

              <TouchableOpacity
                style={[styles.deleteBtn, !deleteEnabled && styles.deleteBtnDisabled]}
                onPress={handleDeleteClient}
                disabled={!deleteEnabled}
              >
                {actionLoading ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={Colors.onPrimary} />
                    <Text style={styles.deleteBtnText}>Remover cliente</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={closeManageClient} disabled={actionLoading}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  /* ---- Header com pesquisa + stats + filtros ---- */
  const ListHeader = () => (
    <View>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Pesquisar por nome, email ou grupo"
            placeholderTextColor={Colors.placeholder}
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CadastroCliente')} style={styles.addBtn}>
          <Ionicons name="person-add-outline" size={22} color={Colors.onSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{stats.active}</Text>
          <Text style={styles.statLabel}>Ativos</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statNum}>{stats.paused}</Text>
          <Text style={styles.statLabel}>Pausa</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {['all', 'active', 'paused'].map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setStatusFilter(k)}
            style={[styles.filterBtn, statusFilter === k && styles.filterBtnActive]}
          >
            <Text style={[styles.filterTxt, statusFilter === k && styles.filterTxtActive]}>
              {k === 'all' ? 'Todos' : k === 'active' ? 'Ativos' : 'Em pausa'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Clientes" />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>A carregar...</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(it) => it.id}
          renderItem={renderCliente}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={28} color={Colors.secondary} />
              </View>
              <Text style={styles.emptyTitle}>Sem clientes</Text>
              <Text style={styles.emptyText}>
                Toca no botão <Text style={{ fontWeight: '800' }}>adicionar</Text> para registar o teu primeiro cliente.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderManageModal()}
    </SafeAreaView>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  /* Pesquisa + adicionar */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, color: Colors.textPrimary },
  addBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center',
  },

  /* Estatísticas + filtros */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNum: { color: Colors.textPrimary, fontWeight: '900', fontSize: 16 },
  statLabel: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

iconBtnNeutral: {
  width: 40,
  height: 40,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.surface,
  borderWidth: 1,
  borderColor: Colors.divider,
},
iconBtnPrimary: {
  width: 40,
  height: 40,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: Colors.secondary,
},



  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  filterTxt: { color: Colors.textPrimary, fontWeight: '700' },
  filterTxtActive: { color: Colors.onSecondary, fontWeight: '900' },

  /* Lista / cards */
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    width: 48, height: 48, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.divider,
  },
  avatarText: { fontWeight: '900', color: Colors.textPrimary },
  nome: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  email: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  whatsBtn: {
    marginLeft: 12,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  chipStrong: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.secondary, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
  },
  chipStrongText: { color: Colors.onSecondary, fontWeight: '800' },
  chipLight: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.lightGray, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
  },
  chipLightText: { color: Colors.textPrimary, fontWeight: '700' },
  chipPaused: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2A3B47',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: Colors.secondary,
  },
  chipPausedText: { color: Colors.onPrimary, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionNeutral: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider },
  actionPrimary: { backgroundColor: Colors.secondary },
  actionTxt: { fontWeight: '800' },
  actionIconOnly: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  /* Empty */
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: `${Colors.secondary}22`,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary },
  emptyText: { marginTop: 6, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },

  /* Modal / Sheet */
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 12, right: 12, bottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.divider,
  },
  sheetHeader: {
    paddingHorizontal: 14, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  warnIconWrap: { position: 'absolute', left: 14, top: 10, bottom: 0, justifyContent: 'center' },
  sheetTitle: { color: Colors.onPrimary, fontWeight: '900', fontSize: 16 },
  closeBtn: { position: 'absolute', right: 10, top: 8, padding: 8 },

  sheetBody: { padding: 14 },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  avatarLg: {
    width: 52, height: 52, borderRadius: 999, backgroundColor: Colors.lightGray,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.divider,
  },
  avatarLgText: { fontWeight: '900', color: Colors.textPrimary, fontSize: 16 },
  clientName: { fontWeight: '900', color: Colors.textPrimary, fontSize: 18 },
  clientEmail: { color: Colors.textSecondary, marginTop: 3 },

  sheetChips: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },

  optionBlock: {
    marginTop: 10,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1, borderColor: Colors.divider,
    padding: 12,
  },
  optionTitle: { fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  optionTitleDanger: { fontWeight: '900', color: Colors.danger, marginBottom: 4 },
  optionDesc: { color: Colors.textSecondary, marginBottom: 10 },

  pauseBtn: {
    height: 44, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.surface,
  },
  pauseBtnText: { fontWeight: '800' },

  resumeBtn: {
    height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.secondary,
  },
  resumeBtnText: { fontWeight: '800' },

  confirmInput: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary,
    marginTop: 8, backgroundColor: Colors.surface,
  },
  deleteBtn: {
    marginTop: 10, height: 46, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    backgroundColor: Colors.danger,
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { color: Colors.onPrimary, fontWeight: '900' },
  cancelBtn: {
    marginTop: 10, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.lightGray,
  },
  cancelBtnText: { color: Colors.textPrimary, fontWeight: '800' },
});
