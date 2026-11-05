import { Lock } from "lucide-react";

import { UnlockForm } from "./unlock-form";

/** Shown in place of a private journey or story when the visitor is locked out. */
export function LockedPage({
  kind,
  title,
  next,
}: Readonly<{ kind: "Journey" | "Story"; title: string; next: string }>) {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-16 sm:pt-24 lg:px-10">
      <p className="meta-label text-muted-foreground inline-flex items-center gap-2">
        <Lock className="size-3.5" aria-hidden="true" />
        {kind} · Private
      </p>
      <h1 className="font-heading mt-3 max-w-3xl text-[clamp(2.25rem,4vw,3.5rem)]">
        {title}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
        This {kind.toLowerCase()} is passcode-protected. Enter the passcode to
        read it, along with the other private posts.
      </p>
      <UnlockForm next={next} />
    </div>
  );
}
