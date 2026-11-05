import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { UnlockForm } from "@/components/unlock-form";

export const metadata: Metadata = {
  title: "Private",
  robots: { index: false, follow: false },
};

function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function UnlockPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10">
      <PageHeader
        eyebrow="Private"
        title="This one's for friends and family"
        lede="Some journeys and stories are passcode-protected. If you've been given the passcode, enter it to read them all."
      />
      <UnlockForm next={safeNext(next)} />
    </div>
  );
}
