import { Redirect, usePathname } from "expo-router";
import AppTabs from "@/components/app-tabs";
import { TabShell } from "@/features/navigation/tab-shell";
import { tabRedirect } from "@/features/navigation/tabs";
import { currentShell } from "@/lib/redesign/shell";
import { ReturnTo } from "@/lib/return-to";

/**
 * The launch's shell (`redesign-v2`). A tab route this shell doesn't show is
 * sent to its place in this one (`tabRedirect` says how). The tabs stay mounted
 * meanwhile: unmounting them for the redirect lost the target tab.
 */
export default function TabsLayout() {
	const shell = currentShell();
	const elsewhere = tabRedirect(shell, usePathname());
	return (
		<>
			{shell === "v2" ? <TabShell /> : <AppTabs />}
			{elsewhere?.method === "replace" && <Redirect href={elsewhere.href} />}
			{elsewhere?.method === "dismissTo" && <ReturnTo href={elsewhere.href} />}
		</>
	);
}
