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
  Switch,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db,app } from '../../services/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Picker } from '@react-native-picker/picker';

// Lista abrangente de códigos de país (mantida do último update)
const countryCodes = [
  { label: '🇦🇫 Afeganistão (+93)', value: '+93' },
  { label: '🇦🇱 Albânia (+355)', value: '+355' },
  { label: '🇩🇿 Argélia (+213)', value: '+213' },
  { label: '🇦🇩 Andorra (+376)', value: '+376' },
  { label: '🇦🇴 Angola (+244)', value: '+244' },
  { label: '🇦🇷 Argentina (+54)', value: '+54' },
  { label: '🇦🇲 Arménia (+374)', value: '+374' },
  { label: '🇦🇺 Austrália (+61)', value: '+61' },
  { label: '🇦🇹 Áustria (+43)', value: '+43' },
  { label: '🇦🇿 Azerbaijão (+994)', value: '+994' },
  { label: '🇧🇸 Bahamas (+1-242)', value: '+1-242' },
  { label: '🇧🇭 Barém (+973)', value: '+973' },
  { label: '🇧🇩 Bangladesh (+880)', value: '+880' },
  { label: '🇧🇧 Barbados (+1-246)', value: '+1-246' },
  { label: '🇧🇾 Bielorrússia (+375)', value: '+375' },
  { label: '🇧🇪 Bélgica (+32)', value: '+32' },
  { label: '🇧🇿 Belize (+501)', value: '+501' },
  { label: '🇧🇯 Benim (+229)', value: '+229' },
  { label: '🇧🇹 Butão (+975)', value: '+975' },
  { label: '🇧🇴 Bolívia (+591)', value: '+591' },
  { label: '🇧🇦 Bósnia e Herzegovina (+387)', value: '+387' },
  { label: '🇧🇼 Botsuana (+267)', value: '+267' },
  { label: '🇧🇷 Brasil (+55)', value: '+55' },
  { label: '�🇳 Brunei (+673)', value: '+673' },
  { label: '🇧🇬 Bulgária (+359)', value: '+359' },
  { label: '🇧🇫 Burquina Faso (+226)', value: '+226' },
  { label: '🇧🇮 Burúndi (+257)', value: '+257' },
  { label: '🇰🇭 Camboja (+855)', value: '+855' },
  { label: '🇨🇲 Camarões (+237)', value: '+237' },
  { label: '🇨🇦 Canadá (+1)', value: '+1' },
  { label: '🇨🇻 Cabo Verde (+238)', value: '+238' },
  { label: '🇨🇫 Rep. Centro-Africana (+236)', value: '+236' },
  { label: '🇹🇩 Chade (+235)', value: '+235' },
  { label: '🇨🇱 Chile (+56)', value: '+56' },
  { label: '🇨🇳 China (+86)', value: '+86' },
  { label: '🇨🇴 Colômbia (+57)', value: '+57' },
  { label: '🇰🇲 Comores (+269)', value: '+269' },
  { label: '🇨🇬 Congo (Rep.) (+242)', value: '+242' },
  { label: '🇨🇩 Congo (Dem. Rep.) (+243)', value: '+243' },
  { label: '🇨🇷 Costa Rica (+506)', value: '+506' },
  { label: '🇭🇷 Croácia (+385)', value: '+385' },
  { label: '🇨🇺 Cuba (+53)', value: '+53' },
  { label: '🇨🇾 Chipre (+357)', value: '+357' },
  { label: '🇨🇿 Chéquia (+420)', value: '+420' },
  { label: '🇩🇰 Dinamarca (+45)', value: '+45' },
  { label: '🇩🇯 Djibuti (+253)', value: '+253' },
  { label: '🇩🇲 Domínica (+1-767)', value: '+1-767' },
  { label: '🇩🇴 Rep. Dominicana (+1-809, +1-829, +1-849)', value: '+1-809' },
  { label: '🇪🇨 Equador (+593)', value: '+593' },
  { label: '🇪🇬 Egito (+20)', value: '+20' },
  { label: '🇸🇻 El Salvador (+503)', value: '+503' },
  { label: '🇬🇶 Guiné Equatorial (+240)', value: '+240' },
  { label: '🇪🇷 Eritreia (+291)', value: '+291' },
  { label: '🇪🇪 Estónia (+372)', value: '+372' },
  { label: '🇸🇿 Essuatíni (+268)', value: '+268' },
  { label: '🇪🇹 Etiópia (+251)', value: '+251' },
  { label: '🇫🇯 Fiji (+679)', value: '+679' },
  { label: '🇫🇮 Finlândia (+358)', value: '+358' },
  { label: '🇫🇷 França (+33)', value: '+33' },
  { label: '🇬🇦 Gabão (+241)', value: '+241' },
  { label: '🇬🇲 Gâmbia (+220)', value: '+220' },
  { label: '🇬🇪 Geórgia (+995)', value: '+995' },
  { label: '🇩🇪 Alemanha (+49)', value: '+49' },
  { label: '🇬🇭 Gana (+233)', value: '+233' },
  { label: '🇬🇷 Grécia (+30)', value: '+30' },
  { label: '🇬🇩 Granada (+1-473)', value: '+1-473' },
  { label: '🇬🇹 Guatemala (+502)', value: '+502' },
  { label: '🇬🇳 Guiné (+224)', value: '+224' },
  { label: '🇬🇼 Guiné-Bissau (+245)', value: '+245' },
  { label: '🇬🇾 Guiana (+592)', value: '+592' },
  { label: '🇭🇹 Haiti (+509)', value: '+509' },
  { label: '🇭🇳 Honduras (+504)', value: '+504' },
  { label: '🇭🇺 Hungria (+36)', value: '+36' },
  { label: '🇮🇸 Islândia (+354)', value: '+354' },
  { label: '🇮🇳 Índia (+91)', value: '+91' },
  { label: '🇮🇩 Indonésia (+62)', value: '+62' },
  { label: '🇮🇷 Irão (+98)', value: '+98' },
  { label: '🇮🇶 Iraque (+964)', value: '+964' },
  { label: '🇮🇪 Irlanda (+353)', value: '+353' },
  { label: '🇮🇱 Israel (+972)', value: '+972' },
  { label: '🇮🇹 Itália (+39)', value: '+39' },
  { label: '🇯🇲 Jamaica (+1-876)', value: '+1-876' },
  { label: '🇯🇵 Japão (+81)', value: '+81' },
  { label: '🇯🇴 Jordânia (+962)', value: '+962' },
  { label: '🇰🇿 Cazaquistão (+7)', value: '+7' },
  { label: '🇰🇪 Quénia (+254)', value: '+254' },
  { label: '🇰🇮 Quiribati (+686)', value: '+686' },
  { label: '🇽🇰 Kosovo (+383)', value: '+383' },
  { label: '🇰🇼 Kuwait (+965)', value: '+965' },
  { label: '🇰🇬 Quirguistão (+996)', value: '+996' },
  { label: '🇱🇦 Laos (+856)', value: '+856' },
  { label: '🇱🇻 Letónia (+371)', value: '+371' },
  { label: '🇱🇧 Líbano (+961)', value: '+961' },
  { label: '🇱🇸 Lesoto (+266)', value: '+266' },
  { label: '🇱🇷 Libéria (+231)', value: '+231' },
  { label: '🇱🇾 Líbia (+218)', value: '+218' },
  { label: '🇱🇮 Liechtenstein (+423)', value: '+423' },
  { label: '🇱🇹 Lituânia (+370)', value: '+370' },
  { label: '🇱🇺 Luxemburgo (+352)', value: '+352' },
  { label: '🇲🇰 Macedónia do Norte (+389)', value: '+389' },
  { label: '🇲🇬 Madagáscar (+261)', value: '+261' },
  { label: '🇲🇼 Maláui (+265)', value: '+265' },
  { label: '🇲🇾 Malásia (+60)', value: '+60' },
  { label: '🇲🇻 Maldivas (+960)', value: '+960' },
  { label: '🇲🇱 Mali (+223)', value: '+223' },
  { label: '🇲🇹 Malta (+356)', value: '+356' },
  { label: '🇲🇷 Mauritânia (+222)', value: '+222' },
  { label: '🇲🇺 Maurícias (+230)', value: '+230' },
  { label: '🇲🇽 México (+52)', value: '+52' },
  { label: '🇲🇩 Moldávia (+373)', value: '+373' },
  { label: '🇲🇨 Mónaco (+377)', value: '+377' },
  { label: '🇲🇳 Mongólia (+976)', value: '+976' },
  { label: '🇲🇪 Montenegro (+382)', value: '+382' },
  { label: '🇲🇦 Marrocos (+212)', value: '+212' },
  { label: '🇲🇿 Moçambique (+258)', value: '+258' },
  { label: '🇲🇲 Mianmar (+95)', value: '+95' },
  { label: '🇳🇦 Namíbia (+264)', value: '+264' },
  { label: '🇳🇵 Nepal (+977)', value: '+977' },
  { label: '🇳🇱 Países Baixos (+31)', value: '+31' },
  { label: '🇳🇿 Nova Zelândia (+64)', value: '+64' },
  { label: '🇳🇮 Nicarágua (+505)', value: '+505' },
  { label: '🇳🇪 Níger (+227)', value: '+227' },
  { label: '🇳🇬 Nigéria (+234)', value: '+234' },
  { label: '🇰🇵 Coreia do Norte (+850)', value: '+850' },
  { label: '🇳🇴 Noruega (+47)', value: '+47' },
  { label: '🇴🇲 Omã (+968)', value: '+968' },
  { label: '🇵🇰 Paquistão (+92)', value: '+92' },
  { label: '🇵🇦 Panamá (+507)', value: '+507' },
  { label: '🇵🇬 Papua Nova Guiné (+675)', value: '+675' },
  { label: '🇵🇾 Paraguai (+595)', value: '+595' },
  { label: '🇵🇪 Peru (+51)', value: '+51' },
  { label: '🇵🇭 Filipinas (+63)', value: '+63' },
  { label: '🇵🇱 Polónia (+48)', value: '+48' },
  { label: '🇵🇹 Portugal (+351)', value: '+351' },
  { label: '🇶🇦 Catar (+974)', value: '+974' },
  { label: '🇷🇴 Roménia (+40)', value: '+40' },
  { label: '🇷🇺 Rússia (+7)', value: '+7' },
  { label: '🇷🇼 Ruanda (+250)', value: '+250' },
  { label: '🇸🇲 San Marino (+378)', value: '+378' },
  { label: '🇸🇹 São Tomé e Príncipe (+239)', value: '+239' },
  { label: '🇸🇦 Arábia Saudita (+966)', value: '+966' },
  { label: '🇸🇳 Senegal (+221)', value: '+221' },
  { label: '🇷🇸 Sérvia (+381)', value: '+381' },
  { label: '🇸🇱 Serra Leoa (+232)', value: '+232' },
  { label: '🇸🇬 Singapura (+65)', value: '+65' },
  { label: '🇸🇰 Eslováquia (+421)', value: '+421' },
  { label: '🇸🇮 Eslovénia (+386)', value: '+386' },
  { label: '🇸🇧 Ilhas Salomão (+677)', value: '+677' },
  { label: '🇸🇴 Somália (+252)', value: '+252' },
  { label: '🇿🇦 África do Sul (+27)', value: '+27' },
  { label: '🇰🇷 Coreia do Sul (+82)', value: '+82' },
  { label: '🇪🇸 Espanha (+34)', value: '+34' },
  { label: '🇱🇰 Sri Lanka (+94)', value: '+94' },
  { label: '🇸🇩 Sudão (+249)', value: '+249' },
  { label: '🇸🇸 Sudão do Sul (+211)', value: '+211' },
  { label: '🇸🇪 Suécia (+46)', value: '+46' },
  { label: '🇨🇭 Suíça (+41)', value: '+41' },
  { label: '🇸🇾 Síria (+963)', value: '+963' },
  { label: '🇹🇼 Taiwan (+886)', value: '+886' },
  { label: '🇹🇿 Tanzânia (+255)', value: '+255' },
  { label: '🇹🇭 Tailândia (+66)', value: '+66' },
  { label: '🇹🇱 Timor-Leste (+670)', value: '+670' },
  { label: '🇹🇬 Togo (+228)', value: '+228' },
  { label: '🇹🇴 Tonga (+676)', value: '+676' },
  { label: '🇹🇹 Trindade e Tobago (+1-868)', value: '+1-868' },
  { label: '🇹🇳 Tunísia (+216)', value: '+216' },
  { label: '🇹🇷 Turquia (+90)', value: '+90' },
  { label: '🇹🇲 Turquemenistão (+993)', value: '+993' },
  { label: '🇺🇬 Uganda (+256)', value: '+256' },
  { label: '🇺🇦 Ucrânia (+380)', value: '+380' },
  { label: '🇦🇪 Emirados Árabes Unidos (+971)', value: '+971' },
  { label: '🇬🇧 Reino Unido (+44)', value: '+44' },
  { label: '🇺🇸 EUA (+1)', value: '+1' },
  { label: '🇺🇾 Uruguai (+598)', value: '+598' },
  { label: '🇺🇿 Uzbequistão (+998)', value: '+998' },
  { label: '🇻🇺 Vanuatu (+678)', value: '+678' },
  { label: '🇻🇦 Vaticano (+379)', value: '+379' },
  { label: '🇻🇪 Venezuela (+58)', value: '+58' },
  { label: '🇻🇳 Vietname (+84)', value: '+84' },
  { label: '🇾🇪 Iémen (+967)', value: '+967' },
  { label: '🇿🇲 Zâmbia (+260)', value: '+260' },
  { label: '🇿🇼 Zimbabué (+263)', value: '+263' },
];

