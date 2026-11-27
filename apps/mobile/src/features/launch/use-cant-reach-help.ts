import { usePathname } from "expo-router";
import { CANT_REACH_HELP_PATH } from "./launch-model";

/** Crisis resources inside the root's `(cant-reach)` group are on screen. */
export const useOnCantReachHelp = (): boolean =>
	usePathname() === CANT_REACH_HELP_PATH;
