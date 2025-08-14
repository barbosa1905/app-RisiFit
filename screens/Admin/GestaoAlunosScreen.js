import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Modal, StyleSheet, TextInput,
    Alert, ScrollView, ActivityIndicator, Switch, Platform,
    SafeAreaView, StatusBar, Image,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { db } from '../../services/firebaseConfig';
import {
    collection, doc, setDoc, getDoc, onSnapshot, updateDoc,
} from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getAuth } from 'firebase/auth';

// Paleta de Cores Refinada (adaptada para o estilo das imagens fornecidas)
const Colors = {
    // Cores principais do tema (inspiradas no dourado/mostarda e marrom)
    primaryGold: '#B8860B', // Dourado mais clássico e vibrante
    darkBrown: '#3E2723',   // Marrom bem escuro para textos e ícones principais
    lightBrown: '#795548',  // Marrom mais suave para detalhes e placeholders
    creamBackground: '#FDF7E4', // Fundo creme claro para a maioria da tela

    // Cores neutras e de feedback
    white: '#FFFFFF',
    lightGray: '#ECEFF1',   // Cinza muito claro para fundos secundários
    mediumGray: '#B0BEC5',   // Cinza médio para textos secundários e bordas inativas
    darkGray: '#424242',    // Cinza escuro para textos principais
    accentBlue: '#2196F3',   // Azul vibrante para links/destaques (ex: treino completo)
    successGreen: '#4CAF50', // Verde para sucesso
    errorRed: '#EF5350',    // Vermelho para erros/alertes (urgente)

    // Cores específicas de componentes
    headerBackground: '#B8860B', // Fundo do header, igual ao primaryGold
    headerText: '#000000',    // Texto e ícones do header
    tabBarBackground: '#FDF7E4', // Fundo da tab bar
    tabBarIconActive: '#D4AF37', // Ícone ativo da tab bar
    tabBarIconInactive: '#8D8D8D', // Ícone inativo da tab bar
    tabBarTextActive: '#D4AF37', // Texto ativo da tab bar
    tabBarTextInactive: '#8D8D8D', // Texto inativo da tab bar

    shadowColor: 'rgba(0, 0, 0, 0.2)', // Sombra mais pronunciada mas suave
    cardBackground: '#FFFFFF', // Fundo dos cartões (items de lista)
    borderColor: '#D4AF37', // Borda para inputs e elementos selecionáveis (ativo)
    placeholderText: '#A1887F', // Marrom suave para placeholders
    inputBackground: '#FBF5EB', // Fundo de inputs para contraste suave
};

// Layout (melhorado com valores mais consistentes)
const Layout = {
    padding: 20, // Padding geral
    spacing: {
        xsmall: 4,
        small: 8,
        medium: 16,
        large: 24,
        xlarge: 32,
    },
    borderRadius: {
        small: 6,
        medium: 12, // Usar este para bordas arredondadas de cards/botões
        large: 20,
        pill: 50, // Ajustado para ser mais arredondado em elementos pequenos
    },
    fontSizes: {
        xsmall: 12,
        small: 14,
        medium: 16,
        large: 18,
        xlarge: 20,
        title: 24, // Novo
    },
    cardElevation: Platform.select({
        ios: {
            shadowColor: Colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, // Mais sutil
            shadowRadius: 8,    // Mais espalhada
        },
        android: {
            elevation: 6, // Equivalente à sombra iOS
        },
    }),
};

// Componente AppHeader (incorporado aqui)
const AppHeader = ({ title }) => {
    return (
        <View style={appHeaderStyles.headerContainer}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.headerBackground} />
            <View style={appHeaderStyles.header}>
                <Text style={appHeaderStyles.headerTitle}>{title}</Text>
            </View>
        </View>
    );
};

const appHeaderStyles = StyleSheet.create({
    headerContainer: {
        backgroundColor: Colors.headerBackground, // Fundo dourado
        borderBottomLeftRadius: Layout.borderRadius.medium * 2,
        borderBottomRightRadius: Layout.borderRadius.medium * 2,
        elevation: 4,
        shadowColor: Colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + Layout.spacing.small : Layout.spacing.medium,
        paddingHorizontal: Layout.padding,
        paddingBottom: Layout.spacing.medium,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Centraliza o texto
    },
      headerTitle: {
        fontSize: Layout.fontSizes.title - 4,
        fontWeight: 'bold',
        color: Colors.headerText,
    },
});


