import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import {
  buscarClientes,
  criarTreinoParaCliente,
  buscarTodosTreinosComNomes,
} from '../../services/adminService';
import { Calendar } from 'react-native-calendars';
import DateTimePicker from '@react-native-community/datetimepicker';
import { obterNomeCliente } from '../../utils/clienteUtils';

const categorias = ['Cardio', 'Força', 'Mobilidade', 'Core'];

const listaExercicios = [
 'Abdução de pernas na máquina (sentado ou em pé)',
'Abdominais crunch',
'Abdominais crunch invertido',
'Abdominais com bola suíça',
'Abdominais na máquina',
'Abdominais na polia alta (joelhos no chão)',
'Ab wheel (roda abdominal)',
'Agachamento búlgaro',
'Agachamento com barra',
'Agachamento com halteres',
'Agachamento com kettlebell (goblet squat)',
'Agachamento frontal',
'Agachamento hack (máquina)',
'Agachamento no Smith',
'Agachamento sumô com halteres ou barra',
'Avanço com halteres',
'Avanço no Smith',
'Barra fixa (pull-up)',
'Barra fixa com pegada supinada (chin-up)',
'Barra guiada (Smith machine)',
'Battle ropes (cordas ondulatórias)',
'Bicicleta ergométrica',
'Bíceps alternado com halteres',
'Bíceps com barra reta ou W',
'Bíceps concentrado',
'Bíceps na máquina Scott',
'Bíceps na polia baixa',
'Bíceps rosca martelo',
'Bíceps rosca direta',
'Box jump (salto à caixa)',
'Burpees',
'Cadeira abdutora',
'Cadeira adutora',
'Cadeira extensora',
'Cadeira flexora (deitado ou sentado)',
'Caminhada inclinada na passadeira',
'Caminhada na esteira',
'Clean com barra ou halteres',
'Climber (escalador)',
'Corrida ao ar livre',
'Corrida na passadeira',
'Corda naval',
'Corda para pular',
'Crucifixo com halteres (reto ou inclinado)',
'Crucifixo invertido (posterior de ombro)',
'Crucifixo na máquina peck deck',
'Cross over na polia',
'Cross trainer (elíptica)',
'Crunch oblíquo',
'Deadlift (levantamento terra tradicional)',
'Deadlift romeno (stiff)',
'Deadlift sumô',
'Desenvolvimento com barra',
'Desenvolvimento com halteres (ombros)',
'Desenvolvimento na máquina',
'Dumbbell press (ombros ou peito)',
'Dumbbell snatch (arranco com halteres)',
'Dumbbell swing',
'Elevação de panturrilhas em pé',
'Elevação de panturrilhas sentado',
'Elevação de pernas (no solo ou paralelas)',
'Elevação de pernas suspenso',
'Elevação frontal com halteres',
'Elevação lateral com halteres',
'Escalador (mountain climber)',
'Escalador vertical (máquina)',
'Escapulamento na polia (scapula pull)',
'Face pull na polia (ombros e costas)',
'Farmer’s walk (caminhada com halteres ou kettlebells)',
'Flexão de braços com joelhos no chão',
'Flexão de braços inclinada',
'Flexão de braços tradicional',
'Flexora deitada (máquina)',
'Flexora sentada',
'Fly peitoral com cabos',
'Fly peitoral com halteres',
'Front squat (agachamento frontal)',
'Gêmeos na leg press',
'Gêmeos na máquina em pé',
'Gêmeos na máquina sentado',
'Glúteo na máquina',
'Glúteo na polia',
'Glute bridge (elevação de quadril)',
'Glute bridge com barra (hip thrust)',
'Goblet squat',
'Good morning (com barra ou halteres)',
'Hack squat (máquina)',
'Hammer curl (rosca martelo)',
'High knees (corrida no lugar com joelhos altos)',
'Hip thrust com barra',
'Hiperextensão lombar (banco 45º ou solo)',
'Hollow hold (abdominal isométrico)',
'Incline bench press (supino inclinado com barra ou halteres)',
'Incline curl (rosca bíceps em banco inclinado)',
'Isometria abdominal',
'Isometria de prancha',
'Jump lunge (avanço com salto)',
'Jump squat',
'Jumping jacks',
'Landmine press (barra presa de um lado)',
'Lateral raise (elevação lateral)',
'Leg curl sentado',
'Leg press 45º',
'Leg press horizontal',
'L-sit (paralela ou chão)',
'Lunge com barra',
'Lunge frontal',
'Lunge lateral',
'Lunge reverso',
'Máquina adutora/abdutora',
'Máquina de bíceps/tríceps',
'Máquina de glúteo',
'Máquina de remada baixa',
'Máquina de remada unilateral',
'Mountain climbers',
'Natação (cardio funcional)',
'Neutral grip pull-up (barra fixa com pegada neutra)',
'Nórdicos (nordic hamstring curl – posterior de coxa)',
'Panturrilha na leg press',
'Paralelas (dips)',
'Passada com halteres',
'Pêndulo (swings com kettlebell)',
'Peck deck',
'Planche hold (avançado)',
'Pliometria (caixa, saltos)',
'Prancha abdominal',
'Prancha lateral',
'Pull-over com halteres',
'Pull-up (barra fixa)',
'Pulley frente (puxada na polia)',
'Push press (com barra ou halteres)',
'Quadríceps na extensora',
'Quadrupede diagonal (abdominal funcional)',
'Remada alta na polia',
'Remada baixa na polia',
'Remada cavalinho (T-bar row)',
'Remada com halteres unilateral',
'Remada curvada com barra',
'Remada no TRX',
'Remo na máquina',
'Rosca 21',
'Rosca concentrada',
'Rosca direta',
'Rosca martelo',
'Shoulder press com halteres ou barra',
'Shoulder shrug (encolhimento de ombros)',
'Smith machine (exercícios guiados)',
'Sprints (corrida curta e rápida)',
'Squat jump',
'Step-up com halteres',
'Stiff com barra',
'Stiff com halteres',
'Supino declinado',
'Supino inclinado com barra',
'Supino inclinado com halteres',
'Supino na máquina',
'Supino reto com barra',
'Supino reto com halteres',
'Swing com kettlebell',
'T-Bar row (remada cavalinho)',
'TRX push-up',
'TRX row (remada no TRX)',
'TRX Y-fly',
'Treino intervalado HIIT',
'Tríceps mergulho em banco (bench dips)',
'Tríceps na máquina',
'Tríceps na polia (barra ou corda)',
'Tríceps testa com barra ou halteres',
'Underhand row (remada com pegada supinada)',
'Upright row (remada alta)',
'V-sit abdominal',
'Voador inverso (posterior de ombro)',
'Voador peitoral',
'Walking lunge (passada andando)',
'Wall ball (bola contra parede)',
'Wall sit (isometria de pernas)',
'Weight plate front raise (com anilha)',
'Windshield wipers (abdominais oblíquos avançados)',
];

