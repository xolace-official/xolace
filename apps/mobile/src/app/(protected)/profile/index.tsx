import { ProfileScreen } from "@/features/profile/components/screens/ProfileScreen";
import { currentShell } from "@/lib/redesign/shell";
import { ReturnTo } from "@/lib/return-to";

/** The v2 shell has no Profile: it became the You tab. */
export default function ProfileRoute() {
	return currentShell() === "v2" ? <ReturnTo href="/you" /> : <ProfileScreen />;
}
