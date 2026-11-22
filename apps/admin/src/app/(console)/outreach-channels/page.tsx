import type { Metadata } from "next";

import { OutreachChannelsScreen } from "@/features/outreach-channels/outreach-channels-screen";

export const metadata: Metadata = { title: "Outreach channels · Xolace Admin" };

export default function OutreachChannelsPage() {
	return <OutreachChannelsScreen />;
}
