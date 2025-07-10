// src/navigation/UserStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UserChatListScreen from './ChatListScreen';
import UserChatRoomScreen from './ChatRoomScreen';
import ResponderQuestionarioScreen from './ResponderQuestionarioScreen';
import ExecucaoTreinoScreen from './ExecucaoTreinoScreen';
import ProgressoScreen from './ProgressoScreen';
const Stack = createNativeStackNavigator();

export default function UserStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="UserChatList" component={UserChatListScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="UserChatRoom" component={UserChatRoomScreen} options={{ title: 'Conversa' }} />
      <Stack.Screen name="ResponderQuestionario"component={ResponderQuestionarioScreen}  />
      <Stack.Screen name="ExecucaoTreino" component={ExecucaoTreinoScreen} options={{ title: 'Execução do Treino' }}
      
/>

    </Stack.Navigator>
  );
}
