import { type Href, useLocalSearchParams, usePathname } from "expo-router";
import { movedPath } from "@/features/navigation/moved-paths";
import { ReturnTo } from "@/lib/return-to";

export function MovedRoute() {
	const pathname = usePathname();
	const { rest: _rest, ...params } = useLocalSearchParams();
	const to = movedPath(pathname);
	return to ? <ReturnTo href={{ params, pathname: to } as Href} /> : null;
}
