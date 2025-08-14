// Crie um novo arquivo, por exemplo, SearchHeader.js
// ou adicione isto logo acima de ClientesScreen no mesmo arquivo

import React, { memo } from 'react'; // Usar memo para otimização
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Importar as cores e GlobalStyles se estiverem num arquivo separado,
// ou passá-las como props (se forem dinâmicas)
// Para simplificar, vou assumir que Colors e GlobalStyles estão disponíveis globalmente ou importados.
// Se não estiverem, terás que importar/definir aqui ou passar via props.
const Colors = {
    primaryGold: '#B8860B', // Ouro mais clássico
    darkBrown: '#3E2723', // Marrom bem escuro, quase preto
    lightBrown: '#795548', // Marrom mais suave
    creamBackground: '#FDF7E4', // Fundo creme claro
    white: '#FFFFFF',
    lightGray: '#ECEFF1', // Cinza muito claro
    mediumGray: '#B0BEC5', // Cinza médio para textos secundários
    darkGray: '#424242', // Cinza escuro para textos principais
    accentBlue: '#2196F3', // Azul vibrante para links
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#F44336', // Vermelho para erros/alertos
    buttonTextLight: '#FFFFFF', // Cor de texto para botões com fundo escuro
    buttonTextDark: '#3E2723', // Cor de texto para botões com fundo claro
    shadow: 'rgba(0,0,0,0.08)', // Sombra suave
    black: '#000000', // Adicionado para o headerTitle
  };

  const GlobalStyles = {
    shadow: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    cardShadow: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    }
  };


const SearchHeader = memo(({ pesquisa, setPesquisa, clientesFiltradosCount, showEmptyResults, emptyResultsText }) => {
  return (
    <View style={searchHeaderStyles.listHeaderSection}>
      <View style={[searchHeaderStyles.cardWrapper, GlobalStyles.shadow, searchHeaderStyles.totalClientsCard]}>
        <Text style={searchHeaderStyles.totalClientsText}>
          <Ionicons name="people-outline" size={20} color={Colors.darkBrown} /> {clientesFiltradosCount} clientes encontrados
        </Text>
      </View>

      {/* Campo de Pesquisa - SEMPRE VISÍVEL */}
      <View style={[searchHeaderStyles.cardWrapper, GlobalStyles.shadow]}>
        <Text style={searchHeaderStyles.sectionTitle}>Pesquisar Clientes</Text>
        <TextInput
          style={searchHeaderStyles.searchInput}
          placeholder="🔍 Pesquisar por nome..."
          placeholderTextColor={Colors.mediumGray}
          value={pesquisa}
          onChangeText={setPesquisa}
        />
      </View>

      {showEmptyResults && (
        <View style={searchHeaderStyles.emptyResultsContainer}>
          <Ionicons name="sad-outline" size={50} color={Colors.mediumGray} />
          <Text style={searchHeaderStyles.emptyResultsText}>
            {emptyResultsText}
          </Text>
        </View>
      )}
    </View>
  );
});

const searchHeaderStyles = StyleSheet.create({
  listHeaderSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  cardWrapper: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  totalClientsCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalClientsText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkBrown,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkBrown,
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.darkGray,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    borderRadius: 8,
    backgroundColor: Colors.lightGray,
  },
  emptyResultsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 30,
    textAlign: 'center',
  },
  emptyResultsText: {
    fontSize: 17,
    color: Colors.mediumGray,
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default SearchHeader; // Se for num arquivo separado