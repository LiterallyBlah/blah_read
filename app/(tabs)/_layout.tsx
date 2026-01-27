import { Tabs } from 'expo-router';

// Colors will be imported from theme once created
const COLORS = {
  background: '#0a0a0a',
  border: '#2a2a2a',
  text: '#ffffff',
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: COLORS.background, borderTopColor: COLORS.border },
      tabBarActiveTintColor: COLORS.text,
    }}>
      <Tabs.Screen name="index" options={{ title: 'home' }} />
      <Tabs.Screen name="library" options={{ title: 'library' }} />
      <Tabs.Screen name="profile" options={{ title: 'profile' }} />
    </Tabs>
  );
}
