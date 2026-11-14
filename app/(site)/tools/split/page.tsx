import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { NewGroupForm } from "@/components/split/new-group-form";

export const metadata: Metadata = {
  title: "Cost splitter",
  description:
    "Track shared costs in a group and see who pays whom to settle up.",
};

export default function NewSplitGroupPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 pb-16 lg:px-10">
      <PageHeader
        eyebrow="Tools · Everyday"
        title="Cost splitter"
        lede="Start a group, send the link, and everyone adds what they paid. Balances and who pays whom to settle up update as you go."
      />
      <NewGroupForm />
      <p className="text-muted-foreground mt-6 text-sm">
        No sign-up. Each group lives at its own unguessable link; anyone who has
        it can view and edit the group.
      </p>
    </div>
  );
}