// IDs dos questionários pré-definidos (devem ser os mesmos que em CriarQuestionarioScreen.js)
const PREDEFINED_ANAMNESE_IDS = ['PAR-Q_Predefinido', 'Padrao_Predefinido'];

export default function RegistoClienteScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [prefixoTelefone, setPrefixoTelefone] = useState('+351');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [genero, setGenero] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [enviarAcesso, setEnviarAcesso] = useState(true);
  const [enviarAnamnese, setEnviarAnamnese] = useState(null);
  const [tipoAnamneseId, setTipoAnamneseId] = useState(null);
  const [availableQuestionarios, setAvailableQuestionarios] = useState([]);
  const [loadingQuestionarios, setLoadingQuestionarios] = useState(true);

  useEffect(() => {
    const fetchQuestionarios = async () => {
      try {
        setLoadingQuestionarios(true);
        const querySnapshot = await getDocs(collection(db, 'questionariosPublicos'));
        const allQuestionarios = querySnapshot.docs.map(doc => ({
          id: doc.id,
          nome: doc.data().nome,
        }));

        const filteredQuestionarios = allQuestionarios.filter(q =>
          PREDEFINED_ANAMNESE_IDS.includes(q.id)
        );
        setAvailableQuestionarios(filteredQuestionarios);
      } catch (error) {
        console.error('Erro ao carregar questionários:', error);
        Alert.alert('Erro', 'Não foi possível carregar os questionários de anamnese disponíveis.');
      } finally {
        setLoadingQuestionarios(false);
      }
    };

    fetchQuestionarios();
  }, []);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDataNascimento(selectedDate);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [day, month, year].join('/');
  };

   const handleRegister = async () => {
    if (!email || !senha || !nome || !grupo) {
      Alert.alert('Erro', 'Por favor preencha todos os campos obrigatórios (Nome, Email, Senha, Grupo).');
      return;
    }

    if (enviarAnamnese === 'Sim' && !tipoAnamneseId) {
      Alert.alert('Erro', 'Por favor, selecione o tipo de questionário de anamnese.');
      return;
    }

    let userId = null; // Para armazenar o UID do utilizador criado
    try {
      const adminId = auth.currentUser.uid;

      // Tenta criar o utilizador no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      userId = userCredential.user.uid; // Obtém o UID do novo utilizador

      // Salva os detalhes do utilizador no Firestore
      const userData = {
        email,
        name: nome,
        role: 'user',
        telefoneCompleto: `${prefixoTelefone}${telefone}`,
        dataNascimento: dataNascimento ? formatDate(dataNascimento) : '',
        genero: genero,
        grupo: grupo,
        enviarAcesso: enviarAcesso,
        enviarAnamnese: enviarAnamnese,
        tipoAnamneseId: enviarAnamnese === 'Sim' ? tipoAnamneseId : null,
        adminId: adminId,
        criadoEm: new Date().toISOString(),
        passwordResetRequired: true, // <<< ADICIONE ESTA LINHA AQUI!
      };
      await setDoc(doc(db, 'users', userId), userData);
      // console.log('LOG User details loaded:', userData); // Este é o log que você vê

      // ... (sua lógica de envio de e-mail e navegação aqui) ...

    } catch (error) {
      console.error('ERRO (Frontend): Erro ao registar cliente no Firebase:', error); // NOVO LOG
      let errorMessage = 'Ocorreu um erro ao registar o cliente.';

      // Tratamento específico para o erro de email já em uso
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso por outra conta. Por favor, use um email diferente ou verifique se o cliente já está registado.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A senha é muito fraca. Use pelo menos 6 caracteres.';
      }

      Alert.alert('Erro no Registo', errorMessage);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Registar Novo Cliente</Text>

      {/* Nome Completo */}
      <Text style={styles.label}>Nome completo</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        value={nome}
        onChangeText={setNome}
      />

      {/* E-mail */}
      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Senha */}
      <Text style={styles.label}>Senha</Text>
      <TextInput
        style={styles.input}
        placeholder="Palavra-passe"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      {/* Selecione um grupo */}
      <Text style={styles.label}>Selecione um grupo</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={grupo}
          onValueChange={(itemValue) => setGrupo(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Selecione..." value={null} />
          <Picker.Item label="Online" value="Online" />
          <Picker.Item label="Presencial" value="Presencial" />
        </Picker>
      </View>

      {/* Data de nascimento */}
      <Text style={styles.label}>Data de nascimento</Text>
      <TouchableOpacity
        style={styles.dateInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: dataNascimento ? '#000' : '#888' }}>
          {dataNascimento ? formatDate(dataNascimento) : 'DD/MM/YYYY'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dataNascimento || new Date(2000, 0, 1)}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}

      {/* WhatsApp / Telefone */}
      <Text style={styles.label}>WhatsApp / Telefone</Text>
      <View style={styles.phoneInputContainer}>
        <View style={styles.countryCodePickerContainer}>
          <Picker
            selectedValue={prefixoTelefone}
            onValueChange={(itemValue) => setPrefixoTelefone(itemValue)}
            style={styles.countryCodePicker}
          >
            {countryCodes.map((country, index) => (
              <Picker.Item key={index} label={country.label} value={country.value} />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.phoneTextInput}
          placeholder="Número de telefone"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Gênero */}
      <Text style={styles.label}>Gênero</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={genero}
          onValueChange={(itemValue) => setGenero(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Selecione..." value={null} />
          <Picker.Item label="Masculino" value="Masculino" />
          <Picker.Item label="Feminino" value="Feminino" />
          <Picker.Item label="Outro" value="Outro" />
        </Picker>
      </View>

      {/* Enviar informações de acesso ao cliente */}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Enviar informações de acesso ao cliente</Text>
        <Switch
          onValueChange={setEnviarAcesso}
          value={enviarAcesso}
          trackColor={{ false: '#767577', true: '#d0a956' }}
          thumbColor={enviarAcesso ? '#f4f3f4' : '#f4f3f4'}
        />
      </View>

      {/* Enviar anamnese */}
      <Text style={styles.label}>Enviar anamnese</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={enviarAnamnese}
          onValueChange={(itemValue) => {
            setEnviarAnamnese(itemValue);
            if (itemValue === 'Não') {
              setTipoAnamneseId(null);
            }
          }}
          style={styles.picker}
        >
          <Picker.Item label="Selecione..." value={null} />
          <Picker.Item label="Sim" value="Sim" />
          <Picker.Item label="Não" value="Não" />
        </Picker>
      </View>

      {/* Tipo de Anamnese (visível apenas se enviarAnamnese for 'Sim') */}
      {enviarAnamnese === 'Sim' && (
        <>
          <Text style={styles.label}>Tipo de Questionário</Text>
          <View style={styles.pickerContainer}>
            {loadingQuestionarios ? (
              <View style={styles.loadingQuestionariosContainer}>
                <ActivityIndicator size="small" color="#d0a956" />
                <Text style={styles.loadingQuestionariosText}>Carregando questionários...</Text>
              </View>
            ) : (
              <Picker
                selectedValue={tipoAnamneseId}
                onValueChange={(itemValue) => setTipoAnamneseId(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Selecione..." value={null} />
                {availableQuestionarios.map((q) => (
                  <Picker.Item key={q.id} label={q.nome} value={q.id} />
                ))}
              </Picker>
            )}
          </View>
        </>
      )}

      {/* Botão Salvar */}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Salvar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#111827',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
    fontSize: 16,
    color: '#333',
  },
  dateInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
    justifyContent: 'center',
    height: 50,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  loadingQuestionariosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 10,
  },
  loadingQuestionariosText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  countryCodePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0a956',
    marginRight: 8,
    overflow: 'hidden',
    flex: 0.4,
  },
  countryCodePicker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  phoneTextInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0a956',
    flex: 0.6,
    fontSize: 16,
    color: '#333',
    height: 50,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d0a956',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});










const functions = getFunctions(app);
const enviarEmailBoasVindas = httpsCallable(functions, 'enviarEmailBoasVindas');

try {
  const result = await enviarEmailBoasVindas({
    email: email,
    password: senha,
    nome_cliente: nome,
    username: email,
    link_plataforma: 'https://risifit.com',
  });

  Alert.alert('Sucesso', 'Email de acesso enviado com sucesso!');
  console.log('Resposta Firebase:', result.data);
} catch (error) {
  Alert.alert('Erro ao enviar email', error.message);
  console.error('Erro Firebase:', error);
}