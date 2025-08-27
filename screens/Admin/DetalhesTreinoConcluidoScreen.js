import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import AppHeader from '../../components/AppHeader';
import { db } from '../../services/firebaseConfig';
import {
  doc, getDoc, collectionGroup, query, where, getDocs, documentId,
} from 'firebase/firestore';

const SHADOW = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  android: { elevation: 3 },
});

const pad2 = (n) => String(n).padStart(2, '0');
const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isTimestampLike = (v) => v && (typeof v?.toDate === 'function' || (v?.seconds && typeof v.seconds === 'number'));

const toDateSafe = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'number') return new Date(v);
  return null;
};

const fmtDateTime = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${dd}/${mm} • ${hh}:${mi}`;
};

const coerceNumber = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

const fmtDuration = (v) => {
  const n = coerceNumber(v);
  if (n == null) return '—';
  // Se vier em segundos, mostra h:m:s; se vier em minutos (n pequeno), mostra "n min"
  if (n > 3600) {
    const h = Math.floor(n / 3600);
    const m = Math.floor((n % 3600) / 60);
    const s = Math.floor(n % 60);
    const out = [];
    if (h) out.push(`${h}h`);
    if (m || (!h && s)) out.push(`${pad2(m)}m`);
    if (s || (!h && !m)) out.push(`${pad2(s)}s`);
    return out.join(' ');
  }
  return `${n} min`;
};

const Stars = ({ value = 0 }) => {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons
          key={i}
          name={i <= v ? 'star' : 'star-outline'}
          size={18}
          color={Colors.secondary}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
};

const Field = ({ icon, label, value, pill = false, color = Colors.textSecondary }) => {
  if (value == null || value === '') return null;
  return (
    <View style={[styles.fieldRow, pill && styles.fieldRowPill]}>
      {icon ? <Ionicons name={icon} size={16} color={pill ? Colors.onSecondary : color} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.fieldTxt, pill && styles.fieldTxtPill]}>
        {label ? <Text style={styles.fieldLabel}>{label}: </Text> : null}
        {String(value)}
      </Text>
    </View>
  );
};

/* ----------------- helpers deep & normalização ----------------- */

const deepFindByKeys = (root, keys = [], seen = new Set()) => {
  if (!root || typeof root !== 'object') return null;
  if (seen.has(root)) return null;
  seen.add(root);
  for (const k of Object.keys(root)) if (keys.includes(k)) return root[k];
  for (const v of Object.values(root)) {
    if (isPlainObject(v) || Array.isArray(v)) {
      const r = deepFindByKeys(v, keys, seen);
      if (r != null) return r;
    }
  }
  return null;
};

const normalizeExercise = (ex) => {
  const name = ex?.exerciseName || ex?.nome || ex?.name || 'Exercício';
  const notes = ex?.notes || ex?.notas || '';
  const rest  = ex?.rest || ex?.descanso || null;
  const category = ex?.category || ex?.categoria || '';

  // quando vem em ex.setDetails (o teu caso)
  if (Array.isArray(ex?.setDetails)) {
    const sets = ex.setDetails.map((sd) => ({
      type: sd?.seriesType || sd?.type || null,
      reps: sd?.reps ?? '',
      peso: sd?.peso ?? '',
      tempo: sd?.tempo ?? '',
      inclinacao: sd?.inclinacao ?? '',
      cadencia: sd?.cadencia ?? '',
      ritmo: sd?.ritmo ?? '',
      distancia: sd?.distancia ?? '',
      descanso: sd?.descanso ?? '',
      notas: sd?.notas ?? '',
    }));
    return { exerciseName: name, notes, rest, category, sets };
  }

  // quando já vem em ex.sets[]
  if (Array.isArray(ex?.sets)) {
    return { exerciseName: name, notes, rest, category, sets: ex.sets };
  }

  // formato simples
  return {
    exerciseName: name,
    notes,
    rest,
    category,
    sets: null,
    type: ex?.type || null,
    repsOrDuration: ex?.repsOrDuration ?? ex?.reps ?? ex?.tempo ?? null,
  };
};

const deepFindExercises = (root) => {
  if (!root || typeof root !== 'object') return [];
  // diretos
  const direct = deepFindByKeys(root, ['exercicios','exercises']);
  if (Array.isArray(direct)) return direct.map(normalizeExercise);

  // template/custom
  const t = deepFindByKeys(root, ['templateExercises']);
  const c = deepFindByKeys(root, ['customExercises']);
  const bag = [];
  if (Array.isArray(t)) bag.push(...t.map(normalizeExercise));
  if (Array.isArray(c)) bag.push(...c.map(normalizeExercise));
  if (bag.length) return bag;

  // varrer árvore à procura de arrays com cara de exercícios
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    if (Array.isArray(cur) && cur.some(it => isPlainObject(it) && (it.exerciseName || it.nome || it.name || it.setDetails || it.sets || it.type))) {
      return cur.map(normalizeExercise);
    }
    for (const v of Object.values(cur)) {
      if (isPlainObject(v) || Array.isArray(v)) stack.push(v);
    }
  }
  return [];
};

const deepFindDate = (root) => {
  const val = deepFindByKeys(root, ['dataConclusao','completedAt','dataFinal']);
  if (val) {
    if (isTimestampLike(val)) return toDateSafe(val);
    const d = toDateSafe(val);
    if (d) return d;
  }
  // fallback: varrer
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    for (const v of Object.values(cur)) {
      if (isTimestampLike(v)) {
        const d = toDateSafe(v);
        if (d) return d;
      }
      if (isPlainObject(v) || Array.isArray(v)) stack.push(v);
    }
  }
  return null;
};

const deepFindDuration = (root) => {
  const keys = ['duracao','duration','totalSeconds','tempoTotalSegundos','tempoTotal','totalTime','minutos','minutes','duracaoMin'];
  const v = deepFindByKeys(root, keys);
  const n = coerceNumber(v);
  if (n != null) return n;
  // varrer
  const stack = [root];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);
    for (const [k, val] of Object.entries(cur)) {
      if (keys.includes(k)) {
        const nn = coerceNumber(val);
        if (nn != null) return nn;
      }
      if (isPlainObject(val) || Array.isArray(val)) stack.push(val);
    }
  }
  return null;
};

const deepFindClientName = (root) => {
  const v = deepFindByKeys(root, ['clientName','cliente','nomeCliente','nome','name']);
  return (typeof v === 'string' && v.trim()) ? v : null;
};
/* --------------------------------------------------------------- */

export default function DetalhesTreinoConcluidoScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const treinoParam =
    route.params?.treino ||
    route.params?.training ||
    route.params?.item ||
    route.params?.data ||
    route.params ||
    null;

  if (__DEV__) {
    try { console.log('[DEBUG Detalhes] params =>', JSON.stringify(route.params ?? {}, null, 2)); } catch {}
  }

  // 1) Base (o que veio na navegação)
  const base = useMemo(() => {
    if (!treinoParam) return null;

    const raw = treinoParam.raw || treinoParam || {};
    const id = treinoParam.id || raw.id || route.params?.docId || null;

    const nomeTreino =
      treinoParam.nomeTreino ||
      treinoParam.name ||
      treinoParam.nome ||
      raw.nomeTreino ||
      raw.name ||
      'Treino';

    const dataConclusao =
      toDateSafe(treinoParam.dataConclusao) || deepFindDate(raw);

    const avaliacao =
      treinoParam.avaliacao ?? raw.avaliacao ?? raw.rating ?? 0;

    const duracao =
      treinoParam.duracao ?? treinoParam.duration ?? deepFindDuration(raw);

    const observacoesUser =
      treinoParam.observacoesUser ?? raw.observacoesUser ?? raw.observacoes ?? '';

    const exercicios = deepFindExercises(raw);

    const clientName =
      treinoParam.clientName || deepFindClientName(raw) || null;

    const userId = raw.userId || raw.uid || raw.clienteId || route.params?.userId || route.params?.clientId || null;

    return {
      id,
      nomeTreino,
      dataConclusao,
      avaliacao,
      duracao,
      observacoesUser,
      exercicios,
      clientName,
      userId,
      _raw: raw,
    };
  }, [treinoParam]);

  // estado visível
  const [details, setDetails] = useState(base);
  const [clientName, setClientName] = useState(base?.clientName || 'Cliente');
  const [loading, setLoading] = useState(false);

  // 2) Se o que veio for "resumo", tenta hidratar do Firestore.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!base) return;

      const hasExercises = Array.isArray(base.exercicios) && base.exercicios.length > 0;
      const hasDuration = base.duracao != null;

      if (hasExercises && hasDuration) {
        setDetails(base);
        return;
      }

      setLoading(true);

      const mergeAndSet = (d) => {
        const raw = d.raw || d;
        const merged = {
          ...base,
          nomeTreino: base.nomeTreino || d.nomeTreino || d.name || raw.nomeTreino || raw.name || 'Treino',
          dataConclusao: base.dataConclusao || toDateSafe(d.dataConclusao) || deepFindDate(raw),
          avaliacao: base.avaliacao ?? d.avaliacao ?? raw.avaliacao ?? 0,
          duracao: base.duracao ?? d.duracao ?? deepFindDuration(raw),
          observacoesUser: base.observacoesUser || d.observacoesUser || raw.observacoesUser || '',
          exercicios: hasExercises ? base.exercicios : deepFindExercises(raw),
        };
        if (alive) setDetails(merged);
      };

      try {
        // 2a) caminho direto se tivermos userId + id
        if (base.userId && base.id) {
          const names = ['completedWorkouts', 'treinosConcluidos', 'workoutsHistory', 'completedTrainings'];
          for (const col of names) {
            try {
              const snap = await getDoc(doc(db, 'users', base.userId, col, base.id));
              if (snap.exists()) { mergeAndSet(snap.data()); setLoading(false); return; }
            } catch {}
          }
        }

        // 2b) sem userId → collectionGroup por docId
        if (base.id) {
          const groups = ['completedWorkouts', 'treinosConcluidos', 'workoutsHistory', 'completedTrainings'];
          for (const g of groups) {
            try {
              const q = query(collectionGroup(db, g), where(documentId(), '==', base.id));
              const qs = await getDocs(q);
              if (!qs.empty) { mergeAndSet(qs.docs[0].data()); setLoading(false); return; }
            } catch {}
          }
        }

      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [base]);

  // 3) Buscar nome do cliente por userId se necessário
  useEffect(() => {
    let ok = true;
    (async () => {
      if (!details) return;
      if (details.clientName && details.clientName.trim() !== '') return;
      if (!details.userId) return;
      try {
        const ref = doc(db, 'users', details.userId);
        const snap = await getDoc(ref);
        if (ok && snap.exists()) {
          const d = snap.data() || {};
          const n = d.name || d.nome || 'Cliente';
          setClientName(n);
        }
      } catch {}
    })();
    return () => { ok = false; };
  }, [details]);

  if (!details) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTxt}>Treino não encontrado.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryTxt}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { nomeTreino, dataConclusao, avaliacao, duracao, observacoesUser, exercicios } = details;

  return (
    <View style={styles.safe}>
      <AppHeader
        title="Treino Concluído"
        rightContent={
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="close" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {(__DEV__) && (
          <View style={[styles.card, SHADOW, { borderColor: '#FFD54F' }]}>
            <Text style={{ color: Colors.textSecondary, marginBottom: 6, fontWeight: '700' }}>DEBUG</Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
              id: {details.id ?? '—'} • userId: {details.userId ?? '—'}
            </Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
              exercícios: {Array.isArray(exercicios) ? exercicios.length : 0} • duração: {duracao ?? '—'}
            </Text>
          </View>
        )}

        {/* resumo */}
        <View style={[styles.card, SHADOW]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Ionicons name="checkmark-done-circle" size={22} color={Colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.title} numberOfLines={2}>{nomeTreino}</Text>
            </View>
            <Stars value={avaliacao} />
          </View>

          <View style={styles.metaWrap}>
            <Field icon="person-outline" label="Cliente" value={clientName} />
            <Field icon="time-outline" label="Concluído" value={fmtDateTime(dataConclusao)} />
            <View style={styles.pillsRow}>
              <Field icon="timer-outline" label={null} value={fmtDuration(duracao)} pill />
            </View>
          </View>

          {observacoesUser ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>Observações do Cliente</Text>
              <Text style={styles.noteText}>{observacoesUser}</Text>
            </View>
          ) : null}
        </View>

        {/* loading/hidratação */}
        {loading ? (
          <View style={[styles.card, SHADOW, { alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>A carregar detalhes do treino…</Text>
          </View>
        ) : null}

        {/* exercícios */}
        <Text style={styles.sectionTitle}>Exercícios</Text>

        {!exercicios || exercicios.length === 0 ? (
          <View style={[styles.card, SHADOW]}>
            <View style={styles.emptyBlock}>
              <Ionicons name="barbell-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.emptyTxt}>Sem exercícios registados.</Text>
            </View>
          </View>
        ) : (
          exercicios.map((ex, idx) => {
            const labels = {
              reps: 'Reps',
              peso: 'Peso (kg)',
              tempo: 'Tempo',
              distancia: 'Distância',
              ritmo: 'Ritmo',
              descanso: 'Descanso',
              inclinacao: 'Inclinação',
              cadencia: 'Cadência',
              notas: 'Notas',
            };

            return (
              <View key={`${idx}-${ex.exerciseName}`} style={[styles.exerciseCard, SHADOW]}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle} numberOfLines={2}>{ex.exerciseName}</Text>
                  {ex.category ? (
                    <View style={styles.chip}>
                      <Ionicons name="pricetag-outline" size={14} color={Colors.onSecondary} />
                      <Text style={styles.chipTxt}>{ex.category}</Text>
                    </View>
                  ) : null}
                </View>

                {Array.isArray(ex.sets) ? (
                  <View style={styles.setGrid}>
                    {ex.sets.map((s, sIdx) => {
                      const fieldKeys = Object.keys(s || {}).filter((k) => !['id','type'].includes(k) && s[k] !== '');
                      return (
                        <View key={sIdx} style={styles.setItem}>
                          <View style={styles.setTitleRow}>
                            <Ionicons name="list-outline" size={16} color={Colors.primary} />
                            <Text style={styles.setTitle}>Série {sIdx + 1}</Text>
                            {s?.type ? (
                              <View style={[styles.pill, { marginLeft: 'auto' }]}>
                                <Ionicons name="construct-outline" size={12} color={Colors.onSecondary} />
                                <Text style={styles.pillTxt}>{String(s.type).replace(/_/g, ' ')}</Text>
                              </View>
                            ) : null}
                          </View>
                          {fieldKeys.length === 0 ? (
                            <Text style={styles.setEmpty}>—</Text>
                          ) : (
                            <View style={styles.setFieldsWrap}>
                              {fieldKeys.map((k) => (
                                <View key={k} style={styles.setField}>
                                  <Text style={styles.setFieldLabel}>{labels[k] || k}</Text>
                                  <Text style={styles.setFieldValue}>{String(s[k])}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.simpleWrap}>
                    <Field icon="analytics-outline" label="Tipo" value={ex.type ? String(ex.type).replace(/_/g, ' ') : '—'} />
                    <Field icon="barbell-outline" label="Medida" value={ex.repsOrDuration ?? '—'} />
                  </View>
                )}

                <View style={styles.metaFooter}>
                  {ex.rest ? <Field icon="hourglass-outline" label="Descanso" value={ex.rest} /> : null}
                  {ex.notes ? (
                    <View style={styles.exerciseNotes}>
                      <Text style={styles.exerciseNotesTitle}>Notas</Text>
                      <Text style={styles.exerciseNotesTxt}>{ex.notes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.onPrimary} />
            <Text style={styles.actionTxt}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  errorTxt: { color: Colors.danger, fontSize: 16, marginBottom: 12 },
  retryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  retryTxt: { color: Colors.onPrimary, fontWeight: '800' },

  headerIconBtn: { padding: 8, marginRight: 8, borderRadius: 10, backgroundColor: `${Colors.onPrimary}18` },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  title: { color: Colors.textPrimary, fontWeight: '900', fontSize: 18, flexShrink: 1 },

  metaWrap: { marginTop: 10 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  fieldRowPill: {
    backgroundColor: Colors.secondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  fieldLabel: { color: Colors.textSecondary, fontWeight: '700' },
  fieldTxt: { color: Colors.textSecondary, fontSize: 14, flexShrink: 1 },
  fieldTxtPill: { color: Colors.onSecondary, fontWeight: '900' },

  pillsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },

  noteBox: {
    marginTop: 12, backgroundColor: Colors.background, borderRadius: 12, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.divider,
  },
  noteTitle: { color: Colors.primary, fontWeight: '900', marginBottom: 6 },
  noteText: { color: Colors.textPrimary, lineHeight: 18 },

  sectionTitle: { color: Colors.textPrimary, fontWeight: '900', marginBottom: 8, marginTop: 6, fontSize: 16 },

  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    padding: 14,
    marginBottom: 12,
  },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseTitle: { color: Colors.textPrimary, fontWeight: '800', fontSize: 16, flex: 1, paddingRight: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  chipTxt: { color: Colors.onSecondary, fontWeight: '900', fontSize: 12 },

  setGrid: { marginTop: 12 },
  setItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
    marginBottom: 10,
  },
  setTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  setTitle: { color: Colors.primary, fontWeight: '900', marginLeft: 6 },

  setEmpty: { color: Colors.textSecondary, fontStyle: 'italic' },

  setFieldsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  setField: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
  },
  setFieldLabel: { color: Colors.textSecondary, fontSize: 12 },
  setFieldValue: { color: Colors.textPrimary, fontWeight: '700', marginTop: 2 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  pillTxt: { color: Colors.onSecondary, fontWeight: '900', fontSize: 10 },

  simpleWrap: { marginTop: 6 },

  metaFooter: { marginTop: 10 },

  exerciseNotes: {
    marginTop: 8, backgroundColor: Colors.background, borderRadius: 10, padding: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.divider,
  },
  exerciseNotesTitle: { color: Colors.primary, fontWeight: '900', marginBottom: 6 },
  exerciseNotesTxt: { color: Colors.textPrimary, lineHeight: 18 },

  emptyBlock: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: Colors.textSecondary, marginTop: 6 },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 10 },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionTxt: { color: Colors.onPrimary, fontWeight: '800' },
});
