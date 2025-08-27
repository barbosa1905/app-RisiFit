// screens/Admin/AdminStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminTabs from './AdminTabs';
import TreinosClienteScreen from './TreinosDoClienteScreen';
import CriarTreinosScreen from './CriarTreinosScreen';
import PerfilUserScreen from '../User/PerfilUserScreen';
import EditarPerfilAdmin from './EditarPerfilAdmin';
import CriarAvaliacaoScreen from './CriarAvaliacaoScreen';
import EditarTreinoScreen from './EditarTreinoScreen';
import AdminChatListScreen from './ChatListScreen';
import AdminChatRoomScreen from './ChatRoomScreen';
import CreateChatScreen from './CreateChatScreen';
import HomeScreen from './HomeScreen';
import WorkoutTemplatesScreen from './WorkoutTemplatesScreen';
import CreateWorkoutTemplateScreen from './CreateWorkoutTemplateScreen';
import ExerciseLibraryScreen from './ExerciseLibraryScreen';
import PerfilAdminScreen from './PerfilAdminScreen';
import DetalhesTreinoConcluidoScreen from './DetalhesTreinoConcluidoScreen';
import EditarDadosPessoaisScreen from './EditarDadosPessoaisScreen';

const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} />

      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="TreinosCliente" component={TreinosClienteScreen} />
      <Stack.Screen name="CriarTreino" component={CriarTreinosScreen} />
      <Stack.Screen name="PerfilUserScreen" component={PerfilUserScreen} />
      <Stack.Screen name="CriarAvaliacao" component={CriarAvaliacaoScreen} />
      <Stack.Screen name="EditarPerfilAdmin" component={EditarPerfilAdmin} />
      <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />

      <Stack.Screen name="AdminChatList" component={AdminChatListScreen} />
      <Stack.Screen name="AdminChatRoom" component={AdminChatRoomScreen} />
      <Stack.Screen name="CreateChat" component={CreateChatScreen} />

      <Stack.Screen name="WorkoutTemplates" component={WorkoutTemplatesScreen} />
      <Stack.Screen name="CreateWorkoutTemplate" component={CreateWorkoutTemplateScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />

      <Stack.Screen name="EditarDadosPessoais" component={EditarDadosPessoaisScreen} />
      <Stack.Screen name="PerfilAdmin" component={PerfilAdminScreen} />

      <Stack.Screen name="DetalhesTreinoConcluidoScreen" component={DetalhesTreinoConcluidoScreen} />
      <Stack.Screen name="DetalhesTreinoConcluido" component={DetalhesTreinoConcluidoScreen} />
    </Stack.Navigator>
  );
}
