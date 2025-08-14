import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  SafeAreaView, // Adicionado para safe area
  StatusBar,    // Adicionado para status bar
} from 'react-native';
import DatatimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { collection, getDocs, addDoc, Timestamp, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Importar getAuth
import { AntDesign, Ionicons } from '@expo/vector-icons'; // Importar Ionicons

// --- FIREBASE CONFIGURATION: Torna o componente auto-suficiente ---
// Substitua com as suas credenciais
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app); // Inicializa auth

// Paleta de Cores (constants/Colors.js) - Usando a paleta fornecida
const Colors = {
  // Cores Primárias (Dourado/Preto)
  primary: '#B8860B', // Dourado mais escuro para a marca principal
  primaryLight: '#D4AF37', // Dourado mais claro para destaques
  primaryDark: '#8B6B08', // Dourado mais profundo

  secondary: '#000000ff', // Um preto muito escuro ou cinza carvão para secundário
  secondaryLight: '#4A4E46', // Um cinza escuro um pouco mais claro
  secondaryDark: '#1C201A', // Um preto quase absoluto

  accent: '#FFD700', // Dourado puro/ouro para ênfase forte
  accentLight: '#FFE066', // Amarelo dourado mais suave
  accentDark: '#CCAA00', // Dourado mais escuro para contraste

  // Cores de Fundo
  background: '#F0F0F0', // Fundo geral muito claro (quase branco)
  surface: '#FFFFFF', // Fundo para cartões, headers (branco puro)
  cardBackground: '#FFFFFF', // Alias para surface

  // Cores de Texto
  textPrimary: '#1A1A1A', // Texto principal (preto bem escuro)
  textSecondary: '#505050', // Texto secundário (cinza médio-escuro)
  textLight: '#8a8a8a96', // Texto mais claro (cinza claro)

  // Cores Neutras (Pretos, Brancos, Tons de Cinza)
  white: '#FFFFFF',
  black: '#000000',

  lightGray: '#E0E0E0', // Bordas, separadores
  mediumGray: '#C0C0C0', // Componentes desabilitados, fundos sutis
  darkGray: '#707070', // Texto e ícones gerais que não sejam primary/secondary

  // Cores de Feedback
  success: '#4CAF50', // Mantido verde para universalidade (sucesso)
  warning: '#FFC107', // Mantido amarelo para universalidade (avisos)
  error: '#DC3545', // Mantido vermelho para universalidade (erros)
  info: '#17A2B8', // Mantido azul para universalidade (informações/links)
  
  // Cores de "On" (para texto/ícone sobre a cor base)
  onPrimary: '#FFFFFF', // Branco sobre o dourado
  onSecondary: '#871818ff', // Branco sobre o preto/cinza escuro
  onAccent: '#1A1A1A', // Preto sobre o dourado de ênfase
};

// Global Styles (para sombras consistentes)
const GlobalStyles = {
  shadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
  },
  cardShadow: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 14,
  }
};

// Componente AppHeader (copiado do PerfilAdminScreen para consistência)
const AppHeader = ({ title, showBackButton = false, onBackPress = () => {} }) => {
  return (
    <View style={headerStyles.headerContainer}>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor={Colors.primary}
      />
      <View style={headerStyles.headerContent}>
        {showBackButton && (
          <TouchableOpacity onPress={onBackPress} style={headerStyles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.onPrimary} />
          </TouchableOpacity>
        )}
        <Text style={[headerStyles.headerTitle, !showBackButton && { marginLeft: 0 }]}>{title}</Text>
      </View>
    </View>
  );
};

// Estilos para o AppHeader
const headerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.onPrimary,
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 5,
  }
});

