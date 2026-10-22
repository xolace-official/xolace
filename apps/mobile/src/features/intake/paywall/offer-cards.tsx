/**
 * Four of the five offers on the intake deck, each drawn as the thing itself
 * rather than as an illustration of it — miniatures of the surfaces they
 * unlock. The fifth, the voice card, is interactive and lives in
 * `voice-offer-card.tsx`.
 *
 * Five is the cap. A sixth card is a sixth thing to weigh at the exact moment
 * the user is deciding whether any of it is for them.
 */

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { View } from "react-native";

import { AppText } from "@/src/components/shared/app-text";
import {
	OFFER_MASCOT,
	OfferCard,
	OfferMock,
	OfferPill,
} from "@/src/features/intake/paywall/offer-card";
import { useTokenColor } from "@/src/features/profile/hooks/use-token-color";
import { cn } from "@/src/lib/utils";

const MUSIC_NOTE = {
	android: "music_note",
	ios: "music.note",
	web: "music_note",
} as const;
const WIND = { android: "air", ios: "wind", web: "air" } as const;
const PEOPLE = {
	android: "group",
	ios: "person.2.fill",
	web: "group",
} as const;
const CHECK = { android: "check", ios: "checkmark", web: "check" } as const;
const kindlingMascot = require("@/assets/images/flux/flux-curiosity.png");

// Real twig copy (kindling/twig-presentation.ts), not placeholder text — the
// first is always the just-finished breathing step, done; the next two are
// what a path actually hands off to next.
const KINDLING_STEPS = [
	{ done: true, symbol: WIND, title: "Sit with this" },
	{ done: false, symbol: MUSIC_NOTE, title: "Low sound for the quiet" },
	{ done: false, symbol: PEOPLE, title: "Someone who has been here" },
] as const;

/** A step row inside the mini rail — done steps get a filled check, the rest a plain glyph. */
function KindlingStepRow({
	symbol,
	title,
	done,
}: {
	symbol: SymbolViewProps["name"];
	title: string;
	done: boolean;
}) {
	// `--offer-ink` is deliberately theme-invariant and always dark (see
	// offer-card.tsx) — a done step's check always needs a light glyph on it.
	const ink = useTokenColor("offer-ink");
	return (
		<View className="flex-row items-center gap-2.5">
			<View
				className={`h-7 w-7 items-center justify-center rounded-full ${done ? "bg-offer-ink" : "bg-offer-ink/12"}`}
			>
				<SymbolView
					name={done ? CHECK : symbol}
					size={12}
					tintColor={done ? "#fff" : ink}
				/>
			</View>
			<AppText
				className={`flex-1 font-[Poppins-Medium] text-[13.5px] ${done ? "text-offer-ink/45 line-through" : "text-offer-ink"}`}
			>
				{title}
			</AppText>
		</View>
	);
}

/**
 * Card 5 — Kindling & Browse. Two distinct panels in one card: Kindling's
 * step rail (checkmark/step circles) and Browse's playback rows, each
 * keeping its own icon language so the panel boundary reads as "these are
 * two things," not just a gap between them.
 */
