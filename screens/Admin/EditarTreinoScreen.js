import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal, // Importar Modal
  FlatList, // Importar FlatList para a lista de exercícios na biblioteca
  ActivityIndicator, // Para indicar carregamento da biblioteca
  Image, // Para exibir imagens dos exercícios da biblioteca
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore'; // Adicionar collection e getDocs
import { db } from '../../services/firebaseConfig';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons'; // Para ícones

export default function EditarTreinoScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { clienteId, treino, reloadTreinos } = route.params;

  const [nome, setNome] = useState(treino.nome || '');
  const [categoria, setCategoria] = useState(treino.categoria || ''); // Novo campo: Categoria
  const [descricao, setDescricao] = useState(treino.descricao || ''); // Novo campo: Descrição
  const [data, setData] = useState(
    treino.data
      ? treino.data.toDate
        ? treino.data.toDate()
        : new Date(treino.data)
      : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Inicializa os exercícios, combinando templateExercises e customExercises
  // e garantindo que todos os campos necessários estejam presentes e tipados como String para TextInput
  const [exercicios, setExercicios] = useState(() => {
    const loadedExercises = [];

    // Processar templateExercises (exercícios da biblioteca)
    if (treino.templateExercises && Array.isArray(treino.templateExercises)) {
      treino.templateExercises.forEach(ex => {
        loadedExercises.push({
          exerciseId: ex.exerciseId, // ID da biblioteca (não nulo)
          imageUrl: ex.imageUrl || '',
          animationUrl: ex.animationUrl || '',
          description: ex.description || '',
          category: ex.category || '',
          targetMuscles: ex.targetMuscles || [],
          equipment: ex.equipment || [],
          exerciseName: ex.exerciseName || '',
          sets: String(ex.sets || ''),
          type: ex.type || 'reps', // Tipo (reps/tempo) do exercício da biblioteca
          repsOrDuration: String(ex.repsOrDuration || ''), // Valor (reps/tempo) do exercício da biblioteca
          rest: String(ex.rest || ''),
          notes: ex.notes || '',
        });
      });
    }

    // Processar customExercises (exercícios manuais)
    if (treino.customExercises && Array.isArray(treino.customExercises)) {
      treino.customExercises.forEach(ex => {
        loadedExercises.push({
          exerciseId: null, // ID nulo para indicar que é um exercício manual
          imageUrl: '', // Vazios para exercícios manuais
          animationUrl: '',
          description: '',
          category: '',
          targetMuscles: [],
          equipment: [],
          exerciseName: ex.exerciseName || '',
          sets: String(ex.sets || ''),
          type: ex.type || 'reps',
          repsOrDuration: String(ex.repsOrDuration || ''),
          rest: String(ex.rest || ''),
          notes: ex.notes || '',
        });
      });
    }
    return loadedExercises;
  });

  // Estados para o modal de seleção de exercícios da biblioteca
  const [isLibraryModalVisible, setIsLibraryModalVisible] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLibrary, setFilteredLibrary] = useState([]);

  useEffect(() => {
    // Filtra a biblioteca quando a query de busca muda
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = exerciseLibrary.filter(ex =>
      (ex.name && ex.name.toLowerCase().includes(lowerCaseQuery)) ||
      (ex.category && ex.category.toLowerCase().includes(lowerCaseQuery)) ||
      (ex.targetMuscles && ex.targetMuscles.some(muscle => muscle.toLowerCase().includes(lowerCaseQuery))) ||
      (ex.equipment && ex.equipment.some(eq => eq.toLowerCase().includes(lowerCaseQuery)))
    );
    setFilteredLibrary(filtered);
  }, [searchQuery, exerciseLibrary]);

  const fetchExerciseLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'exercises'));
      const exercises = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExerciseLibrary(exercises);
      setFilteredLibrary(exercises); // Inicialmente, todos os exercícios são filtrados
    } catch (error) {
      console.error("Erro ao carregar biblioteca de exercícios:", error);
      Alert.alert("Erro", "Não foi possível carregar a biblioteca de exercícios.");
    } finally {
      setLoadingLibrary(false);
    }
  };

  const onChangeData = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setData(selectedDate);
  };

  const adicionarExercicioManual = () => {
    setExercicios([
      ...exercicios,
      {
        exerciseId: null, // Indica que é um exercício manual
        exerciseName: '',
        sets: '',
        type: 'reps', // Padrão para manual
        repsOrDuration: '', // Padrão para manual
        rest: '',
        notes: '',
        imageUrl: '', // Vazios para exercícios manuais
        animationUrl: '',
        description: '',
        category: '',
        targetMuscles: [],
        equipment: [],
      },
    ]);
  };

  const adicionarExercicioDaBiblioteca = (selectedExercise) => {
    setExercicios([
      ...exercicios,
      {
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name, // Nome do exercício da biblioteca
        imageUrl: selectedExercise.imageUrl || '',
        animationUrl: selectedExercise.animationUrl || '',
        description: selectedExercise.description || '',
        category: selectedExercise.category || '',
        targetMuscles: selectedExercise.targetMuscles || [],
        equipment: selectedExercise.equipment || [],
        // Valores padrão para os campos editáveis (copiados da biblioteca)
        sets: String(selectedExercise.sets || ''), // Copia da biblioteca
        type: selectedExercise.type || 'reps', // Copia da biblioteca
        repsOrDuration: String(selectedExercise.repsOrDuration || ''), // Copia da biblioteca
        rest: String(selectedExercise.rest || ''), // Copia da biblioteca
        notes: selectedExercise.notes || '', // Copia da biblioteca
      },
    ]);
    setIsLibraryModalVisible(false); // Fecha o modal após adicionar
    setSearchQuery(''); // Limpa a busca
  };

  const atualizarExercicio = (index, campo, valor) => {
    const copia = [...exercicios];
    copia[index][campo] = valor;
    setExercicios(copia);
  };

  const removerExercicio = (index) => {
    Alert.alert('Remover exercício', 'Tem certeza que deseja remover este exercício?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          const copia = [...exercicios];
          copia.splice(index, 1);
          setExercicios(copia);
        },
      },
    ]);
  };

  const salvarTreino = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome do treino não pode estar vazio.');
      return;
    }
    if (!categoria.trim()) {
      Alert.alert('Erro', 'A categoria do treino não pode estar vazia.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Erro', 'A descrição do treino não pode estar vazia.');
      return;
    }

    // Validação dos exercícios
    for (const [i, ex] of exercicios.entries()) {
      if (!ex.exerciseName.trim()) {
        Alert.alert('Erro', `O nome do exercício ${i + 1} está vazio.`);
        return;
      }
      if (!ex.sets.trim() || isNaN(Number(ex.sets)) || Number(ex.sets) <= 0) {
        Alert.alert('Erro', `Séries inválidas no exercício ${i + 1}.`);
        return;
      }
      // Validação de tipo e valor apenas para exercícios manuais
      if (ex.exerciseId === null) {
        if (!ex.type || (ex.type !== 'reps' && ex.type !== 'tempo')) {
          Alert.alert('Erro', `Tipo inválido no exercício ${i + 1}.`);
          return;
        }
        if (!ex.repsOrDuration.trim() || isNaN(Number(ex.repsOrDuration)) || Number(ex.repsOrDuration) <= 0) {
          Alert.alert('Erro', `Valor inválido no exercício ${i + 1}.`);
          return;
        }
      }
      // Validação de descanso
      if (ex.rest.trim() !== '' && (isNaN(Number(ex.rest)) || Number(ex.rest) < 0)) {
        Alert.alert('Erro', `Tempo de descanso inválido no exercício ${i + 1}.`);
        return;
      }
      // 'notes' é opcional, não precisa de validação de preenchimento
    }

    try {
      const treinoRef = doc(db, 'users', clienteId, 'treinos', treino.id);

      // Separar exercícios em templateExercises (da biblioteca) e customExercises (manuais)
      const templateExercisesToSave = exercicios.filter(ex => ex.exerciseId !== null).map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          sets: Number(ex.sets),
          type: ex.type, // Tipo original da biblioteca
          repsOrDuration: Number(ex.repsOrDuration), // Valor original da biblioteca
          rest: Number(ex.rest || 0),
          notes: ex.notes,
          imageUrl: ex.imageUrl, // Manter detalhes da biblioteca
          animationUrl: ex.animationUrl,
          description: ex.description,
          category: ex.category,
          targetMuscles: ex.targetMuscles,
          equipment: ex.equipment,
      }));

      const customExercisesToSave = exercicios.filter(ex => ex.exerciseId === null).map(ex => ({
          exerciseName: ex.exerciseName,
          sets: Number(ex.sets),
          type: ex.type,
          repsOrDuration: Number(ex.repsOrDuration),
          rest: Number(ex.rest || 0),
          notes: ex.notes,
      }));

      await updateDoc(treinoRef, {
        nome: nome.trim(),
        categoria: categoria.trim(),
        descricao: descricao.trim(),
        data,
        templateExercises: templateExercisesToSave,
        customExercises: customExercisesToSave,
      });

      Alert.alert('Sucesso', 'Treino atualizado!');
      if (reloadTreinos) reloadTreinos();
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar treino.');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Nome do Treino</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Nome do treino"
      />

      <Text style={styles.label}>Categoria</Text>
      <TextInput
        style={styles.input}
        value={categoria}
        onChangeText={setCategoria}
        placeholder="Ex: Força, Cardio, Flexibilidade"
      />

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        style={styles.inputMultiLine}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descrição detalhada do treino"
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Data do Treino</Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePicker}>
        <Text>{data.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={data}
          mode="date"
          display="default"
          onChange={onChangeData}
          minimumDate={new Date()}
        />
      )}

      <Text style={[styles.label, { marginTop: 20 }]}>Exercícios</Text>

      {exercicios.map((exercicio, index) => (
        <View key={index} style={styles.exercicioCard}>
          <Text style={styles.exercicioCardTitle}>
            {exercicio.exerciseName || 'Novo Exercício'}
            {exercicio.exerciseId ? ' (Da Biblioteca)' : ' (Personalizado)'}
          </Text>

          {exercicio.imageUrl ? (
            <Image source={{ uri: exercicio.imageUrl }} style={styles.exercicioImage} resizeMode="contain" />
          ) : null}

          {exercicio.description ? (
            <Text style={styles.exercicioDetailText}>Descrição: {exercicio.description}</Text>
          ) : null}
          {exercicio.category ? (
            <Text style={styles.exercicioDetailText}>Categoria: {exercicio.category}</Text>
          ) : null}
          {exercicio.targetMuscles && exercicio.targetMuscles.length > 0 ? (
            <Text style={styles.exercicioDetailText}>Músculos: {exercicio.targetMuscles.join(', ')}</Text>
          ) : null}
          {exercicio.equipment && exercicio.equipment.length > 0 ? (
            <Text style={styles.exercicioDetailText}>Equipamento: {exercicio.equipment.join(', ')}</Text>
          ) : null}

          {/* Nome do exercício: Editável apenas se for personalizado */}
          <TextInput
            style={[styles.input, exercicio.exerciseId !== null && styles.inputDisabled]}
            placeholder="Nome do exercício"
            value={exercicio.exerciseName}
            onChangeText={(text) => atualizarExercicio(index, 'exerciseName', text)}
            editable={exercicio.exerciseId === null}
          />

          {/* Séries e Descanso: Sempre editáveis */}
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Séries"
              keyboardType="numeric"
              value={exercicio.sets}
              onChangeText={(text) => atualizarExercicio(index, 'sets', text)}
            />
            <TextInput
              style={[styles.input, styles.smallInput]}
              placeholder="Descanso (segundos)"
              keyboardType="numeric"
              value={exercicio.rest}
              onChangeText={(text) => atualizarExercicio(index, 'rest', text)}
            />
          </View>

          {/* Repetições/Tempo e Valor: Visíveis e editáveis APENAS para exercícios personalizados */}
          {exercicio.exerciseId === null ? (
            <>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.tipoOption,
                    exercicio.type === 'reps' && styles.tipoSelecionado,
                  ]}
                  onPress={() => atualizarExercicio(index, 'type', 'reps')}
                >
                  <Text
                    style={[
                      styles.tipoTexto,
                      exercicio.type === 'reps' && styles.tipoTextoSelecionado,
                    ]}
                  >
                    Repetições
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tipoOption,
                    exercicio.type === 'tempo' && styles.tipoSelecionado,
                  ]}
                  onPress={() => atualizarExercicio(index, 'type', 'tempo')}
                >
                  <Text
                    style={[
                      styles.tipoTexto,
                      exercicio.type === 'tempo' && styles.tipoTextoSelecionado,
                    ]}
                  >
                    Tempo
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder={
                  exercicio.type === 'tempo'
                    ? 'Tempo em segundos'
                    : 'Quantidade de repetições'
                }
                value={exercicio.repsOrDuration}
                onChangeText={(text) => atualizarExercicio(index, 'repsOrDuration', text)}
              />
            </>
          ) : (
            // Para exercícios da biblioteca, exibir como texto fixo
            <Text style={styles.exercicioDetailText}>
              {exercicio.repsOrDuration} {exercicio.type === 'reps' ? 'repetições' : 'segundos'}
            </Text>
          )}

          {/* Observações: Sempre editável */}
          <TextInput
            style={styles.inputMultiLine}
            placeholder="Observações para este exercício (opcional)"
            multiline
            numberOfLines={3}
            value={exercicio.notes}
            onChangeText={(text) => atualizarExercicio(index, 'notes', text)}
          />

          <TouchableOpacity
            style={styles.removerBtn}
            onPress={() => removerExercicio(index)}
          >
            <Text style={{ color: 'white' }}>Remover</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.addExerciseButton} onPress={adicionarExercicioManual}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.addExerciseButtonText}>Adicionar Exercício Manual</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addExerciseButton} onPress={() => {
        fetchExerciseLibrary(); // Carrega a biblioteca ao abrir o modal
        setIsLibraryModalVisible(true);
      }}>
        <Ionicons name="library-outline" size={24} color="#fff" />
        <Text style={styles.addExerciseButtonText}>Adicionar da Biblioteca</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 30 }}>
        <Button title="Salvar Treino" onPress={salvarTreino} color="#d0a956" />
      </View>

      {/* Modal de Seleção da Biblioteca de Exercícios */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isLibraryModalVisible}
        onRequestClose={() => setIsLibraryModalVisible(false)}
      >
        <View style={styles.libraryModalOverlay}>
          <View style={styles.libraryModalContent}>
            <Text style={styles.libraryModalTitle}>Selecionar Exercício da Biblioteca</Text>
            <TextInput
              style={styles.librarySearchInput}
              placeholder="Pesquisar exercícios..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {loadingLibrary ? (
              <ActivityIndicator size="large" color="#d0a956" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredLibrary}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.libraryExerciseItem}
                    onPress={() => adicionarExercicioDaBiblioteca(item)}
                  >
                    <Text style={styles.libraryExerciseName}>{item.name}</Text>
                    {item.category ? <Text style={styles.libraryExerciseDetail}>Categoria: {item.category}</Text> : null}
                    {item.targetMuscles && item.targetMuscles.length > 0 ? (
                      <Text style={styles.libraryExerciseDetail}>Músculos: {item.targetMuscles.join(', ')}</Text>
                    ) : null}
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.libraryExerciseImage} resizeMode="contain" />
                    ) : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.noDataText}>Nenhum exercício encontrado.</Text>}
              />
            )}
            <TouchableOpacity
              style={styles.libraryModalCloseButton}
              onPress={() => {
                setIsLibraryModalVisible(false);
                setSearchQuery(''); // Limpa a busca ao fechar
              }}
            >
              <Text style={styles.libraryModalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  label: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 16,
    color: '#111827',
  },
  input: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    marginBottom: 12,
    color: '#111827', // Cor do texto para inputs normais
  },
  inputDisabled: { // Novo estilo para inputs desabilitados
    backgroundColor: '#f0f0f0',
    color: '#6b7280', // Cor do texto para inputs desabilitados
  },
  inputMultiLine: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#111827',
  },
  datePicker: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  exercicioCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  exercicioCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  exercicioImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  exercicioDetailText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderRadius: 8,
    borderColor: '#d0a956',
    borderWidth: 1,
    color: '#111827',
  },
  removerBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  tipoOption: {
    flex: 1,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  tipoSelecionado: {
    backgroundColor: '#d0a956',
  },
  tipoTexto: {
    color: '#1f2937',
    fontWeight: '500',
  },
  tipoTextoSelecionado: {
    color: 'white',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    elevation: 2,
  },
  addExerciseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Estilos para o Modal da Biblioteca
  libraryModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  libraryModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  libraryModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
    textAlign: 'center',
  },
  librarySearchInput: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  libraryExerciseItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fdfdfd',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  libraryExerciseName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  libraryExerciseDetail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  libraryExerciseImage: {
    width: '100%',
    height: 100,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: '#e0e0e0',
  },
  libraryModalCloseButton: {
    marginTop: 20,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  libraryModalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
});
