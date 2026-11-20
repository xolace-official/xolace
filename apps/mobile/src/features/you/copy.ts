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
		checkIn: "Check in",
		close: "Close",
		closeHint: "Closes it. No check-in is coming for this one.",
		closeLabel: (text: string) => `Close, no check-in is coming: ${text}`,
		comingUp: "Coming up",
		comingUpWhen: "Check-in coming",
		earlier: "Earlier",
		empty:
			"After some reflections, Xolace checks back in a little later to see how it's sitting. Those check-ins land here.",
		emptyTitle: "No follow-ups yet",
		/** "From Thursday", the day the moment was. */
		from: (weekday: string) => `From ${weekday}`,
		noAnswer: "No answer",
		openHint: "Opens the check-in, where you answer how it's sitting.",
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
	steadiness: {
		allLabel: "See all of steadiness",
		domains: {
			belonging: "Belonging",
			family: "Family",
			health: "Health & Rest",
			love: "Love & Friendship",
			money: "Money & Home",
			purpose: "Purpose & Future",
			self: "Self",
			work: "Work & Studies",
		},
		info: "How the parts of your life have been lately, from how you've used Xolace. It may not reflect your whole life.",
		infoLabel: "About steadiness",
		label: (score: number, trend: string | null) =>
			`Steadiness, ${score} of 100${trend ? `, ${trend.toLowerCase()}` : ""}`,
		/** What Xolace saw, Xolace+ only (production's COMPOUNDING_WORD): never a grade. */
		lately: { compounding: "Heavier than your usual", easing: "Easing" },
		lockedTrend: "Trend with Xolace+",
		notLit: "Not lit yet",
		notLitLabel: (known: number) =>
			`Steadiness, not lit yet. ${known} of 2 parts known so far`,
		notLitLine: (known: number) =>
			`Lights up once Xolace knows two parts of your life. ${known} of 2 so far.`,
		outOf: "/100",
		quiet: "Not recently",
		seeAll: "See all",
		/** How well Xolace knows a part (production's STAGE_WORD): never a grade. */
		stage: {
			settled: "Known well",
			unlocked: "Getting to know it",
			warming: "Warming up",
		},
		title: "Steadiness",
		trend: (delta: number, since: string) =>
			delta === 0
				? `Same as ${since}`
				: `${delta > 0 ? "Up" : "Down"} ${Math.abs(delta)} since ${since}`,
		trendBasis: "last week",
	},
	/** The Steadiness screen (steadiness.md), production's words where it kept them. */
	steadinessScreen: {
		caveat:
			"This is what Xolace knows from how you've used Xolace. It may not reflect your whole life.",
		chipLabel: (score: number) => `Steadiness ${score}. Scroll to top`,
		dialLabel: (score: number, trend: string | null) =>
			`Overall steadiness, ${score} out of 100.${trend ? ` ${trend.charAt(0).toUpperCase()}${trend.slice(1)}.` : ""}`,
		/** What the Reflection Agent noticed (production's steadiness-insights.tsx). */
		eyebrow: {
			absence: "What never comes up",
			crowding: "What it's pushed out",
			relief: "Where relief came from",
			say_vs_after: "What you say, and what comes after",
			thread: "One thread",
		},
		face: {
			done: "Got it",
			lead: "The face shows how steady things have been, not how you feel. It shows that through how much it moves.",
			noteBody:
				"A low number doesn't get a frown, and a high one doesn't get a bigger smile. Steadiness isn't the same as happiness.",
			noteTitle: "Its expression never changes with your score",
			rows: {
				restless:
					"When things have been up and down lately, it fidgets and sways. The more it moves, the less steady the last few weeks have been.",
				settled:
					"As things steady, it settles and keeps still. Calm and still means your weeks have been holding steady.",
				waiting:
					"Before Xolace knows two parts of your life, it waits quietly with soft eyes. Nothing to read yet.",
			},
			title: "Reading the face",
			titles: { restless: "Restless", settled: "Settled", waiting: "Waiting" },
		},
		faceLabel: "Reading the face",
		gridLabel: "Show as grid",
		heavier: "Heavier lately",
		kindling: "Your kindling",
		kindlingLabel: "Open your kindling",
		kindlingSub: "A few things from a session about this",
		listLabel: "Show as list",
		locked: "vs last week",
		lockedLabel: "Locked: change since last week. Opens Xolace+.",
		noticed: (date: string) => `Noticed ${date}`,
		notLit: "Not lit yet",
		now: "now",
		parts: "Parts of your life",
		partsAs: "Show parts as",
		/** `heavierLately`: the part the upsell names, so its line speaks to the stretch. */
		peek: (name: string, heavierLately: boolean) =>
			heavierLately
				? `Xolace+ shows how far ${name} has moved from your usual, which way it's heading, and what Xolace noticed about it.`
				: `Xolace+ shows how steady ${name} has been, your usual for it, and the change since last week.`,
		peekGo: "See what Xolace+ shows",
		quietSince: (date: string) => `Not recently · last seen ${date}`,
		seen: (date: string) => `last seen ${date}`,
		soFar: (known: number) => `${known} of 2 so far`,
		title: "Steadiness",
		unlock: "Unlock numbers",
		upsell: (name: string) =>
			`${name} has been heavier lately than your usual.`,
		upsellGo: "See the pattern",
		upsellLabel: (name: string) =>
			`${name} has been heavier lately than your usual. See the pattern with Xolace+.`,
		usually: (n: number) => `usually ${n}`,
		usuallyCap: (n: number) => `Usually ${n}`,
		wait: "Lights up once Xolace knows two parts of your life.",
		warming: "warming",
	},
	streak: {
		best: (n: number) => `Best ${n}`,
		buy: (price: number) => `Buy one · ${price} sparks`,
		daysInRow: (n: number) => (n === 1 ? "day in a row" : "days in a row"),
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
				? `${plural(streak, "day", "days")} in a row, best ${best}`
				: `${plural(streak, "day", "days")} in a row`,
		letters: ["M", "T", "W", "T", "F", "S", "S"],
		moments: (n: number) => (n === 1 ? "moment" : "moments"),
		none: "—",
		noUsualDay: "No usual day yet",
		spare: (sparks: number) => `You have ${plural(sparks, "spark", "sparks")}.`,
		usualDay: "usual day",
		/** `open`: Your days is shown, so the tap goes there. */
		week: (shown: number, open: boolean) =>
			`This week, ${plural(shown, "day", "days")} showed up.${open ? " See your days" : ""}`,
		weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	},
	tabs: {
		label: (label: string, waiting: number, index: number, count: number) =>
			`${label}, ${index + 1} of ${count}${waiting > 0 ? `, ${waiting} waiting` : ""}`,
	},
	week: {
		ahead: "still ahead",
		backBy: (day: string) => `Back inside it by ${day}.`,
		chart: "Intensity by day",
		/**
		 * A held day's domain (B17), one word: Steadiness's names ("Love & Friendship") don't fit
		 * the line beside a feeling and an ending on a 375 pt phone.
		 */
		domains: {
			belonging: "Belonging",
			family: "Family",
			health: "Health",
			love: "Love",
			money: "Money",
			purpose: "Purpose",
			self: "Self",
			work: "Work",
		},
		earlier: "Earlier weeks",
		earlierLabel: "See earlier weeks",
		empty: "No moments logged that week.",
		/** How a held day ended, its last words (B17): "ended lighter". */
		ended: {
			heavier: "ended heavier",
			lighter: "ended lighter",
			same: "about the same",
		},
		forming: "Nothing yet this week. Its shape is still forming.",
		heaviest: (day: string) => `Heaviest on ${day}.`,
		heaviestAgainst: (day: string, relation: "above" | "within" | "below") =>
			`Heaviest on ${day}, ${relation} your usual.`,
		infoFree:
			"Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Only this week shows in full; browsing earlier weeks is part of Xolace+.",
		infoLabel: (label: string) => `About ${label.replace(/^This/, "this")}`,
		infoPlus:
			"Each bar is how heavy your moments felt that day; averaged from the intensity (1-10) of what you brought. Use the arrows above to browse earlier weeks.",
		level: (v: number) =>
			`${v >= 7.5 ? "high" : v >= 5 ? "moderate" : v >= 2.5 ? "mild" : "minimal"} intensity`,
		/** A held day's count, the first words of its second line. */
		moments: (n: number) => plural(n, "moment", "moments"),
		next: "Next week",
		none: "no moments",
		prev: "Previous week",
		relation: {
			above: "above your usual",
			below: "below your usual",
			within: "within your usual",
		},
		scale: {
			high: "High",
			mild: "Mild",
			minimal: "Minimal",
			moderate: "Moderate",
		},
		today: "today",
		usual: "your usual",
		weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
	},
} as const;
