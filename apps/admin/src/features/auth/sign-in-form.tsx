"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { Alert, AlertDescription } from "@xolace/ui/components/alert";
import { Button } from "@xolace/ui/components/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@xolace/ui/components/field";
import { Input } from "@xolace/ui/components/input";
import { Spinner } from "@xolace/ui/components/spinner";
import { ArrowLeftIcon, LogInIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { PasswordInput } from "./password-input";

type Step = "password" | "email-code";

const UNSUPPORTED_STEP =
	"This account needs a sign-in step the admin doesn't support yet. Ask an engineer to check it in Clerk.";

/**
 * Staff sign-in: work email + password, then the 6-digit email code Clerk asks for
 * on a new device (Device Trust). No sign-up: accounts are made with
 * `bun run grant-admin` in apps/admin.
 */
export function SignInForm() {
	const { signIn, errors, fetchStatus } = useSignIn();
	const { isLoaded, isSignedIn } = useAuth();
	const redirectUrl = useSearchParams().get("redirect_url");
	const [step, setStep] = useState<Step>("password");
	const [email, setEmail] = useState("");
	const [failure, setFailure] = useState<string | null>(null);
	// `finalize` navigates itself, with Clerk's decorated URL.
	const finishing = useRef(false);

	// The server rendered this page signed out, but Clerk has a session (its
	// cookie had expired and was refreshed here). Submitting would only say
	// "already signed in", so leave with a full load the guards can see.
	useEffect(() => {
		if (isLoaded && isSignedIn && !finishing.current) {
			window.location.replace(safeRedirect(redirectUrl));
		}
	}, [isLoaded, isSignedIn, redirectUrl]);

	const busy = fetchStatus === "fetching";
	const alert = failure ?? errors.global?.[0]?.message;

	const finish = async () => {
		finishing.current = true;
		const { error } = await signIn.finalize({
			navigate: ({ decorateUrl }) => {
				// A full load, not router.replace: the client router can replay the
				// cached redirect back to /sign-in from before the session existed.
				// decorateUrl may also hand back an absolute Clerk URL (Safari ITP).
				window.location.replace(decorateUrl(safeRedirect(redirectUrl)));
			},
		});
		if (error) {
			finishing.current = false;
			setFailure(error.message);
		}
	};

	// After the password or the code: done, or ask for the code a new device needs.
	const advance = async () => {
		if (signIn.status === "complete") {
			await finish();
			return;
		}
		const emailCodeOffered = signIn.supportedSecondFactors.some(
			(factor) => factor.strategy === "email_code"
		);
		if (
			(signIn.status === "needs_client_trust" ||
				signIn.status === "needs_second_factor") &&
			emailCodeOffered
		) {
			const { error } = await signIn.mfa.sendEmailCode();
			if (error) {
				setFailure(error.message);
				return;
			}
			setStep("email-code");
			return;
		}
		setFailure(UNSUPPORTED_STEP);
	};

	const submitPassword = async (password: string) => {
		setFailure(null);
		// Errors land in `errors` (fields under their inputs, the rest in the alert).
		const { error } = await signIn.password({ emailAddress: email, password });
		if (error) {
			return;
		}
		await advance();
	};

	const submitCode = async (code: string) => {
		setFailure(null);
		const { error } = await signIn.mfa.verifyEmailCode({ code });
		if (error) {
			return;
		}
		await advance();
	};

	const startOver = async () => {
		await signIn.reset();
		setFailure(null);
		setStep("password");
	};

	return (
		<div className="flex flex-col gap-6">
			{alert ? (
				<Alert variant="coral">
					<AlertDescription>{alert}</AlertDescription>
				</Alert>
			) : null}
			{step === "password" ? (
				<PasswordStep
					busy={busy}
					email={email}
					emailError={
						errors.fields.identifier?.longMessage ??
						errors.fields.identifier?.message
					}
					onEmailChange={setEmail}
					onSubmit={submitPassword}
					passwordError={
						errors.fields.password?.longMessage ??
						errors.fields.password?.message
					}
				/>
			) : (
				<EmailCodeStep
					busy={busy}
					codeError={
						errors.fields.code?.longMessage ?? errors.fields.code?.message
					}
					email={email}
					onBack={startOver}
					onResend={() => signIn.mfa.sendEmailCode()}
					onSubmit={submitCode}
				/>
			)}
		</div>
	);
}

function PasswordStep({
	busy,
	email,
	emailError,
	passwordError,
	onEmailChange,
	onSubmit,
}: {
	busy: boolean;
	email: string;
	emailError?: string;
	passwordError?: string;
	onEmailChange: (email: string) => void;
	onSubmit: (password: string) => void;
}) {
	const [password, setPassword] = useState("");

	const submit = (event: FormEvent) => {
		event.preventDefault();
		onSubmit(password);
	};

	return (
		<form className="flex flex-col gap-6" noValidate onSubmit={submit}>
			<FieldGroup>
				<Field data-invalid={emailError ? true : undefined}>
					<FieldLabel htmlFor="email">Work email</FieldLabel>
					<Input
						aria-invalid={emailError ? true : undefined}
						autoComplete="username"
						autoFocus
						id="email"
						inputMode="email"
						onChange={(event) => onEmailChange(event.target.value)}
						placeholder="you@xolaceinc.com"
						required
						type="email"
						value={email}
					/>
					<FieldError>{emailError}</FieldError>
				</Field>
				<Field data-invalid={passwordError ? true : undefined}>
					<FieldLabel htmlFor="password">Password</FieldLabel>
					<PasswordInput
						aria-invalid={passwordError ? true : undefined}
						autoComplete="current-password"
						id="password"
						onChange={(event) => setPassword(event.target.value)}
						required
						value={password}
					/>
					<FieldError>{passwordError}</FieldError>
				</Field>
			</FieldGroup>
			<Button
				className="w-full"
				disabled={busy || !email || !password}
				size="lg"
				type="submit"
			>
				{busy ? <Spinner /> : <LogInIcon />}
				Sign in
			</Button>
		</form>
	);
}

function EmailCodeStep({
	busy,
	email,
	codeError,
	onBack,
	onResend,
	onSubmit,
}: {
	busy: boolean;
	email: string;
	codeError?: string;
	onBack: () => void;
	onResend: () => void;
	onSubmit: (code: string) => void;
}) {
	const [code, setCode] = useState("");

	const submit = (event: FormEvent) => {
		event.preventDefault();
		onSubmit(code.trim());
	};

	return (
		<form className="flex flex-col gap-6" noValidate onSubmit={submit}>
			<Field data-invalid={codeError ? true : undefined}>
				<FieldLabel htmlFor="code">Code from your email</FieldLabel>
				<Input
					aria-invalid={codeError ? true : undefined}
					autoComplete="one-time-code"
					autoFocus
					className="font-mono tracking-[0.3em]"
					id="code"
					inputMode="numeric"
					maxLength={6}
					onChange={(event) => setCode(event.target.value)}
					required
					value={code}
				/>
				<FieldDescription>
					New device, so we sent a 6-digit code to {email}.
				</FieldDescription>
				<FieldError>{codeError}</FieldError>
			</Field>
			<div className="flex flex-col gap-3">
				<Button
					className="w-full"
					disabled={busy || code.trim().length === 0}
					size="lg"
					type="submit"
				>
					{busy ? <Spinner /> : null}
					Verify
				</Button>
				<div className="flex items-center justify-between">
					<Button onClick={onBack} size="sm" type="button" variant="ghost">
						<ArrowLeftIcon />
						Back
					</Button>
					<Button
						disabled={busy}
						onClick={onResend}
						size="sm"
						type="button"
						variant="link"
					>
						Send a new code
					</Button>
				</div>
			</div>
		</form>
	);
}

/** Only same-site paths: `redirect_url` comes from the query string. Runs in the browser. */
function safeRedirect(value: string | null) {
	if (!value) {
		return "/";
	}
	try {
		const url = new URL(value, window.location.origin);
		return url.origin === window.location.origin
			? `${url.pathname}${url.search}`
			: "/";
	} catch {
		return "/";
	}
}
