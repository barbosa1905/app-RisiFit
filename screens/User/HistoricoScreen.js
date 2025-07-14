import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { format, parse, isValid, parseISO } from 'date-fns'; 
import { pt } from 'date-fns/locale'; 
import { enUS } from 'date-fns/locale'; 

// Importações do Firebase
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'; 
import { getUserIdLoggedIn } from '../../services/authService'; 

export default function HistoricoScreen() {
  const [historico, setHistorico] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  const formatDuration = (totalSegundos) => {
    if (typeof totalSegundos !== 'number' || isNaN(totalSegundos)) return 'N/A';
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;

    const pad = (num) => String(num).padStart(2, '0');

    return `${pad(horas)}:${pad(min)}:${pad(seg)}`;
  };

  // Função para parsear datas, agora com suporte a Firestore Timestamp
  const parseFlexibleDate = (dateValue) => {
    // Se for um objeto Timestamp do Firestore
    if (dateValue && typeof dateValue === 'object' && dateValue.seconds !== undefined && dateValue.nanoseconds !== undefined) {
        // Converte o Timestamp para um objeto Date JavaScript
        const date = new Date(dateValue.seconds * 1000 + dateValue.nanoseconds / 1000000);
        if (isValid(date)) {
            return date;
        }
    }

    // Se for uma string (para dados antigos ou se o formato de gravação mudar novamente)
    if (typeof dateValue === 'string') {
        // Tentar parsear como ISO string primeiro
        const isoParsed = parseISO(dateValue);
        if (isValid(isoParsed)) {
            return isoParsed;
        }

        // Tentar parsear o formato "Month Day, Year at HH:MM:SS AM/PM UTC+X" (inglês)
        let cleanedEnglishDateString = dateValue.replace(/ UTC[+-]\d+/g, '').replace(/ (AM|PM)/g, ' $1').trim();
        const englishFormatsToTry = [
            "MMMM dd, yyyy 'at' h:mm:ss a", 
            "MMMM dd, yyyy 'at' H:mm:ss",   
        ];
        for (let formatStr of englishFormatsToTry) {
            try {
                const parsedDate = parse(cleanedEnglishDateString, formatStr, new Date(), { locale: enUS });
                if (isValid(parsedDate)) {
                    return parsedDate;
                }
            } catch (e) { /* continue trying */ }
        }

        // Tentar parsear o formato português antigo
        let cleanedPortugueseDateString = dateValue.replace(/min/g, '').split(' UTC')[0].trim();
        const portugueseFormatsToTry = [
            "dd 'de' MMMM 'de' yyyy 'às' H'h'ss's'", 
            "dd 'de' MMMM 'de' yyyy 'às' H'h'mm's'", 
            "dd 'de' MMMM 'de' yyyy 'às' H'h'mm'min'ss's'", 
            "dd/MM/yyyy HH:mm:ss",          
        ];
        for (let formatStr of portugueseFormatsToTry) {
            try {
                const parsedDate = parse(cleanedPortugueseDateString, formatStr, new Date(), { locale: pt });
                if (isValid(parsedDate)) {
                    return parsedDate;
                }
            } catch (e) { /* continue trying */ }
        }
    }

    console.warn('Não foi possível parsear a data com nenhum formato:', dateValue);
    return null; 
  };

  useEffect(() => {
    const carregarHistoricoDoFirestore = async () => {
      setLoading(true);
      console.log('--- Iniciando carregamento do histórico do Firestore ---');
      try {
        const userIdFromAuth = await getUserIdLoggedIn(); 
        console.log('UserID obtido de getUserIdLoggedIn():', userIdFromAuth); 

        if (!userIdFromAuth) {
          console.warn('Usuário não autenticado. Não é possível carregar o histórico.');
          setLoading(false);
          return;
        }

        const db = getFirestore();

        const collectionName = 'historicoTreinos'; // Nome da coleção sem acento
        const historicoRef = collection(db, collectionName); 
        console.log('Caminho da coleção Firestore sendo usado:', historicoRef.path);
        
        const userIdFieldName = 'userId'; // Nome do campo do UserID em minúsculas
        
        const q = query(historicoRef, where(userIdFieldName, '==', userIdFromAuth)); 
        console.log(`Query Firestore criada: Coleção '${collectionName}', Campo '${userIdFieldName}' == '${userIdFromAuth}'`); 

        const querySnapshot = await getDocs(q);
        const treinosConcluidosArray = [];
        console.log('Número de documentos encontrados pela query:', querySnapshot.size);

        if (querySnapshot.empty) {
          console.log('Nenhum documento encontrado para o UserID de consulta especificado.');
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Dados brutos do documento Firestore (para ID:', doc.id, '):', data); 

          // Passa o objeto Timestamp diretamente para parseFlexibleDate
          const dataConclusaoParsed = parseFlexibleDate(data.dataConclusao);
          const dataOriginalTreinoParsed = parseFlexibleDate(data.dataOriginalTreino);
          
          if (dataConclusaoParsed && isValid(dataConclusaoParsed)) {
            treinosConcluidosArray.push({ 
              id: doc.id, 
              nome: data.nomeTreino || data.nome || 'Treino sem nome', 
              categoria: data.categoria || 'N/A', 
              descricao: data.descricao || 'Sem descrição', 
              exercicios: data.exercicios || [], 
              duracaoSegundos: data.duracao || data.duracaoSegundos || 0, // duracao é um número direto
              dataConclusao: dataConclusaoParsed.toISOString(), 
              dataOriginalTreino: dataOriginalTreinoParsed ? dataOriginalTreinoParsed.toISOString() : null, 
              userId: data[userIdFieldName], 
              treinoId: data.treinoId || data['ID do treino'], 
            });
          } else {
             console.warn("Documento de histórico ignorado (data inválida ou não parseável):", doc.id, data);
          }
        });

        treinosConcluidosArray.sort((a, b) => new Date(b.dataConclusao) - new Date(a.dataConclusao));

        setHistorico(treinosConcluidosArray);
        console.log('📥 Histórico carregado do Firestore com sucesso. Total de treinos processados e exibidos:', treinosConcluidosArray.length);
      } catch (error) {
        console.error('❌ Erro fatal ao carregar histórico do Firestore:', error);
        Alert.alert('Erro', 'Falha ao carregar histórico de treinos. Verifique a sua conexão ou tente novamente.');
      } finally {
        setLoading(false);
        console.log('--- Fim do carregamento do histórico do Firestore ---');
      }
    };

    carregarHistoricoDoFirestore();
  }, [appId]); 

  const treinosFiltrados = historico.filter((treino) => {
    if (!treino.dataConclusao || typeof treino.dataConclusao !== 'string') {
      return false;
    }
    const dataObj = parseISO(treino.dataConclusao); 

    const condicaoMes = !filtroMes || format(dataObj, 'yyyy-MM') === filtroMes;
    const condicaoCategoria =
      !filtroCategoria ||
      String(treino.categoria || '').toLowerCase() === filtroCategoria.toLowerCase();

    return condicaoMes && condicaoCategoria;
  });

  const somarDuracoes = (treinosArray) => {
    let totalSegundos = 0;
    treinosArray.forEach((treino) => {
      if (typeof treino.duracaoSegundos === 'number' && !isNaN(treino.duracaoSegundos)) {
        totalSegundos += treino.duracaoSegundos;
      }
    });
    return formatDuration(totalSegundos);
  };

  const totalTreinos = treinosFiltrados.length;
  const tempoTotal = somarDuracoes(treinosFiltrados);

  const mesesDisponiveis = [
    ...new Set(historico.map((treino) => format(parseISO(treino.dataConclusao), 'yyyy-MM'))),
  ].sort((a, b) => new Date(a) - new Date(b)); 

  const categoriasDisponiveis = [
    ...new Set(
      historico.map((treino) => treino.categoria).filter(Boolean)
    ),
  ].sort(); 

  const getCategoriaColor = (categoria) => {
    switch (String(categoria || '').toLowerCase()) {
      case 'força':
        return '#7c3aed';
      case 'cardio':
        return '#10b981';
      case 'flexibilidade':
        return '#f59e0b';
      case 'hiit':
        return '#ef4444';
      default:
        return '#d0a956';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Histórico de Treinos</Text>

      <View style={styles.estatisticasBox}>
        <View style={styles.estatisticaItem}>
          <Text style={styles.estatisticaIcon}>📅</Text>
          <Text style={styles.estatisticaTexto}>
            <Text style={styles.valor}>{totalTreinos}</Text> treinos concluídos
          </Text>
        </View>
        <View style={styles.estatisticaItem}>
          <Text style={styles.estatisticaIcon}>⏱️</Text>
          <Text style={styles.estatisticaTexto}>
            <Text style={styles.valor}>{tempoTotal}</Text> acumulado
          </Text>
        </View>
      </View>

      <View style={styles.filtrosContainer}>
        <View style={styles.filtroBox}>
          <Text style={styles.filtroLabel}>Mês:</Text>
          <Picker
            selectedValue={filtroMes}
            onValueChange={(value) => setFiltroMes(value)}
            style={styles.picker}
            dropdownIconColor="#d0a956"
          >
            <Picker.Item label="Todos" value="" />
            {mesesDisponiveis.map((mes) => (
              <Picker.Item
                key={mes}
                label={format(parseISO(mes + '-01'), 'MMMM yyyy', { locale: pt })} 
                value={mes}
              />
            ))}
          </Picker>
        </View>

        <View style={styles.filtroBox}>
          <Text style={styles.filtroLabel}>Categoria:</Text>
          <Picker
            selectedValue={filtroCategoria}
            onValueChange={(value) => setFiltroCategoria(value)}
            style={styles.picker}
            dropdownIconColor="#d0a956"
          >
            <Picker.Item label="Todas" value="" />
            {categoriasDisponiveis.map((cat) => (
              <Picker.Item key={cat} label={cat} value={cat} />
            ))}
          </Picker>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#d0a956" style={{ marginTop: 20 }} />}

      {!loading && treinosFiltrados.length === 0 && (
        <Text style={styles.semDados}>
          Nenhum treino encontrado com os filtros selecionados.
        </Text>
      )}

      {!loading &&
        treinosFiltrados.map((treino) => {
          const corCategoria = getCategoriaColor(treino.categoria);
          return (
            <View
              key={treino.id} 
              style={[styles.card, { borderLeftColor: corCategoria }]}
            >
              <Text style={styles.data}>{format(parseISO(treino.dataConclusao), 'dd/MM/yyyy HH:mm')}</Text>
              <Text style={styles.nome}>{String(treino.nome || treino.nomeTreino)}</Text> 
              <Text style={styles.categoria}>
                Categoria: {String(treino.categoria || 'N/A')}
              </Text>
              <Text style={styles.descricao}>{String(treino.descricao || 'Sem descrição')}</Text>
              <Text style={styles.duracao}>Duração: {formatDuration(treino.duracaoSegundos)}</Text> 

              {Array.isArray(treino.exercicios) && treino.exercicios.length > 0 && (
                <>
                  <Text style={styles.exerciciosTitulo}>Exercícios:</Text>
                  {treino.exercicios.map((ex, idx) => (
                    <Text key={idx} style={styles.exercicio}>
                      • {String(ex.nome)} — {ex.tipo === 'reps' ? 'Repetições' : 'Tempo'}: {String(ex.valor)}
                    </Text>
                  ))}
                </>
              )}
            </View>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9fafb',
    minHeight: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#d0a956',
    marginBottom: 20,
    textAlign: 'center',
  },
  estatisticasBox: {
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: '#f2d88f',
    borderWidth: 1,
  },
  estatisticaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  estatisticaIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  estatisticaTexto: {
    fontSize: 16,
    color: '#735c00',
  },
  valor: {
    fontWeight: 'bold',
    color: '#3f2e00',
  },
  filtrosContainer: {
    marginBottom: 20,
  },
  filtroBox: {
    marginBottom: 12,
  },
  filtroLabel: {
    fontWeight: '600',
    color: '#735c00',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 8,
    color: '#735c00',
  },
  semDados: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  data: {
    fontSize: 14,
    color: '#d0a956',
    marginBottom: 2,
  },
  nome: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4b3e00',
    marginBottom: 4,
  },
  categoria: {
    fontSize: 14,
    color: '#a38600',
    marginBottom: 4,
  },
  descricao: {
    fontSize: 14,
    color: '#7a6a00',
    marginBottom: 6,
  },
  duracao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b77900',
    marginBottom: 6,
  },
  exerciciosTitulo: {
    fontWeight: '600',
    color: '#5f4b00',
    marginTop: 6,
    marginBottom: 4,
  },
  exercicio: {
    marginLeft: 10,
    color: '#7a6a00',
    fontSize: 13,
    marginBottom: 2,
  },
});
