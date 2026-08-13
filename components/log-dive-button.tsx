import Link from "next/link";

export function LogDiveButton({ className }: { className?: string }) {
  return (
    <Link
      href="/diving/logs/new"
      className={
        className ??
        "bg-foreground text-background inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium"
      }
    >
      Log a dive
    </Link>
  );
}
