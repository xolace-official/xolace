export type ConsentedUploadSteps = {
	consent: () => Promise<void>;
	readBytes: (uri: string) => Promise<Uint8Array<ArrayBuffer>>;
	send: (audioBytes: ArrayBuffer) => Promise<string | null>;
};

export async function uploadWithConsent(
	uri: string | null,
	steps: ConsentedUploadSteps
): Promise<string | null> {
	if (!uri) {
		throw new Error("no recording");
	}
	await steps.consent();
	const bytes = await steps.readBytes(uri);
	return steps.send(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
	);
}