export default function CriarTreinosScreen() {
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [modalClientesVisible, setModalClientesVisible] = useState(false);
  const [listaExerciciosEstado, setListaExerciciosEstado] = useState(listaExercicios);
 const [filtroExercicios, setFiltroExercicios] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState(null);
  const [mostrarPickerHora, setMostrarPickerHora] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [exercicios, setExercicios] = useState([]);

  const [treinos, setTreinos] = useState([]);

  // Modal para mostrar treinos do dia
  const [modalTreinosDoDiaVisible, setModalTreinosDoDiaVisible] = useState(false);
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [modalAdicionarExercicioVisible, setModalAdicionarExercicioVisible] = useState(false);
  const [novoExercicioNome, setNovoExercicioNome] = useState('');

  // Modal para seleção de exercício na lista
  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  // Armazena o índice do exercício que está sendo editado para seleção
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);

  useEffect(() => {
    async function carregarClientesETreinos() {
      try {
        const listaClientes = await buscarClientes();
        setClientes(listaClientes);

        const listaTreinos = await buscarTodosTreinosComNomes();
        setTreinos(listaTreinos);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    }
    carregarClientesETreinos();
  }, []);

  const marcarDatas = () => {
  const marcacoes = {};

  treinos.forEach((treino) => {
    if (typeof treino.data === 'string' && treino.data.includes('T')) {
      const data = treino.data.split('T')[0];

      if (!marcacoes[data]) {
        marcacoes[data] = {
          marked: true,
          dots: [{ key: 'treino', color: '#4f46e5' }],
          treinoCount: 1,
        };
      } else {
        marcacoes[data].treinoCount += 1;
      }
    }
  });

  Object.keys(marcacoes).forEach((date) => {
    marcacoes[date].customStyles = {
      container: {
        backgroundColor: '#fff8e1',
        borderRadius: 10,
      },
      text: {
        color: 'white',
        fontWeight: '700',
      },
    };
  });

  return marcacoes;
};

  const markedDates = marcarDatas();

  const adicionarExercicio = () => {
    setExercicios((prev) => [...prev, { nome: '', tipo: 'reps', valor: '' }]);
  };

  const atualizarExercicio = (index, campo, valor) => {
    const novos = [...exercicios];
    novos[index][campo] = valor;
    setExercicios(novos);
  };

  const removerExercicio = (index) => {
    const novos = [...exercicios];
    novos.splice(index, 1);
    setExercicios(novos);
  };

  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setDataSelecionada('');
    setHoraSelecionada(null);
    setCategoria('');
    setClienteSelecionado(null);
    setExercicios([]);
  };

  const handleCriarTreino = async () => {
    if (
      !clienteSelecionado ||
      !nome ||
      !descricao ||
      !dataSelecionada ||
      !horaSelecionada ||
      !categoria ||
      exercicios.length === 0 ||
      exercicios.some((e) => !e.nome || !e.valor)
    ) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos corretamente.');
      return;
    }

    const [year, month, day] = dataSelecionada.split('-').map(Number);
    const dataHora = new Date(
      year,
      month - 1,
      day,
      horaSelecionada.getHours(),
      horaSelecionada.getMinutes()
    );

    try {
      await criarTreinoParaCliente({
        userId: clienteSelecionado.id,
        nome,
        descricao,
        data: dataHora.toISOString(),
        categoria,
        criadoEm: new Date(),
        exercicios,
      });

      const selecionarExercicioDaLista = (nomeExercicio) => {
    if (exercicioSelecionadoIndex === null) return;

    const novos = [...exercicios];
    novos[exercicioSelecionadoIndex] = { nome: nomeExercicio, tipo: 'reps', valor: '' };
    setExercicios(novos);
    setModalListaExerciciosVisible(false);
    setExercicioSelecionadoIndex(null);
    setFiltroExercicios('');
    setNovoExercicioNome('');
  };

      Alert.alert('✅ Treino criado com sucesso!');

      const listaTreinosAtualizada = await buscarTodosTreinosComNomes();
      setTreinos(listaTreinosAtualizada);

      limparFormulario();

      setModalTreinosDoDiaVisible(false);
      setDataSelecionada(''); // Voltar para só calendário após criar treino
    } catch (error) {
      console.error('Erro ao criar treino:', error);
      Alert.alert('Erro ao criar treino. Tente novamente.');
    }
  };

  const onChangeHora = (event, selectedTime) => {
    setMostrarPickerHora(Platform.OS === 'ios');
    if (selectedTime) {
      setHoraSelecionada(selectedTime);
    }
  };

  const selecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setModalClientesVisible(false);
  };

  const abrirModalTreinosDoDia = (data) => {
    setDataSelecionada(data);
    setHoraSelecionada(null);
    // Filtra os treinos do dia clicado
    const treinosFiltrados = treinos.filter(
      (t) => t.data.split('T')[0] === data
    );
    setTreinosDoDia(treinosFiltrados);
    setModalTreinosDoDiaVisible(true);
  };

  const abrirFormularioCriarTreino = () => {
    setModalTreinosDoDiaVisible(false);
    limparFormulario();
  };

  // Abre o modal para selecionar exercício na lista para o exercício do índice passado
  const abrirModalSelecionarExercicio = (index) => {
    setExercicioSelecionadoIndex(index);
    setModalListaExerciciosVisible(true);
  };

  // Quando um exercício for selecionado na lista, atualiza o nome no estado
  const selecionarExercicioDaLista = (nomeExercicio) => {
    if (exercicioSelecionadoIndex === null) return;
    atualizarExercicio(exercicioSelecionadoIndex, 'nome', nomeExercicio);
    setModalListaExerciciosVisible(false);
    setExercicioSelecionadoIndex(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Treino</Text>

      <Text style={styles.label}>Selecionar Data:</Text>
      <Calendar
        onDayPress={(day) => {
          // Só seta a data selecionada e fecha modal, não abre modal treinos do dia
          setDataSelecionada(day.dateString);
          setModalTreinosDoDiaVisible(false);
        }}
        markedDates={{
          ...markedDates,
          ...(dataSelecionada
            ? {
                [dataSelecionada]: {
                  selected: true,
                  selectedColor: '#d0a956',
                },
              }
            : {}),
        }}
        theme={{
          selectedDayBackgroundColor: '#d0a956',
          todayTextColor: '#4f46e5',
          arrowColor: '#4f46e5',
          textDayFontWeight: '600',
          textMonthFontWeight: '700',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
        }}
        style={styles.calendar}
      />

      {/* Botão para voltar ao calendário (limpa a data selecionada) */}
      {dataSelecionada !== '' && (
        <TouchableOpacity
          onPress={() => setDataSelecionada('')}
          style={styles.botaoVoltar}
        >
          <Text style={styles.textoBotaoVoltar}>← Voltar ao calendário</Text>
        </TouchableOpacity>
      )}

      {/* Formulário de criação aparece apenas quando há uma data selecionada */}
      {dataSelecionada !== '' && (
        <>
          <Text style={styles.label}>Cliente:</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setModalClientesVisible(true)}
          >
            <Text>
              {clienteSelecionado
                ? obterNomeCliente(clienteSelecionado)
                : 'Selecionar cliente'}
            </Text>
          </TouchableOpacity>

          {/* Modal seleção cliente */}
          <Modal
            visible={modalClientesVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setModalClientesVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                <Text style={styles.modalTitle}>Selecionar Cliente</Text>
                <ScrollView>
                  {clientes.map((cliente, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.itemLista}
                      onPress={() => selecionarCliente(cliente)}
                    >
                      <Text>{obterNomeCliente(cliente)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setModalClientesVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={styles.label}>Nome do Treino:</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome do treino"
          />

          <Text style={styles.label}>Descrição:</Text>
          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Descrição do treino"
            multiline
          />

          <Text style={styles.label}>Hora:</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setMostrarPickerHora(true)}
          >
            <Text>
              {horaSelecionada
                ? horaSelecionada.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Selecionar hora'}
            </Text>
          </TouchableOpacity>
          {mostrarPickerHora && (
            <DateTimePicker
              value={horaSelecionada || new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onChangeHora}
            />
          )}

          <Text style={styles.label}>Categoria:</Text>
          <View style={styles.categoriasContainer}>
            {categorias.map((cat) => {
              const selecionada = categoria === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoriaButton,
                    selecionada && styles.categoriaButtonSelected,
                  ]}
                  onPress={() => setCategoria(cat)}
                >
                  <Text
                    style={[
                      styles.categoriaButtonText,
                      selecionada && styles.categoriaButtonTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 15 }]}>Exercícios:</Text>
          {exercicios.map((exercicio, idx) => (
            <View key={idx} style={styles.exercicioContainer}>
              <Text style={styles.label}>Nome do exercício:</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => abrirModalSelecionarExercicio(idx)}
              >

                
                <Text>{exercicio.nome || 'Selecionar exercício'}</Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.tipoButton,
                    exercicio.tipo === 'reps' && styles.tipoButtonSelected,
                  ]}
                  onPress={() => atualizarExercicio(idx, 'tipo', 'reps')}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      exercicio.tipo === 'reps' && styles.tipoButtonTextSelected,
                    ]}
                  >
                    Repetições
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tipoButton,
                    exercicio.tipo === 'tempo' && styles.tipoButtonSelected,
                  ]}
                  onPress={() => atualizarExercicio(idx, 'tipo', 'tempo')}
                >
                  <Text
                    style={[
                      styles.tipoButtonText,
                      exercicio.tipo === 'tempo' && styles.tipoButtonTextSelected,
                    ]}
                  >
                    Tempo (s)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                {exercicio.tipo === 'reps' ? 'Quantidade de repetições:' : 'Tempo em segundos:'}
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={exercicio.valor}
                onChangeText={(text) => atualizarExercicio(idx, 'valor', text)}
                placeholder={exercicio.tipo === 'reps' ? 'Ex: 10' : 'Ex: 30'}
              />

              <TouchableOpacity
                style={styles.removerExercicioButton}
                onPress={() => removerExercicio(idx)}
              >
                <Text style={{ color: 'red' }}>Remover exercício</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.adicionarExercicioButton}
            onPress={adicionarExercicio}
          >
            
            <Text style={{ color: '#d0a956', fontWeight: '600' }}>
              + Adicionar exercício
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botaoCriar} onPress={handleCriarTreino}>
            <Text style={styles.textoBotaoCriar}>Criar Treino</Text>
          </TouchableOpacity>
        </>
      )}

     {/* Modal lista de exercícios para seleção */}
