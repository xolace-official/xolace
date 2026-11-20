let lastTapAt = Number.NEGATIVE_INFINITY;

export const markNotificationTap = (at = Date.now()) => {
	lastTapAt = at;
};

export const tappedSince = (since: number) => lastTapAt >= since;
