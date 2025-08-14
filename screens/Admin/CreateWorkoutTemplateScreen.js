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
import { collection, addDoc, getDocs, doc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core', 'Outro'];
const categoriasFiltroExercicios = ['Todos', ...categorias];

// Adicionado: Definição dos tipos de séries com os campos e ícones correspondentes
const seriesTypes = {
  reps_and_load: {
    label: 'Repetições e carga',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'barbell-outline',
  },
  reps_load_time: {
    label: 'Repetições, carga e tempo',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'repeat',
  },
  reps_and_time: {
    label: 'Repetições e tempo',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'time-outline',
  },
  time_and_incline: {
    label: 'Tempo e inclinação',
    fields: [
      { key: 'tempo', placeholder: 'Tempo (s)', keyboardType: 'numeric' },
      { key: 'inclinacao', placeholder: 'Inclinação (%)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'trending-up-outline',
  },
  running: {
    label: 'Corrida',
    fields: [
      { key: 'distancia', placeholder: 'Distância (m)', keyboardType: 'numeric' },
      { key: 'tempo', placeholder: 'Tempo (min:s)', keyboardType: 'default' },
      { key: 'ritmo', placeholder: 'Ritmo (min/km)', keyboardType: 'default' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'walk-outline',
  },
  notes: {
    label: 'Observações',
    fields: [{ key: 'notas', placeholder: 'Observações', multiline: true }],
    icon: 'create-outline',
  },
  cadence: {
    label: 'Cadência',
    fields: [
      { key: 'cadencia', placeholder: 'Cadência (rpm)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'pulse-outline',
  },
  split_series: {
    label: 'Série Split',
    fields: [
      { key: 'reps', placeholder: 'Repetições', keyboardType: 'numeric' },
      { key: 'peso', placeholder: 'Peso (kg)', keyboardType: 'numeric' },
      { key: 'descanso', placeholder: 'Descanso (s)', keyboardType: 'numeric' },
    ],
    icon: 'shuffle-outline',
  },
};

// Paleta de Cores Profissional
const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  background: '#F0F2F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#666666',
  success: '#4CAF50',
  danger: '#F44336',
  info: '#2196F3',
};

export default function CreateWorkoutTemplateScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { templateId, templateData } = route.params || {};

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [isExerciseSelectionModalVisible, setIsExerciseSelectionModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminInfo, setAdminInfo] = useState(null);
  const [currentExerciseToAdd, setCurrentExerciseToAdd] = useState(null);
  const [exerciseDetailsModalVisible, setExerciseDetailsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExerciseCategoryFilter, setSelectedExerciseCategoryFilter] = useState('Todos');
  const [isAddSeriesModalVisible, setIsAddSeriesModalVisible] = useState(false);
  const [selectedSeriesType, setSelectedSeriesType] = useState('reps_and_load');
  const [currentSeriesFields, setCurrentSeriesFields] = useState({});
  const [currentExerciseSets, setCurrentExerciseSets] = useState([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  // NOVO ESTADO: Controla a visibilidade da lista de tipos de série
  const [isSeriesTypeDropdownVisible, setIsSeriesTypeDropdownVisible] = useState(false);


  const fetchAdminInfo = useCallback(() => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === 'admin') {
          setAdminInfo(docSnap.data());
        } else {
          setAdminInfo({ name: 'Admin', email: currentUser?.email || 'admin@example.com', nome: 'Admin' });
        }
      }, (error) => {
        console.error("Erro ao buscar informações do admin:", error);
        setAdminInfo({ name: 'Admin', email: currentUser?.email || 'admin@example.com', nome: 'Admin' });
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
      const q = query(exercisesColRef, orderBy('nome_pt', 'asc'));
      const snapshot = await getDocs(q);
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

    if (templateData) {
      setTemplateName(templateData.name || '');
      setTemplateDescription(templateData.description || '');
      setTemplateCategory(templateData.category || '');
      setSelectedExercises(templateData.exercises.map(ex => ({
        ...ex,
        templateExerciseId: ex.templateExerciseId || Date.now().toString() + Math.random(),
      })));
    }

    return () => unsubscribeAdmin();
  }, [fetchAdminInfo, fetchExerciseLibrary, templateData]);

  const openExerciseSelectionModal = () => {
    setIsExerciseSelectionModalVisible(true);
    setSearchQuery('');
    setSelectedExerciseCategoryFilter('Todos');
  };

  const closeExerciseSelectionModal = () => {
    setIsExerciseSelectionModalVisible(false);
  };

  const selectExerciseFromLibrary = (exercise) => {
    setCurrentExerciseToAdd(exercise);
    setCurrentExerciseSets([]);
    setIsExerciseSelectionModalVisible(false);
    setExerciseDetailsModalVisible(true);
  };

  const openAddSeriesModal = () => {
    setSelectedSeriesType('reps_and_load');
    setCurrentSeriesFields({});
    setIsAddSeriesModalVisible(true);
    setIsSeriesTypeDropdownVisible(false); // Garante que o dropdown começa fechado
  };

  const adicionarNovaSerie = () => {
    if (!selectedSeriesType) {
      Alert.alert('Erro', 'Por favor, selecione um tipo de série.');
      return;
    }

    const newSet = {
      type: selectedSeriesType,
      ...currentSeriesFields,
      setId: Date.now().toString() + Math.random(),
    };

    setCurrentExerciseSets(prev => [...prev, newSet]);
    setIsAddSeriesModalVisible(false);
    Alert.alert('Sucesso', 'Série adicionada!');
  };

  const addExerciseDetailsToTemplate = () => {
    if (currentExerciseSets.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos uma série ao exercício.');
      return;
    }

    const newExerciseInTemplate = {
      exerciseId: currentExerciseToAdd.id,
      exerciseName: currentExerciseToAdd.nome_pt,
      sets: currentExerciseSets,
      templateExerciseId: Date.now().toString(),
    };

    setSelectedExercises(prev => [...prev, newExerciseInTemplate]);
    setExerciseDetailsModalVisible(false);
    setCurrentExerciseToAdd(null);
    setCurrentExerciseSets([]);
    Alert.alert('Sucesso', `${currentExerciseToAdd.nome_pt} adicionado ao treino!`);
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

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Erro', 'Por favor, dê um nome ao modelo de treino.');
      return;
    }
    if (!templateCategory.trim()) {
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
        category: templateCategory,
        exercises: selectedExercises.map(({ templateExerciseId, ...rest }) => ({
          ...rest,
          sets: rest.sets.map(({ setId, ...setRest }) => setRest),
        })),
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

  const filteredExercises = exerciseLibrary.filter(exercise => {
    const matchesSearch = exercise.nome_pt
      ? exercise.nome_pt.toLowerCase().includes(searchQuery.toLowerCase())
      : false;
    const matchesCategory = selectedExerciseCategoryFilter === 'Todos' ||
      (exercise.category && exercise.category.toLowerCase() === selectedExerciseCategoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';
  const adminInitial = adminDisplayName ? adminDisplayName.charAt(0).toUpperCase() : 'A';

  const renderSeriesDetails = (series) => {
    const type = seriesTypes[series.type];
    if (!type) return null;

    // Renderiza os detalhes de cada tipo de série
    switch (series.type) {
      case 'reps_and_load':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> {series.reps} rep. com {series.peso} kg | Descanso: {series.descanso}s
          </Text>
        );
      case 'reps_load_time':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> {series.reps} rep. com {series.peso} kg em {series.tempo}s | Descanso: {series.descanso}s
          </Text>
        );
      case 'reps_and_time':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> {series.reps} rep. em {series.tempo}s | Descanso: {series.descanso}s
          </Text>
        );
      case 'time_and_incline':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> Tempo: {series.tempo}s, Inclinação: {series.inclinacao}% | Descanso: {series.descanso}s
          </Text>
        );
      case 'running':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> {series.distancia}m em {series.tempo} | Ritmo: {series.ritmo} | Descanso: {series.descanso}s
          </Text>
        );
      case 'notes':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> Notas: {series.notas}
          </Text>
        );
      case 'cadence':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> Cadência: {series.cadencia} rpm | Descanso: {series.descanso}s
          </Text>
        );
      case 'split_series':
        return (
          <Text style={styles.seriesDetailText}>
            <Ionicons name={type.icon} size={14} color={Colors.textSecondary} /> {series.reps} rep. com {series.peso} kg | Descanso: {series.descanso}s
          </Text>
        );
      default:
        return null;
    }
  };

  const renderSelectedExercise = (item) => (
    <View key={item.templateExerciseId} style={styles.selectedExerciseCard}>
      <View style={styles.selectedExerciseInfo}>
        <Text style={styles.selectedExerciseName}>{item.exerciseName}</Text>
        {item.sets && item.sets.map((series, index) => (
          <View key={series.setId || index} style={styles.seriesContainer}>
            <Text style={styles.seriesCountText}>Série {index + 1}: {seriesTypes[series.type].label}</Text>
            {renderSeriesDetails(series)}
          </View>
        ))}
      </View>
      <TouchableOpacity
        onPress={() => removeExerciseFromTemplate(item.templateExerciseId)}
        style={styles.removeExerciseButton}
      >
        <Ionicons name="close-circle" size={24} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );

  const renderExerciseLibraryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.exerciseLibraryItem}
      onPress={() => selectExerciseFromLibrary(item)}
    >
      <View>
        <Text style={styles.exerciseLibraryItemText}>{item.nome_pt ?? 'Nome Indisponível'}</Text>
        {item.category && (
          <Text style={styles.exerciseLibraryCategoryText}>Categoria: {item.category}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward-outline" size={24} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading && !adminInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text style={styles.loadingText}>A carregar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.cardBackground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {templateId ? 'Editar Modelo' : 'Criar Modelo'}
        </Text>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{adminInitial}</Text>
          </View>
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
          placeholderTextColor={Colors.textSecondary}
          value={templateName}
          onChangeText={setTemplateName}
        />

        <Text style={styles.inputLabel}>Descrição (Opcional):</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex: Treino focado em ganho de massa muscular para iniciantes."
          placeholderTextColor={Colors.textSecondary}
          value={templateDescription}
          onChangeText={setTemplateDescription}
          multiline
        />

        <Text style={styles.inputLabel}>Categoria:</Text>
        {/* Botão para abrir o modal de categorias */}
        <TouchableOpacity
          style={styles.categorySelectButton}
          onPress={() => setIsCategoryModalVisible(true)}
        >
          <Text style={styles.categorySelectButtonText}>
            {templateCategory || 'Selecionar Categoria'}
          </Text>
          <Ionicons name="chevron-down-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Ionicons name="barbell-outline" size={22} color={Colors.primary} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Exercícios no Modelo</Text>
        </View>

        {selectedExercises.length === 0 ? (
          <View style={styles.noExercisesContainer}>
            <Ionicons name="fitness-outline" size={50} color={Colors.textSecondary} />
            <Text style={styles.noExercisesText}>Nenhum exercício adicionado ainda.</Text>
          </View>
        ) : (
          selectedExercises.map(renderSelectedExercise)
        )}

        <TouchableOpacity style={styles.addExerciseButton} onPress={openExerciseSelectionModal}>
          <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
          <Text style={styles.addExerciseButtonText}>Adicionar Exercício</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveTemplateButton} onPress={handleSaveTemplate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.cardBackground} />
          ) : (
            <Text style={styles.saveTemplateButtonText}>
              {templateId ? 'Atualizar Modelo de Treino' : 'Salvar Modelo de Treino'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Seleção de Exercícios da Biblioteca */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isExerciseSelectionModalVisible}
        onRequestClose={closeExerciseSelectionModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Biblioteca de Exercícios</Text>
              <TouchableOpacity onPress={closeExerciseSelectionModal}>
                <Ionicons name="close-circle" size={30} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar exercício..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterCategoryContainer}>
              {categoriasFiltroExercicios.map((cat) => {
                const isSelected = selectedExerciseCategoryFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterCategoryButton, isSelected && styles.filterCategoryButtonSelected]}
                    onPress={() => setSelectedExerciseCategoryFilter(cat)}
                  >
                    <Text style={[styles.filterCategoryButtonText, isSelected && styles.filterCategoryButtonTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredExercises.length === 0 ? (
              <View style={styles.noExercisesContainer}>
                <Text style={styles.noExercisesModalText}>Nenhum exercício encontrado com os filtros aplicados.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredExercises}
                keyExtractor={(item) => item.id}
                renderItem={renderExerciseLibraryItem}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para Adicionar Detalhes do Exercício */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={exerciseDetailsModalVisible}
        onRequestClose={() => {
          setExerciseDetailsModalVisible(false);
          setCurrentExerciseSets([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Exercício</Text>
              <TouchableOpacity onPress={() => {
                setExerciseDetailsModalVisible(false);
                setCurrentExerciseSets([]);
              }}>
                <Ionicons name="close-circle" size={30} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.exerciseNameInModal}>{currentExerciseToAdd?.nome_pt ?? 'Exercício'}</Text>
              
              <Text style={styles.inputLabel}>Séries Adicionadas:</Text>
              {currentExerciseSets.length === 0 ? (
                <Text style={styles.noExercisesModalText}>Nenhuma série adicionada ainda.</Text>
              ) : (
                currentExerciseSets.map((series, index) => (
                  <View key={series.setId} style={styles.selectedSeriesCard}>
                    <Text style={styles.selectedSeriesText}>Série {index + 1}: {seriesTypes[series.type].label}</Text>
                    {renderSeriesDetails(series)}
                  </View>
                ))
              )}

              <TouchableOpacity
                onPress={openAddSeriesModal}
                style={[styles.modalActionButton, { backgroundColor: Colors.info, marginTop: 10 }]}
              >
                <Text style={styles.modalActionButtonText}>Adicionar Nova Série</Text>
              </TouchableOpacity>

            </ScrollView>

            <TouchableOpacity
              onPress={addExerciseDetailsToTemplate}
              style={styles.modalActionButton}
            >
              <Text style={styles.modalActionButtonText}>Concluir e Adicionar Exercício</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Novo Modal para Adicionar Séries */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAddSeriesModalVisible}
        onRequestClose={() => setIsAddSeriesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Série</Text>
              <TouchableOpacity onPress={() => setIsAddSeriesModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={Colors.danger} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.inputLabel}>Tipo de Série:</Text>
              {/* Botão de "buttonsplit" para o tipo de série */}
              <TouchableOpacity
                style={styles.seriesTypeDropdownButton}
                onPress={() => setIsSeriesTypeDropdownVisible(!isSeriesTypeDropdownVisible)}
              >
                <Text style={styles.seriesTypeDropdownButtonText}>
                  {seriesTypes[selectedSeriesType]?.label || 'Selecionar Tipo de Série'}
                </Text>
                <Ionicons name={isSeriesTypeDropdownVisible ? "chevron-up-outline" : "chevron-down-outline"} size={20} color={Colors.primary} />
              </TouchableOpacity>

              {/* Lista de opções de tipo de série (oculta/visível) */}
              {isSeriesTypeDropdownVisible && (
                <View style={styles.seriesTypeOptionsContainer}>
                  {Object.keys(seriesTypes).map(typeKey => {
                    const type = seriesTypes[typeKey];
                    return (
                      <TouchableOpacity
                        key={typeKey}
                        style={styles.seriesTypeOptionButton}
                        onPress={() => {
                          setSelectedSeriesType(typeKey);
                          setCurrentSeriesFields({});
                          setIsSeriesTypeDropdownVisible(false); // Fecha o dropdown após a seleção
                        }}
                      >
                        <Ionicons
                          name={type.icon}
                          size={20}
                          color={Colors.primary}
                        />
                        <Text style={styles.seriesTypeOptionButtonText}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              
              <Text style={styles.inputLabel}>Detalhes da Série:</Text>
              {seriesTypes[selectedSeriesType]?.fields.map(field => (
                <TextInput
                  key={field.key}
                  style={field.multiline ? [styles.input, styles.textArea] : styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType={field.keyboardType || 'default'}
                  value={currentSeriesFields[field.key] || ''}
                  onChangeText={text => setCurrentSeriesFields(prev => ({ ...prev, [field.key]: text }))}
                  multiline={field.multiline}
                />
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={adicionarNovaSerie}
              style={styles.modalActionButton}
            >
              <Text style={styles.modalActionButtonText}>Adicionar Série</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Novo Modal para Seleção de Categorias */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCategoryModalVisible}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Categoria</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={Colors.danger} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryListItem}
                  onPress={() => {
                    setTemplateCategory(cat);
                    setIsCategoryModalVisible(false);
                  }}
                >
                  <Text style={styles.categoryListItemText}>{cat}</Text>
                  {templateCategory === cat && (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textPrimary,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 25,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categorySelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  categorySelectButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  seriesTypeDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  seriesTypeDropdownButtonText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  seriesTypeOptionsContainer: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginBottom: 15,
    padding: 10,
  },
  seriesTypeOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  seriesTypeOptionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  noExercisesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  noExercisesText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  selectedExerciseCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: Colors.secondary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedExerciseInfo: {
    flex: 1,
    marginRight: 10,
  },
  selectedExerciseName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  seriesContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  seriesCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  seriesDetailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    flexShrink: 1,
  },
  seriesNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 3,
  },
  removeExerciseButton: {
    padding: 8,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  addExerciseButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  saveTemplateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  saveTemplateButtonText: {
    color: Colors.cardBackground,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    marginBottom: 10,
  },
  filterCategoryContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  filterCategoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.textSecondary,
    marginRight: 8,
    marginBottom: 8,
  },
  filterCategoryButtonSelected: {
    backgroundColor: Colors.info,
    borderColor: Colors.info,
  },
  filterCategoryButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  filterCategoryButtonTextSelected: {
    color: Colors.cardBackground,
  },
  exerciseLibraryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  exerciseLibraryItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: 'bold',
  },
  exerciseLibraryCategoryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noExercisesModalText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  exerciseNameInModal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalActionButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalActionButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedSeriesCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedSeriesText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  categoryListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  categoryListItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
});