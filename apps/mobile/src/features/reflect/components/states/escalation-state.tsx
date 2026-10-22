import { useEffect, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/src/components/shared/app-text";
import type { Resource } from "@/src/features/crisis-resources/types";
import { removeEmDash } from "@/src/features/quotes/utils/text-utils";
import { playAffirmativePress, playSoftPress } from "@/src/lib/haptics";

type Props = {
	mirror: string;
	resources: (string | Resource)[] | null;
	onEngage: () => Promise<void>;
	onDismiss: () => Promise<void>;
	onContinue: () => Promise<void>;
};

const EASING: [number, number, number, number] = [0.455, 0.03, 0.515, 0.955];
const EASE_INITIAL_FADE = { opacity: 0 };
const EASE_ANIMATE_FADE = { opacity: 1 };
const EASE_INITIAL_SLIDE = { opacity: 0, translateY: 20 };
const EASE_ANIMATE_SLIDE = { opacity: 1, translateY: 0 };
const EASE_RESOURCES_HEADER = {
	duration: 400,
	easing: EASING,
	type: "timing" as const,
};
const EASE_PROMPT_MIRROR = {
	delay: 200,
	duration: 600,
	easing: EASING,
	type: "timing" as const,
};
const EASE_PROMPT_MSG = {
	delay: 600,
	duration: 800,
	easing: EASING,
	type: "timing" as const,
};
const EASE_ENGAGE_BTN = {
	delay: 1200,
	duration: 500,
	easing: EASING,
	type: "timing" as const,
};
const EASE_DISMISS_BTN = {
	delay: 1400,
	duration: 500,
	easing: EASING,
	type: "timing" as const,
};

function ResourceItem({
	resource,
	index,
}: {
	resource: string | Resource;
	index: number;
}) {
	const delay = 400 + index * 150;
	const transition = {
		delay,
		duration: 500,
		easing: EASING,
		type: "timing" as const,
	};

	if (typeof resource === "string") {
		return (
			<EaseView
				animate={EASE_ANIMATE_SLIDE}
				initialAnimate={EASE_INITIAL_SLIDE}
				transition={transition}
			>
				<View className="rounded-xl border border-foreground/10 bg-surface px-4 py-3.5">
					<AppText className="font-light text-foreground/70 text-sm">
						{resource}
					</AppText>
				</View>
			</EaseView>
		);
	}

	const isTappable =
		resource.type === "phone" ||
		resource.type === "url" ||
		resource.type === "email";

	const handlePress = () => {
		playSoftPress();
		if (resource.type === "phone") {
			Linking.openURL(`tel:${resource.value}`);
		} else if (resource.type === "url") {
			Linking.openURL(resource.value);
		} else if (resource.type === "email") {
			Linking.openURL(`mailto:${resource.value}`);
		}
	};

	const isXolace = resource.source === "xolace_support";

	const inner = (
		<View
			className={`rounded-xl border px-4 py-3.5 ${isXolace ? "border-accent/30 bg-accent/10" : "border-foreground/10 bg-surface"}`}
		>
			<View className="flex-row items-center justify-between">
				<AppText
					className={`flex-1 text-sm ${isXolace ? "text-accent" : "text-foreground"}`}
				>
					{resource.label}
				</AppText>
				{isTappable && (
					<AppText
						className={`ml-3 text-xs ${isXolace ? "text-accent/70" : "text-accent"}`}
					>
						{resource.type === "phone"
							? resource.value
							: resource.type === "email"
								? resource.value
								: "Open →"}
					</AppText>
				)}
			</View>
			{resource.description && (
				<AppText className="mt-0.5 font-light text-foreground/40 text-xs">
					{resource.description}
				</AppText>
			)}
			{resource.type === "text" && (
				<AppText className="mt-1 font-light text-foreground/65 text-xs">
					{resource.value}
				</AppText>
			)}
		</View>
	);

	return (
		<EaseView
			animate={EASE_ANIMATE_SLIDE}
			initialAnimate={EASE_INITIAL_SLIDE}
			transition={transition}
		>
			{isTappable ? (
				<Pressable
					accessibilityLabel={resource.label}
					accessibilityRole="button"
					onPress={handlePress}
				>
					{inner}
				</Pressable>
			) : (
				inner
			)}
		</EaseView>
	);
}

export const EscalationState = ({
	mirror,
	resources,
	onEngage,
	onDismiss,
	onContinue,
}: Props) => {
	const [phase, setPhase] = useState<"prompt" | "resources">("prompt");

	useEffect(() => {
		Presets.peal();
	}, []);

	const seenTransition = {
		delay: 400 + (resources?.length ?? 0) * 150,
		duration: 500,
		easing: EASING,
		type: "timing" as const,
	};

	if (phase === "resources") {
		return (
			<View className="flex-1 justify-center px-7">
				<EaseView
					animate={EASE_ANIMATE_FADE}
					className="mb-5"
					initialAnimate={EASE_INITIAL_FADE}
					transition={EASE_RESOURCES_HEADER}
				>
					<AppText className="mb-1 text-foreground/20 text-xs uppercase tracking-widest">
						Support resources
					</AppText>
					<AppText className="font-light text-base text-foreground/65 leading-7">
						These are here whenever you need them.
					</AppText>
				</EaseView>

				<View className="mb-6 gap-2.5">
					{(resources ?? []).map((resource, i) => (
						// eslint-disable-next-line react/no-array-index-key
						<ResourceItem index={i} key={i} resource={resource} />
					))}
				</View>

				<EaseView
					animate={EASE_ANIMATE_SLIDE}
					initialAnimate={EASE_INITIAL_SLIDE}
					transition={seenTransition}
				>
					<Pressable
						accessibilityLabel="I've seen these"
						accessibilityRole="button"
						className="rounded-xl border border-warning/30 bg-warning/10 px-6 py-3.5"
						onPress={async () => {
							playAffirmativePress();
							await onContinue();
						}}
					>
						<AppText className="text-sm text-warning">
							I&apos;ve seen these
						</AppText>
					</Pressable>
				</EaseView>
			</View>
		);
	}

	return (
		<View className="flex-1 justify-center px-7">
			<EaseView
				animate={EASE_ANIMATE_FADE}
				initialAnimate={EASE_INITIAL_FADE}
				transition={EASE_PROMPT_MIRROR}
			>
				<AppText className="mb-2 text-foreground/20 text-xs uppercase tracking-widest">
					Your mirror
				</AppText>
				<AppText
					className="mb-6 text-base text-foreground/30 italic leading-7"
					selectable
				>
					&ldquo;{removeEmDash(mirror)}&rdquo;
				</AppText>
			</EaseView>

			<EaseView
				animate={EASE_ANIMATE_FADE}
				className="mb-8 border-warning border-l-2 pl-4"
				initialAnimate={EASE_INITIAL_FADE}
				transition={EASE_PROMPT_MSG}
			>
				<AppText className="mb-3 font-light text-base text-foreground leading-7">
					I hear you. What you&apos;re carrying right now sounds really heavy,
					heavier than a regular tough day.
				</AppText>
				<AppText className="font-light text-base text-foreground/55 leading-7">
					There are people who are trained specifically for moments like this.
					Would you like me to help you find the right support?
				</AppText>
			</EaseView>

			<View className="gap-3">
				<EaseView
					animate={EASE_ANIMATE_SLIDE}
					initialAnimate={EASE_INITIAL_SLIDE}
					transition={EASE_ENGAGE_BTN}
				>
					<Pressable
						accessibilityLabel="Yes, show me some resources"
						accessibilityRole="button"
						className="rounded-xl border border-warning/30 bg-warning/10 px-6 py-3.5"
						onPress={async () => {
							playAffirmativePress();
							await onEngage();
							setPhase("resources");
						}}
					>
						<AppText className="text-sm text-warning">
							Yes, show me some resources
						</AppText>
					</Pressable>
				</EaseView>

				<EaseView
					animate={EASE_ANIMATE_SLIDE}
					initialAnimate={EASE_INITIAL_SLIDE}
					transition={EASE_DISMISS_BTN}
				>
					<Pressable
						accessibilityLabel="Not right now, but thank you"
						accessibilityRole="button"
						className="rounded-xl border border-foreground/10 bg-transparent px-6 py-3.5"
						onPress={async () => {
							playSoftPress();
							await onDismiss();
						}}
					>
						<AppText className="font-light text-foreground/55 text-sm">
							Not right now, but thank you
						</AppText>
					</Pressable>
				</EaseView>
			</View>
		</View>
	);
};
