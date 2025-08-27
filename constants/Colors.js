// constants/Colors.js
const Colors = {
  // Marca (mantidos)
  primary: '#2A3B47',      // barra/header/botões principais
  secondary: '#FFB800',    // destaque (dourado)
  background: '#F0F2F5',
  cardBackground: '#FFFFFF',

  // Texto
  textPrimary: '#333333',
  textSecondary: '#666666',

  // Estados
  success: '#4CAF50',
  danger:  '#F44336',
  info:    '#2196F3',

  // Extras existentes
  placeholder: '#999999',
  shadow: 'rgba(0, 0, 0, 0.1)',

  // Derivadas úteis
  onPrimary: '#FFFFFF',
  onSecondary: '#1A1A1A',

  // UI comuns
  surface: '#FFFFFF',
  divider: '#E6E8EB',
  lightGray: '#E9EDF2',

  // ------------------------------
  // ADIÇÕES p/ componentes novos
  // ------------------------------

  // Gradiente dourado para tiles/botões (expo-linear-gradient)
  gradientGold: ['#FFB800', '#D19A24'],

  // Dourado suave para badges/estados
  secondarySoft: 'rgba(255, 184, 0, 0.12)',

  // Overlay de modais
  overlay: 'rgba(0, 0, 0, 0.45)',

  // Elevação comum (iOS + Android)
  cardElevation: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
};

export default Colors;
