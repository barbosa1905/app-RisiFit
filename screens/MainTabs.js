// MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens para cliente
import HomeScreen from '../screens/HomeScreen';
import TreinosScreen from './User/TreinosScreen';
import AvaliacaoScreen from '../screens/AvaliacaoScreen';
import HistoricoScreen from '../screens/HistoricoScreen';

// Screens comuns
import PerfilScreen from '../screens/PerfilScreen';

// Screens para personal trainer
import DashboardScreen from '../screens/DashboardScreen';
import CriarTreinosScreen from './Admin/CriarTreinosScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs({ route }) {
  const { user, role } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Início':
              iconName = 'home-outline';
              break;
            case 'Treinos':
              iconName = 'barbell-outline';
              break;
            case 'Avaliação':
              iconName = 'clipboard-outline';
              break;
            case 'Perfil':
              iconName = 'person-outline';
              break;
            case 'Histórico':
              iconName = 'calendar-outline';
              break;
            case 'Dashboard':
              iconName = 'analytics-outline';
              break;
            case 'Criar Treinos':
              iconName = 'create-outline';
              break;
            default:
              iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      {role === 'personal_trainer' ? (
        <>
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Criar Treinos" component={CriarTreinosScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name="Início" component={HomeScreen} />
          <Tab.Screen name="Treinos" component={TreinosScreen} />
          <Tab.Screen name="Avaliação" component={AvaliacaoScreen} />
          <Tab.Screen name="Histórico" component={HistoricoScreen} />
        </>
      )}
      <Tab.Screen name="Perfil" component={PerfilScreen} initialParams={{ user }} />
    </Tab.Navigator>
  );
}
