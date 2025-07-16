// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';

import LoginScreen from './screens/LoginScreen';

// Importações dos navegadores de abas/stacks principais
import UserTabs from './screens/User/UserTabs'; // Contém as abas do utilizador, incluindo a UserHomeScreen
import AdminStack from './screens/Admin/AdminStack'; // Contém as telas do administrador, incluindo a AdminHomeScreen

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
import CompletedTrainingsHistoryScreen from './screens/Admin/CompletedTrainingsHistoryScreen';

// IMPORTAR AS DUAS HOMESCREENS COM NOMES DISTINTOS
import AdminHomeScreen from './screens/Admin/HomeScreen'; // HomeScreen para o Admin
import HomeScreen from './screens/User/UserHomeScreen';  // HomeScreen para o Utilizador

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemeProvider>
        <UserProvider>
          <UnreadProvider>
            <NavigationContainer>
              <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="CadastroCliente" component={CadastroClienteScreen} options={{ title: 'Registar Novo Cliente' }} />

                {/* As UserTabs devem conter a UserHomeScreen como uma de suas abas */}
                <Stack.Screen name="UserTabs" component={UserTabs} />

                {/* O AdminStack deve conter a AdminHomeScreen como uma de suas telas */}
                <Stack.Screen name="AdminTabs" component={AdminStack} />

                {/* Outras telas que podem ser acessadas de ambos os fluxos ou de forma independente */}
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
                <Stack.Screen name="ListarQuestionarios" component={ListarQuestionariosScreen} options={{ title: 'Listar Questionários' }} />
                <Stack.Screen name="CompletedTrainingsHistory" component={CompletedTrainingsHistoryScreen} />
                <Stack.Screen name="ResponderQuestionarioScreen" component={ResponderQuestionarioScreen} options={{ title: 'Questionário' }} />
                {/* Telas de Chat (Admin) */}
                <Stack.Screen name="AdminChatList" component={AdminChatListScreen} />
                <Stack.Screen name="AdminChatRoom" component={AdminChatRoomScreen} />

                {/* Telas de Chat (User) */}
                <Stack.Screen name="UserChatList" component={UserChatListScreen} />
                <Stack.Screen name="UserChatRoom" component={UserChatRoomScreen} />

                {/* Telas de Questionário (User) */}
                <Stack.Screen name="ListarQuestionariosUser" component={ListarQuestionariosUserScreen} options={{ title: 'Questionários Disponíveis' }} />
                <Stack.Screen name="EditarQuestionario" component={EditarQuestionarioScreen} options={{ title: 'Editar Questionário' }} />

                {/* NOTA: As HomeScreens agora serão gerenciadas dentro de AdminStack e UserTabs.
                   Não as adicione diretamente aqui, a menos que sejam rotas independentes do fluxo principal.
                   As linhas abaixo foram removidas pois eram problemáticas:
                   <Stack.Screen name="HomeScreen" component={HomeScreen} />
                   <Stack.Navigator initialRouteName="Home">
                     <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
                   </Stack.Navigator>
                */}

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
    flex: 1,
    backgroundColor: '#e0c892',
  },
});