export function KindlingBrowseOfferCard({ width }: { width: number }) {
	const ink = useTokenColor("offer-ink");
	return (
		<OfferCard
			mascot={kindlingMascot}
			tag="Kindling & Browse"
			tint="topics"
			title="What next, after clarity?"
			width={width}
		>
			<View className="flex-1 justify-center gap-4">
				<OfferMock className="gap-2.5">
					<AppText className="font-[Poppins-Medium] text-[11px] text-offer-ink/50 uppercase tracking-widest">
						Kindling · next up
					</AppText>
					{KINDLING_STEPS.map((s) => (
						<KindlingStepRow key={s.title} {...s} />
					))}
				</OfferMock>
				<OfferMock className="gap-3">
					<AppText className="font-[Poppins-Medium] text-[11px] text-offer-ink/50 uppercase tracking-widest">
						Browse
					</AppText>
					<View className="flex-row items-center gap-3">
						<View className="h-9 w-9 items-center justify-center rounded-full bg-offer-ink/15">
							<SymbolView
								name={{ android: "pause", ios: "pause.fill", web: "pause" }}
								size={12}
								tintColor={ink}
							/>
						</View>
						<View className="flex-1">
							<AppText className="font-[Poppins-Medium] text-[14px] text-offer-ink">
								Low sound for the quiet
							</AppText>
							<AppText className="font-[Poppins-Regular] text-[12px] text-offer-ink/60">
								Music · looping
							</AppText>
						</View>
					</View>
					<View className="h-px bg-offer-ink/12" />
					<View className="flex-row items-center gap-3">
						<View className="h-9 w-9 items-center justify-center rounded-full bg-offer-ink/15">
							<SymbolView
								name={{
									android: "play_arrow",
									ios: "play.fill",
									web: "play_arrow",
								}}
								size={12}
								tintColor={ink}
							/>
						</View>
						<View className="flex-1">
							<AppText className="font-[Poppins-Medium] text-[14px] text-offer-ink">
								A voice for this
							</AppText>
							<AppText className="font-[Poppins-Regular] text-[12px] text-offer-ink/60">
								Support audio · 8 min
							</AppText>
						</View>
					</View>
				</OfferMock>
			</View>
		</OfferCard>
	);
}

/** Card 2 — Xolacers. Two bubbles is the product; anything more is decoration. */
export function XolacersOfferCard({ width }: { width: number }) {
	return (
		<OfferCard
			mascot={OFFER_MASCOT.xolacers}
			tag="Xolacers"
			tint="gentle"
			title="Talk to someone who gets it"
			width={width}
		>
			<OfferMock>
				<View className="self-start rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-2.5">
					<AppText className="font-[Poppins-Regular] text-[14px] text-offer-ink leading-[19px]">
						Sunday nights are the worst.
					</AppText>
				</View>
				<View className="self-end rounded-2xl rounded-br-md bg-offer-ink/[0.18] px-3.5 py-2.5">
					<AppText className="font-[Poppins-Regular] text-[14px] text-offer-ink leading-[19px]">
						Same. Mine start around 6.
					</AppText>
				</View>
				<View className="self-start rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-2.5">
					<AppText className="font-[Poppins-Regular] text-[14px] text-offer-ink leading-[19px]">
						How do you get through it?
					</AppText>
				</View>
				<View className="self-end rounded-2xl rounded-br-md bg-offer-ink/[0.18] px-3.5 py-2.5">
					<AppText className="font-[Poppins-Regular] text-[14px] text-offer-ink leading-[19px]">
						Honestly? Saying it out loud.
					</AppText>
				</View>
				{/* Someone is still there — the one thing a static mock can say about
            a live conversation. */}
				<View className="flex-row gap-1.5 self-start rounded-2xl rounded-bl-md bg-offer-ink/10 px-3.5 py-3.5">
					<View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
					<View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
					<View className="h-1.5 w-1.5 rounded-full bg-offer-ink/40" />
				</View>
			</OfferMock>
			<AppText className="font-[Poppins-Regular] text-[13px] text-offer-ink/70 leading-[18px]">
				Matched on what you&apos;re carrying. No names, no profiles.
			</AppText>
		</OfferCard>
	);
}

/**
 * Card 3 — insights. Two panels because Plus ships two of them: the week's
 * intensity history and the words/language map (`TeaserFeature` in
 * use-insight-gate.ts). One panel would sell insights as a word cloud.
 */
const WEEK = [
	{ day: "M", level: "h-2.5 opacity-30" },
	{ day: "T", level: "h-5 opacity-55" },
	{ day: "W", level: "h-4 opacity-45" },
	{ day: "T", level: "h-8 opacity-95" },
	{ day: "F", level: "h-6 opacity-70" },
	{ day: "S", level: "h-3 opacity-35" },
	{ day: "S", level: "h-7 opacity-85" },
];

