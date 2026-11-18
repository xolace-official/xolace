import { Platform, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { DELETE_COPY as C } from "@/features/settings/privacy/copy";
import { useDeleteSheetScreen } from "@/features/settings/privacy/delete/delete-sheet-data";
import { deleteSheet } from "@/features/settings/privacy/privacy-model";
import { cn } from "@/lib/cn";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";

function Item({ text, goes }: { text: string; goes: boolean }) {
	return (
		<View className="flex-row gap-2.5">
			<View
				className={cn(
					"mt-1.75 size-1.5 rounded-full",
					goes ? "border-[1.3px] border-danger" : "bg-foreground/35"
				)}
			/>
			<AppText className="flex-1 text-[15px] leading-5" variant="body">
				{text}
			</AppText>
		</View>
	);
}

/** "Goes" or "Stays": a heading over its items, read as one list. */
function List({
	title,
	items,
	goes,
}: {
	title: string;
	items: readonly string[];
	goes: boolean;
}) {
	return (
		<View
			accessibilityRole="list"
			className={cn("gap-1.75 py-3", goes ? null : "border-separator border-t")}
		>
			<AppText
				accessibilityRole="header"
				className={cn(
					"text-[11px] leading-3.5 tracking-[1.21px]",
					goes ? "text-danger" : "text-foreground/50"
				)}
				variant="body"
				weight="bold"
			>
				{title.toUpperCase()}
			</AppText>
			{items.map((item) => (
				<Item goes={goes} key={item} text={item} />
			))}
		</View>
	);
}

/**
 * The delete sheet (board `.sh`), a native form sheet fitting its content: what goes, what stays,
 * a red button and an easy way out.
 */
export function DeleteSheetScreen() {
	const { state, actions } = useDeleteSheetScreen();
	const sheet = deleteSheet(
		state.kind,
		state.plus,
		Platform.OS === "android" ? "android" : "ios"
	);
	return (
		<View className="bg-surface px-5 pt-6.5 pb-8.5">
			<AppText
				accessibilityRole="header"
				className="text-[22px] leading-7"
				variant="title"
				weight="bold"
			>
				{sheet.title}
			</AppText>
			<AppText
				className="mt-1.5 text-[15px] text-foreground/68 leading-[21.3px]"
				variant="body"
			>
				{sheet.lead}
			</AppText>
			<View className="mt-4.5 mb-5 rounded-[18px] border-continuous bg-surface-secondary px-4 py-1">
				<List goes items={sheet.goes} title={C.goes} />
				<List goes={false} items={sheet.stays} title={C.stays} />
			</View>
			<PressScale
				accessibilityState={{ busy: state.busy }}
				className={cn(
					"h-13 items-center justify-center rounded-[16px] border-continuous bg-danger",
					state.busy ? "opacity-60" : "opacity-100"
				)}
				disabled={state.busy}
				haptic={playAffirmativePress}
				onPress={actions.confirm}
			>
				<AppText
					className="text-[17px] text-danger-foreground leading-[22px]"
					variant="body"
					weight="semibold"
				>
					{state.busy ? C.working : sheet.confirm}
				</AppText>
			</PressScale>
			<PressScale
				className="mt-1.5 h-12 items-center justify-center"
				haptic={playSoftPress}
				onPress={actions.keep}
			>
				<AppText
					className="text-[17px] text-accent leading-[22px]"
					variant="body"
					weight="medium"
				>
					{sheet.keep}
				</AppText>
			</PressScale>
		</View>
	);
}
