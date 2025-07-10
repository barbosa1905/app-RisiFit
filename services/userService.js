import { collection, getDocs, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// 🔍 Buscar treinos futuros do utilizador
export async function buscarTreinosDoUser(userId) {
  try {
    const ref = collection(db, 'users', userId, 'treinos');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Erro ao buscar treinos do utilizador:', error);
    return [];
  }
}

// 🔍 Buscar avaliações físicas armazenadas no user (opcional, caso existam avaliações lá)
export async function buscarAvaliacoesFisicasDoUser(userId) {
  try {
    const ref = collection(db, 'users', userId, 'avaliacoesFisicas');
    const snapshot = await getDocs(ref);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Erro ao buscar avaliações físicas do usuário:', error);
    return [];
  }
}

export async function buscarAvaliacoesAgendaDoUser(userId) {
  try {
    const ref = collection(db, 'agenda');
    const snapshot = await getDocs(ref);

    const avaliacoesDoUser = [];

    snapshot.forEach(doc => {
      const dataDoc = doc.data();
      if (dataDoc.avaliacoes && Array.isArray(dataDoc.avaliacoes)) {
        dataDoc.avaliacoes.forEach(avaliacao => {
          if (avaliacao.clienteId === userId) {
            // doc.id é a data da avaliação
            avaliacoesDoUser.push({
              id: `${doc.id}_${avaliacao.clienteId}`, // id único
              data: doc.id, // a data da avaliação (documento)
              hora: avaliacao.hora,
              texto: avaliacao.texto,
              observacoes: avaliacao.observacoes,
              clienteNome: avaliacao.clienteNome,
            });
          }
        });
      }
    });

    return avaliacoesDoUser;
  } catch (error) {
    console.error('Erro ao buscar avaliações da agenda:', error);
    return [];
  }
}

// 📜 Buscar histórico de treinos (anteriores a hoje)
export async function buscarHistoricoDoUser(userId) {
  try {
    const ref = collection(db, 'users', userId, 'treinos');
    const snapshot = await getDocs(query(ref, orderBy('data', 'desc')));
    const hoje = new Date().toISOString().split('T')[0];

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(treino => treino.data < hoje);
  } catch (error) {
    console.error('Erro ao buscar histórico do utilizador:', error);
    return [];
  }
}



