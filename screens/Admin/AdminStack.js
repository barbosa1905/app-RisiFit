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
<Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Início' }} />

    </Stack.Navigator>
  );
}
