import { getAuth } from 'firebase/auth';
import { app } from './firebaseConfig'; // Certifica-te que estás a exportar `app` no firebaseConfig.js

const auth = getAuth(app);

export function getUserIdLoggedIn() {
  const user = auth.currentUser;

  if (user) {
    return user.uid;
  } else {
    throw new Error('Usuário não autenticado.');
  }
}
export function getAdminIdLoggedIn() {
  return auth.currentUser ? auth.currentUser.uid : null;
}