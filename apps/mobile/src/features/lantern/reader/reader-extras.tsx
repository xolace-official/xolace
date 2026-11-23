import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { Icon } from "@/components/shared/icon";
import { COPY } from "@/features/lantern/copy";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { REFLECT_PROMPT } from "@/features/lantern/reader/reader-model";
import { useTokenColors } from "@/lib/use-token-color";

const ICON = {
	chevron: { android: "chevron_right", ios: "chevron.right" },
	phone: { android: "call", ios: "phone" },
} as const;

export function ReflectOnThis() {
	const { state, actions } = useReaderScreen();
	const [line] = useTokenColors(["separator"]);
	return (
		<View
			className="mt-10 gap-4 rounded-[22px] bg-surface p-5"
			style={{
				borderCurve: "continuous",
				boxShadow: `0px 0px 0px 1px ${line}`,
			}}
		>
			<AppText
				className="text-[18px] leading-[24.3px]"
				variant="body"
				weight="semibold"
			>
				{state.entry.reflectPrompt ?? REFLECT_PROMPT}
			</AppText>
			<GlassButton
				className="h-11.5 items-center justify-center rounded-full"
				fill="accent"
				onPress={actions.reflect}
			>
				<AppText
					className="text-[15px] leading-[20px]"
					color="accentForeground"
					variant="callout"
					weight="semibold"
				>
					{COPY.reader.reflect}
				</AppText>
			</GlassButton>
		</View>
	);
}

export function HelplineLink() {
	const { state, actions } = useReaderScreen();
	const [muted] = useTokenColors(["muted"]);
	if (!state.showHelpline) {
		return null;
	}
	return (
		<Pressable
			accessibilityLabel={COPY.reader.helpline}
			accessibilityRole="link"
			className="mt-6 flex-row items-center gap-3 rounded-[16px] bg-surface-secondary p-4 active:opacity-70"
			onPress={actions.openHelpline}
			style={{ borderCurve: "continuous" }}
		>
			<Icon color={muted} name={ICON.phone} size={17} />
			<AppText
				className="flex-1 text-[14px] leading-[19px]"
				variant="callout"
				weight="semibold"
			>
				{COPY.reader.helpline}
			</AppText>
			<Icon color={muted} name={ICON.chevron} size={13} weight="semibold" />
		</Pressable>
	);
}

export function FireDim() {
	const { fire } = useReaderScreen().state.prefs;
	if (!fire) {
		return null;
	}
	return (
		<View
			className="absolute inset-0 bg-reader-night-bg/30"
			pointerEvents="none"
		/>
	);
}
