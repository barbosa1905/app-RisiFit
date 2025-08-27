// screens/User/UserStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UserTabs from './UserTabs';

// CHAT
import UserChatListScreen from './ChatListScreen';
import ChatRoomScreen from './ChatRoomScreen';
import CreateChatScreen from '../Admin/CreateChatScreen';

// TREINOS
import TreinosScreen from './TreinosScreen';
import ExecucaoTreinoScreen from './ExecucaoTreinoScreen';

// QUESTIONÁRIOS
import ResponderQuestionarioScreen from './ResponderQuestionarioScreen';
import ListarQuestionariosUserScreen from './ListarQuestionariosUserScreen';

// PERFIL / DEFINIÇÕES
import PerfilUserScreen from './PerfilUserScreen';
import SettingsUser from './SettingsUser';
import EditarDadosPessoais from './EditarDadosPessoais';
import ChangePasswordScreen from './ChangePasswordScreen';
import MetasUserScreen from './MetasUserScreen';

// PROGRESSO / HISTÓRICO
import ProgressoScreen from './ProgressoScreen';
import HistoricoScreen from './HistoricoScreen';

const Stack = createNativeStackNavigator();

export default function UserStack() {
  return (
    <Stack.Navigator
      initialRouteName="UserTabsRoot"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }, // <- importante
      }}
    >
      <Stack.Screen name="UserTabsRoot" component={UserTabs} />

      {/* PERFIL + DEFINIÇÕES */}
      <Stack.Screen name="PerfilUser" component={PerfilUserScreen} />
      <Stack.Screen name="SettingsUser" component={SettingsUser} />
      <Stack.Screen name="EditarDadosPessoais" component={EditarDadosPessoais} />
      <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
      <Stack.Screen name="MetasUserScreen" component={MetasUserScreen} />

      {/* CHAT */}
      <Stack.Screen name="UserChatList" component={UserChatListScreen} />
      <Stack.Screen name="UserChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="CreateChatUser" component={CreateChatScreen} />

      {/* QUESTIONÁRIOS */}
      <Stack.Screen name="ListarQuestionariosUser" component={ListarQuestionariosUserScreen} />
      <Stack.Screen name="ListarQuestionarios" component={ListarQuestionariosUserScreen} />
      <Stack.Screen name="ResponderQuestionario" component={ResponderQuestionarioScreen} />

      {/* TREINOS */}
      <Stack.Screen name="ExecucaoTreino" component={ExecucaoTreinoScreen} />
      <Stack.Screen name="TreinosScreen" component={TreinosScreen} />

      {/* PROGRESSO / HISTÓRICO */}
      <Stack.Screen name="Progresso" component={ProgressoScreen} />
      <Stack.Screen name="Historico" component={HistoricoScreen} />
    </Stack.Navigator>
  );
}
