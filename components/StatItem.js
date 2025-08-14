import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Certifique-se de que está importado
import Colors from '../constants/Colors'; // Caminho relativo ajustado
import Layout from '../constants/Layout'; // Caminho relativo ajustado

// Propriedade `style` adicional para permitir estilos externos
const StatItem = ({ value, label, icon, isUnread, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {icon && <Ionicons name={icon} size={24} color={Colors.primaryDark} />}
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}></Text> {/* Texto vazio, apenas para o círculo */}
          </View>
        )}
      </View>
      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Estas são as "props" padrão, mas o 'style' do HomeScreen.js vai sobrepô-las
    // se for passado e tiver as mesmas propriedades.
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.medium,
    padding: Layout.spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.medium, // Espaçamento padrão entre itens
    // Se for 2 por linha, o HomeScreen vai passar uma largura específica.
    ...Layout.cardElevation,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Layout.spacing.small,
  },
  valueText: {
    fontSize: Layout.fontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.primaryDark, // Cor para o valor
    marginBottom: Layout.spacing.xsmall,
  },
  labelText: {
    fontSize: Layout.fontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error, // Vermelho para badge de não lido
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: { // Se quiser um número dentro do badge
    color: Colors.white,
    fontSize: Layout.fontSizes.xsmall,
    fontWeight: 'bold',
  },
});

export default StatItem;