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
import { Ionicons } from '@expo/vector-icons';

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
export default function UserTabs() {
  const context = useContext(UnreadContext);
  const unreadCount = context?.unreadCount || 0;

  return (

    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Treinos') iconName = 'dumbbell';
          else if (route.name === 'Progresso') iconName = 'chart-line';
          else if (route.name === 'Perfil') iconName = 'user';
          else if (route.name === 'Histórico') iconName = 'history';
          else if (route.name === 'Chat Online') iconName = 'comments';
          return <Icon name={iconName} size={size} color={color} solid />;
        },
        tabBarActiveTintColor: '#d0a956',
        tabBarInactiveTintColor: '#888',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Treinos" component={TreinosScreen} />

      
      <Tab.Screen name="Progresso" component={ProgressoScreen} />

      <Tab.Screen name="Chat Online"component={CreateChatScreen} options={{headerShown: false, tabBarBadge: unreadCount > 5 ? unreadCount : null,tabBarBadgeStyle: {backgroundColor: '#e53935', color: '#fff',fontSize: 12,  }, }}/>
     
      <Tab.Screen name="Histórico" component={HistoricoScreen} />
         <Tab.Screen name="Perfil" component={PerfilUserScreen} />
  
    </Tab.Navigator>
  );
} 