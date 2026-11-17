/**
 * Whether an arrival is open over the app. Android's back belongs to it then,
 * even over a held badge on Achievements: the badge page's handler steps aside
 * instead of relying on which listener subscribed last.
 */
let open = false;

export const setArrivalOpen = (value: boolean) => {
	open = value;
};

export const isArrivalOpen = () => open;
