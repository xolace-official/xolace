import { Redirect, usePathname } from "expo-router";
import AppTabs from "@/components/app-tabs";
import { TabShell } from "@/features/navigation/tab-shell";
import { tabRedirect } from "@/features/navigation/tabs";
import { currentShell } from "@/lib/redesign/shell";

/**
 * The launch's shell (`redesign-v2`). A tab route this shell doesn't show is
 * sent to its place in this one. The tabs stay mounted meanwhile: unmounting
 * them for the redirect lost the target tab, and a stack-level `ReturnTo` loses
 * to NativeTabs' own jump to the first tab.
 */
export default function TabsLayout() {
	const shell = currentShell();
	const elsewhere = tabRedirect(shell, usePathname());
	return (
		<>
			{shell === "v2" ? <TabShell /> : <AppTabs />}
			{elsewhere && <Redirect href={elsewhere} />}
		</>
	);
}
