// screens/Admin/FichaClienteScreen.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';

/* ---------------- helpers seguros ---------------- */
const s = (v) => (typeof v === 'string' ? v : '');
const b = (v, def = false) => (typeof v === 'boolean' ? v : def);

/** Tenta transformar várias formas de data em Date */
const asDate = (v) => {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(v) || v.indexOf('T') >= 0) {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
    if (m) {
      const d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
};
const fmtDate = (v) => {
  const d = asDate(v);
  return d ? d.toLocaleDateString('pt-PT') : '—';
};

export default function FichaClienteScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // aceita nomes alternativos para evitar desencontros
  const { clienteId, clientId, clientName, clientename } = route.params || {};
  const id = clienteId || clientId || null;

  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    if (!id) {
      setCliente(null);
      setLoading(false);
      setError('ID do cliente não recebido.');
      return;
    }
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, 'users', id));
      if (!snap.exists()) {
        setCliente(null);
        setError('Cliente não encontrado.');
      } else {
        setCliente({ id: snap.id, ...snap.data() });
      }
    } catch (e) {
      console.error('[FichaCliente] load error', e);
      setError('Falha ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const nome =
    s(cliente?.nome) || s(cliente?.name) || s(clientName) || s(clientename) || 'Cliente';

  const email = s(cliente?.email);
  const telefone = s(cliente?.telefoneCompleto) || s(cliente?.telefone);
  const genero = s(cliente?.genero);
  const grupo = s(cliente?.grupo);
  const morada = s(cliente?.morada);
  const dataNasc = fmtDate(cliente?.dataNascimento);
  const criadoEm = fmtDate(cliente?.criadoEm);
  const role = s(cliente?.role);
  const enviarAcesso = b(cliente?.enviarAcesso);
  const bloqueado = b(cliente?.bloqueado);
  const notas = s(cliente?.observacoes) || s(cliente?.notas);

  // novo estado: ativo/inativo (default ativo)
  const ativo = b(cliente?.ativo, true);
  const statusLabel = ativo ? 'Ativo' : 'Inativo';

  const title = useMemo(() => `Ficha de ${nome}`.trim(), [nome]);

  const goToCreateChat = () => {
    navigation.navigate('CreateChat', {
      initialClientId: id,
      initialClientName: nome,
    });
  };
  const goToAgendarTreino = () => {
    navigation.navigate('CriarTreinos', { clientId: id, clientName: nome });
  };
  const goToCriarAvaliacao = () => {
    navigation.navigate('CriarAvaliacao', { clientId: id, clientName: nome });
  };

  const confirmToggleAtivo = (novoEstado) => {
    Alert.alert(
      novoEstado ? 'Reativar cliente?' : 'Marcar cliente como inativo?',
      novoEstado
        ? 'O cliente voltará a aparecer nas listas de agendamento e seleção.'
        : 'O cliente deixará de aparecer nas listas de agendamento/seleção.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: novoEstado ? 'Reativar' : 'Marcar Inativo', style: 'destructive', onPress: () => toggleAtivo(novoEstado) },
      ],
    );
  };

  const toggleAtivo = async (novoEstado) => {
    if (!id) return;
    try {
      const payload = {
        ativo: novoEstado,
        status: novoEstado ? 'active' : 'inactive',
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', id), payload, { merge: true });
      setCliente((c) => ({ ...(c || {}), ...payload }));
    } catch (e) {
      console.error('[FichaCliente] toggle ativo', e);
      Alert.alert('Erro', 'Não foi possível atualizar o estado do cliente.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Ficha do Cliente" showBackButton />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.muted}>A carregar…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Ficha do Cliente" showBackButton />
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} activeOpacity={0.85} style={styles.retryBtn}>
            <Ionicons name="refresh" size={18} color={Colors.onPrimary} />
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!cliente) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Ficha do Cliente" showBackButton />
        <View style={styles.center}><Text style={styles.muted}>Sem dados para apresentar.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader title={title} showBackButton />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho / nome */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nome.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{nome}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {!!grupo && <Text style={styles.chip}>{grupo}</Text>}
              <Text style={[styles.chip, { backgroundColor: ativo ? '#E8F5E9' : '#FFF3E0', borderColor: ativo ? '#A5D6A7' : '#FFCC80', color: ativo ? '#2E7D32' : '#E67E22' }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Dados principais */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados do Cliente</Text>

          <InfoRow icon="mail-outline" label="Email" value={email} />
          <InfoRow icon="call-outline" label="Telefone" value={telefone} />
          <InfoRow icon="male-female-outline" label="Género" value={genero} />
          <InfoRow icon="calendar-outline" label="Nascimento" value={dataNasc} />
          <InfoRow icon="calendar-number-outline" label="Criado em" value={criadoEm} />
          <InfoRow icon="home-outline" label="Morada" value={morada} />
          <InfoRow icon="id-card-outline" label="Papel" value={role || 'user'} />

          <BooleanRow icon="send-outline" label="Enviar Acesso" value={enviarAcesso} />
          <BooleanRow icon="close-circle-outline" label="Bloqueado" value={bloqueado} />

          {/* Estado: Ativo/Inativo */}
          <View style={[styles.row, { alignItems: 'center' }]}>
            <Ionicons name="power-outline" size={18} color={Colors.textSecondary} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Estado do Cliente</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.rowValue, { fontWeight: '800', color: ativo ? '#2E7D32' : '#E67E22' }]} numberOfLines={1}>
                {statusLabel}
              </Text>
              <Switch
                value={ativo}
                onValueChange={(v) => confirmToggleAtivo(v)}
                thumbColor={ativo ? Colors.primary : '#bbb'}
                trackColor={{ true: Colors.primary + '66', false: '#d9d9d9' }}
              />
            </View>
          </View>

          {!!notas && (
            <View style={styles.noteBox}>
              <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={styles.noteText}>{notas}</Text>
            </View>
          )}
        </View>

        {/* Ações rápidas (responsivas, sem texto a sair do botão) */}
        <View style={styles.actionsWrap}>
          <ActionBtn
            icon="chatbubbles-outline"
            label="Abrir Chat"
            onPress={goToCreateChat}
          />
          <ActionBtn
            icon="barbell-outline"
            label="Agendar Treino"
            onPress={goToAgendarTreino}
          />
          <ActionBtn
            icon={ativo ? 'pause-circle-outline' : 'play-circle-outline'}
            label={ativo ? 'Marcar Inativo' : 'Reativar Cliente'}
            onPress={() => confirmToggleAtivo(!ativo)}
            variant="secondary"
          />
          <ActionBtn
            icon="clipboard-outline"
            label="Criar Avaliação"
            onPress={goToCriarAvaliacao}
          />
        </View>

        <Text style={styles.helperNote}>
          Nota: clientes inativos não devem aparecer nas listas/agenda. Nas queries usa <Text style={{ fontWeight: '800' }}>where('ativo','==', true)</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* --------- sub-componentes --------- */
function InfoRow({ icon, label, value }) {
  const display = value ? String(value) : '—';
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.rowIcon} />
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{display}</Text>
    </View>
  );
}
function BooleanRow({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={Colors.textSecondary} style={styles.rowIcon} />
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.boolPill}>
        <View style={[styles.boolDot, { backgroundColor: value ? '#2E7D32' : '#C62828' }]} />
        <Text style={[styles.boolText, { color: value ? '#2E7D32' : '#C62828' }]}>
          {value ? 'Sim' : 'Não'}
        </Text>
      </View>
    </View>
  );
}
function ActionBtn({ icon, label, onPress, variant = 'primary' }) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        isPrimary ? styles.actionPrimary : styles.actionSecondary,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Ionicons name={icon} size={18} color={isPrimary ? Colors.onPrimary : Colors.primary} />
      <Text
        style={[styles.actionText, { color: isPrimary ? Colors.onPrimary : Colors.primary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------------- styles ---------------- */
const AVATAR = 64;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  content: { padding: 16, paddingBottom: 28 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  muted: { color: Colors.textSecondary },
  error: { color: Colors.error, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, height: 44, paddingHorizontal: 16, borderRadius: 12,
  },
  retryText: { color: Colors.onPrimary, fontWeight: '800' },

  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.accent || Colors.onPrimary,
    marginRight: 12,
  },
  avatarText: { color: Colors.onPrimary, fontWeight: '800', fontSize: 28 },
  name: { color: Colors.textPrimary, fontWeight: '800', fontSize: 20 },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.divider,
    color: Colors.textSecondary,
    fontWeight: '700',
  },

  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { color: Colors.textPrimary, fontWeight: '800', fontSize: 16, marginBottom: 10 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  rowIcon: { marginRight: 8 },
  rowLabel: { color: Colors.textSecondary, width: 148, fontSize: 13, marginRight: 8 },
  rowValue: { color: Colors.textPrimary, fontWeight: '700', flex: 1 },

  boolPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  boolDot: { width: 8, height: 8, borderRadius: 4 },
  boolText: { fontWeight: '800' },

  noteBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.divider,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, color: Colors.textSecondary },

  /* Botões responsivos (não rebentam texto) */
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flexBasis: '48%', // 2 por linha
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionPrimary: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionSecondary: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionText: { fontWeight: '800' },

  helperNote: {
    marginTop: 10,
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
