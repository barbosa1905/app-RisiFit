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
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdLoggedIn } from '../../services/authService';
import { salvarTreinoConcluido } from '../../services/userService';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import Colors from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const seriesTypes = {
  reps_and_load: { label: 'Repetições e carga', fields: ['reps', 'peso', 'descanso'] },
  reps_load_time: { label: 'Repetições, carga e tempo', fields: ['reps', 'peso', 'tempo', 'descanso'] },
  reps_and_time: { label: 'Repetições e tempo', fields: ['reps', 'tempo', 'descanso'] },
  time_and_incline: { label: 'Tempo e inclinação', fields: ['tempo', 'inclinacao', 'descanso'] },
  running: { label: 'Corrida', fields: ['distancia', 'tempo', 'ritmo', 'descanso'] },
  notes: { label: 'Observações', fields: ['notas'] },
  cadence: { label: 'Cadência', fields: ['cadencia', 'descanso'] },
  split_series: { label: 'Série Split', fields: ['reps', 'peso', 'descanso'] },
};

const seriesFieldLabels = {
  reps: 'Repetições',
  peso: 'Carga',
  tempo: 'Tempo',
  inclinacao: 'Inclinação',
  distancia: 'Distância',
  ritmo: 'Ritmo',
  descanso: 'Descanso',
  notas: 'Notas',
  cadencia: 'Cadência',
};

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
  const [exercisesCompleted, setExercisesCompleted] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchExerciseDetails = async () => {
      setLoadingExercisesDetails(true);
      const exercisesInTreino = treino.templateExercises || treino.customExercises || [];
      const fetchedDetails = [];
      const exerciseIds = exercisesInTreino.map(ex => ex.exerciseId).filter(Boolean);

      const exerciseDocs = await Promise.all(exerciseIds.map(id => getDoc(doc(db, 'exercises', id))));
      const exerciseDataMap = new Map(exerciseDocs.filter(doc => doc.exists()).map(doc => [doc.id, doc.data()]));

      for (const ex of exercisesInTreino) {
        const docData = exerciseDataMap.get(ex.exerciseId) || {};
        
        // CORREÇÃO CRÍTICA AQUI: LER O CAMPO 'sets' em vez de 'setDetails'
        const setsData = ex.sets || [];

        const exerciseDetail = {
          ...docData,
          ...ex,
          id: ex.exerciseId || '',
          exerciseName: ex.exerciseName || docData.nome_pt || 'Exercício Personalizado',
          description: ex.description || docData.descricao_breve || '',
          category: ex.category || docData.category || '',
          targetMuscles: ex.targetMuscles || (docData.musculos_alvo ? docData.musculos_alvo.map(m => m.name || m.id).filter(Boolean) : []),
          equipment: ex.equipment || docData.equipment || [],
          // ATUALIZAR ESTA LINHA PARA USAR setsData
          sets: setsData,
          notes: ex.notes || '',
          completed: false,
        };
        fetchedDetails.push(exerciseDetail);
      }
      
      console.log('Dados detalhados dos exercícios:', fetchedDetails);
      setDetailedExercises(fetchedDetails);
      setLoadingExercisesDetails(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    };

    if (treino) {
      fetchExerciseDetails();
    }
  }, [treino, fadeAnim]);

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
    setExercisesCompleted(0);
    setDetailedExercises(detailedExercises.map(ex => ({ ...ex, completed: false })));
  };

  const openAnimationModal = (url) => {
    setCurrentAnimationUrl(url);
    setIsAnimationModalVisible(true);
  };

  const closeAnimationModal = () => {
    setIsAnimationModalVisible(false);
    setCurrentAnimationUrl('');
  };

  const toggleExerciseCompleted = (index) => {
    const newExercises = [...detailedExercises];
    const exercise = newExercises[index];
    exercise.completed = !exercise.completed;

    if (exercise.completed) {
      setExercisesCompleted(prev => prev + 1);
    } else {
      setExercisesCompleted(prev => prev - 1);
    }
    setDetailedExercises(newExercises);
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

      const chaveAsyncStorage = `treinosConcluidos_${userId}`;
      const dadosAtuaisJson = await AsyncStorage.getItem(chaveAsyncStorage);
      const dadosAtuais = dadosAtuaisJson ? JSON.parse(dadosAtuaisJson) : {};
      dadosAtuais[treino.id] = { completed: true, duration: tempo };
      await AsyncStorage.setItem(chaveAsyncStorage, JSON.stringify(dadosAtuais));

      await salvarTreinoConcluido(
        userId,
        treino,
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

  const renderSetDetail = (set, type) => {
    const detailText = [];
    const fields = seriesTypes[type]?.fields || [];

    fields.forEach(field => {
      // Usar 'type' do objeto set para compatibilidade com o CriarTreinosScreen.js
      if (set[field]) {
        const label = seriesFieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1);
        detailText.push(`${label}: ${set[field]}`);
      }
    });

    return detailText.join(' | ');
  };

  const progress = detailedExercises.length > 0 ? (exercisesCompleted / detailedExercises.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.background, Colors.surface]}
        style={styles.gradientBackground}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.primaryDark} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.titulo}>{String(treino.nome)}</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground} />
          <Animated.View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>

        <ScrollView style={styles.scrollView}>
          <Animated.View style={[styles.scrollContentContainer, { opacity: fadeAnim }]}>
            <View style={styles.infoCard}>
              <Text style={styles.subtitulo}>{String(treino.categoria)}</Text>
              <Text style={styles.descricao}>{String(treino.descricao)}</Text>
            </View>

            <View style={styles.exercisesSection}>
              <Text style={styles.sectionTitle}>Exercícios</Text>
              {loadingExercisesDetails ? (
                <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 20 }} />
              ) : (
                detailedExercises.length > 0 ? (
                  detailedExercises.map((ex, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.exercicioCard, ex.completed && styles.exercicioCardCompleted]}
                      onPress={() => toggleExerciseCompleted(idx)}
                    >
                      <View style={styles.exercicioHeader}>
                        <Text style={styles.exercicioNome}>
                          {`${idx + 1}. ${String(ex.exerciseName)}`}
                        </Text>
                        {ex.animationUrl && (
                          <TouchableOpacity
                            onPress={() => openAnimationModal(ex.animationUrl)}
                            style={styles.animationIcon}
                          >
                            <Ionicons name="play-circle-outline" size={30} color={Colors.primaryLight} />
                          </TouchableOpacity>
                        )}
                      </View>
                      {ex.imageUrl ? (
                        <Image
                          source={{ uri: ex.imageUrl }}
                          style={styles.exercicioImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      {ex.description ? (
                        <Text style={styles.exercicioDescription}>{ex.description}</Text>
                      ) : null}
                      {/* ALTERAR ESTA CONDIÇÃO PARA USAR A NOVA PROPRIEDADE 'sets' */}
                      {ex.sets && ex.sets.length > 0 && (
                        <View style={styles.seriesContainer}>
                          <Text style={styles.seriesTitle}>Séries:</Text>
                          {ex.sets.map((set, setIndex) => (
                            <View key={setIndex} style={styles.setCard}>
                              {/* USAR set.type para obter o rótulo */}
                              <Text style={styles.setCardTitle}>
                                {seriesTypes[set.type]?.label || 'Série Personalizada'} {setIndex + 1}
                              </Text>
                              {/* USAR set.type para obter o detalhe correto */}
                              <Text style={styles.setDetailText}>{renderSetDetail(set, set.type)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {ex.completed && (
                        <View style={styles.completedOverlay}>
                          <Ionicons name="checkmark-circle-outline" size={50} color={Colors.success} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.semExercicios}>Nenhum exercício cadastrado.</Text>
                )
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={concluirTreino} style={styles.botaoConcluir}>
            <Ionicons name="checkmark-circle-outline" size={24} color={Colors.secondaryDark} />
            <Text style={styles.botaoTextoConcluir}>Concluir Treino</Text>
          </TouchableOpacity>
          <View style={styles.timerControlContainer}>
            <Text style={styles.tempo}>{formatarTempo(tempo)}</Text>
            <View style={styles.timerButtonRow}>
              <TouchableOpacity style={[styles.botao, styles.botaoIniciar]} onPress={iniciarTreino} disabled={emExecucao}>
                <Ionicons name="play" size={24} color={Colors.surface} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botao, styles.botaoPausar]} onPress={pausarTreino} disabled={!emExecucao}>
                <Ionicons name="pause" size={24} color={Colors.surface} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botao, styles.botaoResetar]} onPress={resetarTreino}>
                <Ionicons name="refresh" size={24} color={Colors.surface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
                  source={{
                    html: `
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
                    `
                  }}
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
                      color={star <= workoutRating ? Colors.accent : Colors.secondaryLight}
                      style={styles.starIcon}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.feedbackModalSubtitle}>Observações (Opcional):</Text>
              <TextInput
                style={styles.observationInput}
                placeholder="Ex: Treino desafiador, gostei dos exercícios de perna."
                placeholderTextColor={Colors.secondaryLight}
                multiline
                numberOfLines={4}
                value={workoutObservation}
                onChangeText={setWorkoutObservation}
              />
              <View style={styles.feedbackModalButtons}>
                <TouchableOpacity
                  style={[styles.feedbackButton, { backgroundColor: Colors.error }]}
                  onPress={() => setFeedbackModalVisible(false)}
                >
                  <Text style={styles.feedbackButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.feedbackButton, { backgroundColor: Colors.success }]}
                  onPress={handleSendFeedback}
                >
                  <Text style={styles.feedbackButtonText}>Enviar Feedback</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    zIndex: 1,
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 50,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 5,
    width: '100%',
    backgroundColor: Colors.background,
  },
  progressBarBackground: {
    height: 5,
    width: '100%',
    backgroundColor: Colors.secondaryLight,
    position: 'absolute',
    borderRadius: 5,
  },
  progressBar: {
    height: 5,
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  subtitulo: {
    fontSize: 18,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  descricao: {
    fontSize: 16,
    color: Colors.secondaryLight,
    textAlign: 'center',
  },
  exercisesSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
    color: Colors.secondaryDark,
  },
  exercicioCard: {
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  exercicioCardCompleted: {
    borderColor: Colors.success,
    backgroundColor: '#F0F9F5',
  },
  completedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercicioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exercicioNome: {
    fontSize: 19,
    fontWeight: '600',
    color: Colors.primary,
    flexShrink: 1,
  },
  animationIcon: {
    padding: 5,
  },
  exercicioDescription: {
    fontSize: 14,
    color: Colors.secondaryLight,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  exercicioImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: Colors.background,
  },
  seriesContainer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.background,
  },
  seriesTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.secondaryDark,
    marginBottom: 10,
  },
  setCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  setCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondaryDark,
    marginBottom: 5,
  },
  setDetailText: {
    fontSize: 14,
    color: Colors.secondaryLight,
  },
  semExercicios: {
    fontStyle: 'italic',
    color: Colors.secondaryLight,
    textAlign: 'center',
    marginTop: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  botaoConcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 15,
  },
  botaoTextoConcluir: {
    color: Colors.secondaryDark,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  timerControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  tempo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
    flex: 1,
    textAlign: 'center',
  },
  timerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: 5,
    elevation: 5,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  botaoIniciar: {
    backgroundColor: Colors.success,
  },
  botaoPausar: {
    backgroundColor: Colors.warning,
  },
  botaoResetar: {
    backgroundColor: Colors.error,
  },
  animationModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  animationModalContent: {
    backgroundColor: Colors.secondaryDark,
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
    backgroundColor: Colors.secondaryDark,
  },
  noAnimationText: {
    color: Colors.surface,
    fontSize: 18,
    textAlign: 'center',
  },
  animationModalCloseButton: {
    marginTop: 15,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  animationModalCloseButtonText: {
    color: Colors.secondaryDark,
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
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 25,
    width: '90%',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  feedbackModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primaryDark,
    marginBottom: 10,
  },
  feedbackModalSubtitle: {
    fontSize: 16,
    color: Colors.secondaryDark,
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
    borderColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 10,
    width: '100%',
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: Colors.secondary,
    marginBottom: 20,
    backgroundColor: Colors.background,
  },
  feedbackModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 3,
  },
  feedbackButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});