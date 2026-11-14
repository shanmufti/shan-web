"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
}

const selectClass =
  "border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-3";

/**
 * GET form: filters live in the URL, so they work without JavaScript (via
 * the Apply button) and can be bookmarked. With JavaScript, any change
 * applies at once.
 */
export function HobbyFilters({
  action,
  fields,
  active,
}: Readonly<{ action: string; fields: FilterField[]; active: boolean }>) {
  const router = useRouter();
  // Navigate with only the filters that are set, so URLs stay short.
  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value !== "") params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${action}?${query}` : action, { scroll: false });
  };

  return (
    <form
      action={action}
      method="get"
      aria-label="Filter references"
      onChange={(event) => {
        apply(event.currentTarget);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
      className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      {fields.map((field) => (
        <div key={field.name} className="min-w-0">
          <label
            htmlFor={`filter-${field.name}`}
            className="meta-label text-muted-foreground"
          >
            {field.label}
          </label>
          <select
            id={`filter-${field.name}`}
            name={field.name}
            defaultValue={field.value}
            className={`${selectClass} mt-1`}
          >
            <option value="">All</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
        <noscript>
          <button
            type="submit"
            className="border-input hover:bg-muted h-9 rounded-md border px-3 text-sm"
          >
            Apply
          </button>
        </noscript>
        {active ? (
          <Link
            href={action}
            scroll={false}
            replace
            className="text-muted-foreground hover:text-foreground h-9 content-center text-sm underline-offset-4 hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </div>
    </form>
  );
}
