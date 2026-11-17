import { PeerReflectionData } from "@/features/peer-reflection/peer-reflection-data";
import { PeerReflectionScreen } from "@/features/peer-reflection/peer-reflection-screen";

export default function PeerReflectionsRoute() {
	return (
		<PeerReflectionData>
			<PeerReflectionScreen />
		</PeerReflectionData>
	);
}
