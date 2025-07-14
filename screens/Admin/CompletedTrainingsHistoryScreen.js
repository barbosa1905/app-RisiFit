// screens/Admin/CompletedTrainingsHistoryScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'; // Note: Não é collectionGroup aqui, é collection para historicoTreinos
import DateTimePicker from '@react-native-community/datetimepicker';

// Reintroduzindo a função formatarDuracao, pois será útil aqui
const formatarDuracao = (totalSegundos) => {
    if (typeof totalSegundos !== 'number' || isNaN(totalSegundos) || totalSegundos < 0) {
        return 'N/A';
    }
    const horas = Math.floor(totalSegundos / 3600);
    const min = Math.floor((totalSegundos % 3600) / 60);
    const seg = totalSegundos % 60;
    const pad = (num) => num.toString().padStart(2, '0');
    return `${pad(horas)}h ${pad(min)}m ${pad(seg)}s`;
};

const Colors = {
    primaryGold: '#D4AF37',
    darkBrown: '#3E2723',
    lightBrown: '#795548',
    creamBackground: '#FDF7E4',
    white: '#FFFFFF',
    lightGray: '#ECEFF1',
    mediumGray: '#B0BEC5',
    darkGray: '#424242',
    accentBlue: '#2196F3',
    successGreen: '#4CAF50',
    errorRed: '#F44336',
};

