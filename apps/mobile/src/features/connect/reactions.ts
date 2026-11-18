/** The seven reactions (#345), in picker order: type, the emoji it draws, and its spoken name.
 * Shared by the thread's picker and the channel's cards. Pure. */
export const REACTIONS = [
	["hug", "🫂", "Hug"],
	["love", "❤️", "Love"],
	["thanks", "🙏", "Thanks"],
	["growth", "🌱", "Growth"],
	["fire", "🔥", "Fire"],
	["smile", "😊", "Smile"],
	["laugh", "😂", "Laugh"],
] as const;
