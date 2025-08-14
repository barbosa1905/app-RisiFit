import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const Colors = {
  primaryGold: '#D4AF37',
  darkBrown: '#3E2723',
  lightBrown: '#795548',
  creamBackground: '#FDF7E4',
  white: '#FFFFFF',
  lightGray: '#ECEFF1',
  mediumGray: '#B0BEC5',
  darkGray: '#424242',
  accentBlue: '#2196F3',
  successGreen: '#4CAF50',
  errorRed: '#F44336',
  inputBorder: '#B0BEC5',
};

// --- LISTAS GLOBAIS CORRIGIDAS ---
// Use nomes consistentes (convenção UPPER_SNAKE_CASE para constantes globais)
const EXERCISE_CATEGORIES = ['Força', 'Aeróbico', 'Alongamento', 'HIIT', 'Funcional', 'Peso Corporal','Core']; // Adicionado 'Peso Corporal'
const TARGET_MUSCLES = ['Peito', 'Costas', 'Ombros', 'Braços', 'Pernas', 'Abdómen', 'Glúteos', 'Core', 'Corpo Inteiro', 'Quadríceps', 'Adutores']; // Adicionados 'Core', 'Quadríceps', 'Adutores'
const EQUIPMENT_OPTIONS = ['Halters', 'Barra', 'Máquina', 'Peso Corporal', 'Bandas de Resistência', 'Corda de Saltar', 'Kettlebell', 'Outro', 'Nenhum', 'Banco', 'Barra Fixa', 'Paralelas'];


