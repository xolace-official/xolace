import { cn as joinClassNames } from "cn";

export function cn(
	...inputs: Parameters<typeof joinClassNames>
): ReturnType<typeof joinClassNames> {
	return joinClassNames(...inputs);
}
