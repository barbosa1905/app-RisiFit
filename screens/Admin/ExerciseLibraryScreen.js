import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput, // Já importado, mas importante para a barra de pesquisa
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Paleta de Cores Refinada (mantida consistente com Admin/HomeScreen)
const Colors = {
  primaryGold: '#D4AF37',   // Ouro mais clássico
  darkBrown: '#3E2723',     // Marrom bem escuro, quase preto
  lightBrown: '#795548',    // Marrom mais suave
  creamBackground: '#FDF7E4', // Fundo creme claro
  white: '#FFFFFF',
  lightGray: '#ECEFF1',     // Cinza muito claro
  mediumGray: '#B0BEC5',    // Cinza médio para textos secundários
  darkGray: '#424242',      // Cinza escuro para textos principais
  accentBlue: '#2196F3',    // Azul vibrante para links/botões
  successGreen: '#4CAF50',  // Verde para sucesso
  errorRed: '#F44336',      // Vermelho para erros/alertas
  inputBorder: '#B0BEC5',   // Cor da borda do input
};

// Categorias e Músculos de Exemplo (pode expandir conforme necessário)
const EXERCISE_CATEGORIES = ['Força', 'Cardio', 'Flexibilidade', 'HIIT', 'Funcional'];
const TARGET_MUSCLES = ['Peito', 'Costas', 'Ombros', 'Braços', 'Pernas', 'Abdómen', 'Glúteos', 'Corpo Inteiro'];
const EQUIPMENT_OPTIONS = ['Halters', 'Barras', 'Máquinas', 'Peso Corporal', 'Bandas de Resistência', 'Corda de Saltar', 'Kettlebell', 'Outro', 'Nenhum', 'Banco', 'Barra Fixa', 'Paralelas'];

