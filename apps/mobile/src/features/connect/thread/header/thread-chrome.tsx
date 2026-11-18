import BlockIcon from "@expo/material-symbols/block.xml";
import FlagIcon from "@expo/material-symbols/flag.xml";
import HelpIcon from "@expo/material-symbols/health_and_safety.xml";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import StarIcon from "@expo/material-symbols/star.xml";
import { Stack } from "expo-router";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { XolacerAvatar } from "../../parts/xolacer-avatar";
import { THREAD } from "../copy";
import { useThreadScreen } from "../thread-data";
import type { ThreadConversation } from "../thread-model";

const IOS = process.env.EXPO_OS === "ios";
const AVATAR = 38;

/** The header's title slot: avatar, name and where things stand. A seeker taps it for the
 * Xolacer's profile; a Xolacer looking at a seeker has nowhere to go. Props, not the provider:
 * the native header renders it outside the screen's tree. */
export function ThreadTitle({
	conversation: c,
	subtitle,
	onOpenProfile,
}: {
	conversation: ThreadConversation;
	subtitle: string;
	onOpenProfile: () => void;
}) {
	const identity = (
		<View className="flex-row items-center gap-2.5">
			<XolacerAvatar
				id={c.counterpartProfileId}
				muted={c.status !== "open"}
				name={c.counterpartName}
				photoUrl={c.counterpartPhotoUrl}
				size={AVATAR}
			/>
			<View className="min-w-0 shrink">
				<AppText
					className="text-[17px]"
					numberOfLines={1}
					variant="subhead"
					weight="semibold"
				>
					{c.counterpartName}
				</AppText>
				<AppText
					accessibilityLiveRegion="polite"
					className="text-[12.5px]"
					color="muted"
					numberOfLines={1}
					variant="caption"
				>
					{subtitle}
				</AppText>
			</View>
		</View>
	);
	if (c.role !== "user") {
		return identity;
	}
	return (
		<PressScale
			accessibilityLabel={`${THREAD.viewProfile(c.counterpartName)}. ${subtitle}`}
			onPress={onOpenProfile}
		>
			{identity}
		</PressScale>
	);
}

/** Right of the title: help, always one tap away (the prototype's lifebuoy, production's crisis
 * resources), then Rate, Report and Block. Block is mounted only when it can act, never
 * `hidden`: a hidden item eats touches on Android. */
export function ThreadToolbar() {
	const { state, actions } = useThreadScreen();
	const danger = useTokenColor("danger-ink");
	const ready = state.phase === "ready";
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityLabel={THREAD.help}
				icon={IOS ? "lifepreserver" : HelpIcon}
				onPress={actions.openHelp}
				separateBackground
				tintColor={danger}
			/>
			{ready ? (
				<Stack.Toolbar.Menu
					accessibilityLabel={THREAD.more}
					icon={IOS ? "ellipsis" : MoreVert}
				>
					{state.rate === "hidden" ? null : (
						<Stack.Toolbar.MenuAction
							icon={IOS ? "star" : StarIcon}
							onPress={actions.rate}
						>
							{state.rate === "prompt"
								? THREAD.menu.rate
								: THREAD.menu.changeRating}
						</Stack.Toolbar.MenuAction>
					)}
					<Stack.Toolbar.MenuAction
						icon={IOS ? "flag" : FlagIcon}
						onPress={actions.report}
					>
						{THREAD.menu.report}
					</Stack.Toolbar.MenuAction>
					<Stack.Toolbar.MenuAction
						destructive
						icon={IOS ? "hand.raised" : BlockIcon}
						onPress={actions.askBlock}
					>
						{THREAD.menu.block}
					</Stack.Toolbar.MenuAction>
				</Stack.Toolbar.Menu>
			) : null}
		</Stack.Toolbar>
	);
}

/** Block asks first: it can't be undone. */
export function BlockDialog() {
	const { state, actions } = useThreadScreen();
	if (state.phase !== "ready") {
		return null;
	}
	const { blocking } = state;
	return (
		<ConfirmationDialog
			confirmLabel={THREAD.blockDialog.confirm}
			description={
				blocking.history
					? THREAD.blockDialog.bodyHistory
					: THREAD.blockDialog.body
			}
			isDestructive
			isLoading={blocking.pending}
			isOpen={blocking.open}
			onConfirm={actions.confirmBlock}
			onOpenChange={(open) => {
				if (!open) {
					actions.cancelBlock();
				}
			}}
			title={THREAD.blockDialog.title}
		/>
	);
}
