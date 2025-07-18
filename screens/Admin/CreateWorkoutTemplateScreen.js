import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, getDocs, doc, onSnapshot, updateDoc, getDoc as getFirestoreDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

// Categorias de treino (mesmas que em CriarTreinosScreen)
const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core', 'Outro'];

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

export default function CreateWorkoutTemplateScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { templateId, templateData } = route.params || {};

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState(''); // NOVO ESTADO para a categoria do modelo
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [isExerciseSelectionModalVisible, setIsExerciseSelectionModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [currentExerciseToAdd, setCurrentExerciseToAdd] = useState(null);
  const [exerciseDetailsModalVisible, setExerciseDetailsModalVisible] = useState(false);
  const [sets, setSets] = useState('');
  const [repsOrDuration, setRepsOrDuration] = useState('');
  const [rest, setRest] = useState('');
  const [notes, setNotes] = useState('');

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

  const fetchExerciseLibrary = useCallback(async () => {
    try {
      const exercisesColRef = collection(db, 'exercises');
      const snapshot = await getDocs(exercisesColRef);
      const fetchedExercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExerciseLibrary(fetchedExercises);
    } catch (err) {
      console.error("Erro ao carregar biblioteca de exercícios:", err);
      Alert.alert('Erro', 'Não foi possível carregar a biblioteca de exercícios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAdmin = fetchAdminInfo();
    fetchExerciseLibrary();

    // Se templateData for passado, preenche os campos para edição
    if (templateData) {
      setTemplateName(templateData.name || '');
      setTemplateDescription(templateData.description || '');
      setTemplateCategory(templateData.category || ''); // NOVO: Preenche a categoria
      // Garante que cada exercício no template tem um templateExerciseId único
      setSelectedExercises(templateData.exercises.map(ex => ({
        ...ex,
        templateExerciseId: ex.templateExerciseId || Date.now().toString() + Math.random(),
      })));
    }

    return () => unsubscribeAdmin();
  }, [fetchAdminInfo, fetchExerciseLibrary, templateData]);

  // --- Funções de Gestão de Exercícios no Modelo ---

  const openExerciseSelectionModal = () => {
    setIsExerciseSelectionModalVisible(true);
  };

  const closeExerciseSelectionModal = () => {
    setIsExerciseSelectionModalVisible(false);
  };

  const selectExerciseFromLibrary = (exercise) => {
    setCurrentExerciseToAdd(exercise);
    setSets('');
    setRepsOrDuration('');
    setRest('');
    setNotes('');
    setIsExerciseSelectionModalVisible(false);
    setExerciseDetailsModalVisible(true);
  };

  const addExerciseDetailsToTemplate = () => {
    if (!currentExerciseToAdd || !sets.trim() || !repsOrDuration.trim() || !rest.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os detalhes do exercício (Séries, Reps/Duração, Descanso).');
      return;
    }

    const newExerciseInTemplate = {
      exerciseId: currentExerciseToAdd.id,
      exerciseName: currentExerciseToAdd.name,
      sets: parseInt(sets),
      repsOrDuration: repsOrDuration.trim(),
      rest: rest.trim(),
      notes: notes.trim(),
      templateExerciseId: Date.now().toString(), // ID único para este item dentro do template
    };

    setSelectedExercises(prev => [...prev, newExerciseInTemplate]);
    setExerciseDetailsModalVisible(false);
    setCurrentExerciseToAdd(null);
    Alert.alert('Sucesso', `${currentExerciseToAdd.name} adicionado ao treino!`);
  };

  const removeExerciseFromTemplate = (templateExerciseId) => {
    Alert.alert(
      'Remover Exercício',
      'Tem certeza que deseja remover este exercício do modelo de treino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          onPress: () => {
            setSelectedExercises(prev =>
              prev.filter(ex => ex.templateExerciseId !== templateExerciseId)
            );
            Alert.alert('Removido', 'Exercício removido do modelo.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  // --- Funções de Salvamento do Modelo de Treino ---

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Erro', 'Por favor, dê um nome ao modelo de treino.');
      return;
    }
    if (!templateCategory.trim()) { // NOVO: Validação da categoria
      Alert.alert('Erro', 'Por favor, selecione uma categoria para o modelo de treino.');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um exercício ao modelo de treino.');
      return;
    }

    setLoading(true);
    try {
      const templateToSave = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        category: templateCategory, // NOVO: Salva a categoria
        exercises: selectedExercises.map(({ templateExerciseId, ...rest }) => rest), // Remove o ID temporário antes de salvar
        updatedAt: new Date(),
        createdBy: adminInfo?.uid || 'unknown',
      };

      if (templateId) {
        await updateDoc(doc(db, 'workoutTemplates', templateId), templateToSave);
        Alert.alert('Sucesso', 'Modelo de treino atualizado com sucesso!');
      } else {
        templateToSave.createdAt = new Date();
        await addDoc(collection(db, 'workoutTemplates'), templateToSave);
        Alert.alert('Sucesso', 'Modelo de treino salvo com sucesso!');
      }
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao salvar modelo de treino:", error);
      Alert.alert('Erro', `Não foi possível salvar o modelo de treino: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Renderização ---

  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  if (loading && !adminInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryGold} />
        <Text style={styles.loadingText}>A carregar...</Text>
      </View>
    );
  }

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>
          {templateId ? 'Editar Modelo de Treino' : 'Criar Novo Modelo de Treino'}
        </Text>

        <Text style={styles.inputLabel}>Nome do Modelo:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Força Total - Iniciante"
          placeholderTextColor={Colors.mediumGray}
          value={templateName}
          onChangeText={setTemplateName}
        />

        <Text style={styles.inputLabel}>Descrição (Opcional):</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex: Treino focado em ganho de massa muscular para iniciantes."
          placeholderTextColor={Colors.mediumGray}
          value={templateDescription}
          onChangeText={setTemplateDescription}
          multiline
        />

        {/* NOVO: Seleção de Categoria */}
        <Text style={styles.inputLabel}>Categoria:</Text>
        <View style={styles.categoriasContainer}>
          {categorias.map((cat) => {
            const selecionada = templateCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoriaButton,
                  selecionada && styles.categoriaButtonSelected,
                ]}
                onPress={() => setTemplateCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoriaButtonText,
                    selecionada && styles.categoriaButtonTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* FIM: Seleção de Categoria */}

        <View style={styles.sectionHeader}>
          <Ionicons name="barbell-outline" size={24} color={Colors.darkBrown} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Exercícios no Modelo</Text>
        </View>

        {selectedExercises.length === 0 ? (
          <Text style={styles.noExercisesText}>Nenhum exercício adicionado ainda.</Text>
        ) : (
          <FlatList
            data={selectedExercises}
            keyExtractor={(item) => item.templateExerciseId}
            renderItem={({ item }) => (
              <View style={styles.selectedExerciseCard}>
                <View style={styles.selectedExerciseInfo}>
                  <Text style={styles.selectedExerciseName}>{item.exerciseName}</Text>
                  <Text style={styles.selectedExerciseDetails}>
                    {item.sets} séries de {item.repsOrDuration} | Descanso: {item.rest}
                  </Text>
                  {item.notes ? <Text style={styles.selectedExerciseNotes}>Notas: {item.notes}</Text> : null}
                </View>
                <TouchableOpacity
                  onPress={() => removeExerciseFromTemplate(item.templateExerciseId)}
                  style={styles.removeExerciseButton}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.errorRed} />
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 10 }}
          />
        )}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={openExerciseSelectionModal}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
          <Text style={styles.addExerciseButtonText}>Adicionar Exercício</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveTemplateButton}
          onPress={handleSaveTemplate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.saveTemplateButtonText}>
              {templateId ? 'Atualizar Modelo de Treino' : 'Salvar Modelo de Treino'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Seleção de Exercícios da Biblioteca */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isExerciseSelectionModalVisible}
        onRequestClose={closeExerciseSelectionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Exercício</Text>
            {exerciseLibrary.length === 0 ? (
              <Text style={styles.noExercisesModalText}>Nenhum exercício na biblioteca.</Text>
            ) : (
              <FlatList
                data={exerciseLibrary}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.exerciseLibraryItem}
                    onPress={() => selectExerciseFromLibrary(item)}
                  >
                    <Text style={styles.exerciseLibraryItemText}>{item.name}</Text>
                    <Ionicons name="chevron-forward-outline" size={20} color={Colors.mediumGray} />
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity onPress={closeExerciseSelectionModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Adicionar Detalhes do Exercício */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseDetailsModalVisible}
        onRequestClose={() => setExerciseDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detalhes para {currentExerciseToAdd?.name}</Text>

            <Text style={styles.inputLabel}>Séries:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 3"
              placeholderTextColor={Colors.mediumGray}
              keyboardType="numeric"
              value={sets}
              onChangeText={setSets}
            />

            <Text style={styles.inputLabel}>Repetições / Duração (Ex: 10 ou 60s):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10 ou 60s"
              placeholderTextColor={Colors.mediumGray}
              value={repsOrDuration}
              onChangeText={setRepsOrDuration}
            />

            <Text style={styles.inputLabel}>Descanso (Ex: 60s ou 1min):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 60s"
              placeholderTextColor={Colors.mediumGray}
              value={rest}
              onChangeText={setRest}
            />

            <Text style={styles.inputLabel}>Notas para este exercício (Opcional):</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Fazer com carga leve."
              placeholderTextColor={Colors.mediumGray}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setExerciseDetailsModalVisible(false)}
                style={[styles.button, styles.buttonCancel]}
              >
                <Text style={styles.buttonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={addExerciseDetailsToTemplate}
                style={[styles.button, styles.buttonSave]}
              >
                <Text style={styles.buttonSaveText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.creamBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.darkBrown,
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkBrown,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkBrown,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.darkGray,
    backgroundColor: Colors.white,
    marginBottom: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.primaryGold,
    paddingBottom: 8,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkBrown,
  },
  noExercisesText: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  selectedExerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderLeftColor: Colors.accentBlue,
  },
  selectedExerciseInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectedExerciseName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.darkBrown,
  },
  selectedExerciseDetails: {
    fontSize: 14,
    color: Colors.darkGray,
    marginTop: 5,
  },
  selectedExerciseNotes: {
    fontSize: 13,
    color: Colors.lightBrown,
    fontStyle: 'italic',
    marginTop: 3,
  },
  removeExerciseButton: {
    padding: 5,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryGold,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addExerciseButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saveTemplateButton: {
    backgroundColor: Colors.successGreen,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  saveTemplateButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // --- Estilos de Modal ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Colors.creamBackground,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.darkBrown,
    marginBottom: 20,
    textAlign: 'center',
  },
  exerciseLibraryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  exerciseLibraryItemText: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  noExercisesModalText: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalCloseButton: {
    backgroundColor: Colors.errorRed,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonCancel: {
    backgroundColor: Colors.lightGray,
  },
  buttonSave: {
    backgroundColor: Colors.accentBlue,
  },
  buttonCancelText: {
    color: Colors.darkGray,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSaveText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos da categoria (copiados de CriarTreinosScreen)
  categoriasContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    marginBottom: 15, // Adicionado para espaçamento
  },
  categoriaButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryGold,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.white,
  },
  categoriaButtonSelected: {
    backgroundColor: Colors.primaryGold,
  },
  categoriaButtonText: {
    color: Colors.primaryGold,
    fontWeight: '600',
  },
  categoriaButtonTextSelected: {
    color: Colors.white,
  },
});