export default function CriarAvaliacaoScreen({ navigation }) {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState(null);
  const [dataAvaliacao, setDataAvaliacao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Campos do formulário
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [imc, setImc] = useState('');

  // Perímetros
  const [cintura, setCintura] = useState('');
  const [quadril, setQuadril] = useState('');
  const [braco, setBraco] = useState('');
  const [coxa, setCoxa] = useState('');
  const [panturrilha, setPanturrilha] = useState('');
  const [peito, setPeito] = useState('');

  // Dobras cutâneas
  const [triceps, setTriceps] = useState('');
  const [biceps, setBiceps] = useState('');
  const [subescapular, setSubescapular] = useState('');
  const [suprailíaca, setSuprailíaca] = useState('');
  const [abdominal, setAbdominal] = useState('');
  const [coxaDobra, setCoxaDobra] = useState('');
  const [panturrilhaDobra, setPanturrilhaDobra] = useState('');

  // Outros parâmetros (gordura corporal e musculatura)
  const [gorduraCorporal, setGorduraCorporal] = useState('');
  const [musculatura, setMusculatura] = useState('');

  useEffect(() => {
    const carregarClientes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const listaClientes = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.role === 'user') {
            listaClientes.push({
              id: doc.id,
              label: data.name,
              value: doc.id,
              key: doc.id, // chave única para RNPickerSelect
            });
          }
        });
        setClientes(listaClientes);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        Alert.alert('Erro', 'Não foi possível carregar os clientes.');
      }
    };
    carregarClientes();
  }, []);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDataAvaliacao(selectedDate);
    }
  };

  // Calcula IMC automaticamente
  const calcularIMC = (pesoVal, alturaVal) => {
    const pesoNum = parseFloat(pesoVal.replace(',', '.'));
    const alturaNum = parseFloat(alturaVal.replace(',', '.'));
    if (pesoNum > 0 && alturaNum > 0) {
      const imcCalc = pesoNum / (alturaNum * alturaNum);
      setImc(imcCalc.toFixed(2));
    } else {
      setImc('');
    }
  };

  const onChangePeso = (text) => {
    setPeso(text);
    calcularIMC(text, altura);
  };

  const onChangeAltura = (text) => {
    setAltura(text);
    calcularIMC(peso, text);
  };

  const validarCampos = () => {
    // Apenas cliente, peso e altura são obrigatórios
    if (!clienteSelecionadoId) {
      Alert.alert('Erro', 'Por favor, selecione um cliente.');
      return false;
    }
    if (!peso || isNaN(parseFloat(peso.replace(',', '.'))) || parseFloat(peso.replace(',', '.')) <= 0) {
      Alert.alert('Erro', 'Informe um peso válido.');
      return false;
    }
    if (!altura || isNaN(parseFloat(altura.replace(',', '.'))) || parseFloat(altura.replace(',', '.')) <= 0) {
      Alert.alert('Erro', 'Informe uma altura válida.');
      return false;
    }
    // dataAvaliacao é sempre inicializada, então não precisa de validação extra aqui
    return true;
  };

  const handleSalvarAvaliacao = async () => {
    if (!validarCampos()) return;

    try {
      await addDoc(collection(db, 'avaliacoesFisicas'), {
        clienteId: clienteSelecionadoId,
        dataAvaliacao: Timestamp.fromDate(dataAvaliacao),
        peso: parseFloat(peso.replace(',', '.')),
        altura: parseFloat(altura.replace(',', '.')),
        imc: parseFloat(imc),
        // Perímetros são opcionais, serão null se não preenchidos
        perimetros: {
          cintura: cintura ? parseFloat(cintura.replace(',', '.')) : null,
          quadril: quadril ? parseFloat(quadril.replace(',', '.')) : null,
          braco: braco ? parseFloat(braco.replace(',', '.')) : null,
          coxa: coxa ? parseFloat(coxa.replace(',', '.')) : null,
          panturrilha: panturrilha ? parseFloat(panturrilha.replace(',', '.')) : null,
          peito: peito ? parseFloat(peito.replace(',', '.')) : null,
        },
        // Dobras cutâneas são opcionais, serão null se não preenchidas
        dobrasCutaneas: {
          triceps: triceps ? parseFloat(triceps.replace(',', '.')) : null,
          biceps: biceps ? parseFloat(biceps.replace(',', '.')) : null,
          subescapular: subescapular ? parseFloat(subescapular.replace(',', '.')) : null,
          suprailíaca: suprailíaca ? parseFloat(suprailíaca.replace(',', '.')) : null,
          abdominal: abdominal ? parseFloat(abdominal.replace(',', '.')) : null,
          coxa: coxaDobra ? parseFloat(coxaDobra.replace(',', '.')) : null,
          panturrilha: panturrilhaDobra ? parseFloat(panturrilhaDobra.replace(',', '.')) : null,
        },
        // Outros parâmetros são opcionais, serão null se não preenchidos
        outrosParametros: {
          gorduraCorporal: gorduraCorporal ? parseFloat(gorduraCorporal.replace(',', '.')) : null,
          musculatura: musculatura ? parseFloat(musculatura.replace(',', '.')) : null,
        },
      });

      Alert.alert('Sucesso', 'Avaliação criada com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    }
  };

  const DropdownIcon = () => (
    <AntDesign
      name="down"
      size={18}
      color={Colors.textSecondary} // Cor do ícone
      style={{ marginRight: 10, marginTop: Platform.OS === 'ios' ? 0 : 15 }} // Ajuste para iOS/Android
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Criar Nova Avaliação" showBackButton={true} onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Detalhes da Avaliação</Text>

        <Text style={styles.label}>Selecionar Cliente:</Text>
        {clientes.length === 0 ? (
          <View style={[styles.input, GlobalStyles.shadow, styles.loadingPickerContainer]}>
            <Text style={styles.loadingText}>Carregando clientes...</Text>
          </View>
        ) : (
          <View style={[styles.pickerSelectContainer, GlobalStyles.shadow]}>
            <RNPickerSelect
              onValueChange={(value) => setClienteSelecionadoId(value)}
              items={clientes}
              placeholder={{ label: 'Selecione um cliente...', value: null, color: Colors.textLight }}
              style={pickerSelectStyles}
              value={clienteSelecionadoId}
              useNativeAndroidPickerStyle={false}
              Icon={DropdownIcon}
            />
          </View>
        )}

        <Text style={styles.label}>Data da Avaliação:</Text>
        <TouchableOpacity style={[styles.dateInput, GlobalStyles.shadow]} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: Colors.textPrimary, fontSize: 16 }}>
            {dataAvaliacao.toLocaleDateString('pt-PT')}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dataAvaliacao}
            mode="date"
            display="default"
            onChange={onChangeDate}
            maximumDate={new Date()}
          />
        )}

        <Text style={styles.label}>Peso (kg):</Text>
        <TextInput
          style={[styles.input, GlobalStyles.shadow]}
          placeholder="Ex: 75.5"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          value={peso}
          onChangeText={onChangePeso}
        />

        <Text style={styles.label}>Altura (m):</Text>
        <TextInput
          style={[styles.input, GlobalStyles.shadow]}
          placeholder="Ex: 1.70"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          value={altura}
          onChangeText={onChangeAltura}
        />

        <View style={styles.imcContainer}>
          <Text style={styles.imcLabel}>IMC:</Text>
          <Text style={styles.imcValue}>{imc || '-'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Perímetros (cm)</Text>
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Cintura" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={cintura} onChangeText={setCintura} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Quadril" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={quadril} onChangeText={setQuadril} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Braço" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={braco} onChangeText={setBraco} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Coxa" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={coxa} onChangeText={setCoxa} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Panturrilha" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={panturrilha} onChangeText={setPanturrilha} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Peito" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={peito} onChangeText={setPeito} />

        <Text style={styles.sectionTitle}>Dobras Cutâneas (mm)</Text>
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Tríceps" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={triceps} onChangeText={setTriceps} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Bíceps" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={biceps} onChangeText={setBiceps} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Subescapular" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={subescapular} onChangeText={setSubescapular} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Suprailíaca" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={suprailíaca} onChangeText={setSuprailíaca} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Abdominal" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={abdominal} onChangeText={setAbdominal} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Coxa" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={coxaDobra} onChangeText={setCoxaDobra} />
        <TextInput style={[styles.input, GlobalStyles.shadow]} placeholder="Panturrilha" placeholderTextColor={Colors.textLight} keyboardType="numeric" value={panturrilhaDobra} onChangeText={setPanturrilhaDobra} />

        <Text style={styles.sectionTitle}>Outros Parâmetros (%)</Text>
        <TextInput
          style={[styles.input, GlobalStyles.shadow]}
          placeholder="Gordura Corporal (%)"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          value={gorduraCorporal}
          onChangeText={setGorduraCorporal}
        />
        <TextInput
          style={[styles.input, GlobalStyles.shadow]}
          placeholder="Musculatura (%)"
          placeholderTextColor={Colors.textLight}
          keyboardType="numeric"
          value={musculatura}
          onChangeText={setMusculatura}
        />

        <TouchableOpacity style={[styles.button, GlobalStyles.shadow]} onPress={handleSalvarAvaliacao}>
          <Text style={styles.buttonText}>Salvar Avaliação</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray, // Cor da borda
    borderRadius: 8,
    color: Colors.textPrimary, // Cor do texto
    paddingRight: 30,
    backgroundColor: Colors.surface, // Fundo
    marginBottom: 15,
    height: 50, // Altura fixa para consistência
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray, // Cor da borda
    borderRadius: 8,
    color: Colors.textPrimary, // Cor do texto
    paddingRight: 30,
    backgroundColor: Colors.surface, // Fundo
    marginBottom: 15,
    height: 50, // Altura fixa para consistência
  },
  iconContainer: {
    top: Platform.OS === 'ios' ? 15 : 10,
    right: 10,
  },
  placeholder: {
    color: Colors.textLight, // Cor do placeholder
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.background,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
    marginTop: 25, // Mais espaço acima dos títulos de seção
    textAlign: 'left',
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  dateInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    justifyContent: 'center',
    height: 50,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: Colors.textPrimary,
    height: 50, // Altura fixa para consistência
  },
  pickerSelectContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    overflow: 'hidden',
  },
  loadingPickerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 50,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  imcContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 20, // Mais espaço abaixo do IMC
    borderWidth: 1,
    borderColor: Colors.lightGray,
    ...GlobalStyles.shadow, // Aplicar sombra ao container IMC
  },
  imcLabel: {
    fontWeight: '700', // Mais negrito
    fontSize: 18, // Maior
    color: Colors.textPrimary,
  },
  imcValue: {
    marginLeft: 10,
    fontSize: 18, // Maior
    color: Colors.primaryDark, // Cor para o valor do IMC
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30, // Mais espaço acima do botão
    marginBottom: 30,
    ...GlobalStyles.shadow,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
});
