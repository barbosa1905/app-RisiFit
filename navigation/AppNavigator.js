// navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import UserTabs from '../screens/User/UserTabs';// Aqui está o novo
import AdminStack from '../screens/Admin/AdminStack';
import PerfilAdminScreen from '../screens/Admin/PerfilAdminScreen'; // Importando o PerfilAdminScreen
import DetalhesTreinoConcluidoScreen from '../screens/Admin/DetalhesTreinoConcluidoScreen';
import CreateWorkoutTemplateScreen from '../screens/Admin/CreateWorkoutTemplateScreen';
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="LoginScreen">
      <Stack.Screen name="LoginScreen" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Admin" component={AdminStack} options={{ headerShown: false }} />
      <Stack.Screen name="UserTabs" component={UserTabs} options={{header: false}}/>
      <Stack.Screen name="PerfilAdmin" component={PerfilAdminScreen} options={{header: false}}/>
 <Stack.Screen name="DetalhesTreinoConcluidoScreen" component={DetalhesTreinoConcluidoScreen} />
  <Stack.Screen name="CreateWorkoutTemplate" component={CreateWorkoutTemplateScreen} />
     </Stack.Navigator>
  );
}