export default function GestaoAlunosScreen() {
    const [selectedDate, setSelectedDate] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [formType, setFormType] = useState(null);
    const [loading, setLoading] = useState(false);
    const [horaAvaliacao, setHoraAvaliacao] = useState(null);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [nota, setNota] = useState('');
    const [avaliacao, setAvaliacao] = useState('');
    const [dadosData, setDadosData] = useState({ notas: [], treinos: [], avaliacoes: [] });
    const [datasMarcadas, setDatasMarcadas] = useState({});
    const [horaTreino, setHoraTreino] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [clienteSelecionado, setClienteSelecionado] = useState(null);
    const [tipoTreinoSelecionado, setTipoTreinoSelecionado] = useState(null);
    const [observacoesTreino, setObservacoesTreino] = useState('');
    const [urgente, setUrgente] = useState(false);
    const [adminInfo, setAdminInfo] = useState(null);

    const tiposDeTreino = ['Cardio', 'Musculação', 'Funcional', 'Alongamento', 'Crossfit'];

    const fetchAdminInfo = useCallback(() => {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;

        if (currentUser) {
            const userRef = doc(db, 'users', currentUser.uid);
            const unsubscribe = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    setAdminInfo(docSnap.data());
                } else {
                    console.warn('Usuário logado não é um administrador ou dados não encontrados.');
                    setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' }); // Fallback
                }
            }, (error) => {
                console.error("Erro ao buscar informações do admin:", error);
                setAdminInfo({ name: 'Admin', email: 'admin@example.com', nome: 'Admin' }); // Fallback em caso de erro
            });
            return unsubscribe;
        } else {
            setAdminInfo({ name: 'Visitante', email: '', nome: 'Visitante' }); // Fallback se não houver usuário logado
            return () => { };
        }
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'agenda'), (snapshot) => {
            let marcacoes = {};
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();

                const dots = [];
                let hasUrgente = false;

                if (Array.isArray(data.notas) && data.notas.filter(Boolean).length > 0) {
                    dots.push({ key: 'nota', color: Colors.primaryGold });
                    if (data.notas.filter(Boolean).some(n => n.urgente)) {
                        hasUrgente = true;
                    }
                }

                if (Array.isArray(data.treinos) && data.treinos.filter(Boolean).length > 0) {
                    data.treinos.filter(Boolean).forEach(treino => {
                        if (treino.tipoAgendamento === 'treinoCompleto') {
                            dots.push({ key: `treinoCompleto-${treino.id}`, color: Colors.accentBlue, selectedDotColor: Colors.accentBlue });
                        } else {
                            dots.push({ key: `anotacaoTreino-${treino.id}`, color: Colors.lightBrown });
                        }
                        if (treino.urgente) {
                            hasUrgente = true;
                        }
                    });
                }

                if (Array.isArray(data.avaliacoes) && data.avaliacoes.filter(Boolean).length > 0) {
                    dots.push({ key: 'avaliacao', color: Colors.darkBrown });
                    if (data.avaliacoes.filter(Boolean).some(a => a.urgente)) {
                        hasUrgente = true;
                    }
                }

                if (hasUrgente) {
                    const existingUrgentDotIndex = dots.findIndex(dot => dot.key === 'urgente');
                    if (existingUrgentDotIndex !== -1) {
                        dots.splice(existingUrgentDotIndex, 1);
                    }
                    dots.unshift({ key: 'urgente', color: Colors.errorRed });
                }

                if (dots.length > 0) {
                    marcacoes[docSnap.id] = {
                        marked: true,
                        dots: dots,
                        activeOpacity: 0,
                        selectedColor: hasUrgente ? Colors.errorRed : Colors.primaryGold,
                    };
                } else {
                    if (marcacoes[docSnap.id]) {
                        delete marcacoes[docSnap.id];
                    }
                }
            });
            setDatasMarcadas(marcacoes);
        });
        return () => {
            unsub();
        };
    }, []);

    // NOVO useEffect para carregar os detalhes da data selecionada em tempo real
    useEffect(() => {
        if (!selectedDate) return;
        setLoading(true);
        const docRef = doc(db, 'agenda', selectedDate);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDadosData({
                    notas: (data.notas || []).filter(Boolean),
                    treinos: (data.treinos || []).filter(Boolean),
                    avaliacoes: (data.avaliacoes || []).filter(Boolean),
                });
            } else {
                setDadosData({ notas: [], treinos: [], avaliacoes: [] });
            }
            setLoading(false);
        }, (error) => {
            console.error("Erro ao ouvir dados da data selecionada:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [selectedDate]);

    useEffect(() => {
        const unsubscribeClientes = onSnapshot(collection(db, 'users'), (snapshot) => {
            const listaClientes = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(cliente => cliente.role === 'user');
            setClientes(listaClientes);
        });
        return () => {
            unsubscribeClientes();
        };
    }, []);

    useEffect(() => {
        const unsubscribeAdmin = fetchAdminInfo();
        return () => unsubscribeAdmin();
    }, [fetchAdminInfo]);

    const onDayPress = (day) => {
        setSelectedDate(day.dateString);
        setFormType(null);
        setClienteSelecionado(null);
        setTipoTreinoSelecionado(null);
        setObservacoesTreino('');
        setUrgente(false);
        setHoraTreino(null);
        setAvaliacao('');
        setNota('');
        setHoraAvaliacao(null);
        setShowTimePicker(false);
    };

    const deletarItem = async (tipo, id) => {
        const docRef = doc(db, 'agenda', selectedDate);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            Alert.alert('Erro', 'Documento não encontrado para exclusão.');
            return;
        }

        const currentData = docSnap.data();
        const listaAtualizada = (currentData[tipo] || []).filter(item => item && item.id !== id);

        try {
            await updateDoc(docRef, {
                [tipo]: listaAtualizada,
            });

            setDadosData(prev => ({
                ...prev,
                [tipo]: listaAtualizada,
            }));

            Alert.alert('Sucesso', 'Item excluído com sucesso!');

        } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir item.');
            console.error('[deletarItem] Erro ao excluir item:', error);
        }
    };

    const salvarDados = async () => {
        if (!formType || !selectedDate) return;

        let novoDado = null;
        let tipoLista = '';

        if (formType === 'nota') {
            if (!nota.trim()) return Alert.alert('Erro', 'Digite uma nota.');
            novoDado = { id: Date.now().toString(), texto: nota.trim(), urgente };
            tipoLista = 'notas';
            setNota('');
        } else if (formType === 'treino') {
            if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
            if (!tipoTreinoSelecionado) return Alert.alert('Erro', 'Selecione o tipo de treino.');
            if (!horaTreino) return Alert.alert('Erro', 'Selecione a hora do treino.');

            novoDado = {
                id: Date.now().toString(),
                clienteId: clienteSelecionado,
                clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente Desconhecido',
                tipo: tipoTreinoSelecionado,
                observacoes: observacoesTreino.trim(),
                urgente,
                dataAgendada: selectedDate,
                hora: horaTreino.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                tipoAgendamento: 'anotacaoTreino',
            };
            tipoLista = 'treinos';
            setClienteSelecionado(null);
            setTipoTreinoSelecionado(null);
            setObservacoesTreino('');
            setHoraTreino(null);
        } else if (formType === 'avaliacao') {
            if (!clienteSelecionado) return Alert.alert('Erro', 'Selecione um cliente.');
            if (!avaliacao.trim()) return Alert.alert('Erro', 'Digite uma avaliação.');
            if (!horaAvaliacao) return Alert.alert('Erro', 'Selecione a hora da avaliação.');

            novoDado = {
                id: Date.now().toString(),
                clienteId: clienteSelecionado,
                clienteNome: clientes.find(c => c.id === clienteSelecionado)?.name || 'Cliente Desconhecido',
                texto: avaliacao.trim(),
                observacoes: observacoesTreino.trim(),
                urgente,
                hora: horaAvaliacao.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            tipoLista = 'avaliacoes';
            setClienteSelecionado(null);
            setAvaliacao('');
            setObservacoesTreino('');
            setHoraAvaliacao(null);
        }

        if (!novoDado) {
            Alert.alert('Erro', 'Dados inválidos para salvar.');
            return;
        }

        const docRef = doc(db, 'agenda', selectedDate);
        try {
            const docSnap = await getDoc(docRef);
            let currentItems = [];
            if (docSnap.exists()) {
                currentItems = (docSnap.data()[tipoLista] || []).filter(Boolean);
            }
            const updatedItems = [...currentItems, novoDado];

            const dataToSave = {
                [tipoLista]: updatedItems,
            };

            await setDoc(docRef, dataToSave, { merge: true });

            setDadosData(prev => ({
                ...prev,
                [tipoLista]: updatedItems,
            }));

            Alert.alert('Sucesso', 'Dados salvos!');
            setFormType(null);
            setModalVisible(false);
            setUrgente(false);
            setShowTimePicker(false);

        } catch (error) {
            Alert.alert('Erro', 'Falha ao salvar dados');
            console.error('[salvarDados] Erro ao salvar dados:', error);
        }
    };

    const renderDataList = (tipo) => {
        const lista = (dadosData[tipo] || []).filter(Boolean);

        if (!lista || lista.length === 0) return <Text style={styles.noDataItemText}>Nenhum {tipo.slice(0, -1)} agendado para esta data.</Text>;

        return lista.map((item) => (
            <View
                key={item.id}
                style={[
                    styles.itemContainer,
                    item.urgente ? styles.urgentItem : {},
                    item.tipoAgendamento === 'treinoCompleto' ? styles.treinoCompletoItem : {},
                    Layout.cardElevation,
                ]}
            >
                <View style={styles.itemContent}>
                    {tipo === 'treinos' ? (
                        <>
                            <Text style={[styles.itemTitle, item.tipoAgendamento === 'treinoCompleto' ? styles.treinoCompletoTitle : {}]}>
                                {item.tipoAgendamento === 'treinoCompleto' ? 'Treino Completo' : 'Anotação de Treino'}
                            </Text>
                            <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}</Text>
                            <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Tipo:</Text> {item.categoria}</Text>
                            <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Hora:</Text> {item.hora}</Text>
                            {item.observacoes ? (
                                <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Obs:</Text> {item.observacoes}</Text>
                            ) : null}
                            {item.urgente && (
                                <Text style={[styles.itemDetail, styles.urgentText]}><Text style={styles.itemLabel}>Urgente:</Text> Sim</Text>
                            )}
                        </>
                    ) : tipo === 'notas' ? (
                        <>
                            <Text style={styles.itemTitle}>Nota</Text>
                            <Text style={styles.itemText}>{item.texto}</Text>
                            {item.urgente && (
                                <Text style={[styles.itemDetail, styles.urgentText]}><Text style={styles.itemLabel}>Urgente:</Text> Sim</Text>
                            )}
                        </>
                    ) : tipo === 'avaliacoes' ? (
                        <>
                            <Text style={styles.itemTitle}>Avaliação</Text>
                            <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Cliente:</Text> {item.clienteNome}</Text>
                            <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Avaliação:</Text> {item.texto}</Text>
                            {item.hora && (
                                <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Hora:</Text> {item.hora}</Text>
                            )}
                            {item.observacoes ? (
                                <Text style={styles.itemDetail}><Text style={styles.itemLabel}>Observações:</Text> {item.observacoes}</Text>
                            ) : null}
                            {item.urgente && (
                                <Text style={[styles.itemDetail, styles.urgentText]}><Text style={styles.itemLabel}>Urgente:</Text> Sim</Text>
                            )}
                        </>
                    ) : null}
                </View>

                <TouchableOpacity
                    onPress={() => {
                        Alert.alert(
                            'Confirmar Exclusão',
                            'Tem certeza que deseja excluir este item?',
                            [
                                { text: 'Cancelar', style: 'cancel' },
                                { text: 'Excluir', style: 'destructive', onPress: () => deletarItem(tipo, item.id) },
                            ],
                            { cancelable: true }
                        );
                    }}
                    style={styles.deleteButton}
                >
                    <MaterialIcons name="delete" size={24} color={Colors.errorRed} />
                </TouchableOpacity>
            </View>
        ));
    };


    const abrirModalTipo = () => {
        if (!selectedDate) {
            Alert.alert('Atenção', 'Por favor, selecione uma data no calendário primeiro.');
            return;
        }
        setFormType(null);
        setModalVisible(true);
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedTime) {
            if (formType === 'treino') {
                setHoraTreino(selectedTime);
            } else if (formType === 'avaliacao') {
                setHoraAvaliacao(selectedTime);
            }
        }
    };

    const TimePicker = ({ value, onChange, label }) => (
        <View style={styles.timePickerContainer}>
            <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
            >
                <Text style={styles.timePickerButtonText}>
                    {value
                        ? `${label}: ${value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : `Selecionar ${label.toLowerCase()}`}
                </Text>
                <MaterialIcons name="access-time" size={20} color={Colors.darkBrown} />
            </TouchableOpacity>
            {showTimePicker && (
                <DateTimePicker
                    value={value || new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onChange}
                />
            )}
        </View>
    );

    const adminDisplayName = adminInfo?.nome || adminInfo?.name || 'Admin';

    return (
        <View style={styles.container}>
            <AppHeader title="Agenda" />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.calendarContainer}>
                    <Calendar
                        onDayPress={onDayPress}
                        markedDates={{
                            ...datasMarcadas,
                            ...(selectedDate ? {
                                [selectedDate]: {
                                    selected: true,
                                    selectedColor: datasMarcadas[selectedDate]?.selectedColor || Colors.primaryGold,
                                    dots: datasMarcadas[selectedDate]?.dots || [],
                                    selectedTextColor: Colors.white,
                                }
                            } : {}),
                        }}
                        theme={{
                            backgroundColor: Colors.cardBackground,
                            calendarBackground: Colors.cardBackground,
                            selectedDayBackgroundColor: Colors.primaryGold,
                            selectedDayTextColor: Colors.white,
                            todayTextColor: Colors.primaryGold,
                            dayTextColor: Colors.darkGray,
                            textDisabledColor: Colors.mediumGray,
                            dotColor: Colors.primaryGold,
                            selectedDotColor: Colors.white,
                            arrowColor: Colors.darkBrown,
                            monthTextColor: Colors.darkBrown,
                            textSectionTitleColor: Colors.lightBrown,
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: 'bold',
                            textDayFontSize: Layout.fontSizes.medium,
                            textMonthFontSize: Layout.fontSizes.large,
                            textDayHeaderFontSize: Layout.fontSizes.small,
                            'stylesheet.calendar.header': {
                                week: {
                                    marginTop: 5,
                                    flexDirection: 'row',
                                    justifyContent: 'space-around',
                                    paddingVertical: Layout.spacing.xsmall,
                                    backgroundColor: Colors.lightGray,
                                    borderRadius: Layout.borderRadius.small,
                                },
                            },
                            dotStyle: {
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                marginHorizontal: 1,
                            },
                        }}
                        style={styles.calendarStyle}
                    />
                </View>

                {loading && (
                    <ActivityIndicator size="large" color={Colors.primaryGold} style={styles.activityIndicator} />
                )}

                {selectedDate && !loading ? (
                    <View style={styles.detailsContainer}>
                        {dadosData.notas.length === 0 && dadosData.treinos.length === 0 && dadosData.avaliacoes.length === 0 ? (
                            <View style={styles.noDataContainer}>
                                <MaterialIcons name="info-outline" size={80} color={Colors.mediumGray} />
                                <Text style={styles.noDataText}>Nenhum agendamento para esta data.</Text>
                                <Text style={styles.noDataSubText}>Clique no botão "+" para adicionar uma nota, treino ou avaliação.</Text>
                            </View>
                        ) : (
                            <>
                                {dadosData.notas.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name="note" size={24} color={Colors.darkBrown} style={styles.sectionIcon} />
                                            <Text style={styles.sectionTitle}>Notas</Text>
                                        </View>
                                        {renderDataList('notas')}
                                    </>
                                )}

                                {dadosData.treinos.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name="fitness-center" size={24} color={Colors.darkBrown} style={styles.sectionIcon} />
                                            <Text style={styles.sectionTitle}>Treinos</Text>
                                        </View>
                                        {renderDataList('treinos')}
                                    </>
                                )}

                                {dadosData.avaliacoes.length > 0 && (
                                    <>
                                        <View style={styles.sectionHeader}>
                                            <MaterialIcons name="assignment" size={24} color={Colors.darkBrown} style={styles.sectionIcon} />
                                            <Text style={styles.sectionTitle}>Avaliações</Text>
                                        </View>
                                        {renderDataList('avaliacoes')}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                ) : (
                    <View style={styles.noDateSelectedContainer}>
                        <MaterialIcons name="event" size={80} color={Colors.mediumGray} />
                        <Text style={styles.noDateSelectedText}>Selecione uma data para ver os agendamentos</Text>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity
                style={styles.fab}
                onPress={abrirModalTipo}
            >
                <MaterialIcons name="add" size={30} color={Colors.white} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    setModalVisible(false);
                    setFormType(null);
                    setShowTimePicker(false);
                }}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        {!formType ? (
                            <>
                                <Text style={styles.modalTitle}>Adicionar Novo Item</Text>

                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => setFormType('nota')}
                                >
                                    <MaterialIcons name="note" size={24} color={Colors.darkBrown} />
                                    <Text style={styles.modalOptionText}>Nota</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => setFormType('treino')}
                                >
                                    <MaterialIcons name="fitness-center" size={24} color={Colors.darkBrown} />
                                    <Text style={styles.modalOptionText}>Treino</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => setFormType('avaliacao')}
                                >
                                    <MaterialIcons name="assignment" size={24} color={Colors.darkBrown} />
                                    <Text style={styles.modalOptionText}>Avaliação</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setModalVisible(false);
                                        setFormType(null);
                                    }}
                                    style={[styles.button, styles.buttonCancel]}
                                >
                                    <Text style={styles.buttonCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <ScrollView contentContainerStyle={styles.modalFormScroll}>
                                <Text style={styles.modalTitle}>
                                    {formType === 'nota' ? 'Adicionar Nota' : formType === 'treino' ? 'Agendar Treino' : 'Agendar Avaliação'}
                                </Text>

                                {/* Campos Comuns para Treino/Avaliação */}
                                {(formType === 'treino' || formType === 'avaliacao') && (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Cliente:</Text>
                                        <View style={styles.pickerContainer}>
                                            <Picker
                                                selectedValue={clienteSelecionado}
                                                onValueChange={(itemValue) => setClienteSelecionado(itemValue)}
                                                style={styles.pickerStyle}
                                                itemStyle={styles.pickerItemStyle}
                                            >
                                                <Picker.Item label="Selecione um cliente" value={null} />
                                                {clientes.map((cliente) => (
                                                    <Picker.Item key={cliente.id} label={cliente.name} value={cliente.id} />
                                                ))}
                                            </Picker>
                                        </View>
                                    </View>
                                )}

                                {/* Campos Específicos para Treino */}
                                {formType === 'treino' && (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Tipo de Treino:</Text>
                                            <View style={styles.pickerContainer}>
                                                <Picker
                                                    selectedValue={tipoTreinoSelecionado}
                                                    onValueChange={(itemValue) => setTipoTreinoSelecionado(itemValue)}
                                                    style={styles.pickerStyle}
                                                    itemStyle={styles.pickerItemStyle}
                                                >
                                                    <Picker.Item label="Selecione o tipo de treino" value={null} />
                                                    {tiposDeTreino.map((tipo) => (
                                                        <Picker.Item key={tipo} label={tipo} value={tipo} />
                                                    ))}
                                                </Picker>
                                            </View>
                                        </View>
                                        <TimePicker
                                            value={horaTreino}
                                            onChange={(event, time) => handleTimeChange(event, time)}
                                            label="Hora do Treino"
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Observações do treino (opcional)"
                                            placeholderTextColor={Colors.placeholderText}
                                            multiline
                                            value={observacoesTreino}
                                            onChangeText={setObservacoesTreino}
                                        />
                                    </>
                                )}

                                {/* Campos Específicos para Nota */}
                                {formType === 'nota' && (
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Digite sua nota aqui"
                                        placeholderTextColor={Colors.placeholderText}
                                        multiline
                                        value={nota}
                                        onChangeText={setNota}
                                    />
                                )}

                                {/* Campos Específicos para Avaliação */}
                                {formType === 'avaliacao' && (
                                    <>
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Digite a avaliação aqui"
                                            placeholderTextColor={Colors.placeholderText}
                                            multiline
                                            value={avaliacao}
                                            onChangeText={setAvaliacao}
                                        />
                                        <TimePicker
                                            value={horaAvaliacao}
                                            onChange={(event, time) => handleTimeChange(event, time)}
                                            label="Hora da Avaliação"
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Observações da avaliação (opcional)"
                                            placeholderTextColor={Colors.placeholderText}
                                            multiline
                                            value={observacoesTreino}
                                            onChangeText={setObservacoesTreino}
                                        />
                                    </>
                                )}

                                {/* Switch de Urgência (Comum para todos os formulários) */}
                                <View style={styles.switchContainer}>
                                    <Text style={styles.switchLabel}>Marcar como Urgente?</Text>
                                    <Switch
                                        trackColor={{ false: Colors.mediumGray, true: Colors.errorRed }}
                                        thumbColor={urgente ? Colors.white : Colors.lightGray}
                                        ios_backgroundColor={Colors.mediumGray}
                                        onValueChange={setUrgente}
                                        value={urgente}
                                    />
                                </View>

                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonSave]}
                                        onPress={salvarDados}
                                    >
                                        <Text style={styles.buttonText}>Salvar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.buttonCancel]}
                                        onPress={() => {
                                            setModalVisible(false);
                                            setFormType(null);
                                            setUrgente(false);
                                            setShowTimePicker(false);
                                        }}
                                    >
                                        <Text style={styles.buttonCancelText}>Cancelar</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.creamBackground,
    },
    scrollContent: {
        paddingBottom: Layout.padding + 70,
    },
    calendarContainer: {
        backgroundColor: Colors.cardBackground,
        margin: Layout.padding,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
        overflow: 'hidden',
    },
    calendarStyle: {
        borderRadius: Layout.borderRadius.medium,
        paddingBottom: Layout.spacing.small,
    },
    activityIndicator: {
        marginTop: Layout.spacing.xlarge,
    },
    detailsContainer: {
        padding: Layout.padding,
    },
    noDataContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.xlarge * 2,
        backgroundColor: Colors.lightGray,
        borderRadius: Layout.borderRadius.medium,
        ...Layout.cardElevation,
    },
    noDataText: {
        fontSize: Layout.fontSizes.large,
        color: Colors.darkGray,
        marginTop: Layout.spacing.medium,
        textAlign: 'center',
    },
    noDataSubText: {
        fontSize: Layout.fontSizes.small,
        color: Colors.mediumGray,
        marginTop: Layout.spacing.xsmall,
        textAlign: 'center',
        paddingHorizontal: Layout.spacing.large,
    },
    noDateSelectedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Layout.spacing.xlarge * 2,
        backgroundColor: Colors.lightGray,
        borderRadius: Layout.borderRadius.medium,
        margin: Layout.padding,
        ...Layout.cardElevation,
    },
    noDateSelectedText: {
        fontSize: Layout.fontSizes.large,
        color: Colors.darkGray,
        marginTop: Layout.spacing.medium,
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Layout.spacing.medium,
        marginTop: Layout.spacing.large,
    },
    sectionIcon: {
        marginRight: Layout.spacing.small,
    },
    sectionTitle: {
        fontSize: Layout.fontSizes.xlarge,
        fontWeight: 'bold',
        color: Colors.darkBrown,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.borderRadius.medium,
        padding: Layout.spacing.medium,
        marginBottom: Layout.spacing.medium,
        borderLeftWidth: 5,
        borderLeftColor: Colors.primaryGold,
    },
    itemContent: {
        flex: 1,
        marginRight: Layout.spacing.small,
    },
    itemTitle: {
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
        color: Colors.darkBrown,
        marginBottom: Layout.spacing.xsmall,
    },
    treinoCompletoItem: {
        borderLeftColor: Colors.accentBlue,
    },
    treinoCompletoTitle: {
        color: Colors.accentBlue,
    },
    itemDetail: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkGray,
        marginBottom: Layout.spacing.xsmall / 2,
    },
    itemLabel: {
        fontWeight: 'bold',
        color: Colors.lightBrown,
    },
    itemText: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkGray,
    },
    urgentItem: {
        borderLeftColor: Colors.errorRed,
    },
    urgentText: {
        color: Colors.errorRed,
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: Layout.spacing.xsmall,
    },
    fab: {
        position: 'absolute',
        bottom: Layout.padding,
        right: Layout.padding,
        backgroundColor: Colors.primaryGold,
        width: 60,
        height: 60,
        borderRadius: Layout.borderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        ...Layout.cardElevation,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: Colors.cardBackground,
        borderRadius: Layout.borderRadius.large,
        padding: Layout.padding,
        width: '90%',
        maxHeight: '80%',
        ...Layout.cardElevation,
    },
    modalTitle: {
        fontSize: Layout.fontSizes.xlarge,
        fontWeight: 'bold',
        color: Colors.darkBrown,
        marginBottom: Layout.spacing.large,
        textAlign: 'center',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        borderRadius: Layout.borderRadius.medium,
        padding: Layout.spacing.medium,
        marginBottom: Layout.spacing.small,
        ...Layout.cardElevation,
        elevation: Layout.cardElevation.android?.elevation / 2 || 2,
    },
    modalOptionText: {
        fontSize: Layout.fontSizes.large,
        color: Colors.darkBrown,
        marginLeft: Layout.spacing.small,
        flex: 1,
    },
    modalFormScroll: {
        paddingBottom: Layout.spacing.large,
    },
    inputGroup: {
        marginBottom: Layout.spacing.medium,
    },
    inputLabel: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
        marginBottom: Layout.spacing.xsmall,
        fontWeight: 'bold',
    },
    textInput: { // Renomeado de 'input' para 'textInput' para maior clareza e consistência
        backgroundColor: Colors.inputBackground,
        borderRadius: Layout.borderRadius.small,
        padding: Layout.spacing.medium,
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkGray,
        borderWidth: 1,
        borderColor: Colors.lightGray,
        marginBottom: Layout.spacing.medium,
        minHeight: 50,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: Colors.borderColor,
        borderRadius: Layout.borderRadius.small,
        overflow: 'hidden',
        backgroundColor: Colors.inputBackground,
        marginBottom: Layout.spacing.medium,
    },
    pickerStyle: { // Renomeado de 'picker' para 'pickerStyle'
        height: 50,
        width: '100%',
        color: Colors.darkBrown,
    },
    pickerItemStyle: { // Renomeado de 'pickerItem' para 'pickerItemStyle'
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
    },
    pickerPlaceholder: { // Estilo específico para o placeholder do Picker
        color: Colors.placeholderText,
    },
    timePickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.inputBackground,
        borderRadius: Layout.borderRadius.small,
        borderWidth: 1,
        borderColor: Colors.lightGray,
        marginBottom: Layout.spacing.medium,
        paddingHorizontal: Layout.spacing.medium,
        minHeight: 50,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        paddingVertical: Layout.spacing.small,
    },
    timePickerButtonText: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Layout.spacing.large,
        paddingHorizontal: Layout.spacing.small,
        paddingVertical: Layout.spacing.xsmall,
        backgroundColor: Colors.lightGray,
        borderRadius: Layout.borderRadius.small,
    },
    switchLabel: {
        fontSize: Layout.fontSizes.medium,
        color: Colors.darkBrown,
        fontWeight: 'bold',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: Layout.spacing.medium,
    },
    button: {
        paddingVertical: Layout.spacing.medium,
        paddingHorizontal: Layout.spacing.large,
        borderRadius: Layout.borderRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: Layout.spacing.xsmall,
        ...Layout.cardElevation,
    },
    buttonSave: { // Renomeado de 'buttonPrimary' para 'buttonSave'
        backgroundColor: Colors.primaryGold,
    },
    buttonCancel: { // Renomeado de 'buttonSecondary' para 'buttonCancel'
        backgroundColor: Colors.mediumGray,
    },
    buttonText: { // Renomeado de 'buttonPrimaryText' para 'buttonText'
        color: Colors.white,
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
    },
    buttonCancelText: { // Renomeado de 'buttonSecondaryText' para 'buttonCancelText'
        color: Colors.white,
        fontSize: Layout.fontSizes.large,
        fontWeight: 'bold',
    },
});