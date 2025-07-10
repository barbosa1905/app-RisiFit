// AvaliacoesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width;

export default function AvaliacoesScreen() {
  const { user } = useUser();
  const [avaliacao, setAvaliacao] = useState({
    peso: '',
    altura: '',
    gordura: '',
    abdominal: '',
    braco: '',
    coxa: '',
    peitoral: '',
    quadril: '',
    panturrilha: '',
  });

  const [dataAvaliacao, setDataAvaliacao] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [historico, setHistorico] = useState([]);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDataAvaliacao(selectedDate);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString();
  };

  const handleSalvar = async () => {
    if (!user?.uid) return;

    if (!avaliacao.peso.trim() || !avaliacao.altura.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, preencha peso e altura.');
      return;
    }

    try {
      const dados = {
        ...avaliacao,
        uid: user.uid,
        data: Timestamp.fromDate(dataAvaliacao),
      };

      await addDoc(collection(db, 'avaliacoes'), dados);
      Alert.alert('✅ Avaliação registrada!');
      setAvaliacao({
        peso: '',
        altura: '',
        gordura: '',
        abdominal: '',
        braco: '',
        coxa: '',
        peitoral: '',
        quadril: '',
        panturrilha: '',
      });
      setDataAvaliacao(new Date());
      carregarHistorico();
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      Alert.alert('Erro ao salvar');
    }
  };

  const carregarHistorico = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, 'avaliacoes'),
        where('uid', '==', user.uid),
        orderBy('data')
      );
      const querySnapshot = await getDocs(q);

      const dados = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        data: doc.data().data.toDate().toLocaleDateString(),
      }));

      setHistorico(dados);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const renderGrafico = () => {
    if (historico.length < 2) return null;

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={styles.titulo}>Evolução do Peso</Text>
        <LineChart
          data={{
            labels: historico.map((item) => item.data),
            datasets: [
              {
                data: historico.map((item) => parseFloat(item.peso)),
              },
            ],
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#f3f4f6',
            backgroundGradientTo: '#e5e7eb',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            style: {
              borderRadius: 16,
            },
          }}
          style={{ borderRadius: 16 }}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Nova Avaliação Física</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados Corporais</Text>
        <TextInput
          style={styles.input}
          placeholder="Peso (kg)"
          keyboardType="numeric"
          value={avaliacao.peso}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, peso: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Altura (cm)"
          keyboardType="numeric"
          value={avaliacao.altura}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, altura: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Gordura (%)"
          keyboardType="numeric"
          value={avaliacao.gordura}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, gordura: text })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medidas (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="Abdominal"
          keyboardType="numeric"
          value={avaliacao.abdominal}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, abdominal: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Braço"
          keyboardType="numeric"
          value={avaliacao.braco}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, braco: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Coxa"
          keyboardType="numeric"
          value={avaliacao.coxa}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, coxa: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Peitoral"
          keyboardType="numeric"
          value={avaliacao.peitoral}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, peitoral: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Quadril"
          keyboardType="numeric"
          value={avaliacao.quadril}
          onChangeText={(text) => setAvaliacao({ ...avaliacao, quadril: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Panturrilha"
          keyboardType="numeric"
          value={avaliacao.panturrilha}
          onChangeText={(text) =>
            setAvaliacao({ ...avaliacao, panturrilha: text })
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data da Avaliação</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>{formatDate(dataAvaliacao)}</Text>
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
      </View>

      <TouchableOpacity style={styles.botao} onPress={handleSalvar}>
        <Text style={styles.botaoTexto}>Salvar Avaliação</Text>
      </TouchableOpacity>

      {renderGrafico()}

      <Text style={styles.titulo}>Histórico de Avaliações</Text>
      {historico.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.data}>{item.data}</Text>
          <Text>Peso: {item.peso} kg</Text>
          <Text>Gordura: {item.gordura} %</Text>
          <Text>Abdominal: {item.abdominal} cm</Text>
          <Text>Peitoral: {item.peitoral} cm</Text>
          <Text>Quadril: {item.quadril} cm</Text>
          <Text>Coxa: {item.coxa} cm</Text>
          <Text>Braço: {item.braco} cm</Text>
          <Text>Panturrilha: {item.panturrilha} cm</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  titulo: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#111827',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  botao: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  data: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1F2937',
  },
});
