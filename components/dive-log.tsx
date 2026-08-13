import type { DiveDoc } from "@/lib/content";
import { diveBottomTime, diveMaxDepth, diveVisibility } from "@/lib/content";
import { formatDate } from "@/lib/format-date";

function formatConfigName(dive: DiveDoc): string | null {
  const config = dive.equipmentConfig;
  if (config && typeof config === "object" && "name" in config) {
    return typeof config.name === "string" ? config.name : null;
  }
  return null;
}

export function DiveVitalsGrid({ dive }: { dive: DiveDoc }) {
  const vitals = dive.vitals;
  const rows: { label: string; value: string }[] = [];

  const depth = diveMaxDepth(dive);
  if (depth != null)
    rows.push({ label: "Max depth", value: `${String(depth)} m` });

  const time = diveBottomTime(dive);
  if (time != null)
    rows.push({ label: "Bottom time", value: `${String(time)} min` });

  const viz = diveVisibility(dive);
  if (viz != null)
    rows.push({ label: "Visibility", value: `${String(viz)} m` });

  if (vitals?.surfaceTempC != null) {
    rows.push({
      label: "Surface temp",
      value: `${String(vitals.surfaceTempC)} °C`,
    });
  }
  if (vitals?.bottomTempC != null) {
    rows.push({
      label: "Bottom temp",
      value: `${String(vitals.bottomTempC)} °C`,
    });
  }
  if (vitals?.weightLbs != null) {
    rows.push({ label: "Weight", value: `${String(vitals.weightLbs)} lbs` });
  }
  if (vitals?.gasType) {
    const gas =
      vitals.gasType.charAt(0).toUpperCase() + vitals.gasType.slice(1);
    rows.push({ label: "Gas", value: gas });
  }
  if (vitals?.startPressurePsi != null) {
    rows.push({
      label: "Start pressure",
      value: `${String(vitals.startPressurePsi)} PSI`,
    });
  }
  if (vitals?.endPressurePsi != null) {
    rows.push({
      label: "End pressure",
      value: `${String(vitals.endPressurePsi)} PSI`,
    });
  }
  if (vitals?.sac != null) {
    rows.push({ label: "SAC", value: String(vitals.sac) });
  }

  const configName = formatConfigName(dive);
  if (configName) rows.push({ label: "Config", value: configName });
  if (dive.buddyOrShop)
    rows.push({ label: "Buddy / shop", value: dive.buddyOrShop });

  if (rows.length === 0) return null;

  return (
    <dl className="mt-8 grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="border-border border-b pb-2">
          <dt className="text-muted-foreground text-xs tracking-wide uppercase">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DiveNotesSections({ dive }: { dive: DiveDoc }) {
  const notes = dive.notes;
  if (!notes) return null;

  const sections: { label: string; value: string | null | undefined }[] = [
    { label: "Skills practiced", value: notes.skillsPracticed },
    { label: "Dive buddies & team notes", value: notes.buddyNotes },
    { label: "Thermal comfort", value: notes.thermalComfort },
    { label: "Trim observations", value: notes.trimNotes },
    { label: "Gear function / issues", value: notes.gearIssues },
    { label: "Environmental notes", value: notes.environmentalNotes },
    { label: "Lessons learned", value: notes.lessonsLearned },
  ];

  const filled = sections.filter((s) => s.value && s.value.trim() !== "");
  if (filled.length === 0) return null;

  return (
    <div className="mt-10 space-y-6">
      {filled.map((section) => (
        <section key={section.label}>
          <h2 className="font-heading text-base font-semibold">
            {section.label}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm whitespace-pre-wrap">
            {section.value}
          </p>
        </section>
      ))}
    </div>
  );
}

export function DiveLogRow({ dive }: { dive: DiveDoc }) {
  const depth = diveMaxDepth(dive);
  const time = diveBottomTime(dive);
  const site = dive.siteName ?? dive.location.name;

  return (
    <div className="border-border flex flex-wrap items-baseline justify-between gap-2 border-b py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{dive.title}</p>
        <p className="text-muted-foreground text-xs">
          {formatDate(dive.date)}
          {site ? ` · ${site}` : ""}
          {dive.buddyOrShop ? ` · ${dive.buddyOrShop}` : ""}
        </p>
      </div>
      <p className="text-muted-foreground shrink-0 text-xs">
        {[
          depth != null ? `${String(depth)} m` : null,
          time != null ? `${String(time)} min` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </div>
  );
}
