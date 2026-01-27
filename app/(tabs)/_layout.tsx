import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS, FONTS, fontSize } from '@/lib/theme';

// Text-based icons following typewriter aesthetic - using single chars to prevent wrapping
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: focused ? COLORS.text : COLORS.textMuted,
    }}>
      {symbol}
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
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontFamily: FONTS.mono,
        fontSize: 10,
        letterSpacing: 1,
      },
      tabBarActiveTintColor: COLORS.text,
      tabBarInactiveTintColor: COLORS.textMuted,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'home',
          tabBarIcon: ({ focused }) => <TabIcon symbol="~" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'lib',
          tabBarIcon: ({ focused }) => <TabIcon symbol="#" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'me',
          tabBarIcon: ({ focused }) => <TabIcon symbol="@" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
