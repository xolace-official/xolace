import { useClerk, useUser } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { Linking, Platform } from "react-native";
import { toast } from "@/components/shared/toast";
import { useRevenueCat } from "@/features/purchases/revenuecat-context";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { Account } from "@/features/settings/account/account-data";
import {
	errorText,
	nameError,
	signInOf,
	spaceShown,
	spaceUnchanged,
} from "@/features/settings/account/account-model";
import {
	ACCOUNT_COPY as C,
	type NameKind,
} from "@/features/settings/account/copy";
import { saveFailed } from "@/features/settings/use-save-failed";
import { getGrantedPushToken } from "@/lib/push-token";
import { COMPANION_FALLBACK_NAME } from "@/lib/talk/use-companion-name";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useSingleFlight } from "@/lib/use-single-flight";

const PUSH_DETACH_TIMEOUT_MS = 2500;

const STORE_SUBSCRIPTIONS =
	Platform.OS === "android"
		? "https://play.google.com/store/account/subscriptions"
		: "https://apps.apple.com/account/subscriptions";

function useSignOut() {
	const { signOut } = useClerk();
	const removeToken = useMutation(api.notifications.removeToken);
	const posthog = usePostHog();
	return async () => {
		posthog.capture("user_signed_out");
		posthog.reset();
		// Detach this installation before auth goes. Awaited: fire-and-forget lost the race and
		// the mutation died unauthenticated. Bounded: sign-out must never hang on it.
		await Promise.race([
			getGrantedPushToken()
				.then((token) => token && removeToken({ pushToken: token }))
				.catch(() => undefined),
			new Promise((resolve) => setTimeout(resolve, PUSH_DETACH_TIMEOUT_MS)),
		]);
		try {
			await signOut();
			return true;
		} catch {
			return false;
		}
	};
}

export function useAccount(): Account {
	const { user } = useUser();
	const preferences = useQuery(api.preferences.get);
	const summary = useQuery(api.profile.getSummary);
	const updatePreferences = usePreferenceMutation();
	const updateDisplayName = useMutation(api.profile.updateDisplayName);
	const { status: plusStatus } = usePlusEntitlement();
	const { customerInfo, restorePurchases } = useRevenueCat();
	const signOut = useSignOut();

	const [editing, setEditing] = useState<{
		kind: NameKind;
		draft: string;
	} | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);
	const [logOutOpen, setLogOutOpen] = useState(false);
	const saving = useSingleFlight();
	const loggingOut = useSingleFlight();
	const restoring = useSingleFlight();

	const name = summary?.displayName;
	const space =
		preferences === undefined ? undefined : (preferences.spaceName ?? null);

	const close = () => {
		setEditing(null);
		setServerError(null);
	};

	const saveName = (trimmed: string) =>
		saving.run(async () => {
			try {
				await updateDisplayName({ displayName: trimmed });
				close();
			} catch (error) {
				setServerError(errorText(error));
			}
		});

	const logOut = () =>
		loggingOut.run(async () => {
			try {
				if (await signOut()) {
					toast(C.signedOut);
				}
			} catch {
				toast(C.logOutFailed.title, {
					description: C.logOutFailed.description,
					variant: "danger",
				});
			}
			setLogOutOpen(false);
		});

	return {
		actions: {
			askLogOut: () => setLogOutOpen(true),
			cancelEdit: close,
			closeLogOut: () => setLogOutOpen(false),
			edit: (kind) => {
				const current =
					kind === "name"
						? name
						: space === undefined
							? undefined
							: spaceShown(space, COMPANION_FALLBACK_NAME);
				if (current !== undefined) {
					setServerError(null);
					setEditing({ draft: current, kind });
				}
			},
			logOut: () => {
				logOut().catch(() => undefined);
			},
			manageSubscription: () => {
				Linking.openURL(
					customerInfo?.managementURL ?? STORE_SUBSCRIPTIONS
				).catch(() => undefined);
			},
			openPrivacy: () => router.push("/settings/data"),
			resetSpace: () => {
				close();
				updatePreferences({ spaceName: null }).catch(saveFailed);
			},
			restore: () => {
				restoring
					.run(async () => {
						await restorePurchases();
					})
					.catch(() => undefined);
			},
			save: (trimmed) => {
				if (!editing || saving.isBusy()) {
					return;
				}
				if (editing.kind === "space") {
					close();
					if (
						space !== undefined &&
						spaceUnchanged(space, trimmed, COMPANION_FALLBACK_NAME)
					) {
						return;
					}
					updatePreferences({ spaceName: trimmed }).catch(saveFailed);
					return;
				}
				saveName(trimmed).catch(() => undefined);
			},
			setDraft: (draft) => {
				setServerError(null);
				setEditing((open) => (open ? { ...open, draft } : open));
			},
		},
		state: {
			companion: COMPANION_FALLBACK_NAME,
			dialog: editing && {
				...editing,
				error: serverError ?? nameError(editing.kind, editing.draft),
			},
			logOutOpen,
			name,
			plus: plusStatus === "loading" ? undefined : plusStatus === "plus",
			restoring: restoring.busy,
			signIn: user
				? signInOf(user.externalAccounts.map((a) => a.provider ?? ""))
				: undefined,
			space,
		},
	};
}