export default function CompletedTrainingsHistoryScreen({ navigation }) {
    const [completedTrainings, setCompletedTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para os filtros
    const [clientNameFilter, setClientNameFilter] = useState('');
    const [trainingNameFilter, setTrainingNameFilter] = useState('');
    const [startDateFilter, setStartDateFilter] = useState(null);
    const [endDateFilter, setEndDateFilter] = useState(null);

    // Estados para o DateTimePicker
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [currentPickerMode, setCurrentPickerMode] = useState('date'); // 'date' ou 'time'
    const [pickerFor, setPickerFor] = useState(null); // 'start' ou 'end'

    const fetchCompletedTrainings = async () => {
        setLoading(true);
        setError(null);
        try {
            // AQUI USAMOS A COLEÇÃO 'historicoTreinos' DIRETAMENTE, NÃO collectionGroup
            const historicoRef = collection(db, 'historicoTreinos');
            let q = query(historicoRef); // Inicia a query sem filtros iniciais além da coleção

            // Aplicar filtros de data (no Firebase)
            if (startDateFilter) {
                q = query(q, where('dataConclusao', '>=', startDateFilter));
            }
            if (endDateFilter) {
                // Para incluir o dia final inteiro, adicione 23:59:59.999
                const endOfDay = new Date(endDateFilter);
                endOfDay.setHours(23, 59, 59, 999);
                q = query(q, where('dataConclusao', '<=', endOfDay));
            }

            // A ordenação DEVE vir depois dos wheres, e se houver um 'where' em um campo
            // e 'orderBy' em outro, é necessário um índice composto no Firebase.
            // Para as datas, se usar range (>= e <=), é melhor ordenar pela data.
            q = query(q, orderBy('dataConclusao', 'desc'));

            const querySnapshot = await getDocs(q);
            const trainingsData = await Promise.all(querySnapshot.docs.map(async docSnap => {
                const data = docSnap.data();
                let clientName = 'Cliente Desconhecido';
                const currentUserId = data.userId; // O userId está diretamente no documento do histórico

                if (currentUserId) {
                    try {
                        const clientDocRef = doc(db, 'users', currentUserId);
                        const clientDocSnap = await getDoc(clientDocRef);
                        if (clientDocSnap.exists()) {
                            const client = clientDocSnap.data();
                            clientName = client.name || client.firstName || client.nome || 'Cliente sem nome';
                        }
                    } catch (e) {
                        console.error(`Erro ao buscar nome do cliente para treino ID ${docSnap.id}:`, e);
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    dataConclusao: data.dataConclusao ? data.dataConclusao.toDate() : null, // Converter Timestamp para Date
                    clientName: clientName,
                };
            }));

            // Filtragem em memória para nome do cliente e nome do treino (para flexibilidade com "contains")
            const filteredTrainings = trainingsData.filter(treino => {
                const matchesClient = clientNameFilter
                    ? treino.clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
                    : true;
                const matchesTraining = trainingNameFilter
                    ? (treino.nomeTreino || '').toLowerCase().includes(trainingNameFilter.toLowerCase()) // Garante que nomeTreino existe
                    : true;
                return matchesClient && matchesTraining;
            });

            setCompletedTrainings(filteredTrainings);
        } catch (err) {
            console.error("Erro ao buscar histórico de treinos concluídos:", err);
            setError(`Não foi possível carregar o histórico: ${err.message}.`);
            Alert.alert("Erro", `Não foi possível carregar o histórico de treinos: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompletedTrainings(); // Carrega inicialmente ao montar o componente
    }, []);

    const handleSearch = () => {
        fetchCompletedTrainings(); // Refaz a busca com os filtros atuais
    };

    const handleClearFilters = () => {
        setClientNameFilter('');
        setTrainingNameFilter('');
        setStartDateFilter(null);
        setEndDateFilter(null);
        // Chamar fetchCompletedTrainings para recarregar sem filtros
        fetchCompletedTrainings();
    };

    const onDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            if (pickerFor === 'start') {
                setShowStartDatePicker(false);
            } else if (pickerFor === 'end') {
                setShowEndDatePicker(false);
            }
        }

        if (selectedDate) {
            if (pickerFor === 'start') {
                setStartDateFilter(selectedDate);
            } else if (pickerFor === 'end') {
                setEndDateFilter(selectedDate);
            }
        }
    };

    const showPicker = (currentMode, forWhich) => {
        setCurrentPickerMode(currentMode);
        setPickerFor(forWhich);
        if (forWhich === 'start') {
            setShowStartDatePicker(true);
        } else {
            setShowEndDatePicker(true);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Histórico de Treinos Concluídos</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.filtersContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Filtrar por Nome do Cliente"
                        placeholderTextColor={Colors.mediumGray}
                        value={clientNameFilter}
                        onChangeText={setClientNameFilter}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Filtrar por Nome do Treino"
                        placeholderTextColor={Colors.mediumGray}
                        value={trainingNameFilter}
                        onChangeText={setTrainingNameFilter}
                    />

                    <View style={styles.datePickerRow}>
                        <TouchableOpacity onPress={() => showPicker('date', 'start')} style={styles.dateInputButton}>
                            <Ionicons name="calendar-outline" size={20} color={Colors.darkBrown} />
                            <Text style={styles.dateInputText}>
                                {startDateFilter ? startDateFilter.toLocaleDateString() : 'Data Início'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => showPicker('date', 'end')} style={styles.dateInputButton}>
                            <Ionicons name="calendar-outline" size={20} color={Colors.darkBrown} />
                            <Text style={styles.dateInputText}>
                                {endDateFilter ? endDateFilter.toLocaleDateString() : 'Data Fim'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDateFilter || new Date()}
                            mode={currentPickerMode}
                            display="default"
                            onChange={onDateChange}
                        />
                    )}
                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDateFilter || new Date()}
                            mode={currentPickerMode}
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    <View style={styles.filterButtonsContainer}>
                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                            <Ionicons name="search" size={20} color={Colors.white} />
                            <Text style={styles.searchButtonText}>Pesquisar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                            <Ionicons name="trash-outline" size={20} color={Colors.darkBrown} />
                            <Text style={styles.clearButtonText}>Limpar</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primaryGold} style={{ marginTop: 20 }} />
                ) : error ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : completedTrainings.length === 0 ? (
                    <Text style={styles.noDataText}>Nenhum treino concluído encontrado com os filtros aplicados.</Text>
                ) : (
                    <View style={styles.trainingsList}>
                        {completedTrainings.map((treino, index) => (
                            <View key={treino.id} style={styles.trainingCard}>
                                <Text style={styles.trainingCardTitle}>{treino.nomeTreino || 'Treino Concluído'}</Text>
                                <Text style={styles.trainingCardClient}>Cliente: {treino.clientName}</Text>
                                <Text style={styles.trainingCardDetail}>
                                    Data: {treino.dataConclusao ? treino.dataConclusao.toLocaleDateString() : 'N/A'}
                                </Text>
                                <Text style={styles.trainingCardDetail}>
                                    Duração: {formatarDuracao(treino.duracao)}
                                </Text>
                                {/* Adicione mais detalhes se desejar */}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.creamBackground,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryGold,
        paddingVertical: 15,
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 15,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    backButton: {
        marginRight: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.white,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 15,
    },
    filtersContainer: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    input: {
        height: 45,
        borderColor: Colors.lightGray,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        marginBottom: 10,
        fontSize: 16,
        color: Colors.darkBrown,
    },
    datePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateInputButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 8,
        width: '48%',
        justifyContent: 'center',
    },
    dateInputText: {
        marginLeft: 8,
        fontSize: 16,
        color: Colors.darkBrown,
    },
    filterButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
    },
    searchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primaryGold,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    searchButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    clearButtonText: {
        color: Colors.darkBrown,
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    trainingsList: {
        marginTop: 10,
    },
    trainingCard: {
        backgroundColor: Colors.white,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        shadowColor: Colors.darkBrown,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    trainingCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.darkBrown,
        marginBottom: 5,
    },
    trainingCardClient: {
        fontSize: 15,
        color: Colors.lightBrown,
        marginBottom: 3,
    },
    trainingCardDetail: {
        fontSize: 14,
        color: Colors.darkGray,
    },
    noDataText: {
        fontSize: 16,
        color: Colors.mediumGray,
        textAlign: 'center',
        marginTop: 30,
    },
    errorText: {
        fontSize: 16,
        color: Colors.errorRed,
        textAlign: 'center',
        marginTop: 30,
    },
});