import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { toast } from "@/components/shared/toast";
import { COPY } from "../copy";
import type { RateConversation, RateScreenData } from "./rate-data";

export function useRate(conversationId: string): RateScreenData {
	const router = useRouter();
	const id = conversationId as Id<"xolacer_conversations">;
	const conversation = useQuery(api.xolacerChat.getConversation, {
		conversationId: id,
	});
	const rateConversation = useMutation(api.xolacerChat.rateConversation);

	let rateable: RateConversation | null | undefined = conversation;
	if (conversation === null || conversation?.canRate === false) {
		rateable = null;
	}

	return {
		actions: {
			send: (rating) => {
				rateConversation({ conversationId: id, rating })
					.then(() => {
						toast(COPY.rate.sent);
						router.back();
					})
					.catch(() => toast(COPY.rate.sendFailed));
			},
			skip: () => router.back(),
		},
		state: { conversation: rateable },
	};
}
