import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { MaterialIcons } from '@expo/vector-icons'; // Certifique-se de que este pacote está instalado no seu projeto Expo

export default function FichaClienteScreen({ route }) {
  const { clienteId } = route.params;
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarCliente = async () => {
      try {
        const docRef = doc(db, 'users', clienteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCliente(docSnap.data());
        } else {
          setCliente(null);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarCliente();
  }, [clienteId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d0a956" />
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Cliente não encontrado.</Text>
      </View>
    );
  }

  // Função para formatar data (caso esteja em Timestamp do Firestore ou ISO string)
  const formatarData = (data) => {
    if (!data) return 'Não informado';
    // Se for um objeto Timestamp do Firestore
    if (data.seconds) {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-PT');
    }
    // Se for uma string ISO (como criadoEm)
    if (typeof data === 'string' && data.includes('T') && data.includes('Z')) {
      return new Date(data).toLocaleDateString('pt-PT');
    }
    // Se já estiver no formato DD/MM/YYYY (como dataNascimento)
    return data;
  };

  // Função para exibir Sim/Não ou ícone para booleanos/strings
  const formatarSimNao = (valor) => {
    if (valor === true || valor === 'Sim') {
      return <MaterialIcons name="check-circle" size={20} color="#22c55e" />;
    }
    if (valor === false || valor === 'Não') {
      return <MaterialIcons name="cancel" size={20} color="#ef4444" />;
    }
    return <Text style={styles.value}>Não informado</Text>;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ficha do Cliente</Text>

      {/* Nome Completo */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="person" size={24} color="#d0a956" />
          <Text style={styles.label}>Nome</Text>
        </View>
        <Text style={styles.value}>{cliente.name || 'Não informado'}</Text>
      </View>

      {/* E-mail */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="email" size={24} color="#d0a956" />
          <Text style={styles.label}>Email</Text>
        </View>
        <Text style={styles.value}>{cliente.email || 'Não informado'}</Text>
      </View>

      {/* Telefone Completo (Atualizado para usar 'telefoneCompleto') */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="phone" size={24} color="#d0a956" />
          <Text style={styles.label}>Telefone</Text>
        </View>
        <Text style={styles.value}>{cliente.telefoneCompleto || 'Não informado'}</Text>
      </View>

      {/* Data de Nascimento */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="cake" size={24} color="#d0a956" />
          <Text style={styles.label}>Data de Nascimento</Text>
        </View>
        <Text style={styles.value}>{formatarData(cliente.dataNascimento)}</Text>
      </View>

      {/* Gênero */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="wc" size={24} color="#d0a956" />
          <Text style={styles.label}>Gênero</Text>
        </View>
        <Text style={styles.value}>{cliente.genero || 'Não informado'}</Text>
      </View>

      {/* Grupo */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="group" size={24} color="#d0a956" />
          <Text style={styles.label}>Grupo</Text>
        </View>
        <Text style={styles.value}>{cliente.grupo || 'Não informado'}</Text>
      </View>

      {/* Criado Em */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="event" size={24} color="#d0a956" />
          <Text style={styles.label}>Criado Em</Text>
        </View>
        <Text style={styles.value}>{formatarData(cliente.criadoEm)}</Text>
      </View>

      {/* Enviar Informações de Acesso */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="mail" size={24} color="#d0a956" />
          <Text style={styles.label}>Enviar Acesso por Email</Text>
        </View>
        <View style={styles.valueContainer}>
          {formatarSimNao(cliente.enviarAcesso)}
        </View>
      </View>

      {/* Enviar Anamnese */}
      <View style={styles.card}>
        <View style={styles.item}>
          <MaterialIcons name="assignment" size={24} color="#d0a956" />
          <Text style={styles.label}>Enviar Anamnese</Text>
        </View>
        <View style={styles.valueContainer}>
          {formatarSimNao(cliente.enviarAnamnese)}
        </View>
      </View>

      {/* Tipo de Anamnese (condicional) */}
      {cliente.enviarAnamnese === 'Sim' && cliente.tipoAnamneseId && (
        <View style={styles.card}>
          <View style={styles.item}>
            <MaterialIcons name="description" size={24} color="#d0a956" />
            <Text style={styles.label}>Tipo de Anamnese</Text>
          </View>
          <Text style={styles.value}>{cliente.tipoAnamneseId || 'Não informado'}</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb', // Cor de fundo mais neutra para o container
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 28,
    color: '#111827',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#111827',
  },
  value: {
    fontSize: 17,
    color: '#374151',
    paddingLeft: 32, // Alinha o valor abaixo do ícone
  },
  valueContainer: {
    paddingLeft: 32, // Alinha o ícone de Sim/Não
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444', // Cor de erro
  },
});
