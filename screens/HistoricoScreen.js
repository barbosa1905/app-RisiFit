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
  'Agachamento',
  'Flexão de braço',
  'Puxada frontal',
  'Elevação lateral',
  'Abdominal',
  'Corrida',
  'Burpee',
  'Prancha',
  'Levantamento terra',
  'Remada curvada',
  'Jumping jacks',
  'Bicicleta no ar',
  'Saltos pliométricos',
  'Rosca direta',
  'Tríceps testa',
  'Afundo',
  'Stiff',
  'Superman',
  'Mountain climber',
  'Corda naval',
  'Elevação de pernas',
  'Cadeira romana',
  'Prancha lateral',
  'Agachamento sumô',
  'Ponte glúteos',
  'Flexão diamante',
  'Remada baixa',
  'Flexão militar',
  'Saltos em caixa',
  'Abdominal bicicleta',
  'Kettlebell swing',
  'Pular corda',
  'Escalada de montanha',
  'Saltos laterais',
  'Flexão em T',
  'Agachamento com salto',
  'Abdominal infra',
  'Rosca martelo',
  'Tríceps mergulho',
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

  const [modalTreinosDoDiaVisible, setModalTreinosDoDiaVisible] = useState(false);
  const [treinosDoDia, setTreinosDoDia] = useState([]);
  const [modalAdicionarExercicioVisible, setModalAdicionarExercicioVisible] = useState(false);

  const [modalListaExerciciosVisible, setModalListaExerciciosVisible] = useState(false);
  const [exercicioSelecionadoIndex, setExercicioSelecionadoIndex] = useState(null);
  const [novoExercicioNome, setNovoExercicioNome] = useState('');

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
          backgroundColor: '#4f46e5',
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

    const dataISO = dataHora.toISOString();

    try {
      await criarTreinoParaCliente({
        idCliente: clienteSelecionado.id,
        nome,
        descricao,
        data: dataISO,
        categoria,
        exercicios,
      });
      Alert.alert('Sucesso', 'Treino criado com sucesso.');
      limparFormulario();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar treino.');
      console.error(error);
    }
  };

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

  return (
    <View style={styles.container}>
      {/* Cliente */}
      <TouchableOpacity
        style={styles.botaoCliente}
        onPress={() => setModalClientesVisible(true)}
      >
        <Text style={styles.botaoClienteTexto}>
          {clienteSelecionado ? obterNomeCliente(clienteSelecionado) : 'Selecionar Cliente'}
        </Text>
      </TouchableOpacity>

      {/* Modal Seleção Cliente */}
      <Modal visible={modalClientesVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Cliente</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {clientes.map((cliente) => (
                <TouchableOpacity
                  key={cliente.id}
                  style={styles.itemLista}
                  onPress={() => {
                    setClienteSelecionado(cliente);
                    setModalClientesVisible(false);
                  }}
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

      {/* Inputs do formulário */}
      <TextInput
        placeholder="Nome do treino"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />
      <TextInput
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        style={styles.input}
      />

      {/* Calendário */}
      <Calendar
        onDayPress={(day) => setDataSelecionada(day.dateString)}
        markedDates={{
          ...markedDates,
          ...(dataSelecionada ? { [dataSelecionada]: { selected: true, selectedColor: '#4f46e5' } } : {}),
        }}
      />

      {/* Hora */}
      <TouchableOpacity
        style={styles.botaoSelecionarHora}
        onPress={() => setMostrarPickerHora(true)}
      >
        <Text style={{ color: '#4f46e5' }}>
          {horaSelecionada
            ? horaSelecionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Selecionar hora'}
        </Text>
      </TouchableOpacity>

      {mostrarPickerHora && (
        <DateTimePicker
          value={horaSelecionada || new Date()}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setMostrarPickerHora(Platform.OS === 'ios');
            if (date) setHoraSelecionada(date);
          }}
        />
      )}

      {/* Categoria */}
      <View style={styles.categoriasContainer}>
        {categorias.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoriaBotao,
              categoria === cat && styles.categoriaSelecionada,
            ]}
            onPress={() => setCategoria(cat)}
          >
            <Text style={categoria === cat ? styles.categoriaTextoSelecionada : null}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exercícios */}
      <View style={{ marginVertical: 10 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Exercícios:</Text>
        {exercicios.map((exercicio, idx) => (
          <View key={idx} style={styles.exercicioContainer}>
            <TouchableOpacity
              style={styles.exercicioNomeContainer}
              onPress={() => {
                setExercicioSelecionadoIndex(idx);
                setModalListaExerciciosVisible(true);
                setFiltroExercicios('');
                setNovoExercicioNome('');
              }}

            >
              <Text style={styles.exercicioNomeTexto}>
                {exercicio.nome || 'Selecionar exercício'}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 5 }]}
              keyboardType="numeric"
              placeholder={exercicio.tipo === 'reps' ? 'Repetições' : 'Duração'}
              value={exercicio.valor}
              onChangeText={(text) => atualizarExercicio(idx, 'valor', text)}
            />
            <TouchableOpacity
              style={styles.botaoRemoverExercicio}
              onPress={() => removerExercicio(idx)}
            >
              <Text style={{ color: 'red' }}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.adicionarExercicioButton}
          onPress={adicionarExercicio}
        >
          <Text style={{ color: '#4f46e5', fontWeight: '600' }}>+ Adicionar exercício</Text>
        </TouchableOpacity>
      </View>

      {/* Botão criar treino */}
      <TouchableOpacity style={styles.botaoCriarTreino} onPress={handleCriarTreino}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Criar Treino</Text>
      </TouchableOpacity>

      {/* Modal lista de exercícios */}
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
                setListaExerciciosEstado((prev) => [...prev, nomeNovo]);
                selecionarExercicioDaLista(nomeNovo);
                setNovoExercicioNome('');
                setFiltroExercicios('');
              }}
            >
              <Text style={{ color: '#4f46e5', fontWeight: '600', textAlign: 'center' }}>
                + Adicionar novo exercício
              </Text>
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 300, marginTop: 10 }}>
              {(listaExerciciosEstado.filter((exercicio) =>
                exercicio.toLowerCase().includes(filtroExercicios.toLowerCase())
              )).map((exercicio, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.itemLista}
                  onPress={() => {
                    selecionarExercicioDaLista(exercicio);
                    setFiltroExercicios('');
                  }}
                >
                  <Text>{exercicio}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setModalListaExerciciosVisible(false);
                setFiltroExercicios('');
              }}
            >
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  botaoCliente: {
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  botaoClienteTexto: {
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  categoriasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  categoriaBotao: {
    borderColor: '#4f46e5',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  categoriaSelecionada: {
    backgroundColor: '#4f46e5',
  },
  categoriaTextoSelecionada: {
    color: 'white',
    fontWeight: '700',
  },
  botaoSelecionarHora: {
    padding: 10,
    borderColor: '#4f46e5',
    borderWidth: 1,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: 'center',
  },
  exercicioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  exercicioNomeContainer: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 8,
    marginRight: 5,
  },
  exercicioNomeTexto: {
    color: '#000',
  },
  botaoRemoverExercicio: {
    padding: 8,
  },
  adicionarExercicioButton: {
    marginTop: 5,
    alignItems: 'center',
  },
  botaoCriarTreino: {
    backgroundColor: '#4f46e5',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  itemLista: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalCloseButton: {
    marginTop: 15,
    backgroundColor: '#4f46e5',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  adicionarExercicioButtonModal: {
    borderColor: '#4f46e5',
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});
