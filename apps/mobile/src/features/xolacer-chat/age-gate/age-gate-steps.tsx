import { type Href, useRouter } from "expo-router";
import type { SymbolViewProps } from "expo-symbols";
import { BottomSheet, Button } from "heroui-native";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Fact } from "@/features/xolacer-chat/components/fact-row";
import { playSoftPress } from "@/lib/haptics";
import { DateOfBirthPicker } from "./date-of-birth-picker";

function Heading({ title, body }: { title: string; body: string }) {
	return (
		<View className="gap-2 pr-10 pb-5">
			<BottomSheet.Title className="text-left font-semibold text-[22px] text-foreground">
				{title}
			</BottomSheet.Title>
			<BottomSheet.Description className="text-left text-[14px] text-muted leading-5">
				{body}
			</BottomSheet.Description>
		</View>
	);
}

/** The question itself. The copy says why, never where the lines are, so the screen doesn't
 * teach which year to pick. */
export function AskStep({
	value,
	onChange,
	onContinue,
	onDecline,
	saving,
}: {
	value: string | null;
	onChange: (dateOfBirth: string) => void;
	onContinue: () => void;
	onDecline: () => void;
	saving: boolean;
}) {
	return (
		<View>
			<Heading
				body="It decides who you can be matched with."
				title="When were you born?"
			/>
			<DateOfBirthPicker onChange={onChange} value={value} />
			<AppText className="pt-3 pb-6 text-[12px] text-muted leading-4">
				Kept private. Xolacers never see it.
			</AppText>
			<View className="gap-2">
				<Button isDisabled={!value || saving} onPress={onContinue}>
					{saving ? "Saving…" : "Continue"}
				</Button>
				<Button isDisabled={saving} onPress={onDecline} variant="ghost">
					Prefer not to say
				</Button>
			</View>
		</View>
	);
}

const ALTERNATIVES: {
	id: string;
	icon: SymbolViewProps["name"];
	label: string;
	href: Href;
}[] = [
	{
		href: "/kindling",
		icon: {
			android: "local_fire_department",
			ios: "flame",
			web: "local_fire_department",
		},
		id: "kindling",
		label: "Kindling: a few small things to try, picked for you",
	},
	{
		href: "/browse/library",
		icon: { android: "menu_book", ios: "book", web: "menu_book" },
		id: "library",
		label: "The Library: stories and guides from people who've been there",
	},
	{
		href: "/crisis-resources?from=xolacer_age_gate",
		icon: { android: "support", ios: "lifepreserver", web: "support" },
		id: "crisis",
		label: "Need someone now? Crisis lines, any time",
	},
];

const REFUSALS = {
	declined: {
		body: "Without a date of birth we can't match you with a Xolacer. You can add it next time you ask to talk.",
		title: "No problem",
	},
	not_available: {
		body: "Talking with a Xolacer is for people 18 and over. There's still plenty here for you.",
		title: "Xolacer chats aren't open to you yet",
	},
	under_13: {
		body: "So we can't open Xolacer chats for you. If things feel heavy right now, someone at a crisis line can help.",
		title: "Xolace is for people 13 and over",
	},
} as const;

/** Where an answer that isn't "adult" leads: something else to do, never a dead end. */
export function RefusalStep({
	step,
	onClose,
}: {
	step: keyof typeof REFUSALS;
	onClose: () => void;
}) {
	const router = useRouter();
	const copy = REFUSALS[step];
	// Under 13 gets the crisis line only: Kindling and the Library are part of the app they're
	// too young for.
	const options =
		step === "under_13"
			? ALTERNATIVES.filter((a) => a.id === "crisis")
			: ALTERNATIVES;
	return (
		<View>
			<Heading body={copy.body} title={copy.title} />
			<View className="gap-4 pb-7">
				{options.map((option) => (
					<Pressable
						accessibilityRole="link"
						key={option.id}
						onPress={() => {
							playSoftPress();
							onClose();
							router.push(option.href);
						}}
					>
						<Fact icon={option.icon}>{option.label}</Fact>
					</Pressable>
				))}
			</View>
			<Button onPress={onClose} variant="secondary">
				OK
			</Button>
		</View>
	);
}
