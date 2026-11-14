"use client";

import { useEffect, useId, useRef, useState, type SyntheticEvent } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import {
  decodeText,
  decryptInner,
  decryptOuter,
  type EncryptedSecret,
} from "@/lib/secret-crypto";

type State =
  | { step: "loading" }
  | { step: "no-key" }
  | { step: "ready" }
  | { step: "opening" }
  | { step: "passphrase"; inner: Uint8Array<ArrayBuffer>; salt: string }
  | { step: "revealed"; text: string }
  | { step: "gone" }
  | { step: "broken" };

const inputClass =
  "border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

function Gone() {
  return (
    <div role="status">
      <h2 className="text-lg font-medium">Already opened or expired</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        This secret can&apos;t be shown. Each link opens once, and unopened
        links expire. Ask the sender for a new one.
      </p>
    </div>
  );
}

export function SecretReveal({
  id,
  waiting,
}: Readonly<{ id: string; waiting: boolean }>) {
  const uid = useId();
  const keyRef = useRef<string>("");
  const [state, setState] = useState<State>({ step: "loading" });
  const [passphrase, setPassphrase] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // The key is only in the fragment, which never reaches the server.
    keyRef.current = window.location.hash.slice(1);
    let next: State;
    if (!waiting) next = { step: "gone" };
    else if (keyRef.current === "") next = { step: "no-key" };
    else next = { step: "ready" };
    // Reading the fragment is only possible after hydration.
    setState(next);
  }, [waiting]);

  useEffect(() => {
    if (state.step === "passphrase" || state.step === "revealed") {
      headingRef.current?.focus();
    }
  }, [state.step]);

  async function reveal() {
    setState({ step: "opening" });
    let secret: EncryptedSecret;
    try {
      const response = await fetch(`/s/${id}/open`, {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        setState({ step: "gone" });
        return;
      }
      secret = (await response.json()) as EncryptedSecret;
    } catch {
      setState({ step: "ready" });
      return;
    }
    // Drop the key from the address bar and history now it's been used.
    window.history.replaceState(null, "", window.location.pathname);
    try {
      const inner = await decryptOuter(secret, keyRef.current);
      if (secret.salt) {
        setState({ step: "passphrase", inner, salt: secret.salt });
      } else {
        setState({ step: "revealed", text: decodeText(inner) });
      }
    } catch {
      setState({ step: "broken" });
    }
  }

  async function unlock(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (state.step !== "passphrase") return;
    setPassError(null);
    try {
      const bytes = await decryptInner(state.inner, state.salt, passphrase);
      setState({ step: "revealed", text: decodeText(bytes) });
      setPassphrase("");
    } catch {
      setPassError("That passphrase doesn't match. Try again.");
    }
  }

  switch (state.step) {
    case "loading":
      return (
        <p className="text-muted-foreground text-sm">Checking the link…</p>
      );
    case "gone":
      return <Gone />;
    case "no-key":
      return (
        <div role="status">
          <h2 className="text-lg font-medium">This link is incomplete</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The part after the # is missing, and the secret can&apos;t be
            decrypted without it. Copy the whole link and try again. The secret
            hasn&apos;t been opened.
          </p>
        </div>
      );
    case "broken":
      return (
        <div role="alert">
          <h2 className="text-lg font-medium">Couldn&apos;t decrypt</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The key in the link doesn&apos;t match, so the link was probably
            changed or cut short. The secret has been deleted; ask the sender
            for a new one.
          </p>
        </div>
      );
    case "ready":
    case "opening":
      return (
        <div>
          <h2 className="text-lg font-medium">Reveal the secret?</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            It can be shown only once. After this it&apos;s deleted, so copy it
            somewhere safe before you leave the page.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-5"
            disabled={state.step === "opening"}
            onClick={() => void reveal()}
          >
            {state.step === "opening" ? "Opening…" : "Reveal"}
          </Button>
        </div>
      );
    case "passphrase":
      return (
        <form onSubmit={(e) => void unlock(e)}>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-medium outline-none"
          >
            Enter the passphrase
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            The sender added a passphrase. The secret is already deleted from
            the server, so keep this page open until it shows.
          </p>
          <label
            htmlFor={`${uid}-pass`}
            className="text-muted-foreground mt-4 block text-xs tracking-wide uppercase"
          >
            Passphrase
          </label>
          <input
            id={`${uid}-pass`}
            type="password"
            value={passphrase}
            onChange={(e) => {
              setPassphrase(e.target.value);
            }}
            autoComplete="off"
            aria-invalid={passError ? true : undefined}
            aria-describedby={passError ? `${uid}-pass-error` : undefined}
            className={`${inputClass} max-w-sm`}
          />
          {passError ? (
            <p
              id={`${uid}-pass-error`}
              className="text-destructive mt-2 text-sm"
              role="alert"
            >
              {passError}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="mt-4">
            Decrypt
          </Button>
        </form>
      );
    case "revealed":
      return (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-medium outline-none"
            >
              The secret
            </h2>
            <CopyButton text={state.text} label="secret" />
          </div>
          <pre
            className="bg-muted focus-visible:ring-ring/50 mt-3 max-h-[60vh] overflow-auto rounded-md p-4 font-mono text-sm break-words whitespace-pre-wrap outline-none focus-visible:ring-3"
            data-testid="secret-text"
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region
            tabIndex={0}
          >
            {state.text}
          </pre>
          <p className="text-muted-foreground mt-3 text-sm">
            It&apos;s been deleted from the server. Reloading this page
            won&apos;t show it again.
          </p>
        </div>
      );
  }
}
