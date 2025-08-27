// screens/Admin/AdminTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './HomeScreen';
import CriarTreinosScreen from './CriarTreinosScreen';
import ClientesScreen from './ClientesScreen';
import PerfilAdminScreen from './PerfilAdminScreen';
import ChatRoomScreen from './ChatRoomScreen';
import CreateChatScreen from './CreateChatScreen';
import GestaoAlunosScreen from './GestaoAlunosScreen';

import Colors from '../../constants/Colors';

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

/* ----------------- Chat Stack ----------------- */
function ChatStackScreen() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }, // <- transparente para ver o fundo global
      }}
    >
      <ChatStack.Screen name="CreateChat" component={CreateChatScreen} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: 'Conversa' }} />
    </ChatStack.Navigator>
  );
}

/* ----------------- Tab Icon Helper ----------------- */
const getTabIcon = (route, color, size) => {
  const icons = {
    Início: 'home-outline',
    Agenda: 'calendar-outline',
    Clientes: 'people-outline',
    'Chat Online': 'chatbubble-ellipses-outline',
    Perfil: 'person-circle-outline',
  };
  return <Ionicons name={icons[route.name]} size={size} color={color} />;
};

/* ----------------- Main Tabs ----------------- */
export default function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => getTabIcon(route, color, size),
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
      })}
      sceneContainerStyle={{ backgroundColor: 'transparent' }} // <- chave para o fundo nas tabs
    >
      <Tab.Screen name="Início" component={HomeScreen} />
      <Tab.Screen name="Agenda" component={GestaoAlunosScreen} />
      <Tab.Screen name="Chat Online" component={ChatStackScreen} options={{ title: 'Chats' }} />
      <Tab.Screen name="Clientes" component={ClientesScreen} />
      <Tab.Screen name="Perfil" component={PerfilAdminScreen} />
    </Tab.Navigator>
  );
}
