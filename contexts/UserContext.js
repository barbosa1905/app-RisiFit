// contexts/UserContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Importa Firestore para obter detalhes do user
import { getAuth } from 'firebase/auth'; // Importa Firebase Auth para ouvir mudanças de autenticação

const UserContext = createContext(); // Pode ser iniciado sem valor inicial

export function UserProvider({ children }) {
  const [user, setUser] = useState(null); // Objeto de utilizador do Firebase Auth
  const [userDetails, setUserDetails] = useState(null); // Detalhes adicionais do utilizador (e.g., firstName, role) do Firestore
  const [role, setRole] = useState(null); // Role do utilizador ('admin' ou 'user')

  // Inicializa o Firebase Auth e Firestore
  const auth = getAuth();
  const db = getFirestore();

  // Função para carregar os detalhes do utilizador do Firestore
  // Usamos useCallback para memorizar a função e evitar recriações desnecessárias
  const loadUserDetails = useCallback(async (uid) => {
    if (!uid) {
      setUserDetails(null);
      setRole(null);
      return;
    }
    try {
      const userDocRef = doc(db, 'users', uid); // Assumindo que os detalhes estão na coleção 'users' com o UID como ID do documento
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserDetails(data);
        setRole(data.role || null); // Assumindo que o campo 'role' existe no documento
        console.log("User details loaded:", data); // Para debug
      } else {
        console.log('No such user document in Firestore!');
        setUserDetails(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Error loading user details from Firestore:', error);
      setUserDetails(null);
      setRole(null);
    }
  }, [db]); // A função depende da instância do Firestore

  // Efeito para observar o estado de autenticação do Firebase
  // Quando o estado do utilizador muda (login/logout), esta função é acionada
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser); // Define o objeto user do Firebase Auth
      if (currentUser) {
        // Se houver um utilizador logado, carrega os seus detalhes
        await loadUserDetails(currentUser.uid);
      } else {
        // Se não houver utilizador, limpa os detalhes
        setUserDetails(null);
        setRole(null);
      }
    });

    return unsubscribe; // Retorna a função de limpeza para desinscrever o listener
  }, [auth, loadUserDetails]); // Depende de 'auth' e 'loadUserDetails'

  // O valor que será fornecido a todos os componentes que usam 'useUser()'
  const value = {
    user,
    setUser,
    userDetails,   // <-- Incluído aqui!
    setUserDetails, // Se quiseres que outros componentes possam atualizar os detalhes
    role,
    setRole,
    loadUserDetails, // <-- ESSENCIAL! Esta é a função que o HomeScreen precisa.
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}