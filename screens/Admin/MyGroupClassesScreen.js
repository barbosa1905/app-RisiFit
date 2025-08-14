// screens/Admin/MyGroupClassesScreen.js
// Este ecrã permite que Personal Trainers visualizem, editem e cancelem as suas próprias aulas de grupo.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../services/firebaseConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Adicionado useFocusEffect
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const colors = {
  primary: '#D4AC54', // Dourado/Mostarda
  primaryDark: '#A88433', // Dourado mais escuro
  secondary: '#69511A', // Castanho escuro para títulos e texto principal
  textMuted: '#767676', // Cinzento médio para placeholders e texto secundário
  background: '#F0F2F5', // Fundo geral da tela (mais suave)
  cardBackground: '#FFFFFF', // Fundo de cards e inputs
  border: '#E0E0E0', // Cor da borda para inputs e cards
  shadow: 'rgba(0,0,0,0.1)', // Sombra mais proeminente
  danger: '#D32F2F', // Cor para erros/ações destrutivas
  success: '#4CAF50', // Cor para sucesso
  textLight: '#FFFFFF', // Cor de texto claro (para botões)
  info: '#2196F3', // Azul para informações ou estados neutros
};

export default function MyGroupClassesScreen() {
  const navigation = useNavigation();
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Função para formatar a data e hora para exibição
  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para buscar as aulas criadas pelo PT logado
  const fetchMyClasses = useCallback(() => {
    const ptId = auth.currentUser?.uid;
    if (!ptId) {
      setLoading(false);
      setMyClasses([]);
      console.log("Nenhum Personal Trainer logado. Não é possível carregar as suas aulas.");
      return () => {}; // Retorna uma função vazia para o useEffect
    }

    setLoading(true);
    // Query para buscar aulas onde 'ptId' corresponde ao UID do PT logado
    // Ordena por data e hora, da mais recente para a mais antiga (para ver as próximas no topo)
    const q = query(
      collection(db, 'groupClasses'),
      where('ptId', '==', ptId),
      orderBy('dateTime', 'desc') // Ordenar do mais recente para o mais antigo
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Garante que o timestamp é convertido se necessário para o estado
        dateTime: doc.data().dateTime instanceof Timestamp ? doc.data().dateTime : Timestamp.fromDate(new Date(doc.data().dateTime.seconds * 1000)),
      }));
      setMyClasses(fetchedClasses);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Erro ao carregar as minhas aulas de grupo:', error);
      Alert.alert('Erro', 'Não foi possível carregar as suas aulas de grupo.');
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  // Use useFocusEffect para garantir que os dados são recarregados sempre que a tela é focada
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = fetchMyClasses();
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }, [fetchMyClasses])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyClasses();
  }, [fetchMyClasses]);

  // Handler para editar uma aula
  const handleEditClass = (classItem) => {
    // Navega para a tela de criação/edição, passando os dados da aula
    navigation.navigate('CreateGroupClass', { classData: classItem });
  };

  // Handler para cancelar/excluir uma aula
  const handleDeleteClass = async (classId, className) => {
    Alert.alert(
      'Confirmar Cancelamento',
      `Tem certeza que deseja cancelar a aula "${className}"? Esta ação é irreversível.`,
      [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              setLoading(true); // Pode ser um loading mais específico para o item
              await deleteDoc(doc(db, 'groupClasses', classId));
              Alert.alert('Sucesso', 'Aula cancelada com sucesso!');
              // A lista será atualizada automaticamente pelo onSnapshot
            } catch (error) {
              console.error('Erro ao cancelar aula:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a aula. Tente novamente.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // Componente para renderizar cada item da lista de aulas
  const renderClassItem = ({ item }) => {
    const isPastClass = item.dateTime.toDate() < new Date();

    return (
      <View style={styles.classCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classDateTime}>
            <Ionicons name="calendar-outline" size={16} color={colors.secondary} /> {formatDateTime(item.dateTime)}
          </Text>
        </View>

        {item.description ? (
          <View style={styles.classDetailRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={styles.detailIcon} />
            <Text style={styles.classDescription}>{item.description}</Text>
          </View>
        ) : null}

        <View style={styles.classDetailRow}>
          <Ionicons name="people-outline" size={16} color={colors.secondary} style={styles.detailIcon} />
          <Text style={styles.classCapacity}>
            Participantes: {item.currentParticipants}/{item.capacity}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {isPastClass ? (
            <Text style={styles.pastClassText}>Aula Passada</Text>
          ) : (
            <Text style={styles.activeClassText}>Ativa</Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditClass(item)}
            disabled={isPastClass || loading} // Não permite editar aulas passadas
          >
            <Ionicons name="create-outline" size={20} color={isPastClass ? colors.textMuted : colors.info} />
            <Text style={[styles.actionButtonText, isPastClass && styles.disabledActionText]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteClass(item.id, item.name)}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={styles.actionButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>A carregar as suas aulas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Aulas de Grupo</Text>
        <View style={{ width: 28 }} /> {/* Espaçador para centralizar o título */}
      </View>

      {myClasses.length === 0 && !loading ? (
        <View style={styles.centeredContainer}>
          <Ionicons name="calendar-outline" size={60} color={colors.textMuted} />
          <Text style={styles.emptyText}>Você ainda não criou nenhuma aula de grupo.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateGroupClass')} style={styles.createButton}>
            <Ionicons name="add-circle-outline" size={24} color={colors.textLight} />
            <Text style={styles.createButtonText}>Criar Nova Aula</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Recarregar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myClasses}
          keyExtractor={item => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: colors.secondary,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: 15,
    textAlign: 'center',
    marginTop: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 10,
  },
  createButtonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  retryButton: {
    backgroundColor: colors.textMuted, // Cor diferente para recarregar
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  retryButtonText: {
    color: colors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContentContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  classCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    flexShrink: 1,
    marginRight: 10,
  },
  classDateTime: {
    fontSize: 15,
    color: colors.secondary,
  },
  classDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  classDescription: {
    fontSize: 14,
    color: colors.textMuted,
    flexShrink: 1,
  },
  classCapacity: {
    fontSize: 15,
    color: colors.secondary,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginTop: 10,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  pastClassText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textMuted,
    backgroundColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  activeClassText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    backgroundColor: '#E8F5E9',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: colors.background, // Fundo neutro para os botões de ação
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  disabledActionText: {
    color: colors.textMuted, // Cor para texto de botão desabilitado
  },
  deleteButton: {
    borderColor: colors.danger,
    backgroundColor: '#FFEBEE', // Fundo claro para o botão de apagar
  },
});
