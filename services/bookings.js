// services/bookings.js
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseConfig'; // ajusta o caminho se precisares

export async function createBooking({ clientId, start, end, notes }) {
  const fn = httpsCallable(functions, 'createBooking');
  const res = await fn({ clientId, start, end, notes });
  return res.data.id; // devolve o ID criado
}
