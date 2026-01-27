import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

// Text-based icons following typewriter aesthetic - using single chars to prevent wrapping
function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  const { colors, fontSize } = useTheme();
  return (
    <Text style={{
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: focused ? colors.text : colors.textMuted,
    }}>
      {symbol}
    </Text>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
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
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.textMuted,
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
        name="collection"
        options={{
          title: 'col',
          tabBarIcon: ({ focused }) => <TabIcon symbol="*" focused={focused} />,
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
