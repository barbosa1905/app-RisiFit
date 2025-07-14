// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaView, // Importar SafeAreaView
  StyleSheet,   // Importar StyleSheet
  Platform,     // Importar Platform para ajustes específicos
  StatusBar,    // Importar StatusBar para ajuste de offset no Android
} from 'react-native';

import LoginScreen from './screens/LoginScreen';
import UserTabs from './screens/User/UserTabs';
import AdminStack from './screens/Admin/AdminStack';
import UserStack from './screens/User/UserStack';
import SessaoTreinosScreen from './screens/SessaoTreinosScreen';
import { UserProvider } from './contexts/UserContext';
import TreinosDoClienteScreen from './screens/Admin/TreinosDoClienteScreen';

import ResponderQuestionarioScreen from './screens/User/ResponderQuestionarioScreen';
import RespostasQuestionarioScreen from './screens/Admin/RespostasQuestionarioScreen';
import CadastroClienteScreen from './screens/Admin/CadastroClienteScreen';
import FichaClienteScreen from './screens/Admin/FichaClienteScreen';
import CriarAvaliacaoScreen from './screens/Admin/CriarAvaliacaoScreen';
import ProgressoScreen from './screens/User/ProgressoScreen';
import EditarTreinoScreen from './screens/Admin/EditarTreinoScreen';
import AdminChatListScreen from './screens/Admin/ChatListScreen';
import UserChatListScreen from './screens/User/ChatListScreen';
import AdminChatRoomScreen from './screens/Admin/ChatRoomScreen';
import UserChatRoomScreen from './screens/User/ChatRoomScreen';
import ExecucaoTreinoScreen from './screens/User/ExecucaoTreinoScreen';
import { UnreadProvider } from './contexts/UnreadContext';
import CalendarScreen from './components/CalendarScreen';
import ModalAgenda from './components/ModalAgenda';
import FormAvaliacao from './components/FormAvaliacao';
import FormNota from './components/FormNota';
import FormTreino from './components/FormTreino';
import CriarQuestionarioScreen from './screens/Admin/CriarQuestionarioScreen';
import ListarQuestionariosScreen from './screens/Admin/ListarQuestionariosScreen';
import EditarQuestionarioScreen from './screens/Admin/EditarQuestionarioScreen';
import ListarQuestionariosUserScreen from './screens/User/ListarQuestionariosUserScreen';
import { ThemeProvider } from './screens/ThemeContext';
import HomeScreen from './screens/Admin/HomeScreen';
import CompletedTrainingsHistoryScreen from './screens/Admin/CompletedTrainingsHistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // A SafeAreaView é essencial para garantir que o conteúdo não se sobreponha
    // a áreas do sistema (como o notch em iPhones ou a barra de status).
    // O estilo `flex: 1` é CRUCIAL aqui. Ele garante que a SafeAreaView ocupe
    // todo o espaço vertical disponível no ecrã. Sem isso, o KeyboardAvoidingView
    // dentro do LoginScreen não terá uma altura flexível para redimensionar.
    <SafeAreaView style={styles.safeArea}>
      <ThemeProvider>
        <UserProvider>
          <UnreadProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="CadastroCliente" component={CadastroClienteScreen} options={{ title: 'Registar Novo Cliente' }} />
                <Stack.Screen name="AdminTabs" component={AdminStack} />
                <Stack.Screen name="UserTabs" component={UserTabs} />
                <Stack.Screen name="FichaCliente" component={FichaClienteScreen} options={{ title: 'Ficha do Cliente' }} />
                <Stack.Screen name="SessaoTreinos" component={SessaoTreinosScreen} />
                <Stack.Screen name="CriarAvaliacao" component={CriarAvaliacaoScreen} options={{ title: 'Criar Avaliação' }} />
                <Stack.Screen name="TreinosDoCliente" component={TreinosDoClienteScreen} />
                <Stack.Screen name="RespostasQuestionario" component={RespostasQuestionarioScreen} />
                <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />
                <Stack.Screen name="ResponderQuestionario" component={ResponderQuestionarioScreen} />
                <Stack.Screen name="ExecucaoTreinoScreen" component={ExecucaoTreinoScreen} />
                <Stack.Screen name='CalendarScreen' component={CalendarScreen} />
                <Stack.Screen name="CriarQuestionario" component={CriarQuestionarioScreen} />
                  <Stack.Screen name="HomeScreen" component={HomeScreen} />
                   <Stack.Screen name="CompletedTrainingsHistory" component={CompletedTrainingsHistoryScreen} /> 
                <Stack.Screen
                  name="ListarQuestionarios"
                  component={ListarQuestionariosScreen}
                  options={{ title: 'Listar Questionários' }}
                />
                {/* Admin */}
                <Stack.Screen name="AdminChatList" component={AdminChatListScreen} />
                <Stack.Screen name="AdminChatRoom" component={AdminChatRoomScreen} />
                {/* User */}
                <Stack.Screen
                  name="EditarQuestionario"
                  component={EditarQuestionarioScreen}
                  options={{ title: 'Editar Questionário' }}
                />
                <Stack.Screen name="UserChatList" component={UserChatListScreen} />
                <Stack.Screen name="UserChatRoom" component={UserChatRoomScreen} />
                <Stack.Screen
                  name="ListarQuestionariosUser"
                  component={ListarQuestionariosUserScreen}
                  options={{ title: 'Questionários Disponíveis' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </UnreadProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // Essencial: Garante que a SafeAreaView ocupe todo o ecrã
    backgroundColor: '#e0c892', // Cor de fundo do LoginScreen para evitar "flash"
    // No Android, a StatusBar.currentHeight pode ser usada para ajustar o padding superior
    // se o conteúdo estiver a ser coberto pela barra de status e não houver um cabeçalho de navegação.
    // paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
