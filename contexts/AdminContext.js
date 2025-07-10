import React, { createContext, useContext, useState, useEffect } from 'react';
import { buscarClientes } from '../services/adminService';

const AdminContext = createContext();

export function AdminProvider({ children }) {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    async function carregarClientes() {
      const lista = await buscarClientes();
      setClientes(lista);
    }
    carregarClientes();
  }, []);

  return (
    <AdminContext.Provider value={{ clientes, setClientes }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}