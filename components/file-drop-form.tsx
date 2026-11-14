"use client";

import { useActionState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { createFileDrop, type CreateDropState } from "@/lib/actions/file-drops";
import { DROP_EXPIRY_DAYS } from "@/lib/drop-options";

export interface DropFileOption {
  id: number;
  label: string;
}

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";
const inputClass =
  "border-input bg-background focus-visible:ring-ring/40 mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2";

export function FileDropForm({
  files,
  selectedFileId,
}: Readonly<{ files: DropFileOption[]; selectedFileId?: number | undefined }>) {
  const [state, formAction, pending] = useActionState<
    CreateDropState,
    FormData
  >(createFileDrop, {});

  return (
    <form
      action={formAction}
      className="border-border bg-card grid gap-5 rounded-lg border p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="drop-file" className={labelClass}>
          Vault file
        </label>
        <select
          id="drop-file"
          name="fileId"
          defaultValue={selectedFileId ? String(selectedFileId) : ""}
          className={inputClass}
        >
          <option value="">Choose a file…</option>
          {files.map((file) => (
            <option key={file.id} value={file.id}>
              {file.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="drop-upload" className={labelClass}>
          Or upload a new file (up to 4 MB)
        </label>
        <input
          id="drop-upload"
          name="upload"
          type="file"
          className={`${inputClass} file:bg-muted file:text-foreground file:mr-3 file:rounded file:border-0 file:px-2 file:py-1 file:text-sm`}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          An uploaded file is saved to the vault and used instead of the picked
          one.
        </p>
      </div>
      <div>
        <label htmlFor="drop-expiry" className={labelClass}>
          Expires after
        </label>
        <select
          id="drop-expiry"
          name="expiresInDays"
          defaultValue="7"
          className={inputClass}
        >
          {DROP_EXPIRY_DAYS.map((days) => (
            <option key={days} value={days}>
              {days === 1 ? "1 day" : `${String(days)} days`}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="drop-max" className={labelClass}>
          Max downloads (optional)
        </label>
        <input
          id="drop-max"
          name="maxDownloads"
          type="number"
          min={1}
          max={1000}
          inputMode="numeric"
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="drop-note" className={labelClass}>
          Note (shown on the download page)
        </label>
        <textarea
          id="drop-note"
          name="note"
          rows={2}
          maxLength={500}
          className={inputClass}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create link"}
        </Button>
        {state.error ? (
          <p className="text-destructive text-sm" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
      {state.link ? (
        <div
          className="bg-muted flex flex-wrap items-center gap-3 rounded-md p-3 sm:col-span-2"
          role="status"
        >
          <code className="min-w-0 flex-1 text-xs break-all">{state.link}</code>
          <CopyButton text={state.link} label="drop link" />
        </div>
      ) : null}
    </form>
  );
}
