import type { ReactNode } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColors } from "@/lib/use-token-color";
import { useCheckIn } from "../check-in-data";
import { CHECK_IN } from "../copy";

const R = CHECK_IN.reflective;
const OK_TRACK = "accent-success-ink";
const GLYPH = { flame: 15, seal: 16 } as const;
const MILESTONE = { fontSize: 14 } as const;
const SHARE = { fontSize: 14.5 } as const;
const NOD = { fontSize: 13.5 } as const;
const BUTTON = { fontSize: 16 } as const;

export function ReflectiveStep({
	answer,
	offer,
}: {
	answer: "lighter" | "processed";
	offer?: ReactNode;
}) {
	const { state, actions } = useCheckIn();
	const [emberInk, ember] = useTokenColors(["ember-ink", "ember"]);
	const copy = R[answer];
	return (
		<>
			{answer === "processed" ? (
				<View className="flex-row items-center gap-2 rounded-[16px] bg-ember-wash px-3.5 py-2.5">
					<Icon
						color={emberInk ?? ""}
						name={{ android: "verified", ios: "checkmark.seal.fill" }}
						size={GLYPH.seal}
					/>
					<AppText
						className="flex-1"
						color="emberInk"
						style={MILESTONE}
						variant="callout"
						weight="semibold"
					>
						{R.milestone}
					</AppText>
				</View>
			) : null}
			<TextInput
				accessibilityLabel={copy.a11y}
				className="min-h-28 rounded-tile bg-surface-secondary px-4 py-3.5 font-normal text-[15.5px] text-foreground leading-[21.7px]"
				editable={!state.saving}
				multiline
				onChangeText={actions.setNote}
				placeholder={copy.placeholder}
				placeholderTextColorClassName="accent-subtle"
				textAlignVertical="top"
				value={state.note}
			/>
			{state.careful ? null : (
				<Pressable
					accessibilityLabel={R.share}
					accessibilityRole="switch"
					accessibilityState={{ checked: state.share }}
					className="min-h-11 flex-row items-center gap-3 px-0.5"
					onPress={() => {
						Presets.System.selection();
						actions.setShare(!state.share);
					}}
				>
					<AppText className="flex-1" style={SHARE} variant="callout">
						{R.share}
					</AppText>
					<View
						importantForAccessibility="no-hide-descendants"
						pointerEvents="none"
					>
						<Switch
							ios_backgroundColorClassName="accent-foreground/16"
							trackColorOffClassName="accent-foreground/16"
							trackColorOnClassName={OK_TRACK}
							value={state.share}
						/>
					</View>
				</Pressable>
			)}
			{state.nod ? (
				<View className="flex-row items-center gap-[7px]">
					<Icon
						color={ember ?? ""}
						name={{ android: "local_fire_department", ios: "flame.fill" }}
						size={GLYPH.flame}
					/>
					<AppText
						className="shrink"
						color="emberInk"
						style={NOD}
						variant="detail"
						weight="semibold"
					>
						{state.nod}
					</AppText>
				</View>
			) : null}
			{offer}
			<View className="flex-row gap-2.5">
				<PressScale
					className="h-13.5 flex-1 items-center justify-center rounded-full bg-surface-secondary"
					disabled={state.saving}
					haptic={Presets.System.selection}
					onPress={actions.close}
				>
					<AppText
						adjustsFontSizeToFit
						className="px-3"
						numberOfLines={1}
						style={BUTTON}
						variant="body"
						weight="medium"
					>
						{R.skip}
					</AppText>
				</PressScale>
				<PressScale
					accessibilityState={{ busy: state.saving }}
					className="h-13.5 flex-[1.4] items-center justify-center rounded-full bg-foreground"
					disabled={state.saving}
					haptic={Presets.System.selection}
					onPress={actions.done}
				>
					<AppText
						color="background"
						style={BUTTON}
						variant="body"
						weight="semibold"
					>
						{state.saving ? R.saving : R.done}
					</AppText>
				</PressScale>
			</View>
		</>
	);
}
