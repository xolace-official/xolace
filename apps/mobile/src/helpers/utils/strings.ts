export const getInitials = (
	name: string | undefined | null,
	defaultChar = "?"
): string => {
	if (!name) {
		return defaultChar;
	}
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (!parts.length) {
		return defaultChar;
	}
	if (parts.length === 1) {
		return parts[0][0].toUpperCase();
	}
	return (parts[0][0] + parts[1][0]).toUpperCase();
};
