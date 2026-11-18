import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Aura } from "@/components/shared/aura";
import { useTokenColor } from "@/lib/use-token-color";
import { Tag } from "../parts/chips";
import { XolacerAvatar } from "../parts/xolacer-avatar";
import { ExpandableAvatar } from "./expandable-avatar";
import { useXolacerScreen } from "./xolacer-data";

const AVATAR = 116;
const AURA = { height: 360, left: -60, top: -140, width: 520 };
const AURA_OPACITY = 0.4;

/** The light behind the page (the prototype's lilac glow, held still). */
export function ProfileAura() {
	const lilac = useTokenColor("lilac");
	return (
		<Aura
			driftMs={0}
			height={AURA.height}
			stops={[
				{ color: lilac, offset: 0, opacity: AURA_OPACITY },
				{ color: lilac, offset: 1, opacity: 0 },
			]}
			style={{ left: AURA.left, position: "absolute", top: AURA.top }}
			width={AURA.width}
		/>
	);
}

/** Who they are, in front of you before you ask: the photo (tap to see it whole), the name, the
 * rating and presence, their own words and what they listen to. */
export function ProfileHero() {
	const { state } = useXolacerScreen();
	if (state.phase !== "ready") {
		return null;
	}
	const { view } = state;
	return (
		<View className="items-center gap-2.5 px-7 pt-2">
			<ExpandableAvatar name={view.name} photoUrl={state.photoUrl}>
				<View className="rounded-full border-4 border-surface">
					<XolacerAvatar
						id={state.id}
						muted={state.muted}
						name={view.name}
						online={state.present}
						photoUrl={state.photoUrl}
						size={AVATAR}
					/>
				</View>
			</ExpandableAvatar>
			<AppText
				accessibilityLabel={view.nameA11y}
				accessibilityRole="header"
				center
				className="text-[30px]"
				variant="title"
			>
				{view.name}
			</AppText>
			<View className="items-center gap-0.5">
				<AppText
					accessibilityLabel={view.ratedA11y}
					center
					className="text-[13.5px]"
					color="muted"
					variant="footnote"
				>
					{view.ratedLine}
				</AppText>
				<AppText center color="muted" variant="caption">
					{view.sinceLine}
				</AppText>
			</View>
			<AppText
				center
				className="text-[16.5px] leading-[25px]"
				variant="subhead"
			>
				{`“${view.quote}”`}
			</AppText>
			{view.tags.length ? (
				<View className="flex-row flex-wrap justify-center gap-1.5">
					{view.tags.map((tag) => (
						<Tag key={tag} label={tag} />
					))}
				</View>
			) : null}
		</View>
	);
}
