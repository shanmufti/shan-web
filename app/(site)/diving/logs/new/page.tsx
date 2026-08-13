import type { Metadata } from "next";
import Link from "next/link";

import { DivingSubnav } from "@/components/diving-subnav";
import { LogDiveForm } from "@/components/log-dive-form";

export const metadata: Metadata = { title: "Log a dive" };

export default function LogDivePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <p className="text-muted-foreground text-sm">
          <Link
            href="/diving/logs"
            className="underline-offset-4 hover:underline"
          >
            ← Dive logs
          </Link>
        </p>
        <h1 className="font-heading mt-4 text-2xl font-semibold">Log a dive</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Record vitals and a few notes. You can fill the rest later in admin if
          needed.
        </p>
        <DivingSubnav current="/diving/logs" />
      </header>

      <LogDiveForm />
    </div>
  );
}
