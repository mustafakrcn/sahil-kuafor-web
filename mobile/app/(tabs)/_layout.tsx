import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#c0392b',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
