import { Pressable, Text, View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

export const ThemeSwitcher = () => {
	const { theme, hasAdaptiveThemes } = useUniwind();

	const themes = [
		{ icon: "☀️", label: "Light", name: "light" },
		{ icon: "🌙", label: "Dark", name: "dark" },
		{ icon: "⚙️", label: "System", name: "system" },
	];
	const activeTheme = hasAdaptiveThemes ? "system" : theme;

	return (
		<View className="gap-4 p-4">
			<Text className="text-gray-600 text-sm dark:text-gray-300">
				Current: {activeTheme}
			</Text>

			<View className="flex-row gap-2">
				{themes.map((t) => (
					<Pressable
						className={`items-center rounded-lg px-4 py-3 ${
							activeTheme === t.name
								? "bg-blue-500"
								: "bg-gray-200 dark:bg-gray-700"
						}
            `}
						key={t.name}
						onPress={() =>
							Uniwind.setTheme(t.name as "light" | "dark" | "system")
						}
					>
						<Text className="mb-1 text-2xl">{t.icon}</Text>
						<Text
							className={`text-xs ${
								activeTheme === t.name
									? "text-white"
									: "text-gray-900 dark:text-white"
							}`}
						>
							{t.label}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);
};
