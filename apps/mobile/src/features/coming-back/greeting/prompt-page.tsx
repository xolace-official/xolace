import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { useSheetClose } from "@/components/shared/detached-sheet";
import { Flux } from "@/components/shared/flux";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { useFixedFaces } from "@/design/fonts";
import { useScheme } from "@/design/scheme";
import { FONTS } from "@/design/type";
import { useTokenColors } from "@/lib/use-token-color";
import { WELCOME_BACK } from "../copy";
import { useWelcomeBack } from "../welcome-back-data";

const P = WELCOME_BACK.page;
const FLUX = { height: 149, sink: -2, width: 98 } as const;
const BANNER = {
	end: { x: 0.67, y: 1 },
	locations: [0, 0.55, 1],
	start: { x: 0.33, y: 0 },
} as const;
const GLYPH = 16;
const BAR = { fontSize: 14 } as const;
const TITLE = { fontSize: 25, letterSpacing: -0.625, lineHeight: 27 } as const;
const BODY = { fontSize: 15, lineHeight: 21.75 } as const;
const LABEL = { fontSize: 11.5, letterSpacing: 0.92, lineHeight: 15 } as const;
const PROMPT = {
	fontFamily: FONTS.mirror,
	fontSize: 20,
	lineHeight: 24.4,
} as const;
const WRITE = { fontSize: 17 } as const;
const PASS = { fontSize: 15 } as const;

export function PromptPage() {
	const { state, actions } = useWelcomeBack();
	const event = state.items.event;
	const close = useSheetClose();
	const mirror = useFixedFaces("mirror");
	const dark = useScheme() === "dark";
	const [fg, rose, b1, b2, b3] = useTokenColors([
		"foreground",
		dark ? "month-rose-dark" : "month-rose",
		"month-banner-1",
		"month-banner-2",
		"month-banner-3",
	]);
	if (!event) {
		return null;
	}
	const prompt = event.sessionPrompt?.trim();
	return (
		<View className="grow px-4 pt-3.5 pb-4.5">
			<View className="h-11 flex-row items-center gap-2.5">
				<PressScale
					accessibilityLabel={P.back}
					className="size-11 items-center justify-center rounded-full bg-surface-secondary"
					onPress={actions.back}
				>
					<Icon
						color={fg ?? ""}
						name={{ android: "chevron_left", ios: "chevron.left" }}
						size={GLYPH}
						weight="semibold"
					/>
				</PressScale>
				<AppText
					accessibilityRole="header"
					className="flex-1"
					color="muted"
					style={BAR}
					variant="callout"
					weight="semibold"
				>
					{P.bar}
				</AppText>
				{event.linkUrl ? (
					<PressScale
						accessibilityLabel={P.article}
						accessibilityRole="link"
						className="size-11 items-center justify-center rounded-full bg-surface-secondary"
						onPress={actions.article}
					>
						<Icon
							color={fg ?? ""}
							name={{ android: "arrow_outward", ios: "arrow.up.right" }}
							size={GLYPH}
							weight="semibold"
						/>
					</PressScale>
				) : null}
			</View>
			<LinearGradient
				className="mt-3 h-37.5 items-center justify-end overflow-hidden rounded-[26px] border-continuous"
				colors={[b1 ?? "", b2 ?? "", b3 ?? ""]}
				end={BANNER.end}
				locations={BANNER.locations}
				start={BANNER.start}
			>
				<Flux
					height={FLUX.height}
					pose="campfire"
					style={{ marginBottom: FLUX.sink }}
					width={FLUX.width}
				/>
			</LinearGradient>
			<AppText className="mx-1 mt-4" style={TITLE} variant="greeting">
				{event.title}
			</AppText>
			<AppText
				className="mx-1 mt-2"
				color="muted"
				style={BODY}
				variant="callout"
			>
				{event.body}
			</AppText>
			{prompt ? (
				<View className="mt-3.5 gap-[5px] rounded-[22px] border-continuous bg-surface-secondary px-4 pt-3.5 pb-4">
					<AppText
						className="uppercase"
						style={{ ...LABEL, color: rose }}
						variant="overline"
					>
						{P.label}
					</AppText>
					<AppText
						style={{ ...PROMPT, opacity: mirror ? 1 : 0 }}
						variant="body"
					>
						{prompt}
					</AppText>
				</View>
			) : null}
			<View className="min-h-3.5 flex-1" />
			{prompt ? (
				<PressScale
					className="h-14 items-center justify-center rounded-full bg-foreground"
					haptic={Presets.System.selection}
					onPress={() => {
						actions.write();
						close();
					}}
				>
					<AppText
						color="background"
						style={WRITE}
						variant="body"
						weight="semibold"
					>
						{P.write}
					</AppText>
				</PressScale>
			) : null}
			<PressScale
				className="mt-1 h-11 items-center justify-center"
				haptic={Presets.System.selection}
				onPress={actions.pass}
			>
				<AppText color="muted" style={PASS} variant="callout" weight="medium">
					{P.pass}
				</AppText>
			</PressScale>
		</View>
	);
}
