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
import HomeScreen from './HomeScreen';
import WorkoutTemplatesScreen from './WorkoutTemplatesScreen'; // Ajuste o caminho se WorkoutTemplatesScreen.js não estiver na mesma pasta que AdminStack.js
import CreateWorkoutTemplateScreen from './CreateWorkoutTemplateScreen'; // Ajuste o caminho se CreateWorkoutTemplateScreen.js não estiver na mesma pasta que AdminStack.js
import ExerciseLibraryScreen from './ExerciseLibraryScreen'; // Ajuste o caminho se ExerciseLibraryScreen.js não estiver na mesma pasta que AdminStack.js
import PerfilAdminScreen from './PerfilAdminScreen';
import DetalhesTreinoConcluidoScreen from './DetalhesTreinoConcluidoScreen';
const Stack = createNativeStackNavigator();

export default function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="TreinosCliente" component={TreinosClienteScreen} />
      <Stack.Screen name="CriarTreino" component={CriarTreinosScreen} />
      <Stack.Screen name="PerfilUserScreen" component={PerfilUserScreen} />
      <Stack.Screen name="CriarAvaliacao" component={CriarAvaliacaoScreen} />
      <Stack.Screen name="EditarPerfilAdmin" component={EditarPerfilAdmin} />
      <Stack.Screen name="EditarTreino" component={EditarTreinoScreen} />
      <Stack.Screen name="AdminChatList" component={AdminChatListScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="AdminChatRoom" component={AdminChatRoomScreen} options={{ title: 'Conversa' }} />
      <Stack.Screen name="WorkoutTemplates" component={WorkoutTemplatesScreen} options={{ title: 'Templates de Treino' }} />
<Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} options={{ title: 'Biblioteca de Exercícios' }} />
 <Stack.Screen
        name="PerfilAdmin" // <-- Adicione a rota PerfilAdmin aqui!
        component={PerfilAdminScreen}
        options={{ headerShown: false }} // Ou conforme necessário
      />
<Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Início' }} />
 <Stack.Screen name="DetalhesTreinoConcluidoScreen" component={DetalhesTreinoConcluidoScreen} />

    </Stack.Navigator>
  );
}