import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useUser } from '../contexts/UserContext';
import { db } from '../services/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

export default function PerfilScreen() {
  const { user } = useUser();
  const navigation = useNavigation();

  const auth = getAuth();
  const [fotoPerfil, setFotoPerfil] = useState(user?.photoURL || null);

  const [healthInfo, setHealthInfo] = useState({
    idade: '',
    sexo: '',
    contacto: '',
    historicoSaude: '',
    medicacao: '',
    estiloVida: '',
    experiencia: '',
    objetivos: '',
    disponibilidade: '',
  });

  const [camposInvalidos, setCamposInvalidos] = useState([]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert('Sessão terminada', 'Você foi desconectado.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error('Erro no logout:', error);
      Alert.alert('Erro', 'Não foi possível terminar a sessão.');
    }
  };

  useEffect(() => {
    const carregarDados = async () => {
      if (!user?.uid) return;
      try {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHealthInfo({
            idade: data.idade || '',
            sexo: data.sexo || '',
            contacto: data.contacto || '',
            historicoSaude: data.historicoSaude || '',
            medicacao: data.medicacao || '',
            estiloVida: data.estiloVida || '',
            experiencia: data.experiencia || '',
            objetivos: data.objetivos || '',
            disponibilidade: data.disponibilidade || '',
          });
          setFotoPerfil(data.fotoPerfil || user.photoURL || null);
        }
      } catch (error) {
        console.log('Erro ao carregar dados:', error);
      }
    };
    carregarDados();
  }, [user]);

  const handleEscolherImagem = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para selecionar uma imagem.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setFotoPerfil(result.assets[0].uri);
    }
  };

  const handleSalvar = async () => {
    if (!user?.uid) return;

    const camposVazios = Object.entries(healthInfo)
      .filter(([_, valor]) => !valor.trim())
      .map(([key]) => key);

    if (camposVazios.length > 0) {
      setCamposInvalidos(camposVazios);
      Alert.alert('Preenchimento incompleto', 'Por favor, preencha todos os campos antes de salvar.');
      return;
    }

    setCamposInvalidos([]);

    try {
      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        idade: healthInfo.idade,
        sexo: healthInfo.sexo,
        contacto: healthInfo.contacto,
        historicoSaude: healthInfo.historicoSaude,
        medicacao: healthInfo.medicacao,
        estiloVida: healthInfo.estiloVida,
        experiencia: healthInfo.experiencia,
        objetivos: healthInfo.objetivos,
        disponibilidade: healthInfo.disponibilidade,
        fotoPerfil: fotoPerfil || null,
      });

      Alert.alert('✅ Salvo com sucesso!', 'Informações gravadas na base de dados.');
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      Alert.alert('Erro ao salvar', 'Tente novamente.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={handleEscolherImagem} style={{ alignSelf: 'center' }}>
        <Image
          source={{ uri: fotoPerfil || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <View style={styles.editIcon}>
          <MaterialIcons name="edit" size={20} color="#fff" />
        </View>
      </TouchableOpacity>

      <Text style={styles.nome}>{user?.displayName || user?.email.split('@')[0]}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><MaterialIcons name="person" size={18} color="#2563EB" /> Dados Pessoais</Text>
        <TextInput style={[styles.input, camposInvalidos.includes('idade') && styles.inputErro]} placeholder="Idade" value={healthInfo.idade} onChangeText={(text) => setHealthInfo({ ...healthInfo, idade: text })} keyboardType="numeric" />
        <TextInput style={[styles.input, camposInvalidos.includes('sexo') && styles.inputErro]} placeholder="Sexo" value={healthInfo.sexo} onChangeText={(text) => setHealthInfo({ ...healthInfo, sexo: text })} />
        <TextInput style={[styles.input, camposInvalidos.includes('contacto') && styles.inputErro]} placeholder="Contacto" value={healthInfo.contacto} keyboardType="phone-pad" onChangeText={(text) => setHealthInfo({ ...healthInfo, contacto: text })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><MaterialIcons name="favorite" size={18} color="#EF4444" /> Histórico de Saúde</Text>
        <TextInput style={[styles.input, camposInvalidos.includes('historicoSaude') && styles.inputErro]} placeholder="Doenças, lesões, cirurgias..." value={healthInfo.historicoSaude} onChangeText={(text) => setHealthInfo({ ...healthInfo, historicoSaude: text })} />
        <TextInput style={[styles.input, camposInvalidos.includes('medicacao') && styles.inputErro]} placeholder="Medicação atual" value={healthInfo.medicacao} onChangeText={(text) => setHealthInfo({ ...healthInfo, medicacao: text })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><MaterialIcons name="self-improvement" size={18} color="#10B981" /> Estilo de Vida</Text>
        <TextInput style={[styles.input, camposInvalidos.includes('estiloVida') && styles.inputErro]} placeholder="Sono, alimentação, hábitos..." value={healthInfo.estiloVida} onChangeText={(text) => setHealthInfo({ ...healthInfo, estiloVida: text })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><MaterialIcons name="fitness-center" size={18} color="#F59E0B" /> Experiência e Objetivos</Text>
        <TextInput style={[styles.input, camposInvalidos.includes('experiencia') && styles.inputErro]} placeholder="Experiência com treino" value={healthInfo.experiencia} onChangeText={(text) => setHealthInfo({ ...healthInfo, experiencia: text })} />
        <TextInput style={[styles.input, camposInvalidos.includes('objetivos') && styles.inputErro]} placeholder="Objetivos" value={healthInfo.objetivos} onChangeText={(text) => setHealthInfo({ ...healthInfo, objetivos: text })} />
        <TextInput style={[styles.input, camposInvalidos.includes('disponibilidade') && styles.inputErro]} placeholder="Disponibilidade semanal" value={healthInfo.disponibilidade} onChangeText={(text) => setHealthInfo({ ...healthInfo, disponibilidade: text })} />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSalvar}>
        <Text style={styles.saveText}>💾 Salvar Informações</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Terminar Sessão</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: 'center',
    marginBottom: 15,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#2563EB',
    borderRadius: 15,
    padding: 4,
  },
  nome: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    marginTop: 8,
  },
  email: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  inputErro: {
    borderColor: '#dc2626',
    borderWidth: 1.5,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
