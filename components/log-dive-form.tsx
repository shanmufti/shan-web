"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { createDiveLog } from "@/lib/actions/create-dive-log";
import type { DiveFormState } from "@/lib/actions/dive-form-data";
import { updateDiveLog } from "@/lib/actions/update-dive-log";
import { calculateSacPsiPerMin, parseOptionalNumber } from "@/lib/dive-sac";
import {
  parseShearwaterDiveCsv,
  type ProfileSample,
} from "@/lib/shearwater-csv";

const inputClass =
  "border-border bg-background mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const labelClass =
  "text-muted-foreground block text-xs tracking-wide uppercase";

function sacFieldValue(
  sacManual: boolean,
  sac: string,
  calculatedSac: number | null,
): string {
  if (sacManual) return sac;
  if (calculatedSac == null) return "";
  return String(calculatedSac);
}

function sacStatusText(
  calculatedSac: number | null,
  sacManual: boolean,
  sacFromProfile: boolean,
): string {
  if (calculatedSac != null) {
    if (sacManual) return `Calculated ${String(calculatedSac)} — `;
    if (sacFromProfile) return "Auto from PSI and depth profile. ";
    return "Auto from start/end PSI, duration, and avg depth. ";
  }
  if (sacFromProfile) return "Needs start/end PSI (profile is loaded). ";
  return "Needs start/end PSI, duration, and avg (or max) depth. ";
}

function sacFormulaText(sacFromProfile: boolean): string {
  if (sacFromProfile) {
    return "Formula: (start PSI − end PSI) ÷ ∫ ATA dt, where ATA = depth(m)/10 + 1 integrated over the Shearwater profile (surface-normalized psi/min).";
  }
  return "Formula: (start PSI − end PSI) ÷ (duration × ATA), where ATA = avg depth(m)/10 + 1 (falls back to max depth). With a CSV profile, this uses ∫ ATA over the samples instead.";
}

function submitButtonLabel(pending: boolean, mode: "create" | "edit"): string {
  if (pending) return "Saving…";
  if (mode === "edit") return "Update dive";
  return "Save dive";
}

function setIfNumber(
  value: number | null | undefined,
  setter: (next: string) => void,
) {
  if (value != null) setter(String(value));
}

function csvLoadedStatus(parsed: {
  product: string;
  diveNumber: number;
  profileSamples: { length: number };
}): string {
  return `Loaded ${parsed.product} #${String(parsed.diveNumber)} · ${String(parsed.profileSamples.length)} samples`;
}

export interface DiveFormValues {
  id?: number;
  title?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  diveNumber?: number | null;
  siteName?: string | null;
  siteDetail?: string | null;
  buddyOrShop?: string | null;
  maxDepthMeters?: number | null;
  avgDepthMeters?: number | null;
  bottomTimeMinutes?: number | null;
  visibilityMeters?: number | null;
  surfaceTempC?: number | null;
  bottomTempC?: number | null;
  avgTempC?: number | null;
  weightLbs?: number | null;
  gasType?: string | null;
  startPressurePsi?: number | null;
  endPressurePsi?: number | null;
  sac?: number | null;
  airTempC?: number | null;
  weather?: string | null;
  platform?: string | null;
  environmentType?: string | null;
  conditions?: string | null;
  environmentNotes?: string | null;
  thermalComfort?: string | null;
  equipmentMalfunction?: string | null;
  equipmentMalfunctionNotes?: string | null;
  workload?: string | null;
  anySymptoms?: string | null;
  problemsText?: string | null;
  exposureToAltitude?: string | null;
  problemsNotes?: string | null;
  postDiveCheckup?: string | null;
  dress?: string | null;
  apparatus?: string | null;
  tankSize?: string | null;
  gearNotes?: string | null;
  diveNotes?: string | null;
  skillsPracticed?: string | null;
  lessonsLearned?: string | null;
  hasProfile?: boolean;
  profileSamples?: ProfileSample[];
}

function todayInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

function str(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function LogDiveForm({
  mode = "create",
  initial,
}: Readonly<{
  mode?: "create" | "edit";
  initial?: DiveFormValues;
}>) {
  const action = mode === "edit" ? updateDiveLog : createDiveLog;
  const [state, formAction, pending] = useActionState<DiveFormState, FormData>(
    action,
    {},
  );

  const [csvStatus, setCsvStatus] = useState<string | null>(
    initial?.hasProfile
      ? "Profile already attached (upload a CSV to replace)."
      : null,
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [profileSamples, setProfileSamples] = useState<ProfileSample[]>(
    initial?.profileSamples ?? [],
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? todayInputValue());
  const [startTime, setStartTime] = useState(str(initial?.startTime));
  const [endTime, setEndTime] = useState(str(initial?.endTime));
  const [diveNumber, setDiveNumber] = useState(str(initial?.diveNumber));
  const [maxDepth, setMaxDepth] = useState(str(initial?.maxDepthMeters));
  const [avgDepth, setAvgDepth] = useState(str(initial?.avgDepthMeters));
  const [bottomTime, setBottomTime] = useState(str(initial?.bottomTimeMinutes));
  const [surfaceTemp, setSurfaceTemp] = useState(str(initial?.surfaceTempC));
  const [bottomTemp, setBottomTemp] = useState(str(initial?.bottomTempC));
  const [avgTemp, setAvgTemp] = useState(str(initial?.avgTempC));
  const [gasType, setGasType] = useState(initial?.gasType ?? "air");
  const [startPsi, setStartPsi] = useState(str(initial?.startPressurePsi));
  const [endPsi, setEndPsi] = useState(str(initial?.endPressurePsi));
  const [sac, setSac] = useState(str(initial?.sac));
  const [sacManual, setSacManual] = useState(initial?.sac != null);
  const [equipmentMalfunction, setEquipmentMalfunction] = useState(
    initial?.equipmentMalfunction ?? "",
  );
  const showMalfunctionNotes =
    equipmentMalfunction === "minor" || equipmentMalfunction === "yes";

  const bottomTimeNum = parseOptionalNumber(bottomTime);
  const depthNum =
    parseOptionalNumber(avgDepth) ?? parseOptionalNumber(maxDepth);
  const calculatedSac = calculateSacPsiPerMin({
    startPsi: parseOptionalNumber(startPsi) ?? Number.NaN,
    endPsi: parseOptionalNumber(endPsi) ?? Number.NaN,
    ...(bottomTimeNum != null ? { bottomTimeMinutes: bottomTimeNum } : {}),
    ...(depthNum != null ? { avgDepthMeters: depthNum } : {}),
    ...(profileSamples.length >= 2 ? { profileSamples } : {}),
  });
  const sacFromProfile = profileSamples.length >= 2;
  const sacValue = sacFieldValue(sacManual, sac, calculatedSac);
  const sacStatus = sacStatusText(calculatedSac, sacManual, sacFromProfile);

  async function onCsvChange(event: ChangeEvent<HTMLInputElement>) {
    setCsvError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setCsvStatus(null);
      setCsvFileName(null);
      return;
    }
    setCsvFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseShearwaterDiveCsv(text);
      setProfileSamples(parsed.profileSamples);
      setDate(parsed.date);
      setStartTime(parsed.startTime);
      setEndTime(parsed.endTime);
      setDiveNumber(String(parsed.diveNumber));
      setMaxDepth(String(parsed.maxDepthMeters));
      setBottomTime(String(parsed.bottomTimeMinutes));
      setIfNumber(parsed.avgDepthMeters, setAvgDepth);
      setIfNumber(parsed.surfaceTempC, setSurfaceTemp);
      setIfNumber(parsed.bottomTempC, setBottomTemp);
      setIfNumber(parsed.avgTempC, setAvgTemp);
      setGasType(parsed.gasType);
      if (!title.trim()) {
        setTitle(
          `${parsed.date} - Dive #${String(parsed.diveNumber)} (${parsed.product})`,
        );
      }
      setCsvStatus(csvLoadedStatus(parsed));
    } catch (err) {
      setCsvStatus(null);
      setCsvError(err instanceof Error ? err.message : "Could not parse CSV.");
    }
  }

  return (
    <form action={formAction} className="mt-8 space-y-10">
      {mode === "edit" && initial?.id != null ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">
          Shearwater CSV
        </h2>
        <p className="text-muted-foreground text-sm">
          Optional. Export a dive from Shearwater Cloud Desktop as CSV to
          auto-fill vitals and attach the depth profile.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={csvInputRef}
            id="shearwaterCsv"
            name="shearwaterCsv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              void onCsvChange(e);
            }}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              csvInputRef.current?.click();
            }}
          >
            {csvFileName ? "Replace CSV" : "Upload Shearwater CSV"}
          </Button>
          {csvFileName ? (
            <p className="text-muted-foreground min-w-0 truncate text-sm">
              {csvFileName}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">No file selected</p>
          )}
        </div>
        {csvStatus ? (
          <p className="text-muted-foreground text-xs">{csvStatus}</p>
        ) : null}
        {csvError ? (
          <p className="text-destructive text-xs" role="alert">
            {csvError}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className={labelClass}>
              Dive name
            </label>
            <input
              id="title"
              name="title"
              required
              maxLength={99}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="date" className={labelClass}>
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="diveNumber" className={labelClass}>
              Dive number
            </label>
            <input
              id="diveNumber"
              name="diveNumber"
              type="number"
              min={0}
              value={diveNumber}
              onChange={(e) => {
                setDiveNumber(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startTime" className={labelClass}>
              Start time
            </label>
            <input
              id="startTime"
              name="startTime"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="endTime" className={labelClass}>
              End time
            </label>
            <input
              id="endTime"
              name="endTime"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="maxDepthMeters" className={labelClass}>
              Max depth (m)
            </label>
            <input
              id="maxDepthMeters"
              name="maxDepthMeters"
              type="number"
              min={0}
              step="any"
              value={maxDepth}
              onChange={(e) => {
                setMaxDepth(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="avgDepthMeters" className={labelClass}>
              Avg depth (m)
            </label>
            <input
              id="avgDepthMeters"
              name="avgDepthMeters"
              type="number"
              min={0}
              step="any"
              value={avgDepth}
              onChange={(e) => {
                setAvgDepth(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bottomTimeMinutes" className={labelClass}>
              Duration (min)
            </label>
            <input
              id="bottomTimeMinutes"
              name="bottomTimeMinutes"
              type="number"
              min={0}
              step="any"
              value={bottomTime}
              onChange={(e) => {
                setBottomTime(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="gasType" className={labelClass}>
              Gas
            </label>
            <select
              id="gasType"
              name="gasType"
              value={gasType}
              onChange={(e) => {
                setGasType(e.target.value);
              }}
              className={inputClass}
            >
              <option value="air">Air</option>
              <option value="nitrox">Nitrox</option>
              <option value="trimix">Trimix</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="siteName" className={labelClass}>
              Location
            </label>
            <input
              id="siteName"
              name="siteName"
              defaultValue={str(initial?.siteName)}
              placeholder="Porteau Cove"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="siteDetail" className={labelClass}>
              Site
            </label>
            <input
              id="siteDetail"
              name="siteDetail"
              defaultValue={str(initial?.siteDetail)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="buddyOrShop" className={labelClass}>
              Buddy
            </label>
            <input
              id="buddyOrShop"
              name="buddyOrShop"
              defaultValue={str(initial?.buddyOrShop)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="diveNotes" className={labelClass}>
              Dive notes
            </label>
            <textarea
              id="diveNotes"
              name="diveNotes"
              rows={3}
              defaultValue={str(initial?.diveNotes)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Environment</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="surfaceTempC" className={labelClass}>
              Max water temp (°C)
            </label>
            <input
              id="surfaceTempC"
              name="surfaceTempC"
              type="number"
              step="any"
              value={surfaceTemp}
              onChange={(e) => {
                setSurfaceTemp(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="bottomTempC" className={labelClass}>
              Min water temp (°C)
            </label>
            <input
              id="bottomTempC"
              name="bottomTempC"
              type="number"
              step="any"
              value={bottomTemp}
              onChange={(e) => {
                setBottomTemp(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="avgTempC" className={labelClass}>
              Avg water temp (°C)
            </label>
            <input
              id="avgTempC"
              name="avgTempC"
              type="number"
              step="any"
              value={avgTemp}
              onChange={(e) => {
                setAvgTemp(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="airTempC" className={labelClass}>
              Air temperature (°C)
            </label>
            <input
              id="airTempC"
              name="airTempC"
              type="number"
              step="any"
              defaultValue={str(initial?.airTempC)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="visibilityMeters" className={labelClass}>
              Visibility (m)
            </label>
            <input
              id="visibilityMeters"
              name="visibilityMeters"
              type="number"
              min={0}
              step="any"
              defaultValue={str(initial?.visibilityMeters)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="weather" className={labelClass}>
              Weather
            </label>
            <select
              id="weather"
              name="weather"
              defaultValue={initial?.weather ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="clear">Clear</option>
              <option value="cloudy">Cloudy</option>
              <option value="rain">Rain</option>
              <option value="wind">Wind</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="platform" className={labelClass}>
              Platform
            </label>
            <select
              id="platform"
              name="platform"
              defaultValue={initial?.platform ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="shore">Shore</option>
              <option value="boat">Boat</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="environmentType" className={labelClass}>
              Environment
            </label>
            <select
              id="environmentType"
              name="environmentType"
              defaultValue={initial?.environmentType ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="ocean">Ocean</option>
              <option value="lake">Lake</option>
              <option value="quarry">Quarry</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="conditions" className={labelClass}>
              Conditions
            </label>
            <select
              id="conditions"
              name="conditions"
              defaultValue={initial?.conditions ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="calm">Calm</option>
              <option value="current">Current</option>
              <option value="surge">Surge</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="environmentNotes" className={labelClass}>
              Environment notes
            </label>
            <textarea
              id="environmentNotes"
              name="environmentNotes"
              rows={2}
              defaultValue={str(initial?.environmentNotes)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Problems</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="thermalComfort" className={labelClass}>
              Thermal comfort
            </label>
            <select
              id="thermalComfort"
              name="thermalComfort"
              defaultValue={initial?.thermalComfort ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="cold">Cold</option>
              <option value="cool">Cool</option>
              <option value="comfortable">Comfortable</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
            </select>
          </div>
          <div>
            <label htmlFor="equipmentMalfunction" className={labelClass}>
              Equipment malfunction
            </label>
            <select
              id="equipmentMalfunction"
              name="equipmentMalfunction"
              value={equipmentMalfunction}
              onChange={(e) => {
                setEquipmentMalfunction(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="none">None</option>
              <option value="minor">Minor</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          {showMalfunctionNotes ? (
            <div className="sm:col-span-2">
              <label htmlFor="equipmentMalfunctionNotes" className={labelClass}>
                Malfunction notes
              </label>
              <textarea
                id="equipmentMalfunctionNotes"
                name="equipmentMalfunctionNotes"
                rows={3}
                required
                defaultValue={str(initial?.equipmentMalfunctionNotes)}
                placeholder="What failed, when, and how you handled it."
                className={inputClass}
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="workload" className={labelClass}>
              Workload
            </label>
            <select
              id="workload"
              name="workload"
              defaultValue={initial?.workload ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          <div>
            <label htmlFor="exposureToAltitude" className={labelClass}>
              Exposure to altitude
            </label>
            <select
              id="exposureToAltitude"
              name="exposureToAltitude"
              defaultValue={initial?.exposureToAltitude ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label htmlFor="anySymptoms" className={labelClass}>
              Any symptoms
            </label>
            <input
              id="anySymptoms"
              name="anySymptoms"
              defaultValue={str(initial?.anySymptoms)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="problemsText" className={labelClass}>
              Problems
            </label>
            <input
              id="problemsText"
              name="problemsText"
              defaultValue={str(initial?.problemsText)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="problemsNotes" className={labelClass}>
              Problems notes
            </label>
            <textarea
              id="problemsNotes"
              name="problemsNotes"
              rows={2}
              defaultValue={str(initial?.problemsNotes)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="postDiveCheckup" className={labelClass}>
              Post-dive checkup
            </label>
            <textarea
              id="postDiveCheckup"
              name="postDiveCheckup"
              rows={3}
              defaultValue={str(initial?.postDiveCheckup)}
              placeholder="How you felt afterward, any symptoms, checkup notes."
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Gear</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dress" className={labelClass}>
              Dress
            </label>
            <select
              id="dress"
              name="dress"
              defaultValue={initial?.dress ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="dry-suit">Dry Suit</option>
              <option value="wet-suit">Wet Suit</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="apparatus" className={labelClass}>
              Apparatus
            </label>
            <select
              id="apparatus"
              name="apparatus"
              defaultValue={initial?.apparatus ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="single-tank">Single Tank</option>
              <option value="doubles">Doubles</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="tankSize" className={labelClass}>
              Tank size
            </label>
            <select
              id="tankSize"
              name="tankSize"
              defaultValue={initial?.tankSize ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="AL80">AL80</option>
              <option value="HP100">HP100</option>
              <option value="HP80">HP80</option>
            </select>
          </div>
          <div>
            <label htmlFor="weightLbs" className={labelClass}>
              Weight (lbs)
            </label>
            <input
              id="weightLbs"
              name="weightLbs"
              type="number"
              min={0}
              step="any"
              defaultValue={str(initial?.weightLbs)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="startPressurePsi" className={labelClass}>
              Start PSI
            </label>
            <input
              id="startPressurePsi"
              name="startPressurePsi"
              type="number"
              min={0}
              step="any"
              value={startPsi}
              onChange={(e) => {
                setStartPsi(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="endPressurePsi" className={labelClass}>
              End PSI
            </label>
            <input
              id="endPressurePsi"
              name="endPressurePsi"
              type="number"
              min={0}
              step="any"
              value={endPsi}
              onChange={(e) => {
                setEndPsi(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sac" className={labelClass}>
              SAC (psi/min)
            </label>
            <input
              id="sac"
              name="sac"
              type="number"
              min={0}
              step="any"
              value={sacValue}
              onChange={(e) => {
                setSacManual(true);
                setSac(e.target.value);
              }}
              className={inputClass}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              {sacStatus}
              {calculatedSac != null && sacManual ? (
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => {
                    setSacManual(false);
                    setSac(String(calculatedSac));
                  }}
                >
                  Use calculated
                </button>
              ) : null}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {sacFormulaText(sacFromProfile)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="gearNotes" className={labelClass}>
              Gear notes
            </label>
            <textarea
              id="gearNotes"
              name="gearNotes"
              rows={2}
              defaultValue={str(initial?.gearNotes)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="skillsPracticed" className={labelClass}>
              Skills practiced
            </label>
            <textarea
              id="skillsPracticed"
              name="skillsPracticed"
              rows={2}
              defaultValue={str(initial?.skillsPracticed)}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="lessonsLearned" className={labelClass}>
              Lessons learned
            </label>
            <textarea
              id="lessonsLearned"
              name="lessonsLearned"
              rows={2}
              defaultValue={str(initial?.lessonsLearned)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending} size="lg">
        {submitButtonLabel(pending, mode)}
      </Button>
    </form>
  );
}
