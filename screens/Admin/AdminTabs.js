// screens/Admin/AdminTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
//import { TouchableOpacity } from 'react-native'; // <--- ESTA É A LINHA QUE FOI ADICIONADA/CORRIGIDA
import HomeScreen from './HomeScreen';
import CriarTreinosScreen from './CriarTreinosScreen';
import ClientesScreen from './ClientesScreen';
import PerfilAdminScreen from './PerfilAdminScreen';
import { UnreadContext } from '../../contexts/UnreadContext';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import ChatListScreen from './ChatListScreen';
import ChatRoomScreen from './ChatRoomScreen';
import CreateChatScreen from './CreateChatScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GerirTreinosScreen from './GestaoAlunosScreen'; // Assumindo que este é o 'Agenda'

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();

function ChatStackScreen() {
    return (
        <ChatStack.Navigator>
          
            
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
                    let IconComponent = Icon; // Por padrão usa FontAwesome5

                    if (route.name === 'Início') {
                        iconName = 'home';
                        IconComponent = Ionicons;
                    } else if (route.name === 'Criar Treino') {
                        iconName = 'plus-circle';
                    } else if (route.name === 'Agenda') {
                        iconName = 'calendar-alt';
                    } else if (route.name === 'Clientes') {
                        iconName = 'users';
                    } else if (route.name === 'Chat Online') {
                        iconName = 'comments';
                    } else if (route.name === 'Perfil') {
                        iconName = 'user-cog';
                    }

                    if (iconName) {
                        if (IconComponent === Ionicons) {
                            return <IconComponent name={iconName} size={size} color={color} />;
                        }
                        return <IconComponent name={iconName} size={size} color={color} solid />;
                    }
                    return null;
                },
                tabBarActiveTintColor: '#d0a956',
                tabBarInactiveTintColor: '#888',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Início" component={HomeScreen} options={{ title: 'Início' }} />
            <Tab.Screen name="Criar Treino" component={CriarTreinosScreen} options={{ title: 'Criar Treino' }} />
            <Tab.Screen name="Agenda" component={GerirTreinosScreen} options={{ title: 'Agenda' }} />
            <Tab.Screen name="Chat Online" component={ChatStackScreen} options={{ title: 'Chats' }} />
            <Tab.Screen name="Clientes" component={ClientesScreen} options={{ title: 'Clientes' }} />
            <Tab.Screen name="Perfil" component={PerfilAdminScreen} options={{ title: 'Perfil' }} />
        </Tab.Navigator>
    );
}