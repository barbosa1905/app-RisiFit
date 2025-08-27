import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import 'moment/locale/pt';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
moment.locale('pt');

function toMoment(v) {
  if (!v) return moment.invalid();
  if (v?.toDate) return moment(v.toDate());
  if (v instanceof Date) return moment(v);
  if (typeof v === 'string') return moment(v, ['YYYY-MM-DD', moment.ISO_8601], true).isValid()
    ? moment(v)
    : moment(v);
  return moment(v);
}

export default function TreinosDoClienteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const p = route?.params ?? {};

  const clienteId =
    p.clienteId || p.clientId || p.idCliente || p.userId || p.id || p?.cliente?.id;
  const clientName =
    p.clientename || p.clienteNome || p.name || p.nome || p?.cliente?.name || 'Cliente';

  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState([]);
  const [filtro, setFiltro] = useState('Todos'); // Todos | Futuro | Completo | NaoConcluido
  const [paramError, setParamError] = useState(null);

  useEffect(() => {
    if (!clienteId) {
      setParamError('Não foi possível identificar o cliente.');
      setLoading(false);
    }
  }, [clienteId]);

  const carregarTreinos = useCallback(() => {
    if (!clienteId) return () => {};
    setLoading(true);
    const ref = collection(db, 'users', clienteId, 'treinos');
    const q = query(ref, orderBy('data', 'asc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const hoje = moment().startOf('day');
        const list = snap.docs.map((d) => {
          const data = d.data() || {};
          const dataMoment = toMoment(data.data);
          let status = 'Desconhecido';
          if (dataMoment.isValid()) {
            if (dataMoment.isAfter(hoje)) status = 'Futuro';
            else status = data?.concluido ? 'Completo' : 'NaoConcluido';
          }
          return {
            id: d.id,
            nome: data?.nome || data?.name || 'Treino',
            categoria: data?.categoria || '—',
            descricao: data?.descricao || data?.description || '',
            concluido: !!data?.concluido,
            dataMoment,
            status,
          };
        });
        setTreinos(list);
        setLoading(false);
      },
      (e) => {
        console.error('Erro ao buscar treinos:', e);
        Alert.alert('Erro', 'Não foi possível carregar os treinos.');
        setLoading(false);
      }
    );
    return unsub;
  }, [clienteId]);

  useEffect(() => {
    const unsub = carregarTreinos();
    return () => unsub && unsub();
  }, [carregarTreinos]);

  const treinosFiltrados = useMemo(() => {
    if (filtro === 'Todos') return treinos;
    return treinos.filter((t) => t.status === filtro);
  }, [treinos, filtro]);

  async function toggleConcluido(t) {
    try {
      await updateDoc(doc(db, 'users', clienteId, 'treinos', t.id), {
        concluido: !t.concluido,
      });
    } catch (e) {
      console.error('Erro ao atualizar treino:', e);
      Alert.alert('Erro', 'Não foi possível atualizar o estado do treino.');
    }
  }

  async function removerTreino(t) {
    Alert.alert('Remover Treino', `Apagar "${t.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', clienteId, 'treinos', t.id));
          } catch (e) {
            console.error('Erro ao apagar treino:', e);
            Alert.alert('Erro', 'Não foi possível apagar o treino.');
          }
        },
      },
    ]);
  }

  const StatusChip = ({ color, icon, text }) => (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.chipTxt}>{text}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isFuture = item.status === 'Futuro';
    const isCompleted = item.status === 'Completo';
    const isNotCompleted = item.status === 'NaoConcluido';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>{item.nome}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isFuture && (
              <StatusChip color={Colors.info} icon="hourglass-outline" text="Futuro" />
            )}
            {isCompleted && (
              <StatusChip color={Colors.success} icon="checkmark-circle-outline" text="Concluído" />
            )}
            {isNotCompleted && (
              <StatusChip color={Colors.danger} icon="close-circle-outline" text="Não concluído" />
            )}
          </View>
        </View>

        <View style={styles.row}>
          <Ionicons name="fitness-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.rowTxt}>Categoria: {item.categoria}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.rowTxt}>
            {item.dataMoment?.isValid() ? item.dataMoment.format('DD/MM/YYYY') : '—'}
          </Text>
        </View>
        {!!item.descricao && (
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
            <Text style={[styles.rowTxt, { flex: 1 }]}>{item.descricao}</Text>
          </View>
        )}

        <View style={styles.actions}>
          {isCompleted && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: Colors.secondary }]}
              onPress={() =>
                navigation.navigate('DetalhesTreinoConcluidoScreen', { treino: item })
              }
            >
              <Ionicons name="eye-outline" size={18} color={Colors.onSecondary} />
              <Text style={[styles.btnTxt, { color: Colors.onSecondary }]}>Ver detalhes</Text>
            </TouchableOpacity>
          )}

          {isFuture && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.info }]}
                onPress={() =>
                  navigation.navigate('EditarTreino', {
                    treinoId: item.id,
                    clienteId,
                  })
                }
              >
                <Ionicons name="pencil-outline" size={18} color="#fff" />
                <Text style={styles.btnTxt}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: Colors.danger }]}
                onPress={() => removerTreino(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.btnTxt}>Remover</Text>
              </TouchableOpacity>
            </>
          )}

          {isNotCompleted && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: Colors.success }]}
              onPress={() => toggleConcluido(item)}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <Text style={styles.btnTxt}>Marcar concluído</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const FilterChip = ({ value, label }) => {
    const active = filtro === value;
    return (
      <TouchableOpacity
        onPress={() => setFiltro(value)}
        style={[styles.filterChip, active && styles.filterChipActive]}
      >
        <Text style={[styles.filterTxt, active && styles.filterTxtActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={`Treinos de ${clientName}`} />

      {paramError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.danger} />
          <Text style={{ color: Colors.textPrimary, marginTop: 8 }}>{paramError}</Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: Colors.primary, marginTop: 12 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={18} color={Colors.onPrimary} />
            <Text style={[styles.btnTxt, { color: Colors.onPrimary }]}>Voltar</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={treinosFiltrados}
          keyExtractor={(it, i) => (it?.id ? String(it.id) : `k${i}`)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Filtrar por estado</Text>
              <View style={styles.filterRow}>
                <FilterChip value="Todos" label="Todos" />
                <FilterChip value="Futuro" label="Futuros" />
                <FilterChip value="Completo" label="Concluídos" />
                <FilterChip value="NaoConcluido" label="Não concluídos" />
              </View>
              {treinosFiltrados.length === 0 && (
                <View style={styles.empty}>
                  <Ionicons name="barbell-outline" size={40} color={Colors.textSecondary} />
                  <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
                    Nenhum treino para este filtro.
                  </Text>
                </View>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  filterCard: {
    margin: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  filterTitle: { color: Colors.textPrimary, fontWeight: '800', marginBottom: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.secondary },
  filterTxt: { color: Colors.textPrimary, fontWeight: '700' },
  filterTxtActive: { color: Colors.onSecondary },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', flex: 1, marginRight: 8 },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rowTxt: { color: Colors.textSecondary, fontSize: 14 },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnTxt: { color: '#fff', fontWeight: '800' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
});