export function InsightsOfferCard({ width }: { width: number }) {
	return (
		<OfferCard
			mascot={OFFER_MASCOT.insights}
			tag="Insights"
			tint="poetic"
			title="See what keeps coming back"
			width={width}
		>
			<OfferMock>
				<AppText className="font-[Poppins-Medium] text-[12px] text-offer-ink/50 uppercase tracking-widest">
					This week
				</AppText>
				{/* Seven days, one block each — how heavy the day ran. Blocks, not a
            plotted line: this is a week, not a trend. */}
				<View className="flex-row items-end justify-between pt-0.5">
					{WEEK.map((d, i) => (
						<View className="items-center gap-1.5" key={`${d.day}-${i}`}>
							<View className={cn("w-6 rounded-md bg-offer-ink", d.level)} />
							<AppText className="font-[Poppins-Medium] text-[11px] text-offer-ink/50">
								{d.day}
							</AppText>
						</View>
					))}
				</View>
				<AppText className="pt-1 font-[Poppins-Regular] text-[13px] text-offer-ink/70 leading-[18px]">
					Thursdays run heaviest — four weeks straight.
				</AppText>
			</OfferMock>

			<OfferMock>
				<AppText className="font-[Poppins-Medium] text-[15px] text-offer-ink leading-[21px]">
					Work came up in 7 of your last 9 reflections.
				</AppText>
				<View className="flex-row flex-wrap gap-2">
					<OfferPill>Work</OfferPill>
					<OfferPill>Sunday</OfferPill>
					<OfferPill>Tired</OfferPill>
				</View>
			</OfferMock>
			<AppText className="font-[Poppins-Regular] text-[13px] text-offer-ink/70 leading-[18px]">
				And more the longer you keep going.
			</AppText>
		</OfferCard>
	);
}

/**
 * The rest of Plus in one table — the caps it lifts, and the two things it
 * swaps from generic to yours (quotes and mirror tone). The `free` column is
 * struck through, so every row has to read as a real before/after.
 */
const CAPS = [
	{ free: "3 an hour", label: "Reflections", plus: "No cap" },
	{ free: "1 a day", label: "Voice vents", plus: "No cap" },
	{ free: "30 days", label: "Timeline", plus: "All of it" },
	{ free: "Generic", label: "Daily quotes", plus: "Your words" },
	{ free: "Auto", label: "Mirror tone", plus: "You pick" },
];

/** Card 4 — the ceiling, lifted. Shows the actual numbers it lifts. */
export function LimitsOfferCard({ width }: { width: number }) {
	return (
		<OfferCard
			mascot={OFFER_MASCOT.limits}
			tag="Everything else"
			tint="direct"
			title="And the ceiling comes off"
			width={width}
		>
			<OfferMock className="gap-0 py-1">
				<View className="flex-row items-center pt-1.5 pb-0.5">
					<View className="flex-1" />
					<AppText className="font-[Poppins-Medium] text-[11px] text-offer-ink/45 uppercase tracking-wider">
						Free
					</AppText>
					<AppText className="w-[98px] pl-2 font-[Poppins-Medium] text-[11px] text-offer-ink/70 uppercase tracking-wider">
						Plus
					</AppText>
				</View>
				{CAPS.map((row) => (
					<View className="flex-row items-center py-3" key={row.label}>
						<AppText className="flex-1 font-[Poppins-Regular] text-[14px] text-offer-ink/70">
							{row.label}
						</AppText>
						<AppText className="font-[Poppins-Regular] text-[14px] text-offer-ink/40 line-through">
							{row.free}
						</AppText>
						<AppText className="w-[98px] pl-2 font-[Poppins-SemiBold] text-[14px] text-offer-ink">
							{row.plus}
						</AppText>
					</View>
				))}
			</OfferMock>
			<AppText className="font-[Poppins-Regular] text-[13px] text-offer-ink/70 leading-[18px]">
				Nothing is taken away; the lid just comes off.
			</AppText>
		</OfferCard>
	);
}
