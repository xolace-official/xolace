import BlockIcon from "@expo/material-symbols/block.xml";
import EditIcon from "@expo/material-symbols/edit.xml";
import FlagIcon from "@expo/material-symbols/flag.xml";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import StarIcon from "@expo/material-symbols/star.xml";
import { Stack } from "expo-router";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { THREAD } from "../thread/copy";
import { PROFILE } from "./copy";
import { useXolacerScreen } from "./xolacer-data";

const IOS = process.env.EXPO_OS === "ios";

/** The header's right side: Edit on your own profile, otherwise Rate, Report and Block. Block
 * is mounted only with a conversation to block, never `hidden` (it eats touches on Android). */
export function XolacerToolbar() {
	const { state, actions } = useXolacerScreen();
	if (state.phase !== "ready") {
		return null;
	}
	if (state.isSelf) {
		return (
			<Stack.Toolbar placement="right">
				<Stack.Toolbar.Button
					accessibilityLabel={PROFILE.edit}
					icon={IOS ? "pencil" : EditIcon}
					onPress={actions.edit}
				/>
			</Stack.Toolbar>
		);
	}
	const { menu } = state;
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel={THREAD.more}
				icon={IOS ? "ellipsis" : MoreVert}
			>
				{menu && menu.rate !== "hidden" ? (
					<Stack.Toolbar.MenuAction
						icon={IOS ? "star" : StarIcon}
						onPress={actions.rate}
					>
						{menu.rate === "prompt"
							? THREAD.menu.rate
							: THREAD.menu.changeRating}
					</Stack.Toolbar.MenuAction>
				) : null}
				<Stack.Toolbar.MenuAction
					icon={IOS ? "flag" : FlagIcon}
					onPress={actions.report}
				>
					{THREAD.menu.report}
				</Stack.Toolbar.MenuAction>
				{menu?.canBlock ? (
					<Stack.Toolbar.MenuAction
						destructive
						icon={IOS ? "hand.raised" : BlockIcon}
						onPress={actions.askBlock}
					>
						{THREAD.menu.block}
					</Stack.Toolbar.MenuAction>
				) : null}
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}

export function XolacerBlockDialog() {
	const { state, actions } = useXolacerScreen();
	if (state.phase !== "ready") {
		return null;
	}
	return (
		<ConfirmationDialog
			confirmLabel={THREAD.blockDialog.confirm}
			description={
				state.blocking.history
					? THREAD.blockDialog.bodyHistory
					: THREAD.blockDialog.body
			}
			isDestructive
			isLoading={state.blocking.pending}
			isOpen={state.blocking.open}
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
