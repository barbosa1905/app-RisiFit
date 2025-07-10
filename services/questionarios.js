// services/questionarioService.js

import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * Salva ou atualiza um questionário para o admin.
 * @param {string} adminId - ID do admin.
 * @param {object} questionario - Objeto questionário com ao menos um campo 'id'.
 * @returns {Promise<boolean>} - true se salvo com sucesso, false se erro.
 */
export async function salvarQuestionario(adminId, questionario) {
  if (!adminId || !questionario?.id) {
    console.error('adminId e questionario.id são obrigatórios para salvar');
    return false;
  }
  try {
    await setDoc(doc(db, 'admins', adminId, 'questionarios', questionario.id), questionario);
    return true;
  } catch (error) {
    console.error('Erro ao salvar questionário:', error);
    return false;
  }
}

/**
 * Lista todos os questionários do admin.
 * @param {string} adminId - ID do admin.
 * @returns {Promise<Array>} - Array de questionários.
 */
export async function listarQuestionarios(adminId) {
  if (!adminId) {
    console.error('adminId é obrigatório para listar questionários');
    return [];
  }
  try {
    const querySnapshot = await getDocs(collection(db, 'admins', adminId, 'questionarios'));
    const questionarios = [];
    querySnapshot.forEach((docSnap) => {
      questionarios.push({ id: docSnap.id, ...docSnap.data() });
    });
    return questionarios;
  } catch (error) {
    console.error('Erro ao listar questionários:', error);
    return [];
  }
}

/**
 * Exclui um questionário pelo ID para o admin.
 * @param {string} adminId - ID do admin.
 * @param {string} questionarioId - ID do questionário a ser excluído.
 * @returns {Promise<boolean>} - true se excluído com sucesso, false se erro.
 */
export async function excluirQuestionario(adminId, questionarioId) {
  if (!adminId || !questionarioId) {
    console.error('adminId e questionarioId são obrigatórios para excluir');
    return false;
  }
  try {
    await deleteDoc(doc(db, 'admins', adminId, 'questionarios', questionarioId));
    return true;
  } catch (error) {
    console.error('Erro ao excluir questionário:', error);
    return false;
  }
}

/**
 * Busca um questionário específico pelo ID para o admin.
 * @param {string} adminId - ID do admin.
 * @param {string} questionarioId - ID do questionário.
 * @returns {Promise<object|null>} - Objeto questionário ou null se não encontrado/erro.
 */
export async function obterQuestionario(adminId, questionarioId) {
  if (!adminId || !questionarioId) {
    console.error('adminId e questionarioId são obrigatórios para obter questionário');
    return null;
  }
  try {
    const docSnap = await getDoc(doc(db, 'admins', adminId, 'questionarios', questionarioId));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Erro ao obter questionário:', error);
    return null;
  }
}
