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

// Importação necessária para corrigir o erro
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import UserTabs from './screens/User/UserTabs';
import AdminStack from './screens/Admin/AdminStack';
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
import WorkoutTemplatesScreen from './screens/Admin/WorkoutTemplatesScreen';
import ExerciseLibraryScreen from './screens/Admin/ExerciseLibraryScreen';
import PasswordResetRequiredScreen from './screens/PasswordResetRequiredScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import AdminHomeScreen from './screens/Admin/HomeScreen';
import HomeScreen from './screens/User/UserHomeScreen';
import CreateGroupClassScreen from './screens/Admin/CreateGroupClassScreen';
import ListGroupClassesScreen from './screens/User/ListGroupClassesScreen';
import MyGroupClassesScreen from './screens/Admin/MyGroupClassesScreen';
import ManagePTClassesScreen from './screens/Admin/ManagePTClassesScreen';
import RespostasQuestionariosCliente from './screens/Admin/RespostasQuestionariosClientes';
import CreateWorkoutTemplateScreen from './screens/Admin/CreateWorkoutTemplateScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // O GestureHandlerRootView DEVE envolver toda a sua aplicação.
    // A sua SafeAreaView e o resto do código devem ficar aqui dentro.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ThemeProvider>
          <UserProvider>
            <UnreadProvider>
              <NavigationContainer>
                <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="CadastroCliente" component={CadastroClienteScreen} options={{ title: 'Registar Novo Cliente' }} />
                  <Stack.Screen name="UserTabs" component={UserTabs} />
                  <Stack.Screen name="AdminTabs" component={AdminStack} />
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
                  <Stack.Screen name="WorkoutTemplates" component={WorkoutTemplatesScreen} options={{ title: 'Templates de Treino' }} />
                  <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Biblioteca de Exercícios' }} />
                  <Stack.Screen name="PasswordResetRequiredScreen" component={PasswordResetRequiredScreen} options={{ gestureEnabled: false }} />
                  <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} options={{ title: 'Alterar Palavra-passe', headerShown: true }} />
                  <Stack.Screen name="AdminChatList" component={AdminChatListScreen} />
                  <Stack.Screen name="AdminChatRoom" component={AdminChatRoomScreen} />
                  <Stack.Screen name="UserChatList" component={UserChatListScreen} />
                  <Stack.Screen name="UserChatRoom" component={UserChatRoomScreen} />
                  <Stack.Screen name="ListarQuestionariosUser" component={ListarQuestionariosUserScreen} options={{ title: 'Questionários Disponíveis' }} />
                  <Stack.Screen name="EditarQuestionario" component={EditarQuestionarioScreen} options={{ title: 'Editar Questionário' }} />
                  <Stack.Screen name="CreateGroupClass" component={CreateGroupClassScreen} options={{ title: 'Criar Aula de Grupo', headerShown: true }} />
                  <Stack.Screen name="ListGroupClasses" component={ListGroupClassesScreen} options={{ title: 'Aulas de Grupo', headerShown: true }} />
                  <Stack.Screen name="MyGroupClasses" component={MyGroupClassesScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="ManagePTClasses" component={ManagePTClassesScreen} options={{ headerShown: false }} />
                  <Stack.Screen name="RespostasQuestionariosClientes" component={RespostasQuestionariosCliente} options={{ headerShown: false }} />
                  <Stack.Screen name="CreateWorkoutTemplate" component={CreateWorkoutTemplateScreen} options={{ title: 'Criar Template de Treino' }} />
                </Stack.Navigator>
              </NavigationContainer>
            </UnreadProvider>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e0c892',
  },
});