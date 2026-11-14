"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  addExpense,
  addPerson,
  deleteExpense,
  type SplitActionResult,
} from "@/lib/actions/split";
import { formatShortDate } from "@/lib/format-date";
import { useRememberedChoice } from "@/lib/remembered-choice";
import type { SplitExpenseView, SplitView } from "@/lib/split";
import { allocate, formatMoney, parseAmount } from "@/lib/split-math";
import { cn } from "@/lib/utils";

const fieldClass =
  "border-input bg-background mt-1 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "meta-label text-muted-foreground block";

/** State updater that adds or removes one id. */
const toggled = (id: string) => (list: string[]) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

type Message = { kind: "ok" | "error"; text: string } | null;

function useAction() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const run = (fn: () => Promise<SplitActionResult>, onOk?: () => void) => {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) {
        setMessage({ kind: "error", text: result.error });
      } else {
        setMessage({ kind: "ok", text: result.message });
        onOk?.();
      }
    });
  };
  return { pending, message, run };
}

function Status({ message }: Readonly<{ message: Message }>) {
  return (
    <p
      role={message?.kind === "error" ? "alert" : "status"}
      className={cn(
        "text-sm",
        message?.kind === "error" ? "text-destructive" : "text-success",
      )}
    >
      {message?.text}
    </p>
  );
}

