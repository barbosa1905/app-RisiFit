import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
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

// Certifique-se de que o nome da importação corresponde ao nome do arquivo real
// Ex: Se o arquivo se chamar CreateWorkoutTemplateScreen.js, mantenha-o assim
import CreateWorkoutTemplateScreen from './CreateWorkoutTemplateScreen';

// Paleta de Cores Profissional
const Colors = {
  primary: '#2A3B47',        // Azul escuro para o fundo principal
  secondary: '#FFB800',      // Laranja vibrante como cor de destaque
  background: '#F0F2F5',     // Cinza claro para o fundo da tela
  cardBackground: '#FFFFFF', // Branco puro para os cartões
  textPrimary: '#333333',    // Preto para o texto principal
  textSecondary: '#666666',  // Cinza escuro para o texto secundário
  success: '#4CAF50',        // Verde para ações de sucesso
  danger: '#F44336',         // Vermelho para ações de perigo
  info: '#2196F3',           // Azul para informações e botões
};

export default function WorkoutTemplatesScreen() {
  const navigation = useNavigation();
  const [workoutTemplates, setWorkoutTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);

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
    navigation.navigate('CreateWorkoutTemplate', { templateId: template.id, templateData: template });
  };

  const handleCreateNewTemplate = () => {
    navigation.navigate('CreateWorkoutTemplate');
  };

  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  const renderTemplate = ({ item }) => (
    <View style={styles.templateCard}>
      <View style={styles.templateHeader}>
        <Ionicons name="documents-outline" size={24} color={Colors.secondary} />
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.templateDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.templateFooter}>
        <Text style={styles.templateExerciseCount}>
          <Ionicons name="fitness-outline" size={14} color={Colors.textSecondary} />
          {`  ${item.exercises?.length || 0} exercícios`}
        </Text>
        <View style={styles.templateActions}>
          <TouchableOpacity
            onPress={() => handleEditTemplate(item)}
            style={[styles.actionButton, { backgroundColor: Colors.info }]}
          >
            <Ionicons name="create-outline" size={18} color={Colors.cardBackground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTemplate(item.id, item.name)}
            style={[styles.actionButton, { backgroundColor: Colors.danger }]}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.cardBackground} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.cardBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modelos de Treino</Text>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{adminInitial}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateNewTemplate}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.cardBackground} />
          <Text style={styles.createButtonText}>Criar Novo Modelo</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.secondary} style={styles.activityIndicator} />
        ) : workoutTemplates.length === 0 ? (
          <View style={styles.noTemplatesContainer}>
            <Ionicons name="file-tray-outline" size={60} color={Colors.textSecondary} />
            <Text style={styles.noTemplatesText}>Nenhum modelo de treino encontrado.</Text>
            <Text style={styles.noTemplatesSubText}>
              Clique no botão "Criar Novo Modelo" para começar a organizar seus treinos.
            </Text>
          </View>
        ) : (
          <FlatList
            data={workoutTemplates}
            keyExtractor={(item) => item.id}
            renderItem={renderTemplate}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.cardBackground,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.cardBackground,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  createButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  activityIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noTemplatesContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  noTemplatesText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginTop: 15,
    textAlign: 'center',
  },
  noTemplatesSubText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  templateCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderLeftWidth: 6,
    borderLeftColor: Colors.secondary,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateInfo: {
    marginLeft: 15,
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  templateDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  templateExerciseCount: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});