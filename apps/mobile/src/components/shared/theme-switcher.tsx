import { View, Pressable, Text } from 'react-native'
import { Uniwind, useUniwind } from 'uniwind'

export const ThemeSwitcher = () => {
  const { theme, hasAdaptiveThemes } = useUniwind()

  const themes = [
    { name: 'light', label: 'Light', icon: '☀️' },
    { name: 'dark', label: 'Dark', icon: '🌙' },
    { name: 'system', label: 'System', icon: '⚙️' },
  ]
  const activeTheme = hasAdaptiveThemes ? 'system' : theme

  return (
    <View className="p-4 gap-4">
      <Text className="text-sm text-gray-600 dark:text-gray-300">
        Current: {activeTheme}
      </Text>

      <View className="flex-row gap-2">
        {themes.map((t) => (
          <Pressable
            key={t.name}
            onPress={() => Uniwind.setTheme(t.name as "light" | "dark" | "system")}
            className={`
              px-4 py-3 rounded-lg items-center
              ${activeTheme === t.name
                ? 'bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-700'
              }
            `}
          >
            <Text className="text-2xl mb-1">{t.icon}</Text>
            <Text
              className={`text-xs ${
                activeTheme === t.name
                  ? 'text-white'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}