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

function labelize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pushMetric(
  rows: { label: string; value: string }[],
  label: string,
  value: string | null | undefined,
) {
  if (value) rows.push({ label, value });
}

function vitalsRows(dive: DiveDoc): { label: string; value: string }[] {
  const vitals = dive.vitals;
  const rows: { label: string; value: string }[] = [];

  if (dive.diveNumber != null) {
    rows.push({ label: "Dive #", value: String(dive.diveNumber) });
  }
  pushMetric(rows, "Start", dive.startTime);
  pushMetric(rows, "End", dive.endTime);

  const depth = diveMaxDepth(dive);
  if (depth != null)
    rows.push({ label: "Max depth", value: `${String(depth)} m` });
  if (vitals?.avgDepthMeters != null) {
    rows.push({
      label: "Avg depth",
      value: `${String(vitals.avgDepthMeters)} m`,
    });
  }

  const time = diveBottomTime(dive);
  if (time != null)
    rows.push({ label: "Duration", value: `${String(time)} min` });

  const viz = diveVisibility(dive);
  if (viz != null)
    rows.push({ label: "Visibility", value: `${String(viz)} m` });

  if (vitals?.surfaceTempC != null) {
    rows.push({
      label: "Max water temp",
      value: `${String(vitals.surfaceTempC)} °C`,
    });
  }
  if (vitals?.bottomTempC != null) {
    rows.push({
      label: "Min water temp",
      value: `${String(vitals.bottomTempC)} °C`,
    });
  }
  if (vitals?.avgTempC != null) {
    rows.push({
      label: "Avg water temp",
      value: `${String(vitals.avgTempC)} °C`,
    });
  }
  if (vitals?.weightLbs != null) {
    rows.push({ label: "Weight", value: `${String(vitals.weightLbs)} lbs` });
  }
  if (vitals?.gasType) {
    rows.push({ label: "Gas", value: labelize(vitals.gasType) });
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
    rows.push({ label: "SAC", value: `${String(vitals.sac)} psi/min` });
  }

  pushMetric(rows, "Config", formatConfigName(dive));
  pushMetric(rows, "Site", dive.siteDetail);
  pushMetric(rows, "Buddy", dive.buddyOrShop);

  return rows;
}

function SectionGrid({
  title,
  rows,
}: Readonly<{
  title: string;
  rows: { label: string; value: string }[];
}>) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="border-border border-b pb-2">
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium whitespace-pre-wrap">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function DiveVitalsGrid({ dive }: Readonly<{ dive: DiveDoc }>) {
  const rows = vitalsRows(dive);
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

export function DiveEnvironmentSection({ dive }: Readonly<{ dive: DiveDoc }>) {
  const env = dive.environment;
  if (!env) return null;
  const rows: { label: string; value: string }[] = [];
  if (env.airTempC != null)
    rows.push({ label: "Air temp", value: `${String(env.airTempC)} °C` });
  if (env.weather)
    rows.push({ label: "Weather", value: labelize(env.weather) });
  if (env.platform)
    rows.push({ label: "Platform", value: labelize(env.platform) });
  if (env.environmentType)
    rows.push({
      label: "Environment",
      value: labelize(env.environmentType),
    });
  if (env.conditions)
    rows.push({ label: "Conditions", value: labelize(env.conditions) });
  if (env.notes) rows.push({ label: "Notes", value: env.notes });
  return <SectionGrid title="Environment" rows={rows} />;
}

export function DiveProblemsSection({ dive }: Readonly<{ dive: DiveDoc }>) {
  const problems = dive.problems;
  if (!problems) return null;
  const rows: { label: string; value: string }[] = [];
  if (problems.thermalComfort)
    rows.push({
      label: "Thermal comfort",
      value: labelize(problems.thermalComfort),
    });
  if (problems.equipmentMalfunction)
    rows.push({
      label: "Equipment malfunction",
      value: labelize(problems.equipmentMalfunction),
    });
  if (problems.equipmentMalfunctionNotes)
    rows.push({
      label: "Malfunction notes",
      value: problems.equipmentMalfunctionNotes,
    });
  if (problems.workload)
    rows.push({ label: "Workload", value: labelize(problems.workload) });
  if (problems.anySymptoms)
    rows.push({ label: "Any symptoms", value: problems.anySymptoms });
  if (problems.problems)
    rows.push({ label: "Problems", value: problems.problems });
  if (problems.exposureToAltitude)
    rows.push({
      label: "Exposure to altitude",
      value: labelize(problems.exposureToAltitude),
    });
  if (problems.notes) rows.push({ label: "Notes", value: problems.notes });
  if (problems.postDiveCheckup)
    rows.push({
      label: "Post-dive checkup",
      value: problems.postDiveCheckup,
    });
  return <SectionGrid title="Problems" rows={rows} />;
}

export function DiveGearSection({ dive }: Readonly<{ dive: DiveDoc }>) {
  const gear = dive.gearWorn;
  if (!gear) return null;
  const rows: { label: string; value: string }[] = [];
  if (gear.dress) rows.push({ label: "Dress", value: labelize(gear.dress) });
  if (gear.apparatus)
    rows.push({ label: "Apparatus", value: labelize(gear.apparatus) });
  if (gear.tankSize) rows.push({ label: "Tank size", value: gear.tankSize });
  if (gear.notes) rows.push({ label: "Notes", value: gear.notes });
  return <SectionGrid title="Gear" rows={rows} />;
}

export function DiveNotesSections({ dive }: Readonly<{ dive: DiveDoc }>) {
  const notes = dive.notes;
  if (!notes) return null;

  const sections: { label: string; value: string | null | undefined }[] = [
    { label: "Dive notes", value: notes.diveNotes },
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

export function DiveLogRow({ dive }: Readonly<{ dive: DiveDoc }>) {
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
