import { useTokenColors } from "@/lib/use-token-color";

/** Avatar art pairs (`--color-connect-art-*`), one per person when they have no photo. */
const ART = [
	["connect-art-violet-from", "connect-art-violet-to"],
	["connect-art-teal-from", "connect-art-teal-to"],
	["connect-art-rose-from", "connect-art-rose-to"],
] as const;
const FLAME = ["connect-flame-1", "connect-flame-2", "connect-flame-3"];
const ALL = [...ART.flat(), ...FLAME];
const HASH_MUL = 31;

/** A stable pick from the art pairs for an id: the same person always wears the same art. */
function artIndex(id: string): number {
	let h = 0;
	for (const ch of id) {
		h = (h * HASH_MUL + ch.charCodeAt(0)) % ART.length ** 4;
	}
	return h % ART.length;
}

/** Connect's fixed art, read once: the avatar pairs and the Xolace flame. */
export function useConnectColors() {
	const c = useTokenColors(ALL);
	const pairs = ART.map(
		(_, i) => [c[i * 2], c[i * 2 + 1]] as readonly [string, string]
	);
	const at = ART.length * 2;
	return {
		art: (id: string) => pairs[artIndex(id)] ?? pairs[0],
		flame: [c[at], c[at + 1], c[at + 2]] as const,
	};
}
