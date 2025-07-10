import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CriarTreinosScreen from './CriarTreinosScreen';
import ClientesScreen from './ClientesScreen';
import PerfilAdminScreen from './PerfilAdminScreen';
import { UnreadContext } from '../../contexts/UnreadContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import TreinosDoClienteScreen from './TreinosDoClienteScreen';
import ChatListScreen from './ChatListScreen';
import ChatRoomScreen from './ChatRoomScreen';
import CreateChatScreen from './CreateChatScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import GerirTreinosScreen from './GestaoAlunosScreen';
const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

function ChatStackScreen() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen 
        name="ChatList" 
        component={ChatListScreen} 
        options={({ navigation }) => ({
          title: 'Chats',
          headerRight: () => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              style={{ marginRight: 15 }}
              onPress={() => navigation.navigate('CreateChat')}
            />
          ),
        })}
      />
      <ChatStack.Screen 
        name="CreateChat" 
        component={CreateChatScreen} 
        options={{ title: 'Nova Conversa' }}
      />
      <ChatStack.Screen 
        name="ChatRoom" 
        component={ChatRoomScreen} 
        options={{ title: 'Conversa' }}
      />
    </ChatStack.Navigator>
  );
}

export default function AdminTabs() {
  return (
   <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Criar Treino') iconName = 'plus-circle';
          else if (route.name === 'Agenda') iconName = 'calendar-alt';
          else if (route.name === 'Clientes') iconName = 'users';
          else if (route.name === 'Chat Online') iconName = 'comments';
          
          else if (route.name === 'Perfil') iconName = 'user-cog';
else if (route.name === 'Chat Online') iconName = 'comments';

          return <Icon name={iconName} size={size} color={color} solid />;
        },
        tabBarActiveTintColor: '#d0a956',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      })}
    >
      
      <Tab.Screen name="Criar Treino" component={CriarTreinosScreen} />
           <Tab.Screen name="Agenda" component={GerirTreinosScreen} />
            <Tab.Screen name="Chat Online" component={CreateChatScreen} options={{ headerShown: false }} />

    <Tab.Screen name="Clientes" component={ClientesScreen} />
        <Tab.Screen name="Perfil" component={PerfilAdminScreen} />
    </Tab.Navigator>
  );
}