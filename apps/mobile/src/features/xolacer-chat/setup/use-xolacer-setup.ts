import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { File, UploadType } from 'expo-file-system';
import { useMutation, useQuery } from 'convex/react';
import { useToast } from 'heroui-native';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { MAX_SPECIALTIES, type Specialty } from '@/convex/lib/specialties';
import { SETUP_STEPS, firstIncompleteStep, type SetupDraft } from './steps';

type TextDraft = Pick<SetupDraft, 'displayName' | 'bio'>;

/**
 * Draft state for the setup flow. Text fields stay local until the step is
 * left (one write per step instead of one per keystroke); the photo is not
 * drafted at all — it's uploaded on pick, and the reactive query carries the
 * new URL back rather than an effect mirroring it into state.
 */
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
    photoUrl: saved?.photoUrl,
    displayName: edits.displayName ?? saved?.displayName ?? '',
    bio: edits.bio ?? saved?.bio ?? '',
    specialties: specialtyEdits ?? saved?.specialties ?? [],
  };

  /**
   * Open on the first thing still missing instead of always step 1. For a new
   * xolacer that IS step 1, so nothing changes for them — it only saves a
   * returning xolacer from tapping Continue past steps they already finished.
   * Seeded once, in render rather than an effect, so it never fights the user:
   * after this runs, `index` is theirs and filling a field can't move them.
   */
  if (!resumed && saved !== undefined) {
    setResumed(true);
    const blocking = firstIncompleteStep(draft);
    setIndex(blocking ? SETUP_STEPS.indexOf(blocking) : SETUP_STEPS.length - 1);
  }

  const setField = useCallback(
    (key: keyof TextDraft, value: string) =>
      setEdits((prev) => ({ ...prev, [key]: value })),
    [],
  );

  /**
   * Toggling stays local until the step is left, same as the text fields —
   * a chip that waits on a round trip to fill in feels broken. The cap is
   * enforced here and again server-side.
   */
  const toggleSpecialty = useCallback(
    (slug: string) =>
      setSpecialtyEdits((prev) => {
        const current = prev ?? saved?.specialties ?? [];
        if (current.includes(slug)) return current.filter((item) => item !== slug);
        if (current.length >= MAX_SPECIALTIES) return current;
        return [...current, slug];
      }),
    [saved?.specialties],
  );

  /** Cross-fade: fade out, swap the step, fade back in on transition end. */
  const goToStep = useCallback(
    (next: number) => {
      if (next === index || next < 0 || next >= SETUP_STEPS.length) return;
      pendingIndex.current = next;
      setVisible(false);
    },
    [index],
  );

  const handleFadeComplete = useCallback(() => {
    if (pendingIndex.current === null) return;
    setIndex(pendingIndex.current);
    pendingIndex.current = null;
    setVisible(true);
  }, []);

  const saveText = useCallback(
    () =>
      upsert({
        displayName: draft.displayName.trim() || undefined,
        bio: draft.bio.trim() || undefined,
        specialties: draft.specialties as Specialty[],
      }),
    [upsert, draft.displayName, draft.bio, draft.specialties],
  );

  const reportPhotoFailure = useCallback(
    (error: unknown) => {
      console.error('[xolacer-setup] photo upload failed', error);
      toast.show({ label: "Couldn't upload that photo. Try again." });
    },
    [toast],
  );

  /**
   * Written straight through rather than drafted — the edit form's only
   * immediate control, same as the Connect card it replaced. The thumb moves
   * on tap and the write follows: a switch that waits on a round trip reads as
   * dead and invites a second tap that undoes the first. A failed write drops
   * the local value, so the server's answer is what shows.
   */
  const setActive = useCallback(
    (next: boolean) => {
      setActiveEdit(next);
      return setXolacerActive({ active: next }).catch((error) => {
        console.error('[xolacer-chat] setXolacerActive failed', error);
        setActiveEdit(null);
        toast.show({
          label: next ? "Couldn't list you" : "Couldn't pause you",
          description: 'Something went wrong. Try again.',
        });
      });
    },
    [setXolacerActive, toast],
  );

  const pickPhoto = useCallback(async () => {
    // The picker can reject on its own (permission denied, native failure), and
    // PhotoStep calls this fire-and-forget — so it needs the same catch as the
    // upload or the rejection surfaces nowhere.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    }).catch((error) => {
      reportPhotoFailure(error);
      return null;
    });
    if (!picked || picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;

    setUploading(true);
    // `.finally()` rather than try/finally — the React Compiler skips
    // optimization for try/finally bodies.
    await uploadPhoto(asset.uri, asset.mimeType, generateUploadUrl, setXolacerPhoto)
      .finally(() => setUploading(false))
      .catch(reportPhotoFailure);
  }, [generateUploadUrl, setXolacerPhoto, reportPhotoFailure]);

  return {
    draft,
    setField,
    toggleSpecialty,
    index,
    visible,
    uploading,
    goToStep,
    handleFadeComplete,
    saveText,
    pickPhoto,
    publish,
    active: activeEdit ?? saved?.active ?? true,
    setActive,
    /** Loaded, and there is no xolacer profile on this account. */
    missing: saved === null,
    loading: saved === undefined,
  };
}

/**
 * The picked file streams to Convex natively rather than through
 * `fetch(uri).blob()`. Reading a `file://` URI back through RN's fetch fails
 * outright on Android, and where it does work it yields a blob with an empty
 * `type`, so the upload lands with a blank Content-Type. `File.upload` reads
 * the file on the native side and sends the picker's own mime type.
 */
async function uploadPhoto(
  uri: string,
  mimeType: string | undefined,
  generateUploadUrl: () => Promise<string>,
  setXolacerPhoto: (args: { storageId: Id<'_storage'> }) => Promise<null>,
) {
  const uploadUrl = await generateUploadUrl();
  const result = await new File(uri).upload(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'Content-Type': mimeType ?? 'image/jpeg' },
  });
  // A failed upload answers with text, not JSON — parsing it first would throw
  // something unreadable instead of the actual status.
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Photo upload failed (${result.status}): ${result.body}`);
  }
  const { storageId } = JSON.parse(result.body) as { storageId: Id<'_storage'> };
  await setXolacerPhoto({ storageId });
}
