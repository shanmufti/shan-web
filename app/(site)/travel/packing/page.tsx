import type { Metadata } from "next";
import Link from "next/link";

import { ClonePackingListForm } from "@/components/clone-packing-list-form";
import { TravelSubnav } from "@/components/section-subnav";
import { listPackingListTemplatesForUser } from "@/lib/content";

export const metadata: Metadata = { title: "Packing lists" };

export default async function PackingListsPage() {
  const templates = await listPackingListTemplatesForUser();

  if (!templates) {
    return (
      <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
        <header>
          <h1 className="font-heading text-4xl sm:text-5xl">Packing lists</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Templates are private.
          </p>
          <TravelSubnav current="/travel/packing" />
        </header>
        <p className="text-muted-foreground mt-10 text-sm">
          Sign in via{" "}
          <Link
            href="/admin"
            className="font-medium underline-offset-4 hover:underline"
          >
            admin
          </Link>{" "}
          to clone a template into a new list.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <header>
        <h1 className="font-heading text-4xl sm:text-5xl">Packing lists</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Clone a template into a new list, then share the link.
        </p>
        <TravelSubnav current="/travel/packing" />
      </header>

      {templates.length > 0 ? (
        <ClonePackingListForm
          templates={templates.map((t) => ({ id: String(t.id), name: t.name }))}
        />
      ) : (
        <p className="text-muted-foreground mt-8 text-sm">
          No templates yet.{" "}
          <Link
            href="/admin/collections/packing-list-templates/create"
            className="font-medium underline-offset-4 hover:underline"
          >
            Create one in admin
          </Link>
          .
        </p>
      )}
    </div>
  );
}
