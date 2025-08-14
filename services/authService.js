// services/authServices.js
import { auth } from './firebaseConfig';

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
