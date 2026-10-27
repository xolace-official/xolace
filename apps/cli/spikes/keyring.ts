// Spike 6: does @napi-rs/keyring work under Bun? Writes, reads and deletes a dummy
// entry in the OS keychain.
import { Entry } from "@napi-rs/keyring";

const SERVICE = "xolace-cli-spike";
const ACCOUNT = "spike-6";
const value = `dummy-${Date.now()}`;

const entry = new Entry(SERVICE, ACCOUNT);
entry.setPassword(value);
const read = entry.getPassword();
const deleted = entry.deletePassword();
const afterDelete = entry.getPassword();

process.stdout.write(
	`${JSON.stringify({
		deleted,
		goneAfterDelete: afterDelete === null || afterDelete === undefined,
		platform: process.platform,
		roundTrip: read === value,
		runtime: `bun ${process.versions.bun}`,
	})}\n`
);
