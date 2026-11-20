import { useClerk, useUser } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useRef, useState } from "react";
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
	const { isPlus, isLoading: plusLoading } = usePlusEntitlement();
	const { customerInfo, restorePurchases } = useRevenueCat();
	const signOut = useSignOut();

	const [editing, setEditing] = useState<{
		kind: NameKind;
		draft: string;
	} | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);
	const [restoring, setRestoring] = useState(false);
	const [logOutOpen, setLogOutOpen] = useState(false);
	const busy = useRef({ loggingOut: false, restoring: false, saving: false });

	const name = summary?.displayName;
	const space =
		preferences === undefined ? undefined : (preferences.spaceName ?? null);

	const close = () => {
		setEditing(null);
		setServerError(null);
	};

	const saveName = async (trimmed: string) => {
		busy.current.saving = true;
		try {
			await updateDisplayName({ displayName: trimmed });
			close();
		} catch (error) {
			setServerError(errorText(error));
		} finally {
			busy.current.saving = false;
		}
	};

	const logOut = async () => {
		busy.current.loggingOut = true;
		try {
			if (await signOut()) {
				toast(C.signedOut);
			}
		} catch {
			toast(C.logOutFailed.title, {
				description: C.logOutFailed.description,
				variant: "danger",
			});
		} finally {
			busy.current.loggingOut = false;
			setLogOutOpen(false);
		}
	};

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
				if (!busy.current.loggingOut) {
					logOut().catch(() => undefined);
				}
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
				if (busy.current.restoring) {
					return;
				}
				busy.current.restoring = true;
				setRestoring(true);
				restorePurchases()
					.catch(() => undefined)
					.finally(() => {
						busy.current.restoring = false;
						setRestoring(false);
					});
			},
			save: (trimmed) => {
				if (!editing || busy.current.saving) {
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
			plus: plusLoading ? undefined : isPlus,
			restoring,
			signIn: user
				? signInOf(user.externalAccounts.map((a) => a.provider ?? ""))
				: undefined,
			space,
		},
	};
}