function Card({
  title,
  id,
  tone = "card",
  children,
}: Readonly<{
  title: string;
  id: string;
  tone?: "card" | "kelp";
  children: ReactNode;
}>) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "rounded-tile border-border border p-5 sm:p-6",
        tone === "kelp" ? "bg-tint-kelp" : "bg-card shadow-xs",
      )}
    >
      <h2 id={id} className="text-xl font-medium tracking-[-0.015em]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SettleUp({
  view,
  names,
}: Readonly<{ view: SplitView; names: Map<string, string> }>) {
  return (
    <Card title="Settle up" id="settle-heading" tone="kelp">
      {view.payments.length === 0 ? (
        <p className="text-sm">
          {view.expenses.length === 0
            ? "Add an expense to see who owes whom."
            : "Everyone is square."}
        </p>
      ) : (
        <ol className="space-y-2">
          {view.payments.map((p) => (
            <li
              key={`${p.from}-${p.to}`}
              className="bg-card border-border flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3.5 py-2.5 text-sm"
            >
              <span className="font-medium">{names.get(p.from)}</span>
              <ArrowRight
                className="text-muted-foreground size-3.5"
                aria-hidden="true"
              />
              <span className="sr-only">pays</span>
              <span className="font-medium">{names.get(p.to)}</span>
              <span className="ml-auto font-mono font-medium">
                {formatMoney(p.amount, view.currency)}
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-muted-foreground mt-3 text-xs">
        Whoever owes most pays whoever is owed most, until everyone is square.
        Shares are worked out to the cent; when a split doesn&apos;t divide
        evenly, the spare cents go to the largest fractions, then to whoever is
        listed first.
      </p>
    </Card>
  );
}

function Balances({
  view,
  names,
}: Readonly<{ view: SplitView; names: Map<string, string> }>) {
  return (
    <Card title="Balances" id="balances-heading">
      <ul className="divide-border divide-y">
        {view.balances.map((b) => {
          let label = "Square";
          if (b.amount > 0) label = "Gets back";
          if (b.amount < 0) label = "Owes";
          return (
            <li
              key={b.personId}
              className="flex items-baseline justify-between gap-3 py-2 text-sm"
            >
              <span className="font-medium">{names.get(b.personId)}</span>
              <span className="text-right">
                <span className="text-muted-foreground mr-2 text-xs">
                  {label}
                </span>
                <span
                  className={cn(
                    "font-mono",
                    b.amount > 0 && "text-success",
                    b.amount < 0 && "text-destructive",
                  )}
                >
                  {formatMoney(Math.abs(b.amount), view.currency)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ExpenseForm({
  view,
  today,
}: Readonly<{ view: SplitView; today: string }>) {
  const [payer, setPayer] = useRememberedChoice(`split-payer:${view.slug}`);
  const paidBy = view.people.some((p) => p.id === payer)
    ? payer
    : (view.people[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(today);
  const [mode, setMode] = useState<"equal" | "shares">("equal");
  const [included, setIncluded] = useState<string[]>(() =>
    view.people.map((p) => p.id),
  );
  const [weights, setWeights] = useState<Record<string, string>>({});
  const { pending, message, run } = useAction();

  const weightOf = (id: string) =>
    mode === "equal" ? 1 : Number(weights[id] ?? "1");
  const chosen = view.people.filter((p) => included.includes(p.id));
  const minor = parseAmount(amount, view.digits);
  let preview: number[] | null = null;
  try {
    if (minor !== null && chosen.length > 0) {
      preview = allocate(
        minor,
        chosen.map((p) => weightOf(p.id)),
      );
    }
  } catch {
    preview = null;
  }

  return (
    <Card title="Add an expense" id="add-heading">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () =>
              addExpense({
                slug: view.slug,
                description,
                amount,
                paidBy,
                splitMode: mode,
                shares: Object.fromEntries(
                  chosen.map((p) => [p.id, weightOf(p.id)]),
                ),
                spentOn,
              }),
            () => {
              setDescription("");
              setAmount("");
            },
          );
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="expense-description" className={labelClass}>
            What for
          </label>
          <input
            id="expense-description"
            required
            maxLength={120}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            className={fieldClass}
            placeholder="e.g. Dinner, taxi, groceries"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="expense-amount" className={labelClass}>
              Amount ({view.currency})
            </label>
            <input
              id="expense-amount"
              required
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
              }}
              className={cn(fieldClass, "font-mono")}
              placeholder={
                view.digits > 0 ? `0.${"0".repeat(view.digits)}` : "0"
              }
              aria-describedby="expense-amount-hint"
            />
            <p id="expense-amount-hint" className="sr-only">
              Up to {view.digits} decimal places.
            </p>
          </div>
          <div>
            <label htmlFor="expense-paid-by" className={labelClass}>
              Paid by
            </label>
            <select
              id="expense-paid-by"
              value={paidBy}
              onChange={(e) => {
                setPayer(e.target.value);
              }}
              className={fieldClass}
            >
              {view.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expense-date" className={labelClass}>
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              required
              value={spentOn}
              onChange={(e) => {
                setSpentOn(e.target.value);
              }}
              className={fieldClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Split</legend>
          <div className="mt-2 flex gap-2">
            {(["equal", "shares"] as const).map((m) => (
              <label
                key={m}
                className={cn(
                  "border-border hover:bg-muted has-focus-visible:ring-ring/50 inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3.5 text-sm has-focus-visible:ring-3",
                  mode === m &&
                    "border-primary bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <input
                  type="radio"
                  name="split-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                  }}
                  className="sr-only"
                />
                {m === "equal" ? "Equally" : "By shares"}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>Between</legend>
          <ul className="mt-2 space-y-1.5">
            {view.people.map((p) => {
              const on = included.includes(p.id);
              const index = chosen.findIndex((c) => c.id === p.id);
              const share = preview && index >= 0 ? preview[index] : undefined;
              return (
                <li key={p.id} className="flex min-h-9 items-center gap-3">
                  <input
                    id={`include-${p.id}`}
                    type="checkbox"
                    checked={on}
                    onChange={() => {
                      setIncluded(toggled(p.id));
                    }}
                    className="accent-primary size-4"
                  />
                  <label
                    htmlFor={`include-${p.id}`}
                    className="min-w-0 flex-1 text-sm"
                  >
                    {p.name}
                  </label>
                  {mode === "shares" && on ? (
                    <>
                      <label htmlFor={`weight-${p.id}`} className="sr-only">
                        Shares for {p.name}
                      </label>
                      <input
                        id={`weight-${p.id}`}
                        type="number"
                        min="0.01"
                        max="1000"
                        step="0.01"
                        inputMode="decimal"
                        value={weights[p.id] ?? "1"}
                        onChange={(e) => {
                          setWeights((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }));
                        }}
                        className="border-input bg-background focus-visible:ring-ring/50 w-20 rounded-md border px-2 py-1 text-right font-mono text-sm outline-none focus-visible:ring-3"
                      />
                    </>
                  ) : null}
                  <span className="text-muted-foreground w-24 text-right font-mono text-sm">
                    {share === undefined
                      ? ""
                      : formatMoney(share, view.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            type="submit"
            size="lg"
            disabled={pending || chosen.length === 0}
          >
            {pending ? "Adding…" : "Add expense"}
          </Button>
          <Status message={message} />
        </div>
      </form>
    </Card>
  );
}

function splitSummary(e: SplitExpenseView, names: Map<string, string>): string {
  if (e.splitMode === "equal") {
    return `Split equally: ${e.shares.map((s) => names.get(s.personId)).join(", ")}`;
  }
  return `By shares: ${e.shares
    .map((s) => `${names.get(s.personId) ?? "?"} ×${String(s.weight)}`)
    .join(", ")}`;
}

function ExpenseRow({
  expense,
  view,
  names,
}: Readonly<{
  expense: SplitExpenseView;
  view: SplitView;
  names: Map<string, string>;
}>) {
  const [confirming, setConfirming] = useState(false);
  const { pending, message, run } = useAction();
  const date = formatShortDate(expense.spentOn);
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium break-words">{expense.description}</p>
          <p className="text-muted-foreground text-sm">
            {names.get(expense.paidBy)} paid · {date}
          </p>
        </div>
        <p className="shrink-0 font-mono font-medium">
          {formatMoney(expense.amount, view.currency)}
        </p>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">
        {splitSummary(expense, names)}
      </p>
      <p className="text-muted-foreground mt-0.5 font-mono text-xs">
        {Object.entries(expense.owed)
          .map(
            ([pid, v]) =>
              `${names.get(pid) ?? "?"} ${formatMoney(v, view.currency)}`,
          )
          .join(" · ")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {confirming ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                run(() => deleteExpense(view.slug, expense.id));
              }}
            >
              {pending ? "Deleting…" : `Delete “${expense.description}”`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${expense.description}`}
            onClick={() => {
              setConfirming(true);
            }}
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        )}
        <Status message={message} />
      </div>
    </li>
  );
}

function People({ view }: Readonly<{ view: SplitView }>) {
  const [name, setName] = useState("");
  const { pending, message, run } = useAction();
  return (
    <Card title="People" id="people-heading">
      <p className="text-sm">{view.people.map((p) => p.name).join(", ")}</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addPerson(view.slug, name),
            () => {
              setName("");
            },
          );
        }}
      >
        <label htmlFor="new-person" className={labelClass}>
          Add someone
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="new-person"
            required
            maxLength={40}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            className={cn(fieldClass, "mt-0")}
          />
          <Button type="submit" variant="outline" size="lg" disabled={pending}>
            Add
          </Button>
        </div>
        <div className="mt-2">
          <Status message={message} />
        </div>
      </form>
    </Card>
  );
}

/** The interactive part of /split/[shareSlug]. */
export function SplitBoard({
  view,
  today,
}: Readonly<{ view: SplitView; today: string }>) {
  const names = new Map(view.people.map((p) => [p.id, p.name]));
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-24">
        <SettleUp view={view} names={names} />
        <Balances view={view} names={names} />
      </div>
      <div className="space-y-6">
        <ExpenseForm view={view} today={today} />
        <Card
          title={`Expenses · ${String(view.expenses.length)}`}
          id="expenses-heading"
        >
          {view.expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nothing yet.</p>
          ) : (
            <ul className="divide-border -my-3 divide-y">
              {view.expenses.map((e) => (
                <ExpenseRow key={e.id} expense={e} view={view} names={names} />
              ))}
            </ul>
          )}
        </Card>
        <People view={view} />
      </div>
    </div>
  );
}
