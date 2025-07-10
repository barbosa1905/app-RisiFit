import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export const createChat = async (userIds) => {
  try {
    const docRef = await addDoc(collection(db, 'chats'), {
      users: userIds,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (e) {
    console.error('Erro ao criar chat', e);
  }
};

export const sendMessage = async (chatId, message) => {
  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: message.text,
      senderId: message.senderId,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Erro ao enviar mensagem', e);
  }
};

export const subscribeToMessages = (chatId, callback) => {
  const messagesQuery = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
};
