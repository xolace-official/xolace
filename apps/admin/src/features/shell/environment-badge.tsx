import { Badge } from "@xolace/ui/components/badge";
import { DatabaseIcon, TriangleAlertIcon } from "lucide-react";

import { ENV } from "@/env";

// The prod Convex deployment (packages/backend/AGENTS.md, "Deploy topology").
const PROD_DEPLOYMENT = "energetic-guineapig-283";

function deploymentName(convexUrl: string) {
	return new URL(convexUrl).hostname.split(".")[0] ?? convexUrl;
}

/** Which Convex deployment this admin edits. Production is loud on purpose. */
export function EnvironmentBadge() {
	const name = deploymentName(ENV.NEXT_PUBLIC_CONVEX_URL);

	if (name === PROD_DEPLOYMENT) {
		return (
			<Badge solid variant="coral">
				<TriangleAlertIcon />
				Production
			</Badge>
		);
	}

	return (
		<Badge title={`Convex deployment ${name}`} variant="mint">
			<DatabaseIcon />
			Not production · {name}
		</Badge>
	);
}
