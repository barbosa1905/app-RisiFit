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
const EXERCISE_CATEGORIES = ['Força', 'Aeróbico', 'Alongamento', 'HIIT', 'Funcional', 'Peso Corporal']; // Adicionado 'Peso Corporal'
const TARGET_MUSCLES = ['Peito', 'Costas', 'Ombros', 'Braços', 'Pernas', 'Abdómen', 'Glúteos', 'Core', 'Corpo Inteiro', 'Quadríceps', 'Adutores']; // Adicionados 'Core', 'Quadríceps', 'Adutores'
const EQUIPMENT_OPTIONS = ['Halters', 'Barra', 'Máquina', 'Peso Corporal', 'Bandas de Resistência', 'Corda de Saltar', 'Kettlebell', 'Outro', 'Nenhum', 'Banco', 'Barra Fixa', 'Paralelas'];

// Lista de Exercícios Predefinidos
export const PREDEFINED_EXERCISES = [
  {
    "id": "agachamento",
    "nome_pt": "Agachamento",
    "nome_en": "Squat",
    "descricao_breve": "Exercício fundamental para membros inferiores.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_sumô",
    "nome_pt": "Agachamento Sumô",
    "nome_en": "Sumo Squat",
    "descricao_breve": "Trabalha interno de coxa e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo",
    "nome_pt": "Afundo",
    "nome_en": "Lunge",
    "descricao_breve": "Exercício unilateral para pernas e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_lateral",
    "nome_pt": "Afundo Lateral",
    "nome_en": "Side Lunge",
    "descricao_breve": "Trabalha adutores e quadríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Adutores", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_reverso",
    "nome_pt": "Afundo Reverso",
    "nome_en": "Reverse Lunge",
    "descricao_breve": "Exercício unilateral para glúteos e pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_pistola",
    "nome_pt": "Agachamento Pistola",
    "nome_en": "Pistol Squat",
    "descricao_breve": "Agachamento unilateral intenso.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_bulgaro",
    "nome_pt": "Agachamento Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Exercício unilateral com banco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "step_up",
    "nome_pt": "Subida no Banco",
    "nome_en": "Step Up",
    "descricao_breve": "Exercício funcional para pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "panturrilha_em_pe",
    "nome_pt": "Panturrilha em Pé",
    "nome_en": "Standing Calf Raise",
    "descricao_breve": "Exercício para panturrilhas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "panturrilha_sentado",
    "nome_pt": "Panturrilha Sentado",
    "nome_en": "Seated Calf Raise",
    "descricao_breve": "Exercício para panturrilha sentado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_braços",
    "nome_pt": "Flexão de Braços",
    "nome_en": "Push-up",
    "descricao_breve": "Exercício clássico para peito e tríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_inclinada",
    "nome_pt": "Flexão Inclinada",
    "nome_en": "Incline Push-up",
    "descricao_breve": "Flexão com apoio elevado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Superior", "Tríceps"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_declinado",
    "nome_pt": "Flexão Declinada",
    "nome_en": "Decline Push-up",
    "descricao_breve": "Flexão com apoio dos pés elevado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Inferior", "Tríceps"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_diamante",
    "nome_pt": "Flexão Diamante",
    "nome_en": "Diamond Push-up",
    "descricao_breve": "Flexão com mãos juntas, foco em tríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Peito"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_aberta",
    "nome_pt": "Flexão Aberta",
    "nome_en": "Wide Push-up",
    "descricao_breve": "Flexão com mãos afastadas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_unilateral",
    "nome_pt": "Flexão Unilateral",
    "nome_en": "One Arm Push-up",
    "descricao_breve": "Flexão feita com um braço.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_explosiva",
    "nome_pt": "Flexão Explosiva",
    "nome_en": "Clap Push-up",
    "descricao_breve": "Flexão com batida de palmas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_joelhos",
    "nome_pt": "Flexão de Joelhos",
    "nome_en": "Knee Push-up",
    "descricao_breve": "Flexão para iniciantes, apoio nos joelhos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_mesa",
    "nome_pt": "Flexão na Mesa",
    "nome_en": "Tabletop Push-up",
    "descricao_breve": "Flexão com apoio em mesa.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Mesa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_banco",
    "nome_pt": "Tríceps no Banco",
    "nome_en": "Bench Dip",
    "descricao_breve": "Exercício para tríceps com banco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Ombros"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_chao",
    "nome_pt": "Tríceps no Chão",
    "nome_en": "Floor Triceps Dip",
    "descricao_breve": "Tríceps com apoio no chão.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "prancha",
    "nome_pt": "Prancha",
    "nome_en": "Plank",
    "descricao_breve": "Exercício isométrico para core.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "prancha_lateral",
    "nome_pt": "Prancha Lateral",
    "nome_en": "Side Plank",
    "descricao_breve": "Prancha para oblíquos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "prancha_alternada",
    "nome_pt": "Prancha Alternada",
    "nome_en": "Alternating Plank",
    "descricao_breve": "Prancha com elevação alternada de braços.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "prancha_dinâmica",
    "nome_pt": "Prancha Dinâmica",
    "nome_en": "Dynamic Plank",
    "descricao_breve": "Prancha alternando cotovelos e mãos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "mountain_climber",
    "nome_pt": "Escalador",
    "nome_en": "Mountain Climber",
    "descricao_breve": "Exercício dinâmico para core e cardio.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee",
    "nome_pt": "Burpee",
    "nome_en": "Burpee",
    "descricao_breve": "Exercício completo de alta intensidade.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "polichinelo",
    "nome_pt": "Polichinelo",
    "nome_en": "Jumping Jack",
    "descricao_breve": "Exercício aeróbico para corpo inteiro.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crunch_abdominal",
    "nome_pt": "Crunch Abdominal",
    "nome_en": "Abdominal Crunch",
    "descricao_breve": "Exercício tradicional para abdômen.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crunch_bicicleta",
    "nome_pt": "Crunch Bicicleta",
    "nome_en": "Bicycle Crunch",
    "descricao_breve": "Abdominal alternando joelhos e cotovelos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Oblíquos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crunch_obliquo",
    "nome_pt": "Crunch Oblíquo",
    "nome_en": "Oblique Crunch",
    "descricao_breve": "Abdominal com foco nos oblíquos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crunch_invertido",
    "nome_pt": "Crunch Invertido",
    "nome_en": "Reverse Crunch",
    "descricao_breve": "Abdominal levantando quadris.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_canivete",
    "nome_pt": "Abdominal Canivete",
    "nome_en": "Jackknife Sit-up",
    "descricao_breve": "Abdominal com elevação simultânea de pernas e tronco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_remador",
    "nome_pt": "Abdominal Remador",
    "nome_en": "Rowing Sit-up",
    "descricao_breve": "Tronco e pernas simultâneos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_pernas",
    "nome_pt": "Elevação de Pernas",
    "nome_en": "Leg Raise",
    "descricao_breve": "Abdominal com pernas estendidas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_pernas_suspenso",
    "nome_pt": "Elevação de Pernas Suspenso",
    "nome_en": "Hanging Leg Raise",
    "descricao_breve": "Abdominal na barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_corda",
    "nome_pt": "Abdominal com Corda",
    "nome_en": "Cable Crunch",
    "descricao_breve": "Abdominal usando corda.",
    "category": "Máquina",
    "musculos_alvo": ["Core"],
    "equipamento": "Corda e polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_obliquo_deitado",
    "nome_pt": "Abdominal Oblíquo Deitado",
    "nome_en": "Lying Oblique Crunch",
    "descricao_breve": "Foco nos lados do abdômen.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_quadril",
    "nome_pt": "Elevação de Quadril",
    "nome_en": "Hip Raise",
    "descricao_breve": "Exercício para glúteos e core.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_pelvica",
    "nome_pt": "Elevação Pélvica",
    "nome_en": "Hip Thrust",
    "descricao_breve": "Exercício para glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "ponte_gluteo",
    "nome_pt": "Ponte de Glúteo",
    "nome_en": "Glute Bridge",
    "descricao_breve": "Ativa glúteos e core.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_lateral_perna",
    "nome_pt": "Elevação Lateral de Perna",
    "nome_en": "Side Leg Raise",
    "descricao_breve": "Ativa abdutores e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Abdutores", "Glúteos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_frontal_perna",
    "nome_pt": "Elevação Frontal de Perna",
    "nome_en": "Front Leg Raise",
    "descricao_breve": "Ativa quadríceps e flexores do quadril.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Flexores do Quadril"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_posterior_perna",
    "nome_pt": "Elevação Posterior de Perna",
    "nome_en": "Donkey Kick",
    "descricao_breve": "Ativa glúteos e posteriores.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Posterior de Coxa"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_curvada_barra",
    "nome_pt": "Remada Curvada com Barra",
    "nome_en": "Barbell Bent Over Row",
    "descricao_breve": "Força e volume para costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_halter",
    "nome_pt": "Remada com Halter",
    "nome_en": "Dumbbell Row",
    "descricao_breve": "Fortalece costas e bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_unilateral_halter",
    "nome_pt": "Remada Unilateral com Halter",
    "nome_en": "One Arm Dumbbell Row",
    "descricao_breve": "Remada para costas com halter.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_maquina",
    "nome_pt": "Remada na Máquina",
    "nome_en": "Seated Row",
    "descricao_breve": "Remada sentada na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de Remada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_biceps_halter",
    "nome_pt": "Rosca Bíceps com Halter",
    "nome_en": "Dumbbell Biceps Curl",
    "descricao_breve": "Foco total no bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_biceps_barra",
    "nome_pt": "Rosca Bíceps com Barra",
    "nome_en": "Barbell Biceps Curl",
    "descricao_breve": "Exercício para bíceps com barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_martelo",
    "nome_pt": "Rosca Martelo",
    "nome_en": "Hammer Curl",
    "descricao_breve": "Foco em bíceps e braquial.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Braquial"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_concentrada",
    "nome_pt": "Rosca Concentrada",
    "nome_en": "Concentration Curl",
    "descricao_breve": "Exercício unilateral para bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_scott",
    "nome_pt": "Rosca Scott",
    "nome_en": "Preacher Curl",
    "descricao_breve": "Exercício para bíceps na prancha Scott.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Barra e banco Scott",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "barra_fixa",
    "nome_pt": "Barra Fixa",
    "nome_en": "Pull-up",
    "descricao_breve": "Exercício para costas e bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "chin_up",
    "nome_pt": "Barra Fixa Supinada",
    "nome_en": "Chin-up",
    "descricao_breve": "Exercício para bíceps e costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Costas"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "barra_fixa_pronada",
    "nome_pt": "Barra Fixa Pronada",
    "nome_en": "Wide Grip Pull-up",
    "descricao_breve": "Barra com pegada aberta.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "barra_fixa_neutra",
    "nome_pt": "Barra Fixa Neutra",
    "nome_en": "Neutral Grip Pull-up",
    "descricao_breve": "Barra com pegada neutra.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "barra_fixa_assistida",
    "nome_pt": "Barra Fixa Assistida",
    "nome_en": "Assisted Pull-up",
    "descricao_breve": "Barra com auxílio de máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de barra assistida",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_maquina",
    "nome_pt": "Pulldown na Máquina",
    "nome_en": "Lat Pulldown",
    "descricao_breve": "Exercício para dorsais.",
    "category": "Máquina",
    "musculos_alvo": ["Costas"],
    "equipamento": "Máquina de Pulldown",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_frontal_maquina",
    "nome_pt": "Pulldown Frontal",
    "nome_en": "Front Lat Pulldown",
    "descricao_breve": "Pulldown com barra à frente.",
    "category": "Máquina",
    "musculos_alvo": ["Costas"],
    "equipamento": "Máquina de Pulldown",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_tras_maquina",
    "nome_pt": "Pulldown Atrás da Cabeça",
    "nome_en": "Behind the Neck Lat Pulldown",
    "descricao_breve": "Pulldown atrás da cabeça.",
    "category": "Máquina",
    "musculos_alvo": ["Costas"],
    "equipamento": "Máquina de Pulldown",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_reto_barra",
    "nome_pt": "Supino Reto com Barra",
    "nome_en": "Barbell Bench Press",
    "descricao_breve": "Exercício clássico para peito.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_inclinado_barra",
    "nome_pt": "Supino Inclinado com Barra",
    "nome_en": "Incline Barbell Bench Press",
    "descricao_breve": "Supino com banco inclinado.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Superior", "Ombros", "Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_declinado_barra",
    "nome_pt": "Supino Declinado com Barra",
    "nome_en": "Decline Barbell Bench Press",
    "descricao_breve": "Supino com banco declinado.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Inferior", "Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_reto_halter",
    "nome_pt": "Supino Reto com Halter",
    "nome_en": "Dumbbell Bench Press",
    "descricao_breve": "Supino com halteres no banco reto.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_inclinado_halter",
    "nome_pt": "Supino Inclinado com Halter",
    "nome_en": "Incline Dumbbell Bench Press",
    "descricao_breve": "Supino inclinado com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Superior", "Ombros", "Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_declinado_halter",
    "nome_pt": "Supino Declinado com Halter",
    "nome_en": "Decline Dumbbell Bench Press",
    "descricao_breve": "Supino declinado com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Inferior", "Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crucifixo_reto_halter",
    "nome_pt": "Crucifixo Reto com Halter",
    "nome_en": "Dumbbell Fly",
    "descricao_breve": "Isola o peito com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crucifixo_inclinado_halter",
    "nome_pt": "Crucifixo Inclinado com Halter",
    "nome_en": "Incline Dumbbell Fly",
    "descricao_breve": "Isolamento de peito superior.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Superior"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crucifixo_declinado_halter",
    "nome_pt": "Crucifixo Declinado com Halter",
    "nome_en": "Decline Dumbbell Fly",
    "descricao_breve": "Isolamento de peito inferior.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito Inferior"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_maquina",
    "nome_pt": "Supino na Máquina",
    "nome_en": "Machine Chest Press",
    "descricao_breve": "Trabalha peito com estabilidade.",
    "category": "Máquina",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros"],
    "equipamento": "Máquina de Supino",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "crucifixo_maquina",
    "nome_pt": "Crucifixo na Máquina",
    "nome_en": "Machine Fly",
    "descricao_breve": "Isolamento de peito na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Peito"],
    "equipamento": "Máquina de Crucifixo",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pullover_halter",
    "nome_pt": "Pullover com Halter",
    "nome_en": "Dumbbell Pullover",
    "descricao_breve": "Trabalha peito e dorsais.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Costas"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_barra",
    "nome_pt": "Desenvolvimento com Barra",
    "nome_en": "Barbell Shoulder Press",
    "descricao_breve": "Exercício para ombros e tríceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_halter",
    "nome_pt": "Desenvolvimento com Halter",
    "nome_en": "Dumbbell Shoulder Press",
    "descricao_breve": "Exercício para ombros com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_maquina",
    "nome_pt": "Desenvolvimento na Máquina",
    "nome_en": "Machine Shoulder Press",
    "descricao_breve": "Ombros com estabilidade e máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Máquina de Ombros",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_lateral_halter",
    "nome_pt": "Elevação Lateral com Halter",
    "nome_en": "Lateral Raise",
    "descricao_breve": "Isola músculos do ombro.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_frontal_halter",
    "nome_pt": "Elevação Frontal com Halter",
    "nome_en": "Front Raise",
    "descricao_breve": "Ativa o ombro anterior.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento",
    "nome_pt": "Agachamento",
    "nome_en": "Squat",
    "descricao_breve": "Exercício fundamental para membros inferiores.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_sumo",
    "nome_pt": "Agachamento Sumô",
    "nome_en": "Sumo Squat",
    "descricao_breve": "Trabalha interno de coxa e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_pistola",
    "nome_pt": "Agachamento Pistola",
    "nome_en": "Pistol Squat",
    "descricao_breve": "Agachamento unilateral intenso.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_bulgaro",
    "nome_pt": "Agachamento Búlgaro",
    "nome_en": "Bulgarian Split Squat",
    "descricao_breve": "Exercício unilateral com banco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo",
    "nome_pt": "Afundo",
    "nome_en": "Lunge",
    "descricao_breve": "Exercício unilateral para pernas e glúteos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_lateral",
    "nome_pt": "Afundo Lateral",
    "nome_en": "Side Lunge",
    "descricao_breve": "Trabalha adutores e quadríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Adutores", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_reverso",
    "nome_pt": "Afundo Reverso",
    "nome_en": "Reverse Lunge",
    "descricao_breve": "Exercício unilateral para glúteos e pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "step_up",
    "nome_pt": "Subida no Banco",
    "nome_en": "Step Up",
    "descricao_breve": "Exercício funcional para pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "panturrilha_em_pe",
    "nome_pt": "Panturrilha em Pé",
    "nome_en": "Standing Calf Raise",
    "descricao_breve": "Exercício para panturrilhas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "panturrilha_sentado",
    "nome_pt": "Panturrilha Sentado",
    "nome_en": "Seated Calf Raise",
    "descricao_breve": "Exercício para panturrilha sentado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_braços",
    "nome_pt": "Flexão de Braços",
    "nome_en": "Push-up",
    "descricao_breve": "Exercício clássico para peito e tríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_inclinada",
    "nome_pt": "Flexão Inclinada",
    "nome_en": "Incline Push-up",
    "descricao_breve": "Flexão com apoio elevado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Superior", "Tríceps"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_declinado",
    "nome_pt": "Flexão Declinada",
    "nome_en": "Decline Push-up",
    "descricao_breve": "Flexão com apoio dos pés elevado.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Inferior", "Tríceps"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_diamante",
    "nome_pt": "Flexão Diamante",
    "nome_en": "Diamond Push-up",
    "descricao_breve": "Flexão com mãos juntas, foco em tríceps.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Peito"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_aberta",
    "nome_pt": "Flexão Aberta",
    "nome_en": "Wide Push-up",
    "descricao_breve": "Flexão com mãos afastadas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_unilateral",
    "nome_pt": "Flexão Unilateral",
    "nome_en": "One Arm Push-up",
    "descricao_breve": "Flexão feita com um braço.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_explosiva",
    "nome_pt": "Flexão Explosiva",
    "nome_en": "Clap Push-up",
    "descricao_breve": "Flexão com batida de palmas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_joelhos",
    "nome_pt": "Flexão de Joelhos",
    "nome_en": "Knee Push-up",
    "descricao_breve": "Flexão para iniciantes, apoio nos joelhos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_mesa",
    "nome_pt": "Flexão na Mesa",
    "nome_en": "Tabletop Push-up",
    "descricao_breve": "Flexão com apoio em mesa.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Mesa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_biceps_unilateral_halter",
    "nome_pt": "Rosca Bíceps Unilateral com Halter",
    "nome_en": "Single Arm Dumbbell Curl",
    "descricao_breve": "Rosca para bíceps feita com um braço de cada vez.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_inversa_barra",
    "nome_pt": "Rosca Inversa com Barra",
    "nome_en": "Reverse Barbell Curl",
    "descricao_breve": "Rosca para bíceps e antebraço com pegada pronada.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Antebraço"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_inversa_halter",
    "nome_pt": "Rosca Inversa com Halter",
    "nome_en": "Reverse Dumbbell Curl",
    "descricao_breve": "Rosca para bíceps e antebraço com halter e pegada pronada.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Antebraço"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_w_barra",
    "nome_pt": "Rosca com Barra W",
    "nome_en": "EZ Bar Curl",
    "descricao_breve": "Rosca para bíceps com barra W.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Barra W",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_frances_barra",
    "nome_pt": "Tríceps Francês com Barra",
    "nome_en": "French Press",
    "descricao_breve": "Tríceps com barra W ou reta acima da cabeça.",
    "category": "Equipamento",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Barra W ou reta",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_frances_halter",
    "nome_pt": "Tríceps Francês com Halter",
    "nome_en": "Dumbbell French Press",
    "descricao_breve": "Tríceps acima da cabeça com halter.",
    "category": "Equipamento",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_corda_polia",
    "nome_pt": "Tríceps na Corda",
    "nome_en": "Rope Triceps Pushdown",
    "descricao_breve": "Exercício de tríceps usando corda na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Polia e corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_polia_barra",
    "nome_pt": "Tríceps na Polia com Barra",
    "nome_en": "Bar Triceps Pushdown",
    "descricao_breve": "Exercício de tríceps usando barra na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Polia e barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_testa_barra",
    "nome_pt": "Tríceps Testa com Barra",
    "nome_en": "Skullcrusher",
    "descricao_breve": "Exercício para tríceps deitado usando barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_coice_halter",
    "nome_pt": "Coice de Tríceps com Halter",
    "nome_en": "Triceps Kickback",
    "descricao_breve": "Tríceps unilateral com halter.",
    "category": "Equipamento",
    "musculos_alvo": ["Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "triceps_entre_bancos",
    "nome_pt": "Tríceps Entre Bancos",
    "nome_en": "Bench Dip",
    "descricao_breve": "Tríceps usando dois bancos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Tríceps", "Ombros"],
    "equipamento": "Dois bancos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_punho_barra",
    "nome_pt": "Rosca de Punho com Barra",
    "nome_en": "Barbell Wrist Curl",
    "descricao_breve": "Rosca para antebraço.",
    "category": "Equipamento",
    "musculos_alvo": ["Antebraço"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_punho_inversa_barra",
    "nome_pt": "Rosca de Punho Inversa com Barra",
    "nome_en": "Reverse Barbell Wrist Curl",
    "descricao_breve": "Rosca inversa para antebraço.",
    "category": "Equipamento",
    "musculos_alvo": ["Antebraço"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_punho_halter",
    "nome_pt": "Rosca de Punho com Halter",
    "nome_en": "Dumbbell Wrist Curl",
    "descricao_breve": "Rosca para antebraço com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Antebraço"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "extensao_pernas_maquina",
    "nome_pt": "Extensão de Pernas na Máquina",
    "nome_en": "Leg Extension",
    "descricao_breve": "Isolamento para quadríceps.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps"],
    "equipamento": "Máquina de Extensão",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_pernas_maquina",
    "nome_pt": "Flexão de Pernas na Máquina",
    "nome_en": "Leg Curl",
    "descricao_breve": "Isolamento para posterior de coxa.",
    "category": "Máquina",
    "musculos_alvo": ["Posterior de Coxa"],
    "equipamento": "Máquina de Flexão",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdução_quadril_maquina",
    "nome_pt": "Abdução de Quadril na Máquina",
    "nome_en": "Hip Abduction",
    "descricao_breve": "Isolamento de glúteos e abdutores.",
    "category": "Máquina",
    "musculos_alvo": ["Glúteos", "Abdutores"],
    "equipamento": "Máquina de Abdução",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "adução_quadril_maquina",
    "nome_pt": "Adução de Quadril na Máquina",
    "nome_en": "Hip Adduction",
    "descricao_breve": "Isolamento de adutores.",
    "category": "Máquina",
    "musculos_alvo": ["Adutores"],
    "equipamento": "Máquina de Adução",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_panturrilha_maquina",
    "nome_pt": "Elevação de Panturrilha na Máquina",
    "nome_en": "Machine Calf Raise",
    "descricao_breve": "Exercício para panturrilha na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Máquina de Panturrilha",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "leg_press_maquina",
    "nome_pt": "Leg Press",
    "nome_en": "Leg Press",
    "descricao_breve": "Exercício para quadríceps, glúteos e posteriores.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Posterior de Coxa"],
    "equipamento": "Máquina de Leg Press",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "leg_press_horizontal_maquina",
    "nome_pt": "Leg Press Horizontal",
    "nome_en": "Horizontal Leg Press",
    "descricao_breve": "Variante horizontal do leg press.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Posterior de Coxa"],
    "equipamento": "Máquina de Leg Press",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "leg_press_inclinado_maquina",
    "nome_pt": "Leg Press Inclinado",
    "nome_en": "Incline Leg Press",
    "descricao_breve": "Variante inclinada do leg press.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Posterior de Coxa"],
    "equipamento": "Máquina de Leg Press",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "stiff_barra",
    "nome_pt": "Stiff com Barra",
    "nome_en": "Barbell Romanian Deadlift",
    "descricao_breve": "Trabalha posteriores e glúteos.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "stiff_halter",
    "nome_pt": "Stiff com Halter",
    "nome_en": "Dumbbell Romanian Deadlift",
    "descricao_breve": "Variante do stiff com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "deadlift_barra",
    "nome_pt": "Levantamento Terra com Barra",
    "nome_en": "Barbell Deadlift",
    "descricao_breve": "Exercício completo para corpo inteiro.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos", "Costas", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "deadlift_sumô_barra",
    "nome_pt": "Levantamento Terra Sumô",
    "nome_en": "Sumo Deadlift",
    "descricao_breve": "Variante sumô do levantamento terra.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos", "Costas", "Core", "Adutores"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "deadlift_halter",
    "nome_pt": "Levantamento Terra com Halter",
    "nome_en": "Dumbbell Deadlift",
    "descricao_breve": "Deadlift com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos", "Costas", "Core"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "good_morning_barra",
    "nome_pt": "Good Morning com Barra",
    "nome_en": "Barbell Good Morning",
    "descricao_breve": "Fortalece lombar e posteriores.",
    "category": "Equipamento",
    "musculos_alvo": ["Lombar", "Posterior de Coxa"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "good_morning_halter",
    "nome_pt": "Good Morning com Halter",
    "nome_en": "Dumbbell Good Morning",
    "descricao_breve": "Variante do good morning com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Lombar", "Posterior de Coxa"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pull_through_corda",
    "nome_pt": "Pull Through com Corda",
    "nome_en": "Cable Pull Through",
    "descricao_breve": "Exercício de glúteos e posteriores usando corda.",
    "category": "Máquina",
    "musculos_alvo": ["Glúteos", "Posterior de Coxa", "Core"],
    "equipamento": "Polia e corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_lateral_perna_elastico",
    "nome_pt": "Elevação Lateral de Perna com Elástico",
    "nome_en": "Side Leg Raise with Band",
    "descricao_breve": "Isolamento de abdutores com elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Abdutores", "Glúteos"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdução_quadril_elastico",
    "nome_pt": "Abdução de Quadril com Elástico",
    "nome_en": "Hip Abduction with Band",
    "descricao_breve": "Isolamento de glúteos com elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Glúteos"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "adução_quadril_elastico",
    "nome_pt": "Adução de Quadril com Elástico",
    "nome_en": "Hip Adduction with Band",
    "descricao_breve": "Isolamento de adutores com elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Adutores"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rotação_externa_ombro_elastico",
    "nome_pt": "Rotação Externa de Ombro com Elástico",
    "nome_en": "External Shoulder Rotation with Band",
    "descricao_breve": "Exercício para manguito rotador.",
    "category": "Elástico",
    "musculos_alvo": ["Manguito Rotador"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rotação_interna_ombro_elastico",
    "nome_pt": "Rotação Interna de Ombro com Elástico",
    "nome_en": "Internal Shoulder Rotation with Band",
    "descricao_breve": "Exercício para manguito rotador.",
    "category": "Elástico",
    "musculos_alvo": ["Manguito Rotador"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_elastico",
    "nome_pt": "Remada com Elástico",
    "nome_en": "Band Row",
    "descricao_breve": "Remada para costas usando elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "supino_elastico",
    "nome_pt": "Supino com Elástico",
    "nome_en": "Band Chest Press",
    "descricao_breve": "Supino usando elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_elastico",
    "nome_pt": "Agachamento com Elástico",
    "nome_en": "Band Squat",
    "descricao_breve": "Agachamento usando elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_braços_elastico",
    "nome_pt": "Flexão de Braços com Elástico",
    "nome_en": "Band Push-up",
    "descricao_breve": "Flexão com resistência de elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_unilateral_elastico",
    "nome_pt": "Remada Unilateral com Elástico",
    "nome_en": "Single Arm Band Row",
    "descricao_breve": "Remada unilateral para costas usando elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pull_up_neutro",
    "nome_pt": "Barra Fixa Neutra",
    "nome_en": "Neutral Grip Pull-up",
    "descricao_breve": "Barra fixa com pegada neutra, trabalha costas e bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pull_up_pronada",
    "nome_pt": "Barra Fixa Pronada",
    "nome_en": "Wide Grip Pull-up",
    "descricao_breve": "Barra fixa com pegada aberta, foco nos dorsais.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "chin_up",
    "nome_pt": "Barra Fixa Supinada",
    "nome_en": "Chin-up",
    "descricao_breve": "Barra fixa com pegada supinada, foco nos bíceps.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Costas"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "barra_fixa_assistida",
    "nome_pt": "Barra Fixa Assistida",
    "nome_en": "Assisted Pull-up",
    "descricao_breve": "Barra fixa com auxílio de máquina para iniciantes.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps", "Core"],
    "equipamento": "Máquina de barra assistida",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_curvada_barra_pronada",
    "nome_pt": "Remada Curvada Pronada com Barra",
    "nome_en": "Barbell Bent Over Row (Pronated)",
    "descricao_breve": "Remada curvada com barra e pegada pronada.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps", "Lombar"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_curvada_barra_supinada",
    "nome_pt": "Remada Curvada Supinada com Barra",
    "nome_en": "Barbell Bent Over Row (Supinated)",
    "descricao_breve": "Remada curvada com barra e pegada supinada.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_unilateral_maquina",
    "nome_pt": "Remada Unilateral na Máquina",
    "nome_en": "Single Arm Machine Row",
    "descricao_breve": "Remada para costas feita unilateralmente na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de remada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_bilateral_maquina",
    "nome_pt": "Remada Bilateral na Máquina",
    "nome_en": "Seated Machine Row",
    "descricao_breve": "Remada bilateral sentada na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de remada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_articulada_maquina",
    "nome_pt": "Remada Articulada na Máquina",
    "nome_en": "Lever Row Machine",
    "descricao_breve": "Remada com movimento articulado na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps", "Lombar"],
    "equipamento": "Máquina de remada articulada",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_cavalinho",
    "nome_pt": "Remada Cavalinho",
    "nome_en": "T-Bar Row",
    "descricao_breve": "Remada em barra T para costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Costas", "Bíceps", "Lombar"],
    "equipamento": "Barra T",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_maquina_frontal",
    "nome_pt": "Pulldown Frontal na Máquina",
    "nome_en": "Front Lat Pulldown",
    "descricao_breve": "Pulldown com barra à frente.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de pulldown",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_maquina_atras",
    "nome_pt": "Pulldown Atrás da Cabeça",
    "nome_en": "Behind the Neck Lat Pulldown",
    "descricao_breve": "Pulldown atrás da cabeça, foco nos dorsais.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Máquina de pulldown",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_polia",
    "nome_pt": "Pulldown na Polia",
    "nome_en": "Cable Lat Pulldown",
    "descricao_breve": "Pulldown usando polia alta.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_polia_neutro",
    "nome_pt": "Pulldown Neutro na Polia",
    "nome_en": "Neutral Grip Cable Lat Pulldown",
    "descricao_breve": "Pulldown com pegada neutra na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_polia_supinado",
    "nome_pt": "Pulldown Supinado na Polia",
    "nome_en": "Underhand Cable Lat Pulldown",
    "descricao_breve": "Pulldown com pegada supinada na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_polia_unilateral",
    "nome_pt": "Pulldown Unilateral na Polia",
    "nome_en": "Single Arm Cable Lat Pulldown",
    "descricao_breve": "Pulldown unilateral usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pulldown_polia_articulada",
    "nome_pt": "Pulldown Articulado na Polia",
    "nome_en": "Lever Cable Lat Pulldown",
    "descricao_breve": "Pulldown com movimento articulado na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Bíceps", "Lombar"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "face_pull_polia",
    "nome_pt": "Face Pull na Polia",
    "nome_en": "Face Pull",
    "descricao_breve": "Exercício para deltoide posterior e trapézio usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Deltoide Posterior", "Trapézio", "Manguito Rotador"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "shrug_barra",
    "nome_pt": "Encolhimento de Ombros com Barra",
    "nome_en": "Barbell Shrug",
    "descricao_breve": "Exercício para trapézio usando barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Trapézio"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "shrug_halter",
    "nome_pt": "Encolhimento de Ombros com Halter",
    "nome_en": "Dumbbell Shrug",
    "descricao_breve": "Exercício de trapézio com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Trapézio"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "shrug_maquina",
    "nome_pt": "Encolhimento de Ombros na Máquina",
    "nome_en": "Machine Shrug",
    "descricao_breve": "Trapézio na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Trapézio"],
    "equipamento": "Máquina de shrug",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_alta_barra",
    "nome_pt": "Remada Alta com Barra",
    "nome_en": "Barbell Upright Row",
    "descricao_breve": "Remada alta para trapézio e deltoides.",
    "category": "Equipamento",
    "musculos_alvo": ["Trapézio", "Deltoides"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_alta_halter",
    "nome_pt": "Remada Alta com Halter",
    "nome_en": "Dumbbell Upright Row",
    "descricao_breve": "Remada alta para trapézio e deltoides com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Trapézio", "Deltoides"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_alta_polia",
    "nome_pt": "Remada Alta na Polia",
    "nome_en": "Cable Upright Row",
    "descricao_breve": "Remada alta para trapézio e deltoides usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Trapézio", "Deltoides"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pull_over_barra",
    "nome_pt": "Pullover com Barra",
    "nome_en": "Barbell Pullover",
    "descricao_breve": "Pullover para peito e dorsais usando barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Costas"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "pull_over_maquina",
    "nome_pt": "Pullover na Máquina",
    "nome_en": "Machine Pullover",
    "descricao_breve": "Pullover focado em dorsais na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Costas", "Peito"],
    "equipamento": "Máquina de pullover",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "superman",
    "nome_pt": "Superman",
    "nome_en": "Superman",
    "descricao_breve": "Exercício para lombar e glúteos, deitado no chão.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Lombar", "Glúteos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "hiperextensao",
    "nome_pt": "Hiperextensão Lombar",
    "nome_en": "Hyperextension",
    "descricao_breve": "Exercício para lombar utilizando banco.",
    "category": "Equipamento",
    "musculos_alvo": ["Lombar", "Glúteos"],
    "equipamento": "Banco de hiperextensão",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "hiperextensao_chao",
    "nome_pt": "Hiperextensão Lombar no Chão",
    "nome_en": "Floor Hyperextension",
    "descricao_breve": "Exercício para lombar, deitado no chão.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Lombar"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "stiff_unilateral_halter",
    "nome_pt": "Stiff Unilateral com Halter",
    "nome_en": "Single Leg Dumbbell Romanian Deadlift",
    "descricao_breve": "Stiff para posteriores e glúteos unilateral.",
    "category": "Equipamento",
    "musculos_alvo": ["Posterior de Coxa", "Glúteos", "Core"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_aberta",
    "nome_pt": "Prancha Abdominal Aberta",
    "nome_en": "Wide Plank",
    "descricao_breve": "Variante de prancha com mãos afastadas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_fecha",
    "nome_pt": "Prancha Abdominal Fechada",
    "nome_en": "Close Plank",
    "descricao_breve": "Variante de prancha com mãos juntas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "prancha_dinâmica_cotovelo_mao",
    "nome_pt": "Prancha Dinâmica Cotovelo-Mão",
    "nome_en": "Plank Up-Down",
    "descricao_breve": "Alterna entre prancha baixa e alta.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_rotacao",
    "nome_pt": "Prancha com Rotação de Tronco",
    "nome_en": "Rotational Plank",
    "descricao_breve": "Prancha com rotação de tronco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
   {
    "id": "abdominal_obliquo_cruzado",
    "nome_pt": "Abdominal Oblíquo Cruzado",
    "nome_en": "Cross-Body Crunch",
    "descricao_breve": "Abdominal levando o cotovelo ao joelho oposto, foco nos oblíquos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_canivete",
    "nome_pt": "Abdominal Canivete",
    "nome_en": "Jackknife Sit-up",
    "descricao_breve": "Abdominal com elevação simultânea de pernas e tronco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_remador",
    "nome_pt": "Abdominal Remador",
    "nome_en": "Rowing Sit-up",
    "descricao_breve": "Abdominal com movimento de remada.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_cotovelo",
    "nome_pt": "Prancha Cotovelo",
    "nome_en": "Elbow Plank",
    "descricao_breve": "Prancha com apoio dos cotovelos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_alternada_perna",
    "nome_pt": "Prancha Alternada Perna",
    "nome_en": "Plank Leg Lift",
    "descricao_breve": "Prancha elevando alternadamente as pernas.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Glúteos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_alternada_braco",
    "nome_pt": "Prancha Alternada Braço",
    "nome_en": "Plank Arm Lift",
    "descricao_breve": "Prancha elevando alternadamente os braços.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Ombros"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_alternada_braco_perna",
    "nome_pt": "Prancha Alternada Braço e Perna",
    "nome_en": "Plank Arm and Leg Lift",
    "descricao_breve": "Prancha elevando braço e perna opostos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Glúteos", "Ombros"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_prancha_rotacional",
    "nome_pt": "Prancha Rotacional",
    "nome_en": "Rotational Plank",
    "descricao_breve": "Prancha com rotação do tronco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_lateral",
    "nome_pt": "Abdominal Lateral",
    "nome_en": "Side Crunch",
    "descricao_breve": "Abdominal focando o lado do abdômen.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_tesoura",
    "nome_pt": "Abdominal Tesoura",
    "nome_en": "Scissor Kick",
    "descricao_breve": "Movimento cruzado de pernas para core inferior.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_bicicleta",
    "nome_pt": "Abdominal Bicicleta",
    "nome_en": "Bicycle Crunch",
    "descricao_breve": "Alterna cotovelo e joelho opostos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core", "Oblíquos"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_escadinha",
    "nome_pt": "Abdominal Escadinha",
    "nome_en": "Toe Touch Crunch",
    "descricao_breve": "Abdominal tocando os pés.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core Superior"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_v",
    "nome_pt": "Abdominal V",
    "nome_en": "V-Up",
    "descricao_breve": "Abdominal formando o corpo em V.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_invertido_suspenso",
    "nome_pt": "Abdominal Invertido Suspenso",
    "nome_en": "Hanging Reverse Crunch",
    "descricao_breve": "Abdominal invertido na barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_inferior_banco",
    "nome_pt": "Abdominal Inferior no Banco",
    "nome_en": "Bench Leg Raise",
    "descricao_breve": "Elevação de pernas no banco.",
    "category": "Equipamento",
    "musculos_alvo": ["Core Inferior"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_obliquo_suspenso",
    "nome_pt": "Abdominal Oblíquo Suspenso",
    "nome_en": "Hanging Oblique Crunch",
    "descricao_breve": "Abdominal oblíquo na barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_solo_peso",
    "nome_pt": "Abdominal Solo com Peso",
    "nome_en": "Weighted Sit-up",
    "descricao_breve": "Abdominal com sobrecarga.",
    "category": "Equipamento",
    "musculos_alvo": ["Core"],
    "equipamento": "Halter ou anilha",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_ab_wheel",
    "nome_pt": "Abdominal Roda",
    "nome_en": "Ab Wheel Rollout",
    "descricao_breve": "Abdominal usando roda de exercício.",
    "category": "Equipamento",
    "musculos_alvo": ["Core"],
    "equipamento": "Roda de abdominal",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_bola",
    "nome_pt": "Abdominal na Bola",
    "nome_en": "Stability Ball Crunch",
    "descricao_breve": "Abdominal usando bola suíça.",
    "category": "Equipamento",
    "musculos_alvo": ["Core"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_corda_polia",
    "nome_pt": "Abdominal com Corda na Polia",
    "nome_en": "Cable Crunch",
    "descricao_breve": "Abdominal usando corda e polia.",
    "category": "Máquina",
    "musculos_alvo": ["Core"],
    "equipamento": "Corda e polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_obliquo_bola",
    "nome_pt": "Abdominal Oblíquo na Bola",
    "nome_en": "Stability Ball Oblique Crunch",
    "descricao_breve": "Oblíquos usando bola suíça.",
    "category": "Equipamento",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Bola suíça",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_lateral_banco_romano",
    "nome_pt": "Abdominal Lateral no Banco Romano",
    "nome_en": "Roman Chair Side Crunch",
    "descricao_breve": "Abdominal lateral no banco romano.",
    "category": "Equipamento",
    "musculos_alvo": ["Oblíquos"],
    "equipamento": "Banco romano",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "abdominal_extensor_banco_romano",
    "nome_pt": "Extensor Abdominal no Banco Romano",
    "nome_en": "Roman Chair Back Extension",
    "descricao_breve": "Extensão lombar no banco romano.",
    "category": "Equipamento",
    "musculos_alvo": ["Lombar"],
    "equipamento": "Banco romano",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
   {
    "id": "agachamento_com_barra_frontal",
    "nome_pt": "Agachamento Frontal com Barra",
    "nome_en": "Barbell Front Squat",
    "descricao_breve": "Agachamento com barra apoiada na frente dos ombros.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_com_barra_costas",
    "nome_pt": "Agachamento com Barra nas Costas",
    "nome_en": "Barbell Back Squat",
    "descricao_breve": "Agachamento tradicional com barra apoiada nas costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_com_barra",
    "nome_pt": "Afundo com Barra",
    "nome_en": "Barbell Lunge",
    "descricao_breve": "Afundo usando barra apoiada nas costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "afundo_com_halteres",
    "nome_pt": "Afundo com Halteres",
    "nome_en": "Dumbbell Lunge",
    "descricao_breve": "Afundo segurando halteres nas mãos.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_com_barra",
    "nome_pt": "Passada com Barra",
    "nome_en": "Barbell Walking Lunge",
    "descricao_breve": "Afundo caminhando com barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_com_halteres",
    "nome_pt": "Passada com Halteres",
    "nome_en": "Dumbbell Walking Lunge",
    "descricao_breve": "Afundo caminhando com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_sumô_barra",
    "nome_pt": "Agachamento Sumô com Barra",
    "nome_en": "Barbell Sumo Squat",
    "descricao_breve": "Agachamento com barra e postura sumô.",
    "category": "Equipamento",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_sumô_halter",
    "nome_pt": "Agachamento Sumô com Halter",
    "nome_en": "Dumbbell Sumo Squat",
    "descricao_breve": "Agachamento sumô segurando um halter.",
    "category": "Equipamento",
    "musculos_alvo": ["Adutores", "Glúteos", "Quadríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_cossack",
    "nome_pt": "Agachamento Cossack",
    "nome_en": "Cossack Squat",
    "descricao_breve": "Agachamento lateral profundo para flexibilidade.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Adutores", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_unilateral_banco",
    "nome_pt": "Agachamento Unilateral no Banco",
    "nome_en": "Single Leg Box Squat",
    "descricao_breve": "Agachamento unilateral utilizando um banco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_com_salto",
    "nome_pt": "Agachamento com Salto",
    "nome_en": "Jump Squat",
    "descricao_breve": "Agachamento seguido de salto explosivo.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Panturrilha"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_hack_maquina",
    "nome_pt": "Agachamento Hack na Máquina",
    "nome_en": "Hack Squat Machine",
    "descricao_breve": "Agachamento na máquina hack squat.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Máquina Hack Squat",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_smith",
    "nome_pt": "Agachamento no Smith",
    "nome_en": "Smith Machine Squat",
    "descricao_breve": "Agachamento guiado na máquina smith.",
    "category": "Máquina",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Máquina Smith",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_bulgaro_halter",
    "nome_pt": "Agachamento Búlgaro com Halter",
    "nome_en": "Bulgarian Split Squat with Dumbbells",
    "descricao_breve": "Agachamento búlgaro segurando halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Banco, Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "agachamento_bulgaro_barra",
    "nome_pt": "Agachamento Búlgaro com Barra",
    "nome_en": "Bulgarian Split Squat with Barbell",
    "descricao_breve": "Agachamento búlgaro segurando barra.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Banco, Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_lateral_halter",
    "nome_pt": "Passada Lateral com Halter",
    "nome_en": "Lateral Lunge with Dumbbell",
    "descricao_breve": "Passada lateral segurando halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Adutores", "Quadríceps", "Glúteos"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_de_quadril_barra",
    "nome_pt": "Elevação de Quadril com Barra",
    "nome_en": "Barbell Hip Thrust",
    "descricao_breve": "Exercício para glúteos usando barra apoiada no quadril.",
    "category": "Equipamento",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Barra, Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_de_quadril_halter",
    "nome_pt": "Elevação de Quadril com Halter",
    "nome_en": "Dumbbell Hip Thrust",
    "descricao_breve": "Exercício para glúteos usando halter no quadril.",
    "category": "Equipamento",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Halter, Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_de_quadril_unilateral",
    "nome_pt": "Elevação de Quadril Unilateral",
    "nome_en": "Single Leg Hip Thrust",
    "descricao_breve": "Elevação de quadril apoiando um pé no banco.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "ponte_de_gluteo_unilateral",
    "nome_pt": "Ponte de Glúteo Unilateral",
    "nome_en": "Single Leg Glute Bridge",
    "descricao_breve": "Ponte de glúteo com uma perna elevada.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Glúteos", "Core"],
    "equipamento": "Colchonete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_de_panturrilha_unilateral",
    "nome_pt": "Elevação de Panturrilha Unilateral",
    "nome_en": "Single Leg Calf Raise",
    "descricao_breve": "Exercício para panturrilha, feito com uma perna.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevação_de_panturrilha_halter",
    "nome_pt": "Elevação de Panturrilha com Halter",
    "nome_en": "Dumbbell Calf Raise",
    "descricao_breve": "Panturrilha com halter nas mãos.",
    "category": "Equipamento",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "panturrilha_maquina_sentado",
    "nome_pt": "Panturrilha Sentado na Máquina",
    "nome_en": "Seated Calf Raise Machine",
    "descricao_breve": "Panturrilha sentada em máquina específica.",
    "category": "Máquina",
    "musculos_alvo": ["Panturrilha"],
    "equipamento": "Máquina",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_traseira_barra",
    "nome_pt": "Passada Traseira com Barra",
    "nome_en": "Barbell Reverse Lunge",
    "descricao_breve": "Passada para trás com barra nas costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos", "Core"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_traseira_halter",
    "nome_pt": "Passada Traseira com Halter",
    "nome_en": "Dumbbell Reverse Lunge",
    "descricao_breve": "Passada para trás segurando halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Quadríceps", "Glúteos"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "passada_lateral_barra",
    "nome_pt": "Passada Lateral com Barra",
    "nome_en": "Barbell Lateral Lunge",
    "descricao_breve": "Passada lateral com barra nas costas.",
    "category": "Equipamento",
    "musculos_alvo": ["Adutores", "Quadríceps", "Glúteos"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_arnold_halter",
    "nome_pt": "Desenvolvimento Arnold com Halter",
    "nome_en": "Arnold Press",
    "descricao_breve": "Desenvolvimento de ombro com rotação dos halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_unilateral_halter",
    "nome_pt": "Desenvolvimento Unilateral com Halter",
    "nome_en": "Single Arm Dumbbell Shoulder Press",
    "descricao_breve": "Desenvolvimento de ombro feito unilateralmente.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_frontal_barra",
    "nome_pt": "Desenvolvimento Frontal com Barra",
    "nome_en": "Front Barbell Shoulder Press",
    "descricao_breve": "Barra à frente do corpo para ombros.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_tras_barra",
    "nome_pt": "Desenvolvimento Atrás com Barra",
    "nome_en": "Behind the Neck Barbell Press",
    "descricao_breve": "Barra atrás da cabeça para desenvolver ombros.",
    "category": "Equipamento",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "desenvolvimento_smith",
    "nome_pt": "Desenvolvimento na Máquina Smith",
    "nome_en": "Smith Machine Shoulder Press",
    "descricao_breve": "Desenvolvimento de ombros guiado.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros", "Tríceps"],
    "equipamento": "Máquina Smith",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_lateral_cabo",
    "nome_pt": "Elevação Lateral na Polia",
    "nome_en": "Cable Lateral Raise",
    "descricao_breve": "Elevação lateral de ombro usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_lateral_maquina",
    "nome_pt": "Elevação Lateral na Máquina",
    "nome_en": "Machine Lateral Raise",
    "descricao_breve": "Elevação lateral de ombro na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Máquina",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_frontal_polia",
    "nome_pt": "Elevação Frontal na Polia",
    "nome_en": "Cable Front Raise",
    "descricao_breve": "Elevação frontal de ombro usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_frontal_maquina",
    "nome_pt": "Elevação Frontal na Máquina",
    "nome_en": "Machine Front Raise",
    "descricao_breve": "Elevação frontal de ombro na máquina.",
    "category": "Máquina",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Máquina",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "remada_alta_corda",
    "nome_pt": "Remada Alta com Corda",
    "nome_en": "Rope Upright Row",
    "descricao_breve": "Remada alta usando corda na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Trapézio", "Deltoides"],
    "equipamento": "Polia, Corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "face_pull_maquina",
    "nome_pt": "Face Pull na Máquina",
    "nome_en": "Face Pull Machine",
    "descricao_breve": "Face pull com máquina específica.",
    "category": "Máquina",
    "musculos_alvo": ["Deltoide Posterior", "Trapézio"],
    "equipamento": "Máquina",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_lateral_elastico",
    "nome_pt": "Elevação Lateral com Elástico",
    "nome_en": "Band Lateral Raise",
    "descricao_breve": "Elevação lateral de ombro com elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "elevacao_frontal_elastico",
    "nome_pt": "Elevação Frontal com Elástico",
    "nome_en": "Band Front Raise",
    "descricao_breve": "Elevação frontal de ombro com elástico.",
    "category": "Elástico",
    "musculos_alvo": ["Ombros"],
    "equipamento": "Elástico",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
   {
    "id": "rosca_concentrada_banco",
    "nome_pt": "Rosca Concentrada no Banco",
    "nome_en": "Concentration Curl on Bench",
    "descricao_breve": "Rosca para bíceps feita sentado no banco.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Banco, Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_alternada_halter",
    "nome_pt": "Rosca Alternada com Halter",
    "nome_en": "Alternating Dumbbell Curl",
    "descricao_breve": "Rosca feita alternando os braços.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_martelo_corda_polia",
    "nome_pt": "Rosca Martelo com Corda na Polia",
    "nome_en": "Hammer Rope Curl",
    "descricao_breve": "Rosca martelo usando corda na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Bíceps", "Braquial", "Antebraço"],
    "equipamento": "Polia, Corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_martelo_barra_w",
    "nome_pt": "Rosca Martelo com Barra W",
    "nome_en": "EZ Bar Hammer Curl",
    "descricao_breve": "Rosca martelo usando barra W.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Braquial"],
    "equipamento": "Barra W",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_scott_halter",
    "nome_pt": "Rosca Scott com Halter",
    "nome_en": "Dumbbell Preacher Curl",
    "descricao_breve": "Rosca Scott feita com halter.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Banco Scott, Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_inversa_corda_polia",
    "nome_pt": "Rosca Inversa com Corda na Polia",
    "nome_en": "Reverse Rope Curl",
    "descricao_breve": "Rosca inversa usando corda na polia.",
    "category": "Máquina",
    "musculos_alvo": ["Bíceps", "Antebraço"],
    "equipamento": "Polia, Corda",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_inversa_halter_unilateral",
    "nome_pt": "Rosca Inversa Unilateral com Halter",
    "nome_en": "Single Arm Reverse Dumbbell Curl",
    "descricao_breve": "Rosca inversa feita com um halter de cada vez.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps", "Antebraço"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_21_barra",
    "nome_pt": "Rosca 21 com Barra",
    "nome_en": "Barbell 21s Curl",
    "descricao_breve": "Rosca para bíceps em três amplitudes.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Barra",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_21_halter",
    "nome_pt": "Rosca 21 com Halter",
    "nome_en": "Dumbbell 21s Curl",
    "descricao_breve": "Rosca para bíceps em três amplitudes com halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "rosca_punho_polia",
    "nome_pt": "Rosca de Punho na Polia",
    "nome_en": "Cable Wrist Curl",
    "descricao_breve": "Exercício para antebraço usando polia.",
    "category": "Máquina",
    "musculos_alvo": ["Antebraço"],
    "equipamento": "Polia",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
   {
    "id": "flexao_espingarda",
    "nome_pt": "Flexão Espingarda",
    "nome_en": "Plyometric Push-up",
    "descricao_breve": "Flexão explosiva com deslocamento lateral das mãos.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_spiderman",
    "nome_pt": "Flexão Spiderman",
    "nome_en": "Spiderman Push-up",
    "descricao_breve": "Flexão trazendo o joelho ao cotovelo.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Core", "Oblíquos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_arqueiro",
    "nome_pt": "Flexão Arqueiro",
    "nome_en": "Archer Push-up",
    "descricao_breve": "Flexão lateral, transferindo peso para um dos braços.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_parede",
    "nome_pt": "Flexão na Parede",
    "nome_en": "Wall Push-up",
    "descricao_breve": "Flexão para iniciantes usando parede como apoio.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Parede",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_pseudo_planche",
    "nome_pt": "Flexão Pseudo Planche",
    "nome_en": "Pseudo Planche Push-up",
    "descricao_breve": "Flexão com mãos próximas ao quadril.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps", "Ombros", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_declinada_unilateral",
    "nome_pt": "Flexão Declinada Unilateral",
    "nome_en": "Single Arm Decline Push-up",
    "descricao_breve": "Flexão declinada feita com um braço.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Inferior", "Tríceps", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_inclinada_unilateral",
    "nome_pt": "Flexão Inclinada Unilateral",
    "nome_en": "Single Arm Incline Push-up",
    "descricao_breve": "Flexão inclinada feita com um braço.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito Superior", "Tríceps", "Core"],
    "equipamento": "Banco",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_tapete",
    "nome_pt": "Flexão no Tapete",
    "nome_en": "Mat Push-up",
    "descricao_breve": "Flexão feita sobre tapete, ideal para conforto.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Peito", "Tríceps"],
    "equipamento": "Tapete",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_anel_ginastico",
    "nome_pt": "Flexão em Anéis Ginásticos",
    "nome_en": "Ring Push-up",
    "descricao_breve": "Flexão em anéis ginásticos, aumenta instabilidade.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Anéis Ginásticos",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "flexao_bosuball",
    "nome_pt": "Flexão no Bosu Ball",
    "nome_en": "Bosu Ball Push-up",
    "descricao_breve": "Flexão sobre Bosu Ball, foco em estabilidade.",
    "category": "Equipamento",
    "musculos_alvo": ["Peito", "Tríceps", "Core"],
    "equipamento": "Bosu Ball",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_salto_estrela",
    "nome_pt": "Burpee com Salto Estrela",
    "nome_en": "Star Jump Burpee",
    "descricao_breve": "Burpee com finalização em salto estrela para explosão.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_flexao_unilateral",
    "nome_pt": "Burpee com Flexão Unilateral",
    "nome_en": "Single Arm Push-up Burpee",
    "descricao_breve": "Burpee com flexão feita usando um braço.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro", "Peito", "Tríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_salto_agachamento",
    "nome_pt": "Burpee com Salto de Agachamento",
    "nome_en": "Squat Jump Burpee",
    "descricao_breve": "Burpee com salto agachado ao final.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_salto_caixa",
    "nome_pt": "Burpee com Salto na Caixa",
    "nome_en": "Box Jump Burpee",
    "descricao_breve": "Burpee seguido de salto em caixa.",
    "category": "Equipamento",
    "musculos_alvo": ["Corpo inteiro", "Quadríceps", "Glúteos"],
    "equipamento": "Caixa",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_remada_halter",
    "nome_pt": "Burpee com Remada de Halter",
    "nome_en": "Dumbbell Row Burpee",
    "descricao_breve": "Burpee com remada de halter no movimento de flexão.",
    "category": "Equipamento",
    "musculos_alvo": ["Corpo inteiro", "Costas", "Bíceps"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_salto_lateral",
    "nome_pt": "Burpee com Salto Lateral",
    "nome_en": "Lateral Jump Burpee",
    "descricao_breve": "Burpee seguido de salto lateral.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro", "Quadríceps", "Glúteos"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_abdominal",
    "nome_pt": "Burpee com Abdominal",
    "nome_en": "Sit-up Burpee",
    "descricao_breve": "Burpee incluindo abdominal no movimento.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro", "Core"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_peso",
    "nome_pt": "Burpee com Peso",
    "nome_en": "Weighted Burpee",
    "descricao_breve": "Burpee feito segurando halteres.",
    "category": "Equipamento",
    "musculos_alvo": ["Corpo inteiro", "Peito", "Costas"],
    "equipamento": "Halter",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
  },
  {
    "id": "burpee_com_salto_vertical",
    "nome_pt": "Burpee com Salto Vertical",
    "nome_en": "Vertical Jump Burpee",
    "descricao_breve": "Burpee seguido de salto vertical.",
    "category": "Peso Corporal",
    "musculos_alvo": ["Corpo inteiro", "Quadríceps"],
    "equipamento": "Nenhum",
    "animacao_url": "https://placehold.co/400x300/000000/FFFFFF?text=Animacao+Exercicio"
   },
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
    "Peso Corporal": "Peso Corporal", // Adicionado para corresponder aos dados dos exercícios
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
      const exercisesColRef = collection(db, 'exercises');
      const q = query(exercisesColRef, orderBy('name_pt', 'asc')); // Ordem pelo nome_pt
  
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
          <Text style={styles.exerciseName}>{item.nome_pt}</Text> {/* Usar nome_pt */}
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
        <Text style={styles.exerciseMuscles}>Músculos: {item.musculos_alvo.join(', ')}</Text> {/* Usar musculos_alvo */}
        {item.equipamento && item.equipamento.length > 0 && ( // Usar equipamento
          <Text style={styles.exerciseEquipment}>Equipamento: {item.equipamento.join(', ')}</Text>
        )}
        <Text style={styles.exerciseDescription}>{item.descricao_breve}</Text> {/* Usar descricao_breve */}
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.exerciseImage}
            resizeMode="contain"
          />
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
          <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Categorias:</Text>
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