import { useState } from "react";
import { View } from "react-native";
import { SettingsDialog } from "@/components/settings-kit/settings-dialog";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { useToday } from "../today-data";

const TOP = 14;
const FLAME = 14;

export function RekindlePill({ height }: { height: number }) {
	const { state, actions } = useToday();
	const emberInk = useTokenColor("ember-ink");
	const [open, setOpen] = useState(false);
	const offer = state.rekindle;

	return (
		<View style={{ height }}>
			{offer ? (
				<PressScale
					accessibilityLabel={COPY.rekindle.label(offer.streak)}
					accessibilityRole="button"
					accessibilityState={{ busy: offer.busy, disabled: offer.busy }}
					className="self-start"
					disabled={offer.busy}
					onPress={() => setOpen(true)}
					style={{ marginTop: TOP }}
				>
					{/* The wash is translucent: an opaque surface under it keeps the sky's sun from
					    shining through the words. */}
					<View className="overflow-hidden rounded-full bg-surface">
						<View className="h-9 flex-row items-center gap-1.5 bg-ember-wash px-3.5">
							<Icon
								color={emberInk}
								name={{ android: "local_fire_department", ios: "flame.fill" }}
								size={FLAME}
							/>
							<AppText
								className="shrink text-ember-ink"
								numberOfLines={1}
								variant="footnote"
							>
								{COPY.rekindle.quiet(offer.streak)}
							</AppText>
							<AppText
								className="text-ember-ink"
								variant="footnote"
								weight="semibold"
							>
								{COPY.rekindle.chip}
							</AppText>
						</View>
					</View>
				</PressScale>
			) : null}
			<SettingsDialog
				cancel={COPY.rekindle.notNow}
				desc={COPY.rekindle.desc(offer?.streak ?? 0)}
				ok={COPY.rekindle.ask}
				onCancel={() => setOpen(false)}
				onOk={() => {
					setOpen(false);
					actions.rekindle();
				}}
				open={open && offer !== null}
				title={COPY.rekindle.title}
			>
				{null}
			</SettingsDialog>
		</View>
	);
}
