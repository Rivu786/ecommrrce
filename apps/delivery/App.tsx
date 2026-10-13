import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getToken } from './lib/api';
import type { RootStackParamList } from './navigation';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import EarningsScreen from './screens/EarningsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B1220',
    card: '#151E32',
    primary: '#C9A227',
    text: '#E8EDF7',
    border: 'rgba(201,162,39,0.22)',
  },
};

export default function App() {
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    void (async () => {
      const token = await getToken();
      setAuthed(Boolean(token));
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#C9A227" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={authed ? 'Dashboard' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: '#121A2B' },
            headerTintColor: '#E0C56A',
            contentStyle: { backgroundColor: '#0B1220' },
          }}
        >
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => (
              <LoginScreen
                {...props}
                onLoggedIn={() => {
                  setAuthed(true);
                  props.navigation.replace('Dashboard');
                }}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Dashboard" options={{ title: 'Jobs' }}>
            {(props) => <DashboardScreen {...props} />}
          </Stack.Screen>
          <Stack.Screen name="JobDetail" options={{ title: 'Job' }} component={JobDetailScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Earnings" component={EarningsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
