import { useState } from "react";
import { ScopedTheme, type ThemeName } from "uniwind";
import {
	type Account,
	AccountProvider,
} from "@/features/settings/account/account-data";
import { nameError } from "@/features/settings/account/account-model";
import { AccountScreen } from "@/features/settings/account/account-screen";
import { ACCOUNT_ACTIONS } from "@/features/settings/account/dev/fixtures";

export function FixtureAccount({
	state,
	theme,
}: {
	state: Account["state"];
	theme?: ThemeName;
}) {
	const [dialog, setDialog] = useState(state.dialog);
	const [logOutOpen, setLogOutOpen] = useState(state.logOutOpen);
	const close = () => setDialog(null);
	const screen = (
		<AccountProvider
			value={{
				actions: {
					...ACCOUNT_ACTIONS,
					cancelEdit: close,
					closeLogOut: () => setLogOutOpen(false),
					logOut: () => setLogOutOpen(false),
					resetSpace: close,
					save: close,
					setDraft: (draft) =>
						setDialog((open) =>
							open
								? { ...open, draft, error: nameError(open.kind, draft) }
								: open
						),
				},
				state: { ...state, dialog, logOutOpen },
			}}
		>
			<AccountScreen />
		</AccountProvider>
	);
	return theme ? <ScopedTheme theme={theme}>{screen}</ScopedTheme> : screen;
}
