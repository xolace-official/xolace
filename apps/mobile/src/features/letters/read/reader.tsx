import { useHeaderHeight } from "expo-router/react-navigation";
import {
	type AccessibilityActionEvent,
	Platform,
	ScrollView,
	View,
} from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LETTERS } from "../copy";
import {
	type ReaderAction,
	type ReceivedLetter,
	readerActions,
} from "../letters-model";
import { openReport } from "../letters-routes";
import { ReadActs, ReadFooter } from "./read-acts";
import { useReaderScreen } from "./read-data";
import { ReadLetter } from "./read-letter";
import { useReaderOpen } from "./reader-open";
import { useReaderUndo } from "./reader-undo";
import { useSealedInView } from "./sealed-in-view";
import { UndoPill } from "./undo-pill";

const UNDER_HEADER = 8;

export function Reader({
	letter,
	reduced,
}: {
	letter: ReceivedLetter;
	reduced: boolean;
}) {
	const reader = useReaderScreen();
	const headerH = useHeaderHeight();
	const top = (Platform.OS === "ios" ? headerH : 0) + UNDER_HEADER;
	const u = useReaderUndo(reader);
	const { buttonRef, open, sealed, words } = useReaderOpen({
		letter,
		open: reader.actions.open,
		reduced,
	});
	const inView = useSealedInView(sealed, top);
	const report = () => openReport(letter.id);

	const r = LETTERS.read;
	const LABEL: Record<ReaderAction, string> = {
		acknowledge: r.acknowledge,
		hide: r.hide,
		report: r.report,
		undo: r.undo,
		unhide: r.unhide,
	};
	const actions = readerActions({ ...u, sealed }).map((name) => ({
		label: LABEL[name],
		name,
	}));
	const run: Record<ReaderAction, () => void> = {
		acknowledge: u.acknowledge,
		hide: u.hide,
		report,
		undo: u.undoIt,
		unhide: u.unhide,
	};
	const isAction = (name: string): name is ReaderAction =>
		Object.hasOwn(run, name);
	const onAction = (e: AccessibilityActionEvent) => {
		const name = e.nativeEvent.actionName;
		if (isAction(name)) {
			run[name]();
		}
	};
	const showActs = !sealed && u.undo === null;

	return (
		<>
			<ScrollView
				contentContainerClassName="grow pb-6"
				contentContainerStyle={{ paddingTop: top }}
				contentInsetAdjustmentBehavior="never"
				onLayout={inView.onViewport}
				ref={inView.ref}
				scrollEnabled={!sealed}
			>
				<AppText
					className="mx-6 mb-[22px] text-center"
					color="muted"
					variant="detail"
				>
					{LETTERS.fixedLine}
				</AppText>
				<ReadLetter
					actions={actions}
					hiding={u.undo === "hide"}
					onAction={onAction}
					onCommit={open}
					onLayout={inView.onLetter}
					reduced={reduced}
					sealed={sealed}
					stamped={u.acknowledged}
					text={letter.text}
					wordsRef={words}
				/>
				<ReadActs
					acknowledged={u.acknowledged}
					hidden={u.hidden}
					onAcknowledge={u.acknowledge}
					onHide={u.hide}
					onReport={report}
					onUnhide={u.unhide}
					reduced={reduced}
					show={showActs}
				/>
				<View className="grow" />
				<ReadFooter reduced={reduced} show={showActs} />
			</ScrollView>
			{sealed ? (
				<View className="px-4 pt-3 pb-safe-offset-4">
					<PressScale
						accessibilityRole="button"
						className="min-h-[50px] items-center justify-center rounded-full bg-foreground py-2"
						onPress={open}
						ref={buttonRef}
					>
						<AppText color="background" variant="body" weight="semibold">
							{r.open}
						</AppText>
					</PressScale>
				</View>
			) : null}
			{u.undo ? (
				<UndoPill
					key={u.undo}
					label={u.undo === "ack" ? r.undoAcknowledged : r.undoHidden}
					onUndo={u.undoIt}
					reduced={reduced}
				/>
			) : null}
		</>
	);
}
