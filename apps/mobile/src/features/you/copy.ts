/**
 * Every string the You tab and its avatar sheet show: the prototype's (`P/src/fixtures/you-v2.ts`,
 * the board's copy) where it drew one, production's (profile, contribution graph, follow-ups)
 * where it kept production's words.
 */
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

const plural = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

export const COPY = {
	avatar: {
		/** The header's avatar, read as one button. */
		button: (name: string | undefined) =>
			name
				? `Your avatar, ${name}. Change avatar`
				: "Your avatar. Change avatar",
		label: (name: string, locked: boolean) =>
			`${name}${locked ? ", Xolace+" : ""}`,
		lock: "The ones with a lock come with Xolace+.",
		sheet: "Choose your avatar",
		sub: "Shown here, in the bar, and on your You tab.",
		title: "Your avatar",
	},
	badges: {
		label: (title: string, sparks: number) =>
			`Badges and sparks. ${title}, ${plural(sparks, "spark", "sparks")}`,
		one: (badge: string, sparks: number) =>
			`${badge} · ${plural(sparks, "spark", "sparks")}`,
		sub: (sparks: number, price: number) =>
			`${plural(sparks, "spark", "sparks")} · a freeze costs ${price}`,
		title: (n: number) => plural(n, "badge", "badges"),
	},
	days: {
		/** Production's per-day labels on Your days (contribution-graph.ts). */
		actions: {
			daily_mood: "Checked in",
			library: "Read",
			listen: "Listened",
			quotes: "Held a quote",
			reflect: "Reflected",
			sit_with_this: "Sat with it",
			vent: "Vented",
		},
		ahead: "Still ahead",
		beforeJoin: "Before you joined",
		frozen: "A freeze kept your streak lit",
		graph: (summary: string) => `Your days. ${summary}. Hold to read a day`,
		hint: "Hold on any day to see the details",
		info: "Every square is a day since you joined. The brighter it glows, the more ways you showed up. Press and hold any day to see what you did.",
		infoLabel: "About your days",
		quiet: "A quiet day",
		showedUp: (n: number) => `${plural(n, "day", "days")} showed up`,
		title: "Your days",
		today: "Nothing yet today",
	},
	followUps: {
		answered: "Answered",
		answers: {
			dismissed: "Closed",
			heavier: "Got heavier",
			lighter: "Feeling lighter",
			processed: "Worked through it",
			still_here: "Still sitting with it",
			vent: "Let it out",
		} as Record<string, string>,
		ask: "How is it sitting now?",
		checkIn: "Check in",
		close: "Close",
		closeLabel: (text: string) => `Close, no check-in is coming: ${text}`,
		comingUp: "Coming up",
		comingUpWhen: "Check-in coming",
		earlier: "Earlier",
		empty:
			"After a moment, Xolace may check back in a day or two. They'll wait here.",
		emptyTitle: "No follow-ups yet",
		/** "From Thursday", the day the moment was. */
		from: (weekday: string) => `From ${weekday}`,
		noAnswer: "No answer",
		openLabel: (text: string) => `Check in: ${text}`,
		superseded:
			"No check-in is coming for this one. Close it when you're ready.",
		waiting: "Waiting",
	},
	hero: {
		fresh: "This is your space. It fills in as you show up.",
		/** Production's greeting by the hour (profile-hero.tsx). */
		greeting: (hour: number, name: string) => {
			if (hour >= 5 && hour < 12) {
				return `Morning, ${name}`;
			}
			if (hour >= 12 && hour < 17) {
				return `Afternoon, ${name}`;
			}
			if (hour >= 17 && hour < 21) {
				return `Evening, ${name}`;
			}
			return `Quiet hours, ${name}`;
		},
		since: (month: number, year: number | null) =>
			year === null
				? `By the fire since ${MONTHS[month]}`
				: `By the fire since ${MONTHS[month]} ${year}`,
	},
	insights: {
		bring: "What you bring most",
		chip: (word: string) => word,
		/** Production's mirror lines (mirror-lines.tsx), mood first, then rhythm. */
		mood: {
			heavier: "Some sessions surface things that feel heavier at close.",
			lighter: "Most of your sessions end lighter.",
			mixed: "Sessions land differently each time — that's honest.",
			same: "You tend to leave feeling much the same.",
			unsure: "You often sit with uncertainty after.",
		},
		patterns: "Your patterns",
		plusLabel: "Xolace+. The days add up. See what that gets you.",
		plusSub: "See what that gets you.",
		plusTitle: "Xolace+. The days add up.",
		rhythm: (day: string, period: string) =>
			`You arrive most on ${day} ${period}.`,
	},
	rank: {
		info: "Counted against everyone who has reflected at least once — not everyone who signed up. Appears after 5 moments.",
		infoLabel: "About among the fires",
		line: "of campers here reflect less than you.",
		/** Production's foot lines (rank-card.tsx). */
		moments: (n: number) =>
			`${plural(n, "moment", "moments")} you didn't look away from.`,
		pct: (n: number) => `${n}%`,
		pending: (threshold: number, remaining: number) =>
			`Lights up after ${threshold} moments — ${remaining} to go.`,
		pendingFirst: "Lights up after 5 moments. Your first one starts it.",
		title: "Among the fires",
		unlit: "Where you sit among everyone who reflects here.",
		warming: "You're ready. Waiting on a few more people around the fire.",
	},
	screen: {
		settings: "Settings",
		tabs: { followUps: "Follow-ups", insights: "Insights" },
	},
	streak: {
		best: (n: number) => `Best ${n}`,
		buy: (price: number) => `Buy one · ${price} sparks`,
		daysInRow: "days in a row",
		ended: "Your next streak starts today",
		/** Production's freeze row (freeze-row.tsx). */
		freeze: {
			earn: (every: number) => `Earn one every ${every} days in a row.`,
			hold: (n: number, lit: boolean) =>
				n > 0
					? `${plural(n, "freeze", "freezes")} ${lit ? "ready" : "on hand"}`
					: "No freezes on hand",
			max: (use: string, cap: number) => `${use} Max ${cap} on hand.`,
			saved: "Saved for your next streak.",
			unit: (n: number) => (n === 1 ? "freeze" : "freezes"),
			use: "Each one covers a missed day.",
		},
		label: (streak: number, best: number) =>
			best > streak
				? `${streak} days in a row, best ${best}`
				: `${streak} days in a row`,
		letters: ["M", "T", "W", "T", "F", "S", "S"],
		moments: (n: number) => (n === 1 ? "moment" : "moments"),
		none: "—",
		spare: (sparks: number) => `You have ${plural(sparks, "spark", "sparks")}.`,
		usualDay: "usual day",
		week: (shown: number) =>
			`This week, ${plural(shown, "day", "days")} showed up. See your days`,
		weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	},
	tabs: {
		label: (label: string, waiting: number, index: number, count: number) =>
			`${label}, ${index + 1} of ${count}${waiting > 0 ? `, ${waiting} waiting` : ""}`,
	},
} as const;
