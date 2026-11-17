import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { FONTS } from "@/design/type";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { SitCta } from "../cta/sit-cta";
import { useSwapSheet } from "./swap-data";

/** Board `.sh h3`: Bricolage 24/740, −.02em (700 is the loaded cut). */
const TITLE = {
	fontFamily: FONTS.displayBold,
	fontSize: 24,
	letterSpacing: -0.48,
	lineHeight: 28,
} as const;
const MIN_BOTTOM = 22;
/** Two option rows hold their space until the options are in, so the sheet measures once. */
const PLACEHOLDERS = ["simpler", "other"] as const;
const CHEVRON = { android: "chevron_right", ios: "chevron.right" } as const;

/**
 * Something else? (board card 06): a form sheet with one detent and a
 * grabber. fix: the exercise waits while it's open (production kept playing
 * behind it), and "Try something simpler" is hidden while Three breaths plays.
 * Two swaps at most; a swap starts the new exercise at its first beat.
 */
export function SwapSheetView() {
	const { state, actions } = useSwapSheet();
	const subtle = useTokenColor("subtle");
	const insets = useSafeAreaInsets();
	return (
		<View
			className="gap-2.5 px-4.5 pt-5.5"
			style={{ paddingBottom: Math.max(insets.bottom, MIN_BOTTOM) }}
		>
			<AppText
				accessibilityRole="header"
				className="mx-1"
				style={TITLE}
				variant="title"
			>
				{COPY.sheet.title}
			</AppText>
			<AppText className="mx-1 mb-1.5" color="muted" variant="detail">
				{COPY.sheet.sub(state.swaps)}
			</AppText>
			{state.loading
				? PLACEHOLDERS.map((key) => (
						<View
							accessibilityElementsHidden
							className="min-h-16 rounded-[22px] bg-surface-secondary"
							importantForAccessibility="no-hide-descendants"
							key={key}
							style={{ borderCurve: "continuous" }}
						/>
					))
				: state.choices.map((c) => (
						<PressScale
							accessibilityLabel={`${c.title}. ${c.sub}`}
							accessibilityState={{ disabled: state.busy }}
							className="min-h-16 flex-row items-center gap-3 rounded-[22px] bg-surface-secondary px-4 py-3"
							disabled={state.busy}
							key={c.id}
							onPress={() => actions.pick(c.id)}
							style={{ borderCurve: "continuous" }}
						>
							<View className="flex-1">
								<AppText
									className="text-[16px] leading-[21px]"
									variant="body"
									weight="semibold"
								>
									{c.title}
								</AppText>
								<AppText className="mt-0.5" color="muted" variant="detail">
									{c.sub}
								</AppText>
							</View>
							<Icon color={subtle} name={CHEVRON} size={14} weight="semibold" />
						</PressScale>
					))}
			<View className="mt-1">
				<SitCta label={COPY.sheet.keepGoing} onPress={actions.keepGoing} />
			</View>
		</View>
	);
}
