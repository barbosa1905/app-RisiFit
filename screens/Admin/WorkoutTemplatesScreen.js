import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

// Paleta de Cores Refinada (consistente com outras telas)
const Colors = {
    primaryGold: '#D4AF37', // Ouro mais clássico
    darkBrown: '#3E2723',   // Marrom bem escuro, quase preto
    lightBrown: '#795548',  // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro
    mediumGray: '#B0BEC5',  // Cinza médio para textos secundários
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',  // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336',    // Vermelho para erros/alertas
    inputBorder: '#B0BEC5', // Cor da borda do input
};

export default function WorkoutTemplatesScreen() {
  const navigation = useNavigation();
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);

  // --- Funções de Carregamento de Dados ---

  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          setAdminInfo(docSnap.data());
        } else {
          setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
        }
      }, (error) => {
        console.error("Erro ao buscar informações do admin:", error);
        setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' });
      });
      return unsubscribe;
    } else {
      setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante' });
      return () => {};
    }
  }, []);

  const fetchWorkoutTemplates = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, 'workoutTemplates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWorkoutTemplates(templates);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar modelos de treino:', error);
      Alert.alert('Erro', 'Não foi possível carregar os modelos de treino.');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribeAdmin = fetchAdminInfo();
    const unsubscribeTemplates = fetchWorkoutTemplates();
    return () => {
      unsubscribeAdmin();
      unsubscribeTemplates();
    };
  }, [fetchAdminInfo, fetchWorkoutTemplates]);

  // --- Funções de Ação ---

  const handleDeleteTemplate = (templateId, templateName) => {
    Alert.alert(
      'Remover Modelo de Treino',
      `Tem certeza que deseja remover o modelo "${templateName}"? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'workoutTemplates', templateId));
              Alert.alert('Sucesso', 'Modelo de treino removido com sucesso!');
            } catch (error) {
              console.error('Erro ao remover modelo de treino:', error);
              Alert.alert('Erro', `Não foi possível remover o modelo: ${error.message}`);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditTemplate = (template) => {
    // Navegar para a tela de criação/edição de modelo, passando o modelo para edição
    navigation.navigate('CreateWorkoutTemplate', { templateId: template.id, templateData: template });
  };

  const handleCreateNewTemplate = () => {
    navigation.navigate('CreateWorkoutTemplate'); // Navega sem parâmetros para criar um novo
  };

  // --- Renderização ---

  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  return (
    <SafeAreaView style={styles.container}>
      {/* Barra Fixa Superior (Header) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Image
          source={require('../../assets/logo.jpeg')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{adminInitial}</Text>
          </View>
          <Text style={styles.userNameText}>Olá, {adminDisplayName}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.screenTitle}>Modelos de Treino</Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateNewTemplate}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
          <Text style={styles.createButtonText}>Criar Novo Modelo</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.activityIndicator} />
        ) : workoutTemplates.length === 0 ? (
          <View style={styles.noTemplatesContainer}>
            <Ionicons name="information-circle-outline" size={50} color={Colors.mediumGray} />
            <Text style={styles.noTemplatesText}>Nenhum modelo de treino criado ainda.</Text>
            <Text style={styles.noTemplatesSubText}>Crie um novo modelo para começar a organizar seus treinos.</Text>
          </View>
        ) : (
          <FlatList
            data={workoutTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.templateCard}>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.templateDescription}>{item.description}</Text>
                  ) : null}
                  {item.exercises && item.exercises.length > 0 ? (
                    <Text style={styles.templateExerciseCount}>
                      {item.exercises.length} exercícios
                    </Text>
                  ) : (
                    <Text style={styles.templateExerciseCount}>0 exercícios</Text>
                  )}
                </View>
                <View style={styles.templateActions}>
                  <TouchableOpacity
                    onPress={() => handleEditTemplate(item)}
                    style={[styles.actionButton, styles.editButton]}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteTemplate(item.id, item.name)}
                    style={[styles.actionButton, styles.deleteButton]}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: Colors.primaryGold,
    borderBottomWidth: 0,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 2 : 0,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.darkBrown,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkBrown,
    marginBottom: 25,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successGreen,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  activityIndicator: {
    marginTop: 50,
  },
  noTemplatesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: Colors.white,
    borderRadius: 10,
    elevation: 2,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginTop: 20,
  },
  noTemplatesText: {
    fontSize: 18,
    color: Colors.mediumGray,
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  noTemplatesSubText: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: Colors.primaryGold,
  },
  templateInfo: {
    flex: 1,
    marginRight: 10,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkBrown,
  },
  templateDescription: {
    fontSize: 14,
    color: Colors.mediumGray,
    marginTop: 5,
  },
  templateExerciseCount: {
    fontSize: 13,
    color: Colors.lightBrown,
    marginTop: 5,
    fontStyle: 'italic',
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: Colors.accentBlue,
  },
  deleteButton: {
    backgroundColor: Colors.errorRed,
  },
});
