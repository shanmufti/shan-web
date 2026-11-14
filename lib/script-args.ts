/**
 * Argument parsing for scripts run with `npx payload run` or `npx tsx`.
 *
 * `payload run` swallows every `--flag` and passes only plain words through,
 * so each option also works as a plain word: `apply`, `no-db`,
 * `map=lists.json`. `--apply`, `--map lists.json` and `--map=lists.json`
 * work under tsx.
 */
export interface ScriptArgs {
  positionals: string[];
  /** Switches given, without dashes: "apply", "no-db". */
  switches: Set<string>;
  /** Options with a value, without dashes: map → "lists.json". */
  values: Map<string, string>;
}

export function parseScriptArgs(
  argv: string[],
  known: { switches: string[]; values: string[] },
): ScriptArgs {
  const out: ScriptArgs = {
    positionals: [],
    switches: new Set(),
    values: new Map(),
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i] ?? "";
    const bare = raw.replace(/^--/, "");
    const eq = bare.indexOf("=");
    const name = eq > 0 ? bare.slice(0, eq) : bare;
    if (known.values.includes(name)) {
      const value = eq > 0 ? bare.slice(eq + 1) : argv[++i];
      if (!value) throw new Error(`${name} needs a value`);
      out.values.set(name, value);
    } else if (known.switches.includes(bare)) {
      out.switches.add(bare);
    } else if (raw.startsWith("--")) {
      throw new Error(`Unknown option ${raw}`);
    } else {
      out.positionals.push(raw);
    }
  }
  return out;
}
