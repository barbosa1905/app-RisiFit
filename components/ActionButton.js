// components/ActionButton.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import Layout from '../constants/Layout';

const ActionButton = ({ icon, text, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={30} color={Colors.secondary} style={styles.icon} />
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: Layout.isSmallDevice ? 90 : 100, // Largura fixa ou responsiva
    height: Layout.isSmallDevice ? 90 : 100, // Altura fixa ou responsiva
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.medium, // Espaçamento entre os botões na ScrollView horizontal
    ...Layout.cardElevation,
  },
  icon: {
    marginBottom: Layout.spacing.xsmall,
  },
  buttonText: {
    fontSize: Layout.fontSizes.small,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Layout.spacing.xsmall / 2, // Ajuste fino
  },
});

export default ActionButton;