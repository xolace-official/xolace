import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "./shared/app-text";

type HintRowProps = {
	title?: string;
	hint?: ReactNode;
};

export function HintRow({
	title = "Try editing",
	hint = "app/index.tsx",
}: HintRowProps) {
	return (
		<View className="flex-row justify-between">
			<AppText className="font-medium text-sm">{title}</AppText>
			<View className="rounded-lg bg-gray-300 px-2 py-0.5 dark:bg-gray-600">
				<AppText className="text-foreground">{hint}</AppText>
			</View>
		</View>
	);
}
