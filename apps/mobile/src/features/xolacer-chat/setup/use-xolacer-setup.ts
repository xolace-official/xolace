import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import {
	MAX_SPECIALTIES,
	type Specialty,
} from "@xolace/backend/convex/lib/specialties";
import { useMutation, useQuery } from "convex/react";
import { File, UploadType } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useToast } from "heroui-native";
import { useCallback, useRef, useState } from "react";
import { firstIncompleteStep, SETUP_STEPS, type SetupDraft } from "./steps";

type TextDraft = Pick<SetupDraft, "displayName" | "bio">;

/** Draft state for the setup flow: text stays local until the step is left; the photo uploads
 * on pick and the query carries the URL back. */
export function useXolacerSetup() {
	const { toast } = useToast();
	const saved = useQuery(api.xolacerChat.myXolacerProfile);
	const upsert = useMutation(api.xolacerChat.upsertMyXolacerProfile);
	const generateUploadUrl = useMutation(api.xolacerChat.generatePhotoUploadUrl);
	const setXolacerPhoto = useMutation(api.xolacerChat.setXolacerPhoto);
	const publish = useMutation(api.xolacerChat.publishProfile);
	const setXolacerActive = useMutation(api.xolacerChat.setXolacerActive);

	const [index, setIndex] = useState(0);
	const [resumed, setResumed] = useState(false);
	const [visible, setVisible] = useState(true);
	const [uploading, setUploading] = useState(false);
	const pendingIndex = useRef<number | null>(null);

	// Server values seed the fields once; after that the local draft owns them.
	const [edits, setEdits] = useState<Partial<TextDraft>>({});
	const [specialtyEdits, setSpecialtyEdits] = useState<string[] | null>(null);
	const [activeEdit, setActiveEdit] = useState<boolean | null>(null);
	const draft: SetupDraft = {
		bio: edits.bio ?? saved?.bio ?? "",
		displayName: edits.displayName ?? saved?.displayName ?? "",
		photoUrl: saved?.photoUrl,
		specialties: specialtyEdits ?? saved?.specialties ?? [],
	};

	// Opens on the first incomplete step; seeded once in render so filling a
	// field never moves the user afterwards.
	if (!resumed && saved !== undefined) {
		setResumed(true);
		const blocking = firstIncompleteStep(draft);
		setIndex(blocking ? SETUP_STEPS.indexOf(blocking) : SETUP_STEPS.length - 1);
	}

	const setField = useCallback(
		(key: keyof TextDraft, value: string) =>
			setEdits((prev) => ({ ...prev, [key]: value })),
		[]
	);

	/** Local until the step is left, like the text fields; the cap is enforced here and
	 * server-side. */
	const toggleSpecialty = useCallback(
		(slug: string) =>
			setSpecialtyEdits((prev) => {
				const current = prev ?? saved?.specialties ?? [];
				if (current.includes(slug)) {
					return current.filter((item) => item !== slug);
				}
				if (current.length >= MAX_SPECIALTIES) {
					return current;
				}
				return [...current, slug];
			}),
		[saved?.specialties]
	);

	/** Cross-fade: fade out, swap the step, fade back in on transition end. */
	const goToStep = useCallback(
		(next: number) => {
			if (next === index || next < 0 || next >= SETUP_STEPS.length) {
				return;
			}
			pendingIndex.current = next;
			setVisible(false);
		},
		[index]
	);

	const handleFadeComplete = useCallback(() => {
		if (pendingIndex.current === null) {
			return;
		}
		setIndex(pendingIndex.current);
		pendingIndex.current = null;
		setVisible(true);
	}, []);

	const saveText = useCallback(
		() =>
			upsert({
				bio: draft.bio.trim() || undefined,
				displayName: draft.displayName.trim() || undefined,
				specialties: draft.specialties as Specialty[],
			}),
		[upsert, draft.displayName, draft.bio, draft.specialties]
	);

	const reportPhotoFailure = useCallback(
		(error: unknown) => {
			console.error("[xolacer-setup] photo upload failed", error);
			toast.show({ label: "Couldn't upload that photo. Try again." });
		},
		[toast]
	);

	/** Written straight through; a failed write drops the local value so the server's answer
	 * shows. */
	const setActive = useCallback(
		(next: boolean) => {
			setActiveEdit(next);
			return setXolacerActive({ active: next }).catch((error) => {
				console.error("[xolacer-chat] setXolacerActive failed", error);
				setActiveEdit(null);
				toast.show({
					description: "Something went wrong. Try again.",
					label: next ? "Couldn't list you" : "Couldn't pause you",
				});
			});
		},
		[setXolacerActive, toast]
	);

	const pickPhoto = useCallback(async () => {
		// The picker can reject on its own and PhotoStep calls this fire-and-forget,
		// so it needs the same catch as the upload.
		const picked = await ImagePicker.launchImageLibraryAsync({
			allowsEditing: true,
			aspect: [1, 1],
			mediaTypes: ["images"],
			quality: 0.7,
		}).catch((error) => {
			reportPhotoFailure(error);
			return null;
		});
		if (!picked || picked.canceled) {
			return;
		}
		const asset = picked.assets[0];
		if (!asset) {
			return;
		}

		setUploading(true);
		// `.finally()` rather than try/finally — the React Compiler skips
		// optimization for try/finally bodies.
		await uploadPhoto(
			asset.uri,
			asset.mimeType,
			generateUploadUrl,
			setXolacerPhoto
		)
			.finally(() => setUploading(false))
			.catch(reportPhotoFailure);
	}, [generateUploadUrl, setXolacerPhoto, reportPhotoFailure]);

	return {
		active: activeEdit ?? saved?.active ?? true,
		draft,
		goToStep,
		handleFadeComplete,
		index,
		loading: saved === undefined,
		/** Loaded, and there is no xolacer profile on this account. */
		missing: saved === null,
		pickPhoto,
		publish,
		saveText,
		setActive,
		setField,
		toggleSpecialty,
		uploading,
		visible,
	};
}

/** Streams the file natively: `fetch(uri).blob()` fails on Android and yields an empty `type`
 * elsewhere. */
async function uploadPhoto(
	uri: string,
	mimeType: string | undefined,
	generateUploadUrl: () => Promise<string>,
	setXolacerPhoto: (args: { storageId: Id<"_storage"> }) => Promise<null>
) {
	const uploadUrl = await generateUploadUrl();
	const result = await new File(uri).upload(uploadUrl, {
		headers: { "Content-Type": mimeType ?? "image/jpeg" },
		httpMethod: "POST",
		uploadType: UploadType.BINARY_CONTENT,
	});
	// A failed upload answers with text, not JSON — parsing it first would throw
	// something unreadable instead of the actual status.
	if (result.status < 200 || result.status >= 300) {
		throw new Error(`Photo upload failed (${result.status}): ${result.body}`);
	}
	const { storageId } = JSON.parse(result.body) as {
		storageId: Id<"_storage">;
	};
	await setXolacerPhoto({ storageId });
}
