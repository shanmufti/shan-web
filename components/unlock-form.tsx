"use client";

import { useActionState } from "react";

import { unlockPrivateContent, type UnlockState } from "@/lib/actions/unlock";

export function UnlockForm({ next }: Readonly<{ next: string }>) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(
    unlockPrivateContent,
    {},
  );

  return (
    <form action={action} className="mt-8 max-w-sm">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="passcode" className="meta-label text-muted-foreground">
        Passcode
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "passcode-error" : undefined}
          className="border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring h-10 min-w-0 flex-1 rounded-md border px-3 text-base outline-none focus-visible:ring-3"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
      </div>
      {state.error ? (
        <p
          id="passcode-error"
          role="alert"
          className="text-destructive mt-3 text-sm"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
