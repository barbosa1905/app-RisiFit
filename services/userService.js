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

// Função para buscar treinos agendados para o utilizador logado.
// Retorna treinos do dia atual e todos os treinos passados.
// NOTA: Esta função não é usada nas telas HomeScreen ou TreinosScreen para o calendário completo,
// mas é mantida caso seja usada em outras partes da sua aplicação.
export const buscarTreinosDoUser = async (userId) => {
  try {
    if (!userId) {
      console.warn('buscarTreinosDoUser: userId não fornecido.');
      return [];
    }
    const treinosRef = collection(db, 'users', userId, 'treinos');

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const q = query(
      treinosRef,
      where('data', '<=', todayEnd),
      orderBy('data', 'asc')
    );

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
        console.warn('⚠️ Data de treino em formato inesperado (buscarTreinosDoUser):', data.data);
        formattedDate = null;
      }

      treinos.push({
        id: doc.id,
        ...data,
        data: formattedDate,
      });
    });
    console.log(`✅ Treinos (passados e do dia atual) para o user ${userId} carregados:`, treinos.length);
    return treinos;
  } catch (error) {
    console.error('Erro ao buscar treinos do utilizador (passados e do dia atual):', error);
    throw error;
  }
};

// >>>>> FUNÇÃO PRINCIPAL PARA CALENDÁRIOS: Busca TODOS os treinos de um utilizador, sem filtro de data <<<<<
export const buscarTodosTreinosDoUser = async (userId) => {
  try {
    if (!userId) {
      console.warn('buscarTodosTreinosDoUser: userId não fornecido.');
      return [];
    }
    const treinosRef = collection(db, 'users', userId, 'treinos');
    const q = query(treinosRef, orderBy('data', 'asc')); // Ordena por data para consistência

    const querySnapshot = await getDocs(q);
    const treinos = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let formattedDate = null;

      // Prioriza Timestamp do Firebase, depois string ISO, depois objeto Date
      if (data.data && typeof data.data.toDate === 'function') {
        formattedDate = data.data.toDate().toISOString();
      } else if (typeof data.data === 'string' && data.data.includes('T')) {
        formattedDate = data.data;
      } else if (data.data instanceof Date) {
        formattedDate = data.data.toISOString();
      } else if (typeof data.data === 'string') {
        // Tenta parsear strings de data simples como "YYYY-MM-DD"
        try {
          const parsed = new Date(data.data);
          if (!isNaN(parsed.getTime())) {
            formattedDate = parsed.toISOString();
            console.log(`✅ Data de treino convertida de string simples: ${data.data} -> ${formattedDate}`);
          } else {
            formattedDate = null; // Ainda inválido
          }
        } catch (e) {
          formattedDate = null; // Falha na conversão
        }
      } else {
        console.warn('⚠️ Data de treino em formato inesperado (buscarTodosTreinosDoUser):', data.data);
        formattedDate = null;
      }

      if (formattedDate) { // Só adiciona se a data foi formatada com sucesso
        treinos.push({
          id: doc.id,
          ...data,
          data: formattedDate, // Garante que a data está em ISO 8601 string
        });
      } else {
        console.warn(`❌ Treino ${doc.id} ignorado devido a formato de data inválido.`);
      }
    });
    console.log(`✅ Todos os treinos para o user ${userId} carregados:`, treinos.length);
    return treinos;
  } catch (error) {
    console.error('❌ Erro ao buscar todos os treinos do utilizador:', error);
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
        formattedDate = format(data.data.toDate(), 'yyyy-MM-dd'); // Formata para YYYY-MM-DD
      } else if (typeof data.data === 'string') {
        // Se já é YYYY-MM-DD, usa. Senão, tenta parsear e formatar.
        if (/^\d{4}-\d{2}-\d{2}$/.test(data.data)) {
            formattedDate = data.data;
        } else {
            try {
                const parsed = new Date(data.data);
                if (!isNaN(parsed.getTime())) {
                    formattedDate = format(parsed, 'yyyy-MM-dd');
                    console.log(`✅ Data de avaliação convertida de string: ${data.data} -> ${formattedDate}`);
                } else {
                    formattedDate = null;
                }
            } catch (e) {
                formattedDate = null;
            }
        }
      } else if (data.data instanceof Date) {
          formattedDate = format(data.data, 'yyyy-MM-dd');
      } else {
        console.warn('⚠️ Data de avaliação em formato inesperado (buscarAvaliacoesAgendaDoUser):', data.data);
        formattedDate = null;
      }

      if (formattedDate) {
        avaliacoes.push({
          id: doc.id,
          ...data,
          data: formattedDate, // Garante que a data está em YYYY-MM-DD string
        });
      } else {
        console.warn(`❌ Avaliação ${doc.id} ignorada devido a formato de data inválido.`);
      }
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
