// Layout.js
import { Dimensions } from 'react-native';
import Colors from './Colors'; // Import Colors para usar Colors.shadow

const { width, height } = Dimensions.get('window');

export default {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  spacing: {
    xsmall: 4,
    small: 8,
    medium: 16,
    large: 24,
    xlarge: 32,
  },
  padding: 20,
  borderRadius: {
    small: 5,
    medium: 10,
    large: 15,
    pill: 999, // Adicionado para avatares/elementos circulares
  },
  fontSizes: {
    title: 22,
    subtitle: 18,
    body: 16,
    small: 14,
    xsmall: 12,
    large: 18, // Adicionado, pois é usado em HomeScreen
    xlarge: 20, // Adicionado, pois é usado em HomeScreen
  },
  cardElevation: { // Adicionado para sombras de cartão consistentes
    shadowColor: Colors.shadow, // Usa Colors.shadow para consistência
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  }
};
