import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS, FONTS, fontSize } from '@/lib/theme';

// Text-based icons following typewriter aesthetic
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: focused ? COLORS.text : COLORS.textMuted,
    }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.background,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        height: 60,
        paddingTop: 8,
      },
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="[home]" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="[lib]" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="[me]" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
