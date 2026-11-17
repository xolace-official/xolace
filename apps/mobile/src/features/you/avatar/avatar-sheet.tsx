import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import {
	DetachedSheet,
	useSheetClose,
} from "@/components/shared/detached-sheet";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { useAvatar } from "@/features/you/avatar/avatar-data";
import { type AvatarOption, isLocked } from "@/features/you/avatar-model";
import { COPY } from "@/features/you/copy";
import { useTokenColor } from "@/lib/use-token-color";

/** The avatar sheet: a floating sheet over You. */
export function AvatarSheet() {
	return (
		<DetachedSheet>
			<AvatarPicker />
		</DetachedSheet>
	);
}

/** Production's picker in the board's layout: the current one and the line, then a grid of
 * the catalog, five across, Xolace+ ones locked for free users. No photo. A pick closes it. */
function AvatarPicker() {
	const { state, actions } = useAvatar();
	const close = useSheetClose();
	const { avatars, current, isPlus } = state;
	// The line explains the locks, so it shows only when one is drawn.
	const anyLocked = avatars?.some((a) => isLocked(a, isPlus)) ?? false;
	const pick = (avatar: AvatarOption) => {
		if (actions.pick(avatar)) {
			close();
		}
	};
	return (
		<View accessibilityLabel={COPY.avatar.sheet} className="px-5 pt-2.5 pb-6">
			<View className="mb-3 h-1.25 w-9 self-center rounded-[3px] bg-separator" />
			<View className="flex-row items-center gap-3.5">
				{current ? (
					<Image
						className="size-16 rounded-full"
						source={{ uri: current.url }}
					/>
				) : (
					<View className="size-16 rounded-full bg-surface-secondary" />
				)}
				<View className="flex-1">
					<AppText
						accessibilityRole="header"
						className="text-[20px] leading-[25px]"
						variant="headline"
					>
						{COPY.avatar.title}
					</AppText>
					<AppText
						className="mt-0.5 text-[13px] leading-[17.5px]"
						color="muted"
						variant="footnote"
					>
						{COPY.avatar.sub}
					</AppText>
				</View>
			</View>
			<View className="mt-4 flex-row flex-wrap justify-between gap-y-2.5">
				{avatars?.map((a) => (
					<Choice
						avatar={a}
						key={a.key}
						locked={isLocked(a, isPlus)}
						on={a.key === current?.key}
						onPress={() => pick(a)}
					/>
				))}
			</View>
			{anyLocked ? (
				<AppText
					className="mt-3.5 text-[12.5px] leading-[18px]"
					color="subtle"
					variant="footnote"
				>
					{COPY.avatar.lock}
				</AppText>
			) : null}
		</View>
	);
}

function Choice({
	avatar,
	locked,
	on,
	onPress,
}: {
	avatar: AvatarOption;
	locked: boolean;
	on: boolean;
	onPress: () => void;
}) {
	// The page colour on ember, as the week's flame.
	const onEmber = useTokenColor("background");
	return (
		<PressScale
			accessibilityLabel={COPY.avatar.label(avatar.label, locked)}
			accessibilityRole="button"
			accessibilityState={{ selected: on }}
			className="aspect-square w-[18%]"
			onPress={onPress}
		>
			{on ? (
				<View className="absolute -inset-1 rounded-full border-2 border-accent" />
			) : null}
			<Image
				className="size-full rounded-full"
				contentFit="cover"
				recyclingKey={avatar.key}
				source={{ uri: avatar.url }}
			/>
			{locked ? (
				<View className="absolute -right-0.5 -bottom-0.5 size-4.5 items-center justify-center rounded-full bg-ember">
					<Icon
						color={onEmber}
						name={{ android: "lock", ios: "lock.fill" }}
						size={9}
					/>
				</View>
			) : null}
		</PressScale>
	);
}
