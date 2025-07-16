import React, { createContext, useState, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TreinosScreen from './TreinosScreen';
import ProgressoScreen from './ProgressoScreen';
import PerfilUserScreen from './PerfilUserScreen';
import HistoricoScreen from './HistoricoScreen';
import Icon from 'react-native-vector-icons/FontAwesome5';
import CreateChatScreen from './CreateChatScreen';
import ChatListScreen from './ChatListScreen';
import ChatRoomScreen from './ChatRoomScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UnreadContext } from '../../contexts/UnreadContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './UserHomeScreen';


const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

// Este componente 'ChatStackScreen' define a navegação em stack para as telas de chat.
// Ele permite que você navegue entre ChatList, CreateChat e ChatRoom como um fluxo separado
// dentro da aba "Chat Online".
function ChatStackScreen() {
  return (
    <ChatStack.Navigator>
    
      <ChatStack.Screen
        name="CreateChat"
        component={CreateChatScreen}
        options={{ title: 'Nova Conversa', headerShown: false }} // <-- ESTA É A LINHA CRÍTICA
      />

      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ // Permite que o título seja dinâmico (nome do chat)
          title: route.params?.userName || 'Conversa', // Exibe o nome do usuário/chat
        })}
      />
    </ChatStack.Navigator>
  );
}

export default function UserTabs() {
  const context = useContext(UnreadContext);
  const unreadCount = context?.unreadCount || 0;

  return (
    <Tab.Navigator
      initialRouteName="UserHome"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          let IconComponent = Icon; // Assume FontAwesome5 por padrão para a maioria dos ícones

          if (route.name === 'Treinos') {
            iconName = 'dumbbell';
          } else if (route.name === 'Progresso') {
            iconName = 'chart-line';
          } else if (route.name === 'Perfil') {
            iconName = 'user';
          } else if (route.name === 'Histórico') {
            iconName = 'history';
          } else if (route.name === 'Chat Online') {
            iconName = 'comments'; // Ícone para a aba de chat
          }
          return <IconComponent name={iconName} size={size} color={color} solid />;
        },
        tabBarActiveTintColor: '#d0a956', // Cor para abas ativas
        tabBarInactiveTintColor: '#888',  // Cor para abas inativas
        headerShown: false, // Esconde o cabeçalho padrão do Tab Navigator
      })}
    >
      {/* Aba "Início" */}
      <Tab.Screen
        name="UserHome" // Nome da rota para a HomeScreen do utilizador
        component={HomeScreen} // Componente da tela inicial
        options={{
          title: 'Início', // Título que aparece na aba
          tabBarIcon: ({ color, size }) => (
            // Usa MaterialCommunityIcons especificamente para o ícone da home
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* Aba "Treinos" */}
      <Tab.Screen name="Treinos" component={TreinosScreen} />
      
      {/* Aba "Progresso" */}
      <Tab.Screen name="Progresso" component={ProgressoScreen} />

      {/* Aba "Chat Online" */}
      {/* Esta aba agora carrega o ChatStackScreen, que é um stack de navegação.
          Isso permite que ChatList, CreateChat e ChatRoom funcionem como um fluxo coeso. */}
      <Tab.Screen
        name="Chat Online"
        component={ChatStackScreen} // Aponta para o stack de navegação do chat
        options={{
          headerShown: false, // Esconde o cabeçalho do Tab Navigator para o stack de chat
          tabBarBadge: unreadCount > 0 ? unreadCount : null, // Mostra badge apenas se houver mensagens não lidas
          tabBarBadgeStyle: { backgroundColor: '#e53935', color: '#fff', fontSize: 12 },
        }}
      />
      
      {/* Aba "Histórico" */}
      <Tab.Screen name="Histórico" component={HistoricoScreen} />

      {/* Aba "Perfil" */}
      <Tab.Screen name="Perfil" component={PerfilUserScreen} />
    </Tab.Navigator>
  );
}
