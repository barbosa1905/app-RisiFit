// screens/User/UserTabs.js
import React, { useContext } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import HomeScreen from './UserHomeScreen';
import TreinosScreen from './TreinosScreen';
import ProgressoScreen from './ProgressoScreen';
import HistoricoScreen from './HistoricoScreen';
import PerfilUserScreen from './PerfilUserScreen';

import CreateChatScreen from './CreateChatScreen';
import ChatRoomScreen from './ChatRoomScreen';

import { UnreadContext } from '../../contexts/UnreadContext';

const Colors = {
  primary: '#2A3B47',
  secondary: '#FFB800',
  background: '#F0F2F5',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#88909A',
  border: '#E6E8EB',
};

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

function ChatStackScreen() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' }, // <- transparente para ver o fundo global
      }}
    >
      <ChatStack.Screen name="CreateChat" component={CreateChatScreen} />
      <ChatStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({
          headerShown: true,
          headerTitle: route.params?.userName || 'Conversa',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        })}
      />
    </ChatStack.Navigator>
  );
}

export default function UserTabs() {
  const { unreadCount = 0 } = useContext(UnreadContext) || {};

  return (
    <Tab.Navigator
      initialRouteName="UserHome"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 6 : 2,
        },
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: Platform.OS === 'ios' ? 10 : 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const iconSize = size + (focused ? 1 : 0);
          const common = { color, size: iconSize };

          switch (route.name) {
            case 'UserHome':
              return <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} {...common} />;
            case 'Treinos':
              return <Ionicons name={focused ? 'barbell' : 'barbell-outline'} {...common} />;
            case 'Progresso':
              return <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} {...common} />;
            case 'Chat Online':
              return (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} {...common} />
                  {unreadCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -10,
                        backgroundColor: '#e53935',
                        borderRadius: 10,
                        minWidth: 18,
                        paddingHorizontal: 4,
                        height: 18,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              );
            case 'Histórico':
              return <Ionicons name={focused ? 'time' : 'time-outline'} {...common} />;
            case 'Perfil':
              return <Ionicons name={focused ? 'person' : 'person-outline'} {...common} />;
            default:
              return <Ionicons name="ellipse-outline" {...common} />;
          }
        },
      })}
      sceneContainerStyle={{ backgroundColor: 'transparent' }} // <- chave para o fundo nas tabs
    >
      <Tab.Screen name="UserHome" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="Treinos" component={TreinosScreen} />
      <Tab.Screen name="Progresso" component={ProgressoScreen} />
      <Tab.Screen
        name="Chat Online"
        component={ChatStackScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#e53935',
            color: '#fff',
            fontSize: 11,
            fontWeight: '800',
          },
        }}
      />
      <Tab.Screen name="Histórico" component={HistoricoScreen} />
      <Tab.Screen name="Perfil" component={PerfilUserScreen} />
    </Tab.Navigator>
  );
}
