/**
 * Every word the badges and their arrival say that the server doesn't send.
 * Titles, lines and sparks come from the catalog (`achievements/catalog.ts`),
 * so a new badge reaches old builds without a release.
 */
export const COPY = {
	arrival: {
		close: "Close",
		/** "+7 sparks" while it counts up to `sparks`, the noun fixed by the total. */
		counting: (shown: number, sparks: number) =>
			`+${shown} ${sparks === 1 ? "spark" : "sparks"}`,
		dotsLabel: (step: number, total: number) => `Badge ${step + 1} of ${total}`,
		/** The back's engraving on the day it arrives. */
		engravedDay: "Today",
		/** "NEW BADGE" / "2 NEW BADGES". */
		eyebrow: (count: number) =>
			count > 1 ? `${count} NEW BADGES` : "NEW BADGE",
		heading: (title: string, copy: string, sparks: number) =>
			`New badge. ${title}. ${copy} Plus ${sparks} ${sparks === 1 ? "spark" : "sparks"}.`,
		hint: "Drag it to turn it over. Tap it for more confetti.",
		lovely: "Lovely",
		next: "Next",
	},
	backfill: {
		cta: "See them",
		eyebrowFirst: "BADGES ARE HERE",
		eyebrowSince: "SINCE YOU WERE LAST HERE",
		line: "Everything you did before badges arrived counts.",
		title: (first: boolean, badges: number, sparks: number) =>
			`${first ? "You've already earned" : "You earned"} ${plural(badges, "badge")} and ${plural(sparks, "spark")}`,
	},
	badge: {
		back: "Back",
		engrave: "XOLACE",
		gone: "This badge isn't here anymore.",
		hint: {
			drag: "Drag to turn it over · Swipe down to put it back",
			locked: "Swipe down to put it back",
			tap: "Tap it to turn it over · Swipe down to put it back",
		},
		image: (title: string, earned: boolean) =>
			`${earned ? title : `${title}, locked`}, badge`,
		landed: (title: string, copy: string, date: string, sparks: number) =>
			`${title}, heading. ${copy} Unlocked on ${date}. Plus ${sparks} sparks.`,
		pin: "Pin",
		pinHint: "Shows it on your profile",
		pinned: "Pinned",
		putBack: "Put back",
		share: "Share",
		/** The share sheet's text until a badge image exists. */
		shareMessage: (title: string, date: string) =>
			`${title} · Unlocked on ${date} · Xolace`,
		turnOver: "Turn over",
		unlockedOn: (date: string) => `Unlocked on ${date}`,
		unpinHint: "Takes it off your profile",
	},
	freeze: {
		buy: (price: number) => `Buy a freeze · ${price}`,
		capped: (cap: number) => `You're holding the max of ${cap} freezes.`,
		failed: "Couldn't buy a freeze. Try again.",
		holds: (freezes: number, cap: number) =>
			`Covers one missed day · you hold ${freezes} of ${cap}`,
		lapsed: "Your streak ended. Show up today, then buy one.",
		notEnough: "Not enough sparks for a freeze yet.",
		short: (sparks: number) =>
			`${sparks} more ${sparks === 1 ? "spark" : "sparks"} to buy one.`,
		title: "Buy a streak freeze",
	},
	list: {
		latest: (title: string) => `Latest: ${title}`,
		latestLabel: (title: string) => `Latest: ${title}. Opens the badge`,
		loading: "Loading achievements",
		nextUp: (title: string) => `Next up: ${title}`,
		openHint: "Opens the badge",
		sparksEarned: "SPARKS EARNED",
		spend: (balance: number, badges: number) =>
			`${balance} to spend · ${plural(badges, "badge")}`,
		title: "Achievements",
		unlocked: (earned: number, total: number) =>
			`${earned} of ${total} unlocked`,
	},
	milestone: {
		capped: {
			line: "You can hold one, so this one isn’t added. Yours is still there for a day you miss.",
			title: "You already hold a freeze",
		},
		daysInARow: "days in a row",
		earned: {
			line: "It keeps your streak lit on a day you miss. You can hold one.",
			title: "You earned a freeze",
		},
		inARow: (days: number) => `${days} in a row`,
		label: (day: number, line: string, freeze: string) =>
			`${day} days in a row. ${line} ${freeze}.`,
		lastSeven: "The last 7 days",
	},
	pins: {
		limit: "You can pin 3 badges. Unpin one to pin this.",
		pinFailed: "Couldn't pin this badge. Try again.",
		unpinFailed: "Couldn't unpin this badge. Try again.",
	},
	sparks: (sparks: number, earned: boolean) =>
		`${earned ? "+" : ""}${sparks} ${sparks === 1 ? "spark" : "sparks"}`,
} as const;

function plural(count: number, noun: string) {
	return `${count} ${noun}${count === 1 ? "" : "s"}`;
}
