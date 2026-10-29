import type { MoodItem } from "@/features/onboarding/components/mood-card";

/** Mood cards for the onboarding marquee. Colors are the fallback for moods without an image. */
export const MOODS: MoodItem[] = [
	{
		colors: ["#2d2340", "#3b2f5c", "#1e1a2e"],
		id: 1,
		image: require("@/assets/images/onboarding/heavy-mini.jpeg"),
		word: "heavy",
	},
	{
		colors: ["#3a2c3f", "#4e3658", "#2a1f35"],
		id: 2,
		image: require("@/assets/images/onboarding/Anxious-mini.jpeg"),
		word: "anxious",
	},
	{
		colors: ["#1f2937", "#2b3544", "#171e28"],
		id: 3,
		image: require("@/assets/images/onboarding/numb-mini.jpeg"),
		word: "numb",
	},
	{
		colors: ["#3b2f1f", "#4a3a28", "#2a2118"],
		id: 4,
		image: require("@/assets/images/onboarding/restless-mini.jpeg"),
		word: "restless",
	},
	{
		colors: ["#2a2842", "#3d3558", "#1d1b30"],
		id: 5,
		image: require("@/assets/images/onboarding/Confused-mini.jpeg"),
		word: "confused",
	},
	{
		colors: ["#32283a", "#443550", "#221c2a"],
		id: 6,
		image: require("@/assets/images/onboarding/Overwhelmed-min.jpeg"),
		word: "overwhelmed",
	},
	{
		colors: ["#252d3a", "#31394a", "#1a2028"],
		id: 7,
		image: require("@/assets/images/onboarding/Uncertain-mini.jpeg"),
		word: "uncertain",
	},
	{
		colors: ["#2e2535", "#3f3048", "#1f1a25"],
		id: 8,
		image: require("@/assets/images/onboarding/Lost-mini.jpeg"),
		word: "lost",
	},
];
