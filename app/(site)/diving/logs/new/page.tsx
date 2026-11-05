import type { Metadata } from "next";
import Link from "next/link";

import { DivingSubnav } from "@/components/diving-subnav";
import { LogDiveForm } from "@/components/log-dive-form";

export const metadata: Metadata = { title: "Log a dive" };

export default function LogDivePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 pt-16 pb-8 sm:pt-24 lg:px-10">
      <header>
        <p className="text-muted-foreground text-sm">
          <Link
            href="/diving/logs"
            className="underline-offset-4 hover:underline"
          >
            ← Dive logs
          </Link>
        </p>
        <h1 className="font-heading mt-4 text-4xl sm:text-5xl">Log a dive</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Optional Shearwater CSV fills vitals and the depth profile. Add
          location, buddy, environment, and gear details here.
        </p>
        <DivingSubnav current="/diving/logs" />
      </header>

      <LogDiveForm />
    </div>
  );
}
