/** PUT to a signed R2 URL. A network error here is almost always the bucket's CORS. */
export async function putObject(url: string, body: Blob) {
	let response: Response;
	try {
		response = await fetch(url, {
			body,
			headers: { "Content-Type": body.type },
			method: "PUT",
		});
	} catch (error) {
		throw new Error(
			"Couldn't reach storage. Check the R2 bucket's CORS allows this site.",
			{ cause: error }
		);
	}
	if (!response.ok) {
		throw new Error(`Upload failed (${response.status})`);
	}
}