// Lista de Exercícios Predefinidos
// ATENÇÃO: Os URLs de Giphy são exemplos. Para produção, hospede seus próprios GIFs/MP4s.
// As imagens foram removidas (imageUrl: '').
const PREDEFINED_EXERCISES = [
  {
    name: 'Agachamento com Barra',
    description: 'Exercício composto fundamental para as pernas e glúteos, utilizando uma barra nas costas.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos', 'Abdómen', 'Costas'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexões de Braço',
    description: 'Exercício de peso corporal que fortalece o peito, ombros e tríceps.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/3o7TKF1fQk4f1vC2yQ/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Prancha',
    description: 'Exercício isométrico para fortalecer o core e abdómen.',
    category: 'Força',
    targetMuscles: ['Abdómen', 'Costas', 'Ombros'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l0HlCqV3g2b1b3jSg/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Curvada com Barra',
    description: 'Exercício composto para as costas, que também trabalha bíceps e ombros.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços', 'Ombros'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Supino com Halteres',
    description: 'Exercício para o peito, que permite maior amplitude de movimento do que o supino com barra.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação Lateral com Halteres',
    description: 'Isolamento para os ombros, foca na porção lateral do deltoide.',
    category: 'Força',
    targetMuscles: ['Ombros'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Direta com Barra',
    description: 'Exercício clássico para bíceps.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Extensão de Tríceps com Haltere (Francês)',
    description: 'Exercício para tríceps, pode ser feito sentado ou em pé.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Afundo com Halteres',
    description: 'Exercício unilateral para pernas e glúteos, melhora o equilíbrio.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Levantamento Terra (Deadlift)',
    description: 'Um dos três grandes levantamentos, trabalha quase todos os músculos do corpo.',
    category: 'Força',
    targetMuscles: ['Corpo Inteiro', 'Costas', 'Pernas', 'Glúteos'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Corrida na Passadeira',
    description: 'Exercício cardiovascular para melhorar a resistência e queimar calorias.',
    category: 'Cardio',
    targetMuscles: ['Pernas', 'Corpo Intepo'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elíptica',
    description: 'Exercício cardiovascular de baixo impacto que trabalha pernas, braços e core.',
    category: 'Cardio',
    targetMuscles: ['Pernas', 'Braços', 'Corpo Inteiro'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Bicicleta Ergométrica',
    description: 'Exercício cardiovascular para fortalecer as pernas e melhorar a resistência.',
    category: 'Cardio',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Pular Corda',
    description: 'Exercício cardiovascular de alta intensidade que melhora a coordenação e agilidade.',
    category: 'Cardio',
    targetMuscles: ['Pernas', 'Corpo Inteiro'],
    equipment: ['Corda de Saltar'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento de Isquiotibiais',
    description: 'Alongamento para a parte posterior da coxa, melhora a flexibilidade.',
    category: 'Flexibilidade',
    targetMuscles: ['Pernas'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento de Peito',
    description: 'Alongamento para abrir o peito e melhorar a postura.',
    category: 'Flexibilidade',
    targetMuscles: ['Peito'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Burpees',
    description: 'Exercício de corpo inteiro de alta intensidade, combina agachamento, flexão e salto.',
    category: 'HIIT',
    targetMuscles: ['Corpo Inteiro'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Mountain Climbers',
    description: 'Exercício cardiovascular e de core, simula escalar uma montanha.',
    category: 'HIIT',
    targetMuscles: ['Abdómen', 'Pernas', 'Corpo Inteiro'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Kettlebell Swing',
    description: 'Exercício funcional que desenvolve força explosiva e resistência, principalmente nos glúteos e isquiotibiais.',
    category: 'Funcional',
    targetMuscles: ['Glúteos', 'Pernas', 'Costas', 'Ombros'],
    equipment: ['Kettlebell'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Caminhada com Bandas de Resistência',
    description: 'Exercício para ativar e fortalecer os glúteos e abdutores.',
    category: 'Funcional',
    targetMuscles: ['Glúteos', 'Pernas'],
    equipment: ['Bandas de Resistência'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Invertida (Bodyweight Row)',
    description: 'Exercício de peso corporal para as costas e bíceps.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Peso Corporal', 'Barra Fixa'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps Mergulho (Dips)',
    description: 'Exercício de peso corporal para tríceps e peito.',
    category: 'Força',
    targetMuscles: ['Braços', 'Peito'],
    equipment: ['Peso Corporal', 'Paralelas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação Frontal com Halteres',
    description: 'Isolamento para a porção frontal do deltoide.',
    category: 'Força',
    targetMuscles: ['Ombros'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Extensora',
    description: 'Máquina para isolar e fortalecer os quadríceps.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Flexora',
    description: 'Máquina para isolar e fortalecer os isquiotibiais.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação de Gémeos em Pé',
    description: 'Exercício para os músculos da panturrilha.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas', 'Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Abdominais (Crunches)',
    description: 'Exercício clássico para fortalecer a parte superior do abdómen.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação de Pernas (Leg Raises)',
    description: 'Exercício para fortalecer a parte inferior do abdómen.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Corrida ao Ar Livre',
    description: 'Exercício cardiovascular para resistência e saúde geral.',
    category: 'Cardio',
    targetMuscles: ['Pernas', 'Corpo Inteiro'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Natação',
    description: 'Exercício de corpo inteiro de baixo impacto, excelente para o cardio e força.',
    category: 'Cardio',
    targetMuscles: ['Corpo Inteiro'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Yoga (Saudação ao Sol)',
    description: 'Sequência de posturas que melhora a flexibilidade, força e equilíbrio.',
    category: 'Flexibilidade',
    targetMuscles: ['Corpo Inteiro'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento Gato-Camelo',
    description: 'Alongamento para a mobilidade da coluna vertebral.',
    category: 'Flexibilidade',
    targetMuscles: ['Costas', 'Abdómen'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento com Salto (Jump Squat)',
    description: 'Variação de agachamento explosiva para HIIT, melhora a potência das pernas.',
    category: 'HIIT',
    targetMuscles: ['Pernas', 'Glúteos', 'Corpo Inteiro'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada na Máquina (Sentado)',
    description: 'Exercício para as costas, foca na espessura e força.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Puxada Alta com Pegada Supinada',
    description: 'Variação da puxada para costas, com maior ênfase nos bíceps.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Crucifixo com Halteres',
    description: 'Exercício de isolamento para o peito, foca na abertura e contração.',
    category: 'Força',
    targetMuscles: ['Peito'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Press de Ombros com Halteres',
    description: 'Exercício composto para os ombros, pode ser feito sentado ou em pé.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps na Polia Alta (Pushdown)',
    description: 'Exercício de isolamento para o tríceps.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Concentrada',
    description: 'Exercício de isolamento para bíceps, foca na contração máxima.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Leg Press',
    description: 'Exercício para pernas e glúteos, com suporte para as costas.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Extensão de Pernas na Máquina',
    description: 'Isolamento para quadríceps.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexão de Pernas na Máquina',
    description: 'Isolamento para isquiotibiais.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Abdominal Bicicleta',
    description: 'Exercício para abdómen e oblíquos, simula o movimento de pedalar.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Ponte de Glúteos (Glute Bridge)',
    description: 'Exercício para fortalecer glúteos e isquiotibiais, de baixo impacto.',
    category: 'Força',
    targetMuscles: ['Glúteos', 'Pernas'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Sumô com Haltere',
    description: 'Variação de agachamento que foca mais nos glúteos e parte interna da coxa.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada com Haltere (Unilateral)',
    description: 'Exercício para as costas, foca na força unilateral e estabilidade do core.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Voador Peitoral (Pec Deck)',
    description: 'Máquina para isolar o peito.',
    category: 'Força',
    targetMuscles: ['Peito'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Scott',
    description: 'Exercício de isolamento para bíceps, com apoio para os braços.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Máquinas', 'Barra', 'Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Extensão de Tríceps na Polia Alta com Corda',
    description: 'Variação para tríceps, permite maior contração no final do movimento.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Caminhada (Leve)',
    description: 'Atividade cardiovascular de baixo impacto, ideal para aquecimento ou recuperação.',
    category: 'Cardio',
    targetMuscles: ['Pernas'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento Borboleta',
    description: 'Alongamento para a parte interna das coxas e flexibilidade do quadril.',
    category: 'Flexibilidade',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Ponte com Elevação de Perna',
    description: 'Variação da ponte de glúteos para maior isolamento de uma perna de cada vez.',
    category: 'Força',
    targetMuscles: ['Glúteos', 'Pernas'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Búlgaro',
    description: 'Exercício unilateral desafiador para pernas e glúteos, melhora o equilíbrio.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Halters', 'Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada na Máquina (Sentado)',
    description: 'Exercício para as costas, foca na espessura e força.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Puxada Alta com Pegada Pronada',
    description: 'Exercício para as costas, com pegada mais larga e pronada.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Press de Peito na Máquina',
    description: 'Máquina para isolar o peito, oferece estabilidade e segurança.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Desenvolvimento Militar com Barra',
    description: 'Exercício composto para ombros e tríceps, feito em pé ou sentado.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps Testa com Haltere',
    description: 'Exercício de isolamento para tríceps, feito deitado.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Martelo',
    description: 'Exercício para bíceps e antebraços, com pegada neutra.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Passada com Peso Corporal',
    description: 'Exercício unilateral para pernas e glúteos, sem equipamento.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Livre (Peso Corporal)',
    description: 'Agachamento básico sem peso, ideal para aquecimento ou iniciantes.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Corrida de Alta Intensidade (Sprint)',
    description: 'Explosões curtas de corrida para melhorar a velocidade e capacidade anaeróbica.',
    category: 'HIIT',
    targetMuscles: ['Pernas', 'Corpo Inteiro'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada com Elástico',
    description: 'Exercício para as costas usando bandas de resistência, versátil e de baixo impacto.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Bandas de Resistência'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexão Inclinada',
    description: 'Variação de flexão mais fácil, usando uma superfície elevada.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação de Pernas Suspenso',
    description: 'Exercício avançado para o abdómen, feito pendurado em uma barra.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Barra Fixa'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Abdominal Oblíquo (Russian Twist)',
    description: 'Exercício para fortalecer os oblíquos, pode ser feito com ou sem peso.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal', 'Halters', 'Kettlebell'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Puxada Alta com Pegada Pronada',
    description: 'Exercício para as costas, com pegada mais larga e pronada.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Adutora',
    description: 'Máquina para isolar e fortalecer os músculos adutores da coxa.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Abdutora',
    description: 'Máquina para isolar e fortalecer os músculos abdutores da coxa.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Extensão de Tríceps com Barra W (Deitado)',
    description: 'Exercício de isolamento para tríceps, usando uma barra em W.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Inversa com Barra',
    description: 'Exercício para antebraços e bíceps, com pegada pronada.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Frontal com Barra',
    description: 'Variação de agachamento que enfatiza os quadríceps e requer boa mobilidade.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Cavalinho (T-Bar Row)',
    description: 'Exercício para as costas, que permite grande sobrecarga.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas', 'Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Pull-up (Barra Fixa)',
    description: 'Exercício de peso corporal para costas e bíceps, com pegada supinada.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Barra Fixa'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Chin-up',
    description: 'Exercício de peso corporal para costas e bíceps, com pegada supinada.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Barra Fixa'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexões Diamante',
    description: 'Variação de flexão que foca mais nos tríceps.',
    category: 'Força',
    targetMuscles: ['Braços', 'Peito'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Press de Banco Inclinado com Halteres',
    description: 'Exercício para a parte superior do peito.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Halters', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Desenvolvimento Arnold',
    description: 'Variação de desenvolvimento de ombros que trabalha todas as porções do deltoide.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps Coice com Haltere',
    description: 'Exercício de isolamento para tríceps, foca na contração.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Punho (Wrist Curl)',
    description: 'Exercício para fortalecer os antebraços.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters', 'Barra'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Caminhada na Esteira Inclinada',
    description: 'Caminhada em inclinação para maior desafio cardiovascular e de pernas.',
    category: 'Cardio',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento de Quadríceps',
    description: 'Alongamento para a parte frontal da coxa.',
    category: 'Flexibilidade',
    targetMuscles: ['Pernas'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Alongamento de Panturrilha',
    description: 'Alongamento para os músculos da panturrilha.',
    category: 'Flexibilidade',
    targetMuscles: ['Pernas'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Pistol (Pistol Squat)',
    description: 'Agachamento unilateral avançado, exige força, equilíbrio e flexibilidade.',
    category: 'Funcional',
    targetMuscles: ['Pernas', 'Glúteos', 'Corpo Inteiro'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexão de Braço em Pés (Handstand Push-up)',
    description: 'Exercício avançado de peso corporal para ombros e tríceps.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada na Máquina (Remo)',
    description: 'Exercício de corpo inteiro que simula o remo, excelente para cardio e força.',
    category: 'Cardio',
    targetMuscles: ['Corpo Inteiro', 'Costas', 'Pernas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Burpee Box Jump',
    description: 'Combinação de burpee com salto na caixa, alta intensidade.',
    category: 'HIIT',
    targetMuscles: ['Corpo Inteiro'],
    equipment: ['Outro'], // Box
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Wall Sit (Agachamento na Parede)',
    description: 'Exercício isométrico para fortalecer as pernas e glúteos.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Nenhum'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Hip Thrust com Barra',
    description: 'Um dos melhores exercícios para isolar e fortalecer os glúteos.',
    category: 'Força',
    targetMuscles: ['Glúteos', 'Pernas'],
    equipment: ['Barra', 'Pesos', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Face Pull',
    description: 'Exercício para a parte superior das costas e ombros, melhora a postura.',
    category: 'Força',
    targetMuscles: ['Costas', 'Ombros'],
    equipment: ['Máquinas', 'Bandas de Resistência'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Unilateral com Apoio (Máquina)',
    description: 'Exercício para as costas, foca na força unilateral e estabilidade.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação de Pernas Suspenso com Rotação (Windshield Wiper)',
    description: 'Exercício avançado para abdómen e oblíquos.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Barra Fixa'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexão de Pernas em Pé (Máquina)',
    description: 'Isolamento para isquiotibiais, feito em pé.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Alta com Halteres',
    description: 'Exercício para ombros e trapézio, usando halteres.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Costas'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Press de Peito Inclinado com Barra',
    description: 'Exercício para a parte superior do peito, usando barra.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Barra', 'Pesos', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Desenvolvimento com Halteres (Sentado)',
    description: 'Exercício composto para ombros, feito sentado para maior estabilidade.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Halters', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps Francês com Barra',
    description: 'Exercício de isolamento para tríceps, usando barra e feito deitado.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Bíceps com Barra W',
    description: 'Exercício para bíceps, usando barra em W para conforto dos punhos.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Romana (Hyperextension)',
    description: 'Exercício para fortalecer a lombar e glúteos.',
    category: 'Força',
    targetMuscles: ['Costas', 'Glúteos', 'Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Agachamento Goblet',
    description: 'Agachamento com haltere segurado à frente do peito, ideal para iniciantes.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Puxada no Cabo (Cable Row)',
    description: 'Exercício para as costas, com resistência constante do cabo.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Caminhada de Urso (Bear Crawl)',
    description: 'Exercício funcional de corpo inteiro, melhora a coordenação e força do core.',
    category: 'Funcional',
    targetMuscles: ['Corpo Inteiro', 'Abdómen', 'Ombros', 'Pernas'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Salto em Caixa (Step-up)',
    description: 'Exercício unilateral para pernas e glúteos, com ou sem peso.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos'],
    equipment: ['Outro', 'Halters'], // Caixa, banco
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Prancha Lateral',
    description: 'Exercício isométrico para fortalecer os oblíquos e estabilizar o core.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Unilateral com Haltere (Banco)',
    description: 'Remada com haltere apoiando-se em um banco, foca em uma lado de cada vez.',
    category: 'Força',
    targetMuscles: ['Costas', 'Braços'],
    equipment: ['Halters', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Flexão Declinada',
    description: 'Variação de flexão mais difícil, com os pés elevados.',
    category: 'Força',
    targetMuscles: ['Peito', 'Ombros', 'Braços'],
    equipment: ['Peso Corporal', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Abdominal com Roda (Ab Wheel Rollout)',
    description: 'Exercício avançado para o core, usando uma roda abdominal.',
    category: 'Força',
    targetMuscles: ['Abdómen', 'Costas'],
    equipment: ['Outro'], // Roda abdominal
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Good Mornings com Barra',
    description: 'Exercício para isquiotibiais, glúteos e lombar, com barra nas costas.',
    category: 'Força',
    targetMuscles: ['Pernas', 'Glúteos', 'Costas'],
    equipment: ['Barra', 'Pesos'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Remada Alta no Cabo',
    description: 'Exercício para ombros e trapézio, usando cabo.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Costas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Voador Invertido (Reverse Pec Deck)',
    description: 'Máquina para isolar a parte posterior dos ombros e costas.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Costas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Desenvolvimento com Halteres (Em Pé)',
    description: 'Exercício composto para ombros, feito em pé para maior ativação do core.',
    category: 'Força',
    targetMuscles: ['Ombros', 'Braços'],
    equipment: ['Halters'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Tríceps Testa com Barra EZ',
    description: 'Exercício de isolamento para tríceps, usando barra EZ para conforto dos punhos.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Barra', 'Pesos', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Rosca Concentrada no Banco Inclinado',
    description: 'Exercício de isolamento para bíceps, feito em banco inclinado para maior alongamento.',
    category: 'Força',
    targetMuscles: ['Braços'],
    equipment: ['Halters', 'Banco'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Extensora Unilateral',
    description: 'Máquina para isolar e fortalecer um quadríceps de cada vez.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Cadeira Flexora Unilateral',
    description: 'Máquina para isolar e fortalecer um isquiotibial de cada vez.',
    category: 'Força',
    targetMuscles: ['Pernas'],
    equipment: ['Máquinas'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Abdominal Remador (Sit-up)',
    description: 'Exercício para o abdómen, com movimento completo do tronco.',
    category: 'Força',
    targetMuscles: ['Abdómen'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Elevação Pélvica (Hip Thrust) - Peso Corporal',
    description: 'Versão de peso corporal do hip thrust, para iniciantes.',
    category: 'Força',
    targetMuscles: ['Glúteos', 'Pernas'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Super-Homem (Superman)',
    description: 'Exercício para fortalecer a lombar e os músculos das costas.',
    category: 'Força',
    targetMuscles: ['Costas', 'Glúteos'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Salto de Corda Duplo (Double Unders)',
    description: 'Exercício avançado de pular corda, para alta intensidade e coordenação.',
    category: 'HIIT',
    targetMuscles: ['Corpo Inteiro'],
    equipment: ['Corda de Saltar'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
  {
    name: 'Caminhada do Caranguejo (Crab Walk)',
    description: 'Exercício funcional para fortalecer o core, glúteos e ombros.',
    category: 'Funcional',
    targetMuscles: ['Corpo Inteiro', 'Abdómen', 'Glúteos', 'Ombros'],
    equipment: ['Peso Corporal'],
    animationUrl: 'https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif',
    imageUrl: '', // Removido
  },
];

export default function ExerciseLibraryScreen() {
  const navigation = useNavigation();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAnimationModalVisible, setIsAnimationModalVisible] = useState(false);
  const [currentAnimationUrl, setCurrentAnimationUrl] = useState('');
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    description: '',
    category: '',
    targetMuscles: [],
    equipment: [],
    animationUrl: '',
    imageUrl: '',
  });
  // Novo estado para a pesquisa
  const [searchQuery, setSearchQuery] = useState('');

  const seedExercises = async () => {
    try {
      const exercisesColRef = collection(db, 'exercises');
      const snapshot = await getDocs(exercisesColRef);

      if (snapshot.empty) {
        console.log("Coleção 'exercises' vazia. A preencher com dados predefinidos...");
        const addPromises = PREDEFINED_EXERCISES.map(exercise =>
          addDoc(exercisesColRef, exercise)
        );
        await Promise.all(addPromises);
        console.log("Exercícios predefinidos adicionados com sucesso!");
      } else {
        console.log("Coleção 'exercises' já contém dados. Não é necessário preencher.");
      }
    } catch (err) {
      console.error("Erro ao preencher exercícios:", err);
      Alert.alert('Erro de Preenchimento', `Não foi possível adicionar exercícios predefinidos: ${err.message}`);
    }
  };

  const fetchExercises = useCallback(() => {
    setLoading(true);
    setError(null);
    const exercisesColRef = collection(db, 'exercises');
    const q = query(exercisesColRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExercises = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExercises(fetchedExercises);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar exercícios:", err);
      setError("Não foi possível carregar os exercícios. Tente novamente.");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const initializeAndFetch = async () => {
      await seedExercises();
      const unsubscribe = fetchExercises();
      return () => unsubscribe();
    };
    initializeAndFetch();
  }, [fetchExercises]);

  // Filtrar exercícios com base na pesquisa
  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.targetMuscles.some(muscle => muscle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    exercise.equipment.some(eq => eq.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openExerciseModal = (exercise = null) => {
    if (exercise) {
      setCurrentExercise(exercise);
      setExerciseForm({
        name: exercise.name || '',
        description: exercise.description || '',
        category: exercise.category || '',
        targetMuscles: exercise.targetMuscles || [],
        equipment: exercise.equipment || [],
        animationUrl: exercise.animationUrl || '',
        imageUrl: exercise.imageUrl || '',
      });
    } else {
      setCurrentExercise(null);
      setExerciseForm({
        name: '',
        description: '',
        category: '',
        targetMuscles: [],
        equipment: [],
        animationUrl: '',
        imageUrl: '',
      });
    }
    setIsModalVisible(true);
  };

  const closeExerciseModal = () => {
    setIsModalVisible(false);
    setCurrentExercise(null);
    setExerciseForm({
      name: '',
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      animationUrl: '',
      imageUrl: '',
    });
  };

  const openAnimationModal = (url) => {
    setCurrentAnimationUrl(url);
    setIsAnimationModalVisible(true);
  };

  const closeAnimationModal = () => {
    setIsAnimationModalVisible(false);
    setCurrentAnimationUrl('');
  };

  const handleSaveExercise = async () => {
    if (!exerciseForm.name || !exerciseForm.description || !exerciseForm.category || exerciseForm.targetMuscles.length === 0) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios (Nome, Descrição, Categoria, Músculos Alvo).');
      return;
    }

    setLoading(true);
    try {
      if (currentExercise) {
        const exerciseRef = doc(db, 'exercises', currentExercise.id);
        await updateDoc(exerciseRef, exerciseForm);
        Alert.alert('Sucesso', 'Exercício atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'exercises'), exerciseForm);
        Alert.alert('Sucesso', 'Exercício adicionado com sucesso!');
      }
      closeExerciseModal();
    } catch (err) {
      console.error("Erro ao salvar exercício:", err);
      Alert.alert('Erro', `Não foi possível salvar o exercício: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = async (id) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir este exercício? Esta ação é irreversível.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'exercises', id));
              Alert.alert('Sucesso', 'Exercício excluído com sucesso!');
            } catch (err) {
              console.error("Erro ao excluir exercício:", err);
              Alert.alert('Erro', `Não foi possível excluir o exercício: ${err.message}`);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderExerciseItem = ({ item }) => {
    console.log('Rendering exercise item:', item.name);
    console.log('Image URL:', item.imageUrl);
    console.log('Animation URL:', item.animationUrl);

    return (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <View style={styles.exerciseActions}>
            <TouchableOpacity onPress={() => openExerciseModal(item)} style={styles.actionButton}>
              <Ionicons name="create-outline" size={20} color={Colors.accentBlue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteExercise(item.id)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.errorRed} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.exerciseCategory}>Categoria: {item.category}</Text>
        <Text style={styles.exerciseMuscles}>Músculos: {item.targetMuscles.join(', ')}</Text>
        {item.equipment && item.equipment.length > 0 && (
          <Text style={styles.exerciseEquipment}>Equipamento: {item.equipment.join(', ')}</Text>
        )}
        <Text style={styles.exerciseDescription}>{item.description}</Text>
        
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.exerciseImage} 
            resizeMode="contain" 
            onError={(e) => console.log('Erro ao carregar imagem:', e.nativeEvent.error, item.imageUrl)}
          />
        ) : null}

        {item.animationUrl ? (
          <TouchableOpacity 
            style={styles.animationButton} 
            onPress={() => openAnimationModal(item.animationUrl)}
          >
            <Ionicons name="play-circle-outline" size={24} color={Colors.white} />
            <Text style={styles.animationButtonText}>Ver Animação</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biblioteca de Exercícios</Text>
        <TouchableOpacity onPress={() => openExerciseModal()} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={30} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.mediumGray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar exercícios..."
          placeholderTextColor={Colors.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color={Colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo Principal */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.loadingIndicator} />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchExercises} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : filteredExercises.length === 0 ? (
          <Text style={styles.noExercisesText}>Nenhum exercício encontrado com a pesquisa.</Text>
        ) : (
          <FlatList
            data={filteredExercises} // Usar exercícios filtrados
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContent}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Modal para Adicionar/Editar Exercício */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeExerciseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentExercise ? 'Editar Exercício' : 'Adicionar Novo Exercício'}
            </Text>

            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.inputLabel}>Nome do Exercício:</Text>
              <TextInput
                style={styles.input}
                value={exerciseForm.name}
                onChangeText={(text) => setExerciseForm({ ...exerciseForm, name: text })}
                placeholder="Ex: Agachamento com Barra"
                placeholderTextColor={Colors.mediumGray}
              />

              <Text style={styles.inputLabel}>Descrição:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={exerciseForm.description}
                onChangeText={(text) => setExerciseForm({ ...exerciseForm, description: text })}
                placeholder="Ex: Exercício composto que trabalha pernas e glúteos."
                placeholderTextColor={Colors.mediumGray}
                multiline
              />

              <Text style={styles.inputLabel}>Categoria:</Text>
              <View style={styles.pickerContainer}>
                {EXERCISE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption,
                      exerciseForm.category === cat && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setExerciseForm({ ...exerciseForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        exerciseForm.category === cat && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Músculos Alvo:</Text>
              <View style={styles.pickerContainer}>
                {TARGET_MUSCLES.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      styles.pickerOption,
                      exerciseForm.targetMuscles.includes(muscle) && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      const newMuscles = exerciseForm.targetMuscles.includes(muscle)
                        ? exerciseForm.targetMuscles.filter((m) => m !== muscle)
                        : [...exerciseForm.targetMuscles, muscle];
                      setExerciseForm({ ...exerciseForm, targetMuscles: newMuscles });
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        exerciseForm.targetMuscles.includes(muscle) && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Equipamento (Opcional):</Text>
              <View style={styles.pickerContainer}>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[
                      styles.pickerOption,
                      exerciseForm.equipment.includes(eq) && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      const newEquipment = exerciseForm.equipment.includes(eq)
                        ? exerciseForm.equipment.filter((e) => e !== eq)
                        : [...exerciseForm.equipment, eq];
                      setExerciseForm({ ...exerciseForm, equipment: newEquipment });
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        exerciseForm.equipment.includes(eq) && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {eq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>URL da Animação (GIF/MP4 Curto - Opcional):</Text>
              <TextInput
                style={styles.input}
                value={exerciseForm.animationUrl}
                onChangeText={(text) => setExerciseForm({ ...exerciseForm, animationUrl: text })}
                placeholder="Ex: https://i.giphy.com/media/l4FGyQh752K92G4lG/giphy.gif"
                placeholderTextColor={Colors.mediumGray}
                keyboardType="url"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>URL da Imagem (Deixe em branco para não usar imagens):</Text>
              <TextInput
                style={styles.input}
                value={exerciseForm.imageUrl}
                onChangeText={(text) => setExerciseForm({ ...exerciseForm, imageUrl: text })}
                placeholder="Deixe em branco para não usar imagem"
                placeholderTextColor={Colors.mediumGray}
                keyboardType="url"
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={closeExerciseModal} style={[styles.modalButton, styles.modalButtonCancel]}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveExercise} style={[styles.modalButton, styles.modalButtonSave]}>
                <Text style={styles.modalButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Exibir Animação */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.creamBackground,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryGold,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  addButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: Colors.darkGray,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 5,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 15,
  },
  loadingIndicator: {
    marginTop: 50,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.errorRed,
    textAlign: 'center',
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: Colors.primaryGold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  noExercisesText: {
    fontSize: 16,
    color: Colors.darkGray,
    textAlign: 'center',
    marginTop: 50,
  },
  flatListContent: {
    // Não adicione flexGrow aqui para evitar problemas de rolagem aninhada
  },
  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.darkBrown,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderLeftWidth: 5,
    borderColor: Colors.primaryGold,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkBrown,
    flexShrink: 1,
    marginRight: 10,
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 10,
    padding: 5,
  },
  exerciseCategory: {
    fontSize: 14,
    color: Colors.lightBrown,
    marginBottom: 5,
  },
  exerciseMuscles: {
    fontSize: 14,
    color: Colors.lightBrown,
    marginBottom: 5,
  },
  exerciseEquipment: {
    fontSize: 14,
    color: Colors.lightBrown,
    marginBottom: 5,
  },
  exerciseDescription: {
    fontSize: 14,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: 10,
  },
  exerciseImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: Colors.lightGray,
  },
  animationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentBlue,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  animationButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
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
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkBrown,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    flexGrow: 1,
    marginBottom: 20,
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
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.darkGray,
    backgroundColor: Colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 8,
    backgroundColor: Colors.white,
  },
  pickerOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    margin: 4,
    backgroundColor: Colors.lightGray,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primaryGold,
    borderColor: Colors.primaryGold,
  },
  pickerOptionText: {
    color: Colors.darkGray,
    fontSize: 14,
  },
  pickerOptionTextSelected: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalButtonCancel: {
    backgroundColor: Colors.lightGray,
  },
  modalButtonSave: {
    backgroundColor: Colors.accentBlue,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para o Modal de Animação
  animationModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  animationModalContent: {
    backgroundColor: Colors.black,
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
    backgroundColor: Colors.black,
  },
  noAnimationText: {
    color: Colors.white,
    fontSize: 18,
    textAlign: 'center',
  },
  animationModalCloseButton: {
    marginTop: 15,
    backgroundColor: Colors.primaryGold,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  animationModalCloseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