<Modal
  visible={modalListaExerciciosVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setModalListaExerciciosVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
      <Text style={styles.modalTitle}>Selecionar Exercício</Text>



{/* Barra de pesquisa */}
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="Buscar exercício"
              value={filtroExercicios}
              onChangeText={setFiltroExercicios}
            />



      <TextInput
        style={[styles.input, { marginBottom: 10 }]}
        placeholder="Adicionar novo exercício"
        value={novoExercicioNome}
        onChangeText={setNovoExercicioNome}
      />

      <TouchableOpacity
        style={styles.adicionarExercicioButtonModal}
        onPress={() => {
          const nomeNovo = novoExercicioNome.trim();
          if (!nomeNovo) {
            Alert.alert('Nome inválido', 'Digite um nome válido para o exercício.');
            return;
          }
          if (listaExerciciosEstado.includes(nomeNovo)) {
            Alert.alert('Já existe', 'Esse exercício já está na lista.');
            return;
          }
          // Adiciona o novo exercício na lista
          setListaExerciciosEstado((prev) => [...prev, nomeNovo]);
          // Seleciona o novo exercício para o item atual
          selecionarExercicioDaLista(nomeNovo);
          setNovoExercicioNome('');
        }}
      >
        <Text style={{ color: '#d0a956', fontWeight: '600', textAlign: 'center' }}>
          + Adicionar novo exercício
        </Text>
      </TouchableOpacity>

      <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
      {listaExerciciosEstado
  .filter((exercicio) =>
    exercicio.toLowerCase().includes(filtroExercicios.toLowerCase())
  )
  .map((exercicio, idx) => (
    <TouchableOpacity
      key={idx}
      style={styles.itemLista}
      onPress={() => selecionarExercicioDaLista(exercicio)}
    >
      <Text>{exercicio}</Text>
    </TouchableOpacity>
))}

      </ScrollView>

      <TouchableOpacity
        style={styles.modalCloseButton}
        onPress={() => setModalListaExerciciosVisible(false)}
      >
        <Text style={styles.modalCloseButtonText}>Fechar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#fff8e1',
    flexGrow: 1,
  },
  adicionarExercicioButtonModal: {
  paddingVertical: 10,
  backgroundColor: '#0000',
  borderRadius: 8,
  marginBottom: 10,
},
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    color: '#d0a956',
  },
  label: {
    fontWeight: '600',
    marginTop: 10,
    color: '#000',
  },
  calendar: {
    borderRadius: 10,
    marginBottom: 10,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 5,
    padding: 10,
    marginTop: 6,
    backgroundColor: 'white',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0a956',
    borderRadius: 5,
    padding: 10,
    marginTop: 6,
    backgroundColor: 'white',
  },
  categoriasContainer: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  categoriaButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoriaButtonSelected: {
    backgroundColor: '#d0a956',
  },
  categoriaButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  categoriaButtonTextSelected: {
    color: 'white',
  },
  exercicioContainer: {
    marginTop: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
  },
  tipoButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 5,
    paddingVertical: 6,
    marginRight: 6,
    alignItems: 'center',
  },
  tipoButtonSelected: {
    backgroundColor: '#d0a956',
  },
  tipoButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  tipoButtonTextSelected: {
    color: 'white',
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  removerExercicioButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  adicionarExercicioButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  botaoCriar: {
    marginTop: 25,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotaoCriar: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  botaoVoltar: {
    marginVertical: 8,
  },
  textoBotaoVoltar: {
    color: '#000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    padding: 15,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
  },
  itemLista: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#d0a956',
  },
  modalCloseButton: {
    marginTop: 15,
    alignSelf: 'center',
  },
  modalCloseButtonText: {
    color: '#d0a956',
    fontWeight: '600',
  },
});
