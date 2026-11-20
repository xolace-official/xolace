import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { QuoteIcon } from "../chrome/quote-icons";
import { type InkPalette, useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import type { QuoteBackground } from "../quotes-model";
import { tileVeilOf } from "../quotes-palette";
import { POSTER_SEMI } from "../stage/quote-type";
import { BackgroundLayer } from "./background-layer";

export const TILE = { gap: 10, h: 136, radius: 20, ring: 2.5, w: 92 } as const;

export function BackgroundTile({
	background: b,
	ink,
	on,
	locked,
	play,
	onPress,
}: {
	background: QuoteBackground;
	ink: InkPalette;
	on: boolean;
	locked: boolean;
	play: boolean;
	onPress: () => void;
}) {
	const q = useQuoteInk();
	const tileInk = q.inks[b.ink];
	const veil = tileVeilOf(b);
	return (
		<Pressable
			accessibilityLabel={
				b.plus ? QUOTE_COPY.accessibility.plusTile(b.name) : b.name
			}
			accessibilityRole="button"
			accessibilityState={{ selected: on }}
			className="items-center gap-[7px]"
			onPress={onPress}
			style={{ width: TILE.w }}
		>
			<View>
				<View
					className="items-center justify-center overflow-hidden border-continuous"
					style={{ borderRadius: TILE.radius, height: TILE.h, width: TILE.w }}
				>
					<BackgroundLayer background={b} play={play} />
					{veil && (
						<View
							className="absolute inset-0"
							style={{ backgroundColor: veil }}
						/>
					)}
					<View
						className="absolute inset-0 border-[0.5px] border-white/18"
						style={{ borderRadius: TILE.radius }}
					/>
					<AppText
						allowFontScaling={false}
						className="text-[22px]"
						style={{ color: tileInk.text, fontFamily: POSTER_SEMI }}
						variant="poster"
					>
						Aa
					</AppText>
					{on && (
						<View className="absolute top-[7px] left-[7px] size-5.5 items-center justify-center rounded-full bg-white">
							<QuoteIcon
								color={q.keptPillInk}
								name="check"
								size={12}
								stroke={3.2}
							/>
						</View>
					)}
					{b.kind === "loop" && (
						<View className="absolute top-[7px] right-[7px] size-5.5 items-center justify-center rounded-full bg-black/35">
							<QuoteIcon color={q.keptInk} name="loopBadge" size={9} />
						</View>
					)}
					{b.plus && (
						<View
							className="absolute right-[7px] bottom-[7px] h-[17px] min-w-[17px] items-center justify-center rounded-[9px] px-1"
							style={{ backgroundColor: q.plus, opacity: locked ? 1 : 0.85 }}
						>
							<AppText
								className="text-[11px] leading-[17px]"
								style={{ color: q.plusInk }}
								variant="caption"
								weight="bold"
							>
								+
							</AppText>
						</View>
					)}
				</View>
				{on && (
					<View
						className="absolute border-continuous"
						pointerEvents="none"
						style={{
							borderColor: ink.sheetText,
							borderRadius: TILE.radius + TILE.ring,
							borderWidth: TILE.ring,
							bottom: -TILE.ring,
							left: -TILE.ring,
							right: -TILE.ring,
							top: -TILE.ring,
						}}
					/>
				)}
			</View>
			<AppText
				center
				className="text-[12px]"
				numberOfLines={2}
				style={{ color: on ? ink.sheetText : ink.sheetText2 }}
				variant="caption"
				weight="semibold"
			>
				{b.name}
			</AppText>
		</Pressable>
	);
}
