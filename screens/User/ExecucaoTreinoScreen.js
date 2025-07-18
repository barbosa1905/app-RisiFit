import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdLoggedIn } from '../../services/authService';
import { salvarTreinoConcluido } from '../../services/userService'; 
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function ExecucaoTreinoScreen({ route, navigation }) {
  const { treino } = route.params;
  const [tempo, setTempo] = useState(0);
  const [emExecucao, setEmExecucao] = useState(false);
  const timerRef = useRef(null);

  const [isAnimationModalVisible, setIsAnimationModalVisible] = useState(false);
  const [currentAnimationUrl, setCurrentAnimationUrl] = useState('');

  const [detailedExercises, setDetailedExercises] = useState([]);
  const [loadingExercisesDetails, setLoadingExercisesDetails] = useState(true);

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [workoutRating, setWorkoutRating] = useState(0);
  const [workoutObservation, setWorkoutObservation] = useState('');

  useEffect(() => {
    const fetchExerciseDetails = async () => {
      setLoadingExercisesDetails(true);
      const exercisesInTreino = treino.templateExercises || treino.customExercises || [];
      const fetchedDetails = [];

      for (const ex of exercisesInTreino) {
        if (ex.exerciseId) {
          try {
            const exerciseDocRef = doc(db, 'exercises', ex.exerciseId);
            const exerciseDocSnap = await getDoc(exerciseDocRef);
            if (exerciseDocSnap.exists()) {
              fetchedDetails.push({
                ...exerciseDocSnap.data(),
                ...ex,
                id: ex.exerciseId,
                exerciseName: ex.exerciseName || exerciseDocSnap.data().name,
                repsOrDuration: ex.repsOrDuration || ex.valor,
              });
            } else {
              console.warn(`Exercício com ID ${ex.exerciseId} não encontrado na biblioteca. Exibindo dados parciais.`);
              fetchedDetails.push({
                ...ex,
                exerciseName: ex.exerciseName || 'Exercício Desconhecido',
                repsOrDuration: ex.repsOrDuration || ex.valor,
              });
            }
          } catch (error) {
            console.error(`Erro ao buscar detalhes do exercício ${ex.exerciseId}:`, error);
            fetchedDetails.push({
              ...ex,
              exerciseName: ex.exerciseName || 'Exercício Desconhecido',
              repsOrDuration: ex.repsOrDuration || ex.valor,
            });
          }
        } else {
          fetchedDetails.push({
            ...ex,
            exerciseName: ex.exerciseName || 'Exercício Personalizado',
            repsOrDuration: ex.repsOrDuration || ex.valor,
          });
        }
      }
      setDetailedExercises(fetchedDetails);
      setLoadingExercisesDetails(false);
    };

    if (treino) {
      fetchExerciseDetails();
    }
  }, [treino]);

  useEffect(() => {
    if (emExecucao) {
      timerRef.current = setInterval(() => setTempo((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [emExecucao]);

  const formatarTempo = (totalSegundos) => {
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (horas === 0) {
      return `${pad(min)}:${pad(seg)}`;
    }
    return `${pad(horas)}:${pad(min)}:${pad(seg)}`;
  };

  const iniciarTreino = () => {
    setEmExecucao(true);
  };

  const pausarTreino = () => {
    setEmExecucao(false);
  };

  const resetarTreino = () => {
    setEmExecucao(false);
    setTempo(0);
  };

  const openAnimationModal = (url) => {
    setCurrentAnimationUrl(url);
    setIsAnimationModalVisible(true);
  };

  const closeAnimationModal = () => {
    setIsAnimationModalVisible(false);
    setCurrentAnimationUrl('');
  };

  const concluirTreino = async () => {
    pausarTreino();

    Alert.alert(
      'Concluir Treino',
      `Deseja realmente concluir o treino "${String(treino.nome)}" com duração de ${formatarTempo(tempo)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => iniciarTreino(),
        },
        {
          text: 'Concluir',
          onPress: () => {
            setFeedbackModalVisible(true);
          },
        },
      ]
    );
  };

  const handleSendFeedback = async () => {
    if (!treino.id) {
      Alert.alert('Erro', 'ID do treino não encontrado. Não foi possível registar o feedback.');
      return;
    }

    try {
      const userId = await getUserIdLoggedIn();
      if (!userId) {
        Alert.alert('Erro', 'Utilizador não autenticado.');
        return;
      }

      // Atualiza o AsyncStorage com o status de conclusão
      const chaveAsyncStorage = `treinosConcluidos_${userId}`;
      const dadosAtuaisJson = await AsyncStorage.getItem(chaveAsyncStorage);
      const dadosAtuais = dadosAtuaisJson ? JSON.parse(dadosAtuaisJson) : {};
      dadosAtuais[treino.id] = { completed: true, duration: tempo }; 
      await AsyncStorage.setItem(chaveAsyncStorage, JSON.stringify(dadosAtuais));
      console.log(`✅ Treino ID ${treino.id} marcado como concluído no AsyncStorage.`);

      // *** CORREÇÃO AQUI: Passa o objeto treino completo para salvarTreinoConcluido ***
      await salvarTreinoConcluido(
        userId,
        treino, // Passa o objeto treino completo, como esperado pela função em userService.js
        tempo,
        workoutRating,
        workoutObservation
      );

      Alert.alert('Sucesso', 'Treino concluído e feedback registado!');
      setFeedbackModalVisible(false);
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar treino concluído e feedback:', error);
      Alert.alert('Erro', 'Não foi possível registar o treino e o feedback. Tente novamente.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>{String(treino.nome)}</Text>
      <Text style={styles.subtitulo}>{String(treino.categoria)}</Text>
      <Text style={styles.descricao}>{String(treino.descricao)}</Text>

      <View style={styles.tempoContainer}>
        <Text style={styles.tempo}>{formatarTempo(tempo)}</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.botao,
              styles.botaoIniciar,
              emExecucao && styles.botaoDesabilitado,
            ]}
            onPress={iniciarTreino}
            disabled={emExecucao}
          >
            <Text style={styles.botaoTexto}>Iniciar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.botao,
              styles.botaoPausar,
              !emExecucao && styles.botaoDesabilitado,
            ]}
            onPress={pausarTreino}
            disabled={!emExecucao}
          >
            <Text style={styles.botaoTexto}>Pausar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botao, styles.botaoResetar]}
            onPress={resetarTreino}
          >
            <Text style={styles.botaoTexto}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.exerciciosTitulo}>Exercícios</Text>

      {loadingExercisesDetails ? (
        <ActivityIndicator size="large" color="#eab308" style={{ marginTop: 20 }} />
      ) : (
        detailedExercises.length > 0 ? (
          detailedExercises.map((ex, idx) => (
            <View key={idx} style={styles.exercicioCard}>
              <Text style={styles.exercicioNome}>{String(ex.exerciseName)}</Text>
              <Text style={styles.exercicioTipo}>
                {ex.sets ? `${String(ex.sets)} séries de ` : ''}
                {ex.repsOrDuration} {ex.tipo === 'reps' ? 'repetições' : 'segundos'}
              </Text>
              {ex.rest ? (
                <Text style={styles.exercicioDetail}>Descanso: {ex.rest}</Text>
              ) : null}
              {ex.notes ? (
                <Text style={styles.exercicioDetail}>Notas: {ex.notes}</Text>
              ) : null}
              {ex.description ? (
                <Text style={styles.exercicioDescription}>{ex.description}</Text>
              ) : null}
              {ex.category ? (
                <Text style={styles.exercicioDetail}>Categoria: {ex.category}</Text>
              ) : null}
              {ex.targetMuscles && ex.targetMuscles.length > 0 ? (
                <Text style={styles.exercicioDetail}>Músculos: {ex.targetMuscles.join(', ')}</Text>
              ) : null}
              {ex.equipment && ex.equipment.length > 0 ? (
                <Text style={styles.exercicioDetail}>Equipamento: {ex.equipment.join(', ')}</Text>
              ) : null}

              {ex.imageUrl ? (
                <Image
                  source={{ uri: ex.imageUrl }}
                  style={styles.exercicioImage}
                  resizeMode="contain"
                  onError={(e) => console.log('Erro ao carregar imagem do exercício:', e.nativeEvent.error, ex.imageUrl)}
                />
              ) : null}

              {ex.animationUrl ? (
                <TouchableOpacity
                  style={styles.animationButton}
                  onPress={() => openAnimationModal(ex.animationUrl)}
                >
                  <Ionicons name="play-circle-outline" size={24} color="#fff" />
                  <Text style={styles.animationButtonText}>Ver Animação</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.semExercicios}>Nenhum exercício cadastrado.</Text>
        )
      )}

      <TouchableOpacity style={styles.botaoConcluir} onPress={concluirTreino}>
        <Text style={styles.botaoTexto}>Concluir Treino</Text>
      </TouchableOpacity>

      {/* Modal de Animação */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAnimationModalVisible}
        onRequestClose={closeAnimationModal}
      >
        <View style={styles.animationModalOverlay}>
          <View style={styles.animationModalContent}>
            {currentAnimationUrl ? (
              <WebView
                source={{ html: `
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                      body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: black; overflow: hidden; }
                      img, video { max-width: 100%; max-height: 100%; object-fit: contain; }
                    </style>
                  </head>
                  <body>
                    ${currentAnimationUrl.endsWith('.gif') ?
                      `<img src="${currentAnimationUrl}" loop autoplay>` :
                      `<video src="${currentAnimationUrl}" autoplay loop controls style="width:100%; height:100%;"></video>`
                    }
                  </body>
                  </html>
                `}}
                style={styles.webView}
                allowsFullscreenVideo={true}
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                containerStyle={{ width: width * 0.9, height: height * 0.6 }}
              />
            ) : (
              <Text style={styles.noAnimationText}>Nenhuma animação disponível.</Text>
            )}
            <TouchableOpacity onPress={closeAnimationModal} style={styles.animationModalCloseButton}>
              <Text style={styles.animationModalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Feedback do Treino */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.feedbackModalOverlay}>
          <View style={styles.feedbackModalContent}>
            <Text style={styles.feedbackModalTitle}>Avalie o Treino</Text>
            <Text style={styles.feedbackModalSubtitle}>Como foi o seu treino?</Text>

            <View style={styles.starRatingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setWorkoutRating(star)}>
                  <MaterialCommunityIcons
                    name={star <= workoutRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= workoutRating ? '#FFD700' : '#ccc'}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.feedbackModalSubtitle}>Observações (Opcional):</Text>
            <TextInput
              style={styles.observationInput}
              placeholder="Ex: Treino desafiador, gostei dos exercícios de perna."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={workoutObservation}
              onChangeText={setWorkoutObservation}
            />

            <View style={styles.feedbackModalButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonCancel]}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={styles.feedbackButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.feedbackButtonSubmit]}
                onPress={handleSendFeedback}
              >
                <Text style={styles.feedbackButtonText}>Enviar Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f1f5f9',
    flexGrow: 1,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 18,
    color: '#3b82f6',
    marginBottom: 4,
    textAlign: 'center',
  },
  descricao: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  tempoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  tempo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#eab308',
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 3,
    minWidth: 100,
    alignItems: 'center',
  },
  botaoIniciar: {
    backgroundColor: '#2563eb',
  },
  botaoPausar: {
    backgroundColor: '#f87171',
  },
  botaoResetar: {
    backgroundColor: '#64748b',
  },
  botaoDesabilitado: {
    opacity: 0.5,
  },
  botaoConcluir: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    elevation: 2,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciciosTitulo: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
    color: '#0f172a',
  },
  exercicioCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  exercicioNome: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 5,
  },
  exercicioTipo: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8,
  },
  exercicioDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  exercicioDetail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  exercicioImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  animationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  animationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  semExercicios: {
    fontStyle: 'italic',
    color: '#6b7280',
    textAlign: 'center',
  },
  animationModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  animationModalContent: {
    backgroundColor: '#000',
    borderRadius: 15,
    width: '95%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  webView: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  noAnimationText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  animationModalCloseButton: {
    marginTop: 15,
    backgroundColor: '#eab308',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  animationModalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  feedbackModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  feedbackModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  feedbackModalSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 15,
    textAlign: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  observationInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  feedbackModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  feedbackButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 3,
  },
  feedbackButtonCancel: {
    backgroundColor: '#ef4444',
  },
  feedbackButtonSubmit: {
    backgroundColor: '#10b981',
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
