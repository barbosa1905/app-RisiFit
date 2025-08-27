// App.js
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, StyleSheet, Platform, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './i18n';

// Auth / entrada
import LoginScreen from './screens/LoginScreen';

// === Admin ===
import AdminStack from './screens/Admin/AdminStack';
import TreinosDoClienteScreen from './screens/Admin/TreinosDoClienteScreen';
import RespostasQuestionarioScreen from './screens/Admin/RespostasQuestionarioScreen';
import CadastroClienteScreen from './screens/Admin/CadastroClienteScreen';
import FichaClienteScreen from './screens/Admin/FichaClienteScreen';
import CriarAvaliacaoScreen from './screens/Admin/CriarAvaliacaoScreen';
import EditarTreinoScreen from './screens/Admin/EditarTreinoScreen';
import CompletedTrainingsHistoryScreen from './screens/Admin/CompletedTrainingsHistoryScreen';
import WorkoutTemplatesScreen from './screens/Admin/WorkoutTemplatesScreen';
import ExerciseLibraryScreen from './screens/Admin/ExerciseLibraryScreen';
import AdminHomeScreen from './screens/Admin/HomeScreen';
import CreateGroupClassScreen from './screens/Admin/CreateGroupClassScreen';
import MyGroupClassesScreen from './screens/Admin/MyGroupClassesScreen';
import ManagePTClassesScreen from './screens/Admin/ManagePTClassesScreen';
import RespostasQuestionariosCliente from './screens/Admin/RespostasQuestionariosClientes';
import CreateWorkoutTemplateScreen from './screens/Admin/CreateWorkoutTemplateScreen';

// === User (stack próprio) ===
import UserStack from './screens/User/UserStack';

// === Componentes / utilitários ===
import SessaoTreinosScreen from './screens/SessaoTreinosScreen';
import CalendarScreen from './components/CalendarScreen';
import ModalAgenda from './components/ModalAgenda';
import FormAvaliacao from './components/FormAvaliacao';
import FormNota from './components/FormNota';
import FormTreino from './components/FormTreino';
import CriarQuestionarioScreen from './screens/Admin/CriarQuestionarioScreen';
import ListarQuestionariosScreen from './screens/Admin/ListarQuestionariosScreen';
import EditarQuestionarioScreen from './screens/Admin/EditarQuestionarioScreen';
import PasswordResetRequiredScreen from './screens/PasswordResetRequiredScreen';

// Contextos
import { UserProvider } from './contexts/UserContext';
import { UnreadProvider } from './contexts/UnreadContext';
import { ThemeProvider } from './screens/ThemeContext';
import { PreferencesProvider } from './contexts/PreferencesContext';

// Fundo global
import RisiFitBackground from './components/RisiFitBackground';

const Stack = createNativeStackNavigator();

// TEMA com background TRANSPARENTE (evita branco do NavigationContainer)
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Fundo global por trás de tudo, inclusive status bar */}
     <RisiFitBackground variant="auroraPro" palette="brand" animated intensity={1} />

      <SafeAreaView style={styles.safeArea}>
        <ThemeProvider>
          <PreferencesProvider>
            <UserProvider>
              <UnreadProvider>
                <NavigationContainer theme={navTheme}>
                  <Stack.Navigator
                    initialRouteName="Login"
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: 'transparent' },
                    }}
                  >
                    {/* Autenticação */}
                    <Stack.Screen name="Login" component={LoginScreen} />

                    {/* Fluxo do Utilizador */}
                    <Stack.Screen name="UserTabs" component={UserStack} />

                    {/* Fluxo do Admin */}
                    <Stack.Screen name="AdminTabs" component={AdminStack} />

                    {/* Admin raiz */}
                    <Stack.Screen name="CadastroCliente" component={CadastroClienteScreen} options={{ title: 'Registar Novo Cliente' }} />
                    <Stack.Screen name="FichaCliente" component={FichaClienteScreen} options={{ title: 'Ficha do Cliente' }} />
                    <Stack.Screen name="CriarAvaliacao" component={CriarAvaliacaoScreen} options={{ title: 'Criar Avaliação' }} />
                    <Stack.Screen name="TreinosDoCliente" component={TreinosDoClienteScreen} />
                    <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />
                    <Stack.Screen name="CriarQuestionario" component={CriarQuestionarioScreen} />
                    <Stack.Screen name="ListarQuestionarios" component={ListarQuestionariosScreen} options={{ title: 'Listar Questionários' }} />
                    <Stack.Screen name="EditarQuestionario" component={EditarQuestionarioScreen} options={{ title: 'Editar Questionário' }} />
                    <Stack.Screen name="RespostasQuestionario" component={RespostasQuestionarioScreen} />
                    <Stack.Screen name="CompletedTrainingsHistory" component={CompletedTrainingsHistoryScreen} />
                    <Stack.Screen name="WorkoutTemplates" component={WorkoutTemplatesScreen} options={{ title: 'Templates de Treino' }} />
                    <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Biblioteca de Exercícios' }} />
                    <Stack.Screen name="CreateGroupClass" component={CreateGroupClassScreen} options={{ title: 'Criar Aula de Grupo', headerShown: true }} />
                    <Stack.Screen name="MyGroupClasses" component={MyGroupClassesScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="ManagePTClasses" component={ManagePTClassesScreen} options={{ headerShown: false }} />
                    <Stack.Screen name="RespostasQuestionariosClientes" component={RespostasQuestionariosCliente} options={{ headerShown: false }} />

                    {/* Outros utilitários */}
                    <Stack.Screen name="SessaoTreinos" component={SessaoTreinosScreen} />
                    <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
                    <Stack.Screen name="PasswordResetRequiredScreen" component={PasswordResetRequiredScreen} options={{ gestureEnabled: false }} />
                  </Stack.Navigator>
                </NavigationContainer>
              </UnreadProvider>
            </UserProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
