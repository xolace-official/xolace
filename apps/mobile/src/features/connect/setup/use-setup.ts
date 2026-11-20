import { api } from "@xolace/backend/api";
import type { Specialty } from "@xolace/backend/convex/lib/specialties";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation, useQuery } from "convex/react";
import { File, UploadType } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Keyboard } from "react-native";
import { goBack } from "@/components/shared/back-button";
import { toast } from "@/components/shared/toast";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { SETUP } from "./copy";
import type { SetupScreenData } from "./setup-data";
import {
	blockingStep,
	LAST_STEP,
	resumeStep,
	type SetupDraft,
	toggleSpecialty,
} from "./setup-model";

type TextEdits = Partial<Pick<SetupDraft, "displayName" | "bio">>;

const PICK: ImagePicker.ImagePickerOptions = {
	allowsEditing: true,
	aspect: [1, 1],
	mediaTypes: ["images"],
	quality: 0.7,
};

export function useSetup(): SetupScreenData {
	const saved = useQuery(api.xolacerChat.myXolacerProfile);
	const upsert = useMutation(api.xolacerChat.upsertMyXolacerProfile);
	const uploadUrl = useMutation(api.xolacerChat.generatePhotoUploadUrl);
	const setPhoto = useMutation(api.xolacerChat.setXolacerPhoto);
	const publish = useMutation(api.xolacerChat.publishProfile);
	const setXolacerActive = useMutation(api.xolacerChat.setXolacerActive);

	const [step, setStep] = useState<number | null>(null);
	const [edits, setEdits] = useState<TextEdits>({});
	const [picked, setPicked] = useState<readonly string[] | null>(null);
	const [activeEdit, setActiveEdit] = useState<boolean | null>(null);
	const [uploading, setUploading] = useState(false);
	const [busy, setBusy] = useState(false);

	const draft: SetupDraft = {
		bio: edits.bio ?? saved?.bio ?? "",
		displayName: edits.displayName ?? saved?.displayName ?? "",
		photoUrl: saved?.photoUrl,
		specialties: picked ?? saved?.specialties ?? [],
	};
	if (step === null && saved) {
		setStep(resumeStep(draft));
	}
	const at = step ?? 0;

	const saveText = () =>
		upsert({
			bio: draft.bio.trim() || undefined,
			displayName: draft.displayName.trim() || undefined,
			specialties: draft.specialties as Specialty[],
		});

	const pickPhoto = async () => {
		if (uploading) {
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync(PICK).catch(
			() => null
		);
		const asset = result?.canceled ? undefined : result?.assets[0];
		if (!result) {
			toast(SETUP.failed.photo, { variant: "danger" });
		}
		if (!asset) {
			return;
		}
		setUploading(true);
		// `.finally()`, not try/finally: the React Compiler skips try/finally bodies.
		await uploadPhoto(asset.uri, asset.mimeType, uploadUrl, setPhoto)
			.finally(() => setUploading(false))
			.catch(() => toast(SETUP.failed.photo, { variant: "danger" }));
	};

	const next = () => {
		if (at < LAST_STEP) {
			playSoftPress();
			setStep(at + 1);
			saveText().catch(() => toast(SETUP.failed.save, { variant: "danger" }));
			return;
		}
		if (busy || blockingStep(draft)) {
			return;
		}
		setBusy(true);
		saveText()
			.then(() => publish())
			.then(() => {
				playAffirmativePress();
				toast(SETUP.published, { variant: "success" });
				goBack();
			})
			.catch(() => toast(SETUP.failed.publish, { variant: "danger" }))
			.finally(() => setBusy(false));
	};

	const save = () => {
		if (busy || blockingStep(draft)) {
			return;
		}
		Keyboard.dismiss();
		playSoftPress();
		setBusy(true);
		saveText()
			.then(() => {
				toast(SETUP.edit.saved, { variant: "success" });
				goBack();
			})
			// Left open on failure, edits intact: a dropped connection shouldn't cost a rewritten bio.
			.catch(() => toast(SETUP.failed.save, { variant: "danger" }))
			.finally(() => setBusy(false));
	};

	const setActive = (value: boolean) => {
		Keyboard.dismiss();
		playSoftPress();
		setActiveEdit(value);
		setXolacerActive({ active: value }).catch(() => {
			setActiveEdit(null);
			toast(SETUP.failed.active(value), { variant: "danger" });
		});
	};

	const actions: SetupScreenData["actions"] = {
		back: () => (at === 0 ? goBack() : setStep(at - 1)),
		close: () => {
			Keyboard.dismiss();
			goBack();
		},
		next,
		pickPhoto: () => {
			pickPhoto();
		},
		save,
		setActive,
		setBio: (bio) => setEdits((prev) => ({ ...prev, bio })),
		setName: (displayName) => setEdits((prev) => ({ ...prev, displayName })),
		toggleSpecialty: (slug) =>
			setPicked((prev) =>
				toggleSpecialty(prev ?? saved?.specialties ?? [], slug)
			),
	};

	if (saved === undefined) {
		return { actions, state: { phase: "loading" } };
	}
	if (saved === null) {
		return { actions, state: { phase: "missing" } };
	}
	return {
		actions,
		state: {
			active: activeEdit ?? saved.active ?? true,
			busy,
			draft,
			phase: "ready",
			step: at,
			uploading,
		},
	};
}

async function uploadPhoto(
	uri: string,
	mimeType: string | undefined,
	generateUploadUrl: () => Promise<string>,
	setXolacerPhoto: (args: { storageId: Id<"_storage"> }) => Promise<null>
) {
	const url = await generateUploadUrl();
	const result = await new File(uri).upload(url, {
		headers: { "Content-Type": mimeType ?? "image/jpeg" },
		httpMethod: "POST",
		uploadType: UploadType.BINARY_CONTENT,
	});
	if (result.status < 200 || result.status >= 300) {
		throw new Error(`Photo upload failed (${result.status})`);
	}
	const { storageId } = JSON.parse(result.body) as {
		storageId: Id<"_storage">;
	};
	await setXolacerPhoto({ storageId });
}
