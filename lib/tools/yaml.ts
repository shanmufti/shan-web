/** YAML <-> JSON using the `yaml` package (YAML 1.2, no dependencies). */

import { parseAllDocuments, stringify, YAMLError } from "yaml";

import { parseJson } from "./json";

export type Converted =
  { ok: true; output: string } | { ok: false; error: string };

function describeYamlError(error: YAMLError): string {
  const pos = error.linePos?.[0];
  const where = pos
    ? ` (line ${String(pos.line)}, column ${String(pos.col)})`
    : "";
  // The library appends a code excerpt after the first line; keep the summary.
  const summary = error.message.split("\n")[0] ?? error.message;
  return `Invalid YAML${where}: ${summary.replace(/ at line \d+, column \d+:?$/, "")}`;
}

/** Multiple documents (separated by ---) become a JSON array. */
export function yamlToJson(text: string, indent = 2): Converted {
  if (text.trim() === "") return { ok: false, error: "Input is empty." };
  try {
    const docs = parseAllDocuments(text, { prettyErrors: true });
    const list = Array.isArray(docs) ? docs : [docs];
    for (const doc of list) {
      const first = doc.errors[0];
      if (first) return { ok: false, error: describeYamlError(first) };
    }
    const values = list.map(
      (doc) => doc.toJS({ maxAliasCount: 1000 }) as unknown,
    );
    const value = values.length === 1 ? values[0] : values;
    return { ok: true, output: JSON.stringify(value ?? null, null, indent) };
  } catch (error) {
    if (error instanceof YAMLError)
      return { ok: false, error: describeYamlError(error) };
    return {
      ok: false,
      error: `Could not convert: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function jsonToYaml(text: string, indent = 2): Converted {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;
  return { ok: true, output: stringify(parsed.value, { indent }) };
}
