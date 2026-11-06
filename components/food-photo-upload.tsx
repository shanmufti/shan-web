"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { uploadFoodPhoto } from "@/lib/actions/upload-food-photo";

interface Option {
  id: string;
  name: string;
}

const MAX_EDGE = 1600;
const MAX_FILES = 10;

const selectClass =
  "border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";

/**
 * Shrink to MAX_EDGE and re-encode as JPEG in the browser, so uploads are
 * small and phone location data is dropped. Falls back to the original file
 * when the browser can't decode it (e.g. HEIC outside Safari).
 */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function FoodPhotoUpload({
  restaurants,
}: Readonly<{ restaurants: Option[] }>) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [status, setStatus] = useState<{
    kind: "idle" | "busy" | "done" | "error";
    text?: string;
  }>({ kind: "idle" });

  async function handleSubmit(form: HTMLFormElement) {
    const files = [...(fileRef.current?.files ?? [])].slice(0, MAX_FILES);
    if (files.length === 0) {
      setStatus({ kind: "error", text: "Pick at least one photo." });
      return;
    }
    const honeypot = new FormData(form).get("company");
    let added = 0;
    for (const [index, original] of files.entries()) {
      setStatus({
        kind: "busy",
        text: `Adding ${String(index + 1)} of ${String(files.length)}…`,
      });
      const data = new FormData();
      data.set("restaurantId", restaurantId);
      data.set("company", typeof honeypot === "string" ? honeypot : "");
      data.set("photo", await shrink(original));
      const result = await uploadFoodPhoto(data);
      if (result.error) {
        setStatus({ kind: "error", text: result.error });
        router.refresh();
        return;
      }
      added += 1;
    }
    form.reset();
    setStatus({
      kind: "done",
      text: added === 1 ? "Photo added!" : `${String(added)} photos added!`,
    });
    router.refresh();
  }

  const busy = status.kind === "busy";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(e.currentTarget);
      }}
      className="ring-foreground/10 bg-card/90 space-y-4 rounded-xl p-5 ring-1 backdrop-blur-sm"
    >
      <p className="flex items-center gap-2 font-medium">
        <Camera className="size-4" aria-hidden="true" />
        Add your photos
      </p>
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="photo-company">Company</label>
        <input
          id="photo-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="photo-restaurant" className={labelClass}>
            Restaurant
          </label>
          <select
            id="photo-restaurant"
            required
            value={restaurantId}
            onChange={(e) => {
              setRestaurantId(e.target.value);
            }}
            className={selectClass}
          >
            <option value="" disabled>
              Pick a stop…
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="photo-files" className={labelClass}>
            Photos (up to {MAX_FILES})
          </label>
          <input
            id="photo-files"
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            required
            className="file:bg-muted mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-2.5 file:text-sm"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={
            status.kind === "error"
              ? "text-destructive text-sm"
              : "text-muted-foreground text-sm"
          }
        >
          {status.text ?? "Photos show up for everyone right away."}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md px-5 text-sm font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Add photos"}
        </button>
      </div>
    </form>
  );
}