export const PREDEFINED_EXERCISES = [
 {

    "id": "1",
    "nome_pt": "Agachamento Livre",
    "nome_en": "Bodyweight Squat",
    "descricao_breve": "Exercício fundamental para membros inferiores usando apenas o peso corporal.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Agachamento+Livre"
  },
  {
    "id": "2",
    "nome_pt": "Flexão de Braços",
    "nome_en": "Push-Up",
    "descricao_breve": "Fortalece peitoral, tríceps e core com o peso corporal.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Flexao"
  },
  {
    "id": "3",
    "nome_pt": "Prancha",
    "nome_en": "Plank",
    "descricao_breve": "Melhora a estabilidade e resistência do core.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Lombar", "Oblíquos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Prancha"
  },
  {
    "id": "4",
    "nome_pt": "Burpee",
    "nome_en": "Burpee",
    "descricao_breve": "Movimento explosivo que combina agachamento, flexão e salto.",
    "category": "HIIT",
    "musculos_alvo": ["Corpo inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Burpee"
  },
  {
    "id": "5",
    "nome_pt": "Afundo",
    "nome_en": "Lunge",
    "descricao_breve": "Exercício unilateral que trabalha pernas e equilíbrio.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Afundo"
  },
  {
    "id": "6",
    "nome_pt": "Elevação de Pernas",
    "nome_en": "Leg Raise",
    "descricao_breve": "Isola o abdómen inferior sem sobrecarregar a lombar.",
    "category": "Core",
    "musculos_alvo": ["Abdómen Inferior"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Perna+Alta"
  },
  {
    "id": "7",
    "nome_pt": "Super-Homem",
    "nome_en": "Superman",
    "descricao_breve": "Fortalece a região lombar de forma segura.",
    "category": "Corretivo",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Superman"
  },
  {
    "id": "8",
    "nome_pt": "Mountain Climbers",
    "nome_en": "Mountain Climbers",
    "descricao_breve": "Cardio de alta intensidade que ativa o core e membros inferiores.",
    "category": "HIIT",
    "musculos_alvo": ["Core", "Quadríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Montanha"
  },
  {
    "id": "9",
    "nome_pt": "Salto com Agachamento",
    "nome_en": "Jump Squat",
    "descricao_breve": "Exercício pliométrico para potência nas pernas.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Salto+Agachamento"
  },
  {
    "id": "10",
    "nome_pt": "Bicicleta Abdominal",
    "nome_en": "Bicycle Crunch",
    "descricao_breve": "Trabalha o core com foco em oblíquos.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Oblíquos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bicicleta"
  },
  {
    "id": "11",
    "nome_pt": "Remada Invertida",
    "nome_en": "Inverted Row",
    "descricao_breve": "Fortalece as costas e bíceps usando o peso do corpo.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Dorsais", "Bíceps", "Trapézio"],
    "equipamento": "Barra fixa baixa ou TRX",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Remada+Invertida"
  },
  {
    "id": "12",
    "nome_pt": "Ponte Glútea",
    "nome_en": "Glute Bridge",
    "descricao_breve": "Isola o glúteo máximo para fortalecimento e ativação.",
    "category": "Força",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Ponte+Glutea"
  },
  {
    "id": "13",
    "nome_pt": "Elevação Lateral de Ombros",
    "nome_en": "Lateral Raise",
    "descricao_breve": "Desenvolve a parte lateral dos ombros para melhor definição.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Laterais"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Elevacao+Lateral"
  },
  {
    "id": "14",
    "nome_pt": "Cadeira Extensora",
    "nome_en": "Leg Extension",
    "descricao_breve": "Isola os quadríceps para fortalecimento específico.",
    "category": "Máquinas",
    "musculos_alvo": ["Quadríceps"],
    "equipamento": "Máquina cadeira extensora",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Cadeira+Extensora"
  },
  {
    "id": "15",
    "nome_pt": "Rosca Direta",
    "nome_en": "Bicep Curl",
    "descricao_breve": "Foco no desenvolvimento dos bíceps com pesos livres.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halteres ou barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Rosca+Direta"
  },
  {
    "id": "16",
    "nome_pt": "Tríceps Testa",
    "nome_en": "Lying Triceps Extension",
    "descricao_breve": "Isola o tríceps para ganho de força e definição.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Barra ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Triceps+Testa"
  },
  {
    "id": "17",
    "nome_pt": "Elevação de Gémeos em Pé",
    "nome_en": "Standing Calf Raise",
    "descricao_breve": "Fortalece as panturrilhas com o peso do corpo ou carga extra.",
    "category": "Peso Corporal / Pesos",
    "musculos_alvo": ["Panturrilhas"],
    "equipamento": "Nenhum ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Elevacao+Gemeos"
  },
  {
    "id": "18",
    "nome_pt": "Supino Reto",
    "nome_en": "Bench Press",
    "descricao_breve": "Exercício clássico para desenvolvimento do peitoral.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Peitoral", "Tríceps", "Deltoides Anteriores"],
    "equipamento": "Barra e banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Supino+Reto"
  },
  {
    "id": "19",
    "nome_pt": "Remada Curvada",
    "nome_en": "Bent Over Row",
    "descricao_breve": "Trabalha costas, especialmente dorsais e trapézio.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Barra ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Remada+Curvada"
  },
  {
    "id": "20",
    "nome_pt": "Abdominal Crunch",
    "nome_en": "Crunch",
    "descricao_breve": "Foco no reto abdominal para fortalecimento do core.",
    "category": "Core",
    "musculos_alvo": ["Abdómen"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Crunch"
  },
  {
    "id": "21",
    "nome_pt": "Pull-Up",
    "nome_en": "Pull-Up",
    "descricao_breve": "Exercício avançado para costas e bíceps usando peso corporal.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Dorsais", "Bíceps"],
    "equipamento": "Barra fixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Pull-Up"
  },
  {
    "id": "22",
    "nome_pt": "Kettlebell Swing",
    "nome_en": "Kettlebell Swing",
    "descricao_breve": "Exercício dinâmico para força e cardio com kettlebell.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Core"],
    "equipamento": "Kettlebell",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Kettlebell+Swing"
  },
  {
    "id": "23",
    "nome_pt": "Puxada Alta",
    "nome_en": "Lat Pulldown",
    "descricao_breve": "Foco no fortalecimento das dorsais usando máquina.",
    "category": "Máquinas",
    "musculos_alvo": ["Dorsais", "Bíceps"],
    "equipamento": "Máquina puxada alta",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Puxada+Alta"
  },
  {
    "id": "24",
    "nome_pt": "Abdução de Quadril deitado",
    "nome_en": "Lying Hip Abduction",
    "descricao_breve": "Fortalece os músculos abdutores do quadril.",
    "category": "Corretivo",
    "musculos_alvo": ["Glúteo Médio", "Glúteo Mínimo"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Abducao+Quadril"
  },
  {
    "id": "25",
    "nome_pt": "Prancha Lateral",
    "nome_en": "Side Plank",
    "descricao_breve": "Fortalece oblíquos e melhora a estabilidade do core.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Abdómen", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Prancha+Lateral"
  },
  {
    "id": "26",
    "nome_pt": "Swing com Bola Medicinal",
    "nome_en": "Medicine Ball Slam",
    "descricao_breve": "Exercício explosivo para força e potência do core.",
    "category": "Funcional",
    "musculos_alvo": ["Core", "Ombros", "Braços"],
    "equipamento": "Bola medicinal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Medicine+Ball+Slam"
  },
  {
    "id": "27",
    "nome_pt": "Step-up",
    "nome_en": "Step-up",
    "descricao_breve": "Exercício unilateral para força e equilíbrio nas pernas.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco ou caixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Step-up"
  },
  {
    "id": "28",
    "nome_pt": "Puxada Horizontal",
    "nome_en": "Seated Cable Row",
    "descricao_breve": "Fortalece as costas e bíceps usando máquina de cabos.",
    "category": "Máquinas",
    "musculos_alvo": ["Dorsais", "Bíceps", "Trapézio"],
    "equipamento": "Máquina cabos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Puxada+Horizontal"
  },
  {
    "id": "29",
    "nome_pt": "Agachamento Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Exercício unilateral avançado para força nas pernas.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco e halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Agachamento+Bulgaro"
  },
  {
    "id": "30",
    "nome_pt": "Flexão de Tríceps no Banco",
    "nome_en": "Bench Dips",
    "descricao_breve": "Fortalece os tríceps usando peso corporal.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Ombros", "Peitoral"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bench+Dips"
  },
  {
    "id": "31",
    "nome_pt": "Abdominal V-Up",
    "nome_en": "V-Up",
    "descricao_breve": "Exercício para fortalecimento do abdómen completo.",
    "category": "Core",
    "musculos_alvo": ["Abdómen Superior e Inferior"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=V-Up"
  },
  {
    "id": "32",
    "nome_pt": "Saltos Laterais",
    "nome_en": "Lateral Hops",
    "descricao_breve": "Treino pliométrico para agilidade e coordenação.",
    "category": "Pliometria",
    "musculos_alvo": ["Panturrilhas", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Saltos+Laterais"
  },
  {
    "id": "33",
    "nome_pt": "Rosca Martelo",
    "nome_en": "Hammer Curl",
    "descricao_breve": "Exercício para os bíceps e braquiais.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Bíceps", "Braquiais"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Rosca+Martelo"
  },
  {
    "id": "34",
    "nome_pt": "Elevação Frontal de Ombros",
    "nome_en": "Front Raise",
    "descricao_breve": "Isola a parte frontal do deltoide para definição.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Anteriores"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Elevacao+Frontal"
  },
  {
    "id": "35",
    "nome_pt": "Escalador Cruzado",
    "nome_en": "Cross-Body Mountain Climbers",
    "descricao_breve": "Ativa core, cardio e coordenação com movimento cruzado.",
    "category": "HIIT",
    "musculos_alvo": ["Core", "Ombros", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Escalador+Cruzado"
  },
  {
    "id": "36",
    "nome_pt": "Deadlift com Barra",
    "nome_en": "Barbell Deadlift",
    "descricao_breve": "Exercício multiarticular para costas, pernas e core.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Isquiotibiais", "Glúteos", "Lombar", "Trapézio"],
    "equipamento": "Barra e pesos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Deadlift"
  },
  {
    "id": "37",
    "nome_pt": "Pular Corda",
    "nome_en": "Jump Rope",
    "descricao_breve": "Cardio eficiente para coordenação e resistência.",
    "category": "Cardio",
    "musculos_alvo": ["Panturrilhas", "Coordenação", "Resistência Cardiovascular"],
    "equipamento": "Corda de pular",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Pular+Corda"
  },
  {
    "id": "38",
    "nome_pt": "Agachamento com Barra",
    "nome_en": "Barbell Back Squat",
    "descricao_breve": "Exercício de força para membros inferiores e core.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais", "Core"],
    "equipamento": "Barra e pesos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Agachamento+Barra"
  },
  {
    "id": "39",
    "nome_pt": "Flexão Diamante",
    "nome_en": "Diamond Push-Up",
    "descricao_breve": "Foco no tríceps e parte interna do peitoral.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Peitoral"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Flexao+Diamante"
  },
  {
    "id": "40",
    "nome_pt": "Elevação de Tronco no Solo",
    "nome_en": "Back Extension",
    "descricao_breve": "Fortalece lombar e glúteos.",
    "category": "Corretivo",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Extensao+Tronco"
  },
   {
    "id": "41",
    "nome_pt": "Pistol Squat",
    "nome_en": "Pistol Squat",
    "descricao_breve": "Agachamento unilateral para força e equilíbrio.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Pistol+Squat"
  },
  {
    "id": "42",
    "nome_pt": "Burpee",
    "nome_en": "Burpee",
    "descricao_breve": "Exercício completo de cardio e força com peso corporal.",
    "category": "HIIT",
    "musculos_alvo": ["Peitoral", "Quadríceps", "Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Burpee"
  },
  {
    "id": "43",
    "nome_pt": "Russian Twist",
    "nome_en": "Russian Twist",
    "descricao_breve": "Rotação do tronco para trabalhar oblíquos.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Abdómen"],
    "equipamento": "Nenhum ou bola medicinal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Russian+Twist"
  },
  {
    "id": "44",
    "nome_pt": "Prancha com Elevação de Pernas",
    "nome_en": "Plank with Leg Lift",
    "descricao_breve": "Variante da prancha que trabalha glúteos e core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Glúteos", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Prancha+Eleva+Pernas"
  },
  {
    "id": "45",
    "nome_pt": "Flexão com Palms Off",
    "nome_en": "Clapping Push-Up",
    "descricao_breve": "Flexão pliométrica para força explosiva do peitoral e braços.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Flexao+Clapping"
  },
  {
    "id": "46",
    "nome_pt": "Farmer's Walk",
    "nome_en": "Farmer's Walk",
    "descricao_breve": "Caminhada carregando pesos para força de pegada e core.",
    "category": "Funcional",
    "musculos_alvo": ["Antebraços", "Core", "Ombros"],
    "equipamento": "Halteres ou kettlebells",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Farmers+Walk"
  },
  {
    "id": "47",
    "nome_pt": "Abdominal Bicicleta",
    "nome_en": "Bicycle Crunch",
    "descricao_breve": "Exercício para abdómen e oblíquos com movimento rotacional.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Oblíquos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Abdominal+Bicicleta"
  },
  {
    "id": "48",
    "nome_pt": "Saltos em Caixa",
    "nome_en": "Box Jump",
    "descricao_breve": "Pliometria para força explosiva e agilidade.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Caixa pliométrica",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Box+Jump"
  },
  {
    "id": "49",
    "nome_pt": "Push Press",
    "nome_en": "Push Press",
    "descricao_breve": "Desenvolvimento de ombros com impulso das pernas.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Ombros", "Tríceps", "Quadríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Push+Press"
  },
  {
    "id": "50",
    "nome_pt": "Elevação de Pernas Suspenso",
    "nome_en": "Hanging Leg Raise",
    "descricao_breve": "Fortalece o abdómen inferior e flexores do quadril.",
    "category": "Core",
    "musculos_alvo": ["Abdómen Inferior", "Flexores do Quadril"],
    "equipamento": "Barra fixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Hanging+Leg+Raise"
  },
  {
    "id": "51",
    "nome_pt": "Good Morning",
    "nome_en": "Good Morning",
    "descricao_breve": "Fortalecimento da cadeia posterior e lombar.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Lombar", "Isquiotibiais", "Glúteos"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Good+Morning"
  },
  {
    "id": "52",
    "nome_pt": "Flexão com TRX",
    "nome_en": "TRX Push-Up",
    "descricao_breve": "Flexão com instabilidade para maior ativação muscular.",
    "category": "Suspenso",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "TRX",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=TRX+Push-Up"
  },
  {
    "id": "53",
    "nome_pt": "Remada com Halteres Unilateral",
    "nome_en": "One-Arm Dumbbell Row",
    "descricao_breve": "Trabalha costas e bíceps unilateralmente para correção de assimetrias.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Bíceps", "Trapézio"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Remada+Unilateral"
  },
  {
    "id": "54",
    "nome_pt": "Cadeira Abdutora",
    "nome_en": "Hip Abduction Machine",
    "descricao_breve": "Isola os músculos abdutores do quadril para fortalecimento.",
    "category": "Máquinas",
    "musculos_alvo": ["Glúteo Médio", "Glúteo Mínimo"],
    "equipamento": "Máquina abdutora",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Cadeira+Abdutora"
  },
  {
    "id": "55",
    "nome_pt": "Prancha com Toque no Ombro",
    "nome_en": "Plank Shoulder Tap",
    "descricao_breve": "Estabilidade do core com ativação dos ombros.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Prancha+Toque+Ombro"
  },
  {
    "id": "56",
    "nome_pt": "Agachamento Sumô",
    "nome_en": "Sumo Squat",
    "descricao_breve": "Variante do agachamento que foca na parte interna das coxas.",
    "category": "Força",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Halter ou barra (opcional)",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Agachamento+Sumo"
  },
  {
    "id": "57",
    "nome_pt": "Swing com Kettlebell a uma Mão",
    "nome_en": "One-Arm Kettlebell Swing",
    "descricao_breve": "Exercício explosivo para potência unilateral.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Core", "Ombros"],
    "equipamento": "Kettlebell",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=One-arm+Kettlebell+Swing"
  },
  {
    "id": "58",
    "nome_pt": "Flexão em Pé na Parede",
    "nome_en": "Wall Push-Up",
    "descricao_breve": "Variante de flexão para iniciantes ou reabilitação.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Wall+Push-Up"
  },
  {
    "id": "59",
    "nome_pt": "Agachamento com Salto",
    "nome_en": "Jump Squat",
    "descricao_breve": "Pliometria para explosão e potência nas pernas.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Jump+Squat"
  },
  {
    "id": "60",
    "nome_pt": "Remada Cavalinho",
    "nome_en": "T-Bar Row",
    "descricao_breve": "Fortalece os músculos das costas com apoio para o peito.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Barra T ou barra com pegador",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=T-Bar+Row"
  },
  {
    "id": "61",
    "nome_pt": "Abdominal na Bola Suíça",
    "nome_en": "Swiss Ball Crunch",
    "descricao_breve": "Fortalecimento abdominal com apoio instável para maior ativação.",
    "category": "Core",
    "musculos_alvo": ["Abdómen"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Swiss+Ball+Crunch"
  },
  {
    "id": "62",
    "nome_pt": "Dead Bug",
    "nome_en": "Dead Bug",
    "descricao_breve": "Exercício de core para estabilidade e controle motor.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dead+Bug"
  },
  {
    "id": "63",
    "nome_pt": "Afundo com Passada",
    "nome_en": "Walking Lunge",
    "descricao_breve": "Fortalece pernas e glúteos com movimento dinâmico.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Nenhum ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Walking+Lunge"
  },
  {
    "id": "64",
    "nome_pt": "Superman",
    "nome_en": "Superman",
    "descricao_breve": "Fortalece lombar e glúteos com extensão do tronco.",
    "category": "Corretivo",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Superman"
  },
  {
    "id": "65",
    "nome_pt": "Flexão Decline",
    "nome_en": "Decline Push-Up",
    "descricao_breve": "Flexão com os pés elevados para foco no peitoral superior.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral Superior", "Tríceps", "Ombros"],
    "equipamento": "Banco ou plataforma",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Decline+Push-Up"
  },
  {
    "id": "66",
    "nome_pt": "Prancha Dinâmica",
    "nome_en": "Dynamic Plank",
    "descricao_breve": "Prancha com movimentos para aumentar desafio do core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dynamic+Plank"
  },
  {
    "id": "67",
    "nome_pt": "Agachamento Frontal com Barra",
    "nome_en": "Front Squat",
    "descricao_breve": "Agachamento com barra na frente para foco nos quadríceps.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra e pesos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Front+Squat"
  },
  {
    "id": "68",
    "nome_pt": "Swing com Halteres",
    "nome_en": "Dumbbell Swing",
    "descricao_breve": "Variante do kettlebell swing com halteres.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Core"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dumbbell+Swing"
  },
  {
    "id": "69",
    "nome_pt": "Elevação de Pernas na Barra Paralela",
    "nome_en": "Dip Bar Leg Raise",
    "descricao_breve": "Fortalece abdómen inferior com apoio nas barras paralelas.",
    "category": "Core",
    "musculos_alvo": ["Abdómen Inferior", "Flexores do Quadril"],
    "equipamento": "Barras paralelas",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dip+Bar+Leg+Raise"
  },
  {
    "id": "70",
    "nome_pt": "Remada Alta com Barra",
    "nome_en": "Barbell Upright Row",
    "descricao_breve": "Fortalece trapézio e deltoides laterais.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Trapézio", "Deltoides Laterais"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Upright+Row"
  },
  {
    "id": "71",
    "nome_pt": "Abdominal Prancha com Bola",
    "nome_en": "Plank on Swiss Ball",
    "descricao_breve": "Estabilidade do core com apoio instável na bola suíça.",
    "category": "Core",
    "musculos_alvo": ["Core", "Abdómen"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Swiss+Ball"
  },
  {
    "id": "72",
    "nome_pt": "Jumping Jack",
    "nome_en": "Jumping Jack",
    "descricao_breve": "Exercício aeróbico para aquecimento e coordenação.",
    "category": "Cardio",
    "musculos_alvo": ["Coordenação", "Panturrilhas", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Jumping+Jack"
  },
  {
    "id": "73",
    "nome_pt": "Agachamento Isométrico",
    "nome_en": "Wall Sit",
    "descricao_breve": "Fortalecimento isométrico dos quadríceps contra a parede.",
    "category": "Isométrico",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Parede",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Wall+Sit"
  },
  {
    "id": "74",
    "nome_pt": "Prancha com Passada",
    "nome_en": "Plank Walkout",
    "descricao_breve": "Fortalecimento do core e ombros com movimento de caminhada.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Walkout"
  },
  {
    "id": "75",
    "nome_pt": "Flexão de Braços com Apoio",
    "nome_en": "Incline Push-Up",
    "descricao_breve": "Variante de flexão com mãos elevadas para iniciantes.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps"],
    "equipamento": "Banco ou plataforma",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Incline+Push-Up"
  },
  {
    "id": "76",
    "nome_pt": "Agachamento Zercher",
    "nome_en": "Zercher Squat",
    "descricao_breve": "Agachamento com barra na frente, segurando nos braços para fortalecimento do core.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Zercher+Squat"
  },
  {
    "id": "77",
    "nome_pt": "Afundo Lateral",
    "nome_en": "Lateral Lunge",
    "descricao_breve": "Fortalece membros inferiores com foco em abdutores e adutores.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Adutores", "Glúteos"],
    "equipamento": "Nenhum ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Lateral+Lunge"
  },
  {
    "id": "78",
    "nome_pt": "Prancha com Elevação Alternada de Braços",
    "nome_en": "Plank with Alternating Arm Raise",
    "descricao_breve": "Desafio de estabilidade para o core e ombros.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Alt+Arm+Raise"
  },
  {
    "id": "79",
    "nome_pt": "Remada Cavalinho Unilateral",
    "nome_en": "Single-Arm T-Bar Row",
    "descricao_breve": "Variante unilateral do exercício para correção de desequilíbrios.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Barra T",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Single-Arm+T-Bar+Row"
  },
  {
    "id": "80",
    "nome_pt": "Superman Prancha",
    "nome_en": "Superman Plank",
    "descricao_breve": "Prancha com extensão alternada de braços e pernas para estabilidade.",
    "category": "Core",
    "musculos_alvo": ["Core", "Lombar", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Superman+Plank"
  },
   {
    "id": "81",
    "nome_pt": "Elevação de Calcanhar em Pé",
    "nome_en": "Standing Calf Raise",
    "descricao_breve": "Fortalecimento das panturrilhas em posição de pé.",
    "category": "Força",
    "musculos_alvo": ["Panturrilhas"],
    "equipamento": "Nenhum ou máquina de panturrilha",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Standing+Calf+Raise"
  },
  {
    "id": "82",
    "nome_pt": "Elevação de Calcanhar Sentado",
    "nome_en": "Seated Calf Raise",
    "descricao_breve": "Isolamento das panturrilhas com foco no sóleo.",
    "category": "Força",
    "musculos_alvo": ["Panturrilhas"],
    "equipamento": "Máquina sentada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Seated+Calf+Raise"
  },
  {
    "id": "83",
    "nome_pt": "Remada Invertida",
    "nome_en": "Inverted Row",
    "descricao_breve": "Exercício de puxada corporal para costas e bíceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Dorsais", "Bíceps", "Trapézio"],
    "equipamento": "Barra fixa baixa ou TRX",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Inverted+Row"
  },
  {
    "id": "84",
    "nome_pt": "Desenvolvimento Arnold",
    "nome_en": "Arnold Press",
    "descricao_breve": "Desenvolvimento de ombros com rotação para ativar várias cabeças.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Anteriores", "Deltoides Laterais", "Tríceps"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Arnold+Press"
  },
  {
    "id": "85",
    "nome_pt": "Flexão Diamante",
    "nome_en": "Diamond Push-Up",
    "descricao_breve": "Flexão focada no tríceps com mãos juntas em forma de diamante.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Peitoral", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Diamond+Push-Up"
  },
  {
    "id": "86",
    "nome_pt": "Pullover com Haltere",
    "nome_en": "Dumbbell Pullover",
    "descricao_breve": "Exercício para expandir o tórax e fortalecer costas e peitoral.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Peitoral", "Dorsais", "Serrátil Anterior"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dumbbell+Pullover"
  },
  {
    "id": "87",
    "nome_pt": "Prancha Lateral com Elevação de Perna",
    "nome_en": "Side Plank with Leg Lift",
    "descricao_breve": "Variante da prancha lateral que ativa glúteos e abdutores.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Glúteo Médio", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Side+Plank+Leg+Lift"
  },
  {
    "id": "88",
    "nome_pt": "Agachamento com Kettlebell",
    "nome_en": "Kettlebell Goblet Squat",
    "descricao_breve": "Agachamento com kettlebell segurado à frente para melhor postura.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Kettlebell",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Goblet+Squat"
  },
  {
    "id": "89",
    "nome_pt": "Curl Concentrado",
    "nome_en": "Concentration Curl",
    "descricao_breve": "Isolamento para fortalecimento do bíceps.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Concentration+Curl"
  },
  {
    "id": "90",
    "nome_pt": "Ponte de Glúteos",
    "nome_en": "Glute Bridge",
    "descricao_breve": "Exercício para ativação e fortalecimento dos glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Isquiotibiais"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Glute+Bridge"
  },
  {
    "id": "91",
    "nome_pt": "Deadlift Romeno",
    "nome_en": "Romanian Deadlift",
    "descricao_breve": "Fortalecimento dos isquiotibiais e cadeia posterior.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Isquiotibiais", "Glúteos", "Lombar"],
    "equipamento": "Barra ou halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Romanian+Deadlift"
  },
  {
    "id": "92",
    "nome_pt": "Prancha com Bola Medicinal",
    "nome_en": "Plank on Medicine Ball",
    "descricao_breve": "Aumenta o desafio da prancha com apoio instável.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Bola medicinal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Medicine+Ball"
  },
  {
    "id": "93",
    "nome_pt": "Afundo Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Fortalecimento unilateral com pé apoiado em banco atrás.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco e halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bulgarian+Split+Squat"
  },
  {
    "id": "94",
    "nome_pt": "Flexão Arqueiro",
    "nome_en": "Archer Push-Up",
    "descricao_breve": "Flexão unilateral para aumento de força assimétrica.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Archer+Push-Up"
  },
  {
    "id": "95",
    "nome_pt": "Elevação Lateral com Halteres",
    "nome_en": "Dumbbell Lateral Raise",
    "descricao_breve": "Isolamento dos deltoides laterais para ombros definidos.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Laterais"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Lateral+Raise"
  },
  {
    "id": "96",
    "nome_pt": "Remada Curvada com Barra",
    "nome_en": "Bent Over Barbell Row",
    "descricao_breve": "Fortalece a parte média das costas e bíceps.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bent+Over+Row"
  },
  {
    "id": "97",
    "nome_pt": "Crunch Abdominal",
    "nome_en": "Crunch",
    "descricao_breve": "Exercício clássico para fortalecimento do abdómen.",
    "category": "Core",
    "musculos_alvo": ["Abdómen"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Crunch"
  },
  {
    "id": "98",
    "nome_pt": "Prancha com Apoio nos Cotovelos",
    "nome_en": "Forearm Plank",
    "descricao_breve": "Prancha estática para fortalecimento do core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Lombar", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Forearm+Plank"
  },
  {
    "id": "99",
    "nome_pt": "Flexão com Pés Elevados",
    "nome_en": "Decline Push-Up",
    "descricao_breve": "Flexão com ênfase no peitoral superior e ombros.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral Superior", "Tríceps", "Ombros"],
    "equipamento": "Banco ou plataforma",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Decline+Push-Up"
  },
  {
    "id": "100",
    "nome_pt": "Deadlift com Barra",
    "nome_en": "Deadlift",
    "descricao_breve": "Exercício composto para força total da cadeia posterior.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Lombar", "Quadríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Deadlift"
  },
  {
    "id": "101",
    "nome_pt": "Step-up com Halteres",
    "nome_en": "Dumbbell Step-up",
    "descricao_breve": "Exercício unilateral para força e equilíbrio de pernas.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco e halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dumbbell+Step-up"
  },
  {
    "id": "102",
    "nome_pt": "Ponte Unilateral de Glúteos",
    "nome_en": "Single-Leg Glute Bridge",
    "descricao_breve": "Variante unilateral para ativação concentrada do glúteo.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Isquiotibiais"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Single-Leg+Glute+Bridge"
  },
  {
    "id": "103",
    "nome_pt": "Prancha com Toque no Ombro Alternado",
    "nome_en": "Plank Shoulder Tap Alternating",
    "descricao_breve": "Estabilidade e ativação do core e ombros com toque alternado.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Shoulder+Tap+Alt"
  },
  {
    "id": "104",
    "nome_pt": "Extensão de Tríceps com Haltere",
    "nome_en": "Dumbbell Tricep Extension",
    "descricao_breve": "Isolamento do tríceps para força e definição.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Tricep+Extension"
  },
  {
    "id": "105",
    "nome_pt": "Pull-up",
    "nome_en": "Pull-up",
    "descricao_breve": "Exercício de puxada para costas e bíceps, com peso corporal.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Dorsais", "Bíceps", "Trapézio"],
    "equipamento": "Barra fixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Pull-up"
  },
  {
    "id": "106",
    "nome_pt": "Saltos Laterais",
    "nome_en": "Lateral Jumps",
    "descricao_breve": "Pliometria para agilidade e potência lateral.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Lateral+Jumps"
  },
  {
    "id": "107",
    "nome_pt": "Elevação Frontal com Halteres",
    "nome_en": "Dumbbell Front Raise",
    "descricao_breve": "Isolamento dos deltoides anteriores para ombros definidos.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Anteriores"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Front+Raise"
  },
  {
    "id": "108",
    "nome_pt": "Agachamento Búlgaro com Halteres",
    "nome_en": "Bulgarian Split Squat with Dumbbells",
    "descricao_breve": "Versão com peso para maior resistência e força unilateral.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco e halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bulgarian+Split+Dumbbells"
  },
  {
    "id": "109",
    "nome_pt": "Flexão com T Clap",
    "nome_en": "T Clap Push-Up",
    "descricao_breve": "Flexão pliométrica com abertura lateral dos braços para explosão.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=T+Clap+Push-Up"
  },
  {
    "id": "110",
    "nome_pt": "Prancha com Elevação de Braço e Perna Oposta",
    "nome_en": "Bird Dog Plank",
    "descricao_breve": "Estabilidade do core com extensão alternada de membros opostos.",
    "category": "Core",
    "musculos_alvo": ["Core", "Lombar", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bird+Dog+Plank"
  },
  {
    "id": "111",
    "nome_pt": "Abdominal V-up",
    "nome_en": "V-up",
    "descricao_breve": "Exercício abdominal avançado para força e flexibilidade.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Flexores do Quadril"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=V-up"
  },
  {
    "id": "112",
    "nome_pt": "Remada Sentada na Máquina",
    "nome_en": "Seated Row Machine",
    "descricao_breve": "Fortalecimento das costas com apoio e controle de carga.",
    "category": "Máquinas",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Máquina de remada sentada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Seated+Row"
  },
  {
    "id": "113",
    "nome_pt": "Saltos em Profundidade",
    "nome_en": "Depth Jump",
    "descricao_breve": "Pliometria avançada para potência e reação rápida.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Caixa pliométrica",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Depth+Jump"
  },
  {
    "id": "114",
    "nome_pt": "Extensão Lombar no Banco Romano",
    "nome_en": "Roman Chair Back Extension",
    "descricao_breve": "Fortalecimento da lombar e glúteos com suporte.",
    "category": "Força",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Banco romano",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Back+Extension"
  },
  {
    "id": "115",
    "nome_pt": "Flexão Explosiva com Pulo",
    "nome_en": "Clap Push-Up",
    "descricao_breve": "Flexão pliométrica com palmas para potência de membros superiores.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Clap+Push-Up"
  },
  {
    "id": "116",
    "nome_pt": "Agachamento Isométrico na Parede",
    "nome_en": "Wall Sit",
    "descricao_breve": "Isometria para resistência dos músculos das pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Parede",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Wall+Sit"
  },
  {
    "id": "117",
    "nome_pt": "Curl Inverso com Barra",
    "nome_en": "Reverse Barbell Curl",
    "descricao_breve": "Fortalecimento dos músculos do antebraço e braquiorradial.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Antebraço", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Reverse+Curl"
  },
  {
    "id": "118",
    "nome_pt": "Remada Alta com Barra",
    "nome_en": "Upright Row",
    "descricao_breve": "Fortalecimento dos ombros e trapézio.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Laterais", "Trapézio"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Upright+Row"
  },
  {
    "id": "119",
    "nome_pt": "Elevação de Pernas na Barra Fixa",
    "nome_en": "Hanging Leg Raise",
    "descricao_breve": "Fortalecimento abdominal inferior e flexores do quadril.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Abdómen Inferior", "Flexores do Quadril"],
    "equipamento": "Barra fixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Hanging+Leg+Raise"
  },
  {
    "id": "120",
    "nome_pt": "Burpee",
    "nome_en": "Burpee",
    "descricao_breve": "Exercício completo de alta intensidade para força e cardio.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo Inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Burpee"
  },
   {
    "id": "121",
    "nome_pt": "Flexão de Braço com Halteres em Plataforma Instável",
    "nome_en": "Dumbbell Push-Up on Stability Ball",
    "descricao_breve": "Flexão com apoio instável para maior ativação do core e estabilidade.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "Halteres, bola de estabilidade",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=DB+Push-Up+Stability+Ball"
  },
  {
    "id": "122",
    "nome_pt": "Agachamento com Salto e Peso Corporal",
    "nome_en": "Bodyweight Jump Squat",
    "descricao_breve": "Agachamento pliométrico para potência e explosão de membros inferiores.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Jump+Squat"
  },
  {
    "id": "123",
    "nome_pt": "Remada Alta com Halteres",
    "nome_en": "Dumbbell Upright Row",
    "descricao_breve": "Fortalecimento dos deltoides laterais e trapézio com halteres.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Deltoides Laterais", "Trapézio"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=DB+Upright+Row"
  },
  {
    "id": "124",
    "nome_pt": "Agachamento Sumo com Haltere",
    "nome_en": "Dumbbell Sumo Squat",
    "descricao_breve": "Agachamento com postura ampla para ativar adutores e glúteos.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=DB+Sumo+Squat"
  },
  {
    "id": "125",
    "nome_pt": "Prancha com Deslizamento Lateral",
    "nome_en": "Plank with Side Slides",
    "descricao_breve": "Prancha com movimento lateral para ativar core e estabilidade lateral.",
    "category": "Core",
    "musculos_alvo": ["Core", "Oblíquos", "Ombros"],
    "equipamento": "Toalha ou sliders",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Side+Slides"
  },
  {
    "id": "126",
    "nome_pt": "Crunch Bicicleta",
    "nome_en": "Bicycle Crunch",
    "descricao_breve": "Exercício abdominal com movimento rotacional para oblíquos.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Oblíquos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bicycle+Crunch"
  },
  {
    "id": "127",
    "nome_pt": "Kettlebell Swing",
    "nome_en": "Kettlebell Swing",
    "descricao_breve": "Exercício explosivo para força e cardio da cadeia posterior.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Glúteos", "Isquiotibiais", "Core"],
    "equipamento": "Kettlebell",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Kettlebell+Swing"
  },
  {
    "id": "128",
    "nome_pt": "Prancha Lateral Dinâmica",
    "nome_en": "Dynamic Side Plank",
    "descricao_breve": "Prancha lateral com elevação e queda do quadril para maior ativação.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Core", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dynamic+Side+Plank"
  },
  {
    "id": "129",
    "nome_pt": "Passada Lateral com Elástico",
    "nome_en": "Lateral Band Walk",
    "descricao_breve": "Fortalecimento dos abdutores do quadril com resistência elástica.",
    "category": "Força",
    "musculos_alvo": ["Glúteo Médio", "Glúteo Máximo", "Quadril"],
    "equipamento": "Elástico de resistência",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Lateral+Band+Walk"
  },
  {
    "id": "130",
    "nome_pt": "Superman",
    "nome_en": "Superman Exercise",
    "descricao_breve": "Fortalecimento da cadeia posterior com extensão de braços e pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Lombar", "Glúteos", "Trapézio"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Superman+Exercise"
  },
  {
    "id": "131",
    "nome_pt": "Abdominal na Roda",
    "nome_en": "Ab Wheel Rollout",
    "descricao_breve": "Exercício avançado para fortalecimento do core com roda abdominal.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Lombar", "Ombros"],
    "equipamento": "Roda abdominal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Ab+Wheel+Rollout"
  },
  {
    "id": "132",
    "nome_pt": "Pistol Squat Assistido",
    "nome_en": "Assisted Pistol Squat",
    "descricao_breve": "Agachamento unilateral com apoio para equilíbrio e força.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra ou TRX para apoio",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Assisted+Pistol+Squat"
  },
  {
    "id": "133",
    "nome_pt": "Prancha com Toque no Joelho",
    "nome_en": "Plank Knee Tap",
    "descricao_breve": "Prancha com toque alternado nos joelhos para ativar o core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros", "Abdómen"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Knee+Tap"
  },
  {
    "id": "134",
    "nome_pt": "Elevacão de Tronco no Banco Declinado",
    "nome_en": "Decline Sit-Up",
    "descricao_breve": "Exercício abdominal clássico com maior resistência pela inclinação.",
    "category": "Core",
    "musculos_alvo": ["Abdómen"],
    "equipamento": "Banco declinado",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Decline+Sit-Up"
  },
  {
    "id": "135",
    "nome_pt": "Rosca Direta com Barra",
    "nome_en": "Barbell Curl",
    "descricao_breve": "Exercício para fortalecimento dos bíceps com barra.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Barbell+Curl"
  },
  {
    "id": "136",
    "nome_pt": "Agachamento Isométrico com Bola Suíça",
    "nome_en": "Wall Squat with Swiss Ball",
    "descricao_breve": "Agachamento isométrico com bola para apoio e ativação do core.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Wall+Squat+Swiss+Ball"
  },
  {
    "id": "137",
    "nome_pt": "Flexão com Abertura Lateral",
    "nome_en": "Side-to-Side Push-Up",
    "descricao_breve": "Flexão com deslocamento lateral para maior trabalho do peitoral.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Side-to-Side+Push-Up"
  },
  {
    "id": "138",
    "nome_pt": "Extensão de Tríceps na Polia Alta",
    "nome_en": "Tricep Rope Pushdown",
    "descricao_breve": "Isolamento do tríceps usando polia com corda.",
    "category": "Máquinas",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Máquina polia alta com corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Tricep+Rope+Pushdown"
  },
  {
    "id": "139",
    "nome_pt": "Pullover na Polia Alta",
    "nome_en": "Cable Pullover",
    "descricao_breve": "Exercício para dorsal e peitoral usando polia alta.",
    "category": "Máquinas",
    "musculos_alvo": ["Dorsais", "Peitoral"],
    "equipamento": "Máquina polia alta",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Cable+Pullover"
  },
  {
    "id": "140",
    "nome_pt": "Prancha com Elevação de Quadril",
    "nome_en": "Hip Lift Plank",
    "descricao_breve": "Prancha dinâmica para ativar o core e glúteos simultaneamente.",
    "category": "Core",
    "musculos_alvo": ["Core", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Hip+Lift+Plank"
  },
  {
    "id": "141",
    "nome_pt": "Saltos na Caixa",
    "nome_en": "Box Jump",
    "descricao_breve": "Pliometria para explosão e potência em membros inferiores.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Caixa pliométrica",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Box+Jump"
  },
  {
    "id": "142",
    "nome_pt": "Remada Curvada com Halteres",
    "nome_en": "Dumbbell Bent-Over Row",
    "descricao_breve": "Fortalecimento das costas com halteres, foco no trapézio e dorsais.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=DB+Bent-Over+Row"
  },
  {
    "id": "143",
    "nome_pt": "Agachamento com Salto e Peso",
    "nome_en": "Weighted Jump Squat",
    "descricao_breve": "Agachamento pliométrico com peso para maior resistência e potência.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Halteres ou barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Weighted+Jump+Squat"
  },
  {
    "id": "144",
    "nome_pt": "Abdominal com Elevação de Pernas",
    "nome_en": "Leg Raise Crunch",
    "descricao_breve": "Abdominal para fortalecimento dos inferiores e parte baixa do abdómen.",
    "category": "Core",
    "musculos_alvo": ["Abdómen Inferior", "Flexores do Quadril"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Leg+Raise+Crunch"
  },
  {
    "id": "145",
    "nome_pt": "Flexão Isométrica",
    "nome_en": "Isometric Push-Up Hold",
    "descricao_breve": "Manter a posição de flexão para resistência e força isométrica.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Isometric+Push-Up+Hold"
  },
  {
    "id": "146",
    "nome_pt": "Extensão Lombar com Bola Suíça",
    "nome_en": "Swiss Ball Back Extension",
    "descricao_breve": "Fortalecimento lombar usando bola suíça para suporte dinâmico.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Swiss+Ball+Back+Extension"
  },
  {
    "id": "147",
    "nome_pt": "Prancha com Elevação Alternada de Braços",
    "nome_en": "Plank with Alternating Arm Lift",
    "descricao_breve": "Prancha com elevação de braços para maior ativação do core e equilíbrio.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Alternating+Arm+Lift"
  },
  {
    "id": "148",
    "nome_pt": "Agachamento com Salto em Profundidade",
    "nome_en": "Depth Jump Squat",
    "descricao_breve": "Pliometria para explosão dos membros inferiores com salto em caixa.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Caixa pliométrica",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Depth+Jump+Squat"
  },
  {
    "id": "149",
    "nome_pt": "Curl de Bíceps com Elástico",
    "nome_en": "Resistance Band Bicep Curl",
    "descricao_breve": "Fortalecimento dos bíceps usando elástico de resistência.",
    "category": "Força",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Elástico de resistência",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Band+Bicep+Curl"
  },
  {
    "id": "150",
    "nome_pt": "Salto em Profundidade com Corrida",
    "nome_en": "Depth Jump to Sprint",
    "descricao_breve": "Combinação de pliometria e corrida para explosão e velocidade.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas", "Core"],
    "equipamento": "Caixa pliométrica",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Depth+Jump+to+Sprint"
  },
  {
    "id": "151",
    "nome_pt": "Prancha com Rolamento de Bola Medicinal",
    "nome_en": "Medicine Ball Plank Roll",
    "descricao_breve": "Prancha dinâmica com bola para maior desafio de equilíbrio e core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros", "Glúteos"],
    "equipamento": "Bola medicinal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Medicine+Ball+Plank+Roll"
  },
  {
    "id": "152",
    "nome_pt": "Extensão de Tríceps com Halteres Acima da Cabeça",
    "nome_en": "Overhead Dumbbell Tricep Extension",
    "descricao_breve": "Isolamento do tríceps com halteres acima da cabeça.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Overhead+DB+Tricep+Extension"
  },
  {
    "id": "153",
    "nome_pt": "Remada com Barra T",
    "nome_en": "T-Bar Row",
    "descricao_breve": "Fortalecimento das costas com barra T para dorsais e trapézio.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Dorsais", "Trapézio", "Bíceps"],
    "equipamento": "Barra T",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=T-Bar+Row"
  },
  {
    "id": "154",
    "nome_pt": "Agachamento Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Agachamento unilateral para fortalecer pernas e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Banco ou plataforma",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bulgarian+Split+Squat"
  },
  {
    "id": "155",
    "nome_pt": "Flexão Diamante",
    "nome_en": "Diamond Push-Up",
    "descricao_breve": "Flexão focada no tríceps com mãos juntas em formato de diamante.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Peitoral"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Diamond+Push-Up"
  },
  {
    "id": "156",
    "nome_pt": "Levantamento Terra Romeno com Halteres",
    "nome_en": "Romanian Deadlift with Dumbbells",
    "descricao_breve": "Fortalecimento da cadeia posterior com halteres, foco em isquiotibiais.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Isquiotibiais", "Glúteos", "Lombar"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Romanian+Deadlift+DB"
  },
  {
    "id": "157",
    "nome_pt": "Prancha Lateral com Elevação de Perna",
    "nome_en": "Side Plank with Leg Lift",
    "descricao_breve": "Prancha lateral com elevação da perna para ativar glúteos e core.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Side+Plank+Leg+Lift"
  },
  {
    "id": "158",
    "nome_pt": "Flexão Arqueiro",
    "nome_en": "Archer Push-Up",
    "descricao_breve": "Flexão unilateral que trabalha peitoral e ombros de forma isolada.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Ombros", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Archer+Push-Up"
  },
  {
    "id": "159",
    "nome_pt": "Agachamento com Halteres e Elevação de Panturrilha",
    "nome_en": "Dumbbell Squat with Calf Raise",
    "descricao_breve": "Combinação de agachamento com elevação para panturrilhas.",
    "category": "Pesos Livres",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=DB+Squat+Calf+Raise"
  },
  {
    "id": "160",
    "nome_pt": "Burpee com Flexão",
    "nome_en": "Burpee with Push-Up",
    "descricao_breve": "Burpee completo com flexão para força e cardio intensos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo Inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Burpee+with+Push-Up"
  },
  {
    "id": "161",
    "nome_pt": "Prancha com Elevação de Braço",
    "nome_en": "Plank with Arm Raise",
    "descricao_breve": "Melhora a estabilidade do core e ativa os ombros.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Ombros", "Lombar"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "162",
    "nome_pt": "Corrida no Lugar",
    "nome_en": "Running in Place",
    "descricao_breve": "Exercício cardiovascular leve para aquecimento.",
    "category": "Cardio",
    "musculos_alvo": ["Pernas", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "163",
    "nome_pt": "Extensão Lombar na Bola",
    "nome_en": "Back Extension on Stability Ball",
    "descricao_breve": "Fortalece os músculos da região lombar.",
    "category": "Força",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Bola Suíça",
    "animacao_url": ""
  },
  {
    "id": "164",
    "nome_pt": "Abdução de Ombro com Faixa Elástica",
    "nome_en": "Resistance Band Shoulder Abduction",
    "descricao_breve": "Isola os deltoides e melhora a mobilidade do ombro.",
    "category": "Força",
    "musculos_alvo": ["Deltoides"],
    "equipamento": "Faixa Elástica",
    "animacao_url": ""
  },
  {
    "id": "165",
    "nome_pt": "Afundo com Elevação de Joelho",
    "nome_en": "Lunge with Knee Drive",
    "descricao_breve": "Trabalha equilíbrio, força e explosão.",
    "category": "Funcional",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "166",
    "nome_pt": "Tríceps Coice com Halter",
    "nome_en": "Triceps Kickback with Dumbbell",
    "descricao_breve": "Isola a parte posterior do braço.",
    "category": "Força",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "167",
    "nome_pt": "Abdominal Cruzado em Pé",
    "nome_en": "Standing Cross Crunch",
    "descricao_breve": "Trabalha oblíquos e melhora a coordenação.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Abdómen"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "168",
    "nome_pt": "Press Militar com Halteres",
    "nome_en": "Dumbbell Shoulder Press",
    "descricao_breve": "Fortalece os ombros e melhora a postura.",
    "category": "Força",
    "musculos_alvo": ["Deltoides", "Tríceps"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "169",
    "nome_pt": "Corrida Lateral com Toque",
    "nome_en": "Lateral Shuffle with Touch",
    "descricao_breve": "Ativa pernas e melhora a agilidade.",
    "category": "Cardio",
    "musculos_alvo": ["Adutores", "Quadríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "170",
    "nome_pt": "Agachamento com Impulso Lateral",
    "nome_en": "Squat with Side Kick",
    "descricao_breve": "Combina força e coordenação.",
    "category": "Funcional",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "171",
    "nome_pt": "Flexão Arqueada",
    "nome_en": "Archer Push-up",
    "descricao_breve": "Versão avançada de flexão com foco em um braço.",
    "category": "Força",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "172",
    "nome_pt": "Stiff com Halteres",
    "nome_en": "Dumbbell Romanian Deadlift",
    "descricao_breve": "Trabalha isquiotibiais e glúteos.",
    "category": "Força",
    "musculos_alvo": ["Isquiotibiais", "Glúteos", "Lombar"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "173",
    "nome_pt": "Abdução de Quadril de Pé",
    "nome_en": "Standing Hip Abduction",
    "descricao_breve": "Fortalece os glúteos médios e melhora a estabilidade.",
    "category": "Funcional",
    "musculos_alvo": ["Glúteo Médio"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "174",
    "nome_pt": "Elevação de Ombros com Barra",
    "nome_en": "Barbell Shrugs",
    "descricao_breve": "Foca no trapézio superior.",
    "category": "Força",
    "musculos_alvo": ["Trapézio"],
    "equipamento": "Barra",
    "animacao_url": ""
  },
  {
    "id": "175",
    "nome_pt": "Ponte de Glúteos Unilateral",
    "nome_en": "Single-leg Glute Bridge",
    "descricao_breve": "Fortalece os glúteos e lombar, desafiando o equilíbrio.",
    "category": "Core",
    "musculos_alvo": ["Glúteos", "Lombar", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "176",
    "nome_pt": "Pular à Corda com Pés Alternados",
    "nome_en": "Alternate Foot Jump Rope",
    "descricao_breve": "Exercício cardiovascular com coordenação.",
    "category": "Cardio",
    "musculos_alvo": ["Pernas", "Core"],
    "equipamento": "Corda",
    "animacao_url": ""
  },
  {
    "id": "177",
    "nome_pt": "Bíceps Concentrado com Halter",
    "nome_en": "Concentration Curl",
    "descricao_breve": "Exercício isolado para o bíceps.",
    "category": "Força",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "178",
    "nome_pt": "Escalador de Montanha com Torção",
    "nome_en": "Twisting Mountain Climbers",
    "descricao_breve": "Versão intensa que ativa também os oblíquos.",
    "category": "HIIT",
    "musculos_alvo": ["Core", "Ombros", "Peitoral"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "179",
    "nome_pt": "Pistol Squat Assistido",
    "nome_en": "Assisted Pistol Squat",
    "descricao_breve": "Versão acessível do agachamento unilateral.",
    "category": "Força",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra de apoio ou TRX",
    "animacao_url": ""
  },
  {
    "id": "180",
    "nome_pt": "Prancha Lateral com Rotação",
    "nome_en": "Side Plank with Rotation",
    "descricao_breve": "Desafia a estabilidade e ativa os oblíquos.",
    "category": "Core",
    "musculos_alvo": ["Oblíquos", "Abdómen", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
   {
    "id": "181",
    "nome_pt": "Agachamento com salto",
    "nome_en": "Jump Squat",
    "descricao_breve": "Exercício pliométrico que desenvolve força explosiva nos membros inferiores.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilhas"],
    "equipamento": "Peso corporal",
    "animacao_url": ""
  },
  {
    "id": "182",
    "nome_pt": "Rosca Scott com barra",
    "nome_en": "Preacher Curl with Barbell",
    "descricao_breve": "Isola o bíceps e evita trapaças durante o movimento.",
    "category": "Força",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Banco Scott, Barra",
    "animacao_url": ""
  },
  {
    "id": "183",
    "nome_pt": "Tríceps na testa com barra",
    "nome_en": "Skullcrusher",
    "descricao_breve": "Exercício clássico para o desenvolvimento do tríceps.",
    "category": "Força",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Barra EZ ou halteres",
    "animacao_url": ""
  },
  {
    "id": "184",
    "nome_pt": "Lateral com elástico",
    "nome_en": "Resistance Band Lateral Raise",
    "descricao_breve": "Trabalha os deltoides laterais com resistência constante.",
    "category": "Resistência",
    "musculos_alvo": ["Deltoide lateral"],
    "equipamento": "Elástico",
    "animacao_url": ""
  },
  {
    "id": "185",
    "nome_pt": "Elevação de calcanhar sentado",
    "nome_en": "Seated Calf Raise",
    "descricao_breve": "Foca o músculo sóleo da panturrilha.",
    "category": "Força",
    "musculos_alvo": ["Panturrilhas"],
    "equipamento": "Máquina específica ou barra sobre os joelhos",
    "animacao_url": ""
  },
  {
    "id": "186",
    "nome_pt": "Stiff unilateral com halteres",
    "nome_en": "Single-Leg Romanian Deadlift",
    "descricao_breve": "Desafia o equilíbrio e força do posterior de coxa.",
    "category": "Força",
    "musculos_alvo": ["Isquiotibiais", "Glúteos"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "187",
    "nome_pt": "Swing com kettlebell",
    "nome_en": "Kettlebell Swing",
    "descricao_breve": "Exercício dinâmico que trabalha o corpo todo e o core.",
    "category": "Funcional",
    "musculos_alvo": ["Glúteos", "Core", "Lombar"],
    "equipamento": "Kettlebell",
    "animacao_url": ""
  },
  {
    "id": "188",
    "nome_pt": "Flexão hindu",
    "nome_en": "Hindu Push-up",
    "descricao_breve": "Flexão dinâmica que também alonga a cadeia posterior.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Ombros", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "189",
    "nome_pt": "Abdução de quadril deitado",
    "nome_en": "Side-Lying Hip Abduction",
    "descricao_breve": "Fortalece os abdutores do quadril.",
    "category": "Reabilitação",
    "musculos_alvo": ["Glúteo médio"],
    "equipamento": "Peso corporal ou mini-band",
    "animacao_url": ""
  },
  {
    "id": "190",
    "nome_pt": "Crucifixo inclinado com halteres",
    "nome_en": "Incline Dumbbell Fly",
    "descricao_breve": "Trabalha o peitoral superior com amplitude de movimento.",
    "category": "Força",
    "musculos_alvo": ["Peitoral"],
    "equipamento": "Halteres, banco inclinado",
    "animacao_url": ""
  },
  {
    "id": "191",
    "nome_pt": "Caminhada com avanço",
    "nome_en": "Walking Lunges",
    "descricao_breve": "Exercício composto que trabalha as pernas e glúteos.",
    "category": "Funcional",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Isquiotibiais"],
    "equipamento": "Peso corporal ou halteres",
    "animacao_url": ""
  },
  {
    "id": "192",
    "nome_pt": "Extensão de tronco em banco romano",
    "nome_en": "Back Extension",
    "descricao_breve": "Foca na lombar e estabilizadores do core.",
    "category": "Força",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Banco romano",
    "animacao_url": ""
  },
  {
    "id": "193",
    "nome_pt": "Flexão com toque no ombro",
    "nome_en": "Shoulder Tap Push-up",
    "descricao_breve": "Exercício de estabilidade e força para o core e membros superiores.",
    "category": "Funcional",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "Peso corporal",
    "animacao_url": ""
  },
  {
    "id": "194",
    "nome_pt": "Ponte unilateral",
    "nome_en": "Single-Leg Glute Bridge",
    "descricao_breve": "Ativa profundamente os glúteos de forma isolada.",
    "category": "Core",
    "musculos_alvo": ["Glúteos", "Lombar"],
    "equipamento": "Peso corporal",
    "animacao_url": ""
  },
  {
    "id": "195",
    "nome_pt": "Corrida no lugar com joelhos altos",
    "nome_en": "High Knees",
    "descricao_breve": "Exercício cardiovascular intenso.",
    "category": "Cardio",
    "musculos_alvo": ["Quadríceps", "Core", "Panturrilhas"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "196",
    "nome_pt": "Pull-over com halteres",
    "nome_en": "Dumbbell Pullover",
    "descricao_breve": "Exercício híbrido que ativa costas e peitoral.",
    "category": "Força",
    "musculos_alvo": ["Peitoral", "Dorsal"],
    "equipamento": "Halteres, banco",
    "animacao_url": ""
  },
  {
    "id": "197",
    "nome_pt": "Agachamento sumô com halteres",
    "nome_en": "Sumo Squat with Dumbbell",
    "descricao_breve": "Versão do agachamento com ênfase em adutores.",
    "category": "Força",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Halteres",
    "animacao_url": ""
  },
  {
    "id": "198",
    "nome_pt": "Abdominal em V",
    "nome_en": "V-up",
    "descricao_breve": "Exercício abdominal avançado que trabalha toda a região do core.",
    "category": "Core",
    "musculos_alvo": ["Abdómen", "Flexores do quadril"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "199",
    "nome_pt": "Flexão arqueada",
    "nome_en": "Archer Push-up",
    "descricao_breve": "Trabalha o peitoral de forma unilateral e intensa.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": ""
  },
  {
    "id": "200",
    "nome_pt": "Elevação frontal com disco",
    "nome_en": "Front Plate Raise",
    "descricao_breve": "Desenvolve os deltoides frontais.",
    "category": "Força",
    "musculos_alvo": ["Deltoide anterior"],
    "equipamento": "Disco de peso",
    "animacao_url": ""
  },
  {
    "id": "201",
    "nome_pt": "Tríceps Coice com Halteres",
    "nome_en": "Triceps Kickbacks",
    "descricao_breve": "Isola os tríceps com movimento controlado de extensão.",
    "category": "Força",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Triceps+Kickbacks"
  },
  {
    "id": "202",
    "nome_pt": "Passada com Peso Sobre a Cabeça",
    "nome_en": "Overhead Walking Lunge",
    "descricao_breve": "Desafia equilíbrio e força com peso acima da cabeça.",
    "category": "Força",
    "musculos_alvo": ["Glúteos", "Quadríceps", "Core", "Ombros"],
    "equipamento": "Halter ou barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Overhead+Lunge"
  },
  {
    "id": "203",
    "nome_pt": "Ponte com Bola Suíça",
    "nome_en": "Swiss Ball Glute Bridge",
    "descricao_breve": "Intensifica o trabalho de glúteos com instabilidade.",
    "category": "Core",
    "musculos_alvo": ["Glúteos", "Lombar", "Isquiotibiais"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Swiss+Ball+Glute+Bridge"
  },
  {
    "id": "204",
    "nome_pt": "Saltos na Caixa",
    "nome_en": "Box Jumps",
    "descricao_breve": "Exercício pliométrico para explosão e força nas pernas.",
    "category": "Pliometria",
    "musculos_alvo": ["Quadríceps", "Panturrilhas", "Glúteos"],
    "equipamento": "Caixa de salto",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Box+Jumps"
  },
  {
    "id": "205",
    "nome_pt": "Flexão Hindú",
    "nome_en": "Hindu Push-up",
    "descricao_breve": "Trabalha força e mobilidade com padrão dinâmico.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peitoral", "Ombros", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Hindu+Pushup"
  },
  {
    "id": "206",
    "nome_pt": "Escalador com Torção",
    "nome_en": "Twisting Mountain Climbers",
    "descricao_breve": "Adiciona rotação ao core durante o movimento.",
    "category": "Cardio",
    "musculos_alvo": ["Core", "Abdómen", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Twisting+Mountain+Climbers"
  },
  {
    "id": "207",
    "nome_pt": "Remada Curvada com Barra",
    "nome_en": "Barbell Bent-over Row",
    "descricao_breve": "Trabalha dorsal e estabilizadores do core.",
    "category": "Força",
    "musculos_alvo": ["Dorsal", "Trapézio", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Barbell+Row"
  },
  {
    "id": "208",
    "nome_pt": "Prancha com Toque nos Ombros",
    "nome_en": "Plank Shoulder Taps",
    "descricao_breve": "Desafia estabilidade e força do core.",
    "category": "Core",
    "musculos_alvo": ["Core", "Ombros", "Abdómen"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Plank+Shoulder+Taps"
  },
  {
    "id": "209",
    "nome_pt": "Agachamento Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Foco unilateral em força e estabilidade.",
    "category": "Força",
    "musculos_alvo": ["Glúteos", "Quadríceps", "Core"],
    "equipamento": "Banco e halteres",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Bulgarian+Split+Squat"
  },
  {
    "id": "210",
    "nome_pt": "Pull Over com Halteres",
    "nome_en": "Dumbbell Pullover",
    "descricao_breve": "Trabalha peitoral e dorsal simultaneamente.",
    "category": "Força",
    "musculos_alvo": ["Peitoral", "Dorsal", "Serrátil"],
    "equipamento": "Halter e banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Dumbbell+Pullover"
  }

  // … e assim por diante com os outros objetos do array
];
// --- TRADUÇÕES E MAPPING - POSICIONADAS CORRETAMENTE APÓS A DECLARAÇÃO DE PREDEFINED_EXERCISES ---
  const CATEGORY_PT = {
    Strength: "Força",
    Cardio: "Cardio",
    Flexibility: "Flexibilidade",
    HIIT: "HIIT",
    Funcional: "Funcional",
    Aerobic: "Aeróbico",
    Stretching: "Alongamento",
    "Peso Corporal": "Peso Corporal",
     Equipamento: "Equipamento", // Adicionado para corresponder aos dados dos exercícios
  };
  const MUSCLES_PT = {
    Chest: "Peito",
    Back: "Costas",
    Shoulders: "Ombros",
    "Upper Arms": "Braços",
    Thighs: "Coxas",
    Hips: "Ancas",
    Waist: "Cintura",
    Abdomen: "Abdómen",
    Glutes: "Glúteos",
    "Corpo Inteiro": "Corpo Inteiro",
    Calves: "Gémeos",
    Forearms: "Antebraços",
    Cardio: "Cardio",
    Plyometrics: "Pliometria",
    Neck: "Pescoço",
    Stretching: "Alongamento",
    Core: "Core",
    Quadríceps: "Quadríceps",
    Adutores: "Adutores", // Adicionei este com base no teu exemplo de Agachamento Sumô
  };
  const EQUIP_PT = {
    Bodyweight: "Peso Corporal",
    Band: "Banda de Resistência",
    Cable: "Cabo",
    Barbell: "Barra",
    Dumbbell: "Haltere",
    "Leverage machine": "Máquina de Alavanca",
    "Stability Ball": "Bola de Estabilidade",
    Bench: "Banco",
    "Decline Bench": "Banco Declinado",
    "Medicine Ball": "Bola Medicinal",
    "EZ Barbell": "Barra EZ",
    "Resistance Band": "Banda de Resistência",
    "Jump Rope": "Corda de Saltar",
    "Stationary Bike": "Bicicleta Estática",
    "Rowing Machine": "Máquina de Remo",
    Weighted: "Com Peso",
    Suspension: "Suspensão",
    "Ab Roller": "Rolo Abdominal",
    Cone: "Cone",
    "Pull-up Bar": "Barra Fixa",
    Other: "Outro",
    Nenhum: "Nenhum",
    Paralelas: "Paralelas",
    "Exercise Ball": "Bola de Exercício",
    "Smith Machine": "Máquina Smith",
    Kettlebell: "Kettlebell",
  };
  
  export const PREDEFINED_EXERCISES_PT = PREDEFINED_EXERCISES.map(ex => ({
    ...ex,
    // Usa o campo 'category' do objeto de exercício
    category: CATEGORY_PT[ex.category] || ex.category,
    // Mapeia cada músculo alvo
    musculos_alvo: ex.musculos_alvo.map(m => MUSCLES_PT[m] || m),
    // Lida com 'equipment' que pode ser string ou array
    equipment: Array.isArray(ex.equipment)
      ? ex.equipment.map(eq => EQUIP_PT[eq] || eq)
      : (ex.equipment ? [EQUIP_PT[ex.equipment] || ex.equipment] : []), // Garante que é sempre um array
    animationUrl: ex.animacao_url || "http://techslides.com/demos/sample-videos/small.mp4", // Usa o animacao_url do exercício, ou fallback
  }));
  
  export default function ExerciseLibraryScreen() {
    const navigation = useNavigation();
    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isAnimationModalVisible, setIsAnimationModalVisible] = useState(false);
    const [currentAnimationUrl, setCurrentAnimationUrl] = useState('');
    const [currentExercise, setCurrentExercise] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedMuscles, setSelectedMuscles] = useState([]);
    const [selectedEquipment, setSelectedEquipment] = useState([]);
    const [exerciseForm, setExerciseForm] = useState({
      name: '',
      description: '',
      category: '',
      targetMuscles: [],
      equipment: [],
      animationUrl: '',
      imageUrl: '',
    });
    const [searchQuery, setSearchQuery] = useState('');
  
    const seedExercises = async () => {
      try {
        const exercisesColRef = collection(db, 'exercises');
        const snapshot = await getDocs(exercisesColRef);
  
        if (snapshot.empty) {
          console.log("Coleção 'exercises' vazia. A preencher com dados predefinidos...");
          const addPromises = PREDEFINED_EXERCISES_PT.map(exercise =>
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
const exercisesColRef = collection(db, 'exercises'); // se a coleção se chama "exercises"
      const q = query(exercisesColRef, orderBy('nome_pt', 'asc')); // Ordem pelo nome_pt
  
     const unsubscribe = onSnapshot(q, (snapshot) => {
  console.log("Snapshot recebido:", snapshot.docs.length);
  const fetchedExercises = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
  setExercises(fetchedExercises);
  setLoading(false);
}, (err) => {
  console.error("Erro no onSnapshot:", err);
  setError("Não foi possível carregar os exercícios.");
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
    const filteredExercises = useMemo(() =>
      exercises.filter(exercise => {
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(exercise.category);
        const matchesMuscles = selectedMuscles.length === 0 || exercise.musculos_alvo.some(m => selectedMuscles.includes(m));
        const matchesEquipment = selectedEquipment.length === 0 || (Array.isArray(exercise.equipment) && exercise.equipment.some(eq => selectedEquipment.includes(eq)));
  
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          exercise.nome_pt.toLowerCase().includes(searchLower) || // Procura pelo nome em PT
          (exercise.descricao_breve && exercise.descricao_breve.toLowerCase().includes(searchLower)) ||
          (exercise.category && exercise.category.toLowerCase().includes(searchLower)) ||
          (exercise.musculos_alvo && exercise.musculos_alvo.some(muscle => muscle.toLowerCase().includes(searchLower))) ||
          (Array.isArray(exercise.equipment) && exercise.equipment.some(eq => eq.toLowerCase().includes(searchLower)));
  
        return matchesCategory && matchesMuscles && matchesEquipment && matchesSearch;
      }),
      [exercises, searchQuery, selectedCategories, selectedMuscles, selectedEquipment] // Adicionado selectedEquipment
    );
  
    const openExerciseModal = (exercise = null) => {
      if (exercise) {
        setCurrentExercise(exercise);
        setExerciseForm({
          name: exercise.nome_pt || '', // Usar nome_pt
          description: exercise.descricao_breve || '', // Usar descricao_breve
          category: exercise.category || '',
          targetMuscles: exercise.musculos_alvo || [], // Usar musculos_alvo
          equipment: exercise.equipamento || [], // Usar equipamento
          animationUrl: exercise.animacao_url || '',
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
      // Altere para nome_pt e descricao_breve conforme o seu modelo
      if (!exerciseForm.name || !exerciseForm.description || !exerciseForm.category || exerciseForm.targetMuscles.length === 0) {
        Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios (Nome, Descrição, category, Músculos Alvo).');
        return;
      }
  
      setLoading(true);
      try {
        const dataToSave = {
          nome_pt: exerciseForm.name,
          descricao_breve: exerciseForm.description,
          category: exerciseForm.category,
          musculos_alvo: exerciseForm.targetMuscles,
          equipamento: exerciseForm.equipment,
          animacao_url: exerciseForm.animationUrl,
          imageUrl: exerciseForm.imageUrl,
        };
  
        if (currentExercise) {
          const exerciseRef = doc(db, 'exercises', currentExercise.id);
          await updateDoc(exerciseRef, dataToSave);
          Alert.alert('Sucesso', 'Exercício atualizado com sucesso!');
        } else {
          await addDoc(collection(db, 'exercises'), dataToSave);
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
  
    const renderExerciseItem = useCallback(({ item }) => (
      <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName}>{item.nome_pt}</Text> 
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

<Text style={styles.exerciseMuscles}>
  Músculos:{' '}
  {Array.isArray(item.musculos_alvo) && item.musculos_alvo.length > 0
    ? item.musculos_alvo.join(', ')
    : 'Não especificado'}
</Text>

{Array.isArray(item.equipamento) && item.equipamento.length > 0 ? (
  <Text style={styles.exerciseEquipment}>
    Equipamento: {item.equipamento.join(', ')}
  </Text>
) : null}
        {item.animacao_url ? (
          <TouchableOpacity
            style={styles.animationButton}
            onPress={() => openAnimationModal(item.animacao_url)}
          >
            <Ionicons name="play-circle-outline" size={24} color={Colors.white} />
            <Text style={styles.animationButtonText}>Ver Animação</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ), []);
  
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
        {/* Filtros rápidos */}
        <View style={{ marginHorizontal: 15, marginBottom: 10 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Categoria:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EXERCISE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pickerOption,
                  selectedCategories.includes(cat) && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCategories(selectedCategories.includes(cat)
                    ? selectedCategories.filter(c => c !== cat)
                    : [...selectedCategories, cat]);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  selectedCategories.includes(cat) && styles.pickerOptionTextSelected,
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontWeight: 'bold', marginVertical: 4 }}>Músculos:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TARGET_MUSCLES.map(muscle => (
              <TouchableOpacity
                key={muscle}
                style={[
                  styles.pickerOption,
                  selectedMuscles.includes(muscle) && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setSelectedMuscles(selectedMuscles.includes(muscle)
                    ? selectedMuscles.filter(m => m !== muscle)
                    : [...selectedMuscles, muscle]);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  selectedMuscles.includes(muscle) && styles.pickerOptionTextSelected,
                ]}>
                  {muscle}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={{ fontWeight: 'bold', marginVertical: 4 }}>Equipamento:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {EQUIPMENT_OPTIONS.map(eq => (
              <TouchableOpacity
                key={eq}
                style={[
                  styles.pickerOption,
                  selectedEquipment.includes(eq) && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setSelectedEquipment(selectedEquipment.includes(eq)
                    ? selectedEquipment.filter(e => e !== eq)
                    : [...selectedEquipment, eq]);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  selectedEquipment.includes(eq) && styles.pickerOptionTextSelected,
                ]}>
                  {eq}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {(selectedCategories.length > 0 || selectedMuscles.length > 0 || selectedEquipment.length > 0) && (
            <TouchableOpacity
              style={[styles.pickerOption, { backgroundColor: Colors.errorRed, marginTop: 6 }]}
              onPress={() => {
                setSelectedCategories([]);
                setSelectedMuscles([]);
                setSelectedEquipment([]);
              }}
            >
              <Text style={[styles.pickerOptionText, { color: Colors.white }]}>Limpar Filtros</Text>
            </TouchableOpacity>
          )}
        </View>
  
        {/* Conteúdo Principal */}
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
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.flatListContent}
            initialNumToRender={8}
            maxToRenderPerBatch={12}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
          />
        )}
  
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
      paddingHorizontal: 15,
      paddingBottom: 20, // Adicionado padding inferior para melhor visualização do último item
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
      maxHeight: Dimensions.get('window').height * 0.6, // Ajuste a altura máxima para não ocupar todo o modal
      paddingRight: 5, // Para ScrollView ter espaço para a barra de rolagem
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: Colors.darkGray,
      marginBottom: 5,
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
      marginTop: 5,
      // Adicionado border para visualização
      borderWidth: 1,
      borderColor: Colors.inputBorder,
      borderRadius: 8,
      padding: 5,
      backgroundColor: Colors.white,
    },
    pickerOption: {
      backgroundColor: Colors.lightGray,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      margin: 4,
      borderWidth: 1,
      borderColor: Colors.mediumGray,
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
      width: '45%',
    },
    modalButtonCancel: {
      backgroundColor: Colors.mediumGray,
    },
    modalButtonSave: {
      backgroundColor: Colors.primaryGold,
    },
    modalButtonText: {
      color: Colors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    animationModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    animationModalContent: {
      backgroundColor: Colors.black,
      borderRadius: 10,
      width: width * 0.9,
      height: height * 0.7,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 10,
    },
    webView: {
      width: '100%',
      height: '90%',
    },
    noAnimationText: {
      color: Colors.white,
      fontSize: 18,
    },
    animationModalCloseButton: {
      marginTop: 15,
      backgroundColor: Colors.errorRed,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    animationModalCloseButtonText: {
      color: Colors.white,
      fontWeight: 'bold',
    },
  });