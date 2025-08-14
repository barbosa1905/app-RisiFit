import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'; // Assumindo que você usa MaterialCommunityIcons aqui
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';

const TrainingCard = ({ type, training, formatarDuracao }) => {
  const isUpcoming = type === 'upcoming';
  const iconName = isUpcoming ? "calendar-outline" : "checkmark-done-circle-outline";
  const iconColor = isUpcoming ? Colors.secondary : Colors.success;
  const borderColor = isUpcoming ? Colors.secondaryLight : Colors.successLight;

  return (
    <View style={[styles.cardContainer, { borderColor: borderColor }]}>
      <View style={styles.header}>
        <Ionicons name={iconName} size={24} color={iconColor} />
        <Text style={styles.title}>{training.nome || 'Treino Sem Nome'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.detailText}>Cliente: {training.clientName || 'N/A'}</Text>
      </View>
      {isUpcoming ? (
        <>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-sharp" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>Data: {training.data ? training.data.toLocaleDateString('pt-PT') : 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>Hora: {training.data ? training.data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
  <Ionicons name="pricetag-outline" size={16} color={Colors.textSecondary} /> 
  <Text style={styles.detailText}>Categoria: {training.categoria || 'N/A'}</Text> 
</View>
        </>
      ) : (
        <>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-sharp" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>Concluído em: {training.dataConclusao ? training.dataConclusao.toLocaleDateString('pt-PT') : 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="barbell-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>Tipo: {training.tipo || 'N/A'}</Text>
          </View>
          {training.avaliacao !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="star" size={16} color={Colors.accent} />
              <Text style={styles.detailText}>Avaliação: {training.avaliacao}/5</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.cardBackground,
    padding: Layout.spacing.medium,
    marginVertical: Layout.spacing.small, // Espaçamento interno entre cards se não usar separador
    borderRadius: Layout.borderRadius.medium,
    borderLeftWidth: 5, // Uma borda esquerda para diferenciar
    // Removendo sombra daqui se o parent card já tem
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.small,
  },
  title: {
    fontSize: Layout.fontSizes.large,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginLeft: Layout.spacing.small,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.xsmall,
  },
  detailText: {
    fontSize: Layout.fontSizes.medium,
    color: Colors.textSecondary,
    marginLeft: Layout.spacing.small,
  },
});

export default TrainingCard;