import { useState } from "react";
import { ActivityIndicator, PixelRatio, View } from "react-native";
import { SheetButton } from "@/components/settings-kit/sheet-button";
import { SwitchRow } from "@/components/settings-kit/switch-row";
import { AppText } from "@/components/shared/app-text";
import { DetachedSheet } from "@/components/shared/detached-sheet";
import { useFixedFaces } from "@/design/fonts";
import { COPY } from "@/features/achievements/copy";
import { BadgeCard } from "@/features/achievements/share/badge-card";
import { BADGE_CARD_REF } from "@/features/achievements/share/badge-card-file";
import {
	CARD,
	type BadgeCard as Card,
	captureScale,
} from "@/features/achievements/share/badge-card-model";
import { useBadgeShareSheet } from "@/features/achievements/share/badge-share-data";

const PREVIEW = 0.78;
const OFFSCREEN = -10_000;

export function BadgeShareSheet() {
	return (
		<DetachedSheet>
			<BadgeShareBody />
		</DetachedSheet>
	);
}

function BadgeShareBody() {
	const { state } = useBadgeShareSheet();
	const fonts = useFixedFaces("poster", "poster-medium", "poster-semi");
	return (
		<View className="px-5 pt-2.5 pb-6">
			<View className="mb-3 h-1.25 w-9 self-center rounded-[3px] bg-separator" />
			<AppText
				accessibilityRole="header"
				center
				className="mb-4 text-[20px] leading-[25px]"
				variant="headline"
			>
				{COPY.card.title}
			</AppText>
			{state.card && fonts ? (
				<Ready card={state.card} />
			) : (
				<Waiting gone={state.card === null} />
			)}
		</View>
	);
}

function Ready({ card }: { card: Card }) {
	const { state, actions } = useBadgeShareSheet();
	const [artLoaded, setArtLoaded] = useState(false);
	const ready = artLoaded || card.art.source === null;
	return (
		<>
			<View
				className="self-center overflow-hidden rounded-[18px] border-continuous shadow-card"
				style={{ height: CARD.height * PREVIEW, width: CARD.width * PREVIEW }}
			>
				<BadgeCard card={card} scale={PREVIEW} />
			</View>
			{state.name ? (
				<View className="mt-3">
					<SwitchRow
						a11y={COPY.card.includeNameHint(state.name)}
						label={COPY.card.includeName}
						onChange={actions.setIncludeName}
						value={state.includeName}
					/>
				</View>
			) : null}
			<View className="mt-3">
				<SheetButton
					busy={state.sharing}
					disabled={!ready}
					label={COPY.card.share}
					onPress={actions.share}
					primary
				/>
			</View>
			<View
				accessibilityElementsHidden
				className="absolute top-0"
				importantForAccessibility="no-hide-descendants"
				pointerEvents="none"
				style={{ left: OFFSCREEN }}
			>
				<BadgeCard
					card={card}
					onArtLoad={() => setArtLoaded(true)}
					ref={BADGE_CARD_REF}
					scale={captureScale(PixelRatio.get())}
				/>
			</View>
		</>
	);
}

function Waiting({ gone }: { gone: boolean }) {
	return (
		<View
			className="items-center justify-center"
			style={{ height: CARD.height * PREVIEW }}
		>
			{gone ? (
				<AppText center color="muted" variant="body">
					{COPY.badge.gone}
				</AppText>
			) : (
				<ActivityIndicator
					accessibilityLabel={COPY.card.loading}
					colorClassName="accent-muted"
				/>
			)}
		</View>
	);
}
