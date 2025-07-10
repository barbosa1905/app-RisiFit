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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNPickerSelect from 'react-native-picker-select';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { AntDesign } from '@expo/vector-icons';

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
        perimetros: {
          cintura: cintura ? parseFloat(cintura.replace(',', '.')) : null,
          quadril: quadril ? parseFloat(quadril.replace(',', '.')) : null,
          braco: braco ? parseFloat(braco.replace(',', '.')) : null,
          coxa: coxa ? parseFloat(coxa.replace(',', '.')) : null,
          panturrilha: panturrilha ? parseFloat(panturrilha.replace(',', '.')) : null,
          peito: peito ? parseFloat(peito.replace(',', '.')) : null,
        },
        dobrasCutaneas: {
          triceps: triceps ? parseFloat(triceps.replace(',', '.')) : null,
          biceps: biceps ? parseFloat(biceps.replace(',', '.')) : null,
          subescapular: subescapular ? parseFloat(subescapular.replace(',', '.')) : null,
          suprailíaca: suprailíaca ? parseFloat(suprailíaca.replace(',', '.')) : null,
          abdominal: abdominal ? parseFloat(abdominal.replace(',', '.')) : null,
          coxa: coxaDobra ? parseFloat(coxaDobra.replace(',', '.')) : null,
          panturrilha: panturrilhaDobra ? parseFloat(panturrilhaDobra.replace(',', '.')) : null,
        },
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
      color="#666"
      style={{ marginRight: 10, marginTop: 15 }}
    />
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Nova Avaliação</Text>

      <Text style={styles.label}>Selecionar Cliente:</Text>
      {clientes.length === 0 ? (
        <Text>Carregando clientes...</Text>
      ) : (
        <RNPickerSelect
          onValueChange={(value) => setClienteSelecionadoId(value)}
          items={clientes}
          placeholder={{ label: 'Selecione um cliente...', value: null, color: '#999' }}
          style={pickerSelectStyles}
          value={clienteSelecionadoId}
          useNativeAndroidPickerStyle={false}
          Icon={DropdownIcon}
        />
      )}

      <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
        <Text>{dataAvaliacao.toLocaleDateString()}</Text>
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

      <TextInput
        style={styles.input}
        placeholder="Peso (kg)"
        keyboardType="numeric"
        value={peso}
        onChangeText={onChangePeso}
      />

      <TextInput
        style={styles.input}
        placeholder="Altura (m)"
        keyboardType="numeric"
        value={altura}
        onChangeText={onChangeAltura}
      />

      <View style={styles.imcContainer}>
        <Text style={styles.imcLabel}>IMC:</Text>
        <Text style={styles.imcValue}>{imc || '-'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Perímetros (cm)</Text>
      <TextInput style={styles.input} placeholder="Cintura" keyboardType="numeric" value={cintura} onChangeText={setCintura} />
      <TextInput style={styles.input} placeholder="Quadril" keyboardType="numeric" value={quadril} onChangeText={setQuadril} />
      <TextInput style={styles.input} placeholder="Braço" keyboardType="numeric" value={braco} onChangeText={setBraco} />
      <TextInput style={styles.input} placeholder="Coxa" keyboardType="numeric" value={coxa} onChangeText={setCoxa} />
      <TextInput style={styles.input} placeholder="Panturrilha" keyboardType="numeric" value={panturrilha} onChangeText={setPanturrilha} />
      <TextInput style={styles.input} placeholder="Peito" keyboardType="numeric" value={peito} onChangeText={setPeito} />

      <Text style={styles.sectionTitle}>Dobras Cutâneas (mm)</Text>
      <TextInput style={styles.input} placeholder="Tríceps" keyboardType="numeric" value={triceps} onChangeText={setTriceps} />
      <TextInput style={styles.input} placeholder="Bíceps" keyboardType="numeric" value={biceps} onChangeText={setBiceps} />
      <TextInput style={styles.input} placeholder="Subescapular" keyboardType="numeric" value={subescapular} onChangeText={setSubescapular} />
      <TextInput style={styles.input} placeholder="Suprailíaca" keyboardType="numeric" value={suprailíaca} onChangeText={setSuprailíaca} />
      <TextInput style={styles.input} placeholder="Abdominal" keyboardType="numeric" value={abdominal} onChangeText={setAbdominal} />
      <TextInput style={styles.input} placeholder="Coxa" keyboardType="numeric" value={coxaDobra} onChangeText={setCoxaDobra} />
      <TextInput style={styles.input} placeholder="Panturrilha" keyboardType="numeric" value={panturrilhaDobra} onChangeText={setPanturrilhaDobra} />

      <Text style={styles.sectionTitle}>Outros Parâmetros (%)</Text>
      <TextInput
        style={styles.input}
        placeholder="Gordura Corporal (%)"
        keyboardType="numeric"
        value={gorduraCorporal}
        onChangeText={setGorduraCorporal}
      />
      <TextInput
        style={styles.input}
        placeholder="Musculatura (%)"
        keyboardType="numeric"
        value={musculatura}
        onChangeText={setMusculatura}
      />

      <TouchableOpacity style={styles.button} onPress={handleSalvarAvaliacao}>
        <Text style={styles.buttonText}>Salvar Avaliação</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    color: '#d0a956',
    paddingRight: 30, // para o ícone não sobrepor
    backgroundColor: '#f0f0f0',
    marginBottom: 15,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // para o ícone não sobrepor
    backgroundColor: '#d0a956',
    marginBottom: 15,
  },
  iconContainer: {
    top: Platform.OS === 'ios' ? 15 : 10,
    right: 10,
  },
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  imcContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  imcLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  imcValue: {
    marginLeft: 10,
    fontSize: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
    marginTop: 25,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: '#d0a956',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 16,
  },
});
