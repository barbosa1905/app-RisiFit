// services/userService.js
import { db } from './firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { format } from 'date-fns';

// Função para buscar treinos de um utilizador (existente)
export const buscarTreinosDoUser = async (userId) => {
  try {
    if (!userId) {
      console.warn('buscarTreinosDoUser: userId não fornecido.');
      return [];
    }
    const treinosRef = collection(db, 'users', userId, 'treinos');
    const q = query(treinosRef, orderBy('data', 'asc'));

    const querySnapshot = await getDocs(q);
    const treinos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let formattedDate = null;

      if (data.data && typeof data.data.toDate === 'function') {
        formattedDate = data.data.toDate().toISOString();
      } else if (typeof data.data === 'string' && data.data.includes('T')) {
        formattedDate = data.data;
      } else if (data.data instanceof Date) {
        formattedDate = data.data.toISOString();
      } else {
        console.warn('Data de treino em formato inesperado (buscarTreinosDoUser):', data.data);
        formattedDate = null;
      }

      treinos.push({
        id: doc.id,
        ...data,
        data: formattedDate,
      });
    });
    return treinos;
  } catch (error) {
    console.error('Erro ao buscar treinos do utilizador:', error);
    throw error;
  }
};

// Função para buscar avaliações de um utilizador (existente)
export const buscarAvaliacoesAgendaDoUser = async (userId) => {
  try {
    if (!userId) {
      console.warn('buscarAvaliacoesAgendaDoUser: userId não fornecido.');
      return [];
    }
    const avaliacoesRef = collection(db, 'avaliacoes');
    const q = query(
      avaliacoesRef,
      where('uid', '==', userId),
      orderBy('data', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const avaliacoes = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let formattedDate = null;

      if (data.data && typeof data.data.toDate === 'function') {
        formattedDate = format(data.data.toDate(), 'yyyy-MM-dd');
      } else if (typeof data.data === 'string') {
        formattedDate = data.data.split('T')[0];
      } else if (data.data instanceof Date) {
          formattedDate = format(data.data, 'yyyy-MM-dd');
      } else {
        console.warn('Data de avaliação em formato inesperado (buscarAvaliacoesAgendaDoUser):', data.data);
        formattedDate = null;
      }

      avaliacoes.push({
        id: doc.id,
        ...data,
        data: formattedDate,
      });
    });
    return avaliacoes;
  } catch (error) {
    console.error('Erro ao buscar avaliações do utilizador:', error);
    throw error;
  }
};

// FUNÇÃO PARA SALVAR TREINO CONCLUÍDO NO FIRESTORE
export const salvarTreinoConcluido = async (userId, treinoId, nomeTreino, dataOriginalTreino, duracaoSegundos) => {
  try {
    const historicoRef = collection(db, 'historicoTreinos'); // Coleção para o histórico global
    await addDoc(historicoRef, {
      userId: userId,
      treinoId: treinoId,
      nomeTreino: nomeTreino, // Adicionando o nome do treino
      dataOriginalTreino: typeof dataOriginalTreino === 'string' ? new Date(dataOriginalTreino) : dataOriginalTreino, // Converte para Date se for string
      dataConclusao: Timestamp.now(), // Momento exato da conclusão
      duracao: duracaoSegundos,
    });
    console.log('Treino concluído salvo com sucesso no Firestore!');
  } catch (error) {
    console.error('Erro ao salvar treino concluído no Firestore:', error);
    throw error;
  }
};

// FUNÇÃO PARA BUSCAR TREINOS CONCLUÍDOS RECENTES (para o Admin - pode ser usada no HomeScreen, se reintroduzida a seção)
export const buscarTreinosConcluidosRecentes = async (numLimit = 5) => {
  try {
    const historicoRef = collection(db, 'historicoTreinos');
    const q = query(
      historicoRef,
      orderBy('dataConclusao', 'desc'),
      limit(numLimit)
    );
    const querySnapshot = await getDocs(q);
    const treinosConcluidos = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      let clientName = 'Cliente Desconhecido';

      if (data.userId) {
        try {
          const clientDocRef = doc(db, 'users', data.userId);
          const clientDocSnap = await getDoc(clientDocRef);
          if (clientDocSnap.exists()) {
            const client = clientDocSnap.data();
            clientName = client.nome || client.firstName || client.name || 'Cliente';
          }
        } catch (e) {
          console.error(`Erro ao buscar nome do cliente ${data.userId}:`, e);
        }
      }

      treinosConcluidos.push({
        id: docSnap.id,
        ...data,
        dataConclusao: data.dataConclusao ? data.dataConclusao.toDate() : null, // Convert Timestamp to Date object
        clientName: clientName,
      });
    }
    return treinosConcluidos;
  } catch (error) {
    console.error('Erro ao buscar treinos concluídos recentes:', error);
    throw error;
  }
};