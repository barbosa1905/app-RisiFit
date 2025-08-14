import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import DetalhesTreinoConcluidoScreen from './DetalhesTreinoConcluidoScreen';

// Paleta de Cores (assumindo que já a tens ou a importas)
const Colors = {
    primaryGold: '#B8860B', // Ouro mais clássico
    darkBrown: '#3E2723', // Marrom bem escuro, quase preto
    lightBrown: '#795548', // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1', // Cinza muito claro
    mediumGray: '#B0BEC5', // Cinza médio para textos secundários
    darkGray: '#424242', // Cinza escuro para textos principais
    accentBlue: '#2196F3', // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336', // Vermelho para erros/alertos
    buttonTextLight: '#FFFFFF', // Cor de texto para botões com fundo escuro
    buttonTextDark: '#3E2723', // Cor de texto para botões com fundo claro
    shadow: 'rgba(0,0,0,0.08)', // Sombra suave
    black: '#000000', // Adicionado para o headerTitle
  };

  const { width } = Dimensions.get('window');

  // Global Styles for consistent shadows
  const GlobalStyles = {
    shadow: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    cardShadow: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    }
  };


// --- Componente AppHeaderPersonalizado ---
const AppHeaderPersonalizado = ({ title, showBackButton, onBackPress }) => {
  return (
    <View style={headerStyles.headerContainer}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.primaryGold}
      />
      <View style={headerStyles.headerContent}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
        )}
        <Text style={headerStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.primaryGold,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centraliza o título por padrão
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.black,
    flex: 1,
    textAlign: 'center',
    marginLeft: -24, // Compensa o espaço do botão de voltar para centralizar melhor
  },
  backButton: {
    padding: 5,
    marginRight: 10,
    zIndex: 1,
  },
});


