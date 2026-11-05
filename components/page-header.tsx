import type { ReactNode } from "react";

/** Standard page top: mono eyebrow, large title, optional lede and extras. */
export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: Readonly<{
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}>) {
  return (
    <header className="pt-16 pb-10 sm:pt-24">
      {eyebrow ? (
        <p className="meta-label text-muted-foreground">{eyebrow}</p>
      ) : null}
      <h1 className="font-heading mt-3 text-[clamp(2.25rem,4vw,3.5rem)]">
        {title}
      </h1>
      {lede ? (
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg">{lede}</p>
      ) : null}
      {children}
    </header>
  );
}
