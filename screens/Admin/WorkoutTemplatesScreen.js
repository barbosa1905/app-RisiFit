// screens/Admin/WorkoutTemplatesScreen.js
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../services/firebaseConfig';
import AppHeader from '../../components/AppHeader';

const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  onPrimary: '#FFFFFF',
  text: '#111827',
  subtext: '#6B7280',
  card: 'rgba(255,255,255,0.92)',
  divider: 'rgba(17,24,39,0.10)',
};

export default function WorkoutTemplatesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const colRef = collection(db, 'workoutTemplates');
    // 👇 Real-time e sem orderBy (evita campo/índice obrigatório)
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Ordenação robusta no cliente
        const norm = (v) => (v || '').toString().toLowerCase();
        rows.sort((a, b) => norm(a.name || a.nameLower).localeCompare(norm(b.name || b.nameLower)));
        setTemplates(rows);
        setLoading(false);
      },
      (err) => {
        console.error('Erro a carregar modelos:', err);
        setLoading(false);
        Alert.alert('Erro', 'Não foi possível carregar os modelos de treino.');
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return templates;
    return templates.filter((t) => (t.name || '').toLowerCase().includes(s));
  }, [templates, search]);

  const handleDelete = (id) => {
    Alert.alert('Apagar', 'Queres apagar este modelo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'workoutTemplates', id));
          } catch (e) {
            console.error(e);
            Alert.alert('Erro', 'Não foi possível apagar o modelo.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => navigation.navigate('CreateWorkoutTemplate', { templateId: item.id })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.98 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.name || 'Sem título'}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        {item.category ? (
          <View style={styles.pill}>
            <Ionicons name="pricetag-outline" size={12} />
            <Text style={styles.pillText}>{item.category}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => navigation.navigate('CreateWorkoutTemplate', { templateId: item.id })}
          style={styles.iconBtn}
        >
          <Ionicons name="create-outline" size={20} color={Colors.primary} />
        </Pressable>
        <Pressable onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color="#E53935" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header global */}
      <AppHeader
        title="Modelos de Treino"
        subtitle=""
        showBackButton
        onBackPress={() => navigation.goBack()}
        showMenu={false}
        showBell={false}
        statusBarStyle="light-content"
      />

      {/* Pesquisa + Novo */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.subtext} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar modelo..."
          placeholderTextColor={Colors.subtext}
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => navigation.navigate('CreateWorkoutTemplate')}
          style={styles.addBtn}
        >
          <Ionicons name="add-circle" size={22} color={Colors.primary} />
          <Text style={styles.addBtnText}>Novo</Text>
        </Pressable>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Text style={{ color: Colors.subtext }}>Nenhum modelo encontrado.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 4 },
  addBtnText: { color: Colors.primary, fontWeight: '800' },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginHorizontal: 16,
  },
  name: { fontSize: 16, fontWeight: '900', color: Colors.text },
  desc: { fontSize: 13, color: Colors.subtext, marginTop: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.06)', borderWidth: 1, borderColor: Colors.divider,
    marginTop: 8,
  },
  pillText: { color: Colors.text, fontWeight: '700', fontSize: 12 },
  actions: { flexDirection: 'row', marginLeft: 10 },
  iconBtn: { padding: 6, marginLeft: 4, borderRadius: 10, backgroundColor: 'rgba(17,24,39,0.04)' },
});
