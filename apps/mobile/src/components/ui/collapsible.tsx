import { SymbolView } from "expo-symbols";
import { type PropsWithChildren, useState } from "react";
import { Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";

import { AppText } from "@/src/components/shared/app-text";

const CONTENT_INITIAL_ANIMATE = { opacity: 0 };
const CONTENT_ANIMATE = { opacity: 1 };
const CONTENT_EASING: [number, number, number, number] = [
	0.455, 0.03, 0.515, 0.955,
];
const CHEVRON_NAME = {
	android: "chevron_right",
	ios: "chevron.right",
	web: "chevron_right",
} as const;

export function Collapsible({
	children,
	title,
}: PropsWithChildren & { title: string }) {
	const [isOpen, setIsOpen] = useState(false);

	const chevronStyle = { transform: [{ rotate: isOpen ? "-90deg" : "90deg" }] };
	const chevronName = CHEVRON_NAME;
	const transition = {
		duration: 200,
		easing: CONTENT_EASING,
		type: "timing" as const,
	};

	return (
		<View>
			<Pressable
				className="flex-row items-center gap-2 active:opacity-70"
				onPress={() => setIsOpen((value) => !value)}
			>
				<View className="h-6 w-6 items-center justify-center rounded-xl bg-background-element">
					<SymbolView
						name={chevronName}
						size={14}
						style={chevronStyle}
						tintColor="var(--text)"
						weight="bold"
					/>
				</View>

				<AppText className="font-medium text-foreground text-sm">
					{title}
				</AppText>
			</Pressable>
			{isOpen && (
				<EaseView
					animate={CONTENT_ANIMATE}
					initialAnimate={CONTENT_INITIAL_ANIMATE}
					transition={transition}
				>
					<View className="mt-4 ml-6 rounded-2xl bg-background-element p-6">
						{children}
					</View>
				</EaseView>
			)}
		</View>
	);
}
