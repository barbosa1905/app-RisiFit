import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, StatusBar, Platform, Dimensions, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

const GlobalStyles = {
  cardShadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  }
};

const AppHeaderPersonalizado = ({ title, showBackButton, onBackPress }) => {
  return (
    <View style={headerStyles.headerContainer}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.primary}
      />
      <View style={headerStyles.headerContent}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={headerStyles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: Colors.secondaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginLeft: -24,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
    zIndex: 1,
  },
});


const DetalhesTreinoConcluidoScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { treino = {} } = route.params || {};

  if (!treino || !treino.name) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>A carregar detalhes do treino...</Text>
      </View>
    );
  }

  const dataFormatada = new Date(treino.data.toDate()).toLocaleDateString();

  return (
    <SafeAreaView style={styles.fullScreenContainer}>
      <AppHeaderPersonalizado
        title={treino.name}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="fitness-outline" size={20} color={Colors.darkGray} style={styles.icon} />
            <Text style={styles.detailText}>Categoria: {treino.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.darkGray} style={styles.icon} />
            <Text style={styles.detailText}>Data: {dataFormatada}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="timer-outline" size={20} color={Colors.primary} style={styles.icon} />
            {treino.durationInMinutes ? (
              <Text style={styles.timeText}>Duração: {treino.durationInMinutes} minutos</Text>
            ) : (
              <Text style={styles.timeText}>Tempo de treino não registrado.</Text>
            )}
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>Exercícios Realizados</Text>
        
        {treino.templateExercises.length > 0 ? (
          treino.templateExercises.map((exercicio, index) => (
            <View key={index} style={styles.exercicioCard}>
              <Text style={styles.exercicioName}>{exercicio.exerciseName}</Text>
              
              {exercicio.sets && exercicio.repsOrDuration && (
                <Text style={styles.exercicioDetail}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} /> {exercicio.sets} sets de {exercicio.repsOrDuration} {exercicio.type === 'reps' ? 'repetições' : 'segundos'}
                </Text>
              )}
              {exercicio.notes && (
                <Text style={styles.exercicioDetail}>
                  <Ionicons name="document-text-outline" size={16} color={Colors.darkGray} /> Observações: {exercicio.notes}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noExercisesText}>Nenhum exercício registrado para este treino.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.textSecondary,
  },
  content: {
    padding: 20,
    paddingTop: 10,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    ...GlobalStyles.cardShadow,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    marginRight: 10,
  },
  detailText: {
    fontSize: 16,
    color: Colors.textSecondary,
    flex: 1,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 10,
    marginBottom: 15,
  },
  exercicioCard: {
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    ...GlobalStyles.cardShadow,
  },
  exercicioName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  exercicioDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noExercisesText: {
    fontSize: 16,
    color: Colors.mediumGray,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DetalhesTreinoConcluidoScreen;