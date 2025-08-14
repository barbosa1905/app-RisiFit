import { db } from './firebaseConfig';
import {
  collection,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';

// 🔍 Salvar questionário
export async function salvarQuestionario(adminId, questionario) {
  try {
    const collectionRef = collection(db, "admin", adminId, "questionarios");
    await addDoc(collectionRef, questionario);
    return true;
  } catch (error) {
    console.error("Erro ao salvar questionário:", error);
    return false;
  }
}

// 🔍 Buscar todos os treinos (caso uses coleção global - opcional)
export async function buscarTreinos() {
  const snapshot = await getDocs(collection(db, 'treinos'));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ✅ Buscar clientes com role "user"
export async function buscarClientes() {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }
}

// ➕ Criar treino na subcoleção users/{uid}/treinos
export async function criarTreinoParaCliente(treino) {
  try {
    const { userId, ...dadosTreino } = treino;
    const ref = collection(db, 'users', userId, 'treinos');
    await addDoc(ref, dadosTreino);
  } catch (error) {
    console.error('Erro ao criar treino para cliente:', error);
    throw error;
  }
}

// ✏️ Atualizar treino na subcoleção do cliente
export async function atualizarTreino(clienteId, treinoId, dados) {
  const ref = doc(db, 'users', clienteId, 'treinos', treinoId);
  await updateDoc(ref, dados);
}

// ❌ Apagar treino da subcoleção do cliente
export async function apagarTreino(clienteId, treinoId) {
  const ref = doc(db, 'users', clienteId, 'treinos', treinoId);
  await deleteDoc(ref);
}

// 📥 Buscar treinos de um cliente específico
export async function buscarTreinosDoCliente(userId) {
  try {
    const ref = collection(db, 'users', userId, 'treinos');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Erro ao buscar treinos do cliente:', error);
    return [];
  }
}

// 📋 Buscar todos os treinos com nomes dos clientes
export async function buscarTodosTreinosComNomes() {
  const resultado = [];

  try {
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')));

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const treinosRef = collection(db, 'users', userId, 'treinos');
      const treinosSnapshot = await getDocs(treinosRef);

      treinosSnapshot.forEach((treinoDoc) => {
        resultado.push({
          id: treinoDoc.id,
          ...treinoDoc.data(),
          clienteNome: userData.name || userData.displayname || userData.fullname || 'Sem nome',
          clienteId: userId,
        });
      });
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao buscar treinos com nomes:', error);
    return [];
  }
}