export default function TreinosClienteScreen() {
  const [treinos, setTreinos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const navigation = useNavigation();
  const route = useRoute();
 const { treinoId, clienteId,clientename, name } = route.params;

  const carregarTreinos = useCallback(() => {
    setLoading(true);
    const treinosRef = collection(db, 'users', clienteId, 'treinos');
    const q = query(treinosRef, orderBy('data', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const listaTreinos = [];
      const hoje = moment().startOf('day');

      for (const docTreino of snapshot.docs) {
        const treinoData = docTreino.data();
        const dataTreino = treinoData.data instanceof Date
            ? moment(treinoData.data)
            : treinoData.data && treinoData.data.toDate
                ? moment(treinoData.data.toDate())
                : moment();

        let status = 'Desconhecido';
        if (dataTreino.isAfter(hoje)) {
          status = 'Futuro';
        } else {
          if (treinoData.concluido === true) {
            status = 'Completo';
          } else {
            status = 'NaoConcluido';
          }
        }

        listaTreinos.push({
          id: docTreino.id,
          ...treinoData,
          dataMoment: dataTreino,
          status: status,
        });
      }
      setTreinos(listaTreinos);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar treinos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os treinos.');
      setLoading(false);
    });

    return unsubscribe;
  }, [clienteId]);

  useEffect(() => {
    const unsubscribe = carregarTreinos();
    return () => unsubscribe();
  }, [carregarTreinos]);

  const toggleConcluido = async (treinoId, isConcluido) => {
    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treinoId);
      await updateDoc(treinoRef, {
        concluido: !isConcluido,
      });
    } catch (error) {
      console.error('Erro ao atualizar treino:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do treino.');
    }
  };

  const confirmarRemocaoTreino = (treino) => {
    Alert.alert(
      'Remover Treino',
      `Tem certeza que quer remover o treino "${treino.name}"? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', clienteId, 'treinos', treino.id));
              Alert.alert('Sucesso', 'Treino removido com sucesso!');
            } catch (error) {
              console.error('Erro ao apagar treino:', error);
              Alert.alert('Erro', 'Não foi possível apagar o treino.');
            }
          },
        },
      ]
    );
  };


  const treinosFiltrados = treinos.filter(treino => {
    if (filtroStatus === 'Todos') {
      return true;
    }
    return treino.status === filtroStatus;
  });

const renderItem = ({ item }) => {
  const isFuture = item.status === 'Futuro';
  const isCompleted = item.status === 'Completo';
  const isNotCompleted = item.status === 'NaoConcluido';

  // Extrai o nome do primeiro exercício, se existir
  const primeiroExercicio = item.customExercises && item.customExercises.length > 0
    ? item.customExercises[0].exerciseName
    : 'Nenhum exercício';
  
  // Condicionalmente renderiza os botões para "Editar" e "Remover" apenas se for um treino futuro.
  const showEditRemoveButtons = isFuture;
  const showCompleteButton = isNotCompleted;
  const showDetailsButton = isCompleted;

  return (
    <View style={[styles.card, GlobalStyles.cardShadow]}>
      {/* Nome do Treino */}
      <View style={styles.cardHeader}>
        <Text style={styles.treinoName}>{item.nome}</Text>
        <View style={styles.statusBadgeContainer}>
          {isFuture && (
            <Text style={[styles.statusBadge, styles.statusFuture]}>
              <Ionicons name="hourglass-outline" size={14} color={Colors.buttonTextLight} /> Futuro
            </Text>
          )}
          {isCompleted && (
            <Text style={[styles.statusBadge, styles.statusCompleted]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={Colors.buttonTextLight} /> Concluído
            </Text>
          )}
          {isNotCompleted && (
            <Text style={[styles.statusBadge, styles.statusNotCompleted]}>
              <Ionicons name="close-circle-outline" size={14} color={Colors.buttonTextLight} /> Não Concluído
            </Text>
          )}
        </View>
      </View>

      {/* Categoria do Treino */}
      <Text style={styles.infoText}>
          <Ionicons name="fitness-outline" size={16} color={Colors.mediumGray} /> Categoria: {item.categoria}
      </Text>

      {/* Data do Treino */}
      <Text style={styles.treinoDate}>
        <Ionicons name="calendar-outline" size={16} color={Colors.mediumGray} />{' '}
        {item.dataMoment.format('DD/MM/YYYY')}
      </Text>
      
        {/* Descrição do Treino (usando a chave correta `descricao`) */}
      {item.descricao && item.descricao.trim().length > 0 && (
        <Text style={styles.infoRow}>
          <Ionicons name="document-text-outline" size={16} color={Colors.mediumGray} />
          <Text style={styles.treinoDesc}>{item.descricao}</Text>
        </Text>
      )}
      
      <View style={styles.cardActions}>
        {showDetailsButton && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: Colors.primaryGold }]}
            onPress={() => navigation.navigate('DetalhesTreinoConcluidoScreen', { treino: item })}
          >
            <Ionicons name="eye-outline" size={20} color={Colors.buttonTextLight} />
            <Text style={styles.actionButtonText}>Ver Detalhes</Text>
          </TouchableOpacity>
        )}

        {showEditRemoveButtons && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.accentBlue }]}
                onPress={() => navigation.navigate('EditarTreino', { treino: item, clienteId: clienteId, reloadTreinos: carregarTreinos })}
              >
                <Ionicons name="pencil-outline" size={20} color={Colors.buttonTextLight} />
                <Text style={styles.actionButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: Colors.errorRed }]}
                onPress={() => confirmarRemocaoTreino(item)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.buttonTextLight} />
                <Text style={styles.actionButtonText}>Remover</Text>
              </TouchableOpacity>
            </>
        )}

        
      </View>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <AppHeaderPersonalizado
        title={`Treinos de ${clientename}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <FlatList
        data={treinosFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentPadding}
        renderItem={renderItem}
        ListHeaderComponent={() => (
          <View style={styles.listHeaderSection}>
            <View style={[styles.cardWrapper, GlobalStyles.shadow]}>
              <Text style={styles.pickerLabel}>Filtrar Treinos por Status:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filtroStatus}
                  onValueChange={(itemValue) => setFiltroStatus(itemValue)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Todos os Treinos" value="Todos" />
                  <Picker.Item label="Treinos Futuros" value="Futuro" />
                  <Picker.Item label="Treinos Concluídos" value="Completo" />
                  <Picker.Item label="Treinos Não Concluídos" value="NaoConcluido" />
                </Picker>
              </View>
            </View>

            {treinosFiltrados.length === 0 && (
              <View style={styles.emptyResultsContainer}>
                <Ionicons name="hourglass-outline" size={50} color={Colors.mediumGray} />
                <Text style={styles.emptyResultsText}>
                  Nenhum treino encontrado para o status selecionado.
                </Text>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={!loading && treinos.length === 0 && (
          <View style={styles.emptyResultsContainer}>
            <Ionicons name="barbell-outline" size={50} color={Colors.mediumGray} />
            <Text style={styles.emptyResultsText}>
              Ainda não há treinos atribuídos a este cliente.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.creamBackground,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 17,
    color: Colors.darkBrown,
    fontWeight: '500',
  },
  listContentPadding: {
    paddingBottom: 30,
  },
  listHeaderSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  cardWrapper: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkBrown,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.lightGray,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    color: Colors.darkGray,
  },
  pickerItem: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 15,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  treinoName: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.darkBrown,
    flex: 1,
    marginRight: 10,
  },
   treinoDate: {
    fontSize: 15,
    color: Colors.mediumGray,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  treinoDesc: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 15,
  },
  // Adicione este novo estilo
  infoText: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    color: Colors.buttonTextLight,
    marginLeft: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusFuture: {
    backgroundColor: Colors.accentBlue,
  },
  statusCompleted: {
    backgroundColor: Colors.successGreen,
  },
  statusNotCompleted: {
    backgroundColor: Colors.errorRed,
  },
  treinoDate: {
    fontSize: 15,
    color: Colors.mediumGray,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  treinoDesc: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 15,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10, // Espaçamento entre os botões
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 1,
    // Alterado para um valor que permite 2 ou 3 por linha, dependendo do conteúdo
    minWidth: (width - (20 * 2) - 18 * 2 - 30) / 2.5, // Ajustado para tentar 2-3 por linha
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    color: Colors.buttonTextLight,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    textAlign: 'center',
  },
  emptyResultsText: {
    fontSize: 17,
    color: Colors.mediumGray,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});