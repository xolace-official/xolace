import { Pressable, View } from "react-native";
import { ScopedTheme } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { type ThemeMode as Scheme, themeVariant } from "@/design/themes";
import {
	type ThemeCard as Card,
	STRIP,
} from "@/features/settings/appearance/appearance-model";
import {
	APPEARANCE_COPY as C,
	APPEARANCE_ICONS as I,
} from "@/features/settings/appearance/copy";
import { cn } from "@/lib/cn";
import { useTokenColor } from "@/lib/use-token-color";

const RADIUS = 14;
/** The active ring: 1.5 pt, 2.5 pt out, in the theme's own accent. */
const RING = 1.5;
const RING_OUT = 2.5;
const RING_AT = -(RING + RING_OUT);
const LOCK = 22;

/** A tiny Reflect screen in the scoped theme's tokens. */
function Preview({ on, locked }: { on: boolean; locked: boolean }) {
	const ink = useTokenColor("foreground");
	return (
		<View>
			{on ? (
				<View
					className="absolute border-accent border-continuous"
					pointerEvents="none"
					style={{
						borderRadius: RADIUS - RING_AT,
						borderWidth: RING,
						bottom: RING_AT,
						left: RING_AT,
						right: RING_AT,
						top: RING_AT,
					}}
				/>
			) : null}
			<View
				className="border border-continuous border-foreground/10 bg-background p-2.75"
				style={{ borderRadius: RADIUS, height: STRIP.cardH }}
			>
				<AppText
					className="text-[8.5px] text-foreground/35 leading-[11px]"
					italic
					numberOfLines={2}
					variant="body"
				>
					{C.card.kicker}
				</AppText>
				<View className="mt-1.5 mb-1.75 h-px bg-foreground/12" />
				<AppText
					className="text-[11.5px] leading-[15px]"
					variant="body"
					weight="semibold"
				>
					{C.card.title}
				</AppText>
				<View className="mt-2.25 self-start rounded-full border border-accent/40 bg-accent/12 px-1.75 py-0.5">
					<AppText
						className="text-[8.5px] text-accent leading-[11px]"
						variant="body"
						weight="medium"
					>
						{C.card.chip}
					</AppText>
				</View>
				<View className="absolute right-2.25 bottom-2.25 size-1.25 rounded-[2.5px] bg-accent/55" />
				{locked ? (
					<View
						className="absolute top-1.75 right-1.75 items-center justify-center rounded-full bg-foreground/14"
						style={{ height: LOCK, width: LOCK }}
					>
						<Icon color={ink} name={I.lock} size={11} weight="semibold" />
					</View>
				) : null}
			</View>
		</View>
	);
}

/**
 * One theme as production's little Reflect preview, drawn in its own theme (a ScopedTheme from
 * the registry) in the mode the app shows now. Plain Views: no glow, scale or snap.
 */
export function ThemeCard({
	card,
	scheme,
	onPress,
}: {
	card: Card;
	scheme: Scheme;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityLabel={card.a11y}
			accessibilityRole="radio"
			accessibilityState={{ checked: card.active }}
			className="gap-1.75"
			onPress={onPress}
			style={{ width: STRIP.cardW }}
		>
			<ScopedTheme theme={themeVariant(card.id, scheme)}>
				<Preview locked={card.locked} on={card.active} />
			</ScopedTheme>
			<AppText
				className={cn(
					"pl-0.5 text-[12.5px] leading-4",
					card.active ? "text-foreground" : "text-foreground/75"
				)}
				variant="body"
				weight={card.active ? "semibold" : "regular"}
			>
				{card.name}
			</AppText>
		</Pressable>
	);
}